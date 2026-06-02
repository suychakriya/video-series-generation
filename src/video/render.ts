import { bundle } from '@remotion/bundler';
import { enableTailwind } from '@remotion/tailwind';
import { renderMedia, renderStill, selectComposition, RenderInternals } from '@remotion/renderer';
import type { RemotionServer } from '@remotion/renderer';
import type { FacebookVideoProps } from './FacebookVideo';
import * as path from 'path';
import * as fs from 'fs';
import { Theme } from '../themes';
import { StoryPart } from '../story';
import { AudioTimings, AudioPaths } from '../audio';

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

// Bundle once and start a single persistent HTTP server reused across all renders in a pipeline run.
// Passing an HTTP URL (not a file path) to renderMedia/selectComposition tells Remotion to skip
// starting its own per-render file server, avoiding TCP TIME_WAIT port conflicts.
let cachedServer: RemotionServer | null = null;

async function getServeUrl(): Promise<string> {
  if (!cachedServer) {
    console.log('  Bundling Remotion compositions...');
    const bundlePath = await bundle({
      entryPoint: ROOT_ENTRY,
      webpackOverride: enableTailwind,
    });
    console.log('  Bundle ready ✅');
    cachedServer = await RenderInternals.prepareServer({
      webpackConfigOrServeUrl: bundlePath,
      port: null,
      remotionRoot: process.cwd(),
      offthreadVideoThreads: 0,
      logLevel: 'error',
      indent: false,
      offthreadVideoCacheSizeInBytes: null,
      binariesDirectory: null,
      forceIPv4: false,
    });
  }
  return cachedServer.serveUrl;
}

export async function closeRenderServer(): Promise<void> {
  if (cachedServer) {
    await cachedServer.closeServer(true);
    cachedServer = null;
  }
}

