import { bundle } from '@remotion/bundler';
import { enableTailwind } from '@remotion/tailwind';
import { renderMedia, renderStill, selectComposition } from '@remotion/renderer';
import * as path from 'path';
import * as fs from 'fs';
import { Theme } from '../themes';
import { StoryPart } from '../story';

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

async function getAudioDurationSeconds(audioPath: string): Promise<number> {
  try {
    // Edge TTS outputs at 128kbps → 16000 bytes/sec
    const stats = fs.statSync(audioPath);
    return Math.ceil(stats.size / 16000);
  } catch {
    return 600;
  }
}

export async function renderMainVideo(
  part: StoryPart,
  imageResults: Array<{ localPath: string; clipPath: string; isVideo: boolean }>,
  audioPath: string,
  theme: Theme,
  storyId: string,
  storyTitle: string,
  thumbnailPath: string
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${part.part}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'main_video.mp4');

  const durationSeconds = await getAudioDurationSeconds(audioPath);
  const fps = 30;
  const durationInFrames = (durationSeconds + 3) * fps;
  const serveUrl = await getBundleUrl();

  const themeForVideo = { colorTint: theme.colorTint, name: theme.name };

  // Build clips array (scene clips + thumbnail for hook section)
  const clips = imageResults.map((r) => ({
    src: r.isVideo ? toVideoDataUri(r.clipPath) : toDataUri(r.localPath),
    isVideo: r.isVideo,
  }));
  // Thumbnail clip appended at end — used during hook narration
  clips.push({ src: toDataUri(thumbnailPath), isVideo: false });

  // Build scene map: how many clips belong to each scene
  const clipsPerScene = Math.ceil(clips.length / part.scenes.length);
  const scenesData = part.scenes.map((s, i) => ({
    description: s.description,
    narration: s.narration,
    imagesCount: i < part.scenes.length - 1
      ? clipsPerScene
      : clips.length - clipsPerScene * (part.scenes.length - 1) - 1, // -1 for thumbnail clip
  }));

  // --- Proportional clip timing ---
  // Match the branded text generated in audio.ts exactly so word-proportions are accurate
  const brandedIntro = `Welcome to Untold Lores. "${storyTitle}" — Part ${part.part} of 4.`;
  const brandedOutro = `That's it for Part ${part.part}. Follow Untold Lores for Part ${
    part.part < 4 ? part.part + 1 : '1 of our next story'
  }. Like and subscribe for daily stories.`;

  const introWords = brandedIntro.split(/\s+/).length;
  const contentWords = part.content.split(/\s+/).length;
  const hookWords = part.hook.split(/\s+/).length;
  const outroWords = brandedOutro.split(/\s+/).length;
  const totalWords = introWords + contentWords + hookWords + outroWords;

  const introFrames = Math.round((introWords / totalWords) * durationInFrames);
  const outroFrames = Math.round((outroWords / totalWords) * durationInFrames);
  const hookFrames = Math.round((hookWords / totalWords) * durationInFrames);
  const contentFrames = durationInFrames - introFrames - hookFrames - outroFrames;

  // Each scene gets frames proportional to its narration word count — exact voice sync
  const totalNarrationWords = part.scenes.reduce(
    (sum, s) => sum + (s.narration ? s.narration.split(/\s+/).length : 1), 0
  ) || contentWords; // fallback to content word count if narration missing

  let sceneOffset = 0;
  const clipTimings: Array<{ startFrame: number; durationFrames: number }> = [];
  for (let sceneIdx = 0; sceneIdx < part.scenes.length; sceneIdx++) {
    const scene = part.scenes[sceneIdx];
    const sceneNarrationWords = scene.narration
      ? scene.narration.split(/\s+/).length
      : Math.round(contentWords / part.scenes.length);

    const sceneFrames = sceneIdx < part.scenes.length - 1
      ? Math.round((sceneNarrationWords / totalNarrationWords) * contentFrames)
      : contentFrames - sceneOffset; // last scene gets remainder to avoid rounding gaps

    const sceneStart = introFrames + sceneOffset;
    const sceneClipCount = scenesData[sceneIdx].imagesCount;

    for (let j = 0; j < sceneClipCount; j++) {
      const clipStart = sceneStart + Math.round((j / sceneClipCount) * sceneFrames);
      const clipEnd = j < sceneClipCount - 1
        ? sceneStart + Math.round(((j + 1) / sceneClipCount) * sceneFrames)
        : sceneStart + sceneFrames;
      clipTimings.push({ startFrame: clipStart, durationFrames: clipEnd - clipStart });
    }

    sceneOffset += sceneFrames;
  }

  // Thumbnail shown during hook narration
  clipTimings.push({ startFrame: introFrames + contentFrames, durationFrames: hookFrames });

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

  console.log(`  Main video rendered: ${outputPath}`);
  return outputPath;
}

export async function renderShort(
  part: StoryPart,
  cliffhangerImages: string[],
  shortAudioPath: string,
  theme: Theme,
  storyId: string
): Promise<string> {
  const outputDir = path.join(process.cwd(), 'temp', storyId, `part_${part.part}`);
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, 'short.mp4');

  const durationSeconds = await getAudioDurationSeconds(shortAudioPath);
  const fps = 30;
  const durationInFrames = (durationSeconds + 2) * fps;
  const serveUrl = await getBundleUrl();

  const themeForShort = {
    colorTint: theme.colorTint,
    name: theme.name,
    particleEffect: theme.particleEffect,
  };
  const inputProps = {
    images: cliffhangerImages.map(toDataUri),
    shortAudioSrc: toAudioDataUri(shortAudioPath),
    hook: part.hook,
    theme: themeForShort,
  };

  const composition = await selectComposition({ serveUrl, id: 'Short', inputProps });

  await renderMedia({
    composition: { ...composition, durationInFrames, width: 1080, height: 1920, fps },
    serveUrl,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps,
  });

  console.log(`  Short rendered: ${outputPath}`);
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
