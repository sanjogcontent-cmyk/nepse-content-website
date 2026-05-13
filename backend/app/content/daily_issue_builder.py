from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from .db import connect_readonly, attach_database
from .sector_metadata import prepare_metadata
from .formatting import evidence_label, flow_bias, pct_from_scaled, ns_to_interval, ns_to_hhmm
from .index_intel import market_index, sector_index
from .narrative import make_article, make_youtube_package
from .archive_seo import make_archive_entry, make_seo, write_archive_outputs
from .content_indexer import build_content_indexes
from .config import DAILY_ROOT, CONTENT_ROOT, ADMIN_DAILY_ROOT, CONTENT_ADMIN_ROOT


META_SELECT = """
COALESCE(NULLIF(em.sectorName, ''), NULLIF(pm.sectorName, ''), 'Unmapped')
"""
COMPANY_SELECT = """
COALESCE(NULLIF(em.companyName, ''), NULLIF(pm.companyName, ''), NULLIF(m.company_name, ''), b.symbol)
"""
SECURITY_SELECT = """
COALESCE(NULLIF(em.securityName, ''), NULLIF(m.security_name, ''), NULLIF(pm.companyName, ''), b.symbol)
"""


def _row_to_summary(row: dict[str, Any], include_prices: bool = False) -> dict[str, Any]:
    buy_amt = float(row.get("buy_aggr_amt_rs") or 0)
    sell_amt = float(row.get("sell_aggr_amt_rs") or 0)
    ambig_amt = float(row.get("ambig_amt_rs") or 0)
    buy_qty = int(row.get("buy_aggr_qty") or 0)
    sell_qty = int(row.get("sell_aggr_qty") or 0)
    ambig_qty = int(row.get("ambig_qty") or 0)
    net_qty = int(row.get("net_aggr_qty") or (buy_qty - sell_qty))
    conf = pct_from_scaled(row.get("avg_side_confidence_scaled"))
    expl = pct_from_scaled(row.get("avg_explainability_scaled"))
    gap = int(row.get("gap_count") or 0)
    summary = {
        "buckets": int(row.get("buckets") or 0),
        "matched_buckets": int(row.get("matched_buckets") or 0),
        "pending_buckets": int(row.get("pending_buckets") or 0),
        "trade_qty": int(row.get("trade_qty") or 0),
        "trade_amt_rs": round(float(row.get("trade_amt_rs") or 0), 2),
        "transactions": int(row.get("transactions") or row.get("trade_count") or 0),
        "buy_aggr_qty": buy_qty,
        "sell_aggr_qty": sell_qty,
        "ambig_qty": ambig_qty,
        "net_aggr_qty": net_qty,
        "buy_aggr_amt_rs": round(buy_amt, 2),
        "sell_aggr_amt_rs": round(sell_amt, 2),
        "ambig_amt_rs": round(ambig_amt, 2),
        "net_aggr_amt_rs": round(buy_amt - sell_amt, 2),
        "explainability_pct": expl,
        "confidence_pct": conf,
        "gap_count": gap,
        "wipe_count": int(row.get("wipe_count") or 0),
        "upper_lock_count": int(row.get("upper_lock_count") or 0),
        "lower_lock_count": int(row.get("lower_lock_count") or 0),
        "evidence_label": evidence_label(conf, expl, gap),
        "bias": flow_bias(net_qty, buy_qty, sell_qty),
    }
    if include_prices:
        vwap = (summary["trade_amt_rs"] / summary["trade_qty"]) if summary["trade_qty"] else None
        summary.update({
            "vwap_rs": round(vwap, 2) if vwap is not None else None,
            "buy_aggr_avg_px_rs": round(buy_amt / buy_qty, 2) if buy_qty else None,
            "sell_aggr_avg_px_rs": round(sell_amt / sell_qty, 2) if sell_qty else None,
            "ambig_avg_px_rs": round(ambig_amt / ambig_qty, 2) if ambig_qty else None,
        })
    return summary



PRICE_SCALE = 100.0


def _px(v: object) -> float | None:
    """Convert analysis/floorsheet scaled price to rupees.

    analysis uses price_scaled fields such as 112000 for Rs 1,120.00.
    """
    if v is None:
        return None
    try:
        return round(float(v) / PRICE_SCALE, 2)
    except Exception:
        return None


def _pct_change(close_rs: float | None, prev_close_rs: float | None) -> float | None:
    if close_rs is None or prev_close_rs in (None, 0):
        return None
    return round((float(close_rs) - float(prev_close_rs)) / float(prev_close_rs) * 100.0, 2)


def _has_object(con, name: str) -> bool:
    row = con.execute("SELECT 1 FROM sqlite_master WHERE name=?", (name,)).fetchone()
    return bool(row)


def _apply_same_broker_metrics(summary: dict[str, Any], stats: dict[str, Any] | None) -> None:
    """Attach buyer=seller broker match metrics to a market/sector/stock summary.

    Same-broker means the public floorsheet row has the same buyer_member_id and
    seller_member_id. It is a visible matched-row/context metric only; it does not
    prove wash trading or coordination by itself.
    """
    if not stats:
        return
    amt = round(float(stats.get("same_broker_amt_rs") or 0), 2)
    qty = int(stats.get("same_broker_qty") or 0)
    trades = int(stats.get("same_broker_trades") or 0)
    buckets = int(stats.get("same_broker_buckets") or 0)
    total_amt = float(summary.get("actual_trade_amt_rs") or summary.get("trade_amt_rs") or 0)
    total_qty = float(summary.get("actual_trade_qty") or summary.get("trade_qty") or 0)
    summary.update({
        "same_broker_amt_rs": amt,
        "same_broker_matched_amt_rs": amt,
        "same_broker_turnover_rs": amt,
        "same_broker_qty": qty,
        "same_broker_trades": trades,
        "same_broker_match_count": trades,
        "same_broker_buckets": buckets,
        "same_broker_turnover_pct": round((amt / total_amt * 100.0), 2) if total_amt else None,
        "same_broker_qty_pct": round((qty / total_qty * 100.0), 2) if total_qty else None,
    })


def _fetch_same_broker_market(con, business_date: str) -> dict[str, Any]:
    if not _has_object(con, "v_an_bucket_trade_roles"):
        return {}
    row = con.execute(
        """
        SELECT
          COUNT(*) AS same_broker_trades,
          COUNT(DISTINCT bucket_id) AS same_broker_buckets,
          SUM(quantity) AS same_broker_qty,
          SUM(amount_paisa) / 100.0 AS same_broker_amt_rs
        FROM v_an_bucket_trade_roles
        WHERE business_date = :business_date
          AND buyer_member_id IS NOT NULL
          AND seller_member_id IS NOT NULL
          AND buyer_member_id = seller_member_id
        """,
        {"business_date": business_date},
    ).fetchone()
    return dict(row or {})


