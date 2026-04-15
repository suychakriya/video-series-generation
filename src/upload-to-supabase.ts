/**
 * Uploads locally rendered videos to Google Drive and syncs records to Supabase DB.
 * Run after generating all parts locally: npm run upload
 * Run for a specific part: npm run upload -- --part 3
 */
import * as dotenv from 'dotenv';
dotenv.config();
// Force storage uploads regardless of LOCAL_MODE
process.env.LOCAL_MODE = 'false';

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { uploadVideo, uploadThumbnail } from './storage';
import type { StoryRecord } from './database';

const DB_PATH = path.join(process.cwd(), 'temp', 'db.json');

function readLocalDB(): { stories: StoryRecord[] } {
  if (!fs.existsSync(DB_PATH)) throw new Error(`Local db not found: ${DB_PATH}`);
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function supabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
}

async function uploadPart(record: StoryRecord): Promise<void> {
  const storyId = record.story_id;
  const partNum = record.part;
  const partDir = path.join(process.cwd(), 'temp', storyId, `part_${partNum}`);

  const videoPaths = {
    main: path.join(partDir, 'main_video.mp4'),
    facebook: path.join(partDir, 'main_video_facebook.mp4'),
    thumbnail: path.join(partDir, 'thumbnail.jpg'),
  };

  // Check files exist
  for (const [name, p] of Object.entries(videoPaths)) {
    if (!fs.existsSync(p)) throw new Error(`Missing ${name} file: ${p}`);
  }

  console.log(`\n--- Part ${partNum}/4: "${record.title}" ---`);

  // Upload to Google Drive
  const [videoUrl, fbVideoUrl, thumbnailUrl] = await Promise.all([
    uploadVideo(videoPaths.main, storyId, partNum, 'main_video'),
    uploadVideo(videoPaths.facebook, storyId, partNum, 'facebook_video'),
    uploadThumbnail(videoPaths.thumbnail, storyId, partNum),
  ]);

  console.log(`  YouTube video: ${videoUrl}`);
  console.log(`  Facebook video: ${fbVideoUrl}`);
  console.log(`  Thumbnail: ${thumbnailUrl}`);

  // Upsert into Supabase DB
  const { error } = await supabase().from('stories').upsert({
    story_id: record.story_id,
    part: record.part,
    theme: record.theme,
    title: record.title,
    content: record.content,
    hook: record.hook,
    thumbnail_title: record.thumbnail_title,
    scenes: (record as any).scenes,
    character_description: record.character_description,
    style_prompt: record.style_prompt,
    image_seed: record.image_seed,
    facebook_caption: record.facebook_caption,
    youtube_title: record.youtube_title,
    youtube_description: record.youtube_description,
    youtube_tags: record.youtube_tags,
    post_date: record.post_date,
    posted: false,
    video_status: 'done',
    images_status: 'done',
    audio_status: 'done',
    video_url: videoUrl,
    facebook_video_url: fbVideoUrl,
    thumbnail_url: thumbnailUrl,
    video_path: videoPaths.main,
    facebook_video_path: videoPaths.facebook,
    thumbnail_path: videoPaths.thumbnail,
    dramatic_image_url: record.dramatic_image_url,
  }, { onConflict: 'story_id,part' });

  if (error) throw new Error(`Supabase DB error: ${error.message}`);
  console.log(`  Supabase DB record upserted ✅`);
}

async function main() {
  const partArg = process.argv.includes('--part')
    ? parseInt(process.argv[process.argv.indexOf('--part') + 1])
    : undefined;

  const db = readLocalDB();
  const latest = db.stories[db.stories.length - 1];
  if (!latest) throw new Error('No stories in local db');

  const storyId = latest.story_id;
  console.log(`\nUploading story: ${storyId}`);

  const parts = partArg ? [partArg] : [1, 2, 3, 4];

  for (const partNum of parts) {
    const record = db.stories.find((s) => s.story_id === storyId && s.part === partNum);
    if (!record) {
      console.log(`  Part ${partNum}: not in local db, skipping`);
      continue;
    }
    await uploadPart(record);
  }

  console.log('\nUpload complete. GitHub Actions will post on the scheduled post_date.');
  console.log('Post dates:');
  for (const partNum of parts) {
    const r = db.stories.find((s) => s.story_id === storyId && s.part === partNum);
    if (r) console.log(`  Part ${partNum}: ${r.post_date}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
