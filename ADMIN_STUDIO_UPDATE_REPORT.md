# NEPSE MTA Content Admin Studio Update

Base: `nepse_mta_content_redesign_v1`
Output: `nepse_mta_content_admin_studio_v2.zip`

## What changed

### Public site
- Preserved the previous public redesign, MTA bull/mountain logo, Home page, Daily Issue page, and responsive content display.

### Content Admin Studio
- Replaced the older admin editor with a purpose-built **Content Admin Studio**.
- Added editor-focused workflow tabs:
  - Story editor
  - Story blocks
  - Charts & graphics
  - Preview + publish
- Added a readiness card and save workflow.
- Added prompt helper for ChatGPT-supported content writing while keeping facts database-grounded.
- Added public preview card directly inside admin.
- Added publishing controls: draft/review/published/archived, YouTube URL, reviewed by, editor notes.
- Added export actions: copy public link, copy JSON, print/save PDF.

### Graphical presentation added to admin
- Buy/Sell/Ambiguous donut chart.
- Buy/Sell/Ambiguous bar chart.
- Sector flow cards.
- Stock battle stacked bars.
- KPI cards for NEPSE/index context, buy aggressor, sell aggressor, ambiguity, and same-broker/context.

## Verification
- Ran `npm install --no-audit --no-fund` in frontend.
- Ran `npm run build` successfully.

## Notes
- Backend content generation and routes were preserved.
- Admin save uses existing `/api/content/daily/{date}/admin/save-issue` endpoint.
- The admin redesign focuses on content presentation, not deep research terminal functionality.
