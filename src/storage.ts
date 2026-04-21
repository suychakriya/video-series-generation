import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

export const STORAGE_BUCKET = 'story-assets';

// ── Google Drive ──────────────────────────────────────────────────────────────

function getDriveClient() {
  const auth = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
  );
  auth.setCredentials({ refresh_token: process.env.YOUTUBE_REFRESH_TOKEN });
  return google.drive({ version: 'v3', auth });
}

const LOCAL_MODE = process.env.LOCAL_MODE === 'true';

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

// ── Supabase Storage ──────────────────────────────────────────────────────────

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  return createClient(url, key);
}

async function downloadFolder(
  sb: ReturnType<typeof getSupabaseClient>,
  storagePrefix: string,
  localDir: string
): Promise<void> {
  const { data: files, error } = await sb.storage.from(STORAGE_BUCKET).list(storagePrefix);
  if (error || !files || files.length === 0) {
    fs.mkdirSync(localDir, { recursive: true });
    return;
  }

  fs.mkdirSync(localDir, { recursive: true });

  for (const file of files) {
    if (file.name === '.emptyFolderPlaceholder') continue;
    const { data, error: dlError } = await sb.storage
      .from(STORAGE_BUCKET)
      .download(`${storagePrefix}/${file.name}`);
    if (dlError || !data) throw new Error(`Download failed (${storagePrefix}/${file.name}): ${dlError?.message}`);
    const buf = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(path.join(localDir, file.name), buf);
  }
}

export async function downloadStoryAssets(storyId: string, partNum: number): Promise<void> {
  const sb = getSupabaseClient();
  const storageBase = `${storyId}/part_${partNum}`;
  const partDir = path.join(process.cwd(), 'temp', storyId, `part_${partNum}`);

  console.log(`  Downloading assets from Supabase Storage for part ${partNum}...`);

  // Images
  await downloadFolder(sb, `${storageBase}/images`, path.join(partDir, 'images'));

  // English scene audios
  await downloadFolder(sb, `${storageBase}/audio/scene_audios`, path.join(partDir, 'scene_audios'));

  // Khmer scene audios (optional)
  await downloadFolder(sb, `${storageBase}/audio/khmer_audios`, path.join(partDir, 'khmer_audios'));

  // Narration + timings root files
  fs.mkdirSync(partDir, { recursive: true });
  const rootFiles = ['narration.mp3', 'narration_khmer.mp3', 'timings.json', 'timings_khmer.json'];
  for (const file of rootFiles) {
    const { data, error } = await sb.storage
      .from(STORAGE_BUCKET)
      .download(`${storageBase}/audio/${file}`);
    if (error || !data) continue; // optional — khmer files may not exist
    const buf = Buffer.from(await data.arrayBuffer());
    fs.writeFileSync(path.join(partDir, file), buf);
  }

  console.log(`  Assets downloaded for part ${partNum} ✅`);
}

export async function deleteStoryFromStorage(storyId: string): Promise<void> {
  const sb = getSupabaseClient();

  const folders = [1, 2, 3, 4].flatMap((partNum) => [
    `${storyId}/part_${partNum}/images`,
    `${storyId}/part_${partNum}/audio/scene_audios`,
    `${storyId}/part_${partNum}/audio/khmer_audios`,
    `${storyId}/part_${partNum}/audio`,
  ]);

  for (const folder of folders) {
    const { data: files } = await sb.storage.from(STORAGE_BUCKET).list(folder);
    if (!files || files.length === 0) continue;
    const filePaths = files
      .filter((f) => f.name !== '.emptyFolderPlaceholder')
      .map((f) => `${folder}/${f.name}`);
    if (filePaths.length > 0) {
      await sb.storage.from(STORAGE_BUCKET).remove(filePaths);
    }
  }

  console.log(`  Deleted story assets from Supabase Storage: ${storyId}`);
}
