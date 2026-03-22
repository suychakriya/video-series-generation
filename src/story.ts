import Anthropic from '@anthropic-ai/sdk';
import { Theme } from './themes';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Scene {
  scene_number: number;
  narration: string;  // the exact story text spoken while this scene's image is shown
  description: string;
  keywords: string[];
}

export interface StoryPart {
  part: number;
  title: string;
  content: string;
  hook: string;
  thumbnail_title: string;
  scenes: Scene[];
  facebook_caption: string;
  youtube_title: string;
  youtube_description_hook: string;
}

export interface FullStory {
  story_id: string;
  overall_title: string;
  character_description: string;
  style_prompt: string;
  image_seed: number;
  parts: StoryPart[];
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      const delay = Math.pow(2, i + 1) * 1000;
      console.log(`  Retry ${i + 1}/${maxRetries} in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

export async function generateFullStory(theme: Theme, storyId: string): Promise<FullStory> {
  console.log(`\n📖 Generating full story for theme: ${theme.name}`);

  const prompt = `You are a master storyteller for "Untold Lores", a viral social media channel.

Generate a complete 4-part story for the theme: "${theme.name}"

Style: ${theme.stylePrompt}
Voice tone: ${theme.voiceTone}
Cliffhanger style: ${theme.cliffhangerStyle}

Example openings for inspiration (don't copy directly):
${theme.exampleOpenings.map((e, i) => `${i + 1}. ${e}`).join('\n')}

REQUIREMENTS:
- The main protagonist MUST be male. All stories are narrated by a male voice,
  so the lead character should be a man or boy. Supporting characters can be any gender.
- Each part: 800-1000 words
- Each part has as many scenes as the story naturally requires (min 5, max 40).
  Each scene covers 1-3 sentences of the story. Break the story into scenes at every
  meaningful narrative shift — a new location, a new revelation, a new emotional beat.
  More scenes = better image-to-voice sync, so err toward more scenes.
- CRITICAL: Every sentence of the content MUST appear in exactly one scene's narration.
  The narration fields across all scenes, concatenated in order, must equal the full content
  word-for-word. No sentence may be skipped or duplicated.
- Each scene's description MUST capture the single most dramatic, visually striking moment
  of that scene — the peak action, emotional climax, or pivotal reveal. Be cinematic and specific:
  WHO is doing WHAT, their exact expression/posture/action, and what surrounds them.
  Bad: "Chen Wei enters the temple". Good: "Chen Wei freezes in the temple doorway, lantern raised,
  face pale with shock as a figure rises from the shadows ahead of him".
  This description is sent directly to an AI image generator — make every word count.
- Each scene has vivid visual keywords focused on the key action, emotion, and atmosphere
  (not just the setting — include the character's state and the dramatic tension)
- Cliffhanger hook at end of each part (1-2 sentences, ultra dramatic)
- thumbnail_title: 3-5 words MAX, clickbait, NO punctuation
  Examples: "She Knew Too Much", "He Was Already Dead", "Nobody Believed Her"
- Facebook caption: 150-200 words, emotional, ends with question + hashtags
- YouTube title: SEO optimized, 60 chars max, includes part number
- YouTube description hook: first 2-3 sentences for the description

Respond with ONLY valid JSON in this exact format:
{
  "overall_title": "string",
  "character_description": "string (detailed physical description for image consistency)",
  "style_prompt": "string (specific visual style for this story)",
  "image_seed": number (random integer 1000-9999),
  "parts": [
    {
      "part": 1,
      "title": "string",
      "content": "string (800-1000 words)",
      "hook": "string (cliffhanger ending, 1-2 sentences)",
      "thumbnail_title": "string (3-5 words, no punctuation)",
      "scenes": [
        {
          "scene_number": 1,
          "narration": "string (the exact sentences from content spoken during this scene)",
          "description": "string (cinematic peak moment for image generation)",
          "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
        }
      ],
      "facebook_caption": "string",
      "youtube_title": "string",
      "youtube_description_hook": "string"
    }
  ]
}`;

  const response = await retryWithBackoff(async () => {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 32000,
      messages: [{ role: 'user', content: prompt }],
    });
    return stream.finalMessage();
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  console.log(`  Response: ${text.length} chars, stop_reason: ${response.stop_reason}`);

  function extractJSON(raw: string): any {
    const candidates: string[] = [];

    // Try 1: extract {…} from fence-stripped text (handles ```json ... ```)
    const fenceStripped = raw.replace(/```(?:json)?/gi, '').trim();
    const fs1 = fenceStripped.indexOf('{');
    const fs2 = fenceStripped.lastIndexOf('}');
    if (fs1 !== -1 && fs2 !== -1) candidates.push(fenceStripped.slice(fs1, fs2 + 1));

    // Try 2: extract {…} directly from raw text
    const r1 = raw.indexOf('{');
    const r2 = raw.lastIndexOf('}');
    if (r1 !== -1 && r2 !== -1) candidates.push(raw.slice(r1, r2 + 1));

    for (const candidate of candidates) {
      try {
        return JSON.parse(candidate);
      } catch {
        // try next
      }
    }
    return null;
  }

  let parsed: any = extractJSON(text);

  if (!parsed) {
    console.log('--- RAW RESPONSE (first 500 chars) ---');
    console.log(text.slice(0, 500));
    console.log('--- LAST 200 chars ---');
    console.log(text.slice(-200));
    console.log('--- TOTAL LENGTH:', text.length, '---');
    console.log('JSON parse failed, retrying with correction prompt...');
    const correctionStream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 32000,
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: text },
        {
          role: 'user',
          content:
            'The JSON was invalid. Reply with ONLY raw valid JSON — no markdown, no code fences, no explanation.',
        },
      ],
    });
    const correctionMsg = await correctionStream.finalMessage();
    const correctedText =
      correctionMsg.content[0].type === 'text' ? correctionMsg.content[0].text : '';
    parsed = extractJSON(correctedText);
    if (!parsed) throw new Error('Could not parse JSON after correction');
  }

  return {
    story_id: storyId,
    overall_title: parsed.overall_title,
    character_description: parsed.character_description,
    style_prompt: parsed.style_prompt,
    image_seed: parsed.image_seed,
    parts: parsed.parts,
  };
}


