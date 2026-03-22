import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import * as fs from 'fs';
import * as path from 'path';
import { Theme } from './themes';

function createOAuthClient(): OAuth2Client {
  const oauth2Client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID!,
    process.env.YOUTUBE_CLIENT_SECRET!
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.YOUTUBE_REFRESH_TOKEN!,
  });

  return oauth2Client;
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      if (err?.code === 403 && err?.message?.includes('quota')) {
        throw err; // don't retry quota errors
      }
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i + 1) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

export interface YouTubeUploadResult {
  videoId: string;
  videoUrl: string;
}

export async function uploadMainVideo(
  videoPath: string,
  thumbnailPath: string,
  subtitlePath: string,
  playlistId: string,
  part: {
    part: number;
    youtube_title: string;
    youtube_description: string;
    youtube_tags: string;
    hook: string;
  },
  theme: Theme,
  storyTitle: string,
  channelId: string
): Promise<YouTubeUploadResult> {
  const auth = createOAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const tags = part.youtube_tags.split(',').map((t) => t.trim());

  const fullDescription = `${part.youtube_description}\n\n⚜️ Untold Lores — Daily Story Videos\n${theme.facebookHashtags}\n\nSubscribe for new parts every day!`;

  console.log('  Uploading main video to YouTube...');

  const uploadResp = await retryWithBackoff(() =>
    youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: part.youtube_title,
          description: fullDescription,
          tags,
          categoryId: '24',
          channelId,
        },
        status: {
          privacyStatus: 'public',
          madeForKids: false,
        },
      },
      media: {
        mimeType: 'video/mp4',
        body: fs.createReadStream(videoPath),
      },
    } as any)
  );

  const videoId = uploadResp.data.id!;
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Set custom thumbnail
  try {
    console.log('  Setting custom thumbnail...');
    await retryWithBackoff(() =>
      youtube.thumbnails.set({
        videoId,
        media: {
          mimeType: 'image/jpeg',
          body: fs.createReadStream(thumbnailPath),
        },
      } as any)
    );
    console.log('  Thumbnail set');
  } catch (err) {
    console.warn('  Warning: Could not set thumbnail:', (err as Error).message);
  }

  // Upload subtitles
  try {
    console.log('  Uploading subtitles...');
    await retryWithBackoff(() =>
      youtube.captions.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            videoId,
            language: 'en',
            name: 'English',
            isDraft: false,
          },
        },
        media: {
          mimeType: 'application/x-subrip',
          body: fs.createReadStream(subtitlePath),
        },
      } as any)
    );
    console.log('  Subtitles uploaded');
  } catch (err) {
    console.warn('  Warning: Could not upload subtitles:', (err as Error).message);
  }

  // Add to playlist
  try {
    console.log('  Adding to playlist...');
    await retryWithBackoff(() =>
      youtube.playlistItems.insert({
        part: ['snippet'],
        requestBody: {
          snippet: {
            playlistId,
            resourceId: {
              kind: 'youtube#video',
              videoId,
            },
          },
        },
      })
    );
    console.log('  Added to playlist');
  } catch (err) {
    console.warn('  Warning: Could not add to playlist:', (err as Error).message);
  }

  return { videoId, videoUrl };
}

export async function uploadShort(
  shortPath: string,
  part: { part: number; hook: string },
  theme: Theme,
  mainVideoUrl: string
): Promise<YouTubeUploadResult> {
  const auth = createOAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const hookTruncated = part.hook.substring(0, 55);
  const title = `${hookTruncated}... 😱 #Shorts #UntoldLores #${theme.id}`;

  const description = `⚠️ Watch what happens next 👇
Full story: ${mainVideoUrl}

⚜️ Subscribe to Untold Lores for daily stories!
New lore every day.

#Shorts #UntoldLores #${theme.id} #storytime #viral`;

  console.log('  Uploading YouTube Short...');

  const uploadResp = await retryWithBackoff(() =>
    youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
          tags: ['shorts', 'untoldlores', theme.name, 'storytime', 'viral', 'story'],
          categoryId: '24',
        },
        status: {
          privacyStatus: 'public',
          madeForKids: false,
        },
      },
      media: {
        mimeType: 'video/mp4',
        body: fs.createReadStream(shortPath),
      },
    } as any)
  );

  const shortId = uploadResp.data.id!;
  const shortUrl = `https://www.youtube.com/shorts/${shortId}`;

  console.log(`  Short uploaded: ${shortUrl}`);
  return { videoId: shortId, videoUrl: shortUrl };
}

export async function getOrCreatePlaylist(storyTitle: string, theme: Theme): Promise<string> {
  const auth = createOAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const resp = await youtube.playlists.insert({
    part: ['snippet', 'status'],
    requestBody: {
      snippet: {
        title: `${storyTitle} | Untold Lores`,
        description: `Full ${theme.name} story series. New part every day.\n\n${theme.facebookHashtags}`,
        tags: theme.youtubeTags.split(',').map((t) => t.trim()),
      },
      status: {
        privacyStatus: 'public',
      },
    },
  });

  return resp.data.id!;
}

export async function updateVideoDescription(
  videoId: string,
  newDescription: string
): Promise<void> {
  const auth = createOAuthClient();
  const youtube = google.youtube({ version: 'v3', auth });

  const existing = await youtube.videos.list({
    part: ['snippet'],
    id: [videoId],
  });

  const snippet = existing.data.items?.[0]?.snippet;
  if (!snippet) return;

  await retryWithBackoff(() =>
    youtube.videos.update({
      part: ['snippet'],
      requestBody: {
        id: videoId,
        snippet: {
          ...snippet,
          description: newDescription,
        },
      },
    })
  );
}
