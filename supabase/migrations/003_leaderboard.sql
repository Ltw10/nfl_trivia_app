-- Single-player leaderboard: name, score, total_rounds, rounds_played (tiebreak), difficulty
CREATE TABLE nfl_trivia_app_leaderboard (
  id SERIAL PRIMARY KEY,
  player_name VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL,
  total_rounds INTEGER NOT NULL,
  rounds_played INTEGER NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nfl_trivia_app_leaderboard_score ON nfl_trivia_app_leaderboard(score DESC, rounds_played ASC, created_at ASC);

-- Allow anon to insert and read (for app deploy). Restrict if you add auth later.
ALTER TABLE nfl_trivia_app_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read leaderboard" ON nfl_trivia_app_leaderboard
  FOR SELECT USING (true);

CREATE POLICY "Allow anon insert leaderboard" ON nfl_trivia_app_leaderboard
  FOR INSERT WITH CHECK (true);
