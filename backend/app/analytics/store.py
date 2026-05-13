from __future__ import annotations

import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DEFAULT_DB = Path(__file__).resolve().parents[3] / "content_analytics" / "analytics.sqlite"
ANALYTICS_DB_PATH = os.environ.get("CONTENT_ANALYTICS_DB_PATH", str(DEFAULT_DB))

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_time TEXT NOT NULL,
  event_date TEXT NOT NULL,
  session_id TEXT NOT NULL,
  event_name TEXT NOT NULL,
  business_date TEXT,
  page_path TEXT,
  referrer TEXT,
  sector_name TEXT,
  symbol TEXT,
  video_id TEXT,
  scroll_depth_pct REAL,
  reading_seconds REAL,
  payload_json TEXT
);
CREATE INDEX IF NOT EXISTS idx_analytics_events_date ON analytics_events(event_date);
CREATE INDEX IF NOT EXISTS idx_analytics_events_business_date ON analytics_events(business_date);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_symbol ON analytics_events(symbol);
CREATE INDEX IF NOT EXISTS idx_analytics_events_sector ON analytics_events(sector_name);

CREATE TABLE IF NOT EXISTS daily_issue_metrics (
  business_date TEXT PRIMARY KEY,
  issue_views INTEGER DEFAULT 0,
  unique_sessions INTEGER DEFAULT 0,
  market_section_views INTEGER DEFAULT 0,
  sector_section_views INTEGER DEFAULT 0,
  sector_clicks INTEGER DEFAULT 0,
  stock_clicks INTEGER DEFAULT 0,
  featured_stock_views INTEGER DEFAULT 0,
  video_block_views INTEGER DEFAULT 0,
  youtube_clicks INTEGER DEFAULT 0,
  method_note_views INTEGER DEFAULT 0,
  archive_clicks INTEGER DEFAULT 0,
  avg_scroll_depth_pct REAL DEFAULT 0,
  avg_reading_seconds REAL DEFAULT 0,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS sector_interest_daily (
  business_date TEXT NOT NULL,
  sector_name TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  stock_clicks_inside_sector INTEGER DEFAULT 0,
  deep_link_copies INTEGER DEFAULT 0,
  avg_time_seconds REAL DEFAULT 0,
  reader_interest_score REAL DEFAULT 0,
  PRIMARY KEY (business_date, sector_name)
);

CREATE TABLE IF NOT EXISTS stock_interest_daily (
  business_date TEXT NOT NULL,
  symbol TEXT NOT NULL,
  sector_name TEXT,
  row_clicks INTEGER DEFAULT 0,
  teaser_views INTEGER DEFAULT 0,
  featured_views INTEGER DEFAULT 0,
  youtube_clicks INTEGER DEFAULT 0,
  search_hits INTEGER DEFAULT 0,
  deep_link_copies INTEGER DEFAULT 0,
  reader_interest_score REAL DEFAULT 0,
  PRIMARY KEY (business_date, symbol)
);

CREATE TABLE IF NOT EXISTS video_conversion_daily (
  business_date TEXT PRIMARY KEY,
  featured_symbol TEXT,
  video_block_views INTEGER DEFAULT 0,
  youtube_clicks INTEGER DEFAULT 0,
  copy_title_clicks INTEGER DEFAULT 0,
  copy_description_clicks INTEGER DEFAULT 0,
  copy_chapters_clicks INTEGER DEFAULT 0,
  conversion_pct REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS search_terms_daily (
  business_date TEXT,
  search_term TEXT,
  search_scope TEXT,
  searches INTEGER DEFAULT 0,
  result_clicks INTEGER DEFAULT 0,
  no_result_count INTEGER DEFAULT 0,
  PRIMARY KEY (business_date, search_term, search_scope)
);

CREATE TABLE IF NOT EXISTS admin_production_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_time TEXT NOT NULL,
  business_date TEXT NOT NULL,
  action_name TEXT NOT NULL,
  status_before TEXT,
  status_after TEXT,
  payload_json TEXT
);
"""


def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(microsecond=0)


def connect() -> sqlite3.Connection:
    path = Path(os.environ.get("CONTENT_ANALYTICS_DB_PATH", ANALYTICS_DB_PATH))
    path.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(path)
    con.row_factory = sqlite3.Row
    con.executescript(SCHEMA_SQL)
    return con


def as_dict(row: sqlite3.Row | None) -> dict[str, Any]:
    return dict(row) if row is not None else {}


def rows(sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    with connect() as con:
        return [dict(r) for r in con.execute(sql, params).fetchall()]


def one(sql: str, params: tuple[Any, ...] = ()) -> dict[str, Any]:
    with connect() as con:
        return as_dict(con.execute(sql, params).fetchone())


def insert_event(event: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    payload = event.get("payload")
    payload_json = json.dumps(payload or {}, ensure_ascii=False, separators=(",", ":"))
    business_date = event.get("business_date") or _business_date_from_path(event.get("page_path"))
    with connect() as con:
        cur = con.execute(
            """
            INSERT INTO analytics_events (
              event_time, event_date, session_id, event_name, business_date, page_path, referrer,
              sector_name, symbol, video_id, scroll_depth_pct, reading_seconds, payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                now.isoformat(), now.date().isoformat(), event.get("session_id"), event.get("event_name"), business_date,
                event.get("page_path"), event.get("referrer"), event.get("sector_name"), event.get("symbol"), event.get("video_id"),
                event.get("scroll_depth_pct"), event.get("reading_seconds"), payload_json,
            ),
        )
        con.commit()
        return {"id": cur.lastrowid, "event_time": now.isoformat(), "business_date": business_date}


def insert_admin_event(event: dict[str, Any]) -> dict[str, Any]:
    now = utc_now()
    with connect() as con:
        cur = con.execute(
            """
            INSERT INTO admin_production_events (event_time, business_date, action_name, status_before, status_after, payload_json)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                now.isoformat(),
                event["business_date"],
                event["action_name"],
                event.get("status_before"),
                event.get("status_after"),
                json.dumps(event.get("payload") or {}, ensure_ascii=False, separators=(",", ":")),
            ),
        )
        con.commit()
        return {"id": cur.lastrowid, "event_time": now.isoformat()}


def _business_date_from_path(path: str | None) -> str | None:
    if not path:
        return None
    import re
    m = re.search(r"/(?:daily|admin/daily)/(\d{4}-\d{2}-\d{2})", path)
    return m.group(1) if m else None
