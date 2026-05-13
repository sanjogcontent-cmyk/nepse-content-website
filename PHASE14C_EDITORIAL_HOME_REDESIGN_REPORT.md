# Phase 14C — Editorial Home Redesign

## Goal

The previous public home page looked like a raw data dump. Phase 14C redesigns it into a clean market front page with a controlled reader flow:

A. Today’s Market Story → B. Sector Flow Map → C. Market Boards → D. Featured Stock Proof → E. Story Archive → F. Social Export Studio.

## Main UI changes

- Replaced the old KPI-heavy home layout with a simple editorial layout controller in `frontend/src/pages/Home.jsx`.
- Added new home components:
  - `TodayMarketStory.jsx`
  - `SectorFlowMap.jsx`
  - `FeaturedStockProof.jsx`
  - `StoryArchiveStrip.jsx`
  - `SocialExportStudio.jsx`
  - shared `homeUtils.js`
- Refactored market boards into compact board components:
  - `BoardCard.jsx`
  - `BoardRow.jsx`
  - `FlowPill.jsx`
  - `SameBrokerMini.jsx`
- Rebuilt `/boards` as an exploration page with board tabs, search, sector filter, page size, next/previous paging and stock click-through.

## Content/data rules preserved

- LTP/today close comes from the last POST-frame `ltp_scaled` / generated `ltp_rs`.
- Previous close comes from the last POST-frame `close_scaled` / generated `previous_close_rs`.
- Turnover, volume, transactions and order-flow values come from analysis bucket trade truth.
- Sector/index membership remains JSON-first from `nepse_index_meta.json`, then optional company-meta fallback.
- Same-broker metric remains contextual evidence only (`buyer_member_id = seller_member_id`).

## Visual rules added

- Home is an editorial front page, not the exploration table.
- Same-broker appears as a small muted line on board rows, not as dominant purple text.
- Order-flow read is compressed to one pill and one short interpretation.
- Social export cards are compact, print-friendly and data-rich instead of giant dark empty posters.

## Verification

- Frontend production build passed with Vite.
- Content bundle validation passed for `frontend/public/content/daily/2026-05-13.json`.
- Backend/source compile check passed.
- `node_modules` and generated `frontend/dist` are excluded from the final zip to avoid macOS native Rollup verification issues.
