from __future__ import annotations

import sqlite3
from .config import SECTOR_TO_INDEX_CODE


def _has_idx_object(con: sqlite3.Connection, name: str) -> bool:
    row = con.execute(
        """
        SELECT 1
        FROM idx.sqlite_master
        WHERE type IN ('table','view') AND name = ?
        LIMIT 1
        """,
        (name,),
    ).fetchone()
    return row is not None


def _snapshot_from_divisor(con: sqlite3.Connection, index_code: str, business_date: str) -> dict | None:
    row = con.execute(
        """
        SELECT index_code, business_date, reported_close, cap_sum, implied_divisor,
               missing_prices, missing_shares
        FROM idx.index_divisor
        WHERE index_code = ? AND business_date = ?
        LIMIT 1
        """,
        (index_code, business_date),
    ).fetchone()
    if not row:
        return None
    prev = con.execute(
        """
        SELECT reported_close, business_date
        FROM idx.index_divisor
        WHERE index_code = ? AND business_date < ?
        ORDER BY business_date DESC
        LIMIT 1
        """,
        (index_code, business_date),
    ).fetchone()
    close = float(row["reported_close"] or 0)
    prev_close = float(prev["reported_close"] or 0) if prev else None
    change = close - prev_close if prev_close else None
    change_pct = (change / prev_close * 100.0) if prev_close else None
    return {
        "index_code": row["index_code"],
        "business_date": row["business_date"],
        "close": round(close, 2),
        "previous_date": prev["business_date"] if prev else None,
        "previous_close": round(prev_close, 2) if prev_close else None,
        "change": round(change, 2) if change is not None else None,
        "change_pct": round(change_pct, 2) if change_pct is not None else None,
        "missing_prices": int(row["missing_prices"] or 0),
        "missing_shares": int(row["missing_shares"] or 0),
    }


def _latest_tick_row(con: sqlite3.Connection, source: str, index_code: str, business_date: str):
    return con.execute(
        f"""
        SELECT business_date, indexCode, indexValue, prevCloseIndex,
               "change" AS change_value, percentageChange
        FROM {source}
        WHERE indexCode = ? AND business_date = ?
        ORDER BY received_ts_ns DESC
        LIMIT 1
        """,
        (index_code, business_date),
    ).fetchone()


def _snapshot_from_ticks(con: sqlite3.Connection, index_code: str, business_date: str) -> dict | None:
    row = None
    if _has_idx_object(con, "v_idx_latest_ui"):
        row = _latest_tick_row(con, "idx.v_idx_latest_ui", index_code, business_date)
    if not row and _has_idx_object(con, "v_idx_ticks"):
        row = _latest_tick_row(con, "idx.v_idx_ticks", index_code, business_date)
    if not row:
        return None

    prev_date = None
    if _has_idx_object(con, "v_idx_ticks"):
        prev = con.execute(
            """
            SELECT business_date
            FROM idx.v_idx_ticks
            WHERE indexCode = ? AND business_date < ?
            GROUP BY business_date
            ORDER BY business_date DESC
            LIMIT 1
            """,
            (index_code, business_date),
        ).fetchone()
        prev_date = prev["business_date"] if prev else None

    close = float(row["indexValue"] or 0)
    prev_close = float(row["prevCloseIndex"] or 0)
    change = row["change_value"]
    change_pct = row["percentageChange"]
    return {
        "index_code": row["indexCode"],
        "business_date": row["business_date"],
        "close": round(close, 2),
        "previous_date": prev_date,
        "previous_close": round(prev_close, 2) if prev_close else None,
        "change": round(float(change), 2) if change is not None else None,
        "change_pct": round(float(change_pct), 2) if change_pct is not None else None,
        "missing_prices": 0,
        "missing_shares": 0,
    }


def _index_chart_points(con: sqlite3.Connection, index_code: str, business_date: str, max_points: int = 140) -> dict:
    """Return a compact intraday index series from index_analysis DB.

    The content site uses this only for presentation charts.  It does not use
    index ticks to decide stock sectors; sector membership remains JSON-first.
    """
    if not _has_idx_object(con, "v_idx_ticks"):
        return {"points": [], "point_count": 0, "source": "index_analysis:v_idx_ticks_missing"}

    rows = con.execute(
        """
        SELECT receivedTime, received_ts_ns, indexValue, prevCloseIndex,
               "change" AS change_value, percentageChange
        FROM idx.v_idx_ticks
        WHERE indexCode = ? AND business_date = ?
          AND indexValue IS NOT NULL
        ORDER BY received_ts_ns
        """,
        (index_code, business_date),
    ).fetchall()

    if not rows:
        return {"points": [], "point_count": 0, "source": "index_analysis:v_idx_ticks_empty"}

    stride = max(1, (len(rows) + max_points - 1) // max_points)
    sampled = rows[::stride]
    if sampled[-1]["received_ts_ns"] != rows[-1]["received_ts_ns"]:
        sampled.append(rows[-1])

    values = [float(r["indexValue"] or 0) for r in rows]
    prev_close = rows[-1]["prevCloseIndex"]
    points = []
    for r in sampled:
        value = float(r["indexValue"] or 0)
        change = r["change_value"]
        pct = r["percentageChange"]
        points.append({
            "time": str(r["receivedTime"] or "")[-8:],
            "received_time": r["receivedTime"],
            "ts_ns": int(r["received_ts_ns"] or 0),
            "value": round(value, 2),
            "change": round(float(change), 2) if change is not None else None,
            "change_pct": round(float(pct), 3) if pct is not None else None,
        })

    return {
        "points": points,
        "point_count": len(rows),
        "sampled_points": len(points),
        "open": round(values[0], 2),
        "high": round(max(values), 2),
        "low": round(min(values), 2),
        "close": round(values[-1], 2),
        "prev_close": round(float(prev_close), 2) if prev_close is not None else None,
        "source": "index_analysis:v_idx_ticks",
    }


def _attach_chart(con: sqlite3.Connection, snapshot: dict | None, index_code: str, business_date: str) -> dict | None:
    if not snapshot:
        return None
    try:
        snapshot = dict(snapshot)
        snapshot["chart"] = _index_chart_points(con, index_code, business_date)
    except Exception as exc:  # charting should never break content generation
        snapshot["chart"] = {"points": [], "point_count": 0, "source": f"index_chart_error:{type(exc).__name__}"}
    return snapshot


def get_index_snapshot(con: sqlite3.Connection, index_code: str, business_date: str) -> dict | None:
    snapshot = None
    if _has_idx_object(con, "index_divisor"):
        snapshot = _snapshot_from_divisor(con, index_code, business_date)
    if not snapshot and (_has_idx_object(con, "v_idx_latest_ui") or _has_idx_object(con, "v_idx_ticks")):
        snapshot = _snapshot_from_ticks(con, index_code, business_date)
    return _attach_chart(con, snapshot, index_code, business_date)


def market_index(con: sqlite3.Connection, business_date: str) -> dict | None:
    return get_index_snapshot(con, "NEPSE", business_date)


def sector_index(con: sqlite3.Connection, sector_name: str, business_date: str) -> dict | None:
    code = SECTOR_TO_INDEX_CODE.get(sector_name)
    if not code:
        return None
    return get_index_snapshot(con, code, business_date)
