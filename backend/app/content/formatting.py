from __future__ import annotations


def safe_float(v, default=0.0) -> float:
    if v is None:
        return default
    try:
        return float(v)
    except Exception:
        return default


def safe_int(v, default=0) -> int:
    if v is None:
        return default
    try:
        return int(v)
    except Exception:
        return default


def pct_from_scaled(v) -> float:
    # analysis DB stores confidence/explainability at 1e9 = 100%.
    if v is None:
        return 0.0
    return round(float(v) / 10_000_000.0, 2)


def price_from_scaled(v) -> float | None:
    if v is None:
        return None
    return round(float(v) / 100.0, 2)


def ns_to_hhmm(ns: int | None) -> str:
    if ns is None:
        return "--:--"
    total_seconds = int(ns // 1_000_000_000)
    h = total_seconds // 3600
    m = (total_seconds % 3600) // 60
    return f"{h:02d}:{m:02d}"


def ns_to_interval(ns: int | None, minutes: int = 5) -> str:
    if ns is None:
        return "--:--"
    total_minutes = int(ns // 60_000_000_000)
    bucket = (total_minutes // minutes) * minutes
    h = bucket // 60
    m = bucket % 60
    return f"{h:02d}:{m:02d}"


def evidence_label(confidence_pct: float, explainability_pct: float, gap_count: int = 0) -> str:
    if confidence_pct >= 85 and explainability_pct >= 85 and gap_count == 0:
        return "High Evidence"
    if confidence_pct >= 70 and explainability_pct >= 70:
        return "Medium Evidence"
    return "Lower Evidence"


def flow_bias(net_qty: int | float, buy_qty: int | float, sell_qty: int | float) -> str:
    total = abs(float(buy_qty or 0)) + abs(float(sell_qty or 0))
    if total <= 0:
        return "Neutral"
    share = abs(float(net_qty or 0)) / total
    if share < 0.08:
        return "Mixed"
    return "Buy-aggressive" if float(net_qty or 0) > 0 else "Sell-aggressive"
