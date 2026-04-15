import * as dotenv from 'dotenv';
dotenv.config();

import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { getLatestStory, getStoryPart, updatePartStatus } from '../database';

const execAsync = promisify(exec);

function getOracleConfig(): {
  host: string;
  user: string;
  keyPath: string;
  destPath: string;
} {
  const host = process.env.ORACLE_HOST;
  const user = process.env.ORACLE_USER;
  const keyPath = process.env.ORACLE_KEY_PATH;
  const destPath = process.env.ORACLE_DEST_PATH || '/opt/stories';

  if (!host) throw new Error('ORACLE_HOST is not set in .env');
  if (!user) throw new Error('ORACLE_USER is not set in .env');
  if (!keyPath) throw new Error('ORACLE_KEY_PATH is not set in .env');

  return { host, user, keyPath, destPath };
}

async function scpFile(
  localPath: string,
  remotePath: string,
  user: string,
  host: string,
  keyPath: string
): Promise<void> {
  const remoteDir = path.dirname(remotePath);
  // Ensure remote directory exists
  await execAsync(
    `ssh -i "${keyPath}" -o StrictHostKeyChecking=no ${user}@${host} "mkdir -p ${remoteDir}"`
  );
  // SCP the file
  await execAsync(
    `scp -i "${keyPath}" -o StrictHostKeyChecking=no "${localPath}" "${user}@${host}:${remotePath}"`
  );
}

export async function runSync(partArg?: number): Promise<void> {
  const latestStory = await getLatestStory();
  if (!latestStory) {
    throw new Error('No story found in Supabase.');
  }

  const storyId = latestStory.story_id;
  console.log(`\nSyncing files for story: ${storyId}`);

  const oracle = getOracleConfig();
  const parts = partArg ? [partArg] : [1, 2, 3, 4];

  for (const partNum of parts) {
    const record = await getStoryPart(storyId, partNum);
    if (!record || !record.id) {
      console.log(`  Part ${partNum}: not found in Supabase, skipping`);
      continue;
    }

    if (record.video_status !== 'done') {
      console.log(`  Part ${partNum}: video_status is not 'done' (${record.video_status}), skipping`);
      continue;
    }

    const localVideoPath = record.video_path;
    const localFbVideoPath = record.facebook_video_path;
    const localThumbnailPath = record.thumbnail_path;

    if (!localVideoPath) {
      console.log(`  Part ${partNum}: no video_path in DB, skipping`);
      continue;
    }
    if (!localFbVideoPath) {
      console.log(`  Part ${partNum}: no facebook_video_path in DB, skipping`);
      continue;
    }
    if (!localThumbnailPath) {
      console.log(`  Part ${partNum}: no thumbnail_path in DB, skipping`);
      continue;
    }

    console.log(`\n--- Part ${partNum}/4 ---`);

    const remoteVideoPath = path.join(oracle.destPath, storyId, `part_${partNum}`, 'main_video.mp4');
    const remoteFbVideoPath = path.join(oracle.destPath, storyId, `part_${partNum}`, 'main_video_facebook.mp4');
    const remoteThumbnailPath = path.join(oracle.destPath, storyId, `part_${partNum}`, 'thumbnail.jpg');

    console.log(`  Syncing YouTube video to Oracle...`);
    await scpFile(localVideoPath, remoteVideoPath, oracle.user, oracle.host, oracle.keyPath);

    console.log(`  Syncing Facebook video to Oracle...`);
    await scpFile(localFbVideoPath, remoteFbVideoPath, oracle.user, oracle.host, oracle.keyPath);

    console.log(`  Syncing thumbnail to Oracle...`);
    await scpFile(localThumbnailPath, remoteThumbnailPath, oracle.user, oracle.host, oracle.keyPath);

    // Update Supabase with Oracle paths
    await updatePartStatus(record.id, {
      video_path: remoteVideoPath,
      facebook_video_path: remoteFbVideoPath,
      thumbnail_path: remoteThumbnailPath,
    });

    console.log(`  Part ${partNum} synced`);
    console.log(`    YouTube video: ${remoteVideoPath}`);
    console.log(`    Facebook video: ${remoteFbVideoPath}`);
    console.log(`    Thumbnail: ${remoteThumbnailPath}`);
  }

  console.log('\nSync complete.');
}
