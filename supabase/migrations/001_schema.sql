-- NFL Trivia App: full schema (idempotent — safe to re-run on existing DB)
-- Run this once to set up from scratch, or re-run to apply any missing objects.

-- Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Base tables (skip if already exist)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS nfl_trivia_app_teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(3) NOT NULL,
  city VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfl_trivia_app_players (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  team_id INTEGER REFERENCES nfl_trivia_app_teams(id),
  position VARCHAR(10) NOT NULL,
  year INTEGER NOT NULL,
  espn_id VARCHAR(50),
  depth_rank INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, team_id, year)
);

-- Add depth_rank if table existed without it (e.g. from an older schema)
ALTER TABLE nfl_trivia_app_players
  ADD COLUMN IF NOT EXISTS depth_rank INTEGER;

CREATE TABLE IF NOT EXISTS nfl_trivia_app_game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_score INTEGER NOT NULL,
  difficulty VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfl_trivia_app_game_players (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES nfl_trivia_app_game_sessions(id),
  player_name VARCHAR(100) NOT NULL,
  score INTEGER DEFAULT 0,
  player_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS nfl_trivia_app_game_rounds (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES nfl_trivia_app_game_sessions(id),
  game_player_id INTEGER REFERENCES nfl_trivia_app_game_players(id),
  team VARCHAR(100),
  position VARCHAR(10),
  year INTEGER,
  correct_answer VARCHAR(200),
  user_answer VARCHAR(200),
  is_correct BOOLEAN,
  round_number INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes (skip if already exist)
CREATE INDEX IF NOT EXISTS idx_nfl_trivia_app_players_team_pos_year
  ON nfl_trivia_app_players(team_id, position, year);
CREATE INDEX IF NOT EXISTS idx_nfl_trivia_app_players_name
  ON nfl_trivia_app_players(name);
CREATE INDEX IF NOT EXISTS idx_nfl_trivia_app_players_position_year
  ON nfl_trivia_app_players(position, year);

-- Rams abbreviation (idempotent: only updates when still LA)
UPDATE nfl_trivia_app_teams
SET abbreviation = 'LAR'
WHERE abbreviation = 'LA' AND name = 'Los Angeles Rams';

-- ---------------------------------------------------------------------------
-- Single-player leaderboard
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS nfl_trivia_app_leaderboard (
  id SERIAL PRIMARY KEY,
  player_name VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL,
  total_rounds INTEGER NOT NULL,
  rounds_played INTEGER NOT NULL,
  difficulty VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nfl_trivia_app_leaderboard_score
  ON nfl_trivia_app_leaderboard(score DESC, rounds_played ASC, created_at ASC);

ALTER TABLE nfl_trivia_app_leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read leaderboard" ON nfl_trivia_app_leaderboard;
CREATE POLICY "Allow anon read leaderboard" ON nfl_trivia_app_leaderboard
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert leaderboard" ON nfl_trivia_app_leaderboard;
CREATE POLICY "Allow anon insert leaderboard" ON nfl_trivia_app_leaderboard
  FOR INSERT WITH CHECK (true);

-- Best entry per player (one row per player_name, difficulty)
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

GRANT EXECUTE ON FUNCTION get_leaderboard_best(int, text) TO anon;

-- ---------------------------------------------------------------------------
-- Daily challenge leaderboard
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS nfl_trivia_app_daily_leaderboard (
  play_date DATE NOT NULL,
  player_name VARCHAR(100) NOT NULL,
  score INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (play_date, player_name)
);

CREATE INDEX IF NOT EXISTS idx_nfl_trivia_app_daily_leaderboard_rank
  ON nfl_trivia_app_daily_leaderboard (play_date, score DESC, created_at ASC);

ALTER TABLE nfl_trivia_app_daily_leaderboard ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read daily leaderboard" ON nfl_trivia_app_daily_leaderboard;
CREATE POLICY "Allow anon read daily leaderboard" ON nfl_trivia_app_daily_leaderboard
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow anon insert daily leaderboard" ON nfl_trivia_app_daily_leaderboard;
CREATE POLICY "Allow anon insert daily leaderboard" ON nfl_trivia_app_daily_leaderboard
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update daily leaderboard" ON nfl_trivia_app_daily_leaderboard;
CREATE POLICY "Allow anon update daily leaderboard" ON nfl_trivia_app_daily_leaderboard
  FOR UPDATE USING (true);

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

GRANT EXECUTE ON FUNCTION submit_daily_score(DATE, VARCHAR(100), INTEGER) TO anon;
