import * as dotenv from 'dotenv';
dotenv.config();

import { getLatestStory, getStoryPart, updateStoryPart, updatePartStatus } from '../database';
import { fetchImagesForPart, generateHookImage } from '../images';

export async function runImages(partArg?: number): Promise<void> {
  const latestStory = await getLatestStory();
  if (!latestStory) {
    throw new Error('No story found in Supabase. Run "node src/index.ts story" first.');
  }

  const storyId = latestStory.story_id;
  console.log(`\nGenerating images for story: ${storyId}`);

  const parts = partArg ? [partArg] : [1, 2, 3, 4];

  for (const partNum of parts) {
    const record = await getStoryPart(storyId, partNum);
    if (!record || !record.id) {
      console.log(`  Part ${partNum}: not found in Supabase, skipping`);
      continue;
    }

    console.log(`\n--- Part ${partNum}/4 ---`);

    // Parse scenes from the record's content — they are stored in the DB
    // We need the full record including scenes; re-fetch to get scenes JSON
    const part = {
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

    if (!part.scenes || part.scenes.length === 0) {
      console.log(`  Part ${partNum}: no scenes data in DB record, skipping`);
      continue;
    }

    console.log(`  Fetching images (${part.scenes.length} scenes)...`);
    const { images, dramaticImageUrl } = await fetchImagesForPart(
      partNum,
      part.scenes,
      record.style_prompt,
      record.character_description,
      record.image_seed,
      storyId
    );

    console.log(`  Generating hook image...`);
    await generateHookImage(
      record.hook,
      record.style_prompt,
      record.character_description,
      record.image_seed,
      storyId,
      partNum
    );

    // Update DB: dramatic_image_url, base_image_url, images_status
    await updateStoryPart(record.id, {
      dramatic_image_url: dramaticImageUrl,
      base_image_url: images[0]?.localPath,
    });
    await updatePartStatus(record.id, { images_status: 'done' });

    console.log(`  Part ${partNum} images done (${images.length} images)`);
  }

  console.log('\nImages generation complete.');
}
