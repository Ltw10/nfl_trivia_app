-- Isolate NFL trivia objects in schema nfl_trivia (data-preserving).
-- 1) ALTER TABLE … SET SCHEMA keeps all rows, constraints, indexes, RLS policies, and ACLs.
-- 2) Replace public RPCs with nfl_trivia.* versions for PostgREST + supabase-js .schema('nfl_trivia').
-- Idempotent: safe if tables are already in nfl_trivia.
--
-- Full inventory in nfl_trivia after this migration:
--   Tables: nfl_trivia_app_teams, nfl_trivia_app_players, nfl_trivia_app_game_sessions,
--           nfl_trivia_app_game_players, nfl_trivia_app_game_rounds,
--           nfl_trivia_app_leaderboard, nfl_trivia_app_daily_leaderboard
--   RPCs:   get_leaderboard_best(int, text), submit_daily_score(date, varchar, int)

CREATE SCHEMA IF NOT EXISTS nfl_trivia;

GRANT USAGE ON SCHEMA nfl_trivia TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
  IF to_regclass('public.nfl_trivia_app_teams') IS NOT NULL
     AND to_regclass('nfl_trivia.nfl_trivia_app_teams') IS NOT NULL THEN
    RAISE EXCEPTION
      'Both public and nfl_trivia contain nfl_trivia_app_teams. Remove duplicates before migrating.';
  END IF;

  IF to_regclass('public.nfl_trivia_app_teams') IS NULL THEN
    NULL;
  ELSE
    ALTER TABLE public.nfl_trivia_app_teams SET SCHEMA nfl_trivia;
    ALTER TABLE public.nfl_trivia_app_players SET SCHEMA nfl_trivia;
    ALTER TABLE public.nfl_trivia_app_game_sessions SET SCHEMA nfl_trivia;
    ALTER TABLE public.nfl_trivia_app_game_players SET SCHEMA nfl_trivia;
    ALTER TABLE public.nfl_trivia_app_game_rounds SET SCHEMA nfl_trivia;
    ALTER TABLE public.nfl_trivia_app_leaderboard SET SCHEMA nfl_trivia;
    ALTER TABLE public.nfl_trivia_app_daily_leaderboard SET SCHEMA nfl_trivia;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.get_leaderboard_best(int, text);
DROP FUNCTION IF EXISTS public.submit_daily_score(date, character varying, integer);
DROP FUNCTION IF EXISTS public.submit_daily_score(date, varchar, integer);

CREATE OR REPLACE FUNCTION nfl_trivia.get_leaderboard_best(p_limit int, p_difficulty text)
RETURNS TABLE (
  id int,
  player_name varchar(100),
  score int,
  total_rounds int,
  rounds_played int,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = nfl_trivia, public
AS $$
  WITH ranked AS (
    SELECT
      l.id,
      l.player_name,
      l.score,
      l.total_rounds,
      l.rounds_played,
      l.created_at,
      COUNT(*) OVER (PARTITION BY l.player_name, l.difficulty) AS total_games,
      ROW_NUMBER() OVER (
        PARTITION BY l.player_name, l.difficulty
        ORDER BY l.score DESC, l.created_at ASC
      ) AS rn
    FROM nfl_trivia_app_leaderboard l
    WHERE l.difficulty = p_difficulty
  ),
  best AS (
    SELECT id, player_name, score, total_rounds, rounds_played, created_at, total_games
    FROM ranked
    WHERE rn = 1
  )
  SELECT b.id, b.player_name, b.score, b.total_rounds, b.rounds_played, b.created_at
  FROM best b
  ORDER BY b.score DESC, b.total_games ASC, b.created_at ASC
  LIMIT p_limit;
$$;

CREATE OR REPLACE FUNCTION nfl_trivia.submit_daily_score(p_play_date DATE, p_player_name VARCHAR(100), p_score INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = nfl_trivia, public
AS $$
BEGIN
  INSERT INTO nfl_trivia_app_daily_leaderboard (play_date, player_name, score)
  VALUES (p_play_date, p_player_name, p_score)
  ON CONFLICT (play_date, player_name)
  DO UPDATE SET
    score = GREATEST(nfl_trivia_app_daily_leaderboard.score, EXCLUDED.score),
    created_at = CASE
      WHEN EXCLUDED.score > nfl_trivia_app_daily_leaderboard.score THEN NOW()
      ELSE nfl_trivia_app_daily_leaderboard.created_at
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION nfl_trivia.get_leaderboard_best(int, text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION nfl_trivia.submit_daily_score(DATE, VARCHAR(100), INTEGER) TO anon, authenticated, service_role;

-- Explicit grants on qualified names (new Supabase defaults; idempotent).
GRANT SELECT ON TABLE nfl_trivia.nfl_trivia_app_teams TO anon, authenticated;
GRANT SELECT ON TABLE nfl_trivia.nfl_trivia_app_players TO anon, authenticated;
GRANT SELECT, INSERT ON TABLE nfl_trivia.nfl_trivia_app_leaderboard TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE nfl_trivia.nfl_trivia_app_leaderboard_id_seq TO anon, authenticated;
GRANT SELECT ON TABLE nfl_trivia.nfl_trivia_app_daily_leaderboard TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE nfl_trivia.nfl_trivia_app_teams TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE nfl_trivia.nfl_trivia_app_players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE nfl_trivia.nfl_trivia_app_game_sessions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE nfl_trivia.nfl_trivia_app_game_players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE nfl_trivia.nfl_trivia_app_game_rounds TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE nfl_trivia.nfl_trivia_app_leaderboard TO service_role;
GRANT USAGE, SELECT ON SEQUENCE nfl_trivia.nfl_trivia_app_leaderboard_id_seq TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE nfl_trivia.nfl_trivia_app_daily_leaderboard TO service_role;

GRANT USAGE, SELECT ON SEQUENCE nfl_trivia.nfl_trivia_app_teams_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE nfl_trivia.nfl_trivia_app_players_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE nfl_trivia.nfl_trivia_app_game_players_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE nfl_trivia.nfl_trivia_app_game_rounds_id_seq TO service_role;
