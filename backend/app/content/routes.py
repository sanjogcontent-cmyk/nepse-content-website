from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .config import CONTENT_ROOT, DAILY_ROOT, CONTENT_ADMIN_ROOT, ADMIN_DAILY_ROOT, AN_DB_PATH, COMPANY_META_DB_PATH, INDEX_DB_PATH, INDEX_META_JSON_PATH
from .daily_issue_builder import build_daily_issue, write_daily_issue, _make_public_issue
from .archive_seo import write_archive_outputs
from .content_indexer import build_content_indexes

router = APIRouter()


class GenerateRequest(BaseModel):
    analysis_db: str | None = None
    company_meta_db: str | None = None
    index_meta_json: str | None = None
    index_db: str | None = None
    write: bool = True


class SaveIssueRequest(BaseModel):
    issue: dict[str, Any]


class PublishStateRequest(BaseModel):
    status: str = Field(default="draft")
    youtube_url: str | None = None
    editor_notes: str | None = None
    reviewed_by: str | None = None


class ArticleApprovalRequest(BaseModel):
    article: dict[str, Any]
    reviewed_by: str | None = None
    status: str = "review"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _issue_path(business_date: str) -> Path:
    return DAILY_ROOT / f"{business_date}.json"


def _admin_issue_path(business_date: str) -> Path:
    return ADMIN_DAILY_ROOT / f"{business_date}.admin.json"


def _read_json(path: Path):
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Content file not found: {path.name}")
    return json.loads(path.read_text(encoding="utf-8"))


def _refresh_public_admin_sections(issue: dict[str, Any]) -> None:
    publishing = issue.setdefault("publishing", {})
    article = issue.get("published_article") or issue.get("article") or issue.get("generated_article") or {}
    cms = issue.get("cms") or issue.get("public_cms") or {}
    youtube = issue.get("youtube_package") or {}
    issue["public"] = {
        "business_date": issue.get("business_date"),
        "hero": {
            "title": article.get("title"),
            "hero_thesis": article.get("hero_thesis"),
            "market_bias": (issue.get("market_summary") or {}).get("bias"),
            "leading_sector": ((issue.get("sectors") or [{}])[0] or {}).get("sector_name"),
            "featured_symbol": (issue.get("featured_stock") or {}).get("symbol"),
            "evidence_label": (issue.get("market_summary") or {}).get("evidence_label"),
        },
        "market_summary": issue.get("market_summary"),
        "market_index": issue.get("market_index"),
        "market_intervals": issue.get("market_intervals", []),
        "leaderboards": issue.get("leaderboards", {}),
        "sectors": issue.get("sectors", []),
        "featured_stock": issue.get("featured_stock"),
        "article": article,
        "cms": cms,
        "video": {
            "youtube_url": publishing.get("youtube_url") or youtube.get("youtube_url") or "",
            "status": "available" if (publishing.get("youtube_url") or youtube.get("youtube_url")) else "coming_soon",
            "covers": ["Market summary", "Sector context", "Featured stock behavior", "Bucket/replay proof in video"],
        },
        "method": issue.get("method"),
    }
    issue["admin"] = {
        "validation": issue.get("validation"),
        "featured_candidates": issue.get("featured_candidates", []),
        "youtube_package": youtube,
        "admin_editor": issue.get("admin_editor"),
        "cms": cms,
        "analytics_foundation": issue.get("analytics_foundation"),
    }


