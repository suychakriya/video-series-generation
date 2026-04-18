import * as dotenv from 'dotenv';
dotenv.config();

import Anthropic from '@anthropic-ai/sdk';
import { getLatestStory, getStoryPart, updateStoryPart } from '../database';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface KhmerTranslation {
  khmer_title: string;
  khmer_hook: string;
  khmer_facebook_caption: string;
  scenes: Array<{ scene_number: number; khmer_narration: string }>;
}

async function translatePartToKhmer(
  title: string,
  hook: string,
  facebookCaption: string,
  scenes: Array<{ scene_number: number; narration: string }>
): Promise<KhmerTranslation> {
  const prompt = `Translate the following story content into natural, dramatic Khmer (ភាសាខ្មែរ).
Keep the emotional tone, dramatic pacing, and storytelling style intact.
Do NOT translate proper nouns, character names, or "Untold Lores".

Story title: ${title}
Hook (cliffhanger ending): ${hook}
Facebook caption: ${facebookCaption}
Scenes:
${scenes.map((s) => `Scene ${s.scene_number}: ${s.narration}`).join('\n\n')}

Respond with ONLY valid JSON in this exact format:
{
  "khmer_title": "Khmer translation of the title",
  "khmer_hook": "Khmer translation of the hook",
  "khmer_facebook_caption": "Khmer Facebook caption (150-200 words, emotional, ends with question + hashtags like #រឿងខ្មែរ #UntoldLores)",
  "scenes": [
    { "scene_number": 1, "khmer_narration": "Khmer translation of scene 1 narration" }
  ]
}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  const j1 = text.indexOf('{');
  const j2 = text.lastIndexOf('}');
  if (j1 === -1 || j2 === -1) throw new Error('Could not parse Khmer translation JSON');
  return JSON.parse(text.slice(j1, j2 + 1)) as KhmerTranslation;
}

export async function runTranslate(partArg?: number, storyArg?: string): Promise<void> {
  let storyId: string;
  if (storyArg) {
    storyId = storyArg;
    console.log(`\nUsing specified story: ${storyId}`);
  } else {
    const latestStory = await getLatestStory();
    if (!latestStory) {
      throw new Error('No story found. Run "npm run story" first.');
    }
    storyId = latestStory.story_id;
  }

  console.log(`\nTranslating story to Khmer: ${storyId}`);

  const parts = partArg ? [partArg] : [1, 2, 3, 4];

  for (const partNum of parts) {
    const record = await getStoryPart(storyId, partNum);
    if (!record || !record.id) {
      console.log(`  Part ${partNum}: not found, skipping`);
      continue;
    }

    if (record.khmer_title && record.khmer_hook) {
      console.log(`  Part ${partNum}: already translated, skipping`);
      continue;
    }

    const scenes: Array<{ scene_number: number; narration: string }> =
      ((record as any).scenes || []).map((s: any) => ({
        scene_number: s.scene_number,
        narration: s.narration,
      }));

    if (scenes.length === 0) {
      console.log(`  Part ${partNum}: no scenes found, skipping`);
      continue;
    }

    console.log(`\n--- Part ${partNum}/4 (${scenes.length} scenes) ---`);
    console.log(`  Translating to Khmer...`);

    const translation = await translatePartToKhmer(
      record.title,
      record.hook,
      record.facebook_caption,
      scenes
    );

    // Merge khmer_narration back into the scenes array stored in DB
    const updatedScenes = ((record as any).scenes || []).map((s: any) => {
      const t = translation.scenes.find((ts) => ts.scene_number === s.scene_number);
      return t ? { ...s, khmer_narration: t.khmer_narration } : s;
    });

    await updateStoryPart(record.id, {
      khmer_title: translation.khmer_title,
      khmer_hook: translation.khmer_hook,
      khmer_facebook_caption: translation.khmer_facebook_caption,
      scenes: updatedScenes,
    } as any);

    console.log(`  Part ${partNum} translated ✅`);
    console.log(`    khmer_title: ${translation.khmer_title}`);
  }

  console.log('\nKhmer translation complete.');
}
