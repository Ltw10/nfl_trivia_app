#!/usr/bin/env python3
"""
Populate Supabase with NFL roster data using nfl-data-py.
Set SUPABASE_URL and SUPABASE_KEY (service role or anon) in environment or .env.
"""
import os
import sys
from datetime import date

try:
    import nfl_data_py as nfl
    import pandas as pd
except ImportError:
    print("Install dependencies: pip install -r scripts/requirements.txt")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("Install dependencies: pip install -r scripts/requirements.txt")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# All 32 NFL teams (abbreviation must match nflverse/nfl_data_py)
TEAMS = [
    {"name": "Arizona Cardinals", "abbreviation": "ARI", "city": "Arizona"},
    {"name": "Atlanta Falcons", "abbreviation": "ATL", "city": "Atlanta"},
    {"name": "Baltimore Ravens", "abbreviation": "BAL", "city": "Baltimore"},
    {"name": "Buffalo Bills", "abbreviation": "BUF", "city": "Buffalo"},
    {"name": "Carolina Panthers", "abbreviation": "CAR", "city": "Carolina"},
    {"name": "Chicago Bears", "abbreviation": "CHI", "city": "Chicago"},
    {"name": "Cincinnati Bengals", "abbreviation": "CIN", "city": "Cincinnati"},
    {"name": "Cleveland Browns", "abbreviation": "CLE", "city": "Cleveland"},
    {"name": "Dallas Cowboys", "abbreviation": "DAL", "city": "Dallas"},
    {"name": "Denver Broncos", "abbreviation": "DEN", "city": "Denver"},
    {"name": "Detroit Lions", "abbreviation": "DET", "city": "Detroit"},
    {"name": "Green Bay Packers", "abbreviation": "GB", "city": "Green Bay"},
    {"name": "Houston Texans", "abbreviation": "HOU", "city": "Houston"},
    {"name": "Indianapolis Colts", "abbreviation": "IND", "city": "Indianapolis"},
    {"name": "Jacksonville Jaguars", "abbreviation": "JAX", "city": "Jacksonville"},
    {"name": "Kansas City Chiefs", "abbreviation": "KC", "city": "Kansas City"},
    {"name": "Las Vegas Raiders", "abbreviation": "LV", "city": "Las Vegas"},
    {"name": "Los Angeles Chargers", "abbreviation": "LAC", "city": "Los Angeles"},
    {"name": "Los Angeles Rams", "abbreviation": "LAR", "city": "Los Angeles"},
    {"name": "Miami Dolphins", "abbreviation": "MIA", "city": "Miami"},
    {"name": "Minnesota Vikings", "abbreviation": "MIN", "city": "Minnesota"},
    {"name": "New England Patriots", "abbreviation": "NE", "city": "New England"},
    {"name": "New Orleans Saints", "abbreviation": "NO", "city": "New Orleans"},
    {"name": "New York Giants", "abbreviation": "NYG", "city": "New York"},
    {"name": "New York Jets", "abbreviation": "NYJ", "city": "New York"},
    {"name": "Philadelphia Eagles", "abbreviation": "PHI", "city": "Philadelphia"},
    {"name": "Pittsburgh Steelers", "abbreviation": "PIT", "city": "Pittsburgh"},
    {"name": "San Francisco 49ers", "abbreviation": "SF", "city": "San Francisco"},
    {"name": "Seattle Seahawks", "abbreviation": "SEA", "city": "Seattle"},
    {"name": "Tampa Bay Buccaneers", "abbreviation": "TB", "city": "Tampa Bay"},
    {"name": "Tennessee Titans", "abbreviation": "TEN", "city": "Tennessee"},
    {"name": "Washington Commanders", "abbreviation": "WAS", "city": "Washington"},
]

# nflverse uses "OAK" for Raiders in older years; map to LV for team_id
TEAM_ABBR_ALIASES = {"OAK": "LV", "SD": "LAC", "STL": "LAR"}


def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY") or os.environ.get("SUPABASE_ANON_KEY")
    if not url or not key:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_KEY (or SUPABASE_ANON_KEY) in environment.")
    return create_client(url, key)


def populate_teams(supabase):
    """Insert all 32 NFL teams. Idempotent: run once or clear teams first."""
    existing = supabase.table("nfl_trivia_app_teams").select("id").execute()
    if existing.data and len(existing.data) >= 32:
        print("Teams already populated, skipping.")
        return
    supabase.table("nfl_trivia_app_teams").insert(TEAMS).execute()
    print("Inserted teams.")


def get_team_id_map(supabase):
    """Return dict mapping abbreviation -> team id."""
    r = supabase.table("nfl_trivia_app_teams").select("id, abbreviation").execute()
    abbr_to_id = {row["abbreviation"]: row["id"] for row in r.data}
    for old_abbr, new_abbr in TEAM_ABBR_ALIASES.items():
        if new_abbr in abbr_to_id:
            abbr_to_id[old_abbr] = abbr_to_id[new_abbr]
    return abbr_to_id


def normalize_position(pos):
    """Normalize position to 2–3 char for schema (e.g. QB, RB, WR, TE, OL, LB, DL, CB, S)."""
    if not pos or not isinstance(pos, str):
        return None
    u = pos.upper().strip()
    if len(u) <= 3:
        return u
    # Map long names to short
    mapping = {
        "QUARTERBACK": "QB", "RUNNING BACK": "RB", "WIDE RECEIVER": "WR",
        "TIGHT END": "TE", "OFFENSIVE LINE": "OL", "LINEBACKER": "LB",
        "DEFENSIVE LINE": "DL", "CORNERBACK": "CB", "SAFETY": "S",
        "DEFENSIVE BACK": "DB", "KICKER": "K", "PUNTER": "P", "LONG SNAPPER": "LS",
        "GUARD": "OG", "TACKLE": "OT", "CENTER": "OC", "OLB": "LB", "ILB": "LB",
        "DE": "DL", "DT": "DL", "NT": "DL",
    }
    return mapping.get(u, u[:3] if len(u) >= 3 else u)


