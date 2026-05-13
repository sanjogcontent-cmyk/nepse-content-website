# Phase 14G — Daily Issue Presentation Redesign

## Scope
This update redesigns `/daily/2026-05-13` as a clean daily publication page. It does not change database truth, sector mapping, price logic, or order-flow semantics.

## Main change
The daily page is now organized as a readable market story:

1. Hero market verdict with NEPSE index context
2. Sticky section navigation
3. Today’s Market Story
4. Sector Pressure Map
5. Market Boards preview
6. Featured Stock Proof
7. Public article / method explanation
8. Export-ready social cards

## Data presentation rules preserved
- LTP / today close: final POST frame `ltp_scaled`.
- Previous close: final POST frame `close_scaled`.
- Sector mapping: `nepse_index_meta.json` first, company meta fallback only for missing symbols.
- Sector pressure visuals use amount: buy aggressor amount vs sell aggressor amount vs ambiguous amount.
- Same-broker is shown as context only.

## UI goals
- Remove raw-table-first feel from the daily issue.
- Preserve drilldown links to sectors, boards, stocks, home, and learn pages.
- Keep content presentation clean, compact, and elegant.
- Make daily page suitable for screenshots, public reading, and social export.

## Files changed
- `frontend/src/pages/DailyIssue.jsx`
- `frontend/src/styles.css`
- `CONTENT_CONTEXT.md`

## Validation
- `npm run build`
- `python3 scripts/check_content_bundle.py frontend/public/content/daily/2026-05-13.json`
