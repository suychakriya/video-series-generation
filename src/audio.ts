import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { Theme } from './themes';

const execFileAsync = promisify(execFile);

// Best free male voices for narration (Edge TTS)
// Full list: run `npx edge-tts --list-voices`
const EDGE_VOICE = 'en-US-GuyNeural'; // Deep male narrator voice

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise((r) => setTimeout(r, Math.pow(2, i + 1) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}

// PRIMARY: Edge TTS — free, no API key, high quality neural voice
// Uses a .mjs helper to cross the CJS/ESM boundary
async function generateEdgeAudio(
  text: string,
  outputPath: string,
  rate = '-5%',
  pitch = '-10Hz'
): Promise<void> {
  const helperPath = path.join(__dirname, 'tts-helper.mjs');
  const configPath = outputPath + '.config.json';
  fs.writeFileSync(configPath, JSON.stringify({ text, output: outputPath, voice: EDGE_VOICE, rate, pitch }));
  try {
    await execFileAsync('node', [helperPath, configPath]);
  } finally {
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
  }
}

// OPTIONAL UPGRADE: ElevenLabs — paid, best quality
async function generateElevenLabsAudio(
  text: string,
  outputPath: string,
  stability = 0.5,
  similarityBoost = 0.75,
  style = 0.5
): Promise<void> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability, similarity_boost: similarityBoost, style, use_speaker_boost: true },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs error ${response.status}: ${errText}`);
  }
  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);
}

// LAST RESORT: HuggingFace TTS
async function generateHFFallbackAudio(text: string, outputPath: string): Promise<void> {
  const truncated = text.slice(0, 500);
  const response = await fetch(
    'https://router.huggingface.co/hf-inference/models/facebook/mms-tts-eng',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: truncated }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HF TTS error ${response.status}: ${errText}`);
  }
  const buffer = await response.buffer();
  fs.writeFileSync(outputPath, buffer);
}

async function generateAudio(
  text: string,
  outputPath: string,
  isShort = false
): Promise<void> {
  // 1. Try ElevenLabs if key is set and user has paid plan
  if (process.env.ELEVENLABS_API_KEY) {
    try {
      const stability = isShort ? 0.2 : 0.5;
      const style = isShort ? 1.0 : 0.5;
      await retryWithBackoff(() =>
        generateElevenLabsAudio(text, outputPath, stability, 0.75, style)
      );
      console.log('  Audio generated via ElevenLabs ✅');
      return;
    } catch (err) {
      console.log(`  ElevenLabs failed: ${(err as Error).message}`);
    }
  }

  // 2. Edge TTS — free, no API key needed
  try {
    // Slower rate for dramatic narration, lower pitch for deep male voice
    const rate = isShort ? '-10%' : '-5%';
    const pitch = '-10Hz';
    await retryWithBackoff(() => generateEdgeAudio(text, outputPath, rate, pitch));
    console.log('  Audio generated via Edge TTS ✅');
    return;
  } catch (err) {
    console.log(`  Edge TTS failed: ${(err as Error).message}`);
  }

  // 3. HuggingFace last resort
  try {
    await retryWithBackoff(() => generateHFFallbackAudio(text, outputPath));
    console.log('  Audio generated via HuggingFace TTS ✅');
  } catch (err) {
    throw new Error(`All TTS providers failed. Last error: ${(err as Error).message}`);
  }
}

export async function generateMainAudio(
  content: string,
  hook: string,
  partNumber: number,
  theme: Theme,
  storyTitle: string,
  storyId: string
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${partNumber}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'narration.mp3');

  const brandedIntro = `Welcome to Untold Lores. "${storyTitle}" — Part ${partNumber} of 4.`;
  const brandedOutro = `That's it for Part ${partNumber}. Follow Untold Lores for Part ${
    partNumber < 4 ? partNumber + 1 : '1 of our next story'
  }. Like and subscribe for daily stories.`;

  const fullText = `${brandedIntro}\n\n${content}\n\n${hook}\n\n${brandedOutro}`;
  console.log(`  Generating main audio (${fullText.length} chars)...`);

  await generateAudio(fullText, outputPath, false);
  return outputPath;
}

export async function generateShortAudio(
  hook: string,
  partNumber: number,
  theme: Theme,
  storyId: string
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${partNumber}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'short_narration.mp3');

  const fullText = `${theme.leadIn} ${hook} Find out what happens next... Follow Untold Lores.`;
  console.log(`  Generating short audio (hook line)...`);

  await generateAudio(fullText, outputPath, true);
  return outputPath;
}
