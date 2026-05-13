# Phase 7 — Stocks/Sectors Content Presentation Remake

Base used: `Archive(75).zip`.
Index database inspected: `index_analysis_2026.sqlite(1).zip`.

## Main change
Remade the public Stocks and Sectors content index pages to be cleaner, more powerful, and less overwhelming.

## Stock page
- Replaced long stacked Top 5 sections with one story-first content system.
- Added Market Context hero with NEPSE index, market turnover, flow bias, and real NEPSE index sparkline history.
- Added three large content highlight cards:
  - Top Gainer
  - Top Turnover
  - Strong Buy Flow
- Added indispensable visual flow strip:
  - Buy Agg Leader
  - Sell Agg Leader
  - Strong Buy Net
  - Strong Sell Net
  - Highest Ambiguity
- Added compact Leaderboard board with tabs:
  - Price
  - Turnover / Volume
  - Activity
  - Aggressor Flow
  - Price × Flow
- Aggressor Flow remains visible and important, but appears as a focused nested view rather than many vertical blocks.
- Full table moved into a collapsible section.
- Added export-ready content card for social/report use.

## Sector page
- Added Sector Context hero with NEPSE index, market turnover, flow bias, and real NEPSE index sparkline history.
- Added sector chart cards using real index history from `index_analysis_2026.sqlite` exported to `frontend/public/content/indexes/index-history.json`.
- Added three large sector story cards:
  - Top Gaining Sector
  - Top Turnover Sector
  - Strong Buy Net Sector
- Added indispensable visual sector flow strip:
  - Buy Agg Sector
  - Sell Agg Sector
  - Strong Buy Net
  - Strong Sell Net
  - Highest Ambiguity
- Added compact Sector Leaderboard board with tabs:
  - Index Price
  - Turnover / Volume
  - Activity
  - Aggressor Flow
  - Index × Flow
- Full sector table moved into a collapsible section.
- Added export-ready sector card.

## Database / index work
- Inspected uploaded `index_analysis_2026.sqlite` schema.
- Generated `frontend/public/content/indexes/index-history.json` with daily last-tick index values for all index codes.
- The charts use real values only; no fake decorative lines.

## Verification
- `npm run build` passed.
- `scripts/check_content_bundle.py` passed.
- `scripts/validate_bundle.sh` passed.

## Note
The frontend npm scripts were adjusted to call Vite through `node ./node_modules/vite/bin/vite.js` because the extracted `.bin/vite` file was not a valid symlink in this zip environment.
