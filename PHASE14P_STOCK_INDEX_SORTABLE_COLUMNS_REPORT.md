# Phase 14P — Complete Stock Index Sortable Columns

## Scope
Presentation-only update for `/stocks` complete stock index table.

## Changes
- Made every displayed stock index table header clickable and sortable.
- Added sort direction toggle on repeated header clicks.
- Added active sort indicator arrows.
- Kept the existing sort dropdown, now synchronized with the same sort engine.
- Kept every row clickable to open the stock detail page.

## Sortable columns
- Stock
- Sector
- LTP
- Change
- Turnover
- Volume
- Transactions
- Net Flow
- Buy Agg
- Sell Agg
- Same-Broker
- Read
- Evidence

## Behavior
- Text columns default to ascending sort.
- Numeric / market columns default to descending sort.
- Clicking the active column toggles ascending/descending.
- Pagination resets to page 1 when sort changes.

## Tested
- `npm run build`
- `python3 scripts/check_content_bundle.py frontend/public/content/daily/2026-05-13.json`
