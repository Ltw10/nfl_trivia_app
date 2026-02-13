// Team display names (abbreviation -> full name) for UI
export const TEAM_NAMES = {
  ARI: 'Arizona Cardinals',
  ATL: 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',
  BUF: 'Buffalo Bills',
  CAR: 'Carolina Panthers',
  CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals',
  CLE: 'Cleveland Browns',
  DAL: 'Dallas Cowboys',
  DEN: 'Denver Broncos',
  DET: 'Detroit Lions',
  GB: 'Green Bay Packers',
  HOU: 'Houston Texans',
  IND: 'Indianapolis Colts',
  JAX: 'Jacksonville Jaguars',
  KC: 'Kansas City Chiefs',
  LV: 'Las Vegas Raiders',
  LAC: 'Los Angeles Chargers',
  LAR: 'Los Angeles Rams',
  MIA: 'Miami Dolphins',
  MIN: 'Minnesota Vikings',
  NE: 'New England Patriots',
  NO: 'New Orleans Saints',
  NYG: 'New York Giants',
  NYJ: 'New York Jets',
  PHI: 'Philadelphia Eagles',
  PIT: 'Pittsburgh Steelers',
  SF: 'San Francisco 49ers',
  SEA: 'Seattle Seahawks',
  TB: 'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans',
  WAS: 'Washington Commanders',
  OAK: 'Las Vegas Raiders',
  SD: 'Los Angeles Chargers',
  STL: 'Los Angeles Rams', // historical; alias to LAR
};

/** ESPN CDN URL for NFL team logo (500px). Use lowercase abbreviation. */
export function getTeamLogoUrl(abbreviation) {
  if (!abbreviation || typeof abbreviation !== 'string') return null;
  const abbr = abbreviation.trim().toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nfl/500/${abbr}.png`;
}

/** Selectable position groups for the wheel. DEF = any defensive player (LB, DL, CB, S). */
export const POSITION_GROUPS = [
  { id: 'QB', label: 'QB' },
  { id: 'RB', label: 'RB' },
  { id: 'WR', label: 'WR' },
  { id: 'TE', label: 'TE' },
  { id: 'OL', label: 'OL' },
  { id: 'DEF', label: 'DEF (any defensive)' },
  { id: 'LB', label: 'LB' },
  { id: 'DL', label: 'DL' },
  { id: 'CB', label: 'CB' },
  { id: 'S', label: 'S' },
];

export const DEFAULT_YEAR_MIN = 2000;
export const DEFAULT_YEAR_MAX = Math.min(new Date().getFullYear(), 2025);
