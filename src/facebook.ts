import fetch from 'node-fetch';
import * as fs from 'fs';

const PAGE_ID = process.env.FACEBOOK_PAGE_ID!;
const ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN!;
const BASE_URL = 'https://graph.facebook.com/v19.0';

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i + 1) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

export interface FacebookPostResult {
  postId: string;
  postUrl: string;
}

export async function postVideoToFacebook(
  videoPath: string,
  caption: string,
  title: string
): Promise<FacebookPostResult> {
  console.log('  Initializing Facebook video upload...');

  // Step 1: Initialize upload session
  const fileSize = fs.statSync(videoPath).size;

  const initResp = await retryWithBackoff(() =>
    fetch(`${BASE_URL}/${PAGE_ID}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload_phase: 'start',
        file_size: fileSize,
        access_token: ACCESS_TOKEN,
      }),
    })
  );

  const initData = (await initResp.json()) as any;
  if (!initData.upload_session_id) {
    throw new Error(`Facebook upload init failed: ${JSON.stringify(initData)}`);
  }

  const { upload_session_id, video_id, start_offset, end_offset } = initData;

  // Step 2: Upload file chunks
  const fileBuffer = fs.readFileSync(videoPath);
  let offset = parseInt(start_offset);
  let endOffset = parseInt(end_offset);

  while (offset < fileSize) {
    const chunk = fileBuffer.slice(offset, endOffset);
    const formData = new (require('form-data'))();
    formData.append('upload_phase', 'transfer');
    formData.append('upload_session_id', upload_session_id);
    formData.append('start_offset', String(offset));
    formData.append('video_file_chunk', chunk, { filename: 'video.mp4' });
    formData.append('access_token', ACCESS_TOKEN);

    const uploadResp = await retryWithBackoff(() =>
      fetch(`${BASE_URL}/${PAGE_ID}/videos`, {
        method: 'POST',
        body: formData,
      })
    );

    const uploadData = (await uploadResp.json()) as any;
    if (uploadData.error) throw new Error(`Chunk upload failed: ${uploadData.error.message}`);

    offset = parseInt(uploadData.start_offset);
    endOffset = parseInt(uploadData.end_offset);
  }

  // Step 3: Finish upload
  const finishResp = await retryWithBackoff(() =>
    fetch(`${BASE_URL}/${PAGE_ID}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upload_phase: 'finish',
        upload_session_id,
        description: caption,
        title,
        access_token: ACCESS_TOKEN,
        published: true,
      }),
    })
  );

  const finishData = (await finishResp.json()) as any;
  if (!finishData.success && !finishData.id) {
    throw new Error(`Facebook finish upload failed: ${JSON.stringify(finishData)}`);
  }

  const postId = video_id;
  const postUrl = `https://www.facebook.com/${PAGE_ID}/videos/${video_id}`;

  return { postId, postUrl };
}

export async function postPreviousPartsComment(
  postId: string,
  previousParts: Array<{ part: number; url: string; title: string }>
): Promise<void> {
  if (!previousParts.length) return;

  const commentLines = previousParts
    .map((p) => `📺 Part ${p.part}: ${p.title}\n${p.url}`)
    .join('\n\n');

  const comment = `📚 Missed the beginning? Watch from the start:\n\n${commentLines}\n\n⚜️ Follow Untold Lores for daily stories!`;

  await retryWithBackoff(() =>
    fetch(`${BASE_URL}/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: comment,
        access_token: ACCESS_TOKEN,
      }),
    })
  );

  console.log('  Previous parts comment posted on Facebook');
}