def _fetch_stock_truths(con, business_date: str) -> dict[str, dict[str, Any]]:
    """Fetch stock-level OHLC and role-VWAP facts from the analysis database.

    These values are for writing/publication facts:
    - close_rs / ltp_rs: current day's last POST-frame ltp_scaled
    - previous_close_rs: current day's last POST-frame close_scaled
    - open/high/low/day_vwap: current day's last POST-frame open/high/low/avg fields
    - buy/sell/ambig VWAP: actual row-level trade-role VWAPs from v_an_bucket_trade_roles

    When the role view is missing in an older DB, the function degrades gracefully and
    the existing proxy summaries continue to work.
    """
    result: dict[str, dict[str, Any]] = {}

    # Price truth comes from each symbol's last POST frame for the same database date.
    # In an_bucket_frames POST: ltp_scaled = today's close/LTP, close_scaled = previous close,
    # open/high/low/avg are the official day fields carried by the WS frame.
    for r in con.execute(
        """
        SELECT symbol, ltp_scaled, close_scaled, open_scaled, high_scaled, low_scaled, avg_scaled,
               volume, last_traded_qty, last_traded_time, trade_time_ns_of_day
        FROM (
          SELECT b.symbol, f.ltp_scaled, f.close_scaled, f.open_scaled, f.high_scaled, f.low_scaled, f.avg_scaled,
                 f.volume, f.last_traded_qty, f.last_traded_time, f.trade_time_ns_of_day, f.recv_ts_ns, b.bucket_id,
                 ROW_NUMBER() OVER (PARTITION BY b.symbol ORDER BY f.trade_time_ns_of_day DESC, f.recv_ts_ns DESC, b.bucket_id DESC) AS rn
          FROM an_buckets b
          JOIN an_bucket_frames f ON f.bucket_id = b.bucket_id AND f.role = 'POST'
          WHERE b.business_date = :business_date
        )
        WHERE rn = 1
        """,
        {"business_date": business_date},
    ).fetchall():
        d = dict(r)
        info = result.setdefault(d["symbol"], {})
        info.update({
            "close_rs": _px(d.get("ltp_scaled")),
            "ltp_rs": _px(d.get("ltp_scaled")),
            "previous_close_rs": _px(d.get("close_scaled")),
            "open_rs": _px(d.get("open_scaled")),
            "high_rs": _px(d.get("high_scaled")),
            "low_rs": _px(d.get("low_scaled")),
            "day_vwap_rs": _px(d.get("avg_scaled")),
            "vwap_rs": _px(d.get("avg_scaled")),
            "ws_day_volume": int(d.get("volume") or 0),
            "last_traded_qty": int(d.get("last_traded_qty") or 0),
            "last_traded_time": d.get("last_traded_time"),
        })

    # Actual bucket-trade OHLC and VWAP facts.
    if _has_object(con, "v_an_bucket_trade_roles"):
        rows = con.execute(
            """
            SELECT
              symbol,
              MIN(rate_scaled) AS low_scaled,
              MAX(rate_scaled) AS high_scaled,
              SUM(quantity) AS actual_trade_qty,
              SUM(amount_paisa) / 100.0 AS actual_trade_amt_rs,
              SUM(CASE WHEN trade_role = 'BUY_AGGRESSOR' THEN quantity ELSE 0 END) AS buy_role_qty,
              SUM(CASE WHEN trade_role = 'SELL_AGGRESSOR' THEN quantity ELSE 0 END) AS sell_role_qty,
              SUM(CASE WHEN trade_role = 'AMBIG' THEN quantity ELSE 0 END) AS ambig_role_qty,
              SUM(CASE WHEN trade_role = 'BUY_AGGRESSOR' THEN amount_paisa ELSE 0 END) / 100.0 AS buy_role_amt_rs,
              SUM(CASE WHEN trade_role = 'SELL_AGGRESSOR' THEN amount_paisa ELSE 0 END) / 100.0 AS sell_role_amt_rs,
              SUM(CASE WHEN trade_role = 'AMBIG' THEN amount_paisa ELSE 0 END) / 100.0 AS ambig_role_amt_rs
            FROM v_an_bucket_trade_roles
            WHERE business_date = :business_date
            GROUP BY symbol
            """,
            {"business_date": business_date},
        ).fetchall()
        for r in rows:
            d = dict(r)
            symbol = d["symbol"]
            q = int(d.get("actual_trade_qty") or 0)
            amt = float(d.get("actual_trade_amt_rs") or 0)
            bq = int(d.get("buy_role_qty") or 0)
            sq = int(d.get("sell_role_qty") or 0)
            aq = int(d.get("ambig_role_qty") or 0)
            ba = float(d.get("buy_role_amt_rs") or 0)
            sa = float(d.get("sell_role_amt_rs") or 0)
            aa = float(d.get("ambig_role_amt_rs") or 0)
            info = result.setdefault(symbol, {})
            # Actual trade-role facts are kept, but official OHLC/LTP stays from the last POST frame.
            if info.get("low_rs") is None:
                info["low_rs"] = _px(d.get("low_scaled"))
            if info.get("high_rs") is None:
                info["high_rs"] = _px(d.get("high_scaled"))
            if info.get("day_vwap_rs") is None:
                info["day_vwap_rs"] = round(amt / q, 2) if q else None
            if info.get("vwap_rs") is None:
                info["vwap_rs"] = round(amt / q, 2) if q else None
            info.update({
                "actual_trade_qty": q,
                "actual_trade_amt_rs": round(amt, 2),
                "buy_aggr_actual_qty": bq,
                "sell_aggr_actual_qty": sq,
                "ambig_actual_qty": aq,
                "buy_aggr_actual_amt_rs": round(ba, 2),
                "sell_aggr_actual_amt_rs": round(sa, 2),
                "ambig_actual_amt_rs": round(aa, 2),
                "buy_aggr_vwap_rs": round(ba / bq, 2) if bq else None,
                "sell_aggr_vwap_rs": round(sa / sq, 2) if sq else None,
                "ambig_vwap_rs": round(aa / aq, 2) if aq else None,
            })

        for r in con.execute(
            """
            SELECT symbol, rate_scaled
            FROM (
              SELECT symbol, rate_scaled,
                     ROW_NUMBER() OVER (PARTITION BY symbol ORDER BY trade_ns_of_day ASC, contract_id ASC, position ASC) AS rn
              FROM v_an_bucket_trade_roles
              WHERE business_date = :business_date
            )
            WHERE rn = 1
            """,
            {"business_date": business_date},
        ).fetchall():
            d = dict(r)
            result.setdefault(d["symbol"], {}).setdefault("open_rs", _px(d.get("rate_scaled")))

        # Same-broker match is a real floorsheet/role-row metric: buyer_member_id == seller_member_id.
        # It is kept as context, not as an accusation.
        for r in con.execute(
            """
            SELECT
              symbol,
              COUNT(*) AS same_broker_trades,
              COUNT(DISTINCT bucket_id) AS same_broker_buckets,
              SUM(quantity) AS same_broker_qty,
              SUM(amount_paisa) / 100.0 AS same_broker_amt_rs
            FROM v_an_bucket_trade_roles
            WHERE business_date = :business_date
              AND buyer_member_id IS NOT NULL
              AND seller_member_id IS NOT NULL
              AND buyer_member_id = seller_member_id
            GROUP BY symbol
            """,
            {"business_date": business_date},
        ).fetchall():
            d = dict(r)
            info = result.setdefault(d["symbol"], {})
            _apply_same_broker_metrics(info, d)

    # Add change fields after current/previous close are both known.
    for info in result.values():
        close_rs = info.get("close_rs")
        prev_rs = info.get("previous_close_rs")
        if close_rs is not None and prev_rs is not None:
            info["change_rs"] = round(float(close_rs) - float(prev_rs), 2)
            info["change_pct"] = _pct_change(close_rs, prev_rs)
    return result

def _base_aggregate_sql(group_expr: str | None = None, extra_select: str = "") -> str:
    select_group = f"{group_expr} AS group_key," if group_expr else ""
    group_by = f"GROUP BY group_key" if group_expr else ""
    return f"""
    SELECT
      {select_group}
      {extra_select}
      COUNT(*) AS buckets,
      SUM(CASE WHEN b.status = 'MATCHED' THEN 1 ELSE 0 END) AS matched_buckets,
      SUM(CASE WHEN b.status <> 'MATCHED' THEN 1 ELSE 0 END) AS pending_buckets,
      SUM(COALESCE(m.trade_qty_total, 0)) AS trade_qty,
      SUM(COALESCE(m.trade_amount_paisa_total, 0)) / 100.0 AS trade_amt_rs,
      SUM(COALESCE(m.trade_count, 0)) AS transactions,
      SUM(COALESCE(m.buy_aggr_qty, 0)) AS buy_aggr_qty,
      SUM(COALESCE(m.sell_aggr_qty, 0)) AS sell_aggr_qty,
      SUM(COALESCE(m.ambig_qty, 0)) AS ambig_qty,
      SUM(COALESCE(m.buy_aggr_qty, 0) - COALESCE(m.sell_aggr_qty, 0)) AS net_aggr_qty,
      SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.buy_aggr_qty,0) / m.trade_qty_total ELSE 0 END) AS buy_aggr_amt_rs,
      SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.sell_aggr_qty,0) / m.trade_qty_total ELSE 0 END) AS sell_aggr_amt_rs,
      SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.ambig_qty,0) / m.trade_qty_total ELSE 0 END) AS ambig_amt_rs,
      AVG(COALESCE(m.explainability_scaled, 0)) AS avg_explainability_scaled,
      AVG(COALESCE(m.side_confidence_scaled, 0)) AS avg_side_confidence_scaled,
      SUM(COALESCE(b.unreliable_gap, 0)) AS gap_count,
      SUM(COALESCE(m.wipe_to_zero_buy, 0) + COALESCE(m.wipe_to_zero_sell, 0)) AS wipe_count,
      SUM(CASE WHEN m.lock_state = 'UPPER_LOCKED' THEN 1 ELSE 0 END) AS upper_lock_count,
      SUM(CASE WHEN m.lock_state = 'LOWER_LOCKED' THEN 1 ELSE 0 END) AS lower_lock_count
    FROM an_buckets b
    JOIN an_bucket_metrics m ON m.bucket_id = b.bucket_id
    LEFT JOIN meta.equity_meta em ON em.symbol = b.symbol
    LEFT JOIN meta.promoter_meta pm ON pm.symbol = b.symbol
    WHERE b.business_date = :business_date
    {group_by}
    """


def _fetch_market(con, business_date: str) -> dict[str, Any]:
    row = con.execute(_base_aggregate_sql(), {"business_date": business_date}).fetchone()
    return _row_to_summary(dict(row or {}), include_prices=False)


def _fetch_sectors(con, business_date: str, has_index: bool) -> list[dict[str, Any]]:
    sql = _base_aggregate_sql(
        group_expr=META_SELECT,
        extra_select="COUNT(DISTINCT b.symbol) AS active_stocks,"
    ) + " ORDER BY trade_amt_rs DESC"
    sectors = []
    for row in con.execute(sql, {"business_date": business_date}).fetchall():
        d = dict(row)
        sector_name = d.pop("group_key") or "Unmapped"
        summary = _row_to_summary(d, include_prices=False)
        item = {
            "sector_name": sector_name,
            "active_stocks": int(d.get("active_stocks") or 0),
            "summary": summary,
            "index": sector_index(con, sector_name, business_date) if has_index else None,
        }
        sectors.append(item)
    return sectors


