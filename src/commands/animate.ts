import * as dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import * as path from 'path';
import fetch from 'node-fetch';
import { getLatestStory, getStoryPart } from '../database';

const ANIMATE_URL = process.env.SVD_NGROK_URL;
const ANIMATE_PROMPT = 'subtle atmospheric motion, gentle breeze, soft fabric rippling, fog drifting, leaves rustling, no camera movement';

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function animateImage(imagePath: string, prompt: string, seed: number, outPath: string): Promise<void> {
  const imageBuffer = fs.readFileSync(imagePath);

  const params = new URLSearchParams({ prompt, seed: String(seed) });
  const submitRes = await fetch(`${ANIMATE_URL}/img2vid/submit?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: imageBuffer,
  });
  if (!submitRes.ok) {
    const body = await submitRes.text().catch(() => '');
    throw new Error(`Submit failed ${submitRes.status}: ${body.slice(0, 120)}`);
  }
  const { job_id } = (await submitRes.json()) as { job_id: string };

  // Poll until done (max 5 minutes)
  const deadline = Date.now() + 5 * 60 * 1000;
  while (Date.now() < deadline) {
    await sleep(3000);
    const statusRes = await fetch(`${ANIMATE_URL}/img2vid/status/${job_id}`);
    const status = (await statusRes.json()) as { status: string; error?: string };
    if (status.status === 'done') break;
    if (status.status === 'error') throw new Error(`Server error: ${status.error}`);
  }

  // Download result
  const resultRes = await fetch(`${ANIMATE_URL}/img2vid/result/${job_id}`);
  if (!resultRes.ok) throw new Error(`Result download failed ${resultRes.status}`);
  const buf = await resultRes.buffer();
  fs.writeFileSync(outPath, buf);
}

export async function runAnimate(partArg?: number, storyArg?: string): Promise<void> {
  if (!ANIMATE_URL) {
    throw new Error('SVD_NGROK_URL is not set in .env. Start kaggle_svd_server.ipynb and copy the URL.');
  }

  // Health check
  try {
    const health = await fetch(`${ANIMATE_URL}/health`);
    if (!health.ok) throw new Error(`status ${health.status}`);
    console.log(`Animation server reachable ✅  (${ANIMATE_URL})`);
  } catch (err) {
    throw new Error(`Cannot reach animation server at ${ANIMATE_URL}: ${(err as Error).message}`);
  }

  let storyId: string;
  if (storyArg) {
    storyId = storyArg;
    console.log(`\nUsing specified story: ${storyId}`);
  } else {
    const latest = await getLatestStory();
    if (!latest) throw new Error('No story found. Run "npm run story" first.');
    storyId = latest.story_id;
  }
  console.log(`Animating images for story: ${storyId}`);

  const parts = partArg ? [partArg] : [1, 2, 3, 4];

  for (const partNum of parts) {
    const record = await getStoryPart(storyId, partNum);
    if (!record) {
      console.log(`  Part ${partNum}: not found in DB, skipping`);
      continue;
    }
    if (record.images_status !== 'done') {
      console.log(`  Part ${partNum}: images_status is '${record.images_status}', skipping (run images first)`);
      continue;
    }

    const imageDir = path.join(process.cwd(), 'temp', storyId, `part_${partNum}`, 'images');
    if (!fs.existsSync(imageDir)) {
      console.log(`  Part ${partNum}: images directory not found, skipping`);
      continue;
    }

    const sceneImages = fs.readdirSync(imageDir)
      .filter((f) => /^scene_\d+_0\.jpg$/.test(f))
      .sort((a, b) => {
        const na = parseInt(a.match(/scene_(\d+)/)![1]);
        const nb = parseInt(b.match(/scene_(\d+)/)![1]);
        return na - nb;
      });

    console.log(`\n--- Part ${partNum}/4 — ${sceneImages.length} scenes ---`);

    // Build prompt map: description + animate_description combined
    const scenes: any[] = (record as any).scenes || [];
    const promptMap = new Map<number, string>();
    for (const s of scenes) {
      const parts = [s.description, s.animate_description].filter(Boolean);
      if (parts.length) promptMap.set(s.scene_number, parts.join(', '));
    }

    let done = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of sceneImages) {
      const sceneNum = parseInt(file.match(/scene_(\d+)/)![1]);
      const imagePath = path.join(imageDir, file);
      const clipPath = path.join(imageDir, `scene_${sceneNum}_clip_0.mp4`);

      if (fs.existsSync(clipPath)) {
        skipped++;
        continue;
      }

      const prompt = promptMap.get(sceneNum) || ANIMATE_PROMPT;
      const seed = 42 + sceneNum;

      process.stdout.write(`  Scene ${sceneNum}: animating... `);
      try {
        await animateImage(imagePath, prompt, seed, clipPath);
        console.log(`✅`);
        done++;
      } catch (err) {
        console.log(`❌ ${(err as Error).message}`);
        failed++;
      }
    }

    console.log(`  Part ${partNum} done — ${done} animated, ${skipped} skipped, ${failed} failed`);
  }

  console.log('\nAnimate complete.');
}
