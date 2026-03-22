import * as dotenv from 'dotenv';
dotenv.config();

import * as path from 'path';
import * as fs from 'fs';
import { getThemeByIndex } from './themes';
import { generateFullStory } from './story';
import { fetchImagesForPart } from './images';
import { generateMainAudio, generateShortAudio } from './audio';
import { renderMainVideo, renderShort, renderThumbnail } from './video/render';
import { uploadAllPartAssets, deleteFromCloudinary } from './storage';
import {
  saveStoryPart,
  updateStoryPart,
  getTodayStory,
  markAsPosted,
  getCurrentThemeIndex,
  incrementThemeIndex,
  getAllPartUrls,
  getOrCreatePlaylist as dbGetOrCreatePlaylist,
  getPlaylistId,
  saveRunStats,
} from './database';
import { postVideoToFacebook, postPreviousPartsComment } from './facebook';
import {
  uploadMainVideo,
  uploadShort,
  getOrCreatePlaylist as ytGetOrCreatePlaylist,
  updateVideoDescription,
} from './youtube';

function generateStoryId(): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `story_${date}_${rand}`;
}

async function runGenerate(): Promise<void> {
  const startTime = Date.now();
  const storyId = generateStoryId();
  console.log(`\nStarting generation pipeline — ${storyId}`);

  // Get current theme
  const themeIndex = await getCurrentThemeIndex();
  const theme = getThemeByIndex(themeIndex);
  console.log(`\nTheme: ${theme.name}`);

  let totalImages = 0;
  let partsCompleted = 0;

  try {
    // Generate full story
    const story = await generateFullStory(theme, storyId);
    console.log(`Story: "${story.overall_title}"`);

    // Set post dates (one per day starting tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (let i = 0; i < story.parts.length; i++) {
      const part = story.parts[i];
      const postDate = new Date(tomorrow);
      postDate.setDate(postDate.getDate() + i);
      const postDateStr = postDate.toISOString().split('T')[0];

      console.log(`\n--- Part ${part.part}/4 ---`);

      // Save to Supabase
      const recordId = await saveStoryPart({
        story_id: story.story_id,
        part: part.part,
        theme: theme.id,
        title: part.title,
        content: part.content,
        hook: part.hook,
        thumbnail_title: part.thumbnail_title,
        character_description: story.character_description,
        style_prompt: story.style_prompt,
        image_seed: story.image_seed,
        facebook_caption: part.facebook_caption,
        youtube_title: part.youtube_title,
        youtube_description: part.youtube_description_hook,
        youtube_tags: theme.youtubeTags,
        post_date: postDateStr,
      });

      // Fetch images
      console.log(`Fetching images Part ${part.part}... (20-25 images)`);
      const { images, dramaticImageUrl } = await fetchImagesForPart(
        part.part,
        part.scenes,
        story.style_prompt,
        story.character_description,
        story.image_seed,
        story.story_id
      );
      totalImages += images.length;

      await updateStoryPart(recordId, {
        dramatic_image_url: dramaticImageUrl,
        base_image_url: images[0]?.localPath,
      });

      // Generate main audio
      console.log(`Generating main audio Part ${part.part}...`);
      const mainAudioPath = await generateMainAudio(
        part.content,
        part.hook,
        part.part,
        theme,
        story.overall_title,
        story.story_id
      );

      // Generate short audio
      console.log(`Generating short audio Part ${part.part}... (hook line)`);
      const shortAudioPath = await generateShortAudio(part.hook, part.part, theme, story.story_id);

      // Render Thumbnail first (needed for main video hook section)
      console.log(`Rendering thumbnail 1280x720...`);
      let thumbnailPath: string;
      try {
        thumbnailPath = await renderThumbnail(part, dramaticImageUrl, theme, story.story_id);
      } catch (err) {
        console.warn('  Thumbnail render failed, using dramatic image as fallback');
        thumbnailPath = dramaticImageUrl;
      }

      // Render main video
      console.log(`Rendering main video 1920x1080...`);
      const mainVideoPath = await renderMainVideo(
        part,
        images,
        mainAudioPath,
        theme,
        story.story_id,
        story.overall_title,
        thumbnailPath
      );

      // Render Short
      console.log(`Rendering YouTube Short 1080x1920...`);
      const cliffhangerImages = images
        .filter((img) => img.sceneIndex === part.scenes.length - 1)
        .map((img) => img.localPath)
        .slice(0, 8);
      const shortPath = await renderShort(part, cliffhangerImages, shortAudioPath, theme, story.story_id);

      // Upload all to Cloudinary
      console.log(`Uploading all assets to Cloudinary...`);
      const urls = await uploadAllPartAssets(story.story_id, part.part, {
        mainVideo: mainVideoPath,
        short: shortPath,
        thumbnail: thumbnailPath,
        audio: mainAudioPath,
        shortAudio: shortAudioPath,
      });

      // Update Supabase with all URLs
      await updateStoryPart(recordId, {
        video_url: urls.mainVideoUrl,
        short_url: urls.shortUrl,
        thumbnail_url: urls.thumbnailUrl,
        audio_url: urls.audioUrl,
        short_audio_url: urls.shortAudioUrl,
        subtitle_url: urls.subtitleUrl,
      });

      partsCompleted++;
      console.log(`\nPart ${part.part}/4 complete!`);
      console.log(`   Main: ${urls.mainVideoUrl}`);
      console.log(`   Short: ${urls.shortUrl}`);
      console.log(`   Thumbnail: ${urls.thumbnailUrl}`);
    }

    // Increment theme index
    await incrementThemeIndex();

    // Save run stats
    const elapsedMinutes = (Date.now() - startTime) / 60000;
    await saveRunStats({
      run_type: 'generate',
      story_id: story.story_id,
      theme: theme.id,
      story_title: story.overall_title,
      parts_completed: partsCompleted,
      total_images: totalImages,
      render_time_minutes: elapsedMinutes,
      facebook_status: 'pending',
      youtube_status: 'pending',
    });

    // Clean up temp files
    const tempDir = path.join(process.cwd(), 'temp', story.story_id);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    console.log(`\nGeneration complete! ${partsCompleted}/4 parts ready.`);
    console.log(`   Time: ${elapsedMinutes.toFixed(1)} minutes`);
    console.log(`   Total images: ${totalImages}`);
  } catch (err) {
    console.error('\nGeneration failed:', err);
    await saveRunStats({
      run_type: 'generate',
      story_id: storyId,
      theme: theme.id,
      story_title: 'FAILED',
      parts_completed: partsCompleted,
      error_message: (err as Error).message,
    });
    process.exit(1);
  }
}

