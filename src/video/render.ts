import { bundle } from '@remotion/bundler';
import { enableTailwind } from '@remotion/tailwind';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import type { FacebookVideoProps } from './FacebookVideo';
import * as path from 'path';
import * as fs from 'fs';
import { Theme } from '../themes';
import { StoryPart } from '../story';
import { AudioTimings, getExactAudioDuration } from '../audio';

const ROOT_ENTRY = path.join(process.cwd(), 'src', 'video', 'Root.tsx');

// Convert local file path to base64 data URI so Remotion (Chrome) can load it
function toDataUri(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase().replace('.', '');
  const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:${mime};base64,${data}`;
}

function toAudioDataUri(filePath: string): string {
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:audio/mpeg;base64,${data}`;
}

function toVideoDataUri(filePath: string): string {
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:video/mp4;base64,${data}`;
}

// Bundle once and reuse across all renders in a pipeline run
let cachedBundleUrl: string | null = null;

async function getBundleUrl(): Promise<string> {
  if (!cachedBundleUrl) {
    console.log('  Bundling Remotion compositions...');
    cachedBundleUrl = await bundle({
      entryPoint: ROOT_ENTRY,
      webpackOverride: enableTailwind,
    });
    console.log('  Bundle ready ✅');
  }
  return cachedBundleUrl;
}


export async function renderMainVideo(
  part: StoryPart,
  imageResults: Array<{ localPath: string; clipPath: string; isVideo: boolean }>,
  audioPath: string,
  theme: Theme,
  storyId: string,
  storyTitle: string,
  thumbnailPath: string,
  hookImagePath: string,
  timings: AudioTimings,
  format: 'landscape' | 'facebook' = 'landscape',
  outputSuffix = ''
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${part.part}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const baseName = format === 'facebook' ? 'main_video_facebook' : 'main_video';
  const outputPath = path.join(outputDir, `${baseName}${outputSuffix}.mp4`);

  const fps = 30;
  const totalDurationSec =
    timings.introDurationSec +
    timings.sceneDurationsSec.reduce((a, b) => a + b, 0) +
    timings.hookDurationSec +
    timings.outroDurationSec;
  const durationInFrames = Math.ceil(totalDurationSec * fps) + fps; // +1s buffer
  const serveUrl = await getBundleUrl();

  const themeForVideo = { colorTint: theme.colorTint, name: theme.name };

  // Build clips: thumbnail (intro), scene images, thumbnail again (hook)
  const clips: Array<{ src: string; isVideo: boolean }> = [];
  clips.push({ src: toDataUri(thumbnailPath), isVideo: false }); // index 0 — intro
  imageResults.forEach((r) => clips.push({
    src: r.isVideo ? toVideoDataUri(r.clipPath) : toDataUri(r.localPath),
    isVideo: r.isVideo,
  }));
  clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // last — hook

  // Scene metadata (1 image per scene)
  const scenesData = part.scenes.map((s) => ({
    description: s.description,
    narration: s.narration,
    imagesCount: 1,
  }));

  // --- Exact clip timings from real audio durations ---
  const introFrames = Math.round(timings.introDurationSec * fps);
  const hookFrames = Math.round(timings.hookDurationSec * fps);

  const clipTimings: Array<{ startFrame: number; durationFrames: number }> = [];

  // Thumbnail during intro
  clipTimings.push({ startFrame: 0, durationFrames: introFrames });

  // Scene clips — each exactly matches its narration audio duration
  let sceneOffset = 0;
  for (let i = 0; i < part.scenes.length; i++) {
    const durationFrames = i < part.scenes.length - 1
      ? Math.round(timings.sceneDurationsSec[i] * fps)
      : Math.round(timings.sceneDurationsSec.reduce((a, b) => a + b, 0) * fps) - sceneOffset;
    clipTimings.push({ startFrame: introFrames + sceneOffset, durationFrames });
    sceneOffset += durationFrames;
  }

  // Thumbnail again during hook narration
  clipTimings.push({ startFrame: introFrames + sceneOffset, durationFrames: hookFrames });

  if (format === 'facebook') {
    const fbInputProps: FacebookVideoProps = {
      clips,
      clipTimings,
      audioSrc: toAudioDataUri(audioPath),
      scenes: scenesData,
      partNumber: part.part,
      totalParts: 4,
      theme: themeForVideo,
      storyTitle,
      hook: part.hook,
    };
    const composition = await selectComposition({ serveUrl, id: 'FacebookVideo', inputProps: fbInputProps as any });
    await renderMedia({
      composition: { ...composition, durationInFrames, width: 1080, height: 1350, fps },
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: fbInputProps as any,
    });
    console.log(`  Facebook video rendered (1080x1350): ${outputPath}`);
    return outputPath;
  }

  const inputProps = {
    clips,
    clipTimings,
    audioSrc: toAudioDataUri(audioPath),
    content: part.content,
    scenes: scenesData,
    partNumber: part.part,
    totalParts: 4,
    theme: themeForVideo,
    storyTitle,
    hook: part.hook,
  };

  const composition = await selectComposition({ serveUrl, id: 'MainVideo', inputProps });

  await renderMedia({
    composition: { ...composition, durationInFrames, width: 1920, height: 1080, fps },
    serveUrl,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
  });

  console.log(`  Main video rendered (1920x1080): ${outputPath}`);
  return outputPath;
}


export async function renderThumbnail(
  part: StoryPart,
  dramaticImageUrl: string,
  theme: Theme,
  storyId: string
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${part.part}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'thumbnail.jpg');
  const serveUrl = await getBundleUrl();

  const themeForThumbnail = {
    themeColor: theme.themeColor,
    name: theme.name,
    themeLabel: theme.themeLabel,
    themeEmoji: theme.themeEmoji,
  };
  const inputProps = {
    dramaticImageUrl: toDataUri(dramaticImageUrl),
    thumbnailTitle: part.thumbnail_title,
    partNumber: part.part,
    totalParts: 4,
    theme: themeForThumbnail,
  };

  const composition = await selectComposition({ serveUrl, id: 'Thumbnail', inputProps });

  await renderStill({
    composition: { ...composition, width: 1280, height: 720, fps: 30, durationInFrames: 1 },
    serveUrl,
    output: outputPath,
    imageFormat: 'jpeg',
    jpegQuality: 85,
    inputProps,
  });

  console.log(`  Thumbnail rendered: ${outputPath}`);
  return outputPath;
}
