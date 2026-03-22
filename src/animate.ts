import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

const HF_API_TOKEN = process.env.HUGGINGFACE_API_TOKEN!;
const LOCAL_MODEL_URL = process.env.LOCAL_MODEL_URL; // Colab/RunPod server

// Stable Video Diffusion via HuggingFace (cloud fallback)
const SVD_MODEL =
  'https://router.huggingface.co/hf-inference/models/stabilityai/stable-video-diffusion-img2vid-xt';

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      if ((err as any).noRetry) throw err;
      const delay = Math.pow(2, i + 1) * 1000;
      console.log(`    Retry ${i + 1}/${maxRetries} in ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Animate via local Colab/RunPod server
async function animateImageLocal(imagePath: string, outputPath: string): Promise<string> {
  const base64Image = fs.readFileSync(imagePath).toString('base64');

  const response = await fetch(`${LOCAL_MODEL_URL}/img2vid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64Image, seed: 42 }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`Local SVD error ${response.status}: ${errText.slice(0, 120)}`);
  }

  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

// Animate via HuggingFace SVD (requires credits)
async function animateImageHF(imagePath: string, outputPath: string): Promise<string> {
  const base64Image = fs.readFileSync(imagePath).toString('base64');
  const dataUri = `data:image/jpeg;base64,${base64Image}`;

  const response = await fetch(SVD_MODEL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      inputs: dataUri,
      parameters: {
        num_frames: 25,
        num_inference_steps: 25,
        min_guidance_scale: 1.0,
        max_guidance_scale: 3.0,
        fps: 6,
        motion_bucket_id: 127,
        noise_aug_strength: 0.02,
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`SVD error ${response.status}: ${errText}`);
    if (response.status === 402 || response.status === 401) (err as any).noRetry = true;
    throw err;
  }

  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
}

export async function animateImagesForScene(
  imagePaths: string[],
  outputDir: string,
  sceneIndex: number
): Promise<string[]> {
  const videoPaths: string[] = [];

  for (let i = 0; i < imagePaths.length; i++) {
    const outputPath = path.join(outputDir, `scene_${sceneIndex}_clip_${i}.mp4`);

    if (fs.existsSync(outputPath)) {
      console.log(`    ✅ Clip ${i + 1} already exists, skipping`);
      videoPaths.push(outputPath);
      continue;
    }

    try {
      console.log(`    🎬 Animating image ${i + 1}/${imagePaths.length}...`);
      if (LOCAL_MODEL_URL) {
        await retryWithBackoff(() => animateImageLocal(imagePaths[i], outputPath));
      } else {
        await retryWithBackoff(() => animateImageHF(imagePaths[i], outputPath));
      }
      videoPaths.push(outputPath);
      console.log(`    ✅ Clip ${i + 1} done`);
    } catch (err) {
      console.log(`    ⚠️  SVD failed for clip ${i + 1}: ${(err as Error).message}`);
      console.log(`    📸 Falling back to static image`);
      videoPaths.push(imagePaths[i]);
    }
  }

  return videoPaths;
}
