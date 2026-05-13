from __future__ import annotations


def _fmt_int(v: object) -> str:
    return f"{int(v or 0):,}"


def _fmt_rs(v: object) -> str:
    return f"Rs {float(v or 0):,.2f}"


def _fmt_pct(v: object) -> str:
    return f"{float(v or 0):,.1f}%"


def _side_word(net_qty: int | float | None) -> str:
    n = float(net_qty or 0)
    if n > 0:
        return "buy-aggressive"
    if n < 0:
        return "sell-aggressive"
    return "mixed"


def _stock_angle(stock: dict) -> str:
    sm = stock.get("summary", {})
    side = _side_word(sm.get("net_aggr_qty"))
    symbol = stock.get("symbol", "the stock")
    if side == "buy-aggressive":
        return f"{symbol} became the buy-pressure stock to inspect because aggressive buying controlled the reconstructed net flow."
    if side == "sell-aggressive":
        return f"{symbol} became the sell-pressure stock to inspect because aggressive selling controlled the reconstructed net flow."
    return f"{symbol} became the mixed-flow stock to inspect because activity was meaningful but the aggressor side was not one-sided."


def make_article(payload: dict) -> dict:
    market = payload["market_summary"]
    sectors = payload.get("sectors", [])
    featured = payload.get("featured_stock") or {}
    top_sector = sectors[0] if sectors else None
    bias = market.get("bias", "Mixed")
    date = payload["business_date"]
    sector_name = top_sector["sector_name"] if top_sector else "the active sectors"
    symbol = featured.get("symbol", "the featured stock")
    featured_summary = featured.get("summary", {})
    stock_angle = _stock_angle(featured) if featured else "The featured stock block turns the daily summary into a video-ready story."

    return {
        "title": f"NEPSE Daily Order-Flow Summary — {date}",
        "hero_thesis": f"{bias} pressure shaped the market, with {sector_name} carrying the largest order-flow footprint and {symbol} selected for video proof.",
        "opening": (
            f"Today’s NEPSE issue reads the market through reconstructed bucket flow, not only price movement. "
            f"The public page gives the market, sector, and stock story in one flow, while the video should prove the deeper bucket, broker, replay, and ladder context."
        ),
        "market_paragraph": (
            f"Across {_fmt_int(market.get('buckets'))} buckets, total trade quantity reached {_fmt_int(market.get('trade_qty'))} and turnover reached "
            f"{_fmt_rs(market.get('trade_amt_rs'))}. Buy-aggressive quantity was {_fmt_int(market.get('buy_aggr_qty'))}, sell-aggressive quantity was "
            f"{_fmt_int(market.get('sell_aggr_qty'))}, leaving net aggressor quantity of {_fmt_int(market.get('net_aggr_qty'))}. "
            f"Confidence was {_fmt_pct(market.get('confidence_pct'))} and explainability was {_fmt_pct(market.get('explainability_pct'))}."
        ),
        "sector_paragraph": (
            f"The sector board is the bridge from whole-market pressure to individual stock behaviour. {sector_name} led the turnover footprint, "
            f"but the sector should be read together with net aggressor quantity, confidence, explainability, and flags before making a strong claim."
        ),
        "featured_stock_paragraph": (
            f"The featured stock for the video workflow is {symbol}. {stock_angle} "
            f"Its daily turnover was {_fmt_rs(featured_summary.get('trade_amt_rs'))}, net aggressor quantity was {_fmt_int(featured_summary.get('net_aggr_qty'))}, "
            f"and net proxy aggressor amount was {_fmt_rs(featured_summary.get('net_aggr_amt_rs'))}."
        ),
        "video_intro": (
            f"The video should not repeat the website. It should open the Truth Viewer and Order Flow Platform to prove why {symbol} was selected: "
            f"largest buckets, pressure timing, broker role behaviour, PRE→POST ladder response, and what to watch next session."
        ),
    }


