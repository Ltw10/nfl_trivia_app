import { supabaseNflTrivia, NFL_TRIVIA } from './supabaseClient';

const TABLE = NFL_TRIVIA.table.leaderboard;

/**
 * Save a single-player game result. Tiebreak: same score → fewer rounds_played wins, then earlier created_at.
 */
export async function saveLeaderboardEntry({ player_name, score, total_rounds, rounds_played, difficulty }) {
  const { data, error } = await supabaseNflTrivia
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
 * Fetch leaderboard with one entry per player (their best score).
 * Order: score DESC, then tiebreak = fewer total games played (tries), then created_at ASC.
 * @param {number} limit
 * @param {'easy'|'medium'} difficulty
 */
export async function getLeaderboard(limit = 20, difficulty = 'easy') {
  const d = difficulty === 'medium' ? 'medium' : 'easy';
  const { data, error } = await supabaseNflTrivia.rpc(NFL_TRIVIA.rpc.leaderboardBest, {
    p_limit: limit,
    p_difficulty: d,
  });
  if (error) throw error;
  return data || [];
}
