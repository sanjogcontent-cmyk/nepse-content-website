#!/usr/bin/env python3
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "frontend" / "public" / "content"
ADMIN_CONTENT = ROOT / "frontend" / "content_admin"

PUBLIC_REQUIRED_ISSUE_KEYS = [
    "business_date", "market_summary", "sectors", "featured_stock",
    "leaderboards", "article", "youtube_package", "seo", "source_lock"
]
ADMIN_REQUIRED_KEYS = ["validation", "featured_candidates", "youtube_package", "admin"]
PUBLIC_FORBIDDEN_KEYS = ["validation", "featured_candidates", "admin_editor", "analytics_foundation", "admin"]


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)


def load(path: Path):
    if not path.exists():
        fail(f"Missing {path.relative_to(ROOT)}")
    return json.loads(path.read_text(encoding="utf-8"))


def check_amounts(summary: dict, label: str) -> None:
    for key in ["buy_aggr_qty", "sell_aggr_qty", "net_aggr_qty", "buy_aggr_amt_rs", "sell_aggr_amt_rs", "net_aggr_amt_rs"]:
        if key not in summary:
            fail(f"{label} missing aggressor field: {key}")


def check_public_issue(issue: dict) -> None:
    for key in PUBLIC_REQUIRED_ISSUE_KEYS:
        if key not in issue:
            fail(f"Public issue missing key: {key}")
    for key in PUBLIC_FORBIDDEN_KEYS:
        if key in issue:
            fail(f"Public issue leaks admin-only key: {key}")
    if not issue.get("sectors"):
        fail("Issue has no sectors")
    if not issue.get("featured_stock", {}).get("symbol"):
        fail("Featured stock is missing")
    check_amounts(issue.get("market_summary", {}), "market_summary")
    check_amounts(issue["sectors"][0].get("summary", {}), "sector summary")
    check_amounts(issue["featured_stock"].get("summary", {}), "featured stock summary")
    method = issue.get("method", {})
    sector_source = method.get("sector_source", "")
    if "nepse_index_meta.json" not in sector_source:
        fail("Method note must preserve nepse_index_meta.json sector rule")
    boards = issue.get("leaderboards") or {}
    required_boards = {"top_gainers", "top_losers", "top_turnover", "top_volume", "top_transactions"}
    missing_boards = sorted(required_boards - set(boards))
    if missing_boards:
        fail(f"Public issue missing leaderboards: {', '.join(missing_boards)}")
    for board_name in required_boards:
        if not isinstance(boards.get(board_name), list):
            fail(f"Leaderboard {board_name} must be a list")
    price_rule = method.get("price_truth_definition", "")
    if "ltp_scaled" not in price_rule or "close_scaled" not in price_rule:
        fail("Method note must preserve POST-frame price truth rule")
    y = issue.get("youtube_package", {})
    if any(k in y for k in ["recording_blueprint", "proof_checklist", "pinned_comment", "thumbnail_direction", "description"]):
        fail("Public YouTube package leaks production-only fields")
    print(f"OK public issue {issue['business_date']}: sectors={len(issue['sectors'])}, featured={issue['featured_stock']['symbol']}")


def check_admin_issue(date: str) -> None:
    admin = load(ADMIN_CONTENT / "daily" / f"{date}.admin.json")
    for key in ADMIN_REQUIRED_KEYS:
        if key not in admin:
            fail(f"Admin issue missing key: {key}")
    validation = admin.get("validation", {})
    source_lock = (admin.get("source_lock") or {})
    metadata_source = str(source_lock.get("metadata_source") or "")
    if validation.get("unmapped_symbols") and "empty metadata fallback" not in metadata_source:
        fail(f"Unmapped symbols present: {validation['unmapped_symbols']}")
    if validation.get("unmapped_symbols") and "empty metadata fallback" in metadata_source:
        print("WARN: unmapped symbols present because nepse_index_meta.json was not available in this environment")
    y = admin.get("youtube_package", {})
    if len(y.get("title_options") or []) < 3:
        fail("Admin YouTube title options need at least 3 entries")
    if len(y.get("chapters") or []) < 3:
        fail("Admin YouTube chapters need at least 3 entries")
    print(f"OK admin issue {date}: candidates={len(admin.get('featured_candidates') or [])}")


def main() -> None:
    latest = load(CONTENT / "latest.json")
    issue = latest.get("issue", latest)
    check_public_issue(issue)
    date = issue["business_date"]
    check_public_issue(load(CONTENT / "daily" / f"{date}.json"))
    check_admin_issue(date)
    for rel in [
        "archive/daily.json", "archive/stocks.json", "archive/sectors.json", "archive/videos.json",
        "indexes/daily.index.json", "indexes/weekly.index.json", "indexes/stocks.index.json", "indexes/sectors.index.json",
        "indexes/videos.index.json", "indexes/articles.index.json", "indexes/glossary.index.json", "search.index.json",
        "seo/index.json", f"seo/daily/{date}.json", "sitemap.json",
    ]:
        load(CONTENT / rel)
        print(f"OK {rel}")
    print("Phase 10 content indexing validation passed.")


if __name__ == "__main__":
    main()
