# Auto Story Video — Untold Lores

Fully automated daily story video generator. Generates 4-part story series with AI narration, images, subtitles, and video rendering, then posts them daily to Facebook and YouTube (including YouTube Shorts).

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    GENERATION PIPELINE                          │
│                  (runs every 4 days via cron)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. THEME SELECTOR ──► Supabase theme_tracker table            │
│         │                                                       │
│         ▼                                                       │
│  2. STORY GENERATOR ──► Claude claude-sonnet-4-20250514        │
│         │               4 parts × 800-1000 words               │
│         │               4 scenes per part                      │
│         ▼                                                       │
│  3. IMAGE FETCHER ──► Pexels API (primary)                     │
│         │             HuggingFace SDXL (fallback)              │
│         │             20-25 images per part                    │
│         ▼                                                       │
│  4. AUDIO GENERATOR ──► ElevenLabs TTS (primary)              │
│         │                HuggingFace MMS-TTS (fallback)        │
│         │                Main narration + Short hook audio     │
│         ▼                                                       │
│  5. SUBTITLE GENERATOR ──► SRT file, word-timed                │
│         │                                                       │
│         ▼                                                       │
│  6. VIDEO RENDERER ──► Remotion                                │
│         │              MainVideo 1920×1080 (Ken Burns)         │
│         │              Short 1080×1920 (vertical)              │
│         │              Thumbnail 1280×720 (still image)        │
│         ▼                                                       │
│  7. CLOUD UPLOADER ──► Cloudinary                             │
│         │              Videos, thumbnails, audio, subtitles    │
│         ▼                                                       │
│  8. DATABASE ──► Supabase                                      │
│                  stories, theme_tracker, playlists, run_stats  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     POST PIPELINE                               │
│                  (runs daily at 9am UTC via cron)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. FETCH TODAY'S STORY ──► Supabase (post_date = today)       │
│         │                                                       │
│         ▼                                                       │
│  2. PARALLEL POSTING                                           │
│      ┌──────────────────┐  ┌──────────────────────────────┐   │
│      │   FACEBOOK       │  │         YOUTUBE              │   │
│      │                  │  │                              │   │
│      │  Upload video    │  │  Create/get playlist         │   │
│      │  (chunked API)   │  │  Upload main video           │   │
│      │  Set thumbnail   │  │  Set custom thumbnail        │   │
│      │  Post caption    │  │  Upload SRT subtitles        │   │
│      │  Pin prev parts  │  │  Add to playlist             │   │
│      │  comment         │  │  Upload Short                │   │
│      └──────────────────┘  │  Update descriptions         │   │
│                             └──────────────────────────────┘   │
│         ▼                                                       │
│  3. CLEANUP ──► Delete video files from Cloudinary             │
│         │       (keep thumbnails, audio, subtitles)            │
│         ▼                                                       │
│  4. STATS ──► Supabase run_stats table                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Project Structure

```
auto-story-video/
├── src/
│   ├── index.ts          — Main entry point, orchestrates both pipelines
│   ├── story.ts          — Claude AI story generation
│   ├── themes.ts         — 5 theme definitions with all visual/audio config
│   ├── images.ts         — Pexels + HuggingFace image fetching
│   ├── audio.ts          — ElevenLabs + HuggingFace TTS audio generation
│   ├── subtitles.ts      — SRT subtitle file generation
│   ├── video/
│   │   ├── render.ts     — Remotion rendering orchestrator
│   │   ├── MainVideo.tsx — 16:9 landscape video composition
│   │   ├── Short.tsx     — 9:16 vertical Shorts composition
│   │   └── Thumbnail.tsx — 1280×720 thumbnail still
│   ├── storage.ts        — Cloudinary upload/download/cleanup
│   ├── database.ts       — Supabase CRUD operations
│   ├── facebook.ts       — Facebook Graph API video posting
│   └── youtube.ts        — YouTube Data API v3 video posting
├── .github/
│   └── workflows/
│       ├── generate.yml  — Runs generation every 4 days at 2am UTC
│       └── post.yml      — Runs posting daily at 9am UTC
├── .env.example          — All required environment variables
├── tsconfig.json
├── package.json
└── README.md
```

