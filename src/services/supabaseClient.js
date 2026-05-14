import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/** PostgREST / Postgres schema for all NFL trivia DDL (migrations 001 + 007). */
export const NFL_TRIVIA_SCHEMA = 'nfl_trivia';

/**
 * Object names in {@link NFL_TRIVIA_SCHEMA}. Must match supabase/migrations/001_schema.sql
 * and 007_move_legacy_public_nfl_tables_to_nfl_trivia.sql (all tables move there; RPCs are recreated there).
 * game_* tables are defined for persistence / future use; the web app currently reads teams, players, leaderboards only.
 */
export const NFL_TRIVIA = Object.freeze({
  table: Object.freeze({
    teams: 'nfl_trivia_app_teams',
    players: 'nfl_trivia_app_players',
    gameSessions: 'nfl_trivia_app_game_sessions',
    gamePlayers: 'nfl_trivia_app_game_players',
    gameRounds: 'nfl_trivia_app_game_rounds',
    leaderboard: 'nfl_trivia_app_leaderboard',
    dailyLeaderboard: 'nfl_trivia_app_daily_leaderboard',
  }),
  rpc: Object.freeze({
    leaderboardBest: 'get_leaderboard_best',
    submitDailyScore: 'submit_daily_score',
  }),
});

/** Kentucky guesser schema (migration 005_uk_basketball_game.sql). */
export const UKY_BBALL_SCHEMA = 'uky_bball';

/** Object names in {@link UKY_BBALL_SCHEMA} (scripts/populate_kentucky_database.py). */
export const UKY_BBALL = Object.freeze({
  table: Object.freeze({
    players: 'uky_bball_guesser_players',
    playerSeasons: 'uky_bball_guesser_player_seasons',
  }),
  view: Object.freeze({
    playerFull: 'uky_bball_guesser_player_full',
  }),
});

/** Base client (defaults to public). Prefer {@link supabaseNflTrivia} for NFL trivia data. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * PostgREST client for NFL trivia tables and RPCs.
 * On hosted Supabase: Project Settings → API → Exposed schemas → add `nfl_trivia`
 * (and `uky_bball` if you use the Kentucky scraper).
 */
export const supabaseNflTrivia = supabase.schema(NFL_TRIVIA_SCHEMA);
