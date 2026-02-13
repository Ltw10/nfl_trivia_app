import { supabase } from './supabaseClient';

const TABLE = 'nfl_trivia_app_leaderboard';

/**
 * Save a single-player game result. Tiebreak: same score → fewer rounds_played wins, then earlier created_at.
 */
export async function saveLeaderboardEntry({ player_name, score, total_rounds, rounds_played, difficulty }) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      player_name: String(player_name).trim().slice(0, 100),
      score: Number(score),
      total_rounds: Number(total_rounds),
      rounds_played: Number(rounds_played),
      difficulty: difficulty === 'medium' ? 'medium' : 'easy',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch top entries for a difficulty: score DESC, then rounds_played ASC, then created_at ASC.
 * @param {number} limit
 * @param {'easy'|'medium'} difficulty
 */
export async function getLeaderboard(limit = 20, difficulty = 'easy') {
  const d = difficulty === 'medium' ? 'medium' : 'easy';
  const { data, error } = await supabase
    .from(TABLE)
    .select('id, player_name, score, total_rounds, rounds_played, created_at')
    .eq('difficulty', d)
    .order('score', { ascending: false })
    .order('rounds_played', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}
