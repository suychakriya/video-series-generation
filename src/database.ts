import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as local from './local-database';

const LOCAL_MODE = process.env.LOCAL_MODE === 'true';

let _supabase: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (!_supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY are required');
    }
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  }
  return _supabase;
}

export interface StoryRecord {
  id?: string;
  story_id: string;
  part: number;
  theme: string;
  title: string;
  content: string;
  hook: string;
  thumbnail_title?: string;
  character_description: string;
  style_prompt: string;
  base_image_url?: string;
  image_seed: number;
  audio_url?: string;
  short_audio_url?: string;
  video_url?: string;
  facebook_video_url?: string;
  short_url?: string;
  thumbnail_url?: string;
  subtitle_url?: string;
  dramatic_image_url?: string;
  facebook_caption: string;
  youtube_title: string;
  youtube_description: string;
  youtube_tags: string;
  facebook_post_id?: string;
  facebook_post_url?: string;
  youtube_video_id?: string;
  youtube_video_url?: string;
  youtube_short_id?: string;
  youtube_short_url?: string;
  youtube_playlist_id?: string;
  scenes?: any[];
  khmer_title?: string;
  khmer_hook?: string;
  khmer_facebook_caption?: string;
  khmer_facebook_video_url?: string;
  khmer_facebook_video_path?: string;
  khmer_facebook_post_id?: string;
  khmer_facebook_post_url?: string;
  comment_posted?: boolean;
  posted?: boolean;
  post_date?: string;
  images_status?: 'pending' | 'done';
  audio_status?: 'pending' | 'done';
  video_status?: 'pending' | 'done';
  video_path?: string;
  facebook_video_path?: string;
  thumbnail_path?: string;
}

export async function saveStoryPart(record: StoryRecord): Promise<string> {
  if (LOCAL_MODE) return local.saveStoryPartLocal(record);
  const { data, error } = await supabase().from('stories').insert(record).select('id').single();
  if (error) throw new Error(`DB insert error: ${error.message}`);
  return data.id;
}

export async function updateStoryPart(id: string, updates: Partial<StoryRecord>): Promise<void> {
  if (LOCAL_MODE) return local.updateStoryPartLocal(id, updates);
  const { error } = await supabase().from('stories').update(updates).eq('id', id);
  if (error) throw new Error(`DB update error: ${error.message}`);
}

export async function saveThumbnailUrl(id: string, thumbnailUrl: string): Promise<void> {
  await updateStoryPart(id, { thumbnail_url: thumbnailUrl });
}

export async function saveShortUrl(
  id: string,
  shortUrl: string,
  youtubeShortId?: string
): Promise<void> {
  await updateStoryPart(id, {
    short_url: shortUrl,
    youtube_short_id: youtubeShortId,
    youtube_short_url: youtubeShortId
      ? `https://www.youtube.com/shorts/${youtubeShortId}`
      : undefined,
  });
}

export async function getDramaticImageUrl(id: string): Promise<string | null> {
  if (LOCAL_MODE) {
    const db = require('./local-database');
    const story = db.getLatestStoryLocal();
    return story?.dramatic_image_url ?? null;
  }
  const { data, error } = await supabase()
    .from('stories')
    .select('dramatic_image_url')
    .eq('id', id)
    .single();
  if (error) return null;
  return data?.dramatic_image_url || null;
}

export async function getTodayStory(): Promise<StoryRecord | null> {
  if (LOCAL_MODE) return local.getTodayStoryLocal();
  const today = new Date().toISOString().split('T')[0];
  console.log(`[getTodayStory] querying for post_date=${today}, posted=false`);
  const { data, error } = await supabase()
    .from('stories')
    .select('*')
    .eq('post_date', today)
    .eq('posted', false)
    .limit(1)
    .single();
  if (error || !data) {
    console.log(`[getTodayStory] not found — error: ${error?.code} ${error?.message}`);
    return null;
  }
  console.log(`[getTodayStory] found: ${data.story_id} part ${data.part}`);
  return data as StoryRecord;
}

export async function markAsPosted(id: string): Promise<void> {
  if (LOCAL_MODE) return local.markAsPostedLocal(id);
  await updateStoryPart(id, { posted: true });
}

