# Auto Story Video — Untold Lores

Automated daily story video generator. Generates 4-part story series with AI narration, images, and video rendering, then posts them daily to Facebook and YouTube via GitHub Actions.

---

## Architecture Overview

```
YOUR LOCAL MACHINE
─────────────────────────────────────────────────────
1. npm run story      → Claude API → 4-part story → Supabase DB
2. npm run images     → Kaggle (HuggingFace) → temp/{story_id}/images/
3. npm run audio      → Google Colab (F5-TTS + edge-tts) → temp/{story_id}/audio/
4. npm run render     → Remotion → temp/{story_id}/*.mp4
5. npm run upload     → Google Drive (videos) + Supabase DB (URLs)

GITHUB ACTIONS (daily cron at 9am UTC = 4pm Cambodia)
─────────────────────────────────────────────────────
Read metadata from Supabase → download videos from Google Drive
→ post to Facebook (English + Khmer) + YouTube → delete from Google Drive
```

---

## Project Structure

```
auto-story-video/
├── src/
│   ├── index.ts                — Entry point / command router
│   ├── commands/
│   │   ├── story.ts            — Generate story via Claude API
│   │   ├── translate.ts        — Translate story to Khmer
│   │   ├── images.ts           — Generate images
│   │   ├── audio.ts            — Generate English + Khmer audio
│   │   ├── render.ts           — Render videos via Remotion
│   │   ├── generate.ts         — Run translate + images + audio + render
│   │   ├── sync.ts             — (unused) VPS sync
│   │   └── post.ts             — Post to Facebook + YouTube
│   ├── story.ts                — Claude story generation logic
│   ├── themes.ts               — 5 theme definitions
│   ├── images.ts               — Image generation (HuggingFace API)
│   ├── audio.ts                — Audio generation (F5-TTS / ElevenLabs)
│   ├── f5-tts.ts               — F5-TTS client (Google Colab server)
│   ├── khmer-tts.ts            — Khmer TTS client (edge-tts via Colab server)
│   ├── video/
│   │   ├── render.ts           — Remotion rendering orchestrator
│   │   ├── Root.tsx            — Remotion root
│   │   ├── MainVideo.tsx       — 1920×1080 YouTube composition
│   │   ├── FacebookVideo.tsx   — 1080×1350 Facebook composition
│   │   ├── Thumbnail.tsx       — 1280×720 thumbnail
│   │   └── style.css           — Video styles
│   ├── database.ts             — Supabase CRUD (routes to local-database.ts when LOCAL_MODE=true)
│   ├── local-database.ts       — Local JSON database (temp/stories/)
│   ├── storage.ts              — Google Drive upload/download/delete
│   ├── facebook.ts             — Facebook Graph API video posting
│   ├── youtube.ts              — YouTube Data API v3 video posting
│   ├── upload-to-supabase.ts   — Upload videos to Drive + sync to Supabase DB
│   └── auth-google.ts          — Re-authenticate Google OAuth (YouTube + Drive scopes)
├── colab_tts_server.ipynb      — Combined TTS server (F5-TTS + Khmer) on Google Colab
├── colab_server.ipynb          — Image/animation server (FLUX + SVD) on Google Colab
├── .github/workflows/
│   ├── post.yml                — Daily post cron (9am UTC)
│   └── generate.yml            — Manual story generation
├── .env.example
├── tsconfig.json
├── package.json
└── README.md
```

---

## Prerequisites

- Node.js 18+
- ffmpeg (`brew install ffmpeg`)
- All API keys in `.env`

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill environment variables
cp .env.example .env

# 3. Authenticate Google (YouTube + Drive) — run once
npx ts-node src/auth-google.ts

# 4. Generate story (saves to Supabase DB)
npm run story

# 5. Start Colab TTS server (see section below), set ngrok URL in .env

# 6. Generate images, audio, render
npm run images
npm run audio
npm run render

# 7. Upload to Google Drive + sync to Supabase
npm run upload

# GitHub Actions posts automatically at 9am UTC each day
```

---

## Commands

All commands accept `--story <story_id>` and `--part 1|2|3|4` flags.

### Story & Generation

```bash
npm run story                                    # Generate new 4-part story via Claude

npm run translate                                # Translate story to Khmer
npm run translate -- --part 1

