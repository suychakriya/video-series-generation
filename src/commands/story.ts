import * as dotenv from 'dotenv';
dotenv.config();

import { getThemeByIndex } from '../themes';
import { generateFullStory } from '../story';
import {
  saveStoryPart,
  getCurrentThemeIndex,
  incrementThemeIndex,
  getLatestScheduledPostDate,
} from '../database';

function generateStoryId(): string {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const rand = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `story_${date}_${rand}`;
}

export async function runStory(): Promise<void> {
  const storyId = generateStoryId();
  console.log(`\nStarting story generation — ${storyId}`);

  const themeIndex = await getCurrentThemeIndex();
  const theme = getThemeByIndex(themeIndex);
  console.log(`Theme: ${theme.name}`);

  const story = await generateFullStory(theme, storyId);
  console.log(`Story: "${story.overall_title}"`);

  // Set post dates — start after the latest scheduled post, or tomorrow if none
  const latestPostDate = await getLatestScheduledPostDate();
  const startDate = new Date();
  if (latestPostDate) {
    // Start the day after the last scheduled post
    startDate.setTime(new Date(latestPostDate + 'T00:00:00').getTime());
    startDate.setDate(startDate.getDate() + 1);
  } else {
    // No existing scheduled posts — start tomorrow
    startDate.setDate(startDate.getDate() + 1);
  }
  const tomorrow = startDate;

  for (let i = 0; i < story.parts.length; i++) {
    const part = story.parts[i];
    const postDate = new Date(tomorrow);
    postDate.setDate(postDate.getDate() + i);
    // Use local date parts — toISOString() returns UTC which rolls back a day in UTC+ timezones
    const postDateStr = `${postDate.getFullYear()}-${String(postDate.getMonth() + 1).padStart(2, '0')}-${String(postDate.getDate()).padStart(2, '0')}`;

    const recordId = await saveStoryPart({
      story_id: story.story_id,
      part: part.part,
      theme: theme.id,
      title: part.title,
      content: part.content,
      hook: part.hook,
      thumbnail_title: part.thumbnail_title,
      character_description: story.character_description,
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
      scenes: part.scenes as any,
      khmer_title: part.khmer_title,
      khmer_hook: part.khmer_hook,
      khmer_facebook_caption: part.khmer_facebook_caption,
    });

    console.log(`  Part ${part.part}/4 saved (id: ${recordId})`);
  }

  await incrementThemeIndex();

  console.log(`\nStory saved to Supabase — story_id: ${story.story_id}`);
  console.log(`Title: "${story.overall_title}"`);
}