async function runPost(): Promise<void> {
  console.log('\nStarting daily post pipeline...');

  if (process.env.TEST_MODE === 'true') {
    console.log('TEST_MODE=true — skipping all posting');
    return;
  }

  const story = await getTodayStory();
  if (!story) {
    console.log('No story scheduled for today. Exiting.');
    return;
  }

  console.log(`Posting: "${story.title}" (Part ${story.part}/4)`);
  const theme = await import('./themes').then((m) => m.getThemeById(story.theme));

  let fbStatus = 'pending';
  let ytStatus = 'pending';
  let ytShortStatus = 'pending';

  // Run Facebook and YouTube in parallel
  const [fbResult, ytResult] = await Promise.allSettled([
    // FACEBOOK TASK
    (async () => {
      console.log('\nPosting to Facebook...');
      const result = await postVideoToFacebook(
        story.video_url!,
        story.thumbnail_url!,
        story.facebook_caption,
        story.title
      );
      await updateStoryPart(story.id!, {
        facebook_post_id: result.postId,
        facebook_post_url: result.postUrl,
      });
      fbStatus = 'success';
      console.log(`  Facebook posted: ${result.postUrl}`);

      // Wait 30 seconds then post previous parts comment
      if (story.part > 1) {
        await new Promise((r) => setTimeout(r, 30000));
        const allParts = await getAllPartUrls(story.story_id);
        const previousParts = allParts
          .filter((p) => p.part < story.part && p.youtube_video_url)
          .map((p) => ({
            part: p.part,
            url: p.youtube_video_url!,
            title: `Part ${p.part}`,
          }));
        if (previousParts.length > 0) {
          console.log('Posting previous parts comment on Facebook...');
          await postPreviousPartsComment(result.postId, previousParts);
          await updateStoryPart(story.id!, { comment_posted: true });
        }
      }

      return result;
    })(),

    // YOUTUBE TASK
    (async () => {
      console.log('\nUploading to YouTube...');

      // Get or create playlist
      let playlistId = await getPlaylistId(story.story_id);
      if (!playlistId) {
        playlistId = await ytGetOrCreatePlaylist(story.title, theme);
        await dbGetOrCreatePlaylist(story.story_id, story.title, story.theme, playlistId);
      }

      // Upload main video
      const ytResult = await uploadMainVideo(
        story.video_url!,
        story.thumbnail_url!,
        story.subtitle_url!,
        playlistId,
        {
          part: story.part,
          youtube_title: story.youtube_title,
          youtube_description: story.youtube_description,
          youtube_tags: story.youtube_tags,
          hook: story.hook,
        },
        theme,
        story.title,
        process.env.YOUTUBE_CHANNEL_ID!
      );

      ytStatus = 'success';
      await updateStoryPart(story.id!, {
        youtube_video_id: ytResult.videoId,
        youtube_video_url: ytResult.videoUrl,
        youtube_playlist_id: playlistId,
      });

      // Upload Short
      let shortResult: { videoId: string; videoUrl: string } | null = null;
      try {
        shortResult = await uploadShort(
          story.short_url!,
          { part: story.part, hook: story.hook },
          theme,
          ytResult.videoUrl
        );
        ytShortStatus = 'success';
        await updateStoryPart(story.id!, {
          youtube_short_id: shortResult.videoId,
          youtube_short_url: shortResult.videoUrl,
        });
      } catch (err) {
        console.warn('  Short upload failed:', (err as Error).message);
        ytShortStatus = 'failed';
      }

      // Update descriptions of all parts with full story links
      console.log('Updating YouTube descriptions...');
      const allParts = await getAllPartUrls(story.story_id);
      const partsWithUrls = allParts.filter((p) => p.youtube_video_id);
      for (const p of partsWithUrls) {
        if (p.youtube_video_id && p.youtube_video_id !== ytResult.videoId) {
          try {
            const newDesc = `${story.youtube_description}\n\nFull Series:\n${allParts
              .filter((pp) => pp.youtube_video_url)
              .map((pp) => `Part ${pp.part}: ${pp.youtube_video_url}`)
              .join('\n')}`;
            await updateVideoDescription(p.youtube_video_id, newDesc);
          } catch (err) {
            // non-fatal
          }
        }
      }

      return { ytResult, shortResult };
    })(),
  ]);

  // Mark as posted
  await markAsPosted(story.id!);

  // Delete videos from Cloudinary (keep thumbnail, audio, subtitles)
  console.log('Cleaning up Cloudinary...');
  if (story.video_url) await deleteFromCloudinary(story.video_url);
  if (story.short_url) await deleteFromCloudinary(story.short_url);

  // Extract results
  const fbData = fbResult.status === 'fulfilled' ? fbResult.value : null;
  const ytData =
    ytResult.status === 'fulfilled'
      ? (ytResult.value as { ytResult: YouTubeUploadResult; shortResult: any })
      : null;

  // Save run stats
  await saveRunStats({
    run_type: 'post',
    story_id: story.story_id,
    theme: story.theme,
    story_title: story.title,
    facebook_status: fbStatus,
    youtube_status: ytStatus,
    youtube_short_status: ytShortStatus,
    error_message:
      fbResult.status === 'rejected' || ytResult.status === 'rejected'
        ? `FB: ${fbResult.status === 'rejected' ? (fbResult.reason as Error).message : 'ok'} | YT: ${ytResult.status === 'rejected' ? (ytResult.reason as Error).message : 'ok'}`
        : undefined,
  });

  console.log('\nAll done!');
  if (fbData) console.log(`   Facebook: ${fbData.postUrl}`);
  if (ytData?.ytResult) console.log(`   YouTube: ${ytData.ytResult.videoUrl}`);
  if (ytData?.shortResult) console.log(`   Short: ${ytData.shortResult.videoUrl}`);
}

