"""
Kentucky Wildcats Men's Basketball Historical Scraper + Supabase Uploader
Source: Sports-Reference.com (CBB)
Covers seasons: 1990-91 through 2024-25

Setup:
  pip install requests beautifulsoup4 supabase

Usage:
  1. Apply supabase/migrations/005_uk_basketball_game.sql (schema uky_bball) to your project
  2. Set your env vars (see below) or paste values directly
  3. python scrape_kentucky_bball.py

The script is safe to re-run — upserts prevent duplicate rows.
"""

import os
import time
from collections import defaultdict

import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

# ----------------------------------------------------------
# Configuration
# Set these as environment variables, or paste values here.
# Use your SERVICE ROLE key (not anon key) so it bypasses RLS.
#
#   export SUPABASE_URL=https://xxxx.supabase.co
#   export SUPABASE_KEY=your_service_role_key_here
# ----------------------------------------------------------
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://YOUR_PROJECT.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "YOUR_SERVICE_ROLE_KEY")

UKY_BBALL_SCHEMA = "uky_bball"
# Keep aligned with src/services/supabaseClient.js (UKY_BBALL).
UKY_BBALL_TABLE = {
    "players": "uky_bball_guesser_players",
    "player_seasons": "uky_bball_guesser_player_seasons",
}
UKY_BBALL_VIEW = {
    "player_full": "uky_bball_guesser_player_full",
}


def uky_db(client: Client):
    """PostgREST schema for Kentucky guesser tables (migration 005)."""
    return client.schema(UKY_BBALL_SCHEMA)

BASE_URL   = "https://www.sports-reference.com/cbb/schools/kentucky/men/{year}.html"
START_YEAR = 1991   # 1990-91 season
END_YEAR   = 2025   # 2024-25 season
SLEEP_SEC  = 3.5    # polite delay between page requests

SCRAPER_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (research/personal project) "
        "AppleWebKit/537.36 Chrome/120 Safari/537.36"
    )
}


# ----------------------------------------------------------
# Helpers
# ----------------------------------------------------------

def season_label(year: int) -> str:
    """1991 -> '1990-91'"""
    return f"{year - 1}-{str(year)[2:]}"


def safe_float(v) -> float | None:
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def safe_int(v) -> int | None:
    try:
        return int(v)
    except (ValueError, TypeError):
        return None


# ----------------------------------------------------------
# Scraping
# ----------------------------------------------------------

def parse_roster_page(html: str, year: int) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    season = season_label(year)
    players = []

    table = soup.find("table", {"id": "per_game"})
    if table is None:
        print(f"  [!] No per_game table for {season}, trying roster table...")
        table = soup.find("table", {"id": "roster"})
    if table is None:
        print(f"  [!] No usable table — skipping {season}")
        return []

    tbody = table.find("tbody")
    if not tbody:
        return []

    for row in tbody.find_all("tr"):
        if row.get("class") and "thead" in row.get("class"):
            continue

        def cell(data_stat):
            td = row.find(["td", "th"], {"data-stat": data_stat})
            return td.get_text(strip=True) if td else ""

        name = cell("player")
        if not name:
            continue

        jersey = cell("number") or cell("uniform_number") or None

        players.append({
            "name":          name,
            "season":        season,
            "year_end":      year,
            "jersey_number": jersey or None,
            "class_year":    cell("class_year") or cell("year_in_school") or None,
            "position":      cell("pos") or None,
            "games":         safe_int(cell("g")),
            "games_started": safe_int(cell("gs")),
            "minutes_pg":    safe_float(cell("mp_per_g")),
            "ppg":           safe_float(cell("pts_per_g")),
            "rpg":           safe_float(cell("trb_per_g")),
            "apg":           safe_float(cell("ast_per_g")),
            "spg":           safe_float(cell("stl_per_g")),
            "bpg":           safe_float(cell("blk_per_g")),
            "fg_pct":        safe_float(cell("fg_pct")),
            "three_pct":     safe_float(cell("fg3_pct")),
            "ft_pct":        safe_float(cell("ft_pct")),
        })

    return players


def fetch_season(year: int) -> list[dict]:
    url = BASE_URL.format(year=year)
    season = season_label(year)
    print(f"Fetching {season} → {url}")
    try:
        resp = requests.get(url, headers=SCRAPER_HEADERS, timeout=15)
        if resp.status_code == 429:
            print("  [!] Rate limited — sleeping 60s then retrying...")
            time.sleep(60)
            resp = requests.get(url, headers=SCRAPER_HEADERS, timeout=15)
        if resp.status_code != 200:
            print(f"  [!] HTTP {resp.status_code} — skipping {season}")
            return []
        records = parse_roster_page(resp.text, year)
        print(f"  → {len(records)} players found")
        return records
    except Exception as e:
        print(f"  [!] Error: {e}")
        return []


def scrape_all() -> list[dict]:
    all_records = []
    for year in range(START_YEAR, END_YEAR + 1):
        records = fetch_season(year)
        all_records.extend(records)
        time.sleep(SLEEP_SEC)
    return all_records


# ----------------------------------------------------------
# Career stat aggregation
# ----------------------------------------------------------

