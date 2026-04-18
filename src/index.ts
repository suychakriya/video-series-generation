import * as dotenv from 'dotenv';
dotenv.config();

import { runStory } from './commands/story';
import { runImages } from './commands/images';
import { runAudio } from './commands/audio';
import { runRender } from './commands/render';
import { runGenerate } from './commands/generate';
import { runSync } from './commands/sync';
import { runPost } from './commands/post';
import { runTranslate } from './commands/translate';

function parsePartArg(args: string[]): number | undefined {
  const idx = args.indexOf('--part');
  if (idx === -1) return undefined;
  const val = parseInt(args[idx + 1]);
  if (isNaN(val) || val < 1 || val > 4) {
    throw new Error(`--part must be 1, 2, 3, or 4 (got: ${args[idx + 1]})`);
  }
  return val;
}

function parseStoryArg(args: string[]): string | undefined {
  const idx = args.indexOf('--story');
  if (idx === -1) return undefined;
  const val = args[idx + 1];
  if (!val) throw new Error('--story requires a story_id value');
  return val;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'story': {
      await runStory();
      break;
    }

    case 'translate': {
      const part = parsePartArg(args);
      const story = parseStoryArg(args);
      await runTranslate(part, story);
      break;
    }

    case 'images': {
      const part = parsePartArg(args);
      const story = parseStoryArg(args);
      await runImages(part, story);
      break;
    }

    case 'audio': {
      const part = parsePartArg(args);
      const story = parseStoryArg(args);
      await runAudio(part, story);
      break;
    }

    case 'render': {
      const part = parsePartArg(args);
      const story = parseStoryArg(args);
      await runRender(part, story);
      break;
    }

    case 'generate': {
      const part = parsePartArg(args);
      const story = parseStoryArg(args);
      await runGenerate(part, story);
      break;
    }

    case 'sync': {
      const part = parsePartArg(args);
      const story = parseStoryArg(args);
      await runSync(part, story);
      break;
    }

    case 'post': {
      const facebookOnly = args.includes('--facebook-only');
      const youtubeOnly = args.includes('--youtube-only');
      if (facebookOnly && youtubeOnly) {
        throw new Error('Cannot use --facebook-only and --youtube-only together');
      }
      await runPost(facebookOnly, youtubeOnly);
      break;
    }

    default: {
      const usage = `
Usage: node src/index.ts <command> [options]

Commands:
  story                                        Generate story via Claude API and save to DB
  translate [--part 1|2|3|4] [--story <id>]   Translate story to Khmer (run after story)
  images [--part 1|2|3|4] [--story <id>]      Generate images (requires story in DB)
  audio  [--part 1|2|3|4] [--story <id>]      Generate audio  (requires story in DB)
  render [--part 1|2|3|4] [--story <id>]      Render video    (requires images + audio done)
  generate [--part 1|2|3|4] [--story <id>]    Run translate + images + audio + render sequentially
  sync   [--part 1|2|3|4] [--story <id>]      SCP video + thumbnail to Oracle VPS
  post   [--facebook-only]                     Post today's story to Facebook and/or YouTube
         [--youtube-only]

Options:
  --story <id>   Use a specific story (e.g. story_20260416_342). Defaults to latest.
  --part  1|2|3|4  Process only one part. Defaults to all 4 parts.

Examples:
  node src/index.ts story
  node src/index.ts images --part 1
  node src/index.ts images --story story_20260416_342
  node src/index.ts images --story story_20260416_342 --part 2
  node src/index.ts audio
  node src/index.ts render --part 2
  node src/index.ts generate
  node src/index.ts generate --part 3
  node src/index.ts generate --story story_20260416_342
  node src/index.ts sync
  node src/index.ts post
  node src/index.ts post --facebook-only
`;
      if (command) {
        console.error(`Unknown command: ${command}`);
      }
      console.log(usage);
      if (command) process.exit(1);
      break;
    }
  }
}

main().catch((err) => {
  console.error('\nError:', err instanceof Error ? err.message : err);
  process.exit(1);
});
