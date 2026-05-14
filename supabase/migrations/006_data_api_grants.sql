-- Explicit grants for PostgREST / supabase-js while NFL tables are still in public (001).
-- After migration 007, tables and grants live in schema nfl_trivia (007 reapplies grants there).
-- Safe to re-run.

GRANT SELECT ON TABLE public.nfl_trivia_app_teams TO anon, authenticated;
GRANT SELECT ON TABLE public.nfl_trivia_app_players TO anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.nfl_trivia_app_leaderboard TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.nfl_trivia_app_leaderboard_id_seq TO anon, authenticated;

GRANT SELECT ON TABLE public.nfl_trivia_app_daily_leaderboard TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nfl_trivia_app_teams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nfl_trivia_app_players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nfl_trivia_app_game_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nfl_trivia_app_game_players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nfl_trivia_app_game_rounds TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nfl_trivia_app_leaderboard TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.nfl_trivia_app_leaderboard_id_seq TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.nfl_trivia_app_daily_leaderboard TO service_role;

GRANT USAGE, SELECT ON SEQUENCE public.nfl_trivia_app_teams_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.nfl_trivia_app_players_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.nfl_trivia_app_game_players_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.nfl_trivia_app_game_rounds_id_seq TO service_role;