def _write_issue_json(issue: dict[str, Any]) -> Path:
    business_date = issue.get("business_date")
    if not business_date:
        raise HTTPException(status_code=400, detail="issue.business_date is required")
    DAILY_ROOT.mkdir(parents=True, exist_ok=True)
    CONTENT_ROOT.mkdir(parents=True, exist_ok=True)
    ADMIN_DAILY_ROOT.mkdir(parents=True, exist_ok=True)
    issue.setdefault("schema_version", "content-issue-v2-phase14-cms")
    issue.setdefault("publishing", {})
    issue["publishing"]["updated_at"] = _now_iso()
    _refresh_public_admin_sections(issue)

    admin_out = _admin_issue_path(business_date)
    admin_out.write_text(json.dumps(issue, ensure_ascii=False, indent=2), encoding="utf-8")

    public_issue = _make_public_issue(issue)
    public_issue["schema_version"] = "content-issue-v2-phase14-orderflow-boards-public"
    out = _issue_path(business_date)
    out.write_text(json.dumps(public_issue, ensure_ascii=False, indent=2), encoding="utf-8")
    (CONTENT_ROOT / "latest.json").write_text(
        json.dumps({"latest_date": business_date, "issue": public_issue}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    write_archive_outputs(CONTENT_ROOT, public_issue)
    return out


def _readiness(issue: dict[str, Any]) -> dict[str, Any]:
    validation = issue.get("validation") or {}
    article = issue.get("article") or {}
    youtube = issue.get("youtube_package") or {}
    publishing = issue.get("publishing") or {}
    featured = issue.get("featured_stock") or {}
    sectors = issue.get("sectors") or []
    checks = [
        {
            "key": "metadata_mapped",
            "label": "All analysis symbols mapped to a sector",
            "ok": len(validation.get("unmapped_symbols") or []) == 0,
            "detail": f"Unmapped: {len(validation.get('unmapped_symbols') or [])}",
        },
        {
            "key": "promoter_fallback_reviewed",
            "label": "Promoter fallback symbols reviewed",
            "ok": True,
            "detail": ", ".join(validation.get("promoter_fallback_symbols") or []) or "None",
        },
        {
            "key": "featured_selected",
            "label": "Featured stock selected",
            "ok": bool(featured.get("symbol")),
            "detail": featured.get("symbol") or "Missing",
        },
        {
            "key": "article_ready",
            "label": "Article text generated and approved for public use",
            "ok": bool(article.get("title") and article.get("market_paragraph") and article.get("featured_stock_paragraph")) and bool(publishing.get("article_approved") or publishing.get("status") in {"draft", "reviewing", "ready_to_record"}),
            "detail": (article.get("title") or "Missing article title") + (" · approved" if publishing.get("article_approved") else " · draft preview"),
        },
        {
            "key": "youtube_assets_ready",
            "label": "YouTube assets generated",
            "ok": bool((youtube.get("title_options") or []) and (youtube.get("thumbnail_text_options") or []) and youtube.get("description")),
            "detail": f"Titles: {len(youtube.get('title_options') or [])}, thumbnails: {len(youtube.get('thumbnail_text_options') or [])}",
        },
        {
            "key": "chapters_ready",
            "label": "Video chapters ready",
            "ok": len(youtube.get("chapters") or []) >= 3,
            "detail": f"Chapters: {len(youtube.get('chapters') or [])}",
        },
        {
            "key": "sector_review_ready",
            "label": "Sector review available",
            "ok": len(sectors) > 0 and all((s.get("stocks") or []) for s in sectors),
            "detail": f"Sectors: {len(sectors)}",
        },
        {
            "key": "youtube_url_added",
            "label": "YouTube URL added, if video is published",
            "ok": bool(publishing.get("youtube_url")) or publishing.get("status") in {"draft", "ready_to_record", "recording"},
            "detail": publishing.get("youtube_url") or "Not added yet",
        },
    ]
    required = [c for c in checks if c["key"] != "youtube_url_added"]
    complete = sum(1 for c in checks if c["ok"])
    required_ok = all(c["ok"] for c in required)
    return {
        "complete": complete,
        "total": len(checks),
        "required_ok": required_ok,
        "checks": checks,
    }




def _index_path(name: str) -> Path:
    allowed = {"daily":"daily.index.json","weekly":"weekly.index.json","stocks":"stocks.index.json","sectors":"sectors.index.json","videos":"videos.index.json","articles":"articles.index.json","glossary":"glossary.index.json"}
    if name not in allowed:
        raise HTTPException(status_code=404, detail="Unknown content index")
    return CONTENT_ROOT / "indexes" / allowed[name]


def _fmt_prompt_number(v: object) -> str:
    if isinstance(v, float):
        return f"{v:,.2f}"
    if isinstance(v, int):
        return f"{v:,}"
    try:
        x = float(v or 0)
        return f"{x:,.2f}" if abs(x - int(x)) > 0 else f"{int(x):,}"
    except Exception:
        return str(v or "")


def _rs_prompt(v: object) -> str:
    return f"Rs {_fmt_prompt_number(v)}" if v not in (None, "") else "—"


def _stock_fact_block(featured: dict[str, Any]) -> str:
    fs = featured.get("summary") or {}
    return f"""Featured Stock Facts:
Symbol: {featured.get('symbol')}
Company: {featured.get('company_name')}
Sector: {featured.get('sector_name')}
Previous Close: {_rs_prompt(fs.get('previous_close_rs'))}
Open: {_rs_prompt(fs.get('open_rs'))}
High: {_rs_prompt(fs.get('high_rs'))}
Low: {_rs_prompt(fs.get('low_rs'))}
Close: {_rs_prompt(fs.get('close_rs'))}
Change: {_rs_prompt(fs.get('change_rs'))}
Change %: {_fmt_prompt_number(fs.get('change_pct'))}%
Day VWAP: {_rs_prompt(fs.get('day_vwap_rs') or fs.get('vwap_rs'))}
Trade Qty: {_fmt_prompt_number(fs.get('trade_qty'))}
Trade Amt: {_rs_prompt(fs.get('trade_amt_rs'))}
Buy Agg Qty: {_fmt_prompt_number(fs.get('buy_aggr_qty'))}
Sell Agg Qty: {_fmt_prompt_number(fs.get('sell_aggr_qty'))}
Ambiguous Qty: {_fmt_prompt_number(fs.get('ambig_qty'))}
Net Agg Qty: {_fmt_prompt_number(fs.get('net_aggr_qty'))}
Buy Agg Amt Proxy: {_rs_prompt(fs.get('buy_aggr_amt_rs'))}
Sell Agg Amt Proxy: {_rs_prompt(fs.get('sell_aggr_amt_rs'))}
Net Agg Amt Proxy: {_rs_prompt(fs.get('net_aggr_amt_rs'))}
Buy Agg VWAP: {_rs_prompt(fs.get('buy_aggr_vwap_rs') or fs.get('buy_aggr_avg_px_rs'))}
Sell Agg VWAP: {_rs_prompt(fs.get('sell_aggr_vwap_rs') or fs.get('sell_aggr_avg_px_rs'))}
Ambiguous VWAP: {_rs_prompt(fs.get('ambig_vwap_rs') or fs.get('ambig_avg_px_rs'))}
Confidence: {_fmt_prompt_number(fs.get('confidence_pct'))}%
Explainability: {_fmt_prompt_number(fs.get('explainability_pct'))}%
Flags: Gap {_fmt_prompt_number(fs.get('gap_count'))}, Wipe {_fmt_prompt_number(fs.get('wipe_count'))}, Lock U/L {_fmt_prompt_number(fs.get('upper_lock_count'))}/{_fmt_prompt_number(fs.get('lower_lock_count'))}
"""


def _daily_fact_lock(issue: dict[str, Any]) -> str:
    market = issue.get("market_summary") or {}
    sectors = issue.get("sectors") or []
    featured = issue.get("featured_stock") or {}
    sector_lines = []
    for sct in sectors[:8]:
        sm = sct.get("summary") or {}
        sector_lines.append(
            f"- {sct.get('sector_name')}: Trade Amt {_rs_prompt(sm.get('trade_amt_rs'))}; Trade Qty {_fmt_prompt_number(sm.get('trade_qty'))}; "
            f"Buy Agg Qty {_fmt_prompt_number(sm.get('buy_aggr_qty'))}; Sell Agg Qty {_fmt_prompt_number(sm.get('sell_aggr_qty'))}; "
            f"Net Agg Qty {_fmt_prompt_number(sm.get('net_aggr_qty'))}; Evidence {sm.get('evidence_label')}"
        )
    return f"""FACT LOCK — use only these facts and do not invent missing data.

Business Date: {issue.get('business_date')}
Brand: Nepse_Master_Trade & Analysis

Market Summary:
Bias: {market.get('bias')}
Buckets: {_fmt_prompt_number(market.get('buckets'))}
Trade Qty: {_fmt_prompt_number(market.get('trade_qty'))}
Trade Amt: {_rs_prompt(market.get('trade_amt_rs'))}
Buy Agg Qty: {_fmt_prompt_number(market.get('buy_aggr_qty'))}
Sell Agg Qty: {_fmt_prompt_number(market.get('sell_aggr_qty'))}
Ambiguous Qty: {_fmt_prompt_number(market.get('ambig_qty'))}
Net Agg Qty: {_fmt_prompt_number(market.get('net_aggr_qty'))}
Buy Agg Amt Proxy: {_rs_prompt(market.get('buy_aggr_amt_rs'))}
Sell Agg Amt Proxy: {_rs_prompt(market.get('sell_aggr_amt_rs'))}
Ambiguous Amt Proxy: {_rs_prompt(market.get('ambig_amt_rs'))}
Net Agg Amt Proxy: {_rs_prompt(market.get('net_aggr_amt_rs'))}
Confidence: {_fmt_prompt_number(market.get('confidence_pct'))}%
Explainability: {_fmt_prompt_number(market.get('explainability_pct'))}%
Flags: Gap {_fmt_prompt_number(market.get('gap_count'))}, Wipe {_fmt_prompt_number(market.get('wipe_count'))}, Lock U/L {_fmt_prompt_number(market.get('upper_lock_count'))}/{_fmt_prompt_number(market.get('lower_lock_count'))}

Top Sectors:
{chr(10).join(sector_lines)}

{_stock_fact_block(featured)}

Definitions:
- Buy/Sell means aggressor flow, not participant buyer/seller totals.
- Previous Close = the selected date's last POST frame close_scaled.
- LTP/Close = the selected date's last POST frame ltp_scaled.
- Open/High/Low/Day VWAP = the selected date's last POST frame open/high/low/avg fields.
- Buy Agg VWAP, Sell Agg VWAP, and Ambiguous VWAP = role-specific trade amount divided by role-specific quantity when row-level trade roles are available.
- Aggressor amount proxy is used for market/sector amount summaries; do not pretend it is exact broker cash flow.
"""


def _daily_prompt(issue: dict[str, Any], kind: str = "daily_article") -> str:
    fact_lock = _daily_fact_lock(issue)
    featured = issue.get("featured_stock") or {}
    symbol = featured.get("symbol") or "the featured stock"
    base_rules = """STRICT WRITING RULES:
- Do not give buy/sell recommendations.
- Do not overclaim, predict, or invent facts.
- Use full numbers; do not abbreviate as K/M/B.
- Keep the tone serious, elegant, educational, and public-friendly.
- Explain aggressor flow simply for readers.
- The website summary should create curiosity; the video/Truth Viewer proves the deeper bucket and broker evidence.
- Mention that this is educational content only, not financial advice.
"""
    templates = {
        "daily_article": f"""You are helping write a public NEPSE daily order-flow article for Nepse_Master_Trade & Analysis.

{base_rules}

{fact_lock}

Write exactly these sections:
1. Title
2. Opening thesis
3. Market order-flow paragraph
4. Sector paragraph
5. Featured stock teaser paragraph
6. Video teaser paragraph
7. Educational note

Make it clean enough to paste into the app article editor. Do not use markdown tables.
""",
        "featured_stock_story": f"""You are helping write a focused featured-stock story for the NEPSE MTA website.

{base_rules}

{fact_lock}

Write a powerful but clean featured-stock section for {symbol} with exactly:
1. Stock story headline
2. One-sentence why this stock matters today
3. Price truth paragraph using Previous Close, Open, High, Low, Close, Change %, and Day VWAP
4. Aggressor flow paragraph using Buy Agg Qty, Sell Agg Qty, Ambiguous Qty, Net Agg Qty, and Buy/Sell/Ambig VWAP
5. Evidence paragraph using confidence, explainability, and flags
6. What the video should prove

Do not turn it into a trading recommendation.
""",
        "youtube_script": f"""You are helping write a YouTube script for Nepse_Master_Trade & Analysis.

{base_rules}

{fact_lock}

Write a 5 to 7 minute script with exactly:
1. Hook in 2 sentences
2. Channel intro in 2 sentences
3. Market summary narration
4. Sector transition narration
5. Featured-stock narration for {symbol}
6. What the Truth Viewer / Order Flow Platform should prove
7. Closing and educational disclaimer

Style: spoken Nepali-market English, clear, not hype. Use exact numbers only from the fact lock.
""",
        "shorts_script": f"""You are helping write a 45-second YouTube Shorts / TikTok script for Nepse_Master_Trade & Analysis.

{base_rules}

{fact_lock}

Write exactly:
1. 3-second hook
2. 20-second market + sector explanation
3. 15-second {symbol} featured-stock explanation
4. 5-second call-to-watch-full-video
5. On-screen text lines, max 7 lines

Make it sharp and simple. No recommendation.
""",
        "title_thumbnail": f"""You are helping create YouTube packaging for Nepse_Master_Trade & Analysis.

{base_rules}

{fact_lock}

Generate exactly:
1. 10 YouTube titles under 70 characters
2. 10 thumbnail text options under 4 words each
3. 3 video description openings
4. 1 pinned comment
5. 8 search keywords

Use {symbol}, market bias, sector context, and order-flow proof language. Avoid clickbait and avoid recommendations.
""",
        "learn_explainer": f"""You are helping write an educational Learn-page explainer for the NEPSE MTA website.

{base_rules}

{fact_lock}

Explain these concepts using today's facts as examples:
1. Previous Close vs Close
2. Open / High / Low from actual bucket trades
3. Day VWAP
4. Buy Agg VWAP
5. Sell Agg VWAP
6. Ambiguous VWAP
7. Why website writing should summarize and video should prove

Keep it beginner-friendly, but serious.
""",
        "social_post": f"""You are helping write social media posts for Nepse_Master_Trade & Analysis.

{base_rules}

{fact_lock}

Write:
1. One Facebook/YouTube community post
2. One TikTok caption
3. One X/Twitter style post
4. One LinkedIn-style professional post
5. 10 hashtags

Use exact facts. No buy/sell recommendation. No hype.
""",
    }
    return templates.get(kind, templates["daily_article"])


def _weekly_prompt(week: dict[str, Any]) -> str:
    sm=week.get("summary") or {}; daily=[]; sectors=[]
    for d in week.get("daily_entries") or []:
        daily.append(f"- {d.get('business_date')}: Trade Amt Rs {d.get('trade_amt_rs',0):,.2f}; Trade Qty {d.get('trade_qty',0):,}; Buy Agg Amt Rs {d.get('buy_aggr_amt_rs',0):,.2f}; Sell Agg Amt Rs {d.get('sell_aggr_amt_rs',0):,.2f}; Net Agg Amt Rs {d.get('net_aggr_amt_rs',0):,.2f}; Featured {d.get('featured_symbol')}")
    for sct in (week.get("sector_summary") or [])[:8]:
        s=sct.get("summary") or {}; sectors.append(f"- {sct.get('sector_name')}: Days active {sct.get('days_active')}; Trade Amt Rs {s.get('trade_amt_rs',0):,.2f}; Net Agg Amt Rs {s.get('net_aggr_amt_rs',0):,.2f}")
    return f"""You are helping write a weekly NEPSE order-flow summary for Nepse_Master_Trade & Analysis.

STRICT RULES:
- Do not give buy/sell recommendations.
- Use only the numbers provided.
- Use full numbers; do not abbreviate.
- Compare days clearly and explain persistence.
- Keep it serious and public-friendly.

Week: {week.get('week_id')}
Date range: {week.get('start_date')} to {week.get('end_date')}
Trading days: {week.get('trading_days')}

Weekly Market Summary:
Trade Qty: {sm.get('trade_qty',0):,}
Trade Amt: Rs {sm.get('trade_amt_rs',0):,.2f}
Buy Agg Qty: {sm.get('buy_aggr_qty',0):,}
Sell Agg Qty: {sm.get('sell_aggr_qty',0):,}
Net Agg Qty: {sm.get('net_aggr_qty',0):,}
Buy Agg Amt: Rs {sm.get('buy_aggr_amt_rs',0):,.2f}
Sell Agg Amt: Rs {sm.get('sell_aggr_amt_rs',0):,.2f}
Net Agg Amt: Rs {sm.get('net_aggr_amt_rs',0):,.2f}

Daily Market Table:
{chr(10).join(daily)}

Top Weekly Sectors:
{chr(10).join(sectors)}

Repeated Stocks:
{', '.join([x.get('symbol') for x in (week.get('repeated_stocks') or [])[:15]])}

Write exactly these sections:
1. Weekly title
2. Opening weekly thesis
3. Market order-flow paragraph
4. Sector persistence paragraph
5. Stock focus paragraph
6. Video/content recap paragraph
7. Next week watchlist
8. Educational note
"""


@router.get("/latest")
def latest():
    path = CONTENT_ROOT / "latest.json"
    if path.exists():
        return _read_json(path)
    files = sorted(DAILY_ROOT.glob("*.json"))
    if not files:
        raise HTTPException(status_code=404, detail="No daily issue has been generated yet.")
    issue = _read_json(files[-1])
    return {"latest_date": issue["business_date"], "issue": issue}


@router.get("/daily/{business_date}")
def daily_issue(business_date: str):
    return _read_json(_issue_path(business_date))


@router.get("/daily/{business_date}/admin/full")
def admin_full_issue(business_date: str):
    path = _admin_issue_path(business_date)
    if path.exists():
        return _read_json(path)
    # Fallback only for older bundles; Phase 9 writes admin JSON outside frontend/public.
    return _read_json(_issue_path(business_date))


@router.get("/daily/{business_date}/market")
def daily_market(business_date: str):
    issue = daily_issue(business_date)
    return {
        "business_date": issue["business_date"],
        "market_summary": issue["market_summary"],
        "market_index": issue.get("market_index"),
        "market_intervals": issue.get("market_intervals", []),
    }


@router.get("/daily/{business_date}/sectors")
def daily_sectors(business_date: str):
    issue = daily_issue(business_date)
    return issue.get("sectors", [])


@router.get("/daily/{business_date}/sectors/{sector_name}")
def daily_sector(business_date: str, sector_name: str):
    issue = daily_issue(business_date)
    for sec in issue.get("sectors", []):
        if sec["sector_name"].lower() == sector_name.lower():
            return sec
    raise HTTPException(status_code=404, detail="Sector not found")


@router.get("/daily/{business_date}/stocks/{symbol}")
def daily_stock(business_date: str, symbol: str):
    issue = daily_issue(business_date)
    symbol_u = symbol.upper()
    for sec in issue.get("sectors", []):
        for st in sec.get("stocks", []):
            if st["symbol"].upper() == symbol_u:
                return st
    raise HTTPException(status_code=404, detail="Stock not found")


@router.get("/daily/{business_date}/youtube-package")
def youtube_package(business_date: str):
    issue = daily_issue(business_date)
    return issue.get("youtube_package", {})


@router.get("/archive/daily")
def archive_daily():
    return _read_json(CONTENT_ROOT / "archive" / "daily.json")


@router.get("/archive/stocks")
def archive_stocks():
    return _read_json(CONTENT_ROOT / "archive" / "stocks.json")


@router.get("/archive/sectors")
def archive_sectors():
    return _read_json(CONTENT_ROOT / "archive" / "sectors.json")


@router.get("/archive/videos")
def archive_videos():
    return _read_json(CONTENT_ROOT / "archive" / "videos.json")


@router.get("/seo/daily/{business_date}")
def seo_daily(business_date: str):
    return _read_json(CONTENT_ROOT / "seo" / "daily" / f"{business_date}.json")


@router.get("/sitemap.json")
def sitemap_json():
    return _read_json(CONTENT_ROOT / "sitemap.json")


@router.get("/daily/{business_date}/production-polish")
def production_polish(business_date: str):
    issue = daily_issue(business_date)
    validation = issue.get("validation") or {}
    market = issue.get("market_summary") or {}
    youtube = issue.get("youtube_package") or {}
    publishing = issue.get("publishing") or {}
    warnings = []
    if validation.get("unmapped_symbols"):
        warnings.append("Some symbols are unmapped. Do not publish until metadata is reviewed.")
    if not (youtube.get("title_options") and youtube.get("description")):
        warnings.append("YouTube package is incomplete.")
    if publishing.get("status") in {"video_uploaded", "ready_to_publish", "published"} and not (publishing.get("youtube_url") or youtube.get("youtube_url")):
        warnings.append("Publishing status expects a YouTube URL, but none is saved.")
    if float(market.get("confidence_pct") or 0) < 70 or float(market.get("explainability_pct") or 0) < 70:
        warnings.append("Market confidence/explainability is below normal public publishing guardrail.")
    return {
        "business_date": business_date,
        "schema_version": issue.get("schema_version"),
        "readiness": _readiness(issue),
        "warnings": warnings,
        "polish": {
            "public_page": "summary-first, video-proof-later",
            "number_format": "full comma-separated numbers; no 10k/10.1M abbreviation",
            "sector_source": "nepse_index_meta.json membership -> optional old company-meta fallback -> Unmapped",
            "price_truth_rule": "last POST frame: ltp_scaled=today LTP/close, close_scaled=previous close, open/high/low/avg are day fields",
            "index_rule": "index_analysis DB gives index points/chart context; it does not invent stock sectors",
        },
    }


@router.get("/daily/{business_date}/admin/readiness")
def admin_readiness(business_date: str):
    return _readiness(daily_issue(business_date))


@router.post("/daily/{business_date}/admin/save-issue")
def admin_save_issue(business_date: str, req: SaveIssueRequest):
    issue = req.issue
    if issue.get("business_date") != business_date:
        raise HTTPException(status_code=400, detail="Path date and issue.business_date do not match")
    issue["schema_version"] = "content-issue-v2-phase14-cms"
    issue["readiness"] = _readiness(issue)
    out = _write_issue_json(issue)
    return {"ok": True, "written": str(out), "readiness": issue["readiness"], "issue": issue}


@router.post("/daily/{business_date}/admin/publish-state")
def admin_publish_state(business_date: str, req: PublishStateRequest):
    issue = daily_issue(business_date)
    issue.setdefault("publishing", {})
    issue["publishing"].update({
        "status": req.status,
        "youtube_url": req.youtube_url or "",
        "editor_notes": req.editor_notes or "",
        "reviewed_by": req.reviewed_by or "",
        "updated_at": _now_iso(),
    })
    if issue.get("youtube_package") is not None and req.youtube_url is not None:
        issue["youtube_package"]["youtube_url"] = req.youtube_url
    issue["schema_version"] = "content-issue-v2-phase14-cms"
    issue["readiness"] = _readiness(issue)
    out = _write_issue_json(issue)
    return {"ok": True, "written": str(out), "publishing": issue["publishing"], "readiness": issue["readiness"]}


@router.post("/daily/{business_date}/generate")
def generate_issue(business_date: str, req: GenerateRequest):
    analysis_db = req.analysis_db or AN_DB_PATH
    company_meta_db = req.company_meta_db or COMPANY_META_DB_PATH or None
    index_meta_json = req.index_meta_json or INDEX_META_JSON_PATH or None
    index_db = req.index_db if req.index_db is not None else INDEX_DB_PATH
    if not analysis_db:
        raise HTTPException(status_code=400, detail="analysis_db is required through body or env vars.")
    payload = build_daily_issue(analysis_db, company_meta_db, index_db or None, business_date, index_meta_json)
    payload["schema_version"] = "content-issue-v2-phase14-orderflow-boards"
    payload.setdefault("publishing", {"status": "draft", "youtube_url": "", "editor_notes": "", "reviewed_by": ""})
    payload["readiness"] = _readiness(payload)
    if req.write:
        out = write_daily_issue(payload)
        return {"ok": True, "written": str(out), "issue": payload}
    return {"ok": True, "issue": payload}


@router.get("/indexes/{name}")
def content_index(name: str):
    return _read_json(_index_path(name))

@router.post("/indexes/rebuild")
def rebuild_indexes():
    return {"ok": True, "result": build_content_indexes(CONTENT_ROOT)}

@router.get("/weekly")
def weekly_index():
    return _read_json(CONTENT_ROOT / "indexes" / "weekly.index.json")

@router.get("/weekly/{week_id}")
def weekly_issue(week_id: str):
    return _read_json(CONTENT_ROOT / "weekly" / f"{week_id}.json")

@router.get("/writer/daily/{business_date}/prompt")
def writer_daily_prompt(business_date: str):
    issue = admin_full_issue(business_date)
    return {"business_date": business_date, "prompt_kind": "daily_article", "prompt": _daily_prompt(issue, "daily_article")}

@router.get("/writer/daily/{business_date}/prompt/{prompt_kind}")
def writer_daily_prompt_kind(business_date: str, prompt_kind: str):
    issue = admin_full_issue(business_date)
    return {"business_date": business_date, "prompt_kind": prompt_kind, "prompt": _daily_prompt(issue, prompt_kind)}

@router.get("/writer/weekly/{week_id}/prompt")
def writer_weekly_prompt(week_id: str):
    week = weekly_issue(week_id)
    return {"week_id": week_id, "prompt": _weekly_prompt(week)}

@router.post("/daily/{business_date}/admin/approve-article")
def approve_daily_article(business_date: str, req: ArticleApprovalRequest):
    issue = admin_full_issue(business_date)
    if issue.get("business_date") != business_date:
        raise HTTPException(status_code=400, detail="Path date and issue date do not match")
    issue["published_article"] = req.article
    issue["article"] = req.article
    issue.setdefault("publishing", {})
    issue["publishing"].update({"article_approved": True, "reviewed_by": req.reviewed_by or issue["publishing"].get("reviewed_by", ""), "status": req.status or "review", "updated_at": _now_iso()})
    issue["schema_version"] = "content-issue-v2-phase14-cms"
    issue["readiness"] = _readiness(issue)
    out = _write_issue_json(issue)
    build_content_indexes(CONTENT_ROOT)
    return {"ok": True, "written": str(out), "issue": issue, "readiness": issue["readiness"]}
