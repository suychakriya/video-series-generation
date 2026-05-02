import * as dotenv from 'dotenv';
dotenv.config();

import * as path from 'path';
import * as fs from 'fs';
import { renderMainVideo } from './video/render';
import { getThemeByIndex } from './themes';
import type { AudioPaths } from './audio';

async function main() {
  const storyId = 'test_1774161599611';
  const partDir = path.join(process.cwd(), 'temp', storyId, 'part_1');
  const imageDir = path.join(partDir, 'images');
  const timings = JSON.parse(fs.readFileSync(path.join(partDir, 'timings.json'), 'utf-8'));
  const story = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'test-output', 'last-story.json'), 'utf-8'));
  const part = story.parts[0];
  const theme = getThemeByIndex(0);

  // Load all scene images in order
  const imageFiles = fs.readdirSync(imageDir)
    .filter(f => f.match(/^scene_\d+_0\.jpg$/))
    .sort((a, b) => {
      const na = parseInt(a.match(/scene_(\d+)/)?.[1] ?? '0');
      const nb = parseInt(b.match(/scene_(\d+)/)?.[1] ?? '0');
      return na - nb;
    });

  const images = imageFiles.map(f => {
    const localPath = path.join(imageDir, f);
    return { localPath, clipPath: localPath, isVideo: false };
  });

  const thumbnailPath = path.join(partDir, 'thumbnail.jpg');
  const hookImagePath = path.join(imageDir, 'hook_image.jpg');
  const audioDir = path.join(partDir, 'scene_audios');
  const audioPaths: AudioPaths = {
    introPath: path.join(audioDir, 'intro.mp3'),
    scenePaths: fs.readdirSync(audioDir)
      .filter(f => /^scene_\d+\.mp3$/.test(f))
      .sort((a, b) => parseInt(a.match(/scene_(\d+)/)![1]) - parseInt(b.match(/scene_(\d+)/)![1]))
      .map(f => path.join(audioDir, f)),
    hookPath: path.join(audioDir, 'hook.mp3'),
    outroPath: path.join(audioDir, 'outro.mp3'),
  };

  console.log(`Rendering Facebook full Part 1 (${images.length} scenes)...`);

  const outputPath = await renderMainVideo(
    part, images, audioPaths, theme,
    storyId, story.overall_title,
    thumbnailPath, hookImagePath, timings,
    'facebook'
  );

  // Copy to test-output
  fs.copyFileSync(outputPath, path.join(process.cwd(), 'test-output', 'part1_facebook.mp4'));
  console.log('Done! → test-output/part1_facebook.mp4');
}

main().catch(err => { console.error(err); process.exit(1); });
