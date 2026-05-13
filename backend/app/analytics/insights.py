from __future__ import annotations

from typing import Any
from .store import rows, one
from .rollups import rebuild_daily_rollups, funnel


def sector_interest(business_date: str) -> list[dict[str, Any]]:
    rebuild_daily_rollups(business_date)
    return rows("SELECT * FROM sector_interest_daily WHERE business_date=? ORDER BY reader_interest_score DESC, clicks DESC", (business_date,))


def stock_interest(business_date: str) -> list[dict[str, Any]]:
    rebuild_daily_rollups(business_date)
    return rows("SELECT * FROM stock_interest_daily WHERE business_date=? ORDER BY reader_interest_score DESC, row_clicks DESC", (business_date,))


def video_conversion(business_date: str) -> dict[str, Any]:
    rebuild_daily_rollups(business_date)
    return one("SELECT * FROM video_conversion_daily WHERE business_date=?", (business_date,))


def search_terms(business_date: str) -> list[dict[str, Any]]:
    rebuild_daily_rollups(business_date)
    return rows("SELECT * FROM search_terms_daily WHERE business_date=? ORDER BY searches DESC, result_clicks DESC", (business_date,))


def overview() -> dict[str, Any]:
    issue_rows = rows("SELECT * FROM daily_issue_metrics ORDER BY business_date DESC LIMIT 30")
    return {
        "issues": issue_rows,
        "totals": {
            "issue_views": sum(int(x.get("issue_views") or 0) for x in issue_rows),
            "unique_sessions": sum(int(x.get("unique_sessions") or 0) for x in issue_rows),
            "youtube_clicks": sum(int(x.get("youtube_clicks") or 0) for x in issue_rows),
        },
    }


def _load_issue_for_date(business_date: str | None) -> dict[str, Any]:
    if not business_date:
        return {}
    try:
        from app.content.config import CONTENT_ROOT
        import json
        path = CONTENT_ROOT / "daily" / f"{business_date}.json"
        if path.exists():
            return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}
    return {}


def _issue_stock_maps(issue: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    stock_map: dict[str, Any] = {}
    sector_map: dict[str, Any] = {}
    for sec in issue.get("sectors") or []:
        sector_map[sec.get("sector_name")] = sec
        for stock in sec.get("stocks") or []:
            if stock.get("symbol"):
                stock_map[stock["symbol"]] = stock
    return stock_map, sector_map


def content_opportunities(business_date: str | None = None) -> list[dict[str, Any]]:
    if business_date:
        rebuild_daily_rollups(business_date)
        stock_rows = stock_interest(business_date)
    else:
        stock_rows = rows("""
            SELECT symbol, MAX(sector_name) AS sector_name, SUM(row_clicks) AS row_clicks, SUM(teaser_views) AS teaser_views,
                   SUM(featured_views) AS featured_views, SUM(youtube_clicks) AS youtube_clicks,
                   SUM(search_hits) AS search_hits, SUM(deep_link_copies) AS deep_link_copies,
                   SUM(reader_interest_score) AS reader_interest_score
            FROM stock_interest_daily GROUP BY symbol ORDER BY reader_interest_score DESC LIMIT 50
        """)
    issue = _load_issue_for_date(business_date)
    stock_map, sector_map = _issue_stock_maps(issue)
    all_stocks = list(stock_map.values())
    max_trade_amt = max((float((s.get("summary") or {}).get("trade_amt_rs") or 0) for s in all_stocks), default=1) or 1
    max_abs_net = max((abs(float((s.get("summary") or {}).get("net_aggr_qty") or 0)) for s in all_stocks), default=1) or 1
    max_sector_amt = max((float((sec.get("summary") or {}).get("trade_amt_rs") or 0) for sec in sector_map.values()), default=1) or 1

    out = []
    for r in stock_rows[:50]:
        symbol = r.get("symbol")
        reader = float(r.get("reader_interest_score") or 0)
        stock = stock_map.get(symbol) or {}
        sm = stock.get("summary") or {}
        sector_name = stock.get("sector_name") or r.get("sector_name")
        sector = sector_map.get(sector_name) or {}
        trade_amt = float(sm.get("trade_amt_rs") or 0)
        abs_net = abs(float(sm.get("net_aggr_qty") or 0))
        confidence = float(sm.get("confidence_pct") or 0)
        explainability = float(sm.get("explainability_pct") or 0)
        evidence_score = round((confidence + explainability) / 2, 2) if sm else 0
        trade_activity_score = round((trade_amt / max_trade_amt) * 100, 2) if sm else 0
        orderflow_pressure_score = round((abs_net / max_abs_net) * 100, 2) if sm else 0
        sector_importance_score = round((float((sector.get("summary") or {}).get("trade_amt_rs") or 0) / max_sector_amt) * 100, 2) if sector else 0
        orderflow_evidence_score = round(evidence_score * 0.55 + orderflow_pressure_score * 0.30 + trade_activity_score * 0.15, 2)
        opportunity = (reader * 0.40) + (orderflow_evidence_score * 0.35) + (trade_activity_score * 0.15) + (sector_importance_score * 0.10)
        reason_bits = []
        if reader > 0:
            reason_bits.append("reader demand observed")
        if sm:
            reason_bits.append(f"confidence {confidence:.1f}% / explainability {explainability:.1f}%")
            reason_bits.append(f"net aggressor quantity {int(sm.get('net_aggr_qty') or 0):,}")
        reason = "; ".join(reason_bits) or "No matching order-flow issue data found yet."
        out.append({
            "symbol": symbol,
            "sector_name": sector_name,
            "company_name": stock.get("company_name"),
            "reader_interest_score": round(reader, 2),
            "orderflow_evidence_score": orderflow_evidence_score,
            "trade_activity_score": trade_activity_score,
            "sector_importance_score": sector_importance_score,
            "content_opportunity_score": round(opportunity, 2),
            "reason": f"Good candidate when {reason}.",
            "raw": r,
            "stock_summary": sm,
        })
    out.sort(key=lambda x: x["content_opportunity_score"], reverse=True)
    return out[:30]


def human_insights(business_date: str) -> list[str]:
    sec = sector_interest(business_date)
    st = stock_interest(business_date)
    vid = video_conversion(business_date)
    fun = funnel(business_date)
    insights: list[str] = []
    if sec:
        insights.append(f"Reader interest was highest in {sec[0]['sector_name']} based on clicks, stock interaction, and deep-link copies.")
    if st:
        insights.append(f"Highest stock interest was {st[0]['symbol']} from {st[0].get('sector_name') or 'unknown sector'}.")
    if vid:
        insights.append(f"Video conversion is {vid.get('conversion_pct', 0)}% from {vid.get('video_block_views', 0)} video-block views to {vid.get('youtube_clicks', 0)} YouTube clicks.")
    if fun.get("steps"):
        last = fun["steps"][-1]
        insights.append(f"The daily funnel currently reaches YouTube at {last['pct_of_issue']}% of issue views.")
    if not insights:
        insights.append("No reader analytics yet. Open the public daily page and interact with sectors, stocks, and video buttons to start collecting privacy-safe signals.")
    return insights
