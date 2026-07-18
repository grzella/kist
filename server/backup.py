"""Back up the local database to a folder your cloud client already syncs.

Principle (local-first): we do NOT talk to the Google/Dropbox APIs and keep no
OAuth keys. We write a consistent snapshot of the database into a local folder
that your desktop Google Drive / Dropbox / iCloud client then pushes to the
cloud. No keys, works with any of those providers.

The snapshot uses SQLite's online backup API (safe with WAL). Optionally, when
`cryptography` is installed and BACKUP_KEY is set, the file is encrypted (Fernet)
— useful since it lands in the cloud.
"""
import base64
import hashlib
import os
import sqlite3
from datetime import datetime
from pathlib import Path

import engine_bridge as eb
import planner

KEEP = 14              # how many recent backups to keep
SUBDIR = "financeapp-backups"


def _db_path():
    for r in eb._rows("PRAGMA database_list"):
        if r.get("name") == "main" and r.get("file"):
            return r["file"]
    return None


def _first(base: Path, pattern: str):
    try:
        return next(iter(sorted(base.glob(pattern))), None)
    except Exception:
        return None


def list_destinations():
    """Detect common cloud-synced folders (only ones that exist)."""
    home = Path.home()
    cs = home / "Library/CloudStorage"
    cands = [
        ("gdrive", "Google Drive", _first(cs, "GoogleDrive-*/My Drive") or _first(cs, "GoogleDrive-*")),
        ("gdrive_legacy", "Google Drive", home / "Google Drive"),
        ("dropbox", "Dropbox", home / "Dropbox"),
        ("dropbox_cs", "Dropbox", _first(cs, "Dropbox*")),
        ("icloud", "iCloud Drive", home / "Library/Mobile Documents/com~apple~CloudDocs"),
    ]
    seen, out = set(), []
    for key, label, p in cands:
        if p and Path(p).exists() and str(p) not in seen:
            seen.add(str(p))
            out.append({"key": key, "label": label, "path": str(p)})
    return out


def _folder():
    d = planner.get_setting("backup_dir")
    return os.path.join(d, SUBDIR) if d else None


def _maybe_encrypt(path):
    """Encrypt with Fernet if cryptography is available and BACKUP_KEY is set."""
    key = os.environ.get("BACKUP_KEY", "")
    if not key:
        return path, False
    try:
        from cryptography.fernet import Fernet
    except Exception:
        return path, False
    fkey = base64.urlsafe_b64encode(hashlib.sha256(key.encode()).digest())
    data = Path(path).read_bytes()
    enc = path + ".enc"
    Path(enc).write_bytes(Fernet(fkey).encrypt(data))
    os.remove(path)
    return enc, True


def _prune(folder):
    files = sorted(Path(folder).glob("finance-*.db*"), key=lambda p: p.stat().st_mtime, reverse=True)
    for old in files[KEEP:]:
        try:
            old.unlink()
        except Exception:
            pass


def set_destination(path):
    planner.set_settings({"backup_dir": path})
    return {"ok": True, "dir": path}


def create_backup():
    folder = _folder()
    if not folder:
        return {"ok": False, "error": "no backup folder set — choose one in Control Center"}
    src = _db_path()
    if not src or not os.path.exists(src):
        return {"ok": False, "error": "database file not found"}
    os.makedirs(folder, exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d-%H%M%S")
    out = os.path.join(folder, f"finance-{ts}.db")
    s = sqlite3.connect(src)
    d = sqlite3.connect(out)
    try:
        s.backup(d)          # consistent snapshot (handles WAL)
    finally:
        d.close()
        s.close()
    final, encrypted = _maybe_encrypt(out)
    _prune(folder)
    size = os.path.getsize(final)
    return {"ok": True, "file": os.path.basename(final), "dir": folder,
            "encrypted": encrypted, "size_kb": round(size / 1024, 1)}


def status():
    d = planner.get_setting("backup_dir") or ""
    folder = _folder()
    last, count = None, 0
    if folder and os.path.isdir(folder):
        files = sorted(Path(folder).glob("finance-*.db*"), key=lambda p: p.stat().st_mtime, reverse=True)
        count = len(files)
        if files:
            f = files[0]
            last = {"name": f.name,
                    "when": datetime.fromtimestamp(f.stat().st_mtime).isoformat(timespec="minutes")}
    enc_ready = bool(os.environ.get("BACKUP_KEY"))
    try:
        import cryptography  # noqa: F401
        enc_avail = True
    except Exception:
        enc_avail = False
    return {"dir": d, "configured": bool(d), "last": last, "count": count,
            "destinations": list_destinations(),
            "encryption": {"on": enc_ready and enc_avail, "lib": enc_avail,
                           "hint": "" if enc_avail else "optional: pip install cryptography + BACKUP_KEY in .env"}}
