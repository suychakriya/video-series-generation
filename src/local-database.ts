/**
 * Local JSON-based database — used when LOCAL_MODE=true in .env
 * Stores all data in temp/db.json instead of Supabase.
 */
import * as fs from 'fs';
import * as path from 'path';
import type { StoryRecord } from './database';

const DB_PATH = path.join(process.cwd(), 'temp', 'db.json');

interface LocalDB {
  stories: StoryRecord[];
  themeIndex: number;
  playlists: Array<{ story_id: string; story_title: string; theme: string; playlist_id: string }>;
}

function readDB(): LocalDB {
  if (!fs.existsSync(DB_PATH)) return { stories: [], themeIndex: 0, playlists: [] };
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as LocalDB;
}

function writeDB(db: LocalDB): void {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function newId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function saveStoryPartLocal(record: StoryRecord): string {
  const db = readDB();
  const id = newId();
  db.stories.push({ ...record, id });
  writeDB(db);
  return id;
}

export function updateStoryPartLocal(id: string, updates: Partial<StoryRecord>): void {
  const db = readDB();
  const idx = db.stories.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error(`Local DB: story id ${id} not found`);
  db.stories[idx] = { ...db.stories[idx], ...updates };
  writeDB(db);
}

export function updatePartStatusLocal(
  id: string,
  updates: Partial<Pick<StoryRecord, 'images_status' | 'audio_status' | 'video_status' | 'video_path' | 'facebook_video_path' | 'thumbnail_path'>>
): void {
  updateStoryPartLocal(id, updates);
}

export function getLatestStoryLocal(): StoryRecord | null {
  const db = readDB();
  if (db.stories.length === 0) return null;
  // Return the most recently created story (last inserted)
  return db.stories[db.stories.length - 1];
}

export function getStoryPartLocal(storyId: string, part: number): StoryRecord | null {
  const db = readDB();
  return db.stories.find((s) => s.story_id === storyId && s.part === part) ?? null;
}

export function getTodayStoryLocal(): StoryRecord | null {
  const db = readDB();
  const today = new Date().toISOString().split('T')[0];
  return db.stories.find((s) => s.post_date === today && !s.posted) ?? null;
}

export function markAsPostedLocal(id: string): void {
  updateStoryPartLocal(id, { posted: true });
}

export function getAllPartUrlsLocal(storyId: string): Array<{ part: number; youtube_video_url?: string; youtube_video_id?: string }> {
  const db = readDB();
  return db.stories
    .filter((s) => s.story_id === storyId)
    .sort((a, b) => a.part - b.part)
    .map((s) => ({ part: s.part, youtube_video_url: s.youtube_video_url, youtube_video_id: s.youtube_video_id }));
}

export function getCurrentThemeIndexLocal(): number {
  return readDB().themeIndex;
}

export function incrementThemeIndexLocal(): void {
  const db = readDB();
  db.themeIndex = (db.themeIndex + 1) % 5;
  writeDB(db);
}

export function getOrCreatePlaylistLocal(storyId: string, storyTitle: string, theme: string, playlistId: string): void {
  const db = readDB();
  if (!db.playlists.find((p) => p.story_id === storyId)) {
    db.playlists.push({ story_id: storyId, story_title: storyTitle, theme, playlist_id: playlistId });
    writeDB(db);
  }
}

export function getPlaylistIdLocal(storyId: string): string | null {
  const db = readDB();
  return db.playlists.find((p) => p.story_id === storyId)?.playlist_id ?? null;
}

export function saveRunStatsLocal(_stats: object): void {
  // no-op in local mode — stats aren't critical
}
