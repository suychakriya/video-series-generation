import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';
import { Theme } from './themes';
import { StoryPart } from './story';
import { generateKhmerTTS } from './khmer-tts';
import { generateF5TTS } from './f5-tts';

const _exec = promisify(exec);

// Include Homebrew and common bin paths so ffmpeg/ffprobe are found on macOS and Linux
const execAsync = (cmd: string) =>
  _exec(cmd, { env: { ...process.env, PATH: `/opt/homebrew/bin:/usr/local/bin:/usr/bin:${process.env.PATH}` } });

export interface AudioTimings {
  introDurationSec: number;
  sceneDurationsSec: number[];
  hookDurationSec: number;
  outroDurationSec: number;
}

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

// Get exact audio duration in seconds using ffprobe
export async function getExactAudioDuration(audioPath: string): Promise<number> {
  const { stdout } = await execAsync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`
  );
  return parseFloat(stdout.trim());
}

// Concatenate multiple audio files into one using ffmpeg
async function concatenateAudios(audioPaths: string[], outputPath: string): Promise<void> {
  const listPath = outputPath + '.list.txt';
  fs.writeFileSync(listPath, audioPaths.map((p) => `file '${p}'`).join('\n'));
  try {
    await execAsync(`ffmpeg -f concat -safe 0 -i "${listPath}" -c copy -y "${outputPath}"`);
  } finally {
    if (fs.existsSync(listPath)) fs.unlinkSync(listPath);
  }
}


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
  if (!response.ok) throw new Error(`ElevenLabs error ${response.status}: ${await response.text()}`);
  fs.writeFileSync(outputPath, await response.buffer());
}

async function generateAudio(text: string, outputPath: string, isShort = false): Promise<void> {
  const provider = process.env.TTS_PROVIDER;

  if (provider === 'f5tts') {
    await generateF5TTS(text, outputPath);
    console.log('  Audio generated via F5-TTS ✅');
    return;
  }

  if (process.env.ELEVENLABS_API_KEY) {
    await retryWithBackoff(() =>
      generateElevenLabsAudio(text, outputPath, isShort ? 0.2 : 0.5, 0.75, isShort ? 1.0 : 0.5)
    );
    console.log('  Audio generated via ElevenLabs ✅');
    return;
  }

  throw new Error('No TTS provider configured. Set TTS_PROVIDER=f5tts or ELEVENLABS_API_KEY in .env');
}

export async function generateMainAudio(
  part: StoryPart,
  theme: Theme,
  storyTitle: string,
  storyId: string
): Promise<{ audioPath: string; timings: AudioTimings }> {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${part.part}`);
  const sceneAudioDir = path.join(outputDir, 'scene_audios');
  fs.mkdirSync(sceneAudioDir, { recursive: true });

  const brandedIntro = `Welcome to Untold Lores. "${storyTitle}" — Part ${part.part} of 4.`;
  const brandedOutro = `That's it for Part ${part.part}. Follow Untold Lores for Part ${
    part.part < 4 ? part.part + 1 : '1 of our next story'
  }. Like and subscribe for daily stories.`;

  const allAudioPaths: string[] = [];

  // 1. Intro
  const introPath = path.join(sceneAudioDir, 'intro.mp3');
  if (!fs.existsSync(introPath)) {
    console.log(`  Generating intro audio...`);
    await generateAudio(brandedIntro, introPath);
  }
  allAudioPaths.push(introPath);

  // 2. Per-scene narration
  const scenePaths: string[] = [];
  for (let i = 0; i < part.scenes.length; i++) {
    const scene = part.scenes[i];
    const scenePath = path.join(sceneAudioDir, `scene_${scene.scene_number}.mp3`);
    if (!fs.existsSync(scenePath)) {
      console.log(`  Generating scene ${scene.scene_number}/${part.scenes.length} audio...`);
      await generateAudio(scene.narration, scenePath);
    }
    scenePaths.push(scenePath);
    allAudioPaths.push(scenePath);
  }

  // 3. Hook
  const hookPath = path.join(sceneAudioDir, 'hook.mp3');
  if (!fs.existsSync(hookPath)) {
    console.log(`  Generating hook audio...`);
    await generateAudio(part.hook, hookPath);
  }
  allAudioPaths.push(hookPath);

  // 4. Outro
  const outroPath = path.join(sceneAudioDir, 'outro.mp3');
  if (!fs.existsSync(outroPath)) {
    console.log(`  Generating outro audio...`);
    await generateAudio(brandedOutro, outroPath);
  }
  allAudioPaths.push(outroPath);

  // 5. Concatenate all into final narration.mp3
  const audioPath = path.join(outputDir, 'narration.mp3');
  console.log(`  Concatenating ${allAudioPaths.length} audio segments...`);
  await concatenateAudios(allAudioPaths, audioPath);

  // 6. Measure exact durations
  const introDurationSec = await getExactAudioDuration(introPath);
  const sceneDurationsSec = await Promise.all(scenePaths.map(getExactAudioDuration));
  const hookDurationSec = await getExactAudioDuration(hookPath);
  const outroDurationSec = await getExactAudioDuration(outroPath);

  const timings: AudioTimings = { introDurationSec, sceneDurationsSec, hookDurationSec, outroDurationSec };

  // 7. Cache timings to disk for --reuse
  const timingsPath = path.join(outputDir, 'timings.json');
  fs.writeFileSync(timingsPath, JSON.stringify(timings, null, 2));

  console.log(`  ✅ Audio ready — intro: ${introDurationSec.toFixed(1)}s, ${part.scenes.length} scenes, hook: ${hookDurationSec.toFixed(1)}s`);
  return { audioPath, timings };
}

