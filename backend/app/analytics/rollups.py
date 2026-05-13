from __future__ import annotations

from typing import Any
from .store import connect, utc_now

ISSUE_VIEW_EVENTS = ("daily_issue_viewed", "daily_issue_loaded")
MARKET_EVENTS = ("market_summary_viewed", "market_pulse_viewed")
SECTOR_SECTION_EVENTS = ("sector_board_viewed",)
SECTOR_CLICK_EVENTS = ("sector_clicked",)
STOCK_CLICK_EVENTS = ("stock_row_clicked",)
FEATURED_EVENTS = ("featured_stock_viewed",)
VIDEO_BLOCK_EVENTS = ("video_block_viewed",)
YOUTUBE_EVENTS = ("youtube_clicked", "video_cta_clicked")
METHOD_EVENTS = ("method_note_opened",)
ARCHIVE_EVENTS = ("archive_viewed", "daily_archive_opened", "old_issue_opened", "stock_archive_opened", "sector_archive_opened", "video_archive_opened")


def _count(con, date: str, events: tuple[str, ...]) -> int:
    q = ",".join("?" for _ in events)
    return int(con.execute(f"SELECT COUNT(*) FROM analytics_events WHERE business_date=? AND event_name IN ({q})", (date, *events)).fetchone()[0] or 0)


def _unique(con, date: str) -> int:
    return int(con.execute("SELECT COUNT(DISTINCT session_id) FROM analytics_events WHERE business_date=?", (date,)).fetchone()[0] or 0)


def rebuild_daily_rollups(business_date: str) -> dict[str, Any]:
    now = utc_now().isoformat()
    with connect() as con:
        issue_views = _count(con, business_date, ISSUE_VIEW_EVENTS)
        unique_sessions = _unique(con, business_date)
        market_section_views = _count(con, business_date, MARKET_EVENTS)
        sector_section_views = _count(con, business_date, SECTOR_SECTION_EVENTS)
        sector_clicks = _count(con, business_date, SECTOR_CLICK_EVENTS)
        stock_clicks = _count(con, business_date, STOCK_CLICK_EVENTS)
        featured_views = _count(con, business_date, FEATURED_EVENTS)
        video_block_views = _count(con, business_date, VIDEO_BLOCK_EVENTS)
        youtube_clicks = _count(con, business_date, YOUTUBE_EVENTS)
        method_note_views = _count(con, business_date, METHOD_EVENTS)
        archive_clicks = _count(con, business_date, ARCHIVE_EVENTS)
        avg_scroll = con.execute("SELECT AVG(scroll_depth_pct) FROM analytics_events WHERE business_date=? AND scroll_depth_pct IS NOT NULL", (business_date,)).fetchone()[0] or 0
        avg_reading = con.execute("SELECT AVG(reading_seconds) FROM analytics_events WHERE business_date=? AND reading_seconds IS NOT NULL", (business_date,)).fetchone()[0] or 0
        con.execute(
            """
            INSERT INTO daily_issue_metrics (
              business_date, issue_views, unique_sessions, market_section_views, sector_section_views,
              sector_clicks, stock_clicks, featured_stock_views, video_block_views, youtube_clicks,
              method_note_views, archive_clicks, avg_scroll_depth_pct, avg_reading_seconds, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(business_date) DO UPDATE SET
              issue_views=excluded.issue_views, unique_sessions=excluded.unique_sessions,
              market_section_views=excluded.market_section_views, sector_section_views=excluded.sector_section_views,
              sector_clicks=excluded.sector_clicks, stock_clicks=excluded.stock_clicks,
              featured_stock_views=excluded.featured_stock_views, video_block_views=excluded.video_block_views,
              youtube_clicks=excluded.youtube_clicks, method_note_views=excluded.method_note_views,
              archive_clicks=excluded.archive_clicks, avg_scroll_depth_pct=excluded.avg_scroll_depth_pct,
              avg_reading_seconds=excluded.avg_reading_seconds, updated_at=excluded.updated_at
            """,
            (business_date, issue_views, unique_sessions, market_section_views, sector_section_views, sector_clicks, stock_clicks, featured_views, video_block_views, youtube_clicks, method_note_views, archive_clicks, avg_scroll, avg_reading, now),
        )
        _rebuild_sector_rollup(con, business_date)
        _rebuild_stock_rollup(con, business_date)
        _rebuild_video_rollup(con, business_date)
        _rebuild_search_rollup(con, business_date)
        con.commit()
        return daily_metrics(business_date, con=con)