def make_youtube_package(payload: dict) -> dict:
    featured = payload.get("featured_stock") or {}
    market = payload["market_summary"]
    sectors = payload.get("sectors", [])
    symbol = featured.get("symbol", "Featured Stock")
    company = featured.get("company_name") or featured.get("security_name") or symbol
    sector = featured.get("sector_name", "NEPSE")
    sm = featured.get("summary", {})
    bias = market.get("bias", "Market Flow")
    stock_side = _side_word(sm.get("net_aggr_qty"))
    top_sector = sectors[0]["sector_name"] if sectors else sector

    title_options = [
        f"{symbol} Order Flow Analysis | NEPSE Daily Market Summary",
        f"NEPSE Today: {bias} Market + {symbol} Stock Deep Dive",
        f"{symbol} Stock: Bucket Flow, Sector Pressure & Market Context",
        f"Why {symbol} Became Today’s NEPSE Stock of Interest",
        f"NEPSE Order Flow: Market → {sector} → {symbol}",
    ]
    thumbnail_text_options = [
        f"{symbol} FLOW TRUTH",
        "ORDER FLOW PROOF",
        "BUY OR SELL PRESSURE?",
        f"{sector.upper()} STORY"[:28],
        "BUCKET + BROKER",
        "NEXT SESSION WATCH",
    ]
    hook = (
        f"Today we first read the whole NEPSE market, then the {top_sector} sector pressure, and finally why {symbol} became the stock of interest. "
        f"This is not only a price review; the question is whether {symbol}'s {stock_side} flow was strong enough to deserve a deeper bucket and broker check."
    )
    chapters = [
        {"time": "00:00", "title": "Market hook and today's main question"},
        {"time": "00:35", "title": "Whole-market aggressor summary"},
        {"time": "01:45", "title": "Sector board and turnover leaders"},
        {"time": "03:00", "title": f"Why {symbol} was selected"},
        {"time": "04:20", "title": f"{symbol} stock summary numbers"},
        {"time": "05:30", "title": "Truth Viewer bucket evidence"},
        {"time": "07:30", "title": "Broker role and replay context"},
        {"time": "09:30", "title": "PRE to POST ladder reaction"},
        {"time": "11:00", "title": "What to watch next session"},
    ]
    key_numbers = [
        {"label": "Market Net Agg Qty", "value": _fmt_int(market.get("net_aggr_qty"))},
        {"label": f"{symbol} Trade Amt", "value": _fmt_rs(sm.get("trade_amt_rs"))},
        {"label": f"{symbol} Net Agg Qty", "value": _fmt_int(sm.get("net_aggr_qty"))},
        {"label": f"{symbol} Net Agg Amt", "value": _fmt_rs(sm.get("net_aggr_amt_rs"))},
        {"label": "Confidence", "value": _fmt_pct(sm.get("confidence_pct"))},
        {"label": "Explainability", "value": _fmt_pct(sm.get("explainability_pct"))},
    ]
    recording_blueprint = [
        "Start with the public daily issue page and state the market bias in one sentence.",
        f"Open the sector board and show why {sector} matters in today’s context.",
        f"Open {symbol} in the stock teaser and read the net aggressor quantity and proxy amount.",
        "Switch to NEPSE Truth Viewer for PRE→TRADE→POST bucket proof.",
        "Open broker role / bucket feed evidence and identify whether pressure was concentrated or broad.",
        "Close with what to watch next session: continuation, absorption, failed sweep, or reversal response.",
    ]
    proof_checklist = [
        "Show the summary bar before making a claim.",
        "Show confidence and explainability before interpreting pressure.",
        "Check the largest buckets, not only totals.",
        "Check whether pressure aligned with sector movement.",
        "Check whether broker behaviour confirms or weakens the story.",
        "Remind viewers that this is educational analysis, not financial advice.",
    ]

    description = (
        f"NEPSE daily order-flow summary for {payload.get('business_date')} with market, sector, and {symbol} stock context.\n\n"
        f"Featured stock: {symbol} — {company}\n"
        f"Sector: {sector}\n"
        f"Market bias: {bias}\n"
        f"{symbol} net aggressor quantity: {_fmt_int(sm.get('net_aggr_qty'))}\n"
        f"{symbol} net proxy aggressor amount: {_fmt_rs(sm.get('net_aggr_amt_rs'))}\n\n"
        "This video uses reconstructed bucket flow, aggressor quantity, proxy aggressor amount, confidence, explainability, sector context, and Truth Viewer evidence.\n\n"
        "Educational content only. Not financial advice."
    )

    return {
        "version": "youtube-package-v2-phase4",
        "featured_symbol": symbol,
        "featured_company": company,
        "featured_sector": sector,
        "title_options": title_options,
        "thumbnail_text_options": thumbnail_text_options,
        "hook": hook,
        "opening_script": (
            f"Today we are not starting with opinion. We are starting with the database. The market bias was {bias}, "
            f"the strongest sector context was {top_sector}, and the stock we will prove today is {symbol}."
        ),
        "chapters": chapters,
        "description": description,
        "pinned_comment": (
            f"Today’s flow story: market bias = {bias}; featured stock = {symbol}; sector = {sector}. "
            "Which stock should be checked next with bucket + broker evidence?"
        ),
        "tags": ["NEPSE", "Nepal Stock Exchange", "Order Flow", "Market Analysis", symbol, sector, "Aggressor Flow", "Bucket Analysis", "Broker Flow"],
        "key_on_screen_numbers": key_numbers,
        "recording_blueprint": recording_blueprint,
        "proof_checklist": proof_checklist,
        "thumbnail_direction": {
            "layout": "Dark premium finance background, large symbol, bull/market-depth/candlestick accent, strong red/green pressure cue.",
            "must_include": [symbol, "ORDER FLOW", "MTA"],
            "avoid": ["too many numbers", "tiny text", "generic stock photo look"],
        },
        "shorts_clips": [
            {"title": f"Why {symbol} was selected", "duration_hint": "35–50 sec"},
            {"title": "Market aggressor flow in one number", "duration_hint": "25–40 sec"},
            {"title": f"{sector} sector pressure snapshot", "duration_hint": "30–45 sec"},
        ],
        "community_post": (
            f"Today’s NEPSE order-flow issue selected {symbol} from {sector}. Net aggressor quantity: {_fmt_int(sm.get('net_aggr_qty'))}. "
            "Video focuses on whether the pressure was confirmed by bucket and broker evidence."
        ),
    }
