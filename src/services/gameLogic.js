import { supabase } from './supabaseClient';
import { DEFAULT_YEAR_MIN, DEFAULT_YEAR_MAX } from '../utils/constants';

/** Map wheel position group to DB position codes. OL -> OG/OT/OC; DEF -> all defensive. */
function positionQueryValues(position) {
  if (position === 'OL') return ['OG', 'OT', 'OC'];
  if (position === 'DEF') return ['LB', 'DL', 'CB', 'S'];
  return [position];
}

/**
 * Fetch all player names matching team, position, and year from Supabase.
 * Used to validate that the user's answer is any valid player for the round.
 */
export async function fetchPlayersForRound(team, position, year) {
  const { data: teams } = await supabase.from('nfl_trivia_app_teams').select('id').eq('abbreviation', team).limit(1);
  const teamId = teams?.[0]?.id;
  if (!teamId) return [];

  const positions = positionQueryValues(position);
  let query = supabase
    .from('nfl_trivia_app_players')
    .select('name, depth_rank, espn_id')
    .eq('team_id', teamId)
    .in('position', positions)
    .eq('year', year)
    .order('depth_rank', { ascending: true, nullsFirst: false })
    .limit(500);

  const { data: players, error } = await query;

  if (error || !players?.length) return [];
  return players.map((p) => ({ name: p.name, depth_rank: p.depth_rank ?? null, espn_id: p.espn_id ?? null }));
}

/**
 * Fetch a random player matching team, position, and year (for display when wrong).
 */
export async function fetchRandomPlayer(team, position, year) {
  const list = await fetchPlayersForRound(team, position, year);
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)].name;
}

/**
 * Get position group ids for the wheel (same as selected by user).
 */
export function getPositionGroupsForWheel(selectedPositionGroups) {
  return Array.isArray(selectedPositionGroups) && selectedPositionGroups.length > 0
    ? [...selectedPositionGroups]
    : ['QB', 'RB', 'WR', 'TE'];
}

/**
 * Get a random year in range.
 */
export function getRandomYear(min = DEFAULT_YEAR_MIN, max = DEFAULT_YEAR_MAX) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Get team abbreviations for wheel (from teams table or fallback).
 */
export async function getTeamList() {
  const { data } = await supabase.from('nfl_trivia_app_teams').select('abbreviation').order('abbreviation');
  if (data?.length) return data.map((r) => r.abbreviation);
  return ['ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN', 'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA', 'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB', 'TEN', 'WAS'];
}
