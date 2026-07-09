import fetch from 'node-fetch';
import * as fs from 'fs';

const CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB — within TikTok's 5–64 MB chunk limit

async function refreshAccessToken(): Promise<string> {
  const resp = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY!,
      client_secret: process.env.TIKTOK_CLIENT_SECRET!,
      grant_type: 'refresh_token',
      refresh_token: process.env.TIKTOK_REFRESH_TOKEN!,
    }).toString(),
  });

  const data = (await resp.json()) as any;
  if (!resp.ok || !data.access_token) {
    throw new Error(`TikTok token refresh failed ${resp.status}: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

export interface TikTokPostResult {
  postId: string;
  postUrl: string;
}

export async function postVideoToTikTok(
  videoPath: string,
  caption: string
): Promise<TikTokPostResult> {
  const accessToken = await refreshAccessToken();
  const fileSize = fs.statSync(videoPath).size;
  const chunkSize = Math.min(fileSize, CHUNK_SIZE);
  const totalChunks = Math.ceil(fileSize / chunkSize);

  // Truncate caption to TikTok's 2200-char limit
  const title = caption.slice(0, 2200);

  // Step 1: Initialize upload
  const initResp = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify({
      post_info: {
        title,
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileSize,
        chunk_size: chunkSize,
        total_chunk_count: totalChunks,
      },
    }),
  });

  const initData = (await initResp.json()) as any;
  if (!initResp.ok || initData.error?.code !== 'ok') {
    throw new Error(`TikTok init failed ${initResp.status}: ${JSON.stringify(initData)}`);
  }

  const publishId: string = initData.data.publish_id;
  const uploadUrl: string = initData.data.upload_url;

  // Step 2: Upload video in chunks
  const fd = fs.openSync(videoPath, 'r');
  try {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, fileSize) - 1;
      const len = end - start + 1;
      const buf = Buffer.alloc(len);
      fs.readSync(fd, buf, 0, len, start);

      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Content-Length': String(len),
        },
        body: buf,
      });

      if (uploadResp.status !== 206 && uploadResp.status !== 200) {
        const body = await uploadResp.text().catch(() => '');
        throw new Error(`TikTok chunk ${i + 1}/${totalChunks} upload failed ${uploadResp.status}: ${body}`);
      }
      console.log(`  TikTok chunk ${i + 1}/${totalChunks} uploaded`);
    }
  } finally {
    fs.closeSync(fd);
  }

  // Step 3: Poll for publish status (max 3 minutes)
  console.log('  Waiting for TikTok to process video...');
  for (let attempt = 0; attempt < 36; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusResp = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    });

    const statusData = (await statusResp.json()) as any;
    const status: string = statusData.data?.status;

    if (status === 'PUBLISH_COMPLETE') {
      const videoId = String(statusData.data?.publicaly_available_post_id?.[0] ?? publishId);
      return {
        postId: videoId,
        postUrl: `https://www.tiktok.com/@/video/${videoId}`,
      };
    }

    if (status === 'FAILED') {
      throw new Error(`TikTok publish failed: ${JSON.stringify(statusData)}`);
    }
  }

  throw new Error('TikTok publish timed out after 3 minutes');
}
