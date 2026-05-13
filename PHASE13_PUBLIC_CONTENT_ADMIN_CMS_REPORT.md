# Phase 13 — Public Content Facelift + Full Admin CMS

## Goal
Make the public site feel like a clean NEPSE order-flow publication and make the admin panel easy enough to write, edit, preview, package, and publish content without touching code.

## Public page upgrades
- Added a reader-first Story Board on the Daily Issue page.
- Added Quick Read takeaways near the top of the public article.
- Added editable editorial blocks with clean cards instead of a jumbled wall of data.
- Added a Price + Flow Truth card for the featured stock:
  - Previous Close
  - Open
  - High
  - Low
  - Close
  - Day VWAP
  - Buy Agg VWAP
  - Sell Agg VWAP
  - Buy Agg Qty
  - Sell Agg Qty
  - Ambiguous Qty
  - Net Agg Qty
- Added a video CTA band controlled from admin.
- Kept database facts locked and separated from editable public writing.

## Admin CMS upgrades
The route `/admin/daily/YYYY-MM-DD` is now a full CMS editor with tabs:

1. Write page
   - Public title
   - Hero thesis
   - Opening paragraph
   - Market paragraph
   - Sector paragraph
   - Featured stock paragraph
   - Video bridge
   - Reader intro
   - Quick-read takeaways

2. Story blocks
   - Add/remove public sections
   - Reorder sections with Up/Down
   - Change section type: lead, market, sector, featured, proof, note
   - Toggle visibility per block

3. Featured + facts
   - Locked stock facts displayed clearly
   - Editable headline, editor angle, why-selected bullets, proof points

4. Video + social
   - Public video CTA title/body/button
   - YouTube URL
   - YouTube title options
   - Thumbnail text options
   - Description
   - Pinned comment
   - Community post
   - Hashtags

5. Layout
   - Toggle public sections on/off
   - Public density: clean, compact, deep
   - Layout mode: publication, magazine, research note

6. Preview + publish
   - Live mini preview
   - Publish readiness checks
   - Publishing status
   - Reviewed-by field
   - Editor notes

7. Advanced JSON
   - Full JSON power editor for advanced structured edits.

## Backend/public JSON updates
- Public issue JSON now preserves `cms` and `public_cms` safely.
- Admin save writes CMS content and rebuilds public JSON.
- Public page reads CMS content when present and falls back to generated article when absent.

## Validation
- Frontend production build passed.
- Backend Python compile passed.
- Bundle validation passed.
