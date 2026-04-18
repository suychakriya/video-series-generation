import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

const LOCAL_MODE = process.env.LOCAL_MODE === 'true';

function getDriveClient() {
  const auth = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth });
}

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

async function uploadToDrive(
  localPath: string,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const drive = getDriveClient();
  const sizeMB = (fs.statSync(localPath).size / 1024 / 1024).toFixed(1);
  console.log(`  Uploading ${fileName} to Google Drive... (${sizeMB} MB)`);

  const requestBody: any = { name: fileName };
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    requestBody.parents = [process.env.GOOGLE_DRIVE_FOLDER_ID];
  }

  const res = await retryWithBackoff(() =>
    drive.files.create({
      requestBody,
      media: { mimeType, body: fs.createReadStream(localPath) },
      fields: 'id',
    })
  );

  const fileId = res.data.id!;

  // Make publicly readable
  await drive.permissions.create({
    fileId,
    requestBody: { role: 'reader', type: 'anyone' },
  });

  return `https://drive.google.com/file/d/${fileId}`;
}

export async function uploadVideo(
  localPath: string,
  storyId: string,
  partNumber: number,
  type: 'main_video' | 'facebook_video' | 'khmer_facebook_video' | 'short'
): Promise<string> {
  if (LOCAL_MODE) {
    console.log(`  LOCAL_MODE: skipping upload for ${type}`);
    return localPath;
  }
  const fileName = `${storyId}_part${partNumber}_${type}.mp4`;
  return uploadToDrive(localPath, fileName, 'video/mp4');
}

export async function uploadThumbnail(
  localPath: string,
  storyId: string,
  partNumber: number,
): Promise<string> {
  if (LOCAL_MODE) return localPath;
  const fileName = `${storyId}_part${partNumber}_thumbnail.jpg`;
  return uploadToDrive(localPath, fileName, 'image/jpeg');
}

export async function deleteVideoFiles(storyId: string, partNumber: number): Promise<void> {
  // no-op in local mode
}

// Download a Google Drive file to a local path (used in post.ts on GitHub Actions)
export async function downloadFromDrive(driveUrl: string, destPath: string): Promise<void> {
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error(`Invalid Google Drive URL: ${driveUrl}`);
  const fileId = match[1];

  const drive = getDriveClient();
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'stream' }
  ) as any;

  await new Promise<void>((resolve, reject) => {
    const dest = fs.createWriteStream(destPath);
    res.data.pipe(dest);
    dest.on('finish', resolve);
    dest.on('error', reject);
  });
}

export async function deleteFromDrive(driveUrl: string): Promise<void> {
  try {
    const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return;
    const fileId = match[1];
    const drive = getDriveClient();
    await drive.files.delete({ fileId });
    console.log(`  Deleted from Google Drive: ${fileId}`);
  } catch (err) {
    console.warn(`  Could not delete from Drive: ${(err as Error).message}`);
  }
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
