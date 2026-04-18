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

const STORIES_DIR = path.join(process.cwd(), 'temp', 'stories');

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
    khmer: path.join(partDir, 'main_video_facebook_khmer.mp4'),
  };

  // Check required files exist
  for (const [name, p] of Object.entries(videoPaths)) {
    if (name === 'khmer') continue; // optional
    if (!fs.existsSync(p)) throw new Error(`Missing ${name} file: ${p}`);
  }

  const hasKhmer = fs.existsSync(videoPaths.khmer);

  console.log(`\n--- Part ${partNum}/4: "${record.title}" ---`);
  if (hasKhmer) console.log(`  Khmer video found — will upload`);

  // Upload to Google Drive
  const uploadTasks: Promise<string>[] = [
    uploadVideo(videoPaths.main, storyId, partNum, 'main_video'),
    uploadVideo(videoPaths.facebook, storyId, partNum, 'facebook_video'),
    uploadThumbnail(videoPaths.thumbnail, storyId, partNum),
  ];
  if (hasKhmer) {
    uploadTasks.push(uploadVideo(videoPaths.khmer, storyId, partNum, 'khmer_facebook_video'));
  }

  const [videoUrl, fbVideoUrl, thumbnailUrl, khmerFbVideoUrl] = await Promise.all(uploadTasks);

  console.log(`  YouTube video: ${videoUrl}`);
  console.log(`  Facebook video: ${fbVideoUrl}`);
  console.log(`  Thumbnail: ${thumbnailUrl}`);
  if (khmerFbVideoUrl) console.log(`  Khmer Facebook video: ${khmerFbVideoUrl}`);

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
    ...(khmerFbVideoUrl ? { khmer_facebook_video_url: khmerFbVideoUrl } : {}),
    video_path: videoPaths.main,
    facebook_video_path: videoPaths.facebook,
    thumbnail_path: videoPaths.thumbnail,
    ...(hasKhmer ? { khmer_facebook_video_path: videoPaths.khmer } : {}),
    dramatic_image_url: record.dramatic_image_url,
  }, { onConflict: 'story_id,part' });

  if (error) throw new Error(`Supabase DB error: ${error.message}`);
  console.log(`  Supabase DB record upserted ✅`);
}

async function main() {
  const partArg = process.argv.includes('--part')
    ? parseInt(process.argv[process.argv.indexOf('--part') + 1])
    : undefined;

  const storyIdArg = process.argv.includes('--story')
    ? process.argv[process.argv.indexOf('--story') + 1]
    : undefined;

  const storyId = storyIdArg || getLatestStoryId();
  const records = readStoryParts(storyId);
  if (records.length === 0) throw new Error(`No parts found for story: ${storyId}`);

  console.log(`\nUploading story: ${storyId}`);

  const parts = partArg ? [partArg] : [1, 2, 3, 4];

  for (const partNum of parts) {
    const record = records.find((s) => s.part === partNum);
    if (!record) {
      console.log(`  Part ${partNum}: not in local db, skipping`);
      continue;
    }
    await uploadPart(record);
  }

  console.log('\nUpload complete. GitHub Actions will post on the scheduled post_date.');
  console.log('Post dates:');
  for (const partNum of parts) {
    const r = records.find((s) => s.part === partNum);
    if (r) console.log(`  Part ${partNum}: ${r.post_date}`);
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
