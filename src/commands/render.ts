import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { getLatestStory, getStoryPart, updatePartStatus, updateStoryPart } from '../database';
import { getThemeById } from '../themes';
import { renderMainVideo, renderThumbnail } from '../video/render';
import { AudioTimings } from '../audio';
import { ImageResult } from '../images';
import { uploadVideo, uploadThumbnail } from '../storage';

function getBasePath(): string {
  const env = process.env.ENV || 'local';
  if (env === 'oracle') return '/opt/stories';
  return path.join(process.cwd(), 'temp');
}

function loadImagesForPart(storyId: string, partNum: number): ImageResult[] {
  const imageDir = path.join(process.cwd(), 'temp', storyId, `part_${partNum}`, 'images');
  if (!fs.existsSync(imageDir)) {
    throw new Error(`Images directory not found: ${imageDir}`);
  }
  const files = fs.readdirSync(imageDir)
    .filter((f) => f.match(/^scene_\d+_\d+\.jpg$/))
    .sort((a, b) => {
      const [sceneA, imgA] = a.match(/scene_(\d+)_(\d+)/)!.slice(1).map(Number);
      const [sceneB, imgB] = b.match(/scene_(\d+)_(\d+)/)!.slice(1).map(Number);
      return sceneA !== sceneB ? sceneA - sceneB : imgA - imgB;
    });

  return files.map((f, i) => {
    const localPath = path.join(imageDir, f);
    const clipPath = localPath.replace(/\.jpg$/, '.mp4');
    const isVideo = fs.existsSync(clipPath);
    // sceneIndex derived from scene_N_M.jpg filename
    const sceneIndex = parseInt(f.match(/scene_(\d+)/)![1]) - 1;
    return {
      url: localPath,
      localPath,
      clipPath: isVideo ? clipPath : localPath,
      isVideo,
      source: 'huggingface' as const,
      sceneIndex,
    };
  });
}

function loadTimingsForPart(storyId: string, partNum: number): AudioTimings {
  const timingsPath = path.join(process.cwd(), 'temp', storyId, `part_${partNum}`, 'timings.json');
  if (!fs.existsSync(timingsPath)) {
    throw new Error(`Timings file not found: ${timingsPath}. Run audio generation first.`);
  }
  return JSON.parse(fs.readFileSync(timingsPath, 'utf-8')) as AudioTimings;
}

