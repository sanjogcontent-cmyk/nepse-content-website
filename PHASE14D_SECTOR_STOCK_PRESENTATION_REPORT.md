# Phase 14D — Sector and Stock Presentation Refinement

## Goal
Clean up `/sectors/:sectorSlug` and `/stocks` so the app presents market information like an editorial market front page while preserving all useful data.

## Changed pages
- `frontend/src/pages/SectorDetail.jsx`
- `frontend/src/pages/StockArchive.jsx`
- `frontend/src/styles.css`

## Sector page changes
The sector detail page now follows this flow:
1. Sector presentation hero with index movement, turnover, flow signal, active stocks and buy/sell/ambiguous mix.
2. KPI strip for transactions, buy aggressor, sell aggressor and same-broker share.
3. Leadership boards for top turnover and strongest net pressure.
4. Top mover/contradiction cards.
5. Same-broker context card with amount, quantity, trades and buckets.
6. Archive sparkline and saved issue chips.
7. Full searchable, sortable, paginated constituent table.

## Stock page changes
The stock archive page now follows this flow:
1. Market context hero with NEPSE index, turnover, flow bias and same-broker share.
2. Top story cards for top gainer, top turnover and strong buy flow.
3. Quick leadership strip for buy aggressor, sell aggressor, strong buy net, strong sell net and ambiguity.
4. Clean tabbed leadership board: Price, Turnover/Volume, Transactions, Aggressor Flow, Price x Flow.
5. Screenshot-ready export strip.
6. Complete stock index table with search, sector filter, price/flow filter, sort and pagination.

## Truth preserved
- LTP / today close = last POST frame `ltp_scaled` from analysis DB.
- Previous close = last POST frame `close_scaled`.
- Open/high/low/average fields = last POST frame day fields.
- Turnover, volume, transactions and aggressor fields = analysis bucket trade truth.
- Sector membership = `nepse_index_meta.json` first, SQLite fallback only when needed.
- `index_analysis_2026.sqlite` remains for index point/chart context.
- Same-broker metrics are buyer broker == seller broker context only, not an accusation.

## Validation
- `npm run build` completed successfully.
- `python3 scripts/check_content_bundle.py frontend/public/content/daily/2026-05-13.json` completed successfully.
