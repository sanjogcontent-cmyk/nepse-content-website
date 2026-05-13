from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def slugify(value: str) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "item"


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def _read_json(path: Path) -> dict[str, Any] | None:
    try:
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def issue_title(issue: dict[str, Any]) -> str:
    article = issue.get("article") or {}
    return article.get("title") or f"NEPSE Daily Order-Flow Summary — {issue.get('business_date')}"


def issue_description(issue: dict[str, Any]) -> str:
    article = issue.get("article") or {}
    featured = issue.get("featured_stock") or {}
    market = issue.get("market_summary") or {}
    desc = article.get("hero_thesis") or article.get("opening")
    if desc:
        return str(desc)
    return (
        f"Daily NEPSE order-flow summary for {issue.get('business_date')}: "
        f"market trade amount Rs {market.get('trade_amt_rs', 0):,.2f}, "
        f"featured stock {featured.get('symbol', 'N/A')}."
    )


def make_archive_entry(issue: dict[str, Any]) -> dict[str, Any]:
    market = issue.get("market_summary") or {}
    featured = issue.get("featured_stock") or {}
    sectors = issue.get("sectors") or []
    top_sector = sectors[0] if sectors else {}
    publishing = issue.get("publishing") or {}
    youtube = issue.get("youtube_package") or {}
    return {
        "business_date": issue.get("business_date"),
        "url": f"/daily/{issue.get('business_date')}",
        "admin_url": f"/admin/daily/{issue.get('business_date')}",
        "title": issue_title(issue),
        "description": issue_description(issue),
        "market_bias": market.get("bias"),
        "evidence_label": market.get("evidence_label"),
        "trade_qty": market.get("trade_qty"),
        "trade_amt_rs": market.get("trade_amt_rs"),
        "buy_aggr_qty": market.get("buy_aggr_qty"),
        "sell_aggr_qty": market.get("sell_aggr_qty"),
        "ambig_qty": market.get("ambig_qty"),
        "net_aggr_qty": market.get("net_aggr_qty"),
        "buy_aggr_amt_rs": market.get("buy_aggr_amt_rs"),
        "sell_aggr_amt_rs": market.get("sell_aggr_amt_rs"),
        "ambig_amt_rs": market.get("ambig_amt_rs"),
        "net_aggr_amt_rs": market.get("net_aggr_amt_rs"),
        "top_sector": top_sector.get("sector_name"),
        "sector_count": len(sectors),
        "featured_symbol": featured.get("symbol"),
        "featured_company": featured.get("company_name"),
        "featured_sector": featured.get("sector_name"),
        "featured_score": featured.get("featured_score"),
        "youtube_url": publishing.get("youtube_url") or youtube.get("youtube_url") or "",
        "status": publishing.get("status", "draft"),
        "published": bool(publishing.get("published") or publishing.get("status") == "published"),
        "schema_version": issue.get("schema_version"),
    }


def make_seo(issue: dict[str, Any], site_url: str = "") -> dict[str, Any]:
    date = issue.get("business_date")
    brand = issue.get("brand") or {}
    article = issue.get("article") or {}
    featured = issue.get("featured_stock") or {}
    youtube = issue.get("youtube_package") or {}
    publishing = issue.get("publishing") or {}
    title = issue_title(issue)
    description = issue_description(issue)
    canonical_path = f"/daily/{date}"
    canonical = f"{site_url.rstrip('/')}{canonical_path}" if site_url else canonical_path
    thumbnail_texts = youtube.get("thumbnail_text_options") or []
    video_url = publishing.get("youtube_url") or youtube.get("youtube_url") or ""
    keywords = [
        "NEPSE", "Nepal Stock Exchange", "order flow", "aggressor flow", "market summary",
        featured.get("symbol"), featured.get("sector_name"), "bucket analysis", "sector summary",
    ]
    keywords = [str(k) for k in keywords if k]
    article_schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": title,
        "description": description,
        "datePublished": date,
        "dateModified": issue.get("publishing", {}).get("updated_at") or date,
        "author": {"@type": "Organization", "name": brand.get("name", "Nepse_Master_Trade & Analysis")},
        "publisher": {"@type": "Organization", "name": brand.get("name", "Nepse_Master_Trade & Analysis")},
        "mainEntityOfPage": canonical,
        "keywords": keywords,
    }
    video_schema = {
        "@context": "https://schema.org",
        "@type": "VideoObject",
        "name": (youtube.get("title_options") or [title])[0],
        "description": youtube.get("description") or description,
        "thumbnailUrl": [],
        "uploadDate": date,
        "contentUrl": video_url,
        "embedUrl": video_url,
        "keywords": youtube.get("tags") or keywords,
    }
    return {
        "title": title,
        "description": description,
        "canonical_path": canonical_path,
        "canonical_url": canonical,
        "open_graph": {
            "type": "article",
            "site_name": brand.get("name", "Nepse_Master_Trade & Analysis"),
            "title": title,
            "description": description,
            "url": canonical,
        },
        "twitter": {
            "card": "summary_large_image",
            "title": title,
            "description": description,
        },
        "keywords": keywords,
        "thumbnail_text_options": thumbnail_texts,
        "structured_data": {
            "article": article_schema,
            "video": video_schema if video_url or youtube else None,
        },
        "internal_links": {
            "archive": "/daily",
            "stock_story": f"/stocks/{featured.get('symbol')}" if featured.get("symbol") else "/stocks",
            "sector_story": f"/sectors/{slugify(featured.get('sector_name'))}" if featured.get("sector_name") else "/sectors",
            "video_archive": "/videos",
        },
        "article_outline": {
            "title": article.get("title"),
            "hero_thesis": article.get("hero_thesis"),
            "sections": ["market", "sectors", "featured_stock", "video", "method"],
        },
    }


