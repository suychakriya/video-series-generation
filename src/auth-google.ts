/**
 * Re-authenticates Google OAuth with YouTube + Drive scopes.
 * Run: npx ts-node src/auth-google.ts
 * Paste the new YOUTUBE_REFRESH_TOKEN into your .env
 */
import * as dotenv from 'dotenv';
dotenv.config();

import * as http from 'http';
import { google } from 'googleapis';

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID!;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET!;
const REDIRECT_URI = 'http://localhost:3000/callback';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/drive.file',
];

async function main() {
  const auth = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

  const authUrl = auth.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // force refresh_token to be returned
  });

  console.log('\nOpen this URL in your browser:\n');
  console.log(authUrl);
  console.log('\nWaiting for callback on http://localhost:3000/callback ...\n');

  await new Promise<void>((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, 'http://localhost:3000');
      const code = url.searchParams.get('code');
      if (!code) return;

      res.end('<h2>Done! You can close this tab.</h2>');
      server.close();

      try {
        const { tokens } = await auth.getToken(code);
        console.log('\n✅ New refresh token:\n');
        console.log(tokens.refresh_token);
        console.log('\nUpdate your .env:');
        console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    server.listen(3000);
  });
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