---

## Prerequisites

- Node.js 18+
- npm
- All API keys listed in `.env.example`

---

## Quick Start

```bash
# 1. Clone and install
cd auto-story-video
npm install

# 2. Copy and fill environment variables
cp .env.example .env
# Edit .env with all your API keys

# 3. Run generation pipeline (creates 4 story parts)
npm run generate

# 4. Run post pipeline (posts today's scheduled part)
npm run post
```

---

## Full Pipeline Description

### Generate Mode (`npm run generate`)

The generation pipeline runs once and creates all 4 parts of a complete story, scheduling them for daily posting.

**Steps:**

1. **Theme Selection** — Reads `current_theme_index` from Supabase `theme_tracker` table. Cycles through 5 themes in order: Horror, Drama, Mystery, Motivation, Fantasy.

2. **Story Generation** — Sends a structured prompt to Claude `claude-sonnet-4-20250514` requesting a 4-part story with:
   - 800-1000 words per part
   - 4 scenes per part with visual keywords
   - Dramatic cliffhanger hook per part
   - Thumbnail title (3-5 words, clickbait)
   - Facebook caption (150-200 words with hashtags)
   - YouTube title (SEO optimized, 60 chars max)

3. **Image Fetching** — For each scene's keywords, fetches 5 images from Pexels API. Falls back to HuggingFace SDXL if Pexels fails. Results in 20-25 images per part (80-100 images total for full story).

4. **Audio Generation** — Generates MP3 narration via ElevenLabs with branded intro/outro. Generates a short hook audio clip (~30-40 seconds). Falls back to HuggingFace MMS-TTS if ElevenLabs fails.

5. **Subtitle Generation** — Creates SRT files from story content, word-timed at 140 WPM, 8 words per subtitle line, with 5-second offset for branded intro.

6. **Video Rendering** — Uses Remotion (headless Chrome) to render:
   - `MainVideo`: 1920×1080, Ken Burns effect on images, scrolling text, pulsing hook at end, CTA card
   - `Short`: 1080×1920, vertical format, image slideshow top 60%, hook text middle 20%, branding bottom 20%, particle effects
   - `Thumbnail`: 1280×720 still, dramatic image left, title text right, theme badge

7. **Cloud Storage** — Uploads all assets (video, short, thumbnail, audio, subtitles) to Cloudinary under `stories/{story_id}/part_{n}/`.

8. **Database** — Saves all metadata and asset URLs to Supabase `stories` table with scheduled `post_date`.

9. **Theme Rotation** — Increments `current_theme_index` in `theme_tracker` for the next run.

### Post Mode (`npm run post`)

Runs daily and posts one story part to both platforms in parallel.

**Steps:**

1. Queries Supabase for today's story (`post_date = today AND posted = false`).
2. Posts to Facebook and YouTube concurrently using `Promise.allSettled`.
3. Facebook: chunked video upload via Graph API, sets thumbnail, posts caption, optionally pins a "previous parts" comment.
4. YouTube: creates/gets playlist, uploads video with full metadata, sets thumbnail, uploads SRT captions, uploads Short, updates all previous parts' descriptions with full series links.
5. Marks story as `posted = true` in Supabase.
6. Deletes video files from Cloudinary to save storage (keeps thumbnail, audio, subtitles).
7. Records run stats.

---

## API Setup Guides

### 1. Anthropic (Claude)

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an account and add billing
3. Go to API Keys → Create Key
4. Copy the key to `ANTHROPIC_API_KEY`

**Estimated cost:** ~$0.50-2.00 per full story generation (8,000 tokens output)

---

### 2. Pexels

