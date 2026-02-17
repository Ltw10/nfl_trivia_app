# Luck of the Draw – NFL Trivia

A React trivia game where players spin wheels to get **Team**, **Position**, and **Year**, then guess an NFL player that matches. First to reach the target score wins.

## Architecture

- **Frontend:** React 18 (Vite), hosted on GitHub Pages
- **Backend / DB:** Supabase (PostgreSQL)
- **Data source:** Roster + depth chart data via Python script using `nfl-data-py` (depth chart from 2001+ for WR1/WR2-style ordering)

## Setup

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the migration: `supabase/migrations/001_schema.sql`. It is idempotent (safe to re-run on an existing DB).
3. Copy your project URL and anon key from Settings → API.

### 2. Populate the database

Use a Python virtual environment to run the `scripts/populate_database.py` script (which loads roster data via `nfl-data-py` into Supabase).

**Create and activate a virtual env**

From the project root:

```bash
cd /path/to/nfl_trivia_app

# Create the virtual environment (Python 3.8+)
python3 -m venv .venv

# Activate it:
# On macOS/Linux:
source .venv/bin/activate
# On Windows (Command Prompt):
# .venv\Scripts\activate.bat
# On Windows (PowerShell):
# .venv\Scripts\Activate.ps1
```

You should see `(.venv)` in your prompt. All following commands assume this venv is active.

**Install dependencies and run the script**

```bash
pip install -r scripts/requirements.txt
```

Set your Supabase credentials (use the URL and anon key from Supabase → Settings → API). Either export them or put them in a `.env` in the project root (the script loads `.env` if `python-dotenv` is installed):

```bash
# Option A: export for this shell session
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_KEY="your-anon-key"

# Option B: add to .env (do not commit)
# SUPABASE_URL=https://your-project.supabase.co
# SUPABASE_KEY=your-anon-key
```

Then run the script:

```bash
python scripts/populate_database.py
```

Optional: limit the year range (default is 2000 through current year):

```bash
python scripts/populate_database.py 2010 2025
```

When finished, you can leave the virtual env with `deactivate`.

### 3. React app

```bash
npm install
cp .env.example .env
# Edit .env: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### 4. Deploy to GitHub Pages

1. In the repo **Settings → Pages**, set **Source** to **GitHub Actions** (so deploys use the workflow).
2. In **Settings → Secrets and variables → Actions**, add repository secrets:
   - `VITE_SUPABASE_URL` — your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` — your Supabase anon/public key
3. Deploy:
   - **From a push:** Push to `main`; the workflow builds and deploys automatically.
   - **From the GitHub UI:** Open the **Actions** tab → **Deploy to GitHub Pages** → **Run workflow** (branch: main) → **Run workflow**.
4. The site will be at `https://<username>.github.io/nfl_trivia_app/` (already set via `base` in `vite.config.js`).

## Project structure

```
├── public/
├── src/
│   ├── components/   # GameSetup, WheelSlot, GameBoard, PlayerInput, Scoreboard, WinnerScreen
│   ├── hooks/       # useGameState, usePlayerSearch
│   ├── services/    # supabaseClient, gameLogic
│   └── utils/       # constants, validators
├── scripts/         # populate_database.py
├── supabase/migrations/   # 001_schema.sql (full schema, idempotent)
└── .github/workflows/deploy-pages.yml
```

## Tech stack

- **Frontend:** React 18, Vite, CSS
- **Backend:** Supabase (PostgreSQL)
- **Data:** nfl-data-py → Supabase (Option 1: pre-populate)
- **Hosting:** GitHub Pages
- **CI/CD:** GitHub Actions
