# Phase 14L — Order-flow Presentation Charts

This phase makes the content website charting match the real brand idea: order-flow presentation, not a generic market dashboard.

## Main additions

- Added **NEPSE cumulative turnover** chart from `analysis_2026.sqlite` bucket truth.
- Added **sector cumulative turnover** chart for sector detail pages, filtered by JSON-first sector membership.
- Added **stock cumulative delta + cumulative volume** chart for stock detail pages.
- Added chart story bridge cards so charts explain the content idea in one readable line.

## Truth rules preserved

- Index path comes from `index_analysis_2026.sqlite`.
- Market cumulative turnover comes from `analysis_2026.sqlite` bucket metrics.
- Sector cumulative turnover comes from `analysis_2026.sqlite` bucket metrics + `nepse_index_meta.json` sector mapping.
- Stock cumulative delta comes from `v_an_bucket_trade_roles`: running `BUY_AGGRESSOR quantity - SELL_AGGRESSOR quantity`.
- Stock cumulative volume comes from `v_an_bucket_trade_roles` cumulative `quantity`.
- Stock price truth remains last POST frame: `ltp_scaled` = today close/LTP, `close_scaled` = previous close.

## Presentation intent

- Daily page now presents **price context + participation build**.
- Sector detail pages now present **sector index path + sector participation build**.
- Stock pages now present **cumulative delta as conviction** and **cumulative volume as participation**.

## Tested

- `python3 -m py_compile backend/app/content/daily_issue_builder.py`
- daily issue generation for `2026-05-13`
- `npm run build`
- `python3 scripts/check_content_bundle.py frontend/public/content/daily/2026-05-13.json`

