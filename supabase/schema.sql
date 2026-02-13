-- Enable UUID extension for game_sessions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE nfl_trivia_app_teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  abbreviation VARCHAR(3) NOT NULL,
  city VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Players table
CREATE TABLE nfl_trivia_app_players (
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

-- Game sessions table
CREATE TABLE nfl_trivia_app_game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  target_score INTEGER NOT NULL,
  difficulty VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Game players table
CREATE TABLE nfl_trivia_app_game_players (
  id SERIAL PRIMARY KEY,
  session_id UUID REFERENCES nfl_trivia_app_game_sessions(id),
  player_name VARCHAR(100) NOT NULL,
  score INTEGER DEFAULT 0,
  player_order INTEGER NOT NULL
);

-- Game rounds table
CREATE TABLE nfl_trivia_app_game_rounds (
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

-- Indexes for performance
CREATE INDEX idx_nfl_trivia_app_players_team_pos_year ON nfl_trivia_app_players(team_id, position, year);
CREATE INDEX idx_nfl_trivia_app_players_name ON nfl_trivia_app_players(name);
CREATE INDEX idx_nfl_trivia_app_players_position_year ON nfl_trivia_app_players(position, year);
