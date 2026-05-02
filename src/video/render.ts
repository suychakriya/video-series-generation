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
  const totalDurationSec =
    timings.introDurationSec +
    timings.sceneDurationsSec.reduce((a, b) => a + b, 0) +
    timings.hookDurationSec +
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
  const introFrames = Math.round(timings.introDurationSec * fps);
  const hookFrames = Math.round(timings.hookDurationSec * fps);
  const outroFrames = Math.round(timings.outroDurationSec * fps);

  const clips: Array<{ src: string; isVideo: boolean }> = [];
  const clipTimings: Array<{ startFrame: number; durationFrames: number }> = [];

  if (format === 'facebook') {
    // Facebook visual order: hookImage → thumbnail → scenes → hookImage (hook) → hookImage (outro)
    // Each clip gets its own independent audio file — no seeking needed.
    clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // [0] hook tease
    clips.push({ src: toDataUri(thumbnailPath), isVideo: false }); // [1] intro
    imageResults.forEach((r) => clips.push({ src: toDataUri(r.localPath), isVideo: false }));
    clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // [last-1] second hook
    clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // [last] outro CTA

    // Visual timings
    clipTimings.push({ startFrame: 0, durationFrames: hookFrames });
    clipTimings.push({ startFrame: hookFrames, durationFrames: introFrames });
    let sceneVisualOffset = 0;
    for (let i = 0; i < part.scenes.length; i++) {
      const durationFrames =
        i < part.scenes.length - 1
          ? Math.round(timings.sceneDurationsSec[i] * fps)
          : Math.round(timings.sceneDurationsSec.reduce((a, b) => a + b, 0) * fps) -
            sceneVisualOffset;
      clipTimings.push({
        startFrame: hookFrames + introFrames + sceneVisualOffset,
        durationFrames,
      });
      sceneVisualOffset += durationFrames;
    }
    const secondHookStart = hookFrames + introFrames + sceneVisualOffset;
    clipTimings.push({ startFrame: secondHookStart, durationFrames: hookFrames }); // second hook
    clipTimings.push({ startFrame: secondHookStart + hookFrames, durationFrames: outroFrames }); // outro

    // Per-clip audio srcs in visual order: hook → intro → scenes → hook → outro
    const audioSrcs = [
      toAudioDataUri(audioPaths.hookPath),
      toAudioDataUri(audioPaths.introPath),
      ...audioPaths.scenePaths.map(toAudioDataUri),
      toAudioDataUri(audioPaths.hookPath),
      toAudioDataUri(audioPaths.outroPath),
    ];

    const totalSceneFrames = Math.round(timings.sceneDurationsSec.reduce((a, b) => a + b, 0) * fps);
    const fbDurationInFrames =
      hookFrames + introFrames + totalSceneFrames + hookFrames + outroFrames + fps;

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

  // Landscape: thumbnail → scenes → hookImage → hookImage (outro)
  clips.push({ src: toDataUri(thumbnailPath), isVideo: false }); // [0] intro
  imageResults.forEach((r) => clips.push({ src: toDataUri(r.localPath), isVideo: false }));
  clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // [last-1] hook
  clips.push({ src: toDataUri(hookImagePath), isVideo: false }); // [last] outro

  clipTimings.push({ startFrame: 0, durationFrames: introFrames });
  let offset = 0;
  for (let i = 0; i < part.scenes.length; i++) {
    const durationFrames =
      i < part.scenes.length - 1
        ? Math.round(timings.sceneDurationsSec[i] * fps)
        : Math.round(timings.sceneDurationsSec.reduce((a, b) => a + b, 0) * fps) - offset;
    clipTimings.push({ startFrame: introFrames + offset, durationFrames });
    offset += durationFrames;
  }
  clipTimings.push({ startFrame: introFrames + offset, durationFrames: hookFrames });
  clipTimings.push({ startFrame: introFrames + offset + hookFrames, durationFrames: outroFrames });

  // Per-clip audio srcs in visual order: intro → scenes → hook → outro
  const audioSrcs = [
    toAudioDataUri(audioPaths.introPath),
    ...audioPaths.scenePaths.map(toAudioDataUri),
    toAudioDataUri(audioPaths.hookPath),
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
