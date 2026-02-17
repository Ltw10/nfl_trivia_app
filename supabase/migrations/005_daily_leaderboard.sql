-- Daily Luck of the Draw: one row per player per day, best score kept.
CREATE TABLE nfl_trivia_app_daily_leaderboard (
  play_date DATE NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (play_date, player_name)
);

-- Rank by score desc, then earlier submission wins tiebreak.
CREATE INDEX idx_nfl_trivia_app_daily_leaderboard_rank
  ON nfl_trivia_app_daily_leaderboard (play_date, score DESC, created_at ASC);

ALTER TABLE nfl_trivia_app_daily_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read daily leaderboard" ON nfl_trivia_app_daily_leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Allow anon insert daily leaderboard" ON nfl_trivia_app_daily_leaderboard
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow anon update daily leaderboard" ON nfl_trivia_app_daily_leaderboard
  FOR UPDATE USING (true);

-- Upsert: keep best score per player per day; when score improves, update created_at for tiebreak.
CREATE OR REPLACE FUNCTION submit_daily_score(p_play_date DATE, p_player_name VARCHAR(100), p_score INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Allow anonymous client to call the function (required for Supabase anon key).
GRANT EXECUTE ON FUNCTION submit_daily_score(DATE, VARCHAR(100), INTEGER) TO anon;
