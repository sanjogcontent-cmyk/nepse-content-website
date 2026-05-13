# Phase 14 — Order-Flow Boards + Correct POST-Frame Price Truth

## What changed

This update rewires the content website so it can publish a clean market-board page while keeping the story controlled by order flow.

### 1. Correct price truth from the analysis DB

For every stock, the website now uses the last `an_bucket_frames` row with `role='POST'` for the selected business date:

- `ltp_scaled` = today LTP / close shown on the website.
- `close_scaled` = previous close.
- `open_scaled`, `high_scaled`, `low_scaled`, `avg_scaled` = day open, high, low, average price.

This fixes the previous reversal where `close_scaled` was being treated like today's close.

### 2. Sector/index membership from `nepse_index_meta.json`

Sector grouping now prefers:

1. `INDEX_META_JSON_PATH` / `NEPSE_INDEX_META_JSON_PATH` / default `nepse_index_meta.json` path.
2. Optional old company-meta SQLite only as fallback.
3. Explicit `Unmapped` when no metadata is available.

The JSON is parsed into an in-memory `meta` SQLite database so the existing SQL joins still work without redesigning every query.

### 3. Index analysis DB remains index context

`index_analysis_2026.sqlite` is still used for index movement, latest index values, sector index context, and charting. It does not decide stock sector membership.

### 4. New Market Boards data payload

The generated daily JSON now includes:

- `leaderboards.top_gainers`
- `leaderboards.top_losers`
- `leaderboards.top_turnover`
- `leaderboards.top_volume`
- `leaderboards.top_transactions`

Each row includes price fields plus order-flow fields:

- LTP, previous close, point change, percent change
- turnover, shares traded, transactions
- buy/sell/net aggressor quantity and amount
- evidence/confidence/explainability
- `story_hint` for fast public storytelling

### 5. New `/boards` page

Frontend adds a dedicated Boards page with:

- Top Gainers
- Top Losers
- Top Turnover
- Top Volume
- Top Transactions
- View-more buttons from the home page
- Next/previous pagination on the full page
- Row click-through to `/stocks/{symbol}?date=YYYY-MM-DD`
- Order-flow read column so the page explains whether a move is buy-driven, sell-driven, absorption-like, or contradictory.

## Validation performed in this sandbox

Using the uploaded 2026-05-13 analysis DB and index DB:

- `python3 -m py_compile` passed for updated backend scripts.
- `./scripts/generate_daily_issue.sh 2026-05-13` passed.
- `python3 scripts/check_content_bundle.py` passed.
- `npm --prefix frontend run build` passed.
- A temporary `nepse_index_meta.json` parser check passed for sector mapping.

The sandbox did not include your real `nepse_index_meta.json`, so generated sample content in the zip shows `Unmapped` sectors in the generated JSON. On your Mac, the default path points to:

`/Users/sanjoggautam/Desktop/sanjog codex/daily_floorsheet_divisor/database/meta/nepal_stock_meta/nepse_index_meta.json`

When that file exists, the generator maps sectors from it.

## Run

```bash
cd "/path/to/nepse_mta_content_stocks_sectors_remake_v11-3"
chmod +x scripts/*.sh
./scripts/run_sanjog_local.sh
```

Or set paths manually:

```bash
export TRUTH_ROOT="/Volumes/SANJOG DRIVE/untitled folder/truth"
export AN_DB_PATH="$TRUTH_ROOT/analysis/analysis_2026.sqlite"
export INDEX_DB_PATH="$TRUTH_ROOT/index_analysis/index_analysis_2026.sqlite"
export INDEX_META_JSON_PATH="/Users/sanjoggautam/Desktop/sanjog codex/daily_floorsheet_divisor/database/meta/nepal_stock_meta/nepse_index_meta.json"
export BUSINESS_DATE="2026-05-13"
./scripts/generate_daily_issue.sh "$BUSINESS_DATE"
./scripts/run_all.sh
```