def make_stock_archive_entry(issue: dict[str, Any], stock: dict[str, Any], featured: bool = False) -> dict[str, Any]:
    summary = stock.get("summary") or {}
    return {
        "business_date": issue.get("business_date"),
        "symbol": stock.get("symbol"),
        "company_name": stock.get("company_name"),
        "sector_name": stock.get("sector_name"),
        "url": f"/daily/{issue.get('business_date')}?sector={stock.get('sector_name', '')}&symbol={stock.get('symbol', '')}",
        "stock_archive_url": f"/stocks/{stock.get('symbol')}",
        "featured": featured,
        "featured_score": stock.get("featured_score"),
        "bias": summary.get("bias"),
        "evidence_label": summary.get("evidence_label"),
        "trade_qty": summary.get("trade_qty"),
        "trade_amt_rs": summary.get("trade_amt_rs"),
        "buy_aggr_qty": summary.get("buy_aggr_qty"),
        "sell_aggr_qty": summary.get("sell_aggr_qty"),
        "ambig_qty": summary.get("ambig_qty"),
        "net_aggr_qty": summary.get("net_aggr_qty"),
        "buy_aggr_amt_rs": summary.get("buy_aggr_amt_rs"),
        "sell_aggr_amt_rs": summary.get("sell_aggr_amt_rs"),
        "ambig_amt_rs": summary.get("ambig_amt_rs"),
        "net_aggr_amt_rs": summary.get("net_aggr_amt_rs"),
        "confidence_pct": summary.get("confidence_pct"),
        "explainability_pct": summary.get("explainability_pct"),
    }


def make_sector_archive_entry(issue: dict[str, Any], sector: dict[str, Any]) -> dict[str, Any]:
    summary = sector.get("summary") or {}
    name = sector.get("sector_name")
    return {
        "business_date": issue.get("business_date"),
        "sector_name": name,
        "sector_slug": slugify(name),
        "url": f"/daily/{issue.get('business_date')}?sector={name}",
        "sector_archive_url": f"/sectors/{slugify(name)}",
        "active_stocks": sector.get("active_stocks"),
        "bias": summary.get("bias"),
        "evidence_label": summary.get("evidence_label"),
        "trade_qty": summary.get("trade_qty"),
        "trade_amt_rs": summary.get("trade_amt_rs"),
        "buy_aggr_qty": summary.get("buy_aggr_qty"),
        "sell_aggr_qty": summary.get("sell_aggr_qty"),
        "ambig_qty": summary.get("ambig_qty"),
        "net_aggr_qty": summary.get("net_aggr_qty"),
        "buy_aggr_amt_rs": summary.get("buy_aggr_amt_rs"),
        "sell_aggr_amt_rs": summary.get("sell_aggr_amt_rs"),
        "ambig_amt_rs": summary.get("ambig_amt_rs"),
        "net_aggr_amt_rs": summary.get("net_aggr_amt_rs"),
        "confidence_pct": summary.get("confidence_pct"),
        "explainability_pct": summary.get("explainability_pct"),
        "index": sector.get("index"),
    }


