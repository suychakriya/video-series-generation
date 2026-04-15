import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import {
  getTodayStory,
  updateStoryPart,
  markAsPosted,
  getAllPartUrls,
  getOrCreatePlaylist as dbGetOrCreatePlaylist,
  getPlaylistId,
  saveRunStats,
} from '../database';
import { postVideoToFacebook, postPreviousPartsComment } from '../facebook';
import { deleteVideoFiles, deleteFromDrive, downloadFromDrive } from '../storage';
import {
  uploadMainVideo,
  getOrCreatePlaylist as ytGetOrCreatePlaylist,
  updateVideoDescription,
  postPreviousPartsComment as ytPostPreviousPartsComment,
} from '../youtube';
import { getThemeById } from '../themes';

interface YouTubeUploadResult {
  videoId: string;
  videoUrl: string;
}

// Returns a local file path — uses disk path if it exists, otherwise downloads from Google Drive
async function resolveFile(
  diskPath: string | undefined,
  url: string | undefined,
  tempPath: string
): Promise<string> {
  if (diskPath && fs.existsSync(diskPath)) return diskPath;
  if (url) {
    console.log(`  Downloading ${path.basename(tempPath)} from Google Drive...`);
    await downloadFromDrive(url, tempPath);
    return tempPath;
  }
  throw new Error(`File not found on disk (${diskPath}) and no URL available.`);
}

export async function runPost(facebookOnly = false, youtubeOnly = false): Promise<void> {
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

  if (story.video_status !== 'done') {
    throw new Error(`video_status is not 'done' for story ${story.story_id} part ${story.part}.`);
  }
  if (story.posted) {
    console.log('Story already posted. Exiting.');
    return;
  }

  const tempDir = path.join(process.cwd(), 'temp', 'post');
  fs.mkdirSync(tempDir, { recursive: true });

  const localVideoPath = await resolveFile(
    story.video_path,
    story.video_url,
    path.join(tempDir, 'main_video.mp4')
  );
  const localFbVideoPath = await resolveFile(
    story.facebook_video_path,
    (story as any).facebook_video_url,
    path.join(tempDir, 'main_video_facebook.mp4')
  );
  const localThumbnailPath = await resolveFile(
    story.thumbnail_path,
    story.thumbnail_url,
    path.join(tempDir, 'thumbnail.jpg')
  );

  const label = facebookOnly ? ' [Facebook only]' : youtubeOnly ? ' [YouTube only]' : '';
  console.log(`Posting: "${story.title}" (Part ${story.part}/4)${label}`);

  const theme = getThemeById(story.theme);

  let fbStatus = youtubeOnly ? 'skipped' : 'pending';
  let ytStatus = facebookOnly ? 'skipped' : 'pending';

  const [fbResult, ytResult] = await Promise.allSettled([
    // FACEBOOK TASK
    (async () => {
      if (youtubeOnly) return null;

      console.log('\nPosting to Facebook...');
      const result = await postVideoToFacebook(
        localFbVideoPath,
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
          console.log('  Posting previous parts comment on Facebook...');
          await postPreviousPartsComment(result.postId, previousParts);
          await updateStoryPart(story.id!, { comment_posted: true });
        }
      }

      return result;
    })(),

    // YOUTUBE TASK
    (async () => {
      if (facebookOnly) return null;

      console.log('\nUploading to YouTube...');

      let playlistId = await getPlaylistId(story.story_id);
      if (!playlistId) {
        playlistId = await ytGetOrCreatePlaylist(story.title, theme);
        await dbGetOrCreatePlaylist(story.story_id, story.title, story.theme, playlistId);
      }

      const ytUploadResult = await uploadMainVideo(
        localVideoPath,
        localThumbnailPath,
        localThumbnailPath, // subtitle path — use thumbnail as fallback since no subtitle file
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
        youtube_video_id: ytUploadResult.videoId,
        youtube_video_url: ytUploadResult.videoUrl,
        youtube_playlist_id: playlistId,
      });

      // Post previous parts comment
      if (story.part > 1) {
        await new Promise((r) => setTimeout(r, 30000));
        const allParts = await getAllPartUrls(story.story_id);
        const previousParts = allParts
          .filter((p) => p.part < story.part && p.youtube_video_url)
          .map((p) => ({ part: p.part, url: p.youtube_video_url! }));
        if (previousParts.length > 0) {
          console.log('  Posting previous parts comment on YouTube...');
          await ytPostPreviousPartsComment(ytUploadResult.videoId, previousParts);
        }
      }

      // Update descriptions of all parts with full story links
      console.log('  Updating YouTube descriptions...');
      const allParts = await getAllPartUrls(story.story_id);
      const partsWithUrls = allParts.filter((p) => p.youtube_video_id);
      for (const p of partsWithUrls) {
        if (p.youtube_video_id && p.youtube_video_id !== ytUploadResult.videoId) {
          try {
            const newDesc = `${story.youtube_description}\n\nFull Series:\n${allParts
              .filter((pp) => pp.youtube_video_url)
              .map((pp) => `Part ${pp.part}: ${pp.youtube_video_url}`)
              .join('\n')}`;
            await updateVideoDescription(p.youtube_video_id, newDesc);
          } catch (_) {
            // non-fatal
          }
        }
      }

      return ytUploadResult;
    })(),
  ]);

  const fbData = fbResult.status === 'fulfilled' ? fbResult.value : null;
  if (fbResult.status === 'rejected') {
    console.error('  Facebook error:', (fbResult.reason as Error).message);
  }
  const ytData = ytResult.status === 'fulfilled' ? ytResult.value as YouTubeUploadResult | null : null;
  if (ytResult.status === 'rejected') {
    console.error('  YouTube error:', (ytResult.reason as Error).message);
  }

  // Only mark as posted and delete video when running without flags (both platforms)
  // or when both succeeded without partial flags
  const runningBothPlatforms = !facebookOnly && !youtubeOnly;
  const bothSucceeded =
    fbResult.status === 'fulfilled' && ytResult.status === 'fulfilled';

  if (runningBothPlatforms && bothSucceeded) {
    await markAsPosted(story.id!);
    console.log('\nMarked as posted.');

    // Delete from Google Drive (free up space)
    for (const url of [story.video_url, (story as any).facebook_video_url].filter(Boolean)) {
      await deleteFromDrive(url);
    }

    // Clean up temp download folder (GitHub Actions only — local files are kept)
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (_) {}
  }

  // Save run stats
  await saveRunStats({
    run_type: 'post',
    story_id: story.story_id,
    theme: story.theme,
    story_title: story.title,
    facebook_status: fbStatus,
    youtube_status: ytStatus,
    error_message:
      fbResult.status === 'rejected' || ytResult.status === 'rejected'
        ? `FB: ${fbResult.status === 'rejected' ? (fbResult.reason as Error).message : 'ok'} | YT: ${ytResult.status === 'rejected' ? (ytResult.reason as Error).message : 'ok'}`
        : undefined,
  });

  console.log('\nAll done!');
  if (fbData) console.log(`  Facebook: ${(fbData as any).postUrl}`);
  if (ytData) console.log(`  YouTube: ${ytData.videoUrl}`);
}
