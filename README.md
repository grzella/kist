# Finance & Career Command Center

A **self-hosted, local-first** web app that turns scattered personal finances and career signals into one decision cockpit. Runs entirely on your machine — a Flask backend, a single SQLite file, and vanilla-JS frontend with no build step.

> **Your data never leaves your machine.** All personal data lives in a local, git-ignored SQLite database (`.finance/finance.db`). This repo ships **no personal data** — only code. A `seed.py` script fills a fresh clone with obviously-fake sample data, and a **demo mode** masks every figure for safe screenshots.

## Features

- **Cash-flow** — month-by-month liquidity projection (income, vests, bonus vs costs and overpayments); shows when debt clears and liquidity ramps.
- **Forecasts** — work-optional (FIRE) projection to a liquid-portfolio target with return scenarios + inflation-adjusted crossover and milestones; plan-vs-actual monthly tracking; mortgage-overpayment calculator.
- **Wealth / Allocation** — net-worth items with debt-linked equity; asset allocation with concentration flags.
- **Debts** — loans with principal/interest split, effective rate, and overpayment scenarios.
- **Taxes** — consolidated tax sources + a payment calendar.
- **FX** — a currency signal engine (level + trend + momentum + mean-reversion) with a historical **backtest hit-rate** and a conversion assistant.
- **Equity/RSU** — Monte-Carlo price projection on real historical volatility with a self-scoring prediction backtest.
- **Career** — job-offer tracker, a job-market barometer, and a daily commit-activity tracker.
- **Control Center** — health of every automated task (market data, backups, git sync, secret scan…), reminders, and a demo-mode toggle.

## Quick start

```bash
git clone https://github.com/grzella/financeapp.git
cd financeapp
pip install -r requirements.txt
cp .env.example .env          # optional — see "Connecting your own services"
python3 seed.py               # fill a fresh DB with sample data (skips if data exists)
./run.sh                      # → http://127.0.0.1:8321
```

Toggle **demo mode** in Control Center (or add `?demo` to the URL) to mask all figures.

## Connecting your own services (all optional)

The app **runs fully offline** with no external services. Live market data and AI are opt-in:

- **Market data (stock/FX quotes)** — the app reads public prices from a Supabase table. To enable:
  1. Create a free [Supabase](https://supabase.com) project and a `market_prices` table (`ticker, date, close, currency`) + `market_watchlist` (`ticker, notes`).
  2. Put your keys in `.env`: `SUPABASE_URL=…`, `SUPABASE_ANON_KEY=…`.
  3. Feed the table daily however you like — e.g. an [n8n](https://n8n.io) workflow that pulls quotes (Yahoo/Stooq) and upserts into Supabase. Without this, market/RSU/FX views simply show "no data".
- **AI assistant (optional)** — the app itself needs no LLM. Some snapshot content (analyses) is authored offline. If you want an AI layer, wire your own (Claude/OpenAI/local) around the JSON API — nothing here calls a model at runtime.
- **Commit tracker** — set `commit_repos` (comma-separated repo paths) and `commit_author` in settings, or the `COMMIT_REPOS` / `COMMIT_AUTHOR` env vars. Blank author = count all commits.

## Data & privacy

- `.finance/`, `.env`, and `backups/` are git-ignored — **never commit them**.
- `seed.py` refuses to run if the DB already has data (protects real data; use `--force` to override on a throwaway DB).
- Demo mode masks currency figures with a `0-1` pattern and hides chart axis values.

## Tech

Python + Flask, SQLite (WAL), vanilla JS + Chart.js. Self-contained SQLite layer (`server/db.py`) — no external dependencies beyond Flask + requests.

## Contributing

Issues and PRs welcome — market-data adapters, new forecasts, i18n, and UX especially. Easy to run locally with the seed data.

## License

MIT © Łukasz Grzella
