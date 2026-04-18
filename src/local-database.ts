/**
 * Local JSON-based database — used when LOCAL_MODE=true in .env
 *
 * Structure:
 *   temp/db.json                        — theme index + playlists (small, global)
 *   temp/stories/{story_id}.json        — one file per story (all 4 parts)
 */
import * as fs from 'fs';
import * as path from 'path';
import type { StoryRecord } from './database';

const DB_PATH = path.join(process.cwd(), 'temp', 'db.json');
const STORIES_DIR = path.join(process.cwd(), 'temp', 'stories');

// ── Global DB (theme index + playlists only) ──────────────────────────────────

interface GlobalDB {
  themeIndex: number;
  playlists: Array<{ story_id: string; story_title: string; theme: string; playlist_id: string }>;
  // legacy: stories array kept for migration read-only
  stories?: StoryRecord[];
}

function readGlobalDB(): GlobalDB {
  if (!fs.existsSync(DB_PATH)) return { themeIndex: 0, playlists: [] };
  const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as GlobalDB;
  if (!Array.isArray(data.playlists)) data.playlists = [];
  return data;
}

function writeGlobalDB(db: GlobalDB): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const { stories: _removed, ...clean } = db as any;
  fs.writeFileSync(DB_PATH, JSON.stringify(clean, null, 2));
}

// ── Per-story files ───────────────────────────────────────────────────────────

function storyPath(storyId: string): string {
  return path.join(STORIES_DIR, `${storyId}.json`);
}

function readStoryFile(storyId: string): StoryRecord[] {
  const p = storyPath(storyId);
  if (!fs.existsSync(p)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf-8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStoryFile(storyId: string, parts: StoryRecord[]): void {
  fs.mkdirSync(STORIES_DIR, { recursive: true });
  fs.writeFileSync(storyPath(storyId), JSON.stringify(parts, null, 2));
}

/** Returns all story IDs sorted by most recently modified. */
function allStoryIds(): string[] {
  if (!fs.existsSync(STORIES_DIR)) return [];
  return fs
    .readdirSync(STORIES_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ id: f.replace('.json', ''), mtime: fs.statSync(path.join(STORIES_DIR, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
    .map((f) => f.id);
}

/** Find a part by its local id across all story files (needed for updates). */
function findPartById(id: string): { storyId: string; parts: StoryRecord[]; idx: number } | null {
  for (const storyId of allStoryIds()) {
    const parts = readStoryFile(storyId);
    const idx = parts.findIndex((p) => p.id === id);
    if (idx !== -1) return { storyId, parts, idx };
  }
  // legacy fallback: check db.json stories array
  const global = readGlobalDB();
  if (global.stories) {
    const idx = global.stories.findIndex((p) => p.id === id);
    if (idx !== -1) {
      // migrate on first access
      const storyId = global.stories[idx].story_id;
      const partsForStory = global.stories.filter((s) => s.story_id === storyId);
      writeStoryFile(storyId, partsForStory);
      const newIdx = partsForStory.findIndex((p) => p.id === id);
      return { storyId, parts: partsForStory, idx: newIdx };
    }
  }
  return null;
}

function newId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function saveStoryPartLocal(record: StoryRecord): string {
  const id = newId();
  const parts = readStoryFile(record.story_id);
  parts.push({ ...record, id });
  writeStoryFile(record.story_id, parts);
  return id;
}

export function updateStoryPartLocal(id: string, updates: Partial<StoryRecord>): void {
  const found = findPartById(id);
  if (!found) throw new Error(`Local DB: story id ${id} not found`);
  found.parts[found.idx] = { ...found.parts[found.idx], ...updates };
  writeStoryFile(found.storyId, found.parts);
}

export function updatePartStatusLocal(
  id: string,
  updates: Partial<Pick<StoryRecord, 'images_status' | 'audio_status' | 'video_status' | 'video_path' | 'facebook_video_path' | 'thumbnail_path' | 'khmer_facebook_video_path'>>
): void {
  updateStoryPartLocal(id, updates);
}

export function getLatestStoryLocal(): StoryRecord | null {
  const ids = allStoryIds();
  if (ids.length === 0) {
    // legacy fallback
    const global = readGlobalDB();
    if (global.stories && global.stories.length > 0) {
      return global.stories[global.stories.length - 1];
    }
    return null;
  }
  const parts = readStoryFile(ids[0]);
  return parts.length > 0 ? parts[parts.length - 1] : null;
}

export function getStoryPartLocal(storyId: string, part: number): StoryRecord | null {
  const parts = readStoryFile(storyId);
  if (parts.length > 0) return parts.find((s) => s.part === part) ?? null;
  // legacy fallback
  const global = readGlobalDB();
  return global.stories?.find((s) => s.story_id === storyId && s.part === part) ?? null;
}

export function getTodayStoryLocal(): StoryRecord | null {
  const today = new Date().toISOString().split('T')[0];
  for (const storyId of allStoryIds()) {
    const parts = readStoryFile(storyId);
    const match = parts.find((s) => s.post_date === today && !s.posted);
    if (match) return match;
  }
  // legacy fallback
  const global = readGlobalDB();
  return global.stories?.find((s) => s.post_date === today && !s.posted) ?? null;
}

export function markAsPostedLocal(id: string): void {
  updateStoryPartLocal(id, { posted: true });
}

export function getAllPartUrlsLocal(storyId: string): Array<{ part: number; youtube_video_url?: string; youtube_video_id?: string }> {
  const parts = readStoryFile(storyId);
  const source = parts.length > 0 ? parts : (readGlobalDB().stories?.filter((s) => s.story_id === storyId) ?? []);
  return source
    .sort((a, b) => a.part - b.part)
    .map((s) => ({ part: s.part, youtube_video_url: s.youtube_video_url, youtube_video_id: s.youtube_video_id }));
}

export function getCurrentThemeIndexLocal(): number {
  return readGlobalDB().themeIndex;
}

export function incrementThemeIndexLocal(): void {
  const db = readGlobalDB();
  db.themeIndex = (db.themeIndex + 1) % 5;
  writeGlobalDB(db);
}

export function getOrCreatePlaylistLocal(storyId: string, storyTitle: string, theme: string, playlistId: string): void {
  const db = readGlobalDB();
  if (!db.playlists.find((p) => p.story_id === storyId)) {
    db.playlists.push({ story_id: storyId, story_title: storyTitle, theme, playlist_id: playlistId });
    writeGlobalDB(db);
  }
}

export function getPlaylistIdLocal(storyId: string): string | null {
  return readGlobalDB().playlists.find((p) => p.story_id === storyId)?.playlist_id ?? null;
}

export function saveRunStatsLocal(_stats: object): void {
  // no-op in local mode
}
