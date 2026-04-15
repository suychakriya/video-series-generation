import * as dotenv from 'dotenv';
dotenv.config();

import { runStory } from './commands/story';
import { runImages } from './commands/images';
import { runAudio } from './commands/audio';
import { runRender } from './commands/render';
import { runGenerate } from './commands/generate';
import { runSync } from './commands/sync';
import { runPost } from './commands/post';

function parsePartArg(args: string[]): number | undefined {
  const idx = args.indexOf('--part');
  if (idx === -1) return undefined;
  const val = parseInt(args[idx + 1]);
  if (isNaN(val) || val < 1 || val > 4) {
    throw new Error(`--part must be 1, 2, 3, or 4 (got: ${args[idx + 1]})`);
  }
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

    case 'images': {
      const part = parsePartArg(args);
      await runImages(part);
      break;
    }

    case 'audio': {
      const part = parsePartArg(args);
      await runAudio(part);
      break;
    }

    case 'render': {
      const part = parsePartArg(args);
      await runRender(part);
      break;
    }

    case 'generate': {
      const part = parsePartArg(args);
      await runGenerate(part);
      break;
    }

    case 'sync': {
      const part = parsePartArg(args);
      await runSync(part);
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
  story                          Generate story via Claude API and save to Supabase
  images [--part 1|2|3|4]       Generate images (requires story in Supabase)
  audio  [--part 1|2|3|4]       Generate audio  (requires story in Supabase)
  render [--part 1|2|3|4]       Render video    (requires images + audio done)
  generate [--part 1|2|3|4]     Run images + audio + render sequentially
  sync   [--part 1|2|3|4]       SCP video + thumbnail to Oracle VPS
  post   [--facebook-only]       Post today's story to Facebook and/or YouTube
         [--youtube-only]

Examples:
  node src/index.ts story
  node src/index.ts images --part 1
  node src/index.ts audio
  node src/index.ts render --part 2
  node src/index.ts generate
  node src/index.ts generate --part 3
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