def build_depth_rank_lookup(years):
    """
    Load depth charts (2001+) and return (team_abbr, season, position, name) -> best rank.
    Uses week 1 only for "opening" depth chart. Rank 1 = WR1, 2 = WR2, etc.
    """
    depth_years = [y for y in years if y >= 2001]
    if not depth_years:
        return {}
    try:
        depth = nfl.import_depth_charts(depth_years)
    except Exception as e:
        print(f"Depth charts load failed (skipping depth_rank): {e}")
        return {}
    if depth is None or depth.empty:
        return {}

    team_col = "club_code" if "club_code" in depth.columns else "team"
    name_col = "full_name" if "full_name" in depth.columns else "player_name"
    rank_col = "depth_team" if "depth_team" in depth.columns else "pos_rank"
    pos_col = "depth_chart_position" if "depth_chart_position" in depth.columns else "position"
    if pos_col not in depth.columns and "pos_abb" in depth.columns:
        pos_col = "pos_abb"
    if team_col not in depth.columns or name_col not in depth.columns:
        return {}
    if rank_col not in depth.columns:
        return {}

    week_col = "week" if "week" in depth.columns else None
    if week_col:
        depth = depth[depth[week_col] == 1]

    lookup = {}
    for _, row in depth.iterrows():
        team = row.get(team_col)
        season = row.get("season")
        name = row.get(name_col)
        pos = normalize_position(row.get(pos_col))
        rank = row.get(rank_col)
        if pd_is_na(team) or pd_is_na(season) or pd_is_na(name) or not pos or pd_is_na(rank):
            continue
        team = str(team).strip().upper()
        team = TEAM_ABBR_ALIASES.get(team, team)
        name = str(name).strip()
        try:
            rank = int(rank)
        except (TypeError, ValueError):
            continue
        key = (team, int(season), pos, name)
        if key not in lookup or rank < lookup[key]:
            lookup[key] = rank
    return lookup


def populate_players(supabase, start_year=2000, end_year=None, batch_size=500):
    """Fetch rosters from nfl-data-py and upsert into Supabase with optional depth_rank."""
    if end_year is None:
        end_year = _latest_available_season()
    years = list(range(start_year, end_year + 1))
    print(f"Loading rosters for {start_year}-{end_year}...")
    rosters = nfl.import_seasonal_rosters(years)
    if rosters is None or rosters.empty:
        print("No roster data returned.")
        return

    print("Loading depth charts (for depth_rank ordering)...")
    depth_lookup = build_depth_rank_lookup(years)

    name_col = "player_name" if "player_name" in rosters.columns else "full_name"
    if name_col not in rosters.columns:
        name_col = [c for c in rosters.columns if "name" in c.lower()]
        name_col = name_col[0] if name_col else None
    if name_col is None:
        print("Could not find player name column:", list(rosters.columns))
        return

    team_id_map = get_team_id_map(supabase)
    rows = []
    for _, row in rosters.iterrows():
        team_abbr = row.get("team")
        if pd_is_na(team_abbr):
            continue
        team_abbr = str(team_abbr).strip().upper()
        team_abbr = TEAM_ABBR_ALIASES.get(team_abbr, team_abbr)
        team_id = team_id_map.get(team_abbr)
        if team_id is None:
            continue
        season = row.get("season")
        if pd_is_na(season):
            continue
        year = int(season)
        pos = normalize_position(row.get("position"))
        if not pos:
            continue
        name = row.get(name_col)
        if pd_is_na(name) or not str(name).strip():
            continue
        espn_id = row.get("espn_id")
        if pd_is_na(espn_id):
            espn_id = None
        else:
            espn_id = str(espn_id).strip() or None
        depth_rank = depth_lookup.get((team_abbr, year, pos, str(name).strip()))
        rows.append({
            "name": str(name).strip()[:200],
            "team_id": team_id,
            "position": pos[:10],
            "year": year,
            "espn_id": espn_id,
            "depth_rank": depth_rank,
        })

    # Deduplicate by (name, team_id, year) so each batch has no duplicates (PostgreSQL
    # ON CONFLICT cannot affect the same row twice in one command).
    seen = {}
    for r in rows:
        key = (r["name"], r["team_id"], r["year"])
        seen[key] = r
    rows = list(seen.values())

    print(f"Upserting {len(rows)} player rows...")
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        supabase.table("nfl_trivia_app_players").upsert(batch, on_conflict="name,team_id,year").execute()
    print("Players populated.")


def pd_is_na(x):
    return pd.isna(x)


# nflverse roster/depth releases may lag; avoid 404s by not requesting future seasons.
def _latest_available_season():
    y = date.today().year
    return min(y, 2025)


def main():
    start = 2000
    end = _latest_available_season()
    if len(sys.argv) >= 2:
        start = int(sys.argv[1])
    if len(sys.argv) >= 3:
        end = int(sys.argv[2])

    supabase = get_supabase()
    populate_teams(supabase)
    populate_players(supabase, start_year=start, end_year=end)


if __name__ == "__main__":
    main()
