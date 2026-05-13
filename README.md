# NEPSE MTA Content Engine — Phase 11 Writer Studio + Fact-Locked Content Workflow

This bundle turns your NEPSE analysis database into a clean daily content website.

The public website is now separated from admin tools:

```txt
Public website = market summary, sector summary, stocks, featured stock teaser, article, video embed/coming soon, archive
Admin editor   = scoring, candidates, YouTube production pack, raw JSON, validation, copy tools, analytics
```

## Completed phases

- **Phase 1:** Daily payload generator.
- **Phase 2:** Public daily issue page.
- **Phase 3:** Sector interaction and stocks inside sectors.
- **Phase 4:** Featured stock scoring and YouTube production pack.
- **Phase 5:** Admin editor.
- **Phase 6:** Archive and SEO foundation.
- **Phase 7:** Public-page refinement and navigation polish.
- **Phase 8:** Privacy-safe reader analytics.
- **Phase 9:** Public/admin separation, publishing hardening, date-locking, clean public content, and full Buy/Sell aggressor amount preservation.
- **Phase 10:** Proper website/content indexing, weekly summaries, search/sitemap/glossary indexes, and admin ChatGPT writer workflow.


## Phase 11 important changes

- `/admin/writer` is upgraded into a full Content Writing Studio.
- Prompt library added: Daily Article, Featured Stock Story, YouTube Script, Shorts/TikTok Script, Titles + Thumbnail, Learn Explainer, Social Posts, and Weekly.
- Prompts include a strict FACT LOCK so ChatGPT writes language from database facts only.
- Stock summaries now support previous close, open, high, low, close, change, day VWAP, Buy Agg VWAP, Sell Agg VWAP, and Ambig VWAP.
- Previous Close = previous business day final analysis close.
- Close = current day last bucket POST-frame analysis close.
- Open / High / Low / Day VWAP = actual matched bucket trades.
- Role VWAPs use `v_an_bucket_trade_roles` when available.

## Phase 10 important changes

- Generated content indexes under `frontend/public/content/indexes/`: daily, weekly, stocks, sectors, videos, articles, glossary.
- Generated `search.index.json` and expanded `sitemap.json`.
- New public `/weekly` and `/weekly/:week_id` pages.
- New admin `/admin/writer` page for ChatGPT daily/weekly prompt copying and article approval.
- Stock and sector archives default to latest business date only; all-history view is explicit.
- Public header hides `Admin Editor` and `Analytics` unless you are already inside `/admin/*` or `VITE_SHOW_ADMIN_NAV=1`.
- Public daily page no longer shows candidate ranking, featured score, score breakdown, title options, thumbnail drafts, recording blueprint, proof checklist, raw JSON, copy tools, admin validation, or analytics.
- Public video block shows only an embedded YouTube video or a clean `Video coming soon` block.
- `/daily/YYYY-MM-DD` is date-locked and will not fall back to latest content.
- Full Buy/Sell aggressor **quantity and amount** are preserved in market, sector, stock, and archive views.

## Data source rules

1. Sector/index membership comes from `nepse_index_meta.json` first. The old `nepse_company_meta.sqlite` is only an optional fallback when the JSON is missing.
2. Stock price truth comes from the last `an_bucket_frames` POST frame for each symbol: `ltp_scaled` is today LTP/close, `close_scaled` is previous close, and `open_scaled`/`high_scaled`/`low_scaled`/`avg_scaled` are the day fields.
3. `index_analysis_2026.sqlite` gives index points and chart context. It does not decide stock sector membership.
4. Buy/Sell means aggressor flow, not participant buyer/seller.
5. Aggressor amount is proxy-allocated from bucket turnover by aggressor quantity share.
6. Website summarises. Truth Viewer / Order Flow Platform / video proves.
7. Analytics tracks content behavior only, not holdings or brokerage data.

## One-command local run for your Mac

```bash
cd "/Users/sanjoggautam/Desktop/sanjog codex/nepse_mta_content_engine_phase11_writer_studio_factlock_v1"
chmod +x scripts/*.sh
./scripts/run_sanjog_local.sh
```

Open the URLs printed by the script, for example:

