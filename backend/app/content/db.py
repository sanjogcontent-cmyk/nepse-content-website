from __future__ import annotations

import sqlite3
from pathlib import Path


def connect_readonly(path: str | Path) -> sqlite3.Connection:
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"Database not found: {path}")
    uri = f"file:{path}?mode=ro"
    con = sqlite3.connect(uri, uri=True)
    con.row_factory = sqlite3.Row
    return con


def attach_database(con: sqlite3.Connection, alias: str, path: str | Path | None) -> bool:
    if not path:
        return False
    path = Path(path)
    if not path.exists():
        return False
    con.execute(f"ATTACH DATABASE ? AS {alias}", (str(path),))
    return True
