"""Read-only SQL access for the local AI (tool calling).

Lets the local model CHECK real numbers in the user's database instead of
guessing from RAG excerpts. Defense in depth: the connection is opened
read-only at the SQLite level (file:...?mode=ro), on top of that only a single
SELECT/WITH statement passes validation, and results are capped at MAX_ROWS.
Every tool round-trip ends up in the prompt log like any other AI call.
"""
import re
import sqlite3

import db as _db

MAX_ROWS = 40

_FORBID = re.compile(
    r"(?i)(^|[^a-z0-9_])(insert|update|delete|drop|alter|create|attach|detach"
    r"|pragma|vacuum|reindex|replace|begin|commit)($|[^a-z0-9_])")


def _connect():
    path = _db.get_finance_dir() / "finance.db"
    con = sqlite3.connect(f"file:{path}?mode=ro", uri=True, timeout=3)
    con.row_factory = sqlite3.Row
    return con


def schema_summary(max_cols=14):
    """Compact 'table(col, col…)' map handed to the model in the tool description."""
    try:
        con = _connect()
        tables = [r[0] for r in con.execute(
            "select name from sqlite_master where type='table' "
            "and name not like 'sqlite_%' order by name")]
        parts = []
        for t in tables:
            cols = [r[1] for r in con.execute(f"pragma table_info({t})")][:max_cols]
            parts.append(f"{t}({', '.join(cols)})")
        con.close()
        return "; ".join(parts)
    except Exception:
        return ""


def run_select(sql=""):
    """Execute ONE SELECT and return rows as dicts; any violation → error dict."""
    q = (sql or "").strip().rstrip(";").strip()
    if not re.match(r"(?i)^(select|with)\b", q):
        return {"ok": False, "error": "only a single SELECT (or WITH…SELECT) is allowed"}
    if ";" in q:
        return {"ok": False, "error": "multiple statements are not allowed"}
    if _FORBID.search(q):
        return {"ok": False, "error": "write/DDL keywords are not allowed"}
    try:
        con = _connect()
        rows = [dict(r) for r in con.execute(q).fetchmany(MAX_ROWS)]
        con.close()
        return {"ok": True, "rows": rows, "truncated": len(rows) == MAX_ROWS}
    except Exception as e:
        return {"ok": False, "error": str(e)[:200]}
