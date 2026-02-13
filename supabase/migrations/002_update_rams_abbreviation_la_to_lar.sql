-- Show Rams as LAR in the app instead of LA
UPDATE nfl_trivia_app_teams
SET abbreviation = 'LAR'
WHERE abbreviation = 'LA' AND name = 'Los Angeles Rams';