def daily_metrics(business_date: str, con=None) -> dict[str, Any]:
    close = False
    if con is None:
        con = connect(); close = True
    try:
        row = con.execute("SELECT * FROM daily_issue_metrics WHERE business_date=?", (business_date,)).fetchone()
        return dict(row) if row else {
            "business_date": business_date,
            "issue_views": 0,
            "unique_sessions": 0,
            "market_section_views": 0,
            "sector_section_views": 0,
            "sector_clicks": 0,
            "stock_clicks": 0,
            "featured_stock_views": 0,
            "video_block_views": 0,
            "youtube_clicks": 0,
            "method_note_views": 0,
            "archive_clicks": 0,
            "avg_scroll_depth_pct": 0,
            "avg_reading_seconds": 0,
            "updated_at": None,
        }
    finally:
        if close:
            con.close()


def _rebuild_sector_rollup(con, business_date: str) -> None:
    con.execute("DELETE FROM sector_interest_daily WHERE business_date=?", (business_date,))
    rows = con.execute(
        """
        SELECT sector_name,
          SUM(CASE WHEN event_name IN ('sector_board_viewed','sector_index_context_viewed') THEN 1 ELSE 0 END) AS views,
          SUM(CASE WHEN event_name='sector_clicked' THEN 1 ELSE 0 END) AS clicks,
          SUM(CASE WHEN event_name='stock_row_clicked' THEN 1 ELSE 0 END) AS stock_clicks_inside_sector,
          SUM(CASE WHEN event_name='sector_deep_link_copied' THEN 1 ELSE 0 END) AS deep_link_copies,
          AVG(CASE WHEN reading_seconds IS NOT NULL THEN reading_seconds ELSE NULL END) AS avg_time_seconds
        FROM analytics_events
        WHERE business_date=? AND sector_name IS NOT NULL AND sector_name <> ''
        GROUP BY sector_name
        """,
        (business_date,),
    ).fetchall()
    for r in rows:
        d = dict(r)
        score = (d.get("views") or 0) * 0.15 + (d.get("clicks") or 0) * 0.45 + (d.get("stock_clicks_inside_sector") or 0) * 0.30 + (d.get("deep_link_copies") or 0) * 0.10
        con.execute(
            "INSERT INTO sector_interest_daily VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (business_date, d["sector_name"], d.get("views") or 0, d.get("clicks") or 0, d.get("stock_clicks_inside_sector") or 0, d.get("deep_link_copies") or 0, round(float(d.get("avg_time_seconds") or 0), 2), round(score, 2)),
        )


def _rebuild_stock_rollup(con, business_date: str) -> None:
    con.execute("DELETE FROM stock_interest_daily WHERE business_date=?", (business_date,))
    rows = con.execute(
        """
        SELECT symbol, MAX(sector_name) AS sector_name,
          SUM(CASE WHEN event_name='stock_row_clicked' THEN 1 ELSE 0 END) AS row_clicks,
          SUM(CASE WHEN event_name='stock_teaser_viewed' THEN 1 ELSE 0 END) AS teaser_views,
          SUM(CASE WHEN event_name='featured_stock_viewed' THEN 1 ELSE 0 END) AS featured_views,
          SUM(CASE WHEN event_name IN ('youtube_clicked','video_cta_clicked') THEN 1 ELSE 0 END) AS youtube_clicks,
          SUM(CASE WHEN event_name='stock_search_used' THEN 1 ELSE 0 END) AS search_hits,
          SUM(CASE WHEN event_name='stock_deep_link_copied' THEN 1 ELSE 0 END) AS deep_link_copies
        FROM analytics_events
        WHERE business_date=? AND symbol IS NOT NULL AND symbol <> ''
        GROUP BY symbol
        """,
        (business_date,),
    ).fetchall()
    for r in rows:
        d = dict(r)
        score = (d.get("row_clicks") or 0) * 0.30 + (d.get("teaser_views") or 0) * 0.25 + (d.get("youtube_clicks") or 0) * 0.25 + (d.get("search_hits") or 0) * 0.15 + (d.get("deep_link_copies") or 0) * 0.05
        con.execute(
            "INSERT INTO stock_interest_daily VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (business_date, d["symbol"], d.get("sector_name"), d.get("row_clicks") or 0, d.get("teaser_views") or 0, d.get("featured_views") or 0, d.get("youtube_clicks") or 0, d.get("search_hits") or 0, d.get("deep_link_copies") or 0, round(score, 2)),
        )


