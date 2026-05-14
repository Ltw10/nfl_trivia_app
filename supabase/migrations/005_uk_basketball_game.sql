-- Kentucky Wildcats Basketball — isolated schema uky_bball
-- Idempotent.
--
-- Inventory (all in schema uky_bball):
--   Tables: uky_bball_guesser_players, uky_bball_guesser_player_seasons
--   View:   uky_bball_guesser_player_full

CREATE SCHEMA IF NOT EXISTS uky_bball;
COMMENT ON SCHEMA uky_bball IS 'UK basketball guesser — tables and views';

GRANT USAGE ON SCHEMA uky_bball TO postgres, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS uky_bball.uky_bball_guesser_players (
  id            bigint primary key generated always as identity,
  name          text not null unique,
  career_ppg    numeric(5,2),
  career_rpg    numeric(5,2),
  career_apg    numeric(5,2),
  career_spg    numeric(5,2),
  career_bpg    numeric(5,2),
  created_at    timestamptz default now()
);

COMMENT ON TABLE uky_bball.uky_bball_guesser_players IS
  'One row per unique Kentucky Wildcats player (1990-91 onward).';

CREATE TABLE IF NOT EXISTS uky_bball.uky_bball_guesser_player_seasons (
  id             bigint primary key generated always as identity,
  player_id      bigint not null references uky_bball.uky_bball_guesser_players(id) on delete cascade,
  season         text not null,
  year_end       smallint not null,
  jersey_number  text,
  class_year     text,
  position       text,
  games          smallint,
  games_started  smallint,
  minutes_pg     numeric(4,1),
  ppg            numeric(5,2),
  rpg            numeric(5,2),
  apg            numeric(5,2),
  spg            numeric(5,2),
  bpg            numeric(5,2),
  fg_pct         numeric(5,3),
  three_pct      numeric(5,3),
  ft_pct         numeric(5,3),
  created_at     timestamptz default now(),
  unique (player_id, season)
);

COMMENT ON TABLE uky_bball.uky_bball_guesser_player_seasons IS
  'Per-season stats for each Kentucky player.';

CREATE INDEX IF NOT EXISTS idx_uky_player_seasons_player_id
  ON uky_bball.uky_bball_guesser_player_seasons(player_id);

CREATE INDEX IF NOT EXISTS idx_uky_player_seasons_season
  ON uky_bball.uky_bball_guesser_player_seasons(season);

CREATE INDEX IF NOT EXISTS idx_uky_player_seasons_year_end
  ON uky_bball.uky_bball_guesser_player_seasons(year_end);

CREATE OR REPLACE VIEW uky_bball.uky_bball_guesser_player_full AS
SELECT
  p.id                                          AS player_id,
  p.name,
  p.career_ppg,
  p.career_rpg,
  p.career_apg,
  p.career_spg,
  p.career_bpg,
  array_agg(ps.season ORDER BY ps.year_end)     AS seasons,
  array_agg(DISTINCT ps.jersey_number)
    FILTER (WHERE ps.jersey_number IS NOT NULL)  AS jersey_numbers,
  array_agg(DISTINCT ps.position)
    FILTER (WHERE ps.position IS NOT NULL)       AS positions,
  min(ps.year_end)                              AS first_year,
  max(ps.year_end)                              AS last_year,
  count(ps.id)                                  AS seasons_played
FROM uky_bball.uky_bball_guesser_players p
JOIN uky_bball.uky_bball_guesser_player_seasons ps ON ps.player_id = p.id
GROUP BY p.id, p.name, p.career_ppg, p.career_rpg,
         p.career_apg, p.career_spg, p.career_bpg;

COMMENT ON VIEW uky_bball.uky_bball_guesser_player_full IS
  'Flattened player view for guesser queries.';

ALTER TABLE uky_bball.uky_bball_guesser_players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE uky_bball.uky_bball_guesser_player_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read uky_bball_guesser_players" ON uky_bball.uky_bball_guesser_players;
CREATE POLICY "Public read uky_bball_guesser_players"
  ON uky_bball.uky_bball_guesser_players FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read uky_bball_guesser_player_seasons" ON uky_bball.uky_bball_guesser_player_seasons;
CREATE POLICY "Public read uky_bball_guesser_player_seasons"
  ON uky_bball.uky_bball_guesser_player_seasons FOR SELECT USING (true);

-- Data API: public reads; service role for scraper writes
GRANT SELECT ON TABLE uky_bball.uky_bball_guesser_players TO anon, authenticated;
GRANT SELECT ON TABLE uky_bball.uky_bball_guesser_player_seasons TO anon, authenticated;
GRANT SELECT ON TABLE uky_bball.uky_bball_guesser_player_full TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE uky_bball.uky_bball_guesser_players TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE uky_bball.uky_bball_guesser_player_seasons TO service_role;
GRANT SELECT ON TABLE uky_bball.uky_bball_guesser_player_full TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA uky_bball TO service_role;