export async function generateKhmerAudio(
  part: StoryPart,
  _theme: Theme,
  _storyTitle: string,
  storyId: string
): Promise<{ audioPath: string; timings: AudioTimings }> {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${part.part}`);
  const khmerAudioDir = path.join(outputDir, 'khmer_audios');
  fs.mkdirSync(khmerAudioDir, { recursive: true });

  const khmerTitle = part.khmer_title || part.title;
  const partNext = part.part < 4 ? `ផ្នែកទី ${part.part + 1}` : 'ផ្នែកទី 1 នៃរឿងបន្ទាប់';
  const brandedIntro = `សូមស្វាគមន៍មកកាន់ Untold Lores។ "${khmerTitle}" — ផ្នែកទី ${part.part} នៃ 4។`;
  const brandedOutro = `នោះជាបញ្ចប់ ផ្នែកទី ${part.part}។ តាមដាន Untold Lores សម្រាប់ ${partNext}។ ចូលចិត្ត ហើយ Subscribe សម្រាប់រឿងប្រចាំថ្ងៃ។`;

  const khmerRetry = (text: string, outputPath: string) =>
    retryWithBackoff(() => generateKhmerTTS(text, outputPath));

  const allAudioPaths: string[] = [];

  // 1. Intro
  const introPath = path.join(khmerAudioDir, 'intro.mp3');
  if (!fs.existsSync(introPath)) {
    console.log(`  Generating Khmer intro audio...`);
    await khmerRetry(brandedIntro, introPath);
  }
  allAudioPaths.push(introPath);

  // 2. Per-scene narration
  const scenePaths: string[] = [];
  for (let i = 0; i < part.scenes.length; i++) {
    const scene = part.scenes[i];
    const text = scene.khmer_narration || scene.narration;
    const scenePath = path.join(khmerAudioDir, `scene_${scene.scene_number}.mp3`);
    if (!fs.existsSync(scenePath)) {
      console.log(`  Generating Khmer scene ${scene.scene_number}/${part.scenes.length} audio...`);
      await khmerRetry(text, scenePath);
    }
    scenePaths.push(scenePath);
    allAudioPaths.push(scenePath);
  }

  // 3. Hook
  const khmerHook = part.khmer_hook || part.hook;
  const hookPath = path.join(khmerAudioDir, 'hook.mp3');
  if (!fs.existsSync(hookPath)) {
    console.log(`  Generating Khmer hook audio...`);
    await khmerRetry(khmerHook, hookPath);
  }
  allAudioPaths.push(hookPath);

  // 4. Outro
  const outroPath = path.join(khmerAudioDir, 'outro.mp3');
  if (!fs.existsSync(outroPath)) {
    console.log(`  Generating Khmer outro audio...`);
    await khmerRetry(brandedOutro, outroPath);
  }
  allAudioPaths.push(outroPath);

  // 5. Concatenate
  const audioPath = path.join(outputDir, 'narration_khmer.mp3');
  console.log(`  Concatenating ${allAudioPaths.length} Khmer audio segments...`);
  await concatenateAudios(allAudioPaths, audioPath);

  // 6. Measure durations
  const introDurationSec = await getExactAudioDuration(introPath);
  const sceneDurationsSec = await Promise.all(scenePaths.map(getExactAudioDuration));
  const hookDurationSec = await getExactAudioDuration(hookPath);
  const outroDurationSec = await getExactAudioDuration(outroPath);

  const timings: AudioTimings = { introDurationSec, sceneDurationsSec, hookDurationSec, outroDurationSec };
  fs.writeFileSync(path.join(outputDir, 'timings_khmer.json'), JSON.stringify(timings, null, 2));

  console.log(`  ✅ Khmer audio ready — intro: ${introDurationSec.toFixed(1)}s, ${part.scenes.length} scenes, hook: ${hookDurationSec.toFixed(1)}s`);
  return { audioPath, timings };
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
