import Anthropic from '@anthropic-ai/sdk';
import { Theme } from './themes';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface Scene {
  scene_number: number;
  narration: string;  // the exact story text spoken while this scene's image is shown
  khmer_narration?: string; // Khmer translation of the narration
  description: string;
  keywords: string[];
  show_character: boolean; // true = character is the main subject; false = focus on environment/object
  show_entity?: boolean;   // true = the ghost/entity/monster is visually present in this scene
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
  khmer_title?: string;         // Khmer translation of the story title
  khmer_hook?: string;          // Khmer translation of the hook
  khmer_facebook_caption?: string; // Khmer Facebook caption
}

export interface FullStory {
  story_id: string;
  overall_title: string;
  character_description: string;
  entity_description?: string; // ghost/monster/supernatural entity visual description (optional)
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

  const storyDirective = theme.storyInstructions
    ? theme.storyInstructions
    : `Generate a complete original fictional 4-part story for the theme: "${theme.name}"`;

  const prompt = `You are a master storyteller for "Untold Lores", a viral social media channel.

${storyDirective}

Theme: "${theme.name}"

Style: ${theme.stylePrompt}
Voice tone: ${theme.voiceTone}
Cliffhanger style: ${theme.cliffhangerStyle}

Example openings for inspiration (don't copy directly):
${theme.exampleOpenings.map((e, i) => `${i + 1}. ${e}`).join('\n')}

SUSPENSE & PLOT TWIST REQUIREMENTS (apply to every theme):
- The story must be built on suspense. Every part must make the viewer desperate to know what happens next.
  Plant questions early that don't get answered until later — who is this person really? what is being hidden? what does this mean?
- Each part must contain at least one genuine plot twist or revelation that recontextualizes something the viewer thought they understood.
  The best twists feel inevitable in hindsight — the clues were always there.
- Use the "false floor" technique: give the viewer one explanation, let them settle into it, then pull it away.
- Suspense builds from information gaps. Decide carefully what the viewer knows vs. what the character knows vs. what is hidden from both.
- The overall 4-part arc must have a major twist or revelation in Part 3 or Part 4 that reframes the entire story.

REQUIREMENTS:
- The main protagonist MUST be male. All stories are narrated by a male voice,
  so the lead character should be a man or boy. Supporting characters can be any gender.
- Character names and backgrounds must be VARIED across stories — do NOT default to Chinese names.
  Draw from diverse cultures: Japanese, Korean, Southeast Asian, Middle Eastern, European, African,
  Latin American, etc. Match the name to the story's setting and atmosphere, not the visual style.
  The visual style (anime art) is for images only — it does not dictate the story's culture.
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
- For each scene, set show_character: true if the character's face/body is the main visual focus.
  Set show_character: false when the scene is better shown as: an environment (empty room, forest,
  city street), an object (a letter, a weapon, a door), a crowd shot, a wide establishing shot,
  or any moment where the atmosphere/setting matters more than the character's appearance.
  About 10-20% of scenes should have show_character: false for visual variety.
- For each scene, set show_entity: true if the ghost, monster, or supernatural entity is visually
  present and should appear in the image. Set show_entity: false for scenes where the entity is
  not visible (protagonist alone, environment only, objects, flashbacks without the entity).
  Only applies when entity_description is not null.
- CRITICAL — descriptions are sent DIRECTLY to an image generator that takes every word LITERALLY:
  - NO metaphors, similes, or figurative language. If the narration says "she moved like a wave",
    the description must NOT say "wave" — say what the character is literally doing instead.
  - NO abstract concepts ("grief", "hope", "fear") — describe the visible physical action only.
  - ONLY describe what would literally appear in a photograph or painting.
  Bad: "she dances like the waves of the sea" → image generator draws ocean waves.
  Bad: "his anger burned like fire" → image generator draws fire.
  Good: "she spins gracefully across the stone floor, arms outstretched, silk robes billowing".
  Good: "he clenches his jaw, fists shaking at his sides, eyes locked on the figure ahead".
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
  "character_description": "string (highly specific physical description for image consistency — MUST include: unique face feature like scar/unusual eyes/jaw shape, exact hair style and color, specific clothing with color, approximate age, skin tone, build. Example: 'young man mid-20s, lean build, olive skin, sharp angular jaw, short messy dark brown hair with a streak of grey, deep-set amber eyes, wearing a worn dark teal jacket over a grey tunic, small scar above left eyebrow')",
  "entity_description": "string or null (ONLY for stories with a ghost, monster, or recurring supernatural entity — describe its exact appearance in the same specific detail as character_description: skin color/texture, eye appearance, clothing or lack thereof, distinguishing features, how it moves. Example: 'tall female ghost, translucent pale grey rotting skin, black hollow eye sockets with thin red veins at the edges, cracked lips pulled back revealing grey teeth, long black matted hair partially covering her face, wearing a torn white burial dress stained dark at the hem, moves with a slow jerking motion as if her spine is broken'. Set to null if there is no recurring entity.)",
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
          "description": "string (cinematic peak moment for image generation — literal visuals only, no metaphors)",
          "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
          "show_character": true,
          "show_entity": false
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
      model: 'claude-sonnet-4-6',
      max_tokens: 64000,
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
      model: 'claude-sonnet-4-6',
      max_tokens: 64000,
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
    entity_description: parsed.entity_description || undefined,
    style_prompt: parsed.style_prompt,
    image_seed: parsed.image_seed,
    parts: parsed.parts,
  };
}
