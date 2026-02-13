-- Best entry per player for leaderboard: one row per (player_name, difficulty).
-- Tiebreak: same score → fewer total games played (tries) wins, then earlier created_at.
CREATE OR REPLACE FUNCTION get_leaderboard_best(p_limit int, p_difficulty text)
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
SET search_path = public
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

-- Allow anon to call the function (same as reading the table).
GRANT EXECUTE ON FUNCTION get_leaderboard_best(int, text) TO anon;