def collect_archive(content_root: Path) -> dict[str, Any]:
    daily_root = content_root / "daily"
    issues: list[dict[str, Any]] = []
    for path in sorted(daily_root.glob("*.json")):
        issue = _read_json(path)
        if issue and issue.get("business_date"):
            issues.append(issue)
    issues.sort(key=lambda x: x.get("business_date", ""), reverse=True)

    daily_entries = [make_archive_entry(issue) for issue in issues]
    stock_entries: list[dict[str, Any]] = []
    sector_entries: list[dict[str, Any]] = []
    video_entries: list[dict[str, Any]] = []

    for issue in issues:
        featured = issue.get("featured_stock") or {}
        if featured.get("symbol"):
            stock_entries.append(make_stock_archive_entry(issue, featured, featured=True))
        # Add compact stock mentions for discovery, not full duplicated issue data.
        for sec in issue.get("sectors") or []:
            sector_entries.append(make_sector_archive_entry(issue, sec))
            for st in (sec.get("stocks") or [])[:10]:
                if st.get("symbol") != featured.get("symbol"):
                    stock_entries.append(make_stock_archive_entry(issue, st, featured=False))
        youtube = issue.get("youtube_package") or {}
        publishing = issue.get("publishing") or {}
        video_url = publishing.get("youtube_url") or youtube.get("youtube_url") or ""
        video_status = publishing.get("status", "draft")
        if video_url or video_status in {"video_uploaded", "published"}:
            video_entries.append({
                "business_date": issue.get("business_date"),
                "title": (youtube.get("title_options") or [issue_title(issue)])[0],
                "description": youtube.get("description") or issue_description(issue),
                "featured_symbol": featured.get("symbol"),
                "featured_sector": featured.get("sector_name"),
                "url": f"/daily/{issue.get('business_date')}#video",
                "youtube_url": video_url,
                "thumbnail_text_options": youtube.get("thumbnail_text_options") or [],
                "chapters": youtube.get("chapters") or [],
                "tags": youtube.get("tags") or [],
                "status": video_status,
                "published": bool(publishing.get("published") or video_status == "published"),
            })

    sitemap_urls = []
    for e in daily_entries:
        sitemap_urls.append({"loc": e["url"], "lastmod": e["business_date"], "type": "daily_issue"})
    for symbol in sorted({e["symbol"] for e in stock_entries if e.get("symbol")}):
        dates = [e["business_date"] for e in stock_entries if e.get("symbol") == symbol]
        sitemap_urls.append({"loc": f"/stocks/{symbol}", "lastmod": max(dates), "type": "stock_archive"})
    for slug in sorted({e["sector_slug"] for e in sector_entries if e.get("sector_slug")}):
        dates = [e["business_date"] for e in sector_entries if e.get("sector_slug") == slug]
        sitemap_urls.append({"loc": f"/sectors/{slug}", "lastmod": max(dates), "type": "sector_archive"})
    sitemap_urls.append({"loc": "/daily", "lastmod": daily_entries[0]["business_date"] if daily_entries else None, "type": "archive"})
    sitemap_urls.append({"loc": "/videos", "lastmod": daily_entries[0]["business_date"] if daily_entries else None, "type": "video_archive"})

    return {
        "generated_at": _now_iso(),
        "counts": {
            "daily_issues": len(daily_entries),
            "stock_entries": len(stock_entries),
            "sector_entries": len(sector_entries),
            "video_entries": len(video_entries),
            "sitemap_urls": len(sitemap_urls),
        },
        "daily": daily_entries,
        "stocks": stock_entries,
        "sectors": sector_entries,
        "videos": video_entries,
        "sitemap": {"generated_at": _now_iso(), "urls": sitemap_urls},
    }


def write_archive_outputs(content_root: str | Path, latest_issue: dict[str, Any] | None = None) -> None:
    root = Path(content_root)
    root.mkdir(parents=True, exist_ok=True)
    if latest_issue:
        seo = make_seo(latest_issue)
        latest_issue["seo"] = seo
        _write_json(root / "seo" / "daily" / f"{latest_issue.get('business_date')}.json", seo)
    archive = collect_archive(root)
    _write_json(root / "archive" / "daily.json", {"generated_at": archive["generated_at"], "items": archive["daily"], "counts": archive["counts"]})
    _write_json(root / "archive" / "stocks.json", {"generated_at": archive["generated_at"], "items": archive["stocks"], "counts": archive["counts"]})
    _write_json(root / "archive" / "sectors.json", {"generated_at": archive["generated_at"], "items": archive["sectors"], "counts": archive["counts"]})
    _write_json(root / "archive" / "videos.json", {"generated_at": archive["generated_at"], "items": archive["videos"], "counts": archive["counts"]})
    _write_json(root / "sitemap.json", archive["sitemap"])
    _write_json(root / "seo" / "index.json", {
        "generated_at": archive["generated_at"],
        "site_name": "Nepse_Master_Trade & Analysis",
        "description": "Daily NEPSE order-flow publication using market, sector, stock, and video-proof summaries.",
        "routes": archive["sitemap"]["urls"],
    })
