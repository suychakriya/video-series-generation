import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY!;
const HF_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN!;
const LOCAL_MODEL_URL = process.env.LOCAL_MODEL_URL; // Colab/RunPod server

// Strips entity/character content phrases from stylePrompt for non-entity scenes.
// Keeps art style, lighting, color palette, and quality modifiers only.
function filterStyleForScene(stylePrompt: string, showEntity: boolean): string {
  // Always strip "writing" / "calligraphy" / "text" tokens — they cause FLUX to render
  // Asian characters on walls and signs regardless of the no-text negative prompt.
  const textWords = /\bwriting\b|\bcalligraph|\bscript\b|\binscription|\blettering|\btext on/i;

  const base = showEntity ? stylePrompt.trim() : (() => {
    // For non-entity scenes, also strip character, monster, blood, and gore tokens.
    const contentWords = /ghost|skeleton|monster|entity|creature|decompos|corpse|blood|gore|decaying|rotting|supernatural|protagonist|frozen with|wide.*eye|hollow|socket|vein|flesh|cracked.*skin|broken jaw|matted hair|burial|dead body|pale.*rotting|terror|horrif|visceral horror/i;
    return stylePrompt
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !contentWords.test(t))
      .join(', ') || stylePrompt.trim();
  })();

  const filtered = base
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !textWords.test(t))
    .join(', ');

  return filtered || base;
}

// Returns the character description if the scene should show the character, empty string otherwise.
// Uses the show_character flag set by Claude during story generation.
// Falls back to a keyword heuristic for older stories that don't have the flag.
function characterWeightForScene(
  sceneDescription: string,
  characterDescription: string,
  showCharacter?: boolean
): string {
  // Use Claude's explicit flag if available
  if (showCharacter === false) return '';
  if (showCharacter === true) return buildCharacterAnchor(characterDescription, 350);

  // Legacy fallback: heuristic for stories generated before show_character was added
  const lower = sceneDescription.toLowerCase();
  const hasCharacterAction = /\b(he|his|him|man|boy|stands?|kneels?|raises?|holds?|stares?|faces?|rushes?|trembles?|reaches?|grabs?|turns?|looks?|walks?|runs?|falls?|rises?|sits?|lies?|watches?|gazes?|clutches?|steps?|leans?|crouches?|sprints?|freezes?|spins?|slams?|opens?|closes?|speaks?|shouts?|whispers?|cries?|smiles?|frowns?)\b/.test(lower);
  if (!hasCharacterAction) return '';
  return buildCharacterAnchor(characterDescription, 350);
}

// Pulls out the identity-anchor traits (face/skin, hair, clothing, + extra patterns like
// hands or scars) from a physical description regardless of where they fall in the string,
// and caps the result. A blind slice(0, N) truncates whatever comes last — usually
// hair/clothing/hand/scar details — so the subject gets a different hairstyle, outfit, or
// distinguishing feature invented fresh on every scene instead of looking the same throughout
// the story.
function buildDescriptionAnchor(
  description: string,
  maxChars: number,
  extraPatterns: RegExp[] = []
): string {
  const parts = description.split(',').map((p) => p.trim()).filter(Boolean);
  const corePart = parts.slice(0, 3); // face/skin/build — usually listed first
  const hairPart = parts.find((p) => /hair/i.test(p));
  const clothingPart = parts.find((p) =>
    /wearing|dress|gown|robe|shirt|cloth|garment|jacket|coat|uniform/i.test(p)
  );
  const extraParts = extraPatterns
    .map((re) => parts.find((p) => re.test(p)))
    .filter((p): p is string => Boolean(p));
  const anchored = [...corePart, hairPart, clothingPart, ...extraParts].filter(
    (p): p is string => Boolean(p)
  );
  const seen = new Set<string>();
  const deduped = anchored.filter((p) => (seen.has(p) ? false : (seen.add(p), true)));
  const joined = deduped.join(', ');
  if (joined.length <= maxChars) return joined.trim();
  // Truncate at the last full segment boundary rather than mid-word.
  const cut = joined.slice(0, maxChars);
  const lastComma = cut.lastIndexOf(',');
  return (lastComma > 0 ? cut.slice(0, lastComma) : cut).trim();
}

