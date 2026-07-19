#!/usr/bin/env python3
"""Build the static, clickable GitHub Pages demo.

Seeds a THROWAWAY database with the fake "Alex Demo" persona, enriches it so
every module has something to show, snapshots every GET endpoint to a JSON
file, and assembles `dist/` — the real frontend plus those snapshots. The
published page is the actual app UI; api.js serves GETs from the baked files
when window.KIST_STATIC_DEMO is set, and writes become a friendly no-op.

Usage:  python3 demo/build_demo.py [--out dist]
Runs offline too — Yahoo enrichment is best-effort; without network the demo
simply has thinner market charts.
"""
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else ROOT / "dist")

# --- throwaway data dir, seeded with the sample persona ---
data_dir = Path(tempfile.mkdtemp(prefix="kist-demo-"))
os.environ["FINANCE_PROJECT_DIR"] = str(data_dir)
subprocess.run([sys.executable, str(ROOT / "seed.py")], check=True,
               env={**os.environ}, cwd=ROOT)

sys.path.insert(0, str(ROOT / "server"))
import config  # noqa: E402
config.setup()
import planner  # noqa: E402
import market  # noqa: E402

TICKERS = ["AAPL", "MSFT", "VWCE.DE", "EURPLN=X", "USDPLN=X"]


def best_effort(label, fn, *a, **kw):
    try:
        return fn(*a, **kw)
    except Exception as e:
        print(f"  (skipped {label}: {str(e)[:80]})")
        return None


# --- enrich: every module on, wizard done, data behind every view ---
print("Enriching demo data…")
planner.save_app_config({"wizard_completed": True,
                         "modules": {"debts": True, "taxes": True, "markets": True,
                                     "rsu": True, "business": True, "career": True,
                                     "property": True}})

for t in TICKERS:
    best_effort(f"yahoo {t}", market.fetch_yahoo_history, t, "2y")

try:
    import risk_radar
    best_effort("risk radar", risk_radar.backfill, 32)
except Exception:
    pass
best_effort("forecast journal", market.backfill_forecasts, 10)

for e in [
    {"date": "2026-05-14", "kind": "revenue", "category": "services", "amount": 4200,
     "description": "Aerial photo shoot — sample entry"},
    {"date": "2026-06-02", "kind": "cost", "category": "equipment", "amount": -1150,
     "description": "Spare propellers & batteries — sample entry"},
    {"date": "2026-06-20", "kind": "revenue", "category": "services", "amount": 3600,
     "description": "Roof inspection flight — sample entry"},
]:
    best_effort("biz entry", planner.add_biz_entry, e)

# a handcrafted market brief so the AI-brief card renders (no LLM in CI)
brief = {
    "headline": "Markets are drifting sideways while rate-cut expectations firm up; "
                "nothing in this demo portfolio needs action this week.",
    "as_of": "2026-07-19", "generated_by": "demo snapshot",
    "regime": "Calm — carry on with the plan",
    "highlights": [
        {"icon": "📈", "title": "Equities steady", "text": "Broad indices near highs on soft-landing hopes."},
        {"icon": "💱", "title": "EUR/PLN quiet", "text": "Złoty range-bound; no conversion signal."},
        {"icon": "🏦", "title": "Rates drifting down", "text": "Markets price gradual cuts into year-end."},
        {"icon": "🛢️", "title": "Oil calm", "text": "Supply steady; inflation pass-through muted."},
    ],
    "geopolitics": [
        {"title": "Why this matters for a long-term plan",
         "text": "Sample context written for the demo: headlines move daily prices, "
                 "but the plan only reacts when thresholds are crossed."}],
    "positions": [
        {"ticker": "VWCE.DE", "stance": "hold", "text": "Core holding — keep the monthly auto-invest."},
        {"ticker": "AAPL", "stance": "hold", "text": "RSU exposure already large; don't add."},
        {"ticker": "EURPLN=X", "stance": "hold", "text": "No signal — wait for the engine's threshold."}],
    "method_note": "Demo brief — in the real app this is generated daily by YOUR local model "
                   "from cached quotes, schema-locked so it always renders.",
}
planner.set_settings({"analysis_market_brief_daily": json.dumps(brief),
                      "analysis_market_brief": json.dumps({**brief, "as_of": "2026-07-14",
                          "headline": "Weekly view: same picture — stay the course. "
                                      "(Demo copy of the weekly brief.)"})})

# --- snapshot every GET endpoint ---
import app as kist_app  # noqa: E402

client = kist_app.app.test_client()


def fname(path_q):
    return re.sub(r"[^A-Za-z0-9._-]", "_", path_q.lstrip("/")) + ".json"


snap_dir = OUT / "demo-data"
if OUT.exists():
    shutil.rmtree(OUT)
snap_dir.mkdir(parents=True)

paths = sorted(str(r) for r in kist_app.app.url_map.iter_rules()
               if "GET" in r.methods and not r.arguments and str(r).startswith("/api"))
for t in TICKERS:
    paths += [f"/api/market/prices/{t}?days=100000",
              f"/api/market/analytics/{t}",
              f"/api/forecast/bands/{t}"]

ok = fail = 0
for p in paths:
    try:
        r = client.get(p)
        if r.status_code == 200 and r.is_json:
            (snap_dir / fname(p)).write_text(json.dumps(r.get_json(), ensure_ascii=False))
            ok += 1
        else:
            fail += 1
            print(f"  skip {p} ({r.status_code})")
    except Exception as e:
        fail += 1
        print(f"  skip {p} ({str(e)[:60]})")
print(f"Snapshots: {ok} saved, {fail} skipped")

# watchlist runs on Supabase in a real install — bake a matching offline shape
(snap_dir / fname("/api/watchlist")).write_text(json.dumps(
    [{"ticker": t, "added_at": None, "notes": "demo"} for t in TICKERS]))

# --- assemble dist: the real frontend, relative paths, demo flag ---
for d in ("css", "js", "vendor"):
    shutil.copytree(ROOT / "static" / d, OUT / d)
html = (ROOT / "static" / "index.html").read_text()
html = html.replace('"/static/', '"')
html = html.replace("<script", '<script>window.KIST_STATIC_DEMO=1</script>\n  <script', 1)
(OUT / "index.html").write_text(html)
(OUT / ".nojekyll").write_text("")

print(f"✅ Demo built → {OUT}  (open {OUT / 'index.html'} via any static server)")
