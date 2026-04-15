import * as dotenv from 'dotenv';
dotenv.config();

import { getLatestStory, getStoryPart, updatePartStatus } from '../database';
import { generateMainAudio } from '../audio';
import { getThemeById } from '../themes';

export async function runAudio(partArg?: number): Promise<void> {
  const latestStory = await getLatestStory();
  if (!latestStory) {
    throw new Error('No story found in Supabase. Run "node src/index.ts story" first.');
  }

  const storyId = latestStory.story_id;
  console.log(`\nGenerating audio for story: ${storyId}`);

  const parts = partArg ? [partArg] : [1, 2, 3, 4];

  for (const partNum of parts) {
    const record = await getStoryPart(storyId, partNum);
    if (!record || !record.id) {
      console.log(`  Part ${partNum}: not found in Supabase, skipping`);
      continue;
    }

    console.log(`\n--- Part ${partNum}/4 ---`);

    const theme = getThemeById(record.theme);

    const storyPart = {
      part: record.part,
      title: record.title,
      content: record.content,
      hook: record.hook,
      thumbnail_title: record.thumbnail_title || '',
      scenes: (record as any).scenes || [],
      facebook_caption: record.facebook_caption,
      youtube_title: record.youtube_title,
      youtube_description_hook: record.youtube_description,
    };

    if (!storyPart.scenes || storyPart.scenes.length === 0) {
      console.log(`  Part ${partNum}: no scenes data in DB record, skipping`);
      continue;
    }

    console.log(`  Generating main audio...`);
    const { audioPath } = await generateMainAudio(
      storyPart,
      theme,
      record.title,
      storyId
    );

    await updatePartStatus(record.id, { audio_status: 'done' });

    console.log(`  Part ${partNum} audio done: ${audioPath}`);
  }

  console.log('\nAudio generation complete.');
}