function buildEntityAnchor(entityDescription: string, maxChars: number): string {
  return buildDescriptionAnchor(entityDescription, maxChars, [/finger|hand|claw|nail/i]);
}

function buildCharacterAnchor(characterDescription: string, maxChars: number): string {
  return buildDescriptionAnchor(characterDescription, maxChars, [
    /scar|tattoo|mole|birthmark|freckle|piercing/i,
  ]);
}

// HuggingFace Inference — FLUX.1-schnell (fast, good quality, free tier)
const HF_IMAGE_MODEL =
  'https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell';

export interface ImageResult {
  url: string;
  localPath: string; // static image path
  clipPath: string; // animated video clip path (may equal localPath if SVD failed)
  isVideo: boolean; // true if clipPath is an mp4
  source: 'huggingface' | 'pexels';
  sceneIndex: number;
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      if ((err as any).noRetry) throw err;
      const delay = Math.pow(2, i + 1) * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

async function downloadImage(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https
      .get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', reject);
  });
}

// PRIMARY (local): Colab/RunPod server running FLUX.1-schnell
async function generateLocalImage(
  prompt: string,
  seed: number,
  outputPath: string
): Promise<string> {
  const response = await fetch(`${LOCAL_MODEL_URL}/txt2img`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, seed, width: 1280, height: 720 }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Local model error ${response.status}: ${body.slice(0, 120)}`);
  }

  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

// PRIMARY (cloud): HuggingFace FLUX.1-schnell — anime style, good quality
async function generateHFImage(
  prompt: string,
  seed: number,
  outputPath: string
): Promise<string> {

  const response = await fetch(HF_IMAGE_MODEL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: prompt,
      parameters: {
        width: 1280,
        height: 720,
        seed,
        num_inference_steps: 8,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    const err = new Error(`HF image error ${response.status}: ${errText.slice(0, 120)}`);
    if (response.status === 402 || response.status === 401) (err as any).noRetry = true;
    throw err;
  }

  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

// FALLBACK: Pexels stock photos
async function fetchPexelsImages(
  keywords: string[],
  count: number,
  outputDir: string,
  prefix: string
): Promise<string[]> {
  const query = [...keywords.slice(0, 3), 'cinematic', 'dramatic'].join(' ');
  const url =
    `https://api.pexels.com/v1/search` +
    `?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;

  const response = await fetch(url, {
    headers: { Authorization: PEXELS_API_KEY },
  });

  if (!response.ok) throw new Error(`Pexels API error: ${response.status}`);
  const data = (await response.json()) as any;

  const paths: string[] = [];
  for (let i = 0; i < Math.min(data.photos?.length ?? 0, count); i++) {
    const photo = data.photos[i];
    const imgUrl = photo.src.large2x || photo.src.original;
    const localPath = path.join(outputDir, `${prefix}_pexels_${i}.jpg`);
    await downloadImage(imgUrl, localPath);
    paths.push(localPath);
  }
  return paths;
}

export async function generateHookImage(
  hook: string,
  stylePrompt: string,
  characterDescription: string,
  imageSeed: number,
  storyId: string,
  partNumber: number,
  imageStylePrefix?: string,
  entityDescription?: string
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${partNumber}`, 'images');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'hook_image.jpg');

  if (fs.existsSync(outputPath)) return outputPath;

  // Strip figurative language and long descriptive clauses — keep only the core visual action
  const cleanHook = hook
    .replace(/\b(like|as)\s+(a|an|the)\s+\w+(\s+\w+){0,3}/gi, '')
    .replace(/,\s*[^,]{60,}/g, '') // drop long clauses that confuse the image model
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 200);
  // Art style only — strip character/monster descriptions so they don't overwhelm the hook scene
  const rawPrefix = imageStylePrefix || 'manhwa webtoon illustration style, Solo Leveling art style, bishounen handsome East Asian male, pale porcelain white skin, messy dark hair with individual strands, soft gradient shading, clean digital art, sharp defined features';
  const styleOnly = filterStyleForScene(rawPrefix, false);
  const charPart = characterWeightForScene(hook, characterDescription);
  // Only inject ghost if the hook text explicitly references it — otherwise the scene drives the image
  const hookMentionsEntity = /\bshe\b|\bit\b|ghost|figure|entity|creature|shadow|apparit/i.test(hook);
  const entityHint = (hookMentionsEntity && entityDescription)
    ? buildEntityAnchor(entityDescription, 500)
    : '';
  // Derive perspective from hook text so it works for any story
  const entityAbove = /above me|above my|over me|overhead|ceiling|looming/i.test(hook);
  const entityBehind = /behind me|behind him|at his back|over his shoulder/i.test(hook);
  const perspectiveHint = entityAbove
    ? 'view from below looking up, character visible in foreground looking up in terror, entity filling upper frame'
    : entityBehind
    ? 'character in foreground not yet seeing entity behind him, entity emerging from shadow behind'
    : 'cinematic wide shot, character and entity both in frame';
  const prompt = [
    cleanHook,
    charPart ? `consistent character: ${charPart}` : '',
    entityHint ? `consistent entity, present and clearly visible: ${entityHint}, no horns` : '',
    styleOnly,
    `${perspectiveHint}, pitch black shadows, cold dim light, organic decomposing ghost flesh, matted stringy hair hanging down, not a carved prop, visceral horror, cinematic composition, masterpiece, highly detailed`,
    'no extra hands, no floating hands, no disembodied hands, no extra arms, no extra limbs, no duplicate body parts, no phantom limbs, no extra hair floating in frame, no extra faces, no body parts without a body',
    'no text overlay, no written text, no captions, no subtitles, no watermarks, no posters, no signs with writing, no Asian text, no Chinese characters, no Japanese kanji, no Korean hangul, no calligraphy, no floating UI elements',
  ].filter(Boolean).join(', ');

  console.log(`  Generating hook image...`);
  try {
    if (LOCAL_MODEL_URL) {
      await retryWithBackoff(() => generateLocalImage(prompt, imageSeed + 54321, outputPath));
    } else {
      await retryWithBackoff(() => generateHFImage(prompt, imageSeed + 54321, outputPath));
    }
    console.log(`  ✅ Hook image generated`);
  } catch (err) {
    console.log(`  ⚠️  Hook image failed: ${(err as Error).message}`);
  }

  return outputPath;
}

