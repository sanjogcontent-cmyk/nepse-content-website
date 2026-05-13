# Phase 14K — Detailed / Scaled Index Chart Experiment

## Purpose

The Phase 14J index chart proved the index_analysis database can feed NEPSE and sector-index charts, but the first visual was too simple. Phase 14K makes the chart more useful for presentation by adding scale controls, axis detail, time labels, high/low/open/close markers, and richer index context without changing the truth sources.

## Data truth preserved

- `index_analysis_2026.sqlite` remains the source for NEPSE and sector index movement.
- `nepse_index_meta.json` remains the source for sector/index constituent membership.
- `analysis_2026.sqlite` remains the source for stock price truth and order-flow truth.

## Frontend changes

Updated:

- `frontend/src/components/IndexChart.jsx`
- `frontend/src/styles.css`

The index chart now supports:

- detailed scaled SVG chart instead of only a large sparkline
- y-axis value labels
- x-axis time labels
- previous-close dashed reference line
- open marker
- high marker
- low marker
- close marker
- shaded line area
- scale controls:
  - Auto detail
  - Full range
  - Prev-close centered
- detail strip:
  - session range
  - range width
  - close vs open
  - close recovery from low
- upgraded stats:
  - open
  - high
  - low
  - close
  - previous close
  - source ticks
  - sampled points

## Presentation rule

The chart is still one clean chart per detail section. It should support the story, not overwhelm the page.

Use:

- Daily page: full detailed NEPSE chart
- Sector detail page: full detailed sector index chart
- Home and sector cards: compact sparkline only

## Test results

Ran:

```bash
npm run build
python3 scripts/check_content_bundle.py frontend/public/content/daily/2026-05-13.json
```

Both passed.
