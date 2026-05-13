# Phase 14E · /sectors Presentation Cleanup

## Goal
Make `/sectors` a clean visual sector presentation page instead of a noisy multi-board data dump.

## What changed
- Replaced the previous sector index page with an editorial sector flow map.
- Every sector is shown as a visual card with:
  - sector/index code
  - index percent change
  - turnover footprint
  - net aggressor flow
  - same-broker context as a small secondary metric
  - active stocks
  - top stock chips
  - one short interpretation line
- Kept full sector table, but hidden behind a deliberate “Show full sector table” button.
- Added clean leaderboard strips for largest footprint, buy pressure, and sell pressure.
- Added simple filters: all, buy-led, sell-led, index up, index down.
- Added sorting: turnover, index %, flow strength, active stocks, same-broker %.

## Design rule
Home and sector pages should present market information as a readable publication, not as a terminal. Raw tables stay available for audit but do not dominate first view.

## Truth policy unchanged
- Price/flow values still come from the generated daily issue based on analysis DB truth.
- Sector membership continues to come from JSON-first sector/index metadata with company SQLite fallback.
- Index values remain index-analysis context only.
- Same-broker is context evidence only, not an accusation.
