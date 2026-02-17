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

/** Selectable position groups for the wheel. Optional title = tooltip on hover. */
export const POSITION_GROUPS = [
  { id: 'QB', label: 'QB' },
  { id: 'RB', label: 'RB' },
  { id: 'WR', label: 'WR' },
  { id: 'TE', label: 'TE' },
  { id: 'OL', label: 'OL', title: 'Offensive line (OG, OT, OC)' },
  { id: 'DEF', label: 'DEF', title: 'Any defensive player (LB, DL, CB, S)' },
  { id: 'LB', label: 'LB' },
  { id: 'DL', label: 'DL' },
  { id: 'CB', label: 'CB' },
  { id: 'S', label: 'S' },
];

export const DEFAULT_YEAR_MIN = 2000;
export const DEFAULT_YEAR_MAX = Math.min(new Date().getFullYear(), 2025);

/** Single-player difficulty year minimums: Easy = 2010, Medium = 2000. */
export const SINGLE_PLAYER_YEAR_MIN_EASY = 2010;
export const SINGLE_PLAYER_YEAR_MIN_MEDIUM = 2000;

/** Single-player: 30 seconds per guess. */
export const SINGLE_PLAYER_TIMER_SECONDS = 30;

/** Full setup timer options (seconds); null = no timer. */
export const TIMER_OPTIONS = [15, 30, 45, 60];

/** Quick single-player: Easy = QB, RB, WR. Medium = Easy + TE, DEF. */
export const SINGLE_PLAYER_POSITIONS_EASY = ['QB', 'RB', 'WR'];
export const SINGLE_PLAYER_POSITIONS_MEDIUM = ['QB', 'RB', 'WR', 'TE', 'DEF'];