export async function fetchImagesForPart(
  partNumber: number,
  scenes: Array<{ scene_number: number; keywords: string[]; description: string; show_character?: boolean; show_entity?: boolean; show_second_character?: boolean; secondary_character_description?: string }>,
  stylePrompt: string,
  characterDescription: string,
  imageSeed: number,
  storyId: string,
  imageStylePrefix?: string,
  entityDescription?: string
): Promise<{ images: ImageResult[]; dramaticImageUrl: string }> {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${partNumber}`, 'images');
  fs.mkdirSync(outputDir, { recursive: true });

  const allImages: ImageResult[] = [];
  const imagesPerScene = 1;

  if (LOCAL_MODEL_URL) {
    console.log(`  🖥️  Using local model server: ${LOCAL_MODEL_URL}`);
  }

  for (let sceneIdx = 0; sceneIdx < scenes.length; sceneIdx++) {
    const scene = scenes[sceneIdx];
    const prefix = `scene_${scene.scene_number}`;

    console.log(`  Scene ${scene.scene_number}: generating images...`);

    const localPaths: string[] = [];
    let source: 'huggingface' | 'pexels' = 'huggingface';

    // Build prompt once per scene (shared across images)
    // Strip simile/metaphor phrases so the image generator doesn't take them literally
    const rawSceneAction = scene.description
      .replace(/\b(like|as)\s+(a|an|the)\s+\w+(\s+\w+){0,3}/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 250);
    // If the scene shows a close-up of readable text (document, screen, notebook), reframe it
    // to avoid FLUX hallucinating garbled characters filling the image
    const hasTextObject = /\b(close[- ]?up|close shot).{0,60}(notebook|journal|letter|screen|document|spreadsheet|log|book|page|diary|note|file|record)/i.test(rawSceneAction)
      || /\b(notebook|journal|letter|spreadsheet|document|log|diary).{0,40}(showing|displaying|revealing|with text|with writing|open to|filled with)/i.test(rawSceneAction);
    const sceneAction = hasTextObject
      ? rawSceneAction + ', viewed from a distance, text not legible, focus on character expression'
      : rawSceneAction;
    const showEntity = scene.show_entity === true;
    const atmosphere = filterStyleForScene(stylePrompt, showEntity);
    const actionKeywords = scene.keywords.slice(0, 5).join(', ');
    const charPart = characterWeightForScene(scene.description, characterDescription, scene.show_character);
    // Anchor on face/hair/clothing/hands specifically (not a blind slice) so the entity keeps
    // the same hairstyle, outfit, and hands across every scene instead of a new one each time.
    const entityPart = (showEntity && entityDescription)
      ? buildEntityAnchor(entityDescription, 500)
      : '';
    const rawStylePrefix = imageStylePrefix || 'manhwa webtoon illustration style, Solo Leveling art style, bishounen handsome East Asian male, pale porcelain white skin, messy dark hair with individual strands, soft gradient shading, clean digital art, sharp defined features';
    const stylePrefix = filterStyleForScene(rawStylePrefix, showEntity);
    // Don't say "solo" when the entity is present — it suppresses the ghost.
    // For entity scenes, anchor character in foreground with entity visible behind/above.
    // Prefer Claude's explicit flag (set at story-generation time) over the keyword heuristic —
    // prose can introduce a second person in unlimited ways a regex can't reliably catch.
    // Legacy fallback: heuristic for stories generated before show_second_character was added.
    const hasMultipleCharacters = scene.show_second_character !== undefined
      ? scene.show_second_character
      : /\b(two|both|together|each other|facing each other|another (man|woman|person|figure|guard|officer|worker|detective|soldier)|\band\b.{0,40}\b(man|woman|person|figure|guard|officer|worker|detective|soldier)\b|\b(a|an|the)\s+(older|younger|old|young|elderly|other)\s+(man|woman|person|figure|guard|officer|worker|detective|soldier)\b)/i.test(sceneAction);
    // Without a real description, the second person has nothing for FLUX to render a body
    // from, and it defaults to just the hand/arm implied by the scene's action verb.
    const secondaryPart = (hasMultipleCharacters && scene.secondary_character_description)
      ? scene.secondary_character_description.slice(0, 150).trim()
      : '';
    const singleSubjectHint = charPart
      ? showEntity
        ? 'character in foreground, supernatural entity visible in scene'
        : hasMultipleCharacters
          ? 'two people in frame: protagonist in foreground, a second full-body adult person clearly visible beside or behind him, not just a hand or arm'
          : 'single male protagonist, solo, one person'
      : '';
    // Only block phantom body parts when the description doesn't intentionally include them.
    const descLower = sceneAction.toLowerCase();
    const handNegative = /\b(hand|hands|arm|arms|reach|grab|clench|fist|finger|wrist)\b/.test(descLower)
      ? '' : 'no extra hands, no floating hands, no disembodied hands, no extra arms, no phantom limbs';
    const hairNegative = /\b(hair flowing|hair spreading|hair floating|hair fills|strands fill)\b/.test(descLower)
      ? '' : 'no extra hair floating in frame, no disembodied hair';
    const faceNegative = /\b(two faces|multiple faces|faces appear|face emerges)\b/.test(descLower)
      ? '' : 'no extra faces, no duplicate faces, no extra eyes';

    // When entity is present, put it first so FLUX gives it full weight.
    // "consistent entity" mirrors "consistent character" — same keyword anchors visual identity across scenes.
    const entityFocusHint = (showEntity && !charPart) ? 'entity is the sole subject, fill the frame' : '';
    const prompt = [
      sceneAction,
      actionKeywords,
      entityPart ? `consistent entity, present and clearly visible: ${entityPart}` : '',
      entityFocusHint,
      charPart ? `consistent character: ${charPart}` : '',
      secondaryPart ? `second person present, clearly visible: ${secondaryPart}` : '',
      singleSubjectHint,
      stylePrefix,
      atmosphere,
      'cinematic composition, rule of thirds, dramatic lighting, masterpiece, highly detailed',
      handNegative,
      hairNegative,
      faceNegative,
      'no text overlay, no written text, no captions, no subtitles, no watermarks, no posters, no signs with writing, no Asian text, no Chinese characters, no Japanese kanji, no Korean hangul, no calligraphy, no floating UI elements',
    ].filter(Boolean).join(', ');

    console.log(`    Prompt: ${prompt.slice(0, 200)}...`);

    // Generate images — prefer local server, fall back to HuggingFace
    for (let i = 0; i < imagesPerScene; i++) {
      const outPath = path.join(outputDir, `${prefix}_${i}.jpg`);
      if (fs.existsSync(outPath)) {
        localPaths.push(outPath);
        continue;
      }
      const seed = imageSeed + sceneIdx * 10 + i;
      try {
        if (LOCAL_MODEL_URL) {
          await retryWithBackoff(() => generateLocalImage(prompt, seed, outPath));
        } else {
          await retryWithBackoff(() => generateHFImage(prompt, seed, outPath));
        }
        localPaths.push(outPath);
        console.log(`    ✅ Image ${i + 1}/${imagesPerScene}`);
      } catch (err) {
        console.log(`    ⚠️  Image generation failed: ${(err as Error).message}`);
        source = 'pexels';
      }
    }

    // Fallback to Pexels for any missing images
    if (localPaths.length < imagesPerScene) {
      source = 'pexels';
      const needed = imagesPerScene - localPaths.length;
      try {
        const pexelsPaths = await retryWithBackoff(() =>
          fetchPexelsImages(scene.keywords, needed, outputDir, `${prefix}_fb`)
        );
        localPaths.push(...pexelsPaths);
      } catch (err) {
        console.log(`  Pexels also failed for scene ${scene.scene_number}, skipping`);
      }
    }

    for (let i = 0; i < localPaths.length; i++) {
      const existingClip = path.join(outputDir, `scene_${scene.scene_number}_clip_${i}.mp4`);
      const clipPath = fs.existsSync(existingClip) ? existingClip : localPaths[i];
      const isVideo = clipPath.endsWith('.mp4');
      allImages.push({
        url: localPaths[i],
        localPath: localPaths[i],
        clipPath,
        isVideo,
        source,
        sceneIndex: sceneIdx,
      });
    }
  }

  // Identify dramatic image from last scene
  const lastSceneImages = allImages.filter((img) => img.sceneIndex === scenes.length - 1);
  const dramaticImage =
    lastSceneImages[0]?.localPath || allImages[allImages.length - 1]?.localPath;

  console.log(`  🎯 Dramatic image selected: ${path.basename(dramaticImage)}`);
  const videoClips = allImages.filter((img) => img.isVideo).length;
  const staticClips = allImages.filter((img) => !img.isVideo).length;
  console.log(`  📊 Clips: ${videoClips} animated videos, ${staticClips} static images`);

  return { images: allImages, dramaticImageUrl: dramaticImage };
}
