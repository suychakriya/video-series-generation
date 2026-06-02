import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import { saveStoryPart, getLatestScheduledPostDate } from '../database';
import { getThemeById } from '../themes';

function findLatestStoryJson(): string {
  const searchDirs = ['stories', 'temp/stories'];
  const candidates: { file: string; mtime: number }[] = [];

  for (const dir of searchDirs) {
    const absDir = path.resolve(dir);
    if (!fs.existsSync(absDir)) continue;
    for (const f of fs.readdirSync(absDir)) {
      if (f.startsWith('story_') && f.endsWith('.json')) {
        const full = path.join(absDir, f);
        candidates.push({ file: full, mtime: fs.statSync(full).mtimeMs });
      }
    }
  }

  if (candidates.length === 0) throw new Error('No story JSON files found in stories/ or temp/stories/');
  candidates.sort((a, b) => b.mtime - a.mtime);
  return candidates[0].file;
}

export async function runImportStory(jsonPath?: string): Promise<void> {
  const absPath = jsonPath ? path.resolve(jsonPath) : findLatestStoryJson();
  console.log(`\nUsing file: ${absPath}`);
  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  const raw = fs.readFileSync(absPath, 'utf-8');
  const story = JSON.parse(raw);

  console.log(`\nImporting story: ${story.story_id}`);
  console.log(`Title: "${story.overall_title}"`);

  // Detect theme from the filename or default to unexplained_events
  // The JSON doesn't store theme — infer from parts or use arg
  const themeId = process.env.IMPORT_THEME || 'unexplained_events';
  const theme = getThemeById(themeId);
  console.log(`Theme: ${theme.name}`);

  const latestPostDate = await getLatestScheduledPostDate();
  const base = latestPostDate ? new Date(latestPostDate + 'T00:00:00') : new Date();
  const startDate = new Date(base);
  startDate.setDate(base.getDate() + 1);

  for (let i = 0; i < story.parts.length; i++) {
    const part = story.parts[i];
    const postDate = new Date(startDate);
    postDate.setDate(startDate.getDate() + i);
    const postDateStr = `${postDate.getFullYear()}-${String(postDate.getMonth() + 1).padStart(2, '0')}-${String(postDate.getDate()).padStart(2, '0')}`;

    const recordId = await saveStoryPart({
      story_id: story.story_id,
      part: part.part,
      theme: theme.id,
      title: part.title,
      content: part.content,
      hook: part.hook,
      opening_hook: part.opening_hook,
      thumbnail_title: part.thumbnail_title,
      character_description: story.character_description,
      entity_description: story.entity_description,
      style_prompt: story.style_prompt,
      image_seed: story.image_seed,
      facebook_caption: part.facebook_caption,
      youtube_title: `${story.overall_title} - Part ${part.part}`,
      youtube_description: part.youtube_description_hook,
      youtube_tags: theme.youtubeTags,
      post_date: postDateStr,
      posted: false,
      images_status: 'pending',
      audio_status: 'pending',
      video_status: 'pending',
      scenes: part.scenes,
      khmer_title: part.khmer_title,
      khmer_hook: part.khmer_hook,
      khmer_facebook_caption: part.khmer_facebook_caption,
    });

    console.log(`  Part ${part.part}/4 saved (id: ${recordId}, post_date: ${postDateStr})`);
  }

  console.log(`\nImport complete — story_id: ${story.story_id}`);
}