def _fetch_symbol_meta(con, business_date: str) -> dict[str, dict[str, Any]]:
    """Resolve symbol metadata once per symbol instead of joining metadata on every bucket."""
    rows = con.execute(
        f"""
        SELECT
          s.symbol,
          {META_SELECT} AS sector_name,
          COALESCE(NULLIF(em.companyName, ''), NULLIF(pm.companyName, ''), s.symbol) AS company_name,
          COALESCE(NULLIF(em.securityName, ''), NULLIF(pm.companyName, ''), s.symbol) AS security_name
        FROM (SELECT DISTINCT symbol FROM an_buckets WHERE business_date = :business_date) s
        LEFT JOIN meta.equity_meta em ON em.symbol = s.symbol
        LEFT JOIN meta.promoter_meta pm ON pm.symbol = s.symbol
        ORDER BY s.symbol
        """,
        {"business_date": business_date},
    ).fetchall()
    return {dict(r)["symbol"]: dict(r) for r in rows}


def _fetch_stock_rows(con, business_date: str) -> list[dict[str, Any]]:
    # Aggregate only analysis tables first; metadata is joined after aggregation to keep daily generation fast.
    sql = """
    SELECT
      b.symbol AS group_key,
      COUNT(*) AS buckets,
      SUM(CASE WHEN b.status = 'MATCHED' THEN 1 ELSE 0 END) AS matched_buckets,
      SUM(CASE WHEN b.status <> 'MATCHED' THEN 1 ELSE 0 END) AS pending_buckets,
      SUM(COALESCE(m.trade_qty_total, 0)) AS trade_qty,
      SUM(COALESCE(m.trade_amount_paisa_total, 0)) / 100.0 AS trade_amt_rs,
      SUM(COALESCE(m.trade_count, 0)) AS transactions,
      SUM(COALESCE(m.buy_aggr_qty, 0)) AS buy_aggr_qty,
      SUM(COALESCE(m.sell_aggr_qty, 0)) AS sell_aggr_qty,
      SUM(COALESCE(m.ambig_qty, 0)) AS ambig_qty,
      SUM(COALESCE(m.buy_aggr_qty, 0) - COALESCE(m.sell_aggr_qty, 0)) AS net_aggr_qty,
      SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.buy_aggr_qty,0) / m.trade_qty_total ELSE 0 END) AS buy_aggr_amt_rs,
      SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.sell_aggr_qty,0) / m.trade_qty_total ELSE 0 END) AS sell_aggr_amt_rs,
      SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.ambig_qty,0) / m.trade_qty_total ELSE 0 END) AS ambig_amt_rs,
      AVG(COALESCE(m.explainability_scaled, 0)) AS avg_explainability_scaled,
      AVG(COALESCE(m.side_confidence_scaled, 0)) AS avg_side_confidence_scaled,
      SUM(COALESCE(b.unreliable_gap, 0)) AS gap_count,
      SUM(COALESCE(m.wipe_to_zero_buy, 0) + COALESCE(m.wipe_to_zero_sell, 0)) AS wipe_count,
      SUM(CASE WHEN m.lock_state = 'UPPER_LOCKED' THEN 1 ELSE 0 END) AS upper_lock_count,
      SUM(CASE WHEN m.lock_state = 'LOWER_LOCKED' THEN 1 ELSE 0 END) AS lower_lock_count
    FROM an_buckets b
    JOIN an_bucket_metrics m ON m.bucket_id = b.bucket_id
    WHERE b.business_date = :business_date
    GROUP BY b.symbol
    ORDER BY trade_amt_rs DESC
    """
    meta = _fetch_symbol_meta(con, business_date)
    truth_facts = _fetch_stock_truths(con, business_date)
    stocks = []
    for row in con.execute(sql, {"business_date": business_date}).fetchall():
        d = dict(row)
        symbol = d.pop("group_key")
        summary = _row_to_summary(d, include_prices=True)
        # Prefer actual bucket-trade OHLC and role VWAP facts when available.
        summary.update(truth_facts.get(symbol, {}))
        md = meta.get(symbol, {})
        stocks.append({
            "symbol": symbol,
            "company_name": md.get("company_name") or symbol,
            "security_name": md.get("security_name") or symbol,
            "sector_name": md.get("sector_name") or "Unmapped",
            "summary": summary,
        })
    return stocks


def _combine_summaries(rows: list[dict[str, Any]]) -> dict[str, Any]:
    total_buckets = sum(int((r.get("summary") or {}).get("buckets") or 0) for r in rows)
    def ssum(key: str) -> float:
        return sum(float((r.get("summary") or {}).get(key) or 0) for r in rows)
    def wavg(key: str) -> float:
        if total_buckets <= 0:
            return 0.0
        return sum(float((r.get("summary") or {}).get(key) or 0) * int((r.get("summary") or {}).get("buckets") or 0) for r in rows) / total_buckets
    buy_amt = ssum("buy_aggr_amt_rs")
    sell_amt = ssum("sell_aggr_amt_rs")
    ambig_amt = ssum("ambig_amt_rs")
    same_amt = ssum("same_broker_amt_rs")
    conf = wavg("confidence_pct")
    expl = wavg("explainability_pct")
    gap = int(ssum("gap_count"))
    buy_qty = int(ssum("buy_aggr_qty"))
    sell_qty = int(ssum("sell_aggr_qty"))
    summary = {
        "buckets": total_buckets,
        "matched_buckets": int(ssum("matched_buckets")),
        "pending_buckets": int(ssum("pending_buckets")),
        "trade_qty": int(ssum("trade_qty")),
        "trade_amt_rs": round(ssum("trade_amt_rs"), 2),
        "transactions": int(ssum("transactions")),
        "buy_aggr_qty": buy_qty,
        "sell_aggr_qty": sell_qty,
        "ambig_qty": int(ssum("ambig_qty")),
        "net_aggr_qty": int(ssum("net_aggr_qty")),
        "buy_aggr_amt_rs": round(buy_amt, 2),
        "sell_aggr_amt_rs": round(sell_amt, 2),
        "ambig_amt_rs": round(ambig_amt, 2),
        "net_aggr_amt_rs": round(buy_amt - sell_amt, 2),
        "same_broker_amt_rs": round(same_amt, 2),
        "same_broker_matched_amt_rs": round(same_amt, 2),
        "same_broker_turnover_rs": round(same_amt, 2),
        "same_broker_qty": int(ssum("same_broker_qty")),
        "same_broker_trades": int(ssum("same_broker_trades")),
        "same_broker_match_count": int(ssum("same_broker_match_count") or ssum("same_broker_trades")),
        "same_broker_buckets": int(ssum("same_broker_buckets")),
        "same_broker_turnover_pct": round((same_amt / ssum("trade_amt_rs") * 100.0), 2) if ssum("trade_amt_rs") else None,
        "same_broker_qty_pct": round((ssum("same_broker_qty") / ssum("trade_qty") * 100.0), 2) if ssum("trade_qty") else None,
        "explainability_pct": expl,
        "confidence_pct": conf,
        "gap_count": gap,
        "wipe_count": int(ssum("wipe_count")),
        "upper_lock_count": int(ssum("upper_lock_count")),
        "lower_lock_count": int(ssum("lower_lock_count")),
        "evidence_label": evidence_label(conf, expl, gap),
        "bias": flow_bias(int(ssum("net_aggr_qty")), buy_qty, sell_qty),
    }
    return summary


def _sectors_from_stocks(con, business_date: str, stocks: list[dict[str, Any]], has_index: bool) -> list[dict[str, Any]]:
    groups: dict[str, list[dict[str, Any]]] = {}
    for st in stocks:
        groups.setdefault(st.get("sector_name") or "Unmapped", []).append(st)
    sectors = []
    for sector_name, rows in groups.items():
        item = {
            "sector_name": sector_name,
            "active_stocks": len(rows),
            "summary": _combine_summaries(rows),
            "index": sector_index(con, sector_name, business_date) if has_index else None,
        }
        sectors.append(item)
    sectors.sort(key=lambda x: float((x.get("summary") or {}).get("trade_amt_rs") or 0), reverse=True)
    return sectors


def _fetch_intervals(con, business_date: str) -> list[dict[str, Any]]:
    rows = con.execute(
        """
        SELECT
          m.post_trade_ns_of_day AS ns,
          SUM(COALESCE(m.trade_qty_total, 0)) AS trade_qty,
          SUM(COALESCE(m.trade_amount_paisa_total, 0)) / 100.0 AS trade_amt_rs,
          SUM(COALESCE(m.buy_aggr_qty, 0)) AS buy_aggr_qty,
          SUM(COALESCE(m.sell_aggr_qty, 0)) AS sell_aggr_qty,
          SUM(COALESCE(m.ambig_qty, 0)) AS ambig_qty,
          SUM(COALESCE(m.buy_aggr_qty, 0) - COALESCE(m.sell_aggr_qty, 0)) AS net_aggr_qty,
          SUM(COALESCE(b.unreliable_gap, 0)) AS gap_count,
          SUM(COALESCE(m.wipe_to_zero_buy, 0) + COALESCE(m.wipe_to_zero_sell, 0)) AS wipe_count
        FROM an_buckets b
        JOIN an_bucket_metrics m ON m.bucket_id = b.bucket_id
        WHERE b.business_date = :business_date
        GROUP BY (m.post_trade_ns_of_day / (5 * 60 * 1000000000))
        ORDER BY ns
        """,
        {"business_date": business_date},
    ).fetchall()
    data = []
    for r in rows:
        d = dict(r)
        data.append({
            "time": ns_to_interval(d.get("ns"), 5),
            "trade_qty": int(d.get("trade_qty") or 0),
            "trade_amt_rs": round(float(d.get("trade_amt_rs") or 0), 2),
            "buy_aggr_qty": int(d.get("buy_aggr_qty") or 0),
            "sell_aggr_qty": int(d.get("sell_aggr_qty") or 0),
            "ambig_qty": int(d.get("ambig_qty") or 0),
            "net_aggr_qty": int(d.get("net_aggr_qty") or 0),
            "gap_count": int(d.get("gap_count") or 0),
            "wipe_count": int(d.get("wipe_count") or 0),
        })
    return data