1. Go to [pexels.com/api](https://www.pexels.com/api/)
2. Create a free account
3. Go to your profile → API
4. Copy the API key to `PEXELS_API_KEY`

**Free tier:** 200 requests/hour, 20,000 requests/month. Sufficient for this project.

---

### 3. HuggingFace (fallback for images and TTS)

1. Go to [huggingface.co](https://huggingface.co)
2. Create an account
3. Go to Settings → Access Tokens
4. Create a new token with `read` scope
5. Copy to `HUGGINGFACE_API_TOKEN`

**Free tier:** Rate limited but functional as fallback.

---

### 4. ElevenLabs

1. Go to [elevenlabs.io](https://elevenlabs.io)
2. Create an account
3. Go to Profile → API Keys
4. Copy the API key to `ELEVENLABS_API_KEY`
5. Go to Voices, choose a voice, copy the Voice ID to `ELEVENLABS_VOICE_ID`
   - Default: `EXAVITQu4vr4xnSDxMaL` (Rachel — calm, authoritative)
   - Recommended voices: Rachel, Adam, Antoni, Josh

**Estimated cost:** ~$0.30-0.50 per part (Starter plan: $5/month for 30,000 chars)

---

### 5. Cloudinary

1. Go to [cloudinary.com](https://cloudinary.com)
2. Create a free account
3. Go to Dashboard
4. Copy `Cloud Name`, `API Key`, `API Secret`
5. Set these in `.env`:
   ```
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=123456789
   CLOUDINARY_API_SECRET=your-secret
   ```

**Free tier:** 25GB storage, 25GB bandwidth/month. Videos are deleted after posting.

---

### 6. Supabase

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → API
4. Copy `Project URL` → `SUPABASE_URL`
5. Copy `anon/public` key → `SUPABASE_ANON_KEY`
6. Run the SQL schema below in the SQL Editor

**Free tier:** 500MB database, sufficient for this project.

---

### 7. Facebook Page API

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new App (type: Business)
3. Add the "Pages" product
4. Get your **Page Access Token** (long-lived, 60 days):
   - Use Graph API Explorer
   - Select your app
   - Generate token with permissions: `pages_manage_posts`, `pages_read_engagement`, `publish_video`
   - Exchange for long-lived token via:
     ```
     GET /oauth/access_token?grant_type=fb_exchange_token
         &client_id={app_id}
         &client_secret={app_secret}
         &fb_exchange_token={short_lived_token}
     ```
5. Get your **Page ID**: Visit `https://graph.facebook.com/me?access_token={your_token}`
6. Set in `.env`:
   ```
   FACEBOOK_PAGE_ID=your_page_id
   FACEBOOK_PAGE_ACCESS_TOKEN=your_long_lived_token
   ```

**Important:** Page Access Tokens expire every 60 days. You need to refresh them or use a system user token for production.

---

### 8. YouTube Data API v3 + OAuth2

YouTube requires OAuth2 for video uploads (API keys alone are not sufficient).

#### Step 1: Create OAuth2 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or use existing)
3. Enable **YouTube Data API v3** (APIs & Services → Enable APIs)
4. Go to APIs & Services → Credentials
5. Click "Create Credentials" → "OAuth 2.0 Client ID"
6. Application type: **Desktop app**
7. Note your `Client ID` and `Client Secret`

#### Step 2: Get Your Refresh Token

Run this one-time script to get the refresh token:

```javascript
// save as get-token.js and run with node get-token.js
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const scopes = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent',
});

console.log('Open this URL in your browser:');
console.log(authUrl);
console.log('');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter the authorization code: ', async (code) => {
  rl.close();
  const { tokens } = await oauth2Client.getToken(code);
  console.log('\nYour refresh token:');
  console.log(tokens.refresh_token);
});
```

#### Step 3: Get Your Channel ID

1. Go to YouTube Studio
2. Click your profile → Settings → Advanced Settings
3. Copy the Channel ID (starts with `UC...`)

#### Step 4: Set Environment Variables

```
YOUTUBE_CLIENT_ID=your_client_id
YOUTUBE_CLIENT_SECRET=your_client_secret
YOUTUBE_REFRESH_TOKEN=your_refresh_token
YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxx
```

**Note:** Refresh tokens do not expire unless revoked. Store them securely.

---

## Supabase Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
-- stories table
CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id text NOT NULL,
  part integer NOT NULL,
  theme text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  hook text NOT NULL,
  thumbnail_title text,
  character_description text,
  style_prompt text,
  base_image_url text,
  image_seed integer,
  audio_url text,
  short_audio_url text,
  video_url text,
  short_url text,
  thumbnail_url text,
  subtitle_url text,
  dramatic_image_url text,
  facebook_caption text,
  youtube_title text,
  youtube_description text,
  youtube_tags text,
  facebook_post_id text,
  facebook_post_url text,
  youtube_video_id text,
  youtube_video_url text,
  youtube_short_id text,
  youtube_short_url text,
  youtube_playlist_id text,
  comment_posted boolean DEFAULT false,
  posted boolean DEFAULT false,
  post_date date,
  created_at timestamp DEFAULT now()
);

-- theme_tracker table
CREATE TABLE theme_tracker (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  current_theme_index integer DEFAULT 0,
  last_updated timestamp DEFAULT now()
);

-- Insert initial row
INSERT INTO theme_tracker (current_theme_index) VALUES (0);

-- youtube_playlists table
CREATE TABLE youtube_playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id text NOT NULL,
  story_title text,
  theme text,
  playlist_id text NOT NULL,
  created_at timestamp DEFAULT now()
);

-- run_stats table
CREATE TABLE run_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type text NOT NULL,
  story_id text,
  theme text,
  story_title text,
  parts_completed integer,
  total_images integer,
  render_time_minutes float,
  facebook_status text,
  youtube_status text,
  youtube_short_status text,
  error_message text,
  created_at timestamp DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_stories_post_date ON stories(post_date);
CREATE INDEX idx_stories_story_id ON stories(story_id);
CREATE INDEX idx_stories_posted ON stories(posted);
CREATE INDEX idx_run_stats_created ON run_stats(created_at);
```

---

## Thumbnail System

Thumbnails are rendered as 1280×720 JPEG stills using Remotion's `renderStill()` function.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ ⚜️ UNTOLD LORES                          Part 1 of 4        │  ← TOP STRIP (dark)
├────────────────────────┬─────────────────────────────────────┤
│                        │                                     │
│   DRAMATIC             │   THUMBNAIL TITLE                   │
│   IMAGE                │   IN LARGE                          │
│   (left 50%)           │   BOLD TEXT                         │
│                        │   (right 52%)                       │
│   [fades to right]     │                                     │
│                        │                                     │
├────────────────────────┴─────────────────────────────────────┤
│ [THEME BADGE]                                                │  ← BOTTOM STRIP (dark)
└──────────────────────────────────────────────────────────────┘
```

### Dramatic Image Selection

The "dramatic image" used for the thumbnail is the **first image from the last scene** of each part. This is typically the most climactic moment visually (cliffhanger scene).

### Title Rules

- `thumbnail_title` is generated by Claude with strict rules:
  - 3-5 words maximum
  - No punctuation
  - Clickbait style
  - Examples: "She Knew Too Much", "He Was Already Dead", "Nobody Believed Her"
- Rendered in ALL CAPS with gold outline

---

## YouTube Shorts System

### What Makes a Short

YouTube Shorts are videos that are:
- Vertical (9:16 aspect ratio, 1080×1920)
- Under 60 seconds (ideally 15-45 seconds)
- Titled with `#Shorts` in the title or description

### How This System Creates Shorts

Each part produces one Short featuring:
1. The cliffhanger hook audio (~30-40 seconds)
2. The last 5-8 images from the part (the climactic scene)
3. Animated hook text that reveals word-by-word
4. Branding panel at the bottom
5. Particle effects matching the theme

### Short Video Structure (1080×1920)

```
┌────────────────────┐
│                    │
│   IMAGES (60%)     │  ← Slideshow of cliffhanger scene images
│   Ken Burns        │     with theme color tint
│   zoom effect      │
│                    │
│ ░░░░░░░░░░░░░░░░░ │  ← gradient fade
├────────────────────┤
│                    │
│   HOOK TEXT (20%)  │  ← Words appear one by one
│   white bold font  │     dramatic pacing
│                    │
├────────────────────┤
│  ⚜️ UNTOLD LORES  │
│                    │  ← Branding (20%)
│  Follow for Full   │
│  Story 👆          │
└────────────────────┘
```

### YouTube Short Classification

YouTube automatically classifies videos as Shorts when:
1. The video is vertical (1080×1920)
2. Duration is 60 seconds or less
3. The title contains `#Shorts`

The system adds `#Shorts` to the Short's title automatically.

---

## Theme Rotation System

The system rotates through 5 themes cyclically. The current position is tracked in the `theme_tracker` Supabase table.

### Theme Cycle

```
Run 1: Horror & Thriller       (index 0)
Run 2: Drama & Betrayal        (index 1)
Run 3: True Crime Mystery      (index 2)
Run 4: Motivational Underdog   (index 3)
Run 5: Dark Fantasy Adventure  (index 4)
Run 6: Horror & Thriller       (index 0) ← cycles back
...
```

Each run generates 4 parts for one story in that theme. With the default cron (every 4 days), you get:
- 4 posts per story cycle
- One story type per cycle
- 5 different stories per 20 days

### Manual Theme Override

To force a specific theme for the next run, update the tracker in Supabase:

```sql
UPDATE theme_tracker SET current_theme_index = 2; -- forces True Crime Mystery
```

---

## Adding New Themes

To add a new theme, edit `src/themes.ts` and add a new object to the `THEMES` array:

```typescript
{
  id: 'your_theme_id',          // unique snake_case identifier
  name: 'Your Theme Name',       // display name
  stylePrompt: '...',            // detailed visual style for image generation
  voiceTone: '...',              // narration style guidance for Claude
  facebookHashtags: '#tag1 #tag2 ...',
  youtubeTags: 'tag1, tag2, ...',
  cliffhangerStyle: '...',       // instruction for how to end each part
  thumbnailMood: '...',          // visual mood description
  shortHookStyle: '...',         // pacing/style for Short audio
  videoMood: '...',              // overall video atmosphere
  colorTint: 'rgba(r,g,b,a)',   // CSS color overlay on videos (keep alpha low, 0.10-0.20)
  themeColor: '#rrggbb',         // background/accent color (usually very dark)
  particleEffect: 'dust',        // one of: dust, petals, smoke, gold, sparkles
  leadIn: '...',                 // opening phrase for Short audio
  exampleOpenings: [             // 3 example story openers for Claude inspiration
    'Example 1...',
    'Example 2...',
    'Example 3...',
  ],
  themeLabel: 'LABEL',           // short label for thumbnail badge (all caps)
  themeEmoji: '🎯',              // emoji for thumbnail badge
}
```

Also update `incrementThemeIndex()` in `src/database.ts` to use the new total count:

```typescript
const next = (current + 1) % 6; // Change 5 to your new total theme count
```

---

## GitHub Actions Automation

### Workflow: `generate.yml`

- **Trigger:** Every 4 days at 2:00 AM UTC (`0 2 */4 * *`)
- **Manual trigger:** `workflow_dispatch`
- **Timeout:** 180 minutes (video rendering is CPU intensive)
- **What it does:** Runs the full generation pipeline

### Workflow: `post.yml`

- **Trigger:** Every day at 9:00 AM UTC (`0 9 * * *`)
- **Manual trigger:** `workflow_dispatch`
- **Timeout:** 30 minutes
- **What it does:** Posts today's scheduled story part

### Setting Up GitHub Secrets

Go to your repository → Settings → Secrets and Variables → Actions → New repository secret.

Add all keys from `.env.example` as repository secrets.

### Adjusting Post Schedule

To change the posting time, modify the cron in `post.yml`:

```yaml
# Examples:
cron: '0 9 * * *'   # 9am UTC every day
cron: '0 12 * * *'  # noon UTC every day
cron: '0 17 * * *'  # 5pm UTC every day
```

**Tip:** Post at the optimal time for your audience's timezone:
- US East: `0 14 * * *` (9am EST = 2pm UTC)
- UK/Europe: `0 9 * * *` (9am UTC)
- Asia Pacific: `0 1 * * *` (9am SGT = 1am UTC)

---

## Video Quality Settings

### Main Video (1920×1080)

- Codec: H.264
- FPS: 30
- Resolution: Full HD 1920×1080
- Duration: Matches audio duration + 3 seconds
- Ken Burns effect: 8 seconds per image, 8% scale zoom

### Short (1080×1920)

- Codec: H.264
- FPS: 30
- Resolution: 1080×1920 (9:16 vertical)
- Duration: Matches hook audio + 2 seconds
- Images: 3 seconds per image

### Thumbnail (1280×720)

- Format: JPEG
- Quality: 85%
- Resolution: 1280×720 (YouTube standard thumbnail size)

---

## Branding Elements

All videos include:

- **Watermark:** "⚜️ UNTOLD LORES" — top left, gold text on dark background
- **Part Badge:** "Part X of 4" — top right, gold background
- **AI Disclosure:** "⚠️ AI-Generated Content | Untold Lores" — appears for first 4 seconds (required for AI content transparency)
- **Hook:** Pulsing gold text near end of video
- **CTA Card:** Final 5 seconds showing channel name and subscribe prompt

---

## Troubleshooting Guide

### Generation Issues

**Problem:** `JSON parse failed` during story generation
**Cause:** Claude returned malformed JSON
**Fix:** The system automatically retries with a correction prompt. If it still fails, check your `ANTHROPIC_API_KEY` and quota.

**Problem:** `Pexels API error: 429`
**Cause:** Rate limit hit (200 req/hour)
**Fix:** The system falls back to HuggingFace automatically. Consider spreading requests with delays.

**Problem:** `ElevenLabs error 422`
**Cause:** Text too long (>5000 characters for some plans)
**Fix:** Ensure your ElevenLabs plan supports long-form audio, or upgrade to Creator plan.

**Problem:** Remotion render fails with Chrome error
**Cause:** Chromium not installed
**Fix:** Run `npx remotion browser ensure` before rendering.

**Problem:** `Cannot find module 'remotion'`
**Cause:** Dependencies not installed
**Fix:** Run `npm install`

### Posting Issues

**Problem:** `Facebook upload init failed: {"error":{"code":10,"message":"Application does not have permission"}}`
**Cause:** Missing Facebook permissions
**Fix:** Re-generate your Page Access Token with `publish_video`, `pages_manage_posts` permissions.

**Problem:** `Facebook upload init failed: {"error":{"code":190,"message":"Error validating access token: Session has expired"}}`
**Cause:** Access token expired (60-day limit)
**Fix:** Generate a new long-lived token. Consider using a System User token for permanent access.

**Problem:** YouTube `quotaExceeded` error
**Cause:** YouTube API daily quota (10,000 units) exceeded
**Fix:** Video uploads cost 1,600 quota units each. You can upload ~6 videos per day on the free quota. Request a quota increase in Google Cloud Console.

**Problem:** YouTube thumbnail not set
**Cause:** Channel not verified for custom thumbnails
**Fix:** Verify your YouTube channel (phone verification required for custom thumbnails).

**Problem:** `No story scheduled for today`
**Cause:** Generation hasn't run yet, or dates don't match
**Fix:** Check Supabase `stories` table for upcoming `post_date` values. Run generation with `npm run generate`.

### Database Issues

**Problem:** `DB insert error: duplicate key value`
**Cause:** Story was partially generated and re-run
**Fix:** Delete the partial record from Supabase stories table and re-run.

**Problem:** `DB insert error: null value in column`
**Cause:** Required field missing
**Fix:** Check that all required fields are being passed to `saveStoryPart()`.

### Cloudinary Issues

**Problem:** `Upload failed: File size too large`
**Cause:** Video file exceeds Cloudinary's limit (100MB free, 3GB paid)
**Fix:** Check rendered video file size. For very long stories (45+ min), consider upgrading Cloudinary or using a different storage backend.

---

## Testing Without Posting

Set `TEST_MODE=true` in your `.env` file to run the post pipeline without actually posting:

```bash
TEST_MODE=true npm run post
```

This will:
- Fetch today's story from Supabase
- Log what would be posted
- Skip all API calls to Facebook and YouTube

---

## Monthly Cost Estimate

Assuming 7-8 story cycles per month (28-32 parts):

| Service | Usage | Estimated Cost |
|---------|-------|---------------|
| Anthropic Claude | ~30 generations × ~6K tokens | $3-8/month |
| ElevenLabs | ~30 parts × 2 audios × ~2K chars | $5-10/month (Starter plan) |
| Pexels | Free (25 images × 30 parts = 750 req) | $0 |
| HuggingFace | Free tier (fallback only) | $0 |
| Cloudinary | Free tier (videos deleted after posting) | $0-5/month |
| Supabase | Free tier (well within limits) | $0 |
| GitHub Actions | ~2 hours/month total | $0 (free tier) |
| Google Cloud | YouTube API quota (free) | $0 |
| Facebook | Graph API (free) | $0 |

**Total estimated cost: $8-23/month**

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for story generation |
| `PEXELS_API_KEY` | Yes | Pexels API for images |
| `HUGGINGFACE_API_TOKEN` | Yes | HuggingFace for image/audio fallback |
| `ELEVENLABS_API_KEY` | Yes | ElevenLabs text-to-speech |
| `ELEVENLABS_VOICE_ID` | No | Default: EXAVITQu4vr4xnSDxMaL (Rachel) |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `FACEBOOK_PAGE_ID` | Yes (post) | Facebook Page numeric ID |
| `FACEBOOK_PAGE_ACCESS_TOKEN` | Yes (post) | Facebook long-lived page access token |
| `YOUTUBE_CLIENT_ID` | Yes (post) | Google OAuth2 client ID |
| `YOUTUBE_CLIENT_SECRET` | Yes (post) | Google OAuth2 client secret |
| `YOUTUBE_REFRESH_TOKEN` | Yes (post) | YouTube OAuth2 refresh token |
| `YOUTUBE_CHANNEL_ID` | Yes (post) | YouTube channel ID (UC...) |
| `TEST_MODE` | No | Set to `true` to skip actual posting |

---

## Data Flow Diagram

```
Claude API
    │
    │ (JSON: story, scenes, hooks, captions)
    ▼
Supabase stories table ◄──────────────────────────────────────┐
    │                                                          │
    │ scenes[].keywords                                        │
    ▼                                                          │
Pexels / HuggingFace                                          │
    │                                                          │
    │ local image files (temp/)                               │
    ▼                                                          │
ElevenLabs / HuggingFace TTS                                  │
    │                                                          │
    │ MP3 audio files (temp/)                                 │
    ▼                                                          │
SRT Generator                                                  │
    │                                                          │
    │ .srt subtitle files (temp/)                             │
    ▼                                                          │
Remotion Renderer                                             │
    │                                                          │
    │ MP4 video files (temp/)                                 │
    │ JPEG thumbnails (temp/)                                 │
    ▼                                                          │
Cloudinary                                                     │
    │                                                          │
    │ CDN URLs                                                 │
    └──────────────────────────────────────────────────────────┘
                     (URLs saved back to Supabase)

[Post Day]
Supabase (post_date = today)
    │
    ├──► Facebook Graph API ──► Post URL saved to Supabase
    │
    └──► YouTube Data API v3
              ├──► Video ID + URL saved to Supabase
              ├──► Short ID + URL saved to Supabase
              └──► Playlist ID saved to Supabase
```

---

## Story ID Format

Story IDs are generated as: `story_YYYYMMDD_XXX`

Example: `story_20260318_042`

This ensures chronological sorting and uniqueness.

---

## Monitoring and Observability

Check the `run_stats` table in Supabase to monitor pipeline health:

```sql
-- Last 10 runs
SELECT run_type, story_title, parts_completed, render_time_minutes,
       facebook_status, youtube_status, error_message, created_at
FROM run_stats
ORDER BY created_at DESC
LIMIT 10;

-- Failed runs
SELECT * FROM run_stats
WHERE error_message IS NOT NULL
ORDER BY created_at DESC;

-- Average render time
SELECT AVG(render_time_minutes) as avg_minutes
FROM run_stats
WHERE run_type = 'generate' AND parts_completed = 4;
```

---

## License

MIT License. Use freely for your own automated content channels.

---

## Credits

Built with:
- [Claude API](https://anthropic.com) — Story generation
- [Remotion](https://remotion.dev) — Programmatic video rendering
- [ElevenLabs](https://elevenlabs.io) — AI voice narration
- [Pexels](https://pexels.com) — Stock images
- [Supabase](https://supabase.com) — Database and storage tracking
- [Cloudinary](https://cloudinary.com) — Asset storage and CDN