npm run images                                   # Generate scene images (all parts)
npm run images -- --part 2
npm run images -- --story story_20260416_342

npm run audio                                    # Generate English + Khmer audio (all parts)
npm run audio -- --part 2
npm run audio -- --story story_20260416_342

npm run render                                   # Render videos with Remotion (all parts)
npm run render -- --part 2
npm run render -- --story story_20260416_342

npm run generate                                 # Run translate + images + audio + render
npm run generate -- --part 1
npm run generate -- --story story_20260416_342
```

### Upload & Post

```bash
npm run upload                                   # Upload all parts to Google Drive + Supabase
npm run upload -- --part 3
npm run upload -- --story story_20260416_342

npm run post                                     # Post today's story (normally GitHub Actions)
npm run post -- --facebook-only
npm run post -- --youtube-only
```

### Utilities

```bash
npx ts-node src/auth-google.ts                  # Re-authenticate Google OAuth
```

---

## Google Colab — TTS Server (`colab_tts_server.ipynb`)

Run every session **before** `npm run audio`:

1. Runtime → Change runtime type → **T4 GPU**
2. **Cell 1** — install dependencies
3. **Cell 2** — load F5-TTS model (~2 min first run, cached after)
4. **Cell 3** — upload reference audio + pre-transcribe (~10 sec)
5. **Cell 4** — start combined Flask server
6. **Cell 5** — expose with ngrok, copy URL to `.env`
7. **Cell 6** — keep-alive (leave running while generating audio)

Routes served on a single ngrok URL:
- `POST /tts` — Khmer TTS (edge-tts, `km-KH-PisethNeural`)
- `POST /f5tts` — English voice cloning (F5-TTS)

---

## LOCAL_MODE

Set `LOCAL_MODE=true` in `.env` to store story data locally instead of Supabase:

| `LOCAL_MODE` | Database | Storage upload |
|---|---|---|
| `false` | Supabase | Google Drive |
| `true` | `temp/stories/{story_id}.json` | Skipped (files stay local) |

`npm run upload` always uses real Supabase + Drive regardless of `LOCAL_MODE`.

---

## Step Conditions

| Command | Requires |
|---------|----------|
| `story` | nothing |
| `translate` | story in db |
| `images` | story in db |
| `audio` | story in db + Colab TTS server running |
| `render` | `images_status=done` + `audio_status=done` |
| `upload` | rendered videos in `temp/` |
| `post` | video URLs in Supabase DB |

---

## Status Tracking

Each story part tracks progress in Supabase:

| Column | Values |
|--------|--------|
| `images_status` | `pending` \| `done` |
| `audio_status` | `pending` \| `done` |
| `video_status` | `pending` \| `done` |
| `video_url` | Google Drive URL (YouTube video) |
| `facebook_video_url` | Google Drive URL (Facebook video) |
| `khmer_facebook_video_url` | Google Drive URL (Khmer Facebook video) |
| `thumbnail_url` | Google Drive URL |
| `posted` | `false` \| `true` |
| `post_date` | date to post (set automatically, starting tomorrow) |

---

## Local File Structure

```
temp/
  stories/
    {story_id}.json              — story parts (all 4) with metadata
  db.json                        — theme index + YouTube playlists
  {story_id}/
    part_{n}/
      images/
        scene_1_1.jpg
        hook_image.jpg
      scene_audios/
        intro.mp3
        scene_1.mp3
        ...
        hook.mp3
        outro.mp3
      khmer_audios/
        intro.mp3
        scene_1.mp3
        ...
        hook.mp3
        outro.mp3
      narration.mp3
      narration_khmer.mp3
      timings.json
      timings_khmer.json
      main_video.mp4
      main_video_facebook.mp4
      main_video_facebook_khmer.mp4
      thumbnail.jpg
```

---

## Environment Variables

```env
# Anthropic Claude API
ANTHROPIC_API_KEY=

# Image generation
HUGGINGFACE_API_TOKEN=
LOCAL_MODEL_URL=              # ngrok URL from Kaggle image server (optional)

# TTS — set TTS_PROVIDER=f5tts to use Colab, otherwise falls back to ElevenLabs
TTS_PROVIDER=f5tts
F5TTS_NGROK_URL=              # ngrok URL from colab_tts_server.ipynb
KHMER_TTS_NGROK_URL=          # same URL as F5TTS_NGROK_URL

