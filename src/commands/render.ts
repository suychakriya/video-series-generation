import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { getLatestStory, getStoryPart, updatePartStatus, updateStoryPart } from '../database';
import { getThemeById } from '../themes';
import { renderMainVideo, renderThumbnail } from '../video/render';
import { AudioTimings } from '../audio';
import { ImageResult } from '../images';
import { uploadVideo, uploadThumbnail, downloadStoryAssets, deleteStoryFromStorage } from '../storage';

const ON_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === 'true';

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
    const sceneNum = parseInt(f.match(/scene_(\d+)/)![1]);
    const imgNum = parseInt(f.match(/scene_\d+_(\d+)/)![1]);
    const sceneIndex = sceneNum;
    return {
      url: localPath,
      localPath,
      clipPath: localPath,
      isVideo: false,
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

export async function runRender(partArg?: number, storyArg?: string): Promise<void> {
  let storyId: string;
  if (storyArg) {
    storyId = storyArg;
    console.log(`\nUsing specified story: ${storyId}`);
  } else {
    const latestStory = await getLatestStory();
    if (!latestStory) {
      throw new Error('No story found in Supabase. Run "node src/index.ts story" first.');
    }
    storyId = latestStory.story_id;
  }

  console.log(`\nRendering video for story: ${storyId}`);
  if (ON_GITHUB_ACTIONS) console.log('  Running on GitHub Actions — assets will be downloaded from Supabase Storage');

  const parts = partArg ? [partArg] : [1, 2, 3, 4];

  for (const partNum of parts) {
    const record = await getStoryPart(storyId, partNum);
    if (!record || !record.id) {
      console.log(`  Part ${partNum}: not found in DB, skipping`);
      continue;
    }

    if (record.images_status !== 'done') {
      console.log(`  Part ${partNum}: images_status is not 'done' (${record.images_status}), skipping`);
      continue;
    }
    if (record.audio_status !== 'done') {
      console.log(`  Part ${partNum}: audio_status is not 'done' (${record.audio_status}), skipping`);
      continue;
    }

    // Download assets from Supabase Storage (always on GitHub Actions, otherwise only if missing)
    const imageDir = path.join(process.cwd(), 'temp', storyId, `part_${partNum}`, 'images');
    const narrationPath = path.join(process.cwd(), 'temp', storyId, `part_${partNum}`, 'narration.mp3');
    if (ON_GITHUB_ACTIONS || !fs.existsSync(imageDir) || !fs.existsSync(narrationPath)) {
      if (ON_GITHUB_ACTIONS && fs.existsSync(imageDir)) fs.rmSync(imageDir, { recursive: true });
      await downloadStoryAssets(storyId, partNum);
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
      storyPart, images, audioPath, theme, storyId, record.title,
      thumbnailPath, hookImagePath, timings, 'landscape'
    );

    // Render Facebook video (1080x1350)
    console.log(`  Rendering Facebook video 1080x1350...`);
    const fbVideoPath = await renderMainVideo(
      storyPart, images, audioPath, theme, storyId, record.title,
      thumbnailPath, hookImagePath, timings, 'facebook'
    );

    // Render Khmer Facebook video if Khmer audio exists
    const khmerAudioPath = path.join(process.cwd(), 'temp', storyId, `part_${partNum}`, 'narration_khmer.mp3');
    const khmerTimingsPath = path.join(process.cwd(), 'temp', storyId, `part_${partNum}`, 'timings_khmer.json');
    let khmerFbVideoPath: string | null = null;

    if (fs.existsSync(khmerAudioPath) && fs.existsSync(khmerTimingsPath)) {
      console.log(`  Waiting 5s for Remotion port to release...`);
      await new Promise((r) => setTimeout(r, 5000));
      console.log(`  Rendering Khmer Facebook video 1080x1350...`);
      try {
        const khmerTimings = JSON.parse(fs.readFileSync(khmerTimingsPath, 'utf-8')) as AudioTimings;
        const khmerStoryPart = {
          ...storyPart,
          hook: (record as any).khmer_hook || storyPart.hook,
          scenes: storyPart.scenes.map((s: any) => ({
            ...s,
            narration: s.khmer_narration || s.narration,
          })),
        };
        const khmerTitle = (record as any).khmer_title || record.title;
        khmerFbVideoPath = await renderMainVideo(
          khmerStoryPart, images, khmerAudioPath, theme, storyId, khmerTitle,
          thumbnailPath, hookImagePath, khmerTimings, 'facebook', '_khmer'
        );
      } catch (err) {
        console.warn(`  Khmer video render failed (non-fatal): ${(err as Error).message}`);
      }
    } else {
      console.log(`  Skipping Khmer video (Khmer audio not found)`);
    }

    // Canonical output paths
    const partDir = path.join(process.cwd(), 'temp', storyId, `part_${partNum}`);
    const videoDestPath = path.join(partDir, 'main_video.mp4');
    const fbVideoDestPath = path.join(partDir, 'main_video_facebook.mp4');
    const thumbDestPath = path.join(partDir, 'thumbnail.jpg');
    const khmerFbVideoDestPath = path.join(partDir, 'main_video_facebook_khmer.mp4');

    fs.mkdirSync(partDir, { recursive: true });
    if (mainVideoPath !== videoDestPath) fs.copyFileSync(mainVideoPath, videoDestPath);
    if (fbVideoPath !== fbVideoDestPath) fs.copyFileSync(fbVideoPath, fbVideoDestPath);
    if (thumbnailPath !== thumbDestPath) fs.copyFileSync(thumbnailPath, thumbDestPath);
    if (khmerFbVideoPath && khmerFbVideoPath !== khmerFbVideoDestPath) {
      fs.copyFileSync(khmerFbVideoPath, khmerFbVideoDestPath);
    }

    // Update DB with paths
    await updatePartStatus(record.id, {
      video_status: 'done',
      video_path: videoDestPath,
      facebook_video_path: fbVideoDestPath,
      thumbnail_path: thumbDestPath,
      ...(khmerFbVideoPath ? { khmer_facebook_video_path: khmerFbVideoDestPath } : {}),
    });

    // Upload to Google Drive
    console.log(`  Uploading to Google Drive...`);
    try {
      const uploadTasks: Promise<string>[] = [
        uploadVideo(videoDestPath, storyId, partNum, 'main_video'),
        uploadVideo(fbVideoDestPath, storyId, partNum, 'facebook_video'),
        uploadThumbnail(thumbDestPath, storyId, partNum),
      ];
      if (khmerFbVideoPath) {
        uploadTasks.push(uploadVideo(khmerFbVideoDestPath, storyId, partNum, 'khmer_facebook_video'));
      }
      const [videoUrl, fbVideoUrl, thumbnailUrl, khmerFbVideoUrl] = await Promise.all(uploadTasks);
      await updateStoryPart(record.id, {
        video_url: videoUrl,
        facebook_video_url: fbVideoUrl,
        thumbnail_url: thumbnailUrl,
        ...(khmerFbVideoUrl ? { khmer_facebook_video_url: khmerFbVideoUrl } : {}),
      });
      console.log(`  Google Drive upload done ✅`);
    } catch (err) {
      console.warn(`  Google Drive upload failed (non-fatal): ${(err as Error).message}`);
    }

    console.log(`  Part ${partNum} render done`);
  }

  // Clean up Supabase Storage after all parts rendered (GitHub Actions only)
  if (ON_GITHUB_ACTIONS) {
    console.log('\nCleaning up Supabase Storage...');
    try {
      await deleteStoryFromStorage(storyId);
    } catch (err) {
      console.warn(`  Storage cleanup failed (non-fatal): ${(err as Error).message}`);
    }
  }

  console.log('\nRender complete.');
}
