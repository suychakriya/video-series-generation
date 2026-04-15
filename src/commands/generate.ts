import * as dotenv from 'dotenv';
dotenv.config();

import { getLatestStory } from '../database';
import { runStory } from './story';
import { runImages } from './images';
import { runAudio } from './audio';
import { runRender } from './render';

export async function runGenerate(partArg?: number): Promise<void> {
  console.log('\nStarting generate pipeline...');

  // If no story exists, generate one first
  const existingStory = await getLatestStory();
  if (!existingStory) {
    console.log('No story found — generating story first...');
    await runStory();
  } else {
    console.log(`Using existing story: ${existingStory.story_id}`);
  }

  const parts = partArg ? [partArg] : [1, 2, 3, 4];

  for (const partNum of parts) {
    console.log(`\n=== Processing Part ${partNum}/4 ===`);

    console.log(`\n[Images] Part ${partNum}...`);
    await runImages(partNum);

    console.log(`\n[Audio] Part ${partNum}...`);
    await runAudio(partNum);

    console.log(`\n[Render] Part ${partNum}...`);
    await runRender(partNum);

    console.log(`\nPart ${partNum} complete.`);
  }

  console.log('\nGenerate pipeline complete.');
}
