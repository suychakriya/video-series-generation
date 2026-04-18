import * as dotenv from 'dotenv';
dotenv.config();

import { getLatestStory, getStoryPart, updatePartStatus } from '../database';
import { generateMainAudio, generateKhmerAudio } from '../audio';
import { getThemeById } from '../themes';

export async function runAudio(partArg?: number, storyArg?: string): Promise<void> {
  let storyId: string;
  if (storyArg) {
    storyId = storyArg;
    console.log(`\nUsing specified story: ${storyId}`);
  } else {
    const latestStory = await getLatestStory();
    if (!latestStory) {
      throw new Error('No story found in Supabase. Run "node src/index.ts story" first.');
    }
    storyId = latestStory.story_id;
  }

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
      khmer_title: (record as any).khmer_title,
      khmer_hook: (record as any).khmer_hook,
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

    // Khmer audio — only if KHMER_TTS_NGROK_URL is configured
    if (process.env.KHMER_TTS_NGROK_URL) {
      console.log(`  Generating Khmer audio...`);
      try {
        await generateKhmerAudio(storyPart, theme, record.title, storyId);
      } catch (err) {
        console.warn(`  Khmer audio failed (non-fatal): ${(err as Error).message}`);
      }
    } else {
      console.log(`  Skipping Khmer audio (KHMER_TTS_NGROK_URL not set)`);
    }

    await updatePartStatus(record.id, { audio_status: 'done' });

    console.log(`  Part ${partNum} audio done: ${audioPath}`);
  }

  console.log('\nAudio generation complete.');
}