```txt
http://127.0.0.1:5173
http://127.0.0.1:5173/daily/YYYY-MM-DD
http://127.0.0.1:5173/admin/daily/YYYY-MM-DD
http://127.0.0.1:5173/admin/analytics
http://127.0.0.1:5173/admin/writer
http://127.0.0.1:5173/weekly
```

## Manual run

```bash
cd "/Users/sanjoggautam/Desktop/sanjog codex/nepse_mta_content_engine_phase11_writer_studio_factlock_v1"

export TRUTH_ROOT="/Volumes/SANJOG DRIVE/untitled folder/truth"
export AN_DB_PATH="$TRUTH_ROOT/analysis/analysis_2026.sqlite"
export WS_DB_PATH="$(ls -1 "$TRUTH_ROOT"/ws/week_*.sqlite | sort | tail -n 1)"
export FS_DB_PATH="$TRUTH_ROOT/floorsheet/floorsheet_2026.sqlite"
export INDEX_META_JSON_PATH="/Users/sanjoggautam/Desktop/sanjog codex/daily_floorsheet_divisor/database/meta/nepal_stock_meta/nepse_index_meta.json"

if [ -f "$TRUTH_ROOT/index_analysis/index_intelligence.sqlite" ]; then
  export INDEX_DB_PATH="$TRUTH_ROOT/index_analysis/index_intelligence.sqlite"
else
  export INDEX_DB_PATH="$TRUTH_ROOT/index_analysis/index_analysis_2026.sqlite"
fi

export CONTENT_ANALYTICS_DB_PATH="$TRUTH_ROOT/content_analytics/analytics.sqlite"
export BUSINESS_DATE="$(python3 - <<'PY'
import os, sqlite3
an = os.environ['AN_DB_PATH']
print(sqlite3.connect(an).execute('SELECT MAX(business_date) FROM an_buckets').fetchone()[0])
PY
)"

./scripts/generate_daily_issue.sh "$BUSINESS_DATE"
./scripts/run_all.sh
```

## Public routes

```txt
/
/daily
/archive
/daily/YYYY-MM-DD
/stocks
/stocks/:symbol
/sectors
/sectors/:sectorSlug
/videos
/learn
```

## Admin routes

```txt
/admin/daily/YYYY-MM-DD
/admin/analytics
/admin/analytics/daily/YYYY-MM-DD
```

## Generated content location

```txt
frontend/public/content/latest.json
frontend/public/content/daily/YYYY-MM-DD.json
frontend/public/content/archive/daily.json
frontend/public/content/archive/stocks.json
frontend/public/content/archive/sectors.json
frontend/public/content/archive/videos.json
frontend/public/content/seo/daily/YYYY-MM-DD.json
frontend/public/content/seo/index.json
frontend/public/content/sitemap.json
```

## Validation

```bash
./scripts/validate_analytics.sh
./scripts/validate_bundle.sh
```

## What still comes later

- real login/auth for admin routes,
- full article editing interface,
- public publish button that writes only approved articles,
- Cloudflare/GitHub deployment packaging,
- direct upload or scheduling to YouTube.


``
Now open the public page:
open "http://127.0.0.1:5173/daily/2026-05-07"
Open admin editor:
open "http://127.0.0.1:5173/admin/daily/2026-05-07"
Open analytics:
open "http://127.0.0.1:5173/admin/analytics
http://127.0.0.1:5173/admin/writer
http://127.0.0.1:5173/weekly"
The public daily page should now not show internal admin items like candidate ranking, score breakdown, title options, thumbnail drafts, proof checklist, raw JSON, analytics, or copy buttons.
Check these files were generated:
ls -lh frontend/public/content/daily/2026-05-07.json
ls -lh frontend/content_admin/daily/2026-05-07.admin.json
The meaning is:
frontend/public/content/daily/2026-05-07.json
= public-safe website content

frontend/content_admin/daily/2026-05-07.admin.json
= admin-only production content
If the browser still shows the old Phase 8 style, force refresh:
Command + Shift + R
Or stop and restart cleanly:
pkill -f "uvicorn app.main:app"
pkill -f "vite"

./scripts/run_sanjog_local.sh
open "http://127.0.0.1:5173/daily/2026-05-13"

``
