import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import { animateImagesForScene } from './animate';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY!;
const HF_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN!;
const LOCAL_MODEL_URL = process.env.LOCAL_MODEL_URL; // Colab/RunPod server

// Decide how much character description to include based on scene content.
// Include character if the scene involves them acting/reacting (≈70% of scenes).
// Exclude if the scene is purely about an object, place, or supernatural element.
function characterWeightForScene(sceneDescription: string, characterDescription: string): string {
  const lower = sceneDescription.toLowerCase();
  const hasCharacterAction = /\b(he|his|him|man|boy|stands?|kneels?|raises?|holds?|stares?|faces?|rushes?|trembles?|reaches?|grabs?|turns?|looks?|walks?|runs?|falls?|rises?|sits?|lies?|watches?|gazes?|clutches?|steps?|leans?|crouches?|sprints?|freezes?|spins?|slams?|opens?|closes?|speaks?|shouts?|whispers?|cries?|smiles?|frowns?)\b/.test(lower);

  if (!hasCharacterAction) return ''; // scene is about an object/place/phenomenon — no character
  return characterDescription.split(',').slice(0, 3).join(',').trim(); // include character
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
  stylePrompt: string,
  sceneDescription: string,
  sceneKeywords: string[],
  characterDescription: string,
  seed: number,
  outputPath: string
): Promise<string> {
  const sceneAction = sceneDescription.slice(0, 250);
  const atmosphere = stylePrompt.split(',').slice(0, 5).join(',').trim();
  const actionKeywords = sceneKeywords.slice(0, 5).join(', ');
  const charPart = characterWeightForScene(sceneDescription, characterDescription);

  const prompt = [
    'donghua anime, cel shading, 2D illustration',
    sceneAction,
    actionKeywords,
    charPart,
    atmosphere,
    'cinematic composition, rule of thirds, dramatic lighting, masterpiece, highly detailed',
  ]
    .filter(Boolean)
    .join(', ');

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
        num_inference_steps: 4, // schnell is optimized for 4 steps
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
  partNumber: number
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${partNumber}`, 'images');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'hook_image.jpg');

  if (fs.existsSync(outputPath)) return outputPath;

  const atmosphere = stylePrompt.split(',').slice(0, 5).join(',').trim();
  const charPart = characterWeightForScene(hook, characterDescription);
  const prompt = [
    'donghua anime, cel shading, 2D illustration',
    hook.slice(0, 250),
    charPart,
    atmosphere,
    'cinematic composition, dramatic lighting, intense cliffhanger moment, masterpiece, highly detailed',
  ].filter(Boolean).join(', ');

  console.log(`  Generating hook image...`);
  try {
    if (LOCAL_MODEL_URL) {
      await retryWithBackoff(() => generateLocalImage(prompt, imageSeed + 9999, outputPath));
    } else {
      await retryWithBackoff(() => generateHFImage(stylePrompt, hook, [], characterDescription, imageSeed + 9999, outputPath));
    }
    console.log(`  ✅ Hook image generated`);
  } catch (err) {
    console.log(`  ⚠️  Hook image failed: ${(err as Error).message}`);
  }

  return outputPath;
}

export async function fetchImagesForPart(
  partNumber: number,
  scenes: Array<{ scene_number: number; keywords: string[]; description: string }>,
  stylePrompt: string,
  characterDescription: string,
  imageSeed: number,
  storyId: string
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
    const sceneAction = scene.description.slice(0, 250);
    const atmosphere = stylePrompt.split(',').slice(0, 5).join(',').trim();
    const actionKeywords = scene.keywords.slice(0, 5).join(', ');
    // Include character only if scene involves character action (~70% of scenes)
    const charPart = characterWeightForScene(scene.description, characterDescription);
    const prompt = [
      'donghua anime, cel shading, 2D illustration',
      sceneAction,
      actionKeywords,
      charPart,
      atmosphere,
      'cinematic composition, rule of thirds, dramatic lighting, masterpiece, highly detailed',
    ].filter(Boolean).join(', ');

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
          await retryWithBackoff(() =>
            generateHFImage(
              stylePrompt, scene.description, scene.keywords,
              characterDescription, seed, outPath
            )
          );
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

    // Animate each image with Stable Video Diffusion
    console.log(`  Scene ${scene.scene_number}: animating ${localPaths.length} images with SVD...`);
    const clipPaths = await animateImagesForScene(localPaths, outputDir, sceneIdx);

    for (let i = 0; i < localPaths.length; i++) {
      const clipPath = clipPaths[i] || localPaths[i];
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