# ElevenLabs (fallback if TTS_PROVIDER is not f5tts)
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Database
SUPABASE_URL=
SUPABASE_ANON_KEY=

# Facebook
FACEBOOK_PAGE_ID=
FACEBOOK_PAGE_ACCESS_TOKEN=

# YouTube + Google Drive (shared OAuth credentials)
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=
YOUTUBE_REFRESH_TOKEN=
YOUTUBE_CHANNEL_ID=
GOOGLE_DRIVE_FOLDER_ID=

# Control
LOCAL_MODE=true
TEST_MODE=false
```

---

## GitHub Actions Setup

Add these as repository secrets (**Settings → Secrets → Actions**):

```
SUPABASE_URL
SUPABASE_ANON_KEY
FACEBOOK_PAGE_ID
FACEBOOK_PAGE_ACCESS_TOKEN
YOUTUBE_CLIENT_ID
YOUTUBE_CLIENT_SECRET
YOUTUBE_REFRESH_TOKEN
YOUTUBE_CHANNEL_ID
GOOGLE_DRIVE_FOLDER_ID
TEST_MODE
```

The `post.yml` workflow runs daily at 9am UTC (4pm Cambodia). To trigger manually: **Actions → Daily Post Facebook + YouTube + Shorts → Run workflow**.

---

## Supabase Setup

### 1. Create tables (SQL Editor)

```sql
create table stories (
  id uuid default gen_random_uuid() primary key,
  story_id text not null,
  part integer not null,
  theme text not null,
  title text not null,
  content text not null,
  hook text not null,
  thumbnail_title text,
  character_description text not null,
  style_prompt text not null,
  scenes jsonb,
  image_seed integer not null,
  dramatic_image_url text,
  audio_url text,
  video_url text,
  facebook_video_url text,
  khmer_facebook_video_url text,
  thumbnail_url text,
  facebook_caption text not null,
  youtube_title text not null,
  youtube_description text not null,
  youtube_tags text not null,
  facebook_post_id text,
  facebook_post_url text,
  youtube_video_id text,
  youtube_video_url text,
  youtube_playlist_id text,
  khmer_title text,
  khmer_hook text,
  khmer_facebook_caption text,
  khmer_facebook_post_id text,
  khmer_facebook_post_url text,
  comment_posted boolean default false,
  posted boolean default false,
  post_date date,
  images_status text default 'pending',
  audio_status text default 'pending',
  video_status text default 'pending',
  video_path text,
  facebook_video_path text,
  khmer_facebook_video_path text,
  thumbnail_path text,
  created_at timestamptz default now(),
  unique (story_id, part)
);

create table youtube_playlists (
  id uuid default gen_random_uuid() primary key,
  story_id text not null unique,
  story_title text not null,
  theme text not null,
  playlist_id text not null,
  created_at timestamptz default now()
);

create table theme_tracker (
  id uuid default gen_random_uuid() primary key,
  current_theme_index integer default 0,
  last_updated timestamptz default now()
);

create table run_stats (
  id uuid default gen_random_uuid() primary key,
  run_type text not null,
  story_id text not null,
  theme text not null,
  story_title text not null,
  parts_completed integer,
  total_images integer,
  render_time_minutes float,
  facebook_status text,
  youtube_status text,
  error_message text,
  created_at timestamptz default now()
);

-- RLS policies
alter table stories enable row level security;
alter table youtube_playlists enable row level security;
alter table theme_tracker enable row level security;
alter table run_stats enable row level security;

create policy "service access" on stories for all using (true) with check (true);
create policy "service access" on youtube_playlists for all using (true) with check (true);
create policy "service access" on theme_tracker for all using (true) with check (true);
create policy "service access" on run_stats for all using (true) with check (true);

insert into theme_tracker (current_theme_index) values (0);
```

### 2. Google Drive OAuth (one-time)

```bash
npx ts-node src/auth-google.ts
```

Open the printed URL, sign in, approve. Copy the refresh token into `.env` as `YOUTUBE_REFRESH_TOKEN`.

Make sure your Google Cloud project has both **YouTube Data API v3** and **Google Drive API** enabled.
