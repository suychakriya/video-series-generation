import * as fs from 'fs';
import * as path from 'path';

export interface SubtitleEntry {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

function secondsToSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export function generateSRT(
  content: string,
  partNumber: number,
  storyId: string,
  wordsPerMinute = 140,
  introSeconds = 5,
  audioPath?: string // if provided, checks for a real word-timed SRT generated alongside the audio
): string {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${partNumber}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'subtitles.srt');

  // Use the real word-timed SRT from Edge TTS if available
  if (audioPath) {
    const realSRT = audioPath.replace(/\.mp3$/, '.srt');
    if (fs.existsSync(realSRT)) {
      fs.copyFileSync(realSRT, outputPath);
      console.log(`  Using word-timed subtitles from Edge TTS ✅`);
      return outputPath;
    }
  }

  const words = content.split(/\s+/).filter((w) => w.length > 0);
  const wordsPerSecond = wordsPerMinute / 60;
  const chunkSize = 8; // words per subtitle line

  const entries: SubtitleEntry[] = [];
  let currentTime = introSeconds; // offset for branded intro

  for (let i = 0; i < words.length; i += chunkSize) {
    const chunk = words.slice(i, i + chunkSize);
    const chunkText = chunk.join(' ');
    const chunkDuration = chunk.length / wordsPerSecond;

    entries.push({
      index: entries.length + 1,
      startTime: secondsToSRTTime(currentTime),
      endTime: secondsToSRTTime(currentTime + chunkDuration),
      text: chunkText,
    });

    currentTime += chunkDuration;
  }

  const srtContent = entries
    .map((e) => `${e.index}\n${e.startTime} --> ${e.endTime}\n${e.text}\n`)
    .join('\n');

  fs.writeFileSync(outputPath, srtContent);
  console.log(`  Generated ${entries.length} subtitle entries`);
  return outputPath;
}
