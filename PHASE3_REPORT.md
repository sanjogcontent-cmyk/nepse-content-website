# PHASE 3 REPORT — Sector Interaction

## Bundle

`nepse_mta_content_engine_phase3_sector_interaction_v1`

## Goal

Upgrade the public daily page sector experience so the reader can move naturally from market summary to sector summary to stock teaser without feeling like they are using a complicated terminal.

## Implemented

### Sector board

- Sector search.
- Bias filter: all, buy pressure, sell pressure, mixed.
- Evidence filter: all, high, medium, lower.
- Sort modes:
  - trade amount,
  - absolute net pressure,
  - buy aggression,
  - sell aggression,
  - evidence quality,
  - index movement,
  - active stock count.
- Turnover-share bar per sector.
- Full-number sector cards.
- Evidence badge per sector.
- Index mini context when available.

### Sector workspace

- Previous / next sector navigation.
- Copy deep link for selected sector and stock.
- Sector tabs:
  - Overview,
  - Leaders,
  - Stocks,
  - Stock teaser.
- Sector pressure mix panel.
- Evidence guardrail panel.
- Sector leader cards:
  - top turnover,
  - strongest buy net,
  - strongest sell net,
  - largest imbalance.

### Stocks inside sector

- Search by symbol/company.
- Bias filter.
- Evidence filter.
- Quick sorting chips.
- Sticky rank and symbol columns.
- Full number display.
- Click row to update selected stock teaser and URL state.

## Preserved truth rules

- No new sector file.
- Sector mapping still uses `equity_meta.sectorName → promoter_meta.sectorName → Unmapped`.
- HIDCLP remains Investment through promoter fallback.
- Index intelligence remains context only.
- Full numbers only; no K/M/B abbreviations.

## Tested

- Python backend files compiled.
- Daily issue JSON regenerated for `2026-05-06` using uploaded analysis, company metadata, and index intelligence databases.
- Validation remained:
  - analysis symbols: 269,
  - mapped symbols: 269,
  - unmapped symbols: 0,
  - promoter fallback symbols: HIDCLP.

Frontend dependencies are not included in the zip. Run `npm install` in `frontend/` on the Mac before `npm run dev`.

## Next phase

Phase 4 — Featured Stock + YouTube block.

Add:

- stronger featured-stock card,
- featured-score transparency,
- why-selected reasoning panel,
- video title/thumbnail/hook/chapter/description/pinned-comment production layout,
- video recording checklist tied to Truth Viewer and Order Flow Platform.
