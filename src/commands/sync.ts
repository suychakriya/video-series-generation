import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import type { StoryRecord } from '../database';
import { STORAGE_BUCKET } from '../storage';

const STORIES_DIR = path.join(process.cwd(), 'temp', 'stories');

function supabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  return createClient(url, key);
}

function getLatestStoryId(): string {
  if (!fs.existsSync(STORIES_DIR)) throw new Error(`No stories dir found: ${STORIES_DIR}`);
  const files = fs.readdirSync(STORIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ id: f.replace('.json', ''), mtime: fs.statSync(path.join(STORIES_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  if (files.length === 0) throw new Error('No story files found in temp/stories/');
  return files[0].id;
}

function readStoryParts(storyId: string): StoryRecord[] {
  const p = path.join(STORIES_DIR, `${storyId}.json`);
  if (!fs.existsSync(p)) throw new Error(`Story file not found: ${p}`);
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as StoryRecord[];
}

async function uploadFile(localPath: string, storagePath: string): Promise<void> {
  const file = fs.readFileSync(localPath);
  const mimeType = localPath.endsWith('.mp3') ? 'audio/mpeg'
    : localPath.endsWith('.jpg') ? 'image/jpeg'
    : localPath.endsWith('.json') ? 'application/json'
    : 'application/octet-stream';

  const { error } = await supabase().storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: mimeType, upsert: true });

  if (error) throw new Error(`Storage upload failed (${storagePath}): ${error.message}`);
}

async function uploadDir(localDir: string, storagePrefix: string): Promise<number> {
  if (!fs.existsSync(localDir)) return 0;
  const files = fs.readdirSync(localDir).filter((f) => !fs.statSync(path.join(localDir, f)).isDirectory());
  for (const file of files) {
    await uploadFile(path.join(localDir, file), `${storagePrefix}/${file}`);
  }
  return files.length;
}

async function syncPart(record: StoryRecord): Promise<void> {
  const { story_id, part } = record;
  const partDir = path.join(process.cwd(), 'temp', story_id, `part_${part}`);
  const storageBase = `${story_id}/part_${part}`;

  console.log(`\n--- Part ${part}/4: "${record.title}" ---`);

  // Images
  const imageDir = path.join(partDir, 'images');
  const imageCount = await uploadDir(imageDir, `${storageBase}/images`);
  console.log(`  Images uploaded: ${imageCount}`);

  // English scene audios
  const sceneAudioDir = path.join(partDir, 'scene_audios');
  const sceneAudioCount = await uploadDir(sceneAudioDir, `${storageBase}/audio/scene_audios`);
  console.log(`  English scene audios uploaded: ${sceneAudioCount}`);

  // Khmer scene audios
  const khmerAudioDir = path.join(partDir, 'khmer_audios');
  const khmerAudioCount = await uploadDir(khmerAudioDir, `${storageBase}/audio/khmer_audios`);
  if (khmerAudioCount > 0) console.log(`  Khmer scene audios uploaded: ${khmerAudioCount}`);

  // Narration + timings files
  const rootFiles = [
    'narration.mp3',
    'narration_khmer.mp3',
    'timings.json',
    'timings_khmer.json',
  ];
  let rootCount = 0;
  for (const file of rootFiles) {
    const localPath = path.join(partDir, file);
    if (fs.existsSync(localPath)) {
      await uploadFile(localPath, `${storageBase}/audio/${file}`);
      rootCount++;
    }
  }
  console.log(`  Narration + timings uploaded: ${rootCount}`);
}

export async function runSync(partArg?: number, storyArg?: string): Promise<void> {
  const storyId = storyArg || getLatestStoryId();
  const records = readStoryParts(storyId);
  if (records.length === 0) throw new Error(`No parts found for story: ${storyId}`);

  console.log(`\nSyncing story to Supabase: ${storyId}`);

  // Upsert all story parts into Supabase DB
  console.log('\nInserting story records into Supabase DB...');
  for (const record of records) {
    const { id: _localId, ...recordWithoutId } = record as any;
    const { error } = await supabase().from('stories').upsert({
      ...recordWithoutId,
      posted: record.posted ?? false,
      images_status: record.images_status || 'done',
      audio_status: record.audio_status || 'done',
      video_status: 'pending',
    }, { onConflict: 'story_id,part' });
    if (error) throw new Error(`DB upsert error (part ${record.part}): ${error.message}`);
    console.log(`  Part ${record.part} record saved ✅`);
  }

  // Upload images + audio to Supabase Storage
  console.log('\nUploading images + audio to Supabase Storage...');
  const parts = partArg ? [partArg] : [1, 2, 3, 4];
  for (const partNum of parts) {
    const record = records.find((r) => r.part === partNum);
    if (!record) {
      console.log(`  Part ${partNum}: not found locally, skipping`);
      continue;
    }
    await syncPart(record);
  }

  console.log('\nSync complete. You can now trigger the render workflow on GitHub Actions.');
  console.log(`Story ID: ${storyId}`);
  console.log('Post dates:');
  for (const r of records.sort((a, b) => a.part - b.part)) {
    console.log(`  Part ${r.part}: ${r.post_date}`);
  }
}
