import { supabase } from './supabaseClient';
import { getDateKeyEST } from '../utils/dailyPuzzle';

const TABLE = 'nfl_trivia_app_daily_leaderboard';

/**
 * @param {Date|string} playDate - Date or YYYY-MM-DD
 * @returns {Promise<{ play_date: string, player_name: string, score: number, created_at: string }[]>}
 */
export async function getDailyLeaderboard(playDate, limit = 20) {
  const dateKey = getDateKeyEST(playDate);
  const { data, error } = await supabase
    .from(TABLE)
    .select('play_date, player_name, score, created_at')
    .eq('play_date', dateKey)
    .order('score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/**
 * Submit or update today's score. Keeps best score; tiebreak is earlier submission.
 * @param {{ playDate?: Date|string, player_name: string, score: number }}
 */
export async function submitDailyScore({ playDate = new Date(), player_name, score }) {
  const dateKey = getDateKeyEST(playDate);
  const { error } = await supabase.rpc('submit_daily_score', {
    p_play_date: dateKey,
    p_player_name: String(player_name).trim().slice(0, 100),
    p_score: Number(score),
  });
  if (error) throw error;
}
