import * as dotenv from 'dotenv';
dotenv.config();

import { getLatestStory } from '../database';
import { runStory } from './story';
import { runTranslate } from './translate';
import { runImages } from './images';
import { runAudio } from './audio';
import { runRender } from './render';

export async function runGenerate(partArg?: number, storyArg?: string): Promise<void> {
  console.log('\nStarting generate pipeline...');

  // If a specific story is requested, use it; otherwise use latest or generate new
  if (!storyArg) {
    const existingStory = await getLatestStory();
    if (!existingStory) {
      console.log('No story found — generating story first...');
      await runStory();
    } else {
      console.log(`Using existing story: ${existingStory.story_id}`);
    }
  }

  console.log('\n[Translate] Translating story to Khmer...');
  await runTranslate(undefined, storyArg);

  const parts = partArg ? [partArg] : [1, 2, 3, 4];

  for (const partNum of parts) {
    console.log(`\n=== Processing Part ${partNum}/4 ===`);

    console.log(`\n[Images] Part ${partNum}...`);
    await runImages(partNum, storyArg);

    console.log(`\n[Audio] Part ${partNum}...`);
    await runAudio(partNum, storyArg);

    console.log(`\n[Render] Part ${partNum}...`);
    await runRender(partNum, storyArg);

    console.log(`\nPart ${partNum} complete.`);
  }

  console.log('\nGenerate pipeline complete.');
}