export async function runRender(partArg?: number): Promise<void> {
  const latestStory = await getLatestStory();
  if (!latestStory) {
    throw new Error('No story found in Supabase. Run "node src/index.ts story" first.');
  }

  const storyId = latestStory.story_id;
  console.log(`\nRendering video for story: ${storyId}`);

  const parts = partArg ? [partArg] : [1, 2, 3, 4];

  for (const partNum of parts) {
    const record = await getStoryPart(storyId, partNum);
    if (!record || !record.id) {
      console.log(`  Part ${partNum}: not found in Supabase, skipping`);
      continue;
    }

    // Check conditions
    if (record.images_status !== 'done') {
      console.log(`  Part ${partNum}: images_status is not 'done' (${record.images_status}), skipping`);
      continue;
    }
    if (record.audio_status !== 'done') {
      console.log(`  Part ${partNum}: audio_status is not 'done' (${record.audio_status}), skipping`);
      continue;
    }

    console.log(`\n--- Part ${partNum}/4 ---`);

    const theme = getThemeById(record.theme);

    const storyPart = {
      part: record.part,
      title: record.title,
      content: record.content,
      hook: record.hook,
      thumbnail_title: record.thumbnail_title || '',
      scenes: (record as any).scenes || [],
      facebook_caption: record.facebook_caption,
      youtube_title: record.youtube_title,
      youtube_description_hook: record.youtube_description,
    };

    // Load assets from disk
    const images = loadImagesForPart(storyId, partNum);
    const timings = loadTimingsForPart(storyId, partNum);

    const audioPath = path.join(process.cwd(), 'temp', storyId, `part_${partNum}`, 'narration.mp3');
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Audio file not found: ${audioPath}`);
    }

    const dramaticImageUrl = record.dramatic_image_url || images[images.length - 1]?.localPath;
    if (!dramaticImageUrl) {
      throw new Error(`No dramatic image found for part ${partNum}`);
    }

    const hookImagePath = path.join(
      process.cwd(), 'temp', storyId, `part_${partNum}`, 'images', 'hook_image.jpg'
    );
    if (!fs.existsSync(hookImagePath)) {
      throw new Error(`Hook image not found: ${hookImagePath}. Run images generation first.`);
    }

    // Render thumbnail
    console.log(`  Rendering thumbnail...`);
    let thumbnailPath: string;
    try {
      thumbnailPath = await renderThumbnail(storyPart, dramaticImageUrl, theme, storyId);
    } catch (err) {
      console.warn('  Thumbnail render failed, using dramatic image as fallback');
      thumbnailPath = dramaticImageUrl;
    }

    // Render main video (YouTube 1920x1080)
    console.log(`  Rendering main video 1920x1080 (YouTube)...`);
    const mainVideoPath = await renderMainVideo(
      storyPart,
      images,
      audioPath,
      theme,
      storyId,
      record.title,
      thumbnailPath,
      hookImagePath,
      timings,
      'landscape'
    );

    // Render Facebook video (1080x1350)
    console.log(`  Rendering Facebook video 1080x1350...`);
    const fbVideoPath = await renderMainVideo(
      storyPart,
      images,
      audioPath,
      theme,
      storyId,
      record.title,
      thumbnailPath,
      hookImagePath,
      timings,
      'facebook'
    );

    // Determine output paths
    const basePath = getBasePath();
    const videoDestPath = path.join(basePath, storyId, `part_${partNum}`, 'main_video.mp4');
    const fbVideoDestPath = path.join(basePath, storyId, `part_${partNum}`, 'main_video_facebook.mp4');
    const thumbDestPath = path.join(basePath, storyId, `part_${partNum}`, 'thumbnail.jpg');

    // Copy to canonical locations if different
    fs.mkdirSync(path.dirname(videoDestPath), { recursive: true });
    if (mainVideoPath !== videoDestPath) {
      fs.copyFileSync(mainVideoPath, videoDestPath);
    }
    if (fbVideoPath !== fbVideoDestPath) {
      fs.copyFileSync(fbVideoPath, fbVideoDestPath);
    }
    if (thumbnailPath !== thumbDestPath) {
      fs.copyFileSync(thumbnailPath, thumbDestPath);
    }

    // Update Supabase with local paths first
    await updatePartStatus(record.id, {
      video_status: 'done',
      video_path: videoDestPath,
      facebook_video_path: fbVideoDestPath,
      thumbnail_path: thumbDestPath,
    });

    // Upload to Supabase Storage
    console.log(`  Uploading to Supabase Storage...`);
    try {
      const [videoUrl, fbVideoUrl, thumbnailUrl] = await Promise.all([
        uploadVideo(videoDestPath, storyId, partNum, 'main_video'),
        uploadVideo(fbVideoDestPath, storyId, partNum, 'facebook_video'),
        uploadThumbnail(thumbDestPath, storyId, partNum),
      ]);
      await updateStoryPart(record.id, { video_url: videoUrl, facebook_video_url: fbVideoUrl, thumbnail_url: thumbnailUrl });
      console.log(`  Supabase Storage upload done ✅`);
    } catch (err) {
      console.warn(`  Supabase Storage upload failed (non-fatal): ${(err as Error).message}`);
    }

    console.log(`  Part ${partNum} render done`);
    console.log(`    YouTube video: ${videoDestPath}`);
    console.log(`    Facebook video: ${fbVideoDestPath}`);
    console.log(`    Thumbnail: ${thumbDestPath}`);
  }

  console.log('\nRender complete.');
}
