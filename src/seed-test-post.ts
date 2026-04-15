import * as dotenv from 'dotenv';
dotenv.config();

import * as path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { createClient } from '@supabase/supabase-js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

const STORY_ID = 'test_1774161599611';
const TEMP_BASE = path.join(process.cwd(), 'temp', STORY_ID);

const parts = [
  {
    part: 1,
    title: 'The Invitation Arrives',
    hook: 'Every single wedding guest was someone from the village who had died in the past twenty years. And they were all turning to stare directly at him.',
    thumbnail_title: 'He Got The Invitation',
    facebook_caption: `Li Wei thought he was living peacefully alone until a blood-red invitation appeared under his door. Written in his dead grandmother's handwriting, it invited him to a wedding at an abandoned pavilion. The bride? His childhood friend who drowned 15 years ago. When the invitation burst into blue flames that didn't burn, Li Wei knew this wasn't a joke. As he walked through the dark forest, shadows reached for him like grasping hands. The ruined pavilion stood restored and gleaming, filled with wedding guests moving like puppets. But when he got close enough to see their faces clearly... Who do you think the wedding guests really are? 💀👻 #Horror #ChineseGhost #Supernatural #Donghua #HorrorStory #GhostWedding #UnexplainedMystery`,
    youtube_title: 'Dead Grandmother Sends Wedding Invitation - Part 1',
    youtube_description: `When Li Wei receives a wedding invitation written in his dead grandmother's handwriting, he is drawn into a terrifying ghost wedding deep in the bamboo forest.\n\n⚜️ Untold Lores — Daily Story Videos\n\nSubscribe for new parts every day!`,
    youtube_tags: 'chinese ghost,horror,supernatural,untold lores,storytime,ghost wedding,donghua',
  },
  {
    part: 2,
    title: 'The Ghost Wedding Begins',
    hook: "Mei Ling's next words made Li Wei's blood freeze: 'The groom you see before you was chosen by the dead.'",
    thumbnail_title: 'The Dead Guests Stare',
    facebook_caption: `Li Wei's worst nightmare came true when he recognized every wedding guest - they were all people from his village who had died! Old Chen still bore his burn marks, Little Ping glowed with fever, and Mrs. Wang dripped water from her funeral robes. But the real horror was the bride, Mei Ling, floating above the ground with bone flowers in her hair. She reminded him of a childhood promise he'd made by the pond before she drowned. The faceless groom's blank skin reflected Li Wei's terrified face like a mirror. Then Mei Ling spoke the words that changed everything... What do you think she's planning to do with Li Wei? 😱💀 #Horror #GhostWedding #ChineseHorror #Supernatural #Donghua #DeadReturn #ChildhoodPromises #HorrorStory`,
    youtube_title: 'The Ghost Wedding Guests Reveal Themselves - Part 2',
    youtube_description: `Li Wei discovers the wedding guests are all dead villagers he once knew. The ghost bride Mei Ling reveals a terrifying childhood promise.\n\n⚜️ Untold Lores — Daily Story Videos\n\nSubscribe for new parts every day!`,
    youtube_tags: 'chinese ghost,horror,supernatural,untold lores,storytime,ghost wedding,donghua',
  },
];

async function uploadPart(part: typeof parts[0]) {
  const partDir = path.join(TEMP_BASE, `part_${part.part}`);

  console.log(`\nUploading Part ${part.part} to Cloudinary...`);
  const videoResult = await new Promise<any>((resolve, reject) =>
    cloudinary.uploader.upload_large(
      path.join(partDir, 'main_video_compressed.mp4'),
      { resource_type: 'video', public_id: `stories/${STORY_ID}/part_${part.part}/main_video`, overwrite: true, timeout: 600000, chunk_size: 6000000 },
      (err, result) => err ? reject(err) : resolve(result)
    )
  );
  console.log(`  Video: ${videoResult.secure_url}`);

  const thumbResult = await new Promise<any>((resolve, reject) =>
    cloudinary.uploader.upload(
      path.join(partDir, 'thumbnail.jpg'),
      { resource_type: 'image', public_id: `stories/${STORY_ID}/part_${part.part}/thumbnail`, overwrite: true },
      (err, result) => err ? reject(err) : resolve(result)
    )
  );
  console.log(`  Thumbnail: ${thumbResult.secure_url}`);

  return { videoUrl: videoResult.secure_url, thumbnailUrl: thumbResult.secure_url };
}

async function main() {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Already uploaded to Cloudinary
  const part1Urls = {
    videoUrl: 'https://res.cloudinary.com/dalpartmz/video/upload/v1774375098/stories/test_1774161599611/part_1/main_video.mp4',
    thumbnailUrl: 'https://res.cloudinary.com/dalpartmz/image/upload/v1774375102/stories/test_1774161599611/part_1/thumbnail.jpg',
  };
  const part2Urls = {
    videoUrl: 'https://res.cloudinary.com/dalpartmz/video/upload/v1774375153/stories/test_1774161599611/part_2/main_video.mp4',
    thumbnailUrl: 'https://res.cloudinary.com/dalpartmz/image/upload/v1774375160/stories/test_1774161599611/part_2/thumbnail.jpg',
  };

  // Insert Part 1 — today
  console.log('\nInserting Part 1 record (post_date = today)...');
  const { error: e1 } = await supabase.from('stories').upsert({
    story_id: STORY_ID,
    part: 1,
    theme: 'horror_thriller',
    title: parts[0].title,
    content: 'Test content',
    hook: parts[0].hook,
    thumbnail_title: parts[0].thumbnail_title,
    character_description: 'Li Wei, a 28-year-old Chinese man',
    style_prompt: 'Chinese donghua anime art style',
    image_seed: 7834,
    facebook_caption: parts[0].facebook_caption,
    youtube_title: 'The Crimson Wedding Invitation - Part 1',
    youtube_description: parts[0].youtube_description,
    youtube_tags: parts[0].youtube_tags,
    video_url: part1Urls.videoUrl,
    thumbnail_url: part1Urls.thumbnailUrl,
    post_date: today,
    posted: false,
  }, { onConflict: 'story_id,part' });
  if (e1) throw new Error(`Supabase error part 1: ${e1.message}`);

  // Insert Part 2 — tomorrow
  console.log('Inserting Part 2 record (post_date = tomorrow)...');
  const { error: e2 } = await supabase.from('stories').upsert({
    story_id: STORY_ID,
    part: 2,
    theme: 'horror_thriller',
    title: parts[1].title,
    content: 'Test content',
    hook: parts[1].hook,
    thumbnail_title: parts[1].thumbnail_title,
    character_description: 'Li Wei, a 28-year-old Chinese man',
    style_prompt: 'Chinese donghua anime art style',
    image_seed: 7834,
    facebook_caption: parts[1].facebook_caption,
    youtube_title: 'The Crimson Wedding Invitation - Part 2',
    youtube_description: parts[1].youtube_description,
    youtube_tags: parts[1].youtube_tags,
    video_url: part2Urls.videoUrl,
    thumbnail_url: part2Urls.thumbnailUrl,
    post_date: tomorrowStr,
    posted: false,
  }, { onConflict: 'story_id,part' });
  if (e2) throw new Error(`Supabase error part 2: ${e2.message}`);

  console.log(`\nDone!`);
  console.log(`  Part 1 → post_date=${today} (ready to post now)`);
  console.log(`  Part 2 → post_date=${tomorrowStr}`);
  console.log(`\nRun: npx ts-node src/index.ts post`);
  console.log(`After Part 1 posts, change Part 2 post_date to today in Supabase to test the comment feature.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
