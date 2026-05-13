# Phase 14M — Order-Flow Conviction Charts + Cloudflare Share Runner

Baseline: uploaded `Archive(125).zip`.

## What changed

- Added a presentation-first market order-flow conviction chart directly below the daily hero:
  - x-axis: time
  - y-axis: cumulative net aggressor amount
  - zero line: balance point
  - positive zone: buy-aggressive amount leading
  - negative zone: sell-aggressive amount leading
- Stock detail chart now uses a working `StockOrderFlowChart` import and shows:
  - cumulative net aggressor amount
  - cumulative delta quantity
  - cumulative buy/sell/turnover evidence metrics
- Sector detail full constituent board now supports clickable/sortable headers for:
  - Stock, LTP, Change, Turnover, Volume, Net Flow, Buy Agg, Sell Agg, VWAP, Same-Broker, Evidence
- Sector detail rows remain clickable to open stock pages.
- Index chart marker text was simplified so high/open/low/close labels no longer block the chart path/value; the detailed values remain in the stat cards below the chart.
- Added `frontend/public/favicon.ico` to remove the favicon 404.
- Added Cloudflare tunnel runner:
  - `./scripts/run_sanjog_cloudflare.sh`
  - root shortcut: `./run_cloudflare.sh`
  - prints local UI, public trycloudflare URL, daily issue link, sectors link, and SYPNL stock link
  - saves public URL to `logs/public_url.txt`

## Data truth preserved

- Index path comes from `index_analysis_2026.sqlite`.
- Market cumulative turnover and cumulative net aggressor amount come from `analysis_2026.sqlite` bucket metrics.
- Stock cumulative delta and cumulative net aggressor amount come from `v_an_bucket_trade_roles`.
- Sector/index membership remains JSON-first from `nepse_index_meta.json`, with company SQLite as fallback/enrichment only.

## Tested

```bash
AN_DB_PATH='/mnt/data/db14l/analysis_2026_2026-05-13.sqlite' \
INDEX_DB_PATH='/mnt/data/index14j/index_analysis_2026.sqlite' \
INDEX_META_JSON_PATH='/mnt/data/nepse_index_meta(4).json' \
COMPANY_META_DB_PATH='/mnt/data/nepse_company_meta(1).sqlite' \
BUSINESS_DATE='2026-05-13' \
./scripts/generate_daily_issue.sh 2026-05-13

python3 scripts/check_content_bundle.py frontend/public/content/daily/2026-05-13.json

cd frontend
npm install
npm run build
```
