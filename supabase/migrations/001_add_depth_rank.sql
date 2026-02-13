-- Add depth_rank to players for depth-chart ordering (WR1, WR2, etc.).
-- Run this if you already applied the original schema without depth_rank.
ALTER TABLE nfl_trivia_app_players
ADD COLUMN IF NOT EXISTS depth_rank INTEGER;