def _rebuild_video_rollup(con, business_date: str) -> None:
    featured = con.execute("SELECT symbol FROM analytics_events WHERE business_date=? AND symbol IS NOT NULL ORDER BY id DESC LIMIT 1", (business_date,)).fetchone()
    video_views = _count(con, business_date, VIDEO_BLOCK_EVENTS)
    youtube_clicks = _count(con, business_date, YOUTUBE_EVENTS)
    title_copies = _count(con, business_date, ("youtube_title_copied", "thumbnail_text_copied"))
    desc_copies = _count(con, business_date, ("youtube_description_copied",))
    chapters_copies = _count(con, business_date, ("youtube_chapters_copied",))
    conversion = (youtube_clicks / video_views * 100.0) if video_views else 0
    con.execute(
        """
        INSERT INTO video_conversion_daily VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(business_date) DO UPDATE SET
          featured_symbol=excluded.featured_symbol, video_block_views=excluded.video_block_views,
          youtube_clicks=excluded.youtube_clicks, copy_title_clicks=excluded.copy_title_clicks,
          copy_description_clicks=excluded.copy_description_clicks, copy_chapters_clicks=excluded.copy_chapters_clicks,
          conversion_pct=excluded.conversion_pct
        """,
        (business_date, featured[0] if featured else None, video_views, youtube_clicks, title_copies, desc_copies, chapters_copies, round(conversion, 2)),
    )


def _rebuild_search_rollup(con, business_date: str) -> None:
    con.execute("DELETE FROM search_terms_daily WHERE business_date=?", (business_date,))
    rows = con.execute(
        """
        SELECT json_extract(payload_json, '$.search_term') AS term,
               COALESCE(json_extract(payload_json, '$.search_scope'), 'unknown') AS scope,
               COUNT(*) AS searches,
               SUM(CASE WHEN event_name='search_result_clicked' THEN 1 ELSE 0 END) AS result_clicks,
               SUM(CASE WHEN event_name='search_no_result' THEN 1 ELSE 0 END) AS no_result_count
        FROM analytics_events
        WHERE business_date=? AND event_name IN ('sector_search_used','stock_search_used','global_search_used','search_result_clicked','search_no_result')
        GROUP BY term, scope
        HAVING term IS NOT NULL AND term <> ''
        """,
        (business_date,),
    ).fetchall()
    for r in rows:
        d = dict(r)
        con.execute("INSERT INTO search_terms_daily VALUES (?, ?, ?, ?, ?, ?)", (business_date, d["term"], d["scope"], d.get("searches") or 0, d.get("result_clicks") or 0, d.get("no_result_count") or 0))


def funnel(business_date: str) -> dict[str, Any]:
    metrics = rebuild_daily_rollups(business_date)
    steps = [
        ("Issue viewed", metrics.get("issue_views") or 0),
        ("Market reached", metrics.get("market_section_views") or 0),
        ("Sector board reached", metrics.get("sector_section_views") or 0),
        ("Sector clicked", metrics.get("sector_clicks") or 0),
        ("Stock clicked", metrics.get("stock_clicks") or 0),
        ("Featured viewed", metrics.get("featured_stock_views") or 0),
        ("Video block viewed", metrics.get("video_block_views") or 0),
        ("YouTube clicked", metrics.get("youtube_clicks") or 0),
    ]
    base = max(steps[0][1], 1)
    return {"business_date": business_date, "steps": [{"label": k, "count": v, "pct_of_issue": round(v / base * 100, 2)} for k, v in steps]}
