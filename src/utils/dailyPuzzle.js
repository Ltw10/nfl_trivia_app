/**
 * Deterministic daily puzzle: same 10 (team, position, year) rounds for everyone for a given date.
 * Uses a seeded RNG so we don't need to store puzzles in the DB.
 */

/** 32 current NFL team abbreviations (no historical aliases). */
const DAILY_TEAMS = [
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
  'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LV', 'LAC', 'LAR', 'MIA',
  'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SF', 'SEA', 'TB',
  'TEN', 'WAS',
];

/** Easy mode: QB, RB, WR only. */
const DAILY_POSITIONS = ['QB', 'RB', 'WR'];

const DAILY_YEAR_MIN = 2010;
const DAILY_YEAR_MAX = 2025;

/** Simple string hash to seed the RNG. */
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h = (h << 5) - h + c;
    h |= 0;
  }
  return h >>> 0;
}

/** Mulberry32 seeded PRNG. Returns 0..1. */
function createSeededRandom(seed) {
  return function next() {
    seed = (seed + 0x6d2b79f5) | 0; // 32-bit
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Daily challenge uses America/New_York (EST/EDT) for "today". */
const DAILY_TIMEZONE = 'America/New_York';

/**
 * Get date as YYYY-MM-DD in Eastern Time (EST/EDT).
 * Use this for daily leaderboard and daily puzzle so the day rolls over at midnight Eastern.
 * If passed a string YYYY-MM-DD, returns it as-is (assumes already an EST date key).
 */
export function getDateKeyEST(date = new Date()) {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString('en-CA', { timeZone: DAILY_TIMEZONE });
}

/**
 * Get date as YYYY-MM-DD in local time (legacy; daily feature uses getDateKeyEST).
 */
export function getDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Generate 10 rounds for the given date. Same seed => same rounds for everyone.
 * @param {Date|string} date - Date or YYYY-MM-DD string
 * @returns {{ team: string, position: string, year: number }[]}
 */
export function generateDailyRounds(date) {
  const key = getDateKeyEST(date);
  const seed = hashString(key);
  const rng = createSeededRandom(seed);
  const rounds = [];
  const yearRange = DAILY_YEAR_MAX - DAILY_YEAR_MIN + 1;
  for (let i = 0; i < 10; i++) {
    const team = DAILY_TEAMS[Math.floor(rng() * DAILY_TEAMS.length)];
    const position = DAILY_POSITIONS[Math.floor(rng() * DAILY_POSITIONS.length)];
    const year = DAILY_YEAR_MIN + Math.floor(rng() * yearRange);
    rounds.push({ team, position, year });
  }
  return rounds;
}

/**
 * Get a deterministic candidate (team, position, year) for a given round and attempt.
 * attemptIndex 0 = primary seed for that round; 1, 2, ... = deterministic alternates.
 * Used when the primary has no roster data so we can try the next candidate.
 */
export function getCandidate(date, roundIndex, attemptIndex) {
  const key = getDateKeyEST(date);
  const rounds = generateDailyRounds(date);
  if (attemptIndex === 0) return rounds[roundIndex];
  const seed = hashString(`${key}-${roundIndex}-${attemptIndex}`);
  const rng = createSeededRandom(seed);
  const yearRange = DAILY_YEAR_MAX - DAILY_YEAR_MIN + 1;
  const team = DAILY_TEAMS[Math.floor(rng() * DAILY_TEAMS.length)];
  const position = DAILY_POSITIONS[Math.floor(rng() * DAILY_POSITIONS.length)];
  const year = DAILY_YEAR_MIN + Math.floor(rng() * yearRange);
  return { team, position, year };
}