export async function renderMainVideo(
  part: StoryPart,
  imageResults: Array<{ localPath: string; clipPath: string; isVideo: boolean }>,
  audioPaths: AudioPaths,
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
  const isLastPart = part.part === 4;
  const totalDurationSec =
    timings.openingHookDurationSec +
    timings.introDurationSec +
    timings.sceneDurationsSec.reduce((a, b) => a + b, 0) +
    (isLastPart ? 0 : timings.hookDurationSec) +
    timings.outroDurationSec;
  const durationInFrames = Math.ceil(totalDurationSec * fps) + fps; // +1s buffer
  const serveUrl = await getServeUrl();

  const themeForVideo = { colorTint: theme.colorTint, name: theme.name };

  // Scene metadata (1 image per scene)
  const scenesData = part.scenes.map((s) => ({
    description: s.description,
    narration: s.narration,
    imagesCount: 1,
  }));

  // --- Exact clip timings from real audio durations ---
  const openingHookFrames = Math.round(timings.openingHookDurationSec * fps);
  const introFrames = Math.round(timings.introDurationSec * fps);
  const hookFrames = Math.round(timings.hookDurationSec * fps);
  const outroFrames = Math.round(timings.outroDurationSec * fps);

  const clips: Array<{ src: string; isVideo: boolean }> = [];
  const clipTimings: Array<{ startFrame: number; durationFrames: number }> = [];

  if (format === 'facebook') {
    // Facebook: openingHook → thumbnail → scenes → endingHook (Parts 1-3) → outro
    clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // [0] opening hook
    clips.push({ src: toDataUri(thumbnailPath), isVideo: false }); // [1] intro
    imageResults.forEach((r) => clips.push({ src: toDataUri(r.localPath), isVideo: false }));
    if (!isLastPart) {
      clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // ending hook (Parts 1-3)
    }
    clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // outro CTA

    // Visual timings
    clipTimings.push({ startFrame: 0, durationFrames: openingHookFrames });
    clipTimings.push({ startFrame: openingHookFrames, durationFrames: introFrames });
    let sceneVisualOffset = 0;
    for (let i = 0; i < part.scenes.length; i++) {
      const durationFrames =
        i < part.scenes.length - 1
          ? Math.round(timings.sceneDurationsSec[i] * fps)
          : Math.round(timings.sceneDurationsSec.reduce((a, b) => a + b, 0) * fps) -
            sceneVisualOffset;
      clipTimings.push({
        startFrame: openingHookFrames + introFrames + sceneVisualOffset,
        durationFrames,
      });
      sceneVisualOffset += durationFrames;
    }
    const afterScenesStart = openingHookFrames + introFrames + sceneVisualOffset;
    if (!isLastPart) {
      clipTimings.push({ startFrame: afterScenesStart, durationFrames: hookFrames });
      clipTimings.push({ startFrame: afterScenesStart + hookFrames, durationFrames: outroFrames });
    } else {
      clipTimings.push({ startFrame: afterScenesStart, durationFrames: outroFrames });
    }

    // Per-clip audio: openingHook → intro → scenes → endingHook (Parts 1-3) → outro
    const audioSrcs = [
      toAudioDataUri(audioPaths.openingHookPath),
      toAudioDataUri(audioPaths.introPath),
      ...audioPaths.scenePaths.map(toAudioDataUri),
      ...(!isLastPart ? [toAudioDataUri(audioPaths.hookPath)] : []),
      toAudioDataUri(audioPaths.outroPath),
    ];

    const totalSceneFrames = Math.round(timings.sceneDurationsSec.reduce((a, b) => a + b, 0) * fps);
    const fbDurationInFrames = isLastPart
      ? openingHookFrames + introFrames + totalSceneFrames + outroFrames + fps
      : openingHookFrames + introFrames + totalSceneFrames + hookFrames + outroFrames + fps;

    const fbInputProps: FacebookVideoProps = {
      clips,
      clipTimings,
      audioSrcs,
      scenes: scenesData,
      partNumber: part.part,
      totalParts: 4,
      theme: themeForVideo,
      storyTitle,
      hook: part.hook,
      openingHook: part.opening_hook,
      isLastPart,
    };
    const composition = await selectComposition({
      serveUrl,
      id: 'FacebookVideo',
      inputProps: fbInputProps as any,
    });
    await renderMedia({
      composition: {
        ...composition,
        durationInFrames: fbDurationInFrames,
        width: 1080,
        height: 1350,
        fps,
      },
      serveUrl,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: fbInputProps as any,
    });
    console.log(`  Facebook video rendered (1080x1350): ${outputPath}`);
    return outputPath;
  }

  // Landscape: openingHook → thumbnail → scenes → endingHook (Parts 1-3) → outro
  clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // [0] opening hook
  clips.push({ src: toDataUri(thumbnailPath), isVideo: false }); // [1] intro
  imageResults.forEach((r) => clips.push({ src: toDataUri(r.localPath), isVideo: false }));
  if (!isLastPart) {
    clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // ending hook (Parts 1-3)
  }
  clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // outro

  clipTimings.push({ startFrame: 0, durationFrames: openingHookFrames });
  clipTimings.push({ startFrame: openingHookFrames, durationFrames: introFrames });
  let offset = 0;
  for (let i = 0; i < part.scenes.length; i++) {
    const durationFrames =
      i < part.scenes.length - 1
        ? Math.round(timings.sceneDurationsSec[i] * fps)
        : Math.round(timings.sceneDurationsSec.reduce((a, b) => a + b, 0) * fps) - offset;
    clipTimings.push({ startFrame: openingHookFrames + introFrames + offset, durationFrames });
    offset += durationFrames;
  }
  const afterScenes = openingHookFrames + introFrames + offset;
  if (!isLastPart) {
    clipTimings.push({ startFrame: afterScenes, durationFrames: hookFrames });
    clipTimings.push({ startFrame: afterScenes + hookFrames, durationFrames: outroFrames });
  } else {
    clipTimings.push({ startFrame: afterScenes, durationFrames: outroFrames });
  }

  // Per-clip audio: openingHook → intro → scenes → endingHook (Parts 1-3) → outro
  const audioSrcs = [
    toAudioDataUri(audioPaths.openingHookPath),
    toAudioDataUri(audioPaths.introPath),
    ...audioPaths.scenePaths.map(toAudioDataUri),
    ...(!isLastPart ? [toAudioDataUri(audioPaths.hookPath)] : []),
    toAudioDataUri(audioPaths.outroPath),
  ];

  const inputProps = {
    clips,
    clipTimings,
    audioSrcs,
    content: part.content,
    scenes: scenesData,
    partNumber: part.part,
    totalParts: 4,
    theme: themeForVideo,
    storyTitle,
    hook: part.hook,
    openingHook: part.opening_hook,
    isLastPart,
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
  const serveUrl = await getServeUrl();

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
