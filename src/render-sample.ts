import * as dotenv from 'dotenv';
dotenv.config();

import * as path from 'path';
import * as fs from 'fs';
import { bundle } from '@remotion/bundler';
import { enableTailwind } from '@remotion/tailwind';
import { renderMedia, selectComposition } from '@remotion/renderer';

const ROOT_ENTRY = path.join(process.cwd(), 'src', 'video', 'Root.tsx');

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

async function main() {
  const storyId = 'test_1774161599611';
  const partDir = path.join(process.cwd(), 'temp', storyId, 'part_1');
  const imageDir = path.join(partDir, 'images');
  const audioPath = path.join(partDir, 'narration.mp3');
  const thumbnailPath = path.join(partDir, 'thumbnail.jpg');

  const fps = 30;
  const introDurationSec = 4;
  const scene1Sec = 5.5;
  const scene2Sec = 8.6;
  const totalSec = introDurationSec + scene1Sec + scene2Sec;
  const durationInFrames = Math.ceil(totalSec * fps);

  const clips = [
    { src: toDataUri(thumbnailPath), isVideo: false },
    { src: toDataUri(path.join(imageDir, 'scene_1_0.jpg')), isVideo: false },
    { src: toDataUri(path.join(imageDir, 'scene_2_0.jpg')), isVideo: false },
  ];

  const clipTimings = [
    { startFrame: 0, durationFrames: Math.round(introDurationSec * fps) },
    { startFrame: Math.round(introDurationSec * fps), durationFrames: Math.round(scene1Sec * fps) },
    { startFrame: Math.round((introDurationSec + scene1Sec) * fps), durationFrames: Math.round(scene2Sec * fps) },
  ];

  const scenes = [
    { narration: 'Li Wei had been living alone in his ancestral home for three months when the red envelope appeared under his door.', description: '', imagesCount: 1 },
    { narration: 'The paper felt strange beneath his fingertips — too smooth, too cold, and when he held it up to the lamplight, he could swear he saw dark stains bleeding through from within.', description: '', imagesCount: 1 },
  ];

  const sharedProps = {
    clips,
    clipTimings,
    audioSrc: toAudioDataUri(audioPath),
    scenes,
    partNumber: 1,
    totalParts: 4,
    theme: { colorTint: 'rgba(80,0,0,0.25)', name: 'Horror' },
    storyTitle: 'The Crimson Wedding Invitation',
    hook: 'Every single wedding guest was someone from the village who had died in the past twenty years.',
  };

  console.log('Bundling...');
  const serveUrl = await bundle({ entryPoint: ROOT_ENTRY, webpackOverride: enableTailwind });

  // YouTube (1920x1080)
  console.log('Rendering YouTube sample (1920x1080)...');
  const ytComposition = await selectComposition({
    serveUrl, id: 'MainVideo',
    inputProps: { ...sharedProps, content: '' },
  });
  await renderMedia({
    composition: { ...ytComposition, durationInFrames, width: 1920, height: 1080, fps },
    serveUrl,
    codec: 'h264',
    outputLocation: path.join(process.cwd(), 'test-output', 'sample_yt.mp4'),
    inputProps: { ...sharedProps, content: '' },
    crf: 26,
  });
  console.log('  Done → test-output/sample_yt.mp4');

  // Facebook (1080x1350)
  console.log('Rendering Facebook sample (1080x1350)...');
  const fbComposition = await selectComposition({
    serveUrl, id: 'FacebookVideo',
    inputProps: sharedProps,
  });
  await renderMedia({
    composition: { ...fbComposition, durationInFrames, width: 1080, height: 1350, fps },
    serveUrl,
    codec: 'h264',
    outputLocation: path.join(process.cwd(), 'test-output', 'sample_fb.mp4'),
    inputProps: sharedProps,
    crf: 26,
  });
  console.log('  Done → test-output/sample_fb.mp4');

  console.log('\nAll done!');
}

main().catch(err => { console.error(err); process.exit(1); });
