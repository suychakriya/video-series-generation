/**
 * Seeds temp/db.json from test-output/last-story.json
 * Run: npx ts-node src/seed-local-db.ts
 */
import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { FullStory } from './story';

const STORY_PATH = path.join(process.cwd(), 'test-output', 'last-story.json');
const DB_PATH = path.join(process.cwd(), 'temp', 'db.json');

function newId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function main() {
  if (!fs.existsSync(STORY_PATH)) {
    console.error(`Not found: ${STORY_PATH}`);
    process.exit(1);
  }

  const story: FullStory & { story_id: string } = JSON.parse(fs.readFileSync(STORY_PATH, 'utf-8'));
  console.log(`Story: "${story.overall_title}" (${story.story_id})`);

  // Load existing db or start fresh
  const db: any = fs.existsSync(DB_PATH)
    ? JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'))
    : { stories: [], themeIndex: 0, playlists: [] };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  let added = 0;
  let skipped = 0;

  for (const part of story.parts) {
    const exists = db.stories.find(
      (s: any) => s.story_id === story.story_id && s.part === part.part
    );

    if (exists) {
      console.log(`  Part ${part.part}: already in db — skipping`);
      skipped++;
      continue;
    }

    const postDate = new Date(tomorrow);
    postDate.setDate(postDate.getDate() + (part.part - 1));

    db.stories.push({
      id: newId(),
      story_id: story.story_id,
      part: part.part,
      theme: 'horror_thriller',
      title: part.title,
      content: part.content,
      hook: part.hook,
      thumbnail_title: part.thumbnail_title,
      scenes: part.scenes,
      character_description: story.character_description,
      style_prompt: story.style_prompt,
      image_seed: story.image_seed,
      facebook_caption: part.facebook_caption,
      youtube_title: part.youtube_title,
      youtube_description: part.youtube_description_hook,
      youtube_tags: 'horror story,thriller,scary story,horror narration,animated horror,untold lores',
      post_date: postDate.toISOString().split('T')[0],
      posted: false,
      images_status: 'pending',
      audio_status: 'pending',
      video_status: 'pending',
    });

    console.log(`  Part ${part.part}: "${part.title}" — added`);
    added++;
  }

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

  console.log(`\nDone — ${added} added, ${skipped} skipped`);
  console.log(`DB: ${DB_PATH}`);
}

main();
