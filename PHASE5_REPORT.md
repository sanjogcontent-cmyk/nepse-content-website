# Phase 5 Report — Admin Editor

Baseline: `nepse_mta_content_engine_phase4_featured_youtube_v1`

Phase 5 turns the internal `/admin/daily/:date` page into a production editor for the daily NEPSE content workflow.

## Completed

### Admin production dashboard
- Added a serious internal editor hero.
- Added publishing status workflow: Draft, Reviewing, Ready to Record, Recording, Video Uploaded, Ready to Publish, Published.
- Added YouTube URL field.
- Added reviewer name and editor notes.
- Added save button with FastAPI backend write support and browser localStorage fallback.
- Added public page preview button.
- Added downloadable issue JSON.

### Publish readiness checklist
- Checks sector metadata mapping.
- Checks promoter fallback review.
- Checks featured stock selection.
- Checks article generation.
- Checks YouTube package generation.
- Checks chapter readiness.
- Checks sector review availability.
- Checks YouTube URL when relevant.

### Metadata validation
- Shows analysis symbols, mapped symbols, unmapped symbols, promoter fallback symbols, and missing company-name symbols.
- Keeps the strict mapping rule: equity sector first, promoter sector fallback, then Unmapped.
- Confirms HIDCLP behavior through promoter fallback without creating any extra sector file.

### Featured candidate review
- Keeps Phase 4 candidate scoring intact.
- Adds full candidate table for admin review.
- Shows score, sector, turnover, net aggression, confidence, explainability, and story mode.

### Copy center
- Copy article.
- Copy YouTube description.
- Copy chapters.
- Copy title and thumbnail text pack.
- Copy pinned comment.
- Copy full production pack.
- Copy raw issue JSON.

### Sector review
- Adds admin sector list.
- Shows trade amount, active stocks, and evidence by sector.
- Opens the matching public deep link for selected sector.
- Keeps stock table for sector-level review.

### Backend admin endpoints
New endpoints under `/api/content`:

- `GET /daily/{business_date}/admin/readiness`
- `POST /daily/{business_date}/admin/save-issue`
- `POST /daily/{business_date}/admin/publish-state`

These write back to the generated daily JSON when the FastAPI backend is running.

## Preserved rules

- No extra sector file.
- Sector grouping remains `equity_meta.sectorName → promoter_meta.sectorName → Unmapped`.
- `index_intelligence.sqlite` is only used for index/sector movement context, not sector membership.
- The website summarizes; NEPSE Truth Viewer / Order Flow Platform proves.

## Next phase

Phase 6 — Archive / SEO foundation:
- Daily archive cards.
- SEO-ready daily issue route metadata.
- Article/video metadata JSON.
- Stock story archive foundation.
- Sector archive foundation.
- Sitemap-style JSON foundation.
