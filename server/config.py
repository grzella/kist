"""App configuration: .env parsing and path resolution."""
import os
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent          # financeapp root (server/..)


def load_env():
    """Parse .env into os.environ (stdlib, no python-dotenv)."""
    env_file = APP_DIR / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip())


def setup():
    """Set FINANCE_PROJECT_DIR and load .env. Call before importing engines."""
    os.environ.setdefault("FINANCE_PROJECT_DIR", str(APP_DIR))
    load_env()
    return {
        "port": int(os.environ.get("PORT", "8321")),
        "supabase_url": os.environ.get("SUPABASE_URL", ""),
        "supabase_key": os.environ.get("SUPABASE_ANON_KEY", ""),
        "finance_dir": os.environ["FINANCE_PROJECT_DIR"] + "/.finance",
    }
