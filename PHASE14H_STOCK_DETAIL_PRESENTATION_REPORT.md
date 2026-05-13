# Phase 14H — Stock Detail Presentation Redesign

Updated page:

```txt
/stocks/SYPNL?date=2026-05-13
```

## Goal

Make stock pages presentation-first and elegant while preserving all real analysis-database information.

## What changed

- Rebuilt `frontend/src/pages/StockDetail.jsx` into a stock proof page.
- Added a clean stock hero with symbol, company, sector, daily verdict, LTP/change, turnover, net money pressure, and sector rank.
- Added an amount-based pressure card using:
  - buy aggressor amount
  - sell aggressor amount
  - ambiguous amount
  - same-broker amount as secondary context when available
- Added a price truth card showing last POST-frame LTP/close, open/high/low, previous close, day VWAP, and last trade time.
- Added a stock proof card that explains whether the stock confirms upside/downside, shows leaderboard appearances, and keeps the read short.
- Added compact same-broker context card with amount, turnover percentage, qty, trades, and buckets.
- Added archive/history card and sector context card.
- Moved full technical data into a collapsible drawer to avoid a raw data-dump first screen.

## Truth rules preserved

- Today LTP/close comes from analysis DB last POST frame fields.
- Previous close comes from `previous_close_rs` / POST-frame close baseline.
- Stock pressure is amount-first: `buy_aggr_amt_rs`, `sell_aggr_amt_rs`, `ambig_amt_rs`.
- Same-broker is contextual buyer=seller broker evidence only.
- No backend truth or schema rules were changed.

## Validation

- `npm run build` passed.
- `python3 scripts/check_content_bundle.py frontend/public/content/daily/2026-05-13.json` passed.