def weighted_avg(season_stats: list[dict], field: str) -> float | None:
    pairs = [
        (s[field], s["games"])
        for s in season_stats
        if s.get(field) is not None and s.get("games")
    ]
    if not pairs:
        return None
    total_games = sum(g for _, g in pairs)
    return round(sum(v * g for v, g in pairs) / total_games, 2) if total_games else None


def build_player_index(all_records: list[dict]) -> dict:
    index = defaultdict(lambda: {"name": "", "season_stats": []})
    for rec in all_records:
        key = rec["name"].strip().lower()
        index[key]["name"] = rec["name"]
        index[key]["season_stats"].append(rec)
    return index


# ----------------------------------------------------------
# Supabase upsert logic
# ----------------------------------------------------------

def upsert_players(supabase: Client, player_index: dict) -> dict[str, int]:
    """
    Upsert each unique player into the `players` table.
    Returns a mapping of lowercase player name -> player.id
    """
    name_to_id = {}

    for key, data in player_index.items():
        stats = data["season_stats"]
        player_row = {
            "name":       data["name"],
            "career_ppg": weighted_avg(stats, "ppg"),
            "career_rpg": weighted_avg(stats, "rpg"),
            "career_apg": weighted_avg(stats, "apg"),
            "career_spg": weighted_avg(stats, "spg"),
            "career_bpg": weighted_avg(stats, "bpg"),
        }

        result = (
            uky_db(supabase).table(UKY_BBALL_TABLE["players"])
            .upsert(player_row, on_conflict="name")
            .execute()
        )

        if result.data:
            name_to_id[key] = result.data[0]["id"]
        else:
            # Upsert on conflict may not return data — fetch it
            existing = (
                uky_db(supabase).table(UKY_BBALL_TABLE["players"])
                .select("id")
                .eq("name", data["name"])
                .single()
                .execute()
            )
            name_to_id[key] = existing.data["id"]

    print(f"  Players upserted: {len(name_to_id)}")
    return name_to_id


def upsert_player_seasons(supabase: Client, all_records: list[dict], name_to_id: dict[str, int]):
    """
    Upsert all player-season rows in batches of 100.
    Conflict target: (player_id, season)
    """
    rows = []
    for rec in all_records:
        key = rec["name"].strip().lower()
        player_id = name_to_id.get(key)
        if not player_id:
            print(f"  [!] No player_id for '{rec['name']}' — skipping {rec['season']}")
            continue

        rows.append({
            "player_id":     player_id,
            "season":        rec["season"],
            "year_end":      rec["year_end"],
            "jersey_number": rec["jersey_number"],
            "class_year":    rec["class_year"],
            "position":      rec["position"],
            "games":         rec["games"],
            "games_started": rec["games_started"],
            "minutes_pg":    rec["minutes_pg"],
            "ppg":           rec["ppg"],
            "rpg":           rec["rpg"],
            "apg":           rec["apg"],
            "spg":           rec["spg"],
            "bpg":           rec["bpg"],
            "fg_pct":        rec["fg_pct"],
            "three_pct":     rec["three_pct"],
            "ft_pct":        rec["ft_pct"],
        })

    BATCH_SIZE = 100
    total = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        uky_db(supabase).table(UKY_BBALL_TABLE["player_seasons"]).upsert(
            batch,
            on_conflict="player_id,season"
        ).execute()
        total += len(batch)
        print(f"  Upserted {total}/{len(rows)} player-seasons...")

    print(f"  Done — {total} player-season rows in Supabase.")


# ----------------------------------------------------------
# Main
# ----------------------------------------------------------

def main():
    if "YOUR_PROJECT" in SUPABASE_URL or "YOUR_SERVICE_ROLE_KEY" in SUPABASE_KEY:
        print("ERROR: Supabase credentials not set.")
        print("  export SUPABASE_URL=https://xxxx.supabase.co")
        print("  export SUPABASE_KEY=your_service_role_key_here")
        return

    print("=" * 60)
    print("  Kentucky Basketball Scraper → Supabase")
    print("=" * 60)

    # 1. Connect
    print("\nConnecting to Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("  Connected!")

    # 2. Scrape
    print(f"\nScraping {season_label(START_YEAR)} through {season_label(END_YEAR)}...\n")
    all_records = scrape_all()

    if not all_records:
        print("\nNo data scraped. Check network or Sports-Reference availability.")
        return

    print(f"\nTotal player-season records scraped: {len(all_records)}")

    # 3. Group by player
    player_index = build_player_index(all_records)
    print(f"Unique players found: {len(player_index)}")

    # 4. Upsert players table
    print("\nUpserting players...")
    name_to_id = upsert_players(supabase, player_index)

    # 5. Upsert uky_bball_guesser_player_seasons table
    print("\nUpserting uky_bball_guesser_player_seasons...")
    upsert_player_seasons(supabase, all_records, name_to_id)

    print("\n✅ All done! Your Supabase database is populated.")
    print(f"   Use {UKY_BBALL_SCHEMA}.{UKY_BBALL_VIEW['player_full']} for clean guesser queries.")


if __name__ == "__main__":
    main()