export async function getAllPartUrls(
  storyId: string
): Promise<Array<{ part: number; youtube_video_url?: string; youtube_video_id?: string }>> {
  if (LOCAL_MODE) return local.getAllPartUrlsLocal(storyId);
  const { data, error } = await supabase()
    .from('stories')
    .select('part, youtube_video_url, youtube_video_id')
    .eq('story_id', storyId)
    .order('part');
  if (error) return [];
  return data || [];
}

export async function getCurrentThemeIndex(): Promise<number> {
  if (LOCAL_MODE) return local.getCurrentThemeIndexLocal();
  const { data, error } = await supabase()
    .from('theme_tracker')
    .select('current_theme_index')
    .limit(1)
    .single();
  if (error || !data) return 0;
  return data.current_theme_index;
}

export async function incrementThemeIndex(): Promise<void> {
  if (LOCAL_MODE) return local.incrementThemeIndexLocal();
  const current = await getCurrentThemeIndex();
  const next = (current + 1) % 5;
  const { data } = await supabase().from('theme_tracker').select('id').limit(1).single();
  if (data?.id) {
    await supabase()
      .from('theme_tracker')
      .update({ current_theme_index: next, last_updated: new Date().toISOString() })
      .eq('id', data.id);
  }
}

export async function getOrCreatePlaylist(
  storyId: string,
  storyTitle: string,
  theme: string,
  playlistId: string
): Promise<void> {
  if (LOCAL_MODE) return local.getOrCreatePlaylistLocal(storyId, storyTitle, theme, playlistId);
  const existing = await supabase()
    .from('youtube_playlists')
    .select('id')
    .eq('story_id', storyId)
    .single();
  if (!existing.data) {
    await supabase().from('youtube_playlists').insert({
      story_id: storyId,
      story_title: storyTitle,
      theme,
      playlist_id: playlistId,
    });
  }
}

export async function deletePlaylistRecord(storyId: string): Promise<void> {
  if (LOCAL_MODE) {
    const db = require('./local-database');
    const localDb = JSON.parse(require('fs').readFileSync(require('path').join(process.cwd(), 'temp', 'db.json'), 'utf-8'));
    localDb.playlists = localDb.playlists.filter((p: any) => p.story_id !== storyId);
    require('fs').writeFileSync(require('path').join(process.cwd(), 'temp', 'db.json'), JSON.stringify(localDb, null, 2));
    return;
  }
  await supabase().from('youtube_playlists').delete().eq('story_id', storyId);
}

export async function getPlaylistId(storyId: string): Promise<string | null> {
  if (LOCAL_MODE) return local.getPlaylistIdLocal(storyId);
  const { data } = await supabase()
    .from('youtube_playlists')
    .select('playlist_id')
    .eq('story_id', storyId)
    .single();
  return data?.playlist_id || null;
}

export async function getLatestStory(): Promise<StoryRecord | null> {
  if (LOCAL_MODE) return local.getLatestStoryLocal();
  const { data, error } = await supabase()
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error || !data) return null;
  return data as StoryRecord;
}

export async function getStoryPart(storyId: string, part: number): Promise<StoryRecord | null> {
  if (LOCAL_MODE) return local.getStoryPartLocal(storyId, part);
  const { data, error } = await supabase()
    .from('stories')
    .select('*')
    .eq('story_id', storyId)
    .eq('part', part)
    .single();
  if (error || !data) return null;
  return data as StoryRecord;
}

export async function updatePartStatus(
  id: string,
  updates: Partial<Pick<StoryRecord, 'images_status' | 'audio_status' | 'video_status' | 'video_path' | 'facebook_video_path' | 'thumbnail_path' | 'khmer_facebook_video_path'>>
): Promise<void> {
  if (LOCAL_MODE) return local.updatePartStatusLocal(id, updates);
  const { error } = await supabase().from('stories').update(updates).eq('id', id);
  if (error) throw new Error(`DB update error: ${error.message}`);
}

export async function saveRunStats(stats: {
  run_type: string;
  story_id: string;
  theme: string;
  story_title: string;
  parts_completed?: number;
  total_images?: number;
  render_time_minutes?: number;
  facebook_status?: string;
  youtube_status?: string;
  youtube_short_status?: string;
  error_message?: string;
}): Promise<void> {
  if (LOCAL_MODE) return local.saveRunStatsLocal(stats);
  await supabase().from('run_stats').insert(stats);
}
