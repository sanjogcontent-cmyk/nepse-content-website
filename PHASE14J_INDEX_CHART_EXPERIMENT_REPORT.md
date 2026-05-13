# Phase 14J — Index + Sector Chart Experiment

## Purpose

Add charting without making the content website noisy again. The rule is:

- NEPSE market chart belongs on the daily issue and a small pulse on home.
- Sector index chart belongs on sector detail pages.
- `/sectors` cards only get compact sparklines; the main card remains amount-pressure first.

## Data source

Index charts come only from:

`/Volumes/SANJOG DRIVE/untitled folder/truth/index_analysis/index_analysis_2026.sqlite`

The builder reads `idx.v_idx_ticks` / `idx.v_idx_latest_ui` through the attached index DB. This database supplies intraday index path, close, previous close, change, percentage change, open/high/low and sampled tick count.

Important truth rule preserved:

- `nepse_index_meta.json` = sector/index constituent membership.
- `index_analysis_2026.sqlite` = index movement/chart context.
- `analysis_2026.sqlite` = stock price truth and order-flow truth.

## Backend changes

Updated `backend/app/content/index_intel.py`:

- Adds compact intraday sampled chart data under each index snapshot:
  - `index.chart.points[]`
  - `index.chart.open`
  - `index.chart.high`
  - `index.chart.low`
  - `index.chart.close`
  - `index.chart.prev_close`
  - `index.chart.point_count`
  - `index.chart.sampled_points`
- Chart generation is fail-safe and never breaks daily issue generation.
- Downsamples large tick paths to around 140 presentation points.

## Frontend changes

Added:

`frontend/src/components/IndexChart.jsx`

It provides:

- full index chart card
- mini sparkline
- previous close guide line
- open / high / low / previous close / tick-count summary

Integrated into:

- `/` home: compact NEPSE index pulse card inside Today’s Market Story.
- `/daily/2026-05-13`: full NEPSE intraday index path after the hero/nav.
- `/sectors`: compact sector-index sparkline inside each sector card.
- `/sectors/:sector`: full sector index chart after the sector hero.

## Presentation rule

Charts are supporting evidence only. The sector story still remains:

Buy Aggressor Amount vs Sell Aggressor Amount vs Ambiguous Amount.

The sector cards should not become chart-first.

## Verified with uploaded DBs

Using uploaded 2026-05-13 databases:

- NEPSE chart source: `v_idx_ticks`
- NEPSE tick count: 8,468
- NEPSE sampled chart points: 140
- Hydro Power tick count: 4,819
- Commercial Banks tick count: 1,245

Build/test commands completed:

```bash
npm run build
python3 scripts/check_content_bundle.py frontend/public/content/daily/2026-05-13.json
```
