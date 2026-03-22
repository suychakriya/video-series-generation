import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

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

export async function uploadVideo(
  localPath: string,
  storyId: string,
  partNumber: number,
  type: 'main_video' | 'short'
): Promise<string> {
  const publicId = `stories/${storyId}/part_${partNumber}/${type}`;
  console.log(`  Uploading ${type} to Cloudinary...`);

  const result = await retryWithBackoff(() =>
    cloudinary.uploader.upload(localPath, {
      resource_type: 'video',
      public_id: publicId,
      overwrite: true,
      timeout: 600000,
    })
  );

  return result.secure_url;
}

export async function uploadThumbnail(
  localPath: string,
  storyId: string,
  partNumber: number
): Promise<string> {
  const publicId = `stories/${storyId}/part_${partNumber}/thumbnail`;

  const result = await retryWithBackoff(() =>
    cloudinary.uploader.upload(localPath, {
      resource_type: 'image',
      public_id: publicId,
      overwrite: true,
    })
  );

  return result.secure_url;
}

export async function uploadAudio(
  localPath: string,
  storyId: string,
  partNumber: number,
  type: 'narration' | 'short_narration'
): Promise<string> {
  const publicId = `stories/${storyId}/part_${partNumber}/${type}`;

  const result = await retryWithBackoff(() =>
    cloudinary.uploader.upload(localPath, {
      resource_type: 'video', // Cloudinary uses 'video' for audio too
      public_id: publicId,
      overwrite: true,
    })
  );

  return result.secure_url;
}

export async function uploadSubtitles(
  localPath: string,
  storyId: string,
  partNumber: number
): Promise<string> {
  const publicId = `stories/${storyId}/part_${partNumber}/subtitles`;

  const result = await retryWithBackoff(() =>
    cloudinary.uploader.upload(localPath, {
      resource_type: 'raw',
      public_id: publicId,
      overwrite: true,
    })
  );

  return result.secure_url;
}

export async function deleteFromCloudinary(url: string): Promise<void> {
  try {
    // Extract public_id from URL
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (!match) return;
    const publicId = match[1];
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
  } catch (err) {
    console.warn(`  Warning: Could not delete from Cloudinary: ${url}`);
  }
}

export async function uploadAllPartAssets(
  storyId: string,
  partNumber: number,
  paths: {
    mainVideo?: string;
    short?: string;
    thumbnail?: string;
    audio?: string;
    shortAudio?: string;
    subtitles?: string;
  }
): Promise<{
  mainVideoUrl?: string;
  shortUrl?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  shortAudioUrl?: string;
  subtitleUrl?: string;
}> {
  const urls: any = {};

  if (paths.mainVideo)
    urls.mainVideoUrl = await uploadVideo(paths.mainVideo, storyId, partNumber, 'main_video');
  if (paths.short) urls.shortUrl = await uploadVideo(paths.short, storyId, partNumber, 'short');
  if (paths.thumbnail)
    urls.thumbnailUrl = await uploadThumbnail(paths.thumbnail, storyId, partNumber);
  if (paths.audio) urls.audioUrl = await uploadAudio(paths.audio, storyId, partNumber, 'narration');
  if (paths.shortAudio)
    urls.shortAudioUrl = await uploadAudio(
      paths.shortAudio,
      storyId,
      partNumber,
      'short_narration'
    );
  if (paths.subtitles)
    urls.subtitleUrl = await uploadSubtitles(paths.subtitles, storyId, partNumber);

  return urls;
}

export function cleanupTempFiles(storyId: string): void {
  const tempDir = path.join(process.cwd(), 'temp', storyId);
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`  Cleaned up temp files for ${storyId}`);
  } catch (err) {
    console.warn(`  Warning: Could not clean up temp dir: ${tempDir}`);
  }
}