def _sample_points(points: list[dict[str, Any]], max_points: int = 160) -> list[dict[str, Any]]:
    """Keep charts compact while preserving the final point."""
    if len(points) <= max_points:
        return points
    stride = max(1, (len(points) + max_points - 1) // max_points)
    sampled = points[::stride]
    if sampled[-1] is not points[-1]:
        sampled.append(points[-1])
    return sampled


def _pace_read_from_points(points: list[dict[str, Any]]) -> str:
    """Small human-readable chart annotation for presentation cards."""
    if len(points) < 3:
        return "Not enough intraday points for a pace read."
    final = float(points[-1].get("cumulative_turnover_rs") or points[-1].get("cumulative_volume") or 0)
    if final <= 0:
        return "No confirmed activity path available."
    npts = len(points)
    early = float(points[max(0, npts // 4)].get("cumulative_turnover_rs") or points[max(0, npts // 4)].get("cumulative_volume") or 0) / final
    mid = float(points[max(0, npts // 2)].get("cumulative_turnover_rs") or points[max(0, npts // 2)].get("cumulative_volume") or 0) / final
    late_add = 1.0 - mid
    if early >= 0.38:
        return "Front-loaded participation: a large share of the day formed early."
    if late_add >= 0.42:
        return "Late-session participation accelerated into the close."
    if mid >= 0.58:
        return "Steady participation: most activity was already built by mid-session."
    return "Participation built gradually through the session."


def _final_series_stats(points: list[dict[str, Any]], value_key: str) -> dict[str, Any]:
    vals = [float(p.get(value_key) or 0) for p in points]
    if not vals:
        return {"open": 0, "high": 0, "low": 0, "close": 0}
    return {
        "open": round(vals[0], 2),
        "high": round(max(vals), 2),
        "low": round(min(vals), 2),
        "close": round(vals[-1], 2),
    }


def _fetch_market_cumulative_turnover(con, business_date: str, minutes: int = 5) -> dict[str, Any]:
    """Market participation chart from analysis bucket truth.

    This is deliberately not index DB data.  It answers: how did traded value
    accumulate through the session?
    """
    bucket_ns = int(minutes * 60 * 1_000_000_000)
    rows = con.execute(
        """
        SELECT
          (m.post_trade_ns_of_day / :bucket_ns) AS bucket_key,
          MIN(m.post_trade_ns_of_day) AS ns,
          SUM(COALESCE(m.trade_qty_total, 0)) AS trade_qty,
          SUM(COALESCE(m.trade_amount_paisa_total, 0)) / 100.0 AS trade_amt_rs,
          SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.buy_aggr_qty,0) / m.trade_qty_total ELSE 0 END) AS buy_aggr_amt_rs,
          SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.sell_aggr_qty,0) / m.trade_qty_total ELSE 0 END) AS sell_aggr_amt_rs,
          SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.ambig_qty,0) / m.trade_qty_total ELSE 0 END) AS ambig_amt_rs,
          SUM(COALESCE(m.buy_aggr_qty, 0)) AS buy_aggr_qty,
          SUM(COALESCE(m.sell_aggr_qty, 0)) AS sell_aggr_qty,
          SUM(COALESCE(m.ambig_qty, 0)) AS ambig_qty,
          SUM(COALESCE(m.trade_count, 0)) AS transactions
        FROM an_buckets b
        JOIN an_bucket_metrics m ON m.bucket_id = b.bucket_id
        WHERE b.business_date = :business_date
        GROUP BY bucket_key
        ORDER BY ns
        """,
        {"business_date": business_date, "bucket_ns": bucket_ns},
    ).fetchall()
    points: list[dict[str, Any]] = []
    cum_amt = cum_qty = cum_buy = cum_sell = cum_ambig = cum_net_amt = cum_tx = 0
    for r in rows:
        d = dict(r)
        amt = float(d.get("trade_amt_rs") or 0)
        qty = int(d.get("trade_qty") or 0)
        buy = float(d.get("buy_aggr_amt_rs") or 0)
        sell = float(d.get("sell_aggr_amt_rs") or 0)
        ambig = float(d.get("ambig_amt_rs") or 0)
        tx = int(d.get("transactions") or 0)
        cum_amt += amt
        cum_qty += qty
        cum_buy += buy
        cum_sell += sell
        cum_ambig += ambig
        cum_net_amt += buy - sell
        cum_tx += tx
        points.append({
            "time": ns_to_interval(d.get("ns"), minutes),
            "time_hhmm": ns_to_hhmm(d.get("ns")),
            "ns": int(d.get("ns") or 0),
            "turnover_rs": round(amt, 2),
            "volume": qty,
            "transactions": tx,
            "buy_aggr_amt_rs": round(buy, 2),
            "sell_aggr_amt_rs": round(sell, 2),
            "ambig_amt_rs": round(ambig, 2),
            "cumulative_turnover_rs": round(cum_amt, 2),
            "cumulative_volume": int(cum_qty),
            "cumulative_buy_amt_rs": round(cum_buy, 2),
            "cumulative_sell_amt_rs": round(cum_sell, 2),
            "cumulative_ambig_amt_rs": round(cum_ambig, 2),
            "cumulative_net_amt_rs": round(cum_net_amt, 2),
            "cumulative_transactions": int(cum_tx),
        })
    sampled = _sample_points(points)
    return {
        "type": "market_cumulative_turnover",
        "source": "analysis_db:an_bucket_metrics",
        "bucket_minutes": minutes,
        "points": sampled,
        "point_count": len(points),
        "sampled_points": len(sampled),
        "final_turnover_rs": round(cum_amt, 2),
        "final_volume": int(cum_qty),
        "final_transactions": int(cum_tx),
        "final_buy_amt_rs": round(cum_buy, 2),
        "final_sell_amt_rs": round(cum_sell, 2),
        "final_ambig_amt_rs": round(cum_ambig, 2),
        "final_net_amt_rs": round(cum_net_amt, 2),
        "pace_read": _pace_read_from_points(points),
        "domain": _final_series_stats(points, "cumulative_turnover_rs"),
    }


def _fetch_sector_cumulative_turnover(con, business_date: str, minutes: int = 5) -> dict[str, dict[str, Any]]:
    """Sector participation charts from analysis DB, using JSON-first sector metadata already attached in meta."""
    bucket_ns = int(minutes * 60 * 1_000_000_000)
    rows = con.execute(
        f"""
        SELECT
          {META_SELECT} AS sector_name,
          (m.post_trade_ns_of_day / :bucket_ns) AS bucket_key,
          MIN(m.post_trade_ns_of_day) AS ns,
          SUM(COALESCE(m.trade_qty_total, 0)) AS trade_qty,
          SUM(COALESCE(m.trade_amount_paisa_total, 0)) / 100.0 AS trade_amt_rs,
          SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.buy_aggr_qty,0) / m.trade_qty_total ELSE 0 END) AS buy_aggr_amt_rs,
          SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.sell_aggr_qty,0) / m.trade_qty_total ELSE 0 END) AS sell_aggr_amt_rs,
          SUM(CASE WHEN COALESCE(m.trade_qty_total,0) > 0 THEN (m.trade_amount_paisa_total / 100.0) * COALESCE(m.ambig_qty,0) / m.trade_qty_total ELSE 0 END) AS ambig_amt_rs,
          SUM(COALESCE(m.trade_count, 0)) AS transactions
        FROM an_buckets b
        JOIN an_bucket_metrics m ON m.bucket_id = b.bucket_id
        LEFT JOIN meta.equity_meta em ON em.symbol = b.symbol
        LEFT JOIN meta.promoter_meta pm ON pm.symbol = b.symbol
        WHERE b.business_date = :business_date
        GROUP BY sector_name, bucket_key
        ORDER BY sector_name, ns
        """,
        {"business_date": business_date, "bucket_ns": bucket_ns},
    ).fetchall()
    grouped: dict[str, list[dict[str, Any]]] = {}
    running: dict[str, dict[str, float]] = {}
    for r in rows:
        d = dict(r)
        sec = d.get("sector_name") or "Unmapped"
        state = running.setdefault(sec, {"amt": 0.0, "qty": 0.0, "buy": 0.0, "sell": 0.0, "ambig": 0.0, "tx": 0.0})
        amt = float(d.get("trade_amt_rs") or 0)
        qty = int(d.get("trade_qty") or 0)
        buy = float(d.get("buy_aggr_amt_rs") or 0)
        sell = float(d.get("sell_aggr_amt_rs") or 0)
        ambig = float(d.get("ambig_amt_rs") or 0)
        tx = int(d.get("transactions") or 0)
        state["amt"] += amt; state["qty"] += qty; state["buy"] += buy; state["sell"] += sell; state["ambig"] += ambig; state["tx"] += tx
        grouped.setdefault(sec, []).append({
            "time": ns_to_interval(d.get("ns"), minutes),
            "time_hhmm": ns_to_hhmm(d.get("ns")),
            "ns": int(d.get("ns") or 0),
            "turnover_rs": round(amt, 2),
            "volume": qty,
            "transactions": tx,
            "buy_aggr_amt_rs": round(buy, 2),
            "sell_aggr_amt_rs": round(sell, 2),
            "ambig_amt_rs": round(ambig, 2),
            "cumulative_turnover_rs": round(state["amt"], 2),
            "cumulative_volume": int(state["qty"]),
            "cumulative_buy_amt_rs": round(state["buy"], 2),
            "cumulative_sell_amt_rs": round(state["sell"], 2),
            "cumulative_ambig_amt_rs": round(state["ambig"], 2),
            "cumulative_net_amt_rs": round(state["buy"] - state["sell"], 2),
            "cumulative_transactions": int(state["tx"]),
        })
    out: dict[str, dict[str, Any]] = {}
    for sec, pts in grouped.items():
        sampled = _sample_points(pts)
        final = running.get(sec, {})
        out[sec] = {
            "type": "sector_cumulative_turnover",
            "source": "analysis_db:an_bucket_metrics+sector_meta",
            "bucket_minutes": minutes,
            "points": sampled,
            "point_count": len(pts),
            "sampled_points": len(sampled),
            "final_turnover_rs": round(final.get("amt", 0), 2),
            "final_volume": int(final.get("qty", 0)),
            "final_transactions": int(final.get("tx", 0)),
            "final_buy_amt_rs": round(final.get("buy", 0), 2),
            "final_sell_amt_rs": round(final.get("sell", 0), 2),
            "final_ambig_amt_rs": round(final.get("ambig", 0), 2),
            "final_net_amt_rs": round(final.get("buy", 0) - final.get("sell", 0), 2),
            "pace_read": _pace_read_from_points(pts),
            "domain": _final_series_stats(pts, "cumulative_turnover_rs"),
        }
    return out


def _fetch_stock_orderflow_paths(con, business_date: str, minutes: int = 5) -> dict[str, dict[str, Any]]:
    """Stock cumulative delta and cumulative volume charts from actual trade-role truth.

    Delta formula: running SUM(BUY_AGGRESSOR qty - SELL_AGGRESSOR qty).
    Amount delta is also provided for presentation, but quantity delta remains the clean
    order-flow conviction line.
    """
    if not _has_object(con, "v_an_bucket_trade_roles"):
        return {}
    bucket_ns = int(minutes * 60 * 1_000_000_000)
    rows = con.execute(
        """
        SELECT
          symbol,
          (trade_ns_of_day / :bucket_ns) AS bucket_key,
          MIN(trade_ns_of_day) AS ns,
          SUM(quantity) AS volume,
          SUM(amount_paisa) / 100.0 AS turnover_rs,
          SUM(CASE WHEN trade_role = 'BUY_AGGRESSOR' THEN quantity ELSE 0 END) AS buy_qty,
          SUM(CASE WHEN trade_role = 'SELL_AGGRESSOR' THEN quantity ELSE 0 END) AS sell_qty,
          SUM(CASE WHEN trade_role = 'AMBIG' THEN quantity ELSE 0 END) AS ambig_qty,
          SUM(CASE WHEN trade_role = 'BUY_AGGRESSOR' THEN amount_paisa ELSE 0 END) / 100.0 AS buy_amt_rs,
          SUM(CASE WHEN trade_role = 'SELL_AGGRESSOR' THEN amount_paisa ELSE 0 END) / 100.0 AS sell_amt_rs,
          SUM(CASE WHEN trade_role = 'AMBIG' THEN amount_paisa ELSE 0 END) / 100.0 AS ambig_amt_rs,
          COUNT(*) AS transactions
        FROM v_an_bucket_trade_roles
        WHERE business_date = :business_date
          AND trade_ns_of_day IS NOT NULL
        GROUP BY symbol, bucket_key
        ORDER BY symbol, ns
        """,
        {"business_date": business_date, "bucket_ns": bucket_ns},
    ).fetchall()
    grouped: dict[str, list[dict[str, Any]]] = {}
    running: dict[str, dict[str, float]] = {}
    for r in rows:
        d = dict(r)
        sym = d.get("symbol")
        if not sym:
            continue
        state = running.setdefault(sym, {"vol": 0.0, "turnover": 0.0, "delta": 0.0, "delta_amt": 0.0, "buy": 0.0, "sell": 0.0, "ambig": 0.0, "buy_amt": 0.0, "sell_amt": 0.0, "ambig_amt": 0.0, "tx": 0.0})
        vol = int(d.get("volume") or 0)
        turnover = float(d.get("turnover_rs") or 0)
        buy = int(d.get("buy_qty") or 0)
        sell = int(d.get("sell_qty") or 0)
        ambig = int(d.get("ambig_qty") or 0)
        buy_amt = float(d.get("buy_amt_rs") or 0)
        sell_amt = float(d.get("sell_amt_rs") or 0)
        ambig_amt = float(d.get("ambig_amt_rs") or 0)
        tx = int(d.get("transactions") or 0)
        delta = buy - sell
        delta_amt = buy_amt - sell_amt
        state["vol"] += vol; state["turnover"] += turnover; state["delta"] += delta; state["delta_amt"] += delta_amt; state["buy"] += buy; state["sell"] += sell; state["ambig"] += ambig; state["buy_amt"] += buy_amt; state["sell_amt"] += sell_amt; state["ambig_amt"] += ambig_amt; state["tx"] += tx
        grouped.setdefault(sym, []).append({
            "time": ns_to_interval(d.get("ns"), minutes),
            "time_hhmm": ns_to_hhmm(d.get("ns")),
            "ns": int(d.get("ns") or 0),
            "volume": vol,
            "turnover_rs": round(turnover, 2),
            "buy_qty": buy,
            "sell_qty": sell,
            "ambig_qty": ambig,
            "delta_qty": int(delta),
            "buy_amt_rs": round(buy_amt, 2),
            "sell_amt_rs": round(sell_amt, 2),
            "ambig_amt_rs": round(ambig_amt, 2),
            "delta_amt_rs": round(delta_amt, 2),
            "transactions": tx,
            "cumulative_delta_qty": int(state["delta"]),
            "cumulative_delta_amt_rs": round(state["delta_amt"], 2),
            "cumulative_volume": int(state["vol"]),
            "cumulative_turnover_rs": round(state["turnover"], 2),
            "cumulative_buy_qty": int(state["buy"]),
            "cumulative_sell_qty": int(state["sell"]),
            "cumulative_ambig_qty": int(state["ambig"]),
            "cumulative_buy_amt_rs": round(state["buy_amt"], 2),
            "cumulative_sell_amt_rs": round(state["sell_amt"], 2),
            "cumulative_ambig_amt_rs": round(state["ambig_amt"], 2),
            "cumulative_transactions": int(state["tx"]),
        })
    out: dict[str, dict[str, Any]] = {}
    for sym, pts in grouped.items():
        sampled = _sample_points(pts)
        final = running.get(sym, {})
        delta_vals = [float(p.get("cumulative_delta_qty") or 0) for p in pts]
        vol_vals = [float(p.get("cumulative_volume") or 0) for p in pts]
        out[sym] = {
            "type": "stock_cumulative_delta_volume",
            "source": "analysis_db:v_an_bucket_trade_roles",
            "bucket_minutes": minutes,
            "points": sampled,
            "point_count": len(pts),
            "sampled_points": len(sampled),
            "final_delta_qty": int(final.get("delta", 0)),
            "final_delta_amt_rs": round(final.get("delta_amt", 0), 2),
            "final_volume": int(final.get("vol", 0)),
            "final_turnover_rs": round(final.get("turnover", 0), 2),
            "final_buy_qty": int(final.get("buy", 0)),
            "final_sell_qty": int(final.get("sell", 0)),
            "final_ambig_qty": int(final.get("ambig", 0)),
            "final_buy_amt_rs": round(final.get("buy_amt", 0), 2),
            "final_sell_amt_rs": round(final.get("sell_amt", 0), 2),
            "final_ambig_amt_rs": round(final.get("ambig_amt", 0), 2),
            "final_transactions": int(final.get("tx", 0)),
            "delta_domain": {
                "min": int(min(delta_vals)) if delta_vals else 0,
                "max": int(max(delta_vals)) if delta_vals else 0,
                "close": int(delta_vals[-1]) if delta_vals else 0,
            },
            "volume_domain": {"min": 0, "max": int(max(vol_vals)) if vol_vals else 0, "close": int(vol_vals[-1]) if vol_vals else 0},
            "flow_read": _stock_flow_path_read(pts),
        }
    return out


def _stock_flow_path_read(points: list[dict[str, Any]]) -> str:
    if len(points) < 2:
        return "Not enough trade-role points for an intraday flow path."
    final_delta = int(points[-1].get("cumulative_delta_qty") or 0)
    lows = min(int(p.get("cumulative_delta_qty") or 0) for p in points)
    highs = max(int(p.get("cumulative_delta_qty") or 0) for p in points)
    if final_delta > 0 and lows < 0:
        return "Buy aggression recovered after early sell pressure and finished positive."
    if final_delta > 0:
        return "Buy aggression stayed dominant into the close."
    if final_delta < 0 and highs > 0:
        return "Sell pressure took control after early buy attempts."
    if final_delta < 0:
        return "Sell aggression stayed dominant into the close."
    return "Cumulative delta finished balanced; conviction was mixed."

def _organize_sectors(sectors: list[dict[str, Any]], stocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_sector = {s["sector_name"]: {**s, "stocks": []} for s in sectors}
    for st in stocks:
        by_sector.setdefault(st["sector_name"], {
            "sector_name": st["sector_name"],
            "active_stocks": 0,
            "summary": {},
            "index": None,
            "stocks": [],
        })["stocks"].append(st)
    for sec in by_sector.values():
        sec["stocks"].sort(key=lambda x: x["summary"].get("trade_amt_rs", 0), reverse=True)
    return sorted(by_sector.values(), key=lambda x: x.get("summary", {}).get("trade_amt_rs", 0), reverse=True)



def _featured_candidates(stocks: list[dict[str, Any]], sectors: list[dict[str, Any]], limit: int = 8) -> list[dict[str, Any]]:
    """Return video-ready featured stock candidates with transparent scoring.

    The model/narrative layer may write language, but this function chooses candidates
    deterministically from database facts: turnover, aggressor imbalance, bucket count,
    confidence, explainability, and sector importance.
    """
    if not stocks:
        return []
    max_trade_amt = max((s["summary"].get("trade_amt_rs", 0) for s in stocks), default=1) or 1
    max_net_qty = max((abs(s["summary"].get("net_aggr_qty", 0)) for s in stocks), default=1) or 1
    max_net_amt = max((abs(s["summary"].get("net_aggr_amt_rs", 0)) for s in stocks), default=1) or 1
    max_buckets = max((s["summary"].get("buckets", 0) for s in stocks), default=1) or 1
    sector_amt = {s["sector_name"]: s["summary"].get("trade_amt_rs", 0) for s in sectors}
    max_sector_amt = max(sector_amt.values(), default=1) or 1
    candidates: list[dict[str, Any]] = []
    for s in stocks:
        sm = s["summary"]
        conf = float(sm.get("confidence_pct", 0) or 0)
        expl = float(sm.get("explainability_pct", 0) or 0)
        trade_amt = float(sm.get("trade_amt_rs", 0) or 0)
        buckets = int(sm.get("buckets", 0) or 0)
        buy_qty = int(sm.get("buy_aggr_qty", 0) or 0)
        sell_qty = int(sm.get("sell_aggr_qty", 0) or 0)
        net_qty = int(sm.get("net_aggr_qty", buy_qty - sell_qty) or 0)
        net_amt = float(sm.get("net_aggr_amt_rs", 0) or 0)
        total_directional = max(abs(buy_qty) + abs(sell_qty), 1)
        imbalance_pct = abs(net_qty) / total_directional * 100.0
        passes = conf >= 70 and expl >= 70 and trade_amt > 0 and buckets >= 5
        if not passes:
            continue
        score_parts = {
            "turnover": round((trade_amt / max_trade_amt) * 100, 2),
            "net_aggr_qty": round((abs(net_qty) / max_net_qty) * 100, 2),
            "net_aggr_amt": round((abs(net_amt) / max_net_amt) * 100, 2),
            "bucket_count": round((buckets / max_buckets) * 100, 2),
            "confidence": round(conf, 2),
            "explainability": round(expl, 2),
            "sector_importance": round((sector_amt.get(s["sector_name"], 0) / max_sector_amt) * 100, 2),
            "imbalance_pct": round(imbalance_pct, 2),
        }
        weights = {
            "turnover": 0.22,
            "net_aggr_qty": 0.22,
            "net_aggr_amt": 0.18,
            "bucket_count": 0.10,
            "confidence": 0.08,
            "explainability": 0.08,
            "sector_importance": 0.08,
            "imbalance_pct": 0.04,
        }
        score = sum(score_parts[k] * weights[k] for k in weights)
        side = "buy-aggressive" if net_qty > 0 else "sell-aggressive" if net_qty < 0 else "mixed"
        item = dict(s)
        item["featured_score"] = round(score, 2)
        item["featured_rank_reason"] = f"{side} stock with strong turnover, visible imbalance, evidence quality, and sector context."
        item["score_breakdown"] = {
            "score": round(score, 2),
            "weights": weights,
            "parts": score_parts,
            "publication_filter": {
                "confidence_min": 70,
                "explainability_min": 70,
                "bucket_min": 5,
                "passed": True,
            },
        }
        item["why_selected"] = [
            f"Featured score {round(score, 2)} from turnover, aggressor imbalance, bucket count, confidence, explainability, and sector importance.",
            f"Net aggressor quantity is {net_qty:,}, creating a clear {side} daily story.",
            f"Proxy net aggressor amount is Rs {net_amt:,.2f}, so the story is visible in amount as well as quantity.",
            f"Evidence quality passed publication filter: confidence {conf:.1f}% and explainability {expl:.1f}%.",
            f"Sector context is available through {s['sector_name']} board and index-intelligence panel when present.",
        ]
        item["video_angle"] = {
            "headline_question": f"Was {s['symbol']} simply active, or did the {side} flow show real pressure?",
            "story_mode": "Buy pressure continuation" if net_qty > 0 else "Sell pressure / distribution check" if net_qty < 0 else "Mixed pressure / absorption check",
            "proof_path": [
                "Start at public daily issue summary.",
                f"Open {s['sector_name']} sector board and compare sector pressure.",
                f"Open {s['symbol']} stock summary and read full-number net flow.",
                "Use Truth Viewer to inspect largest buckets.",
                "Use broker role view to check if pressure is concentrated or broad.",
                "Use PRE→POST ladder/replay to check whether pressure was absorbed or followed through.",
            ],
        }
        item["thumbnail_facts"] = [
            f"{s['symbol']}",
            "FLOW TRUTH",
            "BUY PRESSURE" if net_qty > 0 else "SELL PRESSURE" if net_qty < 0 else "MIXED FLOW",
        ]
        item["watch_next_session"] = [
            "Does the next session continue in the same aggressor direction?",
            "Does price respond to pressure or absorb it?",
            "Do the same brokers continue to lead or does flow rotate?",
        ]
        candidates.append(item)
    candidates.sort(key=lambda x: x["featured_score"], reverse=True)
    return candidates[:limit]

def _featured_stock(stocks: list[dict[str, Any]], sectors: list[dict[str, Any]]) -> dict[str, Any] | None:
    candidates = _featured_candidates(stocks, sectors, limit=1)
    return candidates[0] if candidates else (max(stocks, key=lambda x: x["summary"].get("trade_amt_rs", 0)) if stocks else None)


def _validation(con, business_date: str) -> dict[str, Any]:
    total = con.execute("SELECT COUNT(DISTINCT symbol) FROM an_buckets WHERE business_date=?", (business_date,)).fetchone()[0]
    rows = con.execute(
        f"""
        SELECT b.symbol, MAX(em.sectorName) AS equity_sector, MAX(pm.sectorName) AS promoter_sector,
               {META_SELECT} AS sector_name,
               MAX(em.companyName) AS equity_company, MAX(pm.companyName) AS promoter_company
        FROM an_buckets b
        LEFT JOIN meta.equity_meta em ON em.symbol = b.symbol
        LEFT JOIN meta.promoter_meta pm ON pm.symbol = b.symbol
        WHERE b.business_date = ?
        GROUP BY b.symbol
        ORDER BY b.symbol
        """,
        (business_date,),
    ).fetchall()
    unmapped = []
    promoter_fallback = []
    missing_company = []
    for r in rows:
        d = dict(r)
        if d.get("sector_name") == "Unmapped":
            unmapped.append(d["symbol"])
        if not d.get("equity_sector") and d.get("promoter_sector"):
            promoter_fallback.append(d["symbol"])
        if not d.get("equity_company") and not d.get("promoter_company"):
            missing_company.append(d["symbol"])
    return {
        "analysis_symbols": int(total),
        "mapped_symbols": int(total - len(unmapped)),
        "unmapped_symbols": unmapped,
        "promoter_fallback_symbols": promoter_fallback,
        "missing_company_symbols": missing_company,
    }




def _stock_board_row(stock: dict[str, Any]) -> dict[str, Any]:
    sm = stock.get("summary") or {}
    return {
        "symbol": stock.get("symbol"),
        "company_name": stock.get("company_name"),
        "sector_name": stock.get("sector_name"),
        "ltp_rs": sm.get("ltp_rs") or sm.get("close_rs"),
        "previous_close_rs": sm.get("previous_close_rs"),
        "change_rs": sm.get("change_rs"),
        "change_pct": sm.get("change_pct"),
        "turnover_rs": sm.get("actual_trade_amt_rs") or sm.get("trade_amt_rs"),
        "shares_traded": sm.get("actual_trade_qty") or sm.get("trade_qty"),
        "transactions": sm.get("transactions"),
        "buy_aggr_qty": sm.get("buy_aggr_actual_qty") if sm.get("buy_aggr_actual_qty") is not None else sm.get("buy_aggr_qty"),
        "sell_aggr_qty": sm.get("sell_aggr_actual_qty") if sm.get("sell_aggr_actual_qty") is not None else sm.get("sell_aggr_qty"),
        "net_aggr_qty": sm.get("net_aggr_qty"),
        "buy_aggr_amt_rs": sm.get("buy_aggr_actual_amt_rs") if sm.get("buy_aggr_actual_amt_rs") is not None else sm.get("buy_aggr_amt_rs"),
        "sell_aggr_amt_rs": sm.get("sell_aggr_actual_amt_rs") if sm.get("sell_aggr_actual_amt_rs") is not None else sm.get("sell_aggr_amt_rs"),
        "net_aggr_amt_rs": sm.get("net_aggr_amt_rs"),
        "same_broker_amt_rs": sm.get("same_broker_amt_rs"),
        "same_broker_matched_amt_rs": sm.get("same_broker_matched_amt_rs"),
        "same_broker_qty": sm.get("same_broker_qty"),
        "same_broker_trades": sm.get("same_broker_trades"),
        "same_broker_turnover_pct": sm.get("same_broker_turnover_pct"),
        "day_vwap_rs": sm.get("day_vwap_rs"),
        "high_rs": sm.get("high_rs"),
        "low_rs": sm.get("low_rs"),
        "evidence_label": sm.get("evidence_label"),
        "confidence_pct": sm.get("confidence_pct"),
        "explainability_pct": sm.get("explainability_pct"),
        "story_hint": _story_hint(sm),
    }


def _story_hint(sm: dict[str, Any]) -> str:
    change = float(sm.get("change_pct") or 0)
    net_qty = int(sm.get("net_aggr_qty") or 0)
    if change > 0 and net_qty > 0:
        return "price up with buy aggression"
    if change > 0 and net_qty < 0:
        return "price up but sellers active / absorption check"
    if change < 0 and net_qty < 0:
        return "price down with sell aggression"
    if change < 0 and net_qty > 0:
        return "price down despite buy aggression / failed support check"
    return "mixed price-flow story"


def _fetch_leaderboards(stocks: list[dict[str, Any]]) -> dict[str, Any]:
    rows = [_stock_board_row(s) for s in stocks]
    with_price = [r for r in rows if r.get("ltp_rs") is not None and r.get("previous_close_rs") not in (None, 0) and r.get("change_pct") is not None]
    gainers = sorted([r for r in with_price if float(r.get("change_pct") or 0) > 0], key=lambda r: float(r.get("change_pct") or 0), reverse=True)
    losers = sorted([r for r in with_price if float(r.get("change_pct") or 0) < 0], key=lambda r: float(r.get("change_pct") or 0))
    turnover = sorted(rows, key=lambda r: float(r.get("turnover_rs") or 0), reverse=True)
    volume = sorted(rows, key=lambda r: int(r.get("shares_traded") or 0), reverse=True)
    transactions = sorted(rows, key=lambda r: int(r.get("transactions") or 0), reverse=True)
    return {
        "source": "analysis_db_last_post_and_trade_roles",
        "definition": {
            "ltp": "last POST frame ltp_scaled",
            "previous_close": "last POST frame close_scaled",
            "change": "ltp_scaled minus close_scaled",
            "turnover_volume_transactions": "analysis bucket trade-role/metric totals",
            "same_broker_match": "buyer_member_id equals seller_member_id in v_an_bucket_trade_roles; context metric only, not an accusation",
        },
        "total_symbols": len(rows),
        "top_gainers": gainers,
        "top_losers": losers,
        "top_turnover": turnover,
        "top_volume": volume,
        "top_transactions": transactions,
    }

def build_daily_issue(analysis_db: str, company_meta_db: str | None, index_db: str | None, business_date: str, index_meta_json: str | None = None) -> dict[str, Any]:
    con = connect_readonly(analysis_db)
    meta_info = prepare_metadata(con, company_meta_db, index_meta_json)
    has_index = attach_database(con, "idx", index_db) if index_db else False
    print(f"Building market summary for {business_date}...", file=sys.stderr, flush=True)
    market = _fetch_market(con, business_date)
    _apply_same_broker_metrics(market, _fetch_same_broker_market(con, business_date))
    print("Building stock summaries...", file=sys.stderr, flush=True)
    stocks = _fetch_stock_rows(con, business_date)
    print("Building sector summaries...", file=sys.stderr, flush=True)
    sectors_raw = _sectors_from_stocks(con, business_date, stocks, has_index)
    sectors = _organize_sectors(sectors_raw, stocks)
    print("Building market intervals...", file=sys.stderr, flush=True)
    intervals = _fetch_intervals(con, business_date)
    print("Building presentation order-flow paths...", file=sys.stderr, flush=True)
    market_cumulative_turnover = _fetch_market_cumulative_turnover(con, business_date)
    sector_cumulative_turnovers = _fetch_sector_cumulative_turnover(con, business_date)
    stock_orderflow_paths = _fetch_stock_orderflow_paths(con, business_date)
    for sec in sectors:
        sec["cumulative_turnover"] = sector_cumulative_turnovers.get(sec.get("sector_name") or "")
        for st in sec.get("stocks") or []:
            sm = st.setdefault("summary", {})
            sm["orderflow_path"] = stock_orderflow_paths.get(st.get("symbol") or "")
    print("Selecting featured stock candidates...", file=sys.stderr, flush=True)
    featured_candidates = _featured_candidates(stocks, sectors, limit=8)
    featured = featured_candidates[0] if featured_candidates else _featured_stock(stocks, sectors)
    leaderboards = _fetch_leaderboards(stocks)
    payload = {
        "schema_version": "content-issue-v2-phase14-orderflow-boards",
        "business_date": business_date,
        "brand": {
            "name": "Nepse_Master_Trade & Analysis",
            "short_name": "NEPSE MTA",
            "tagline": "Database-first NEPSE order-flow publication",
        },
        "method": {
            "buy_sell_definition": "Buy/Sell means aggressor flow, not participant buyer/seller.",
            "aggressor_amount_definition": "Agg Amt is proxy-allocated from bucket turnover by bucket aggressor-qty shares; stock-level role VWAPs use actual row-level trade roles when v_an_bucket_trade_roles is available.",
            "price_truth_definition": "For the selected business date, each stock uses its last POST frame: ltp_scaled is today close/LTP, close_scaled is previous close, and open/high/low/avg are day fields.",
            "sector_source": "Sector membership comes from nepse_index_meta.json when available; only sector sub-index constituents assign sectors; old nepse_company_meta.sqlite is fallback/enrichment only; unmapped remains explicit.",
            "index_source": "Index movement comes from index_analysis/index_intelligence SQLite by indexCode; it is not used to invent stock sector membership.",
            "same_broker_definition": "Same-broker match means buyer_member_id equals seller_member_id in v_an_bucket_trade_roles. It is shown as context, not proof of coordination.",
            "public_boundary": "Website summarises. Truth Viewer / Order Flow Platform proves.",
        },
        "market_summary": market,
        "market_index": market_index(con, business_date) if has_index else None,
        "market_intervals": intervals,
        "market_cumulative_turnover": market_cumulative_turnover,
        "sectors": sectors,
        "featured_stock": featured,
        "featured_candidates": featured_candidates,
        "leaderboards": leaderboards,
        "validation": _validation(con, business_date),
        "source_lock": {
            "business_date": business_date,
            "analysis_db": str(analysis_db),
            "index_meta_json": str(index_meta_json or meta_info.get("path") or ""),
            "metadata_source": meta_info,
            "company_meta_db": str(company_meta_db or ""),
            "index_db": str(index_db or ""),
            "date_lock_rule": "A dated route must read only its own daily JSON file and must not fall back to latest content.",
        },
        "publishing": {
            "status": "draft",
            "published": False,
            "article_approved": False,
            "youtube_url": "",
            "editor_notes": "",
            "reviewed_by": "",
            "public_url": f"/daily/{business_date}",
            "admin_url": f"/admin/daily/{business_date}",
            "public_rule": "Public pages hide admin scoring, candidate ranking, production packs, raw JSON, copy tools, and analytics.",
        },
        "admin_editor": {
            "phase": "Phase 10 — Content Indexing + Writer Workflow",
            "production_flow": [
                "Validate metadata mapping and promoter fallback symbols.",
                "Review featured-stock candidate score and final featured stock.",
                "Review sector board and stock rows before public publishing.",
                "Copy article and YouTube package into production workflow.",
                "Record video using Truth Viewer / Order Flow Platform.",
                "Add YouTube URL and mark issue ready/published.",
                "Verify archive, SEO metadata, and sitemap outputs.",
            ],
        },
        "archive_foundation": {
            "daily_archive_route": "/daily",
            "stock_archive_route": "/stocks",
            "sector_archive_route": "/sectors",
            "video_archive_route": "/videos",
            "seo_payload_route": "/content/seo/daily/{date}.json",
            "sitemap_json_route": "/content/sitemap.json",
        },
        "analytics_foundation": {
            "phase": "Phase 10 — Content Indexing + Writer Workflow",
            "admin_route": "/admin/analytics",
            "daily_route": f"/admin/analytics/daily/{business_date}",
            "privacy_rule": "Track anonymous content interaction signals only; do not track personal holdings, broker accounts, or invasive identity fingerprints.",
            "content_question": "Which sectors, stocks, and featured videos did readers care about enough to click, search, or watch?",
            "events": [
                "daily_issue_viewed", "market_summary_viewed", "sector_clicked", "stock_row_clicked",
                "featured_stock_viewed", "video_block_viewed", "youtube_clicked", "search_used",
                "admin_state_saved", "youtube_package_copied"
            ],
        },
    }
    payload["article"] = make_article(payload)
    payload["generated_article"] = payload["article"]
    payload["published_article"] = payload["article"]
    payload["youtube_package"] = make_youtube_package(payload)
    payload["public"] = {
        "business_date": business_date,
        "hero": {
            "title": payload["article"].get("title"),
            "hero_thesis": payload["article"].get("hero_thesis"),
            "market_bias": market.get("bias"),
            "leading_sector": sectors[0]["sector_name"] if sectors else None,
            "featured_symbol": featured.get("symbol") if featured else None,
            "evidence_label": market.get("evidence_label"),
        },
        "market_summary": market,
        "market_index": payload.get("market_index"),
        "market_intervals": intervals,
        "leaderboards": leaderboards,
        "sectors": sectors,
        "featured_stock": featured,
        "article": payload["published_article"],
        "video": {
            "youtube_url": "",
            "status": "coming_soon",
            "covers": ["Market summary", "Sector context", "Featured stock behavior", "Bucket/replay proof in video"],
        },
        "method": payload["method"],
    }
    payload["admin"] = {
        "validation": payload["validation"],
        "featured_candidates": featured_candidates,
        "youtube_package": payload["youtube_package"],
        "admin_editor": payload["admin_editor"],
        "analytics_foundation": payload["analytics_foundation"],
    }
    payload["seo"] = make_seo(payload)
    payload["archive_entry"] = make_archive_entry(payload)
    con.close()
    return payload



def _public_stock(stock: dict[str, Any] | None) -> dict[str, Any] | None:
    if not stock:
        return None
    return {
        "symbol": stock.get("symbol"),
        "company_name": stock.get("company_name"),
        "security_name": stock.get("security_name"),
        "sector_name": stock.get("sector_name"),
        "summary": stock.get("summary"),
    }


def _public_sector(sector: dict[str, Any]) -> dict[str, Any]:
    return {
        "sector_name": sector.get("sector_name"),
        "active_stocks": sector.get("active_stocks"),
        "summary": sector.get("summary"),
        "index": sector.get("index"),
        "cumulative_turnover": sector.get("cumulative_turnover"),
        "stocks": [_public_stock(st) for st in (sector.get("stocks") or [])],
    }


def _make_public_issue(issue: dict[str, Any]) -> dict[str, Any]:
    """Strip admin-only data before writing anything under frontend/public/content."""
    business_date = issue.get("business_date")
    publishing = issue.get("publishing") or {}
    youtube = issue.get("youtube_package") or {}
    article = issue.get("published_article") or issue.get("article") or issue.get("generated_article") or {}
    cms = issue.get("cms") or issue.get("public_cms") or {}
    public_featured = _public_stock(issue.get("featured_stock"))
    video_url = publishing.get("youtube_url") or youtube.get("youtube_url") or ""
    public_issue = {
        "schema_version": issue.get("schema_version", "content-issue-v2-phase14-orderflow-boards-public"),
        "business_date": business_date,
        "brand": issue.get("brand"),
        "source_lock": issue.get("source_lock"),
        "method": issue.get("method"),
        "market_summary": issue.get("market_summary"),
        "market_index": issue.get("market_index"),
        "market_intervals": issue.get("market_intervals", []),
        "market_cumulative_turnover": issue.get("market_cumulative_turnover"),
        "leaderboards": issue.get("leaderboards", {}),
        "sectors": [_public_sector(sec) for sec in (issue.get("sectors") or [])],
        "featured_stock": public_featured,
        "article": article,
        "published_article": article,
        "cms": cms,
        "public_cms": cms,
        "publishing": {
            "status": publishing.get("status", "draft"),
            "published": bool(publishing.get("published") or publishing.get("status") == "published"),
            "youtube_url": video_url,
            "public_url": publishing.get("public_url") or f"/daily/{business_date}",
        },
        "youtube_package": {
            "business_date": business_date,
            "featured_symbol": (public_featured or {}).get("symbol"),
            "featured_sector": (public_featured or {}).get("sector_name"),
            "title_options": (youtube.get("title_options") or [])[:1],
            "youtube_url": video_url,
            "video_id": youtube.get("video_id"),
        },
        "public": issue.get("public"),
        "archive_entry": issue.get("archive_entry"),
        "seo": issue.get("seo"),
    }
    public_issue["public"] = {
        "business_date": business_date,
        "hero": {
            "title": article.get("title"),
            "hero_thesis": article.get("hero_thesis"),
            "market_bias": (issue.get("market_summary") or {}).get("bias"),
            "leading_sector": ((issue.get("sectors") or [{}])[0] or {}).get("sector_name"),
            "featured_symbol": (public_featured or {}).get("symbol"),
            "evidence_label": (issue.get("market_summary") or {}).get("evidence_label"),
        },
        "market_summary": public_issue["market_summary"],
        "market_index": public_issue["market_index"],
        "market_intervals": public_issue["market_intervals"],
        "market_cumulative_turnover": public_issue.get("market_cumulative_turnover"),
        "leaderboards": public_issue.get("leaderboards", {}),
        "sectors": public_issue["sectors"],
        "featured_stock": public_featured,
        "article": article,
        "cms": cms,
        "video": {
            "youtube_url": video_url,
            "status": "available" if video_url else "coming_soon",
            "covers": ["Market summary", "Sector context", "Featured stock behavior", "Bucket/replay proof in video"],
        },
        "method": issue.get("method"),
    }
    return public_issue

def write_daily_issue(payload: dict[str, Any], out_root: str | Path | None = None) -> Path:
    content_root = Path(out_root) if out_root else CONTENT_ROOT
    daily_root = content_root / "daily"
    admin_root = ADMIN_DAILY_ROOT
    daily_root.mkdir(parents=True, exist_ok=True)
    content_root.mkdir(parents=True, exist_ok=True)
    admin_root.mkdir(parents=True, exist_ok=True)
    date = payload["business_date"]

    payload["schema_version"] = "content-issue-v2-phase14-orderflow-boards"
    payload["seo"] = make_seo(payload)
    payload["archive_entry"] = make_archive_entry(payload)

    admin_file = admin_root / f"{date}.admin.json"
    admin_file.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    public_payload = _make_public_issue(payload)
    public_payload["schema_version"] = "content-issue-v2-phase14-orderflow-boards-public"
    public_payload["seo"] = make_seo(public_payload)
    public_payload["archive_entry"] = make_archive_entry(public_payload)

    out_file = daily_root / f"{date}.json"
    out_file.write_text(json.dumps(public_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (content_root / "latest.json").write_text(json.dumps({"latest_date": date, "issue": public_payload}, ensure_ascii=False, indent=2), encoding="utf-8")
    write_archive_outputs(content_root, public_payload)
    build_content_indexes(content_root)
    out_file.write_text(json.dumps(public_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (content_root / "latest.json").write_text(json.dumps({"latest_date": date, "issue": public_payload}, ensure_ascii=False, indent=2), encoding="utf-8")
    return out_file


def main() -> None:
    parser = argparse.ArgumentParser(description="Build NEPSE MTA daily content issue JSON")
    parser.add_argument("--analysis-db", required=True)
    parser.add_argument("--company-meta-db", default="")
    parser.add_argument("--index-meta-json", default="")
    parser.add_argument("--index-db", default="")
    parser.add_argument("--date", required=True)
    parser.add_argument("--out-root", default=str(CONTENT_ROOT))
    args = parser.parse_args()
    payload = build_daily_issue(args.analysis_db, args.company_meta_db or None, args.index_db or None, args.date, args.index_meta_json or None)
    out = write_daily_issue(payload, args.out_root)
    print(f"Wrote {out}")
    print(f"Market: {payload['market_summary']['buckets']:,} buckets, {payload['market_summary']['trade_qty']:,} qty")
    print(f"Sectors: {len(payload['sectors'])}; Featured: {payload['featured_stock']['symbol'] if payload.get('featured_stock') else 'None'}")
    print(f"Validation: {payload['validation']}")


if __name__ == "__main__":
    main()
    import os as _os, sys as _sys
    _sys.stdout.flush(); _sys.stderr.flush()
    _os._exit(0)