interface YouTubeUploadResult {
  videoId: string;
  videoUrl: string;
}

const STORY_CACHE_PATH = path.join(process.cwd(), 'test-output', 'last-story.json');

async function runTestVideo(): Promise<void> {
  const args = process.argv;
  const reuseStory = args.includes('--reuse-story') || args.includes('--reuse');
  const reuseImages = args.includes('--reuse-images') || args.includes('--reuse');

  const theme = getThemeByIndex(0);
  console.log(`\n🧪 TEST MODE — Part 1 only, no DB/Cloudinary`);
  console.log(`🎭 Theme: ${theme.name}`);
  console.log(
    `⚙️  Flags: story=${reuseStory ? 'reuse' : 'generate'}, images=${reuseImages ? 'reuse' : 'generate'}`
  );

  let story: Awaited<ReturnType<typeof generateFullStory>>;

  if (reuseStory && fs.existsSync(STORY_CACHE_PATH)) {
    story = JSON.parse(fs.readFileSync(STORY_CACHE_PATH, 'utf-8'));
    console.log(`📖 Reusing cached story: "${story.overall_title}"`);
  } else {
    story = await generateFullStory(theme, 'test_' + Date.now());
    console.log(`📖 Story: "${story.overall_title}"`);
    fs.mkdirSync(path.dirname(STORY_CACHE_PATH), { recursive: true });
    fs.writeFileSync(STORY_CACHE_PATH, JSON.stringify(story, null, 2));
    console.log(`💾 Story cached → test-output/last-story.json`);
  }

  const part = story.parts[0];
  const outputDir = path.join(process.cwd(), 'test-output');
  fs.mkdirSync(outputDir, { recursive: true });

  const imageDir = path.join(process.cwd(), 'temp', story.story_id, `part_${part.part}`, 'images');
  const existingImages = fs.existsSync(imageDir)
    ? fs.readdirSync(imageDir).filter((f) => f.endsWith('.jpg'))
    : [];

  let images: Awaited<ReturnType<typeof fetchImagesForPart>>['images'];
  let dramaticImageUrl: string;

  if (reuseImages && existingImages.length > 0) {
    console.log(`\n🖼️  Reusing ${existingImages.length} cached images`);
    images = existingImages.map((f, i) => {
      const localPath = path.join(imageDir, f);
      // Check if a corresponding animated clip exists
      const clipName = f.replace(/\.jpg$/, '.mp4');
      const clipPath = path.join(imageDir, clipName);
      const isVideo = fs.existsSync(clipPath);
      return {
        url: localPath,
        localPath,
        clipPath: isVideo ? clipPath : localPath,
        isVideo,
        source: 'huggingface' as const,
        sceneIndex: Math.floor(i / 3),
      };
    });
    dramaticImageUrl = images[images.length - 1].localPath;
  } else {
    console.log(`\n🖼️  Generating images...`);
    ({ images, dramaticImageUrl } = await fetchImagesForPart(
      part.part,
      part.scenes,
      story.style_prompt,
      story.character_description,
      story.image_seed,
      story.story_id
    ));
  }

  const audioDir = path.join(process.cwd(), 'temp', story.story_id, `part_${part.part}`);
  const cachedMainAudio = path.join(audioDir, 'narration.mp3');
  const cachedShortAudio = path.join(audioDir, 'short_narration.mp3');

  let mainAudioPath: string;
  let shortAudioPath: string;

  if (reuseStory && fs.existsSync(cachedMainAudio) && fs.existsSync(cachedShortAudio)) {
    console.log(`\n🎙️  Reusing cached audio`);
    mainAudioPath = cachedMainAudio;
    shortAudioPath = cachedShortAudio;
  } else {
    console.log(`\n🎙️  Generating audio...`);
    mainAudioPath = await generateMainAudio(
      part.content,
      part.hook,
      part.part,
      theme,
      story.overall_title,
      story.story_id
    );
    shortAudioPath = await generateShortAudio(part.hook, part.part, theme, story.story_id);
  }

  // Thumbnail first (needed for main video hook section)
  const cachedThumbnail = path.join(audioDir, 'thumbnail.jpg');
  let thumbnailPath: string;
  if (reuseImages && fs.existsSync(cachedThumbnail)) {
    console.log(`\n🖼️  Reusing cached thumbnail`);
    thumbnailPath = cachedThumbnail;
  } else {
    console.log(`\n🖼️  Rendering thumbnail...`);
    thumbnailPath = await renderThumbnail(part, dramaticImageUrl, theme, story.story_id);
  }

  // Main video
  const cachedMainVideo = path.join(audioDir, 'main_video.mp4');
  let mainVideoPath: string;
  if (reuseImages && fs.existsSync(cachedMainVideo)) {
    console.log(`\n🎬 Reusing cached main video`);
    mainVideoPath = cachedMainVideo;
  } else {
    console.log(`\n🎬 Rendering main video...`);
    mainVideoPath = await renderMainVideo(
      part,
      images,
      mainAudioPath,
      theme,
      story.story_id,
      story.overall_title,
      thumbnailPath
    );
  }

  // Short
  const cachedShort = path.join(audioDir, 'short.mp4');
  let shortPath: string;
  if (reuseImages && fs.existsSync(cachedShort)) {
    console.log(`\n📱 Reusing cached Short`);
    shortPath = cachedShort;
  } else {
    console.log(`\n📱 Rendering Short...`);
    const cliffhangerImages = images
      .filter((img) => img.sceneIndex === part.scenes.length - 1)
      .map((img) => img.localPath)
      .slice(0, 8);
    shortPath = await renderShort(part, cliffhangerImages, shortAudioPath, theme, story.story_id);
  }

  // Copy outputs to test-output/
  fs.copyFileSync(mainVideoPath, path.join(outputDir, 'main_video.mp4'));
  fs.copyFileSync(shortPath, path.join(outputDir, 'short.mp4'));
  fs.copyFileSync(thumbnailPath, path.join(outputDir, 'thumbnail.jpg'));

  console.log(`\n✅ Test complete! Files saved to ./test-output/`);
  console.log(`   📹 main_video.mp4`);
  console.log(`   📱 short.mp4`);
  console.log(`   🖼️  thumbnail.jpg`);
}

// Main entry point
const mode = process.argv[2] || 'generate';

if (mode === 'generate') {
  runGenerate().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (mode === 'post') {
  runPost().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else if (mode === 'test-video') {
  runTestVideo().catch((err) => {
    console.error(err);
    process.exit(1);
  });
} else {
  console.error(`Unknown mode: ${mode}. Use 'generate', 'post', or 'test-video'`);
  process.exit(1);
}
