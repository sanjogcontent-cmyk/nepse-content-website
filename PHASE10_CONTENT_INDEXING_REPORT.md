# Phase 10 — Content Indexing + Writer Workflow

This update continues from the uploaded `Archive(67).zip` baseline.

## Added

- Proper generated website/content indexes:
  - `frontend/public/content/indexes/daily.index.json`
  - `frontend/public/content/indexes/weekly.index.json`
  - `frontend/public/content/indexes/stocks.index.json`
  - `frontend/public/content/indexes/sectors.index.json`
  - `frontend/public/content/indexes/videos.index.json`
  - `frontend/public/content/indexes/articles.index.json`
  - `frontend/public/content/indexes/glossary.index.json`
- Generated `frontend/public/content/search.index.json`.
- Expanded `frontend/public/content/sitemap.json`.
- Generated weekly issue JSON under `frontend/public/content/weekly/{week_id}.json`.
- New `/weekly` and `/weekly/:week_id` public routes.
- New `/admin/writer` route.
- Backend content-index rebuild endpoint.
- Backend ChatGPT prompt endpoints:
  - `/api/content/writer/daily/{business_date}/prompt`
  - `/api/content/writer/weekly/{week_id}/prompt`
- Backend article approval endpoint:
  - `/api/content/daily/{business_date}/admin/approve-article`
- Stock/sector archive default scope now shows latest business date only unless the user explicitly chooses all-history view.
- Glossary page is now backed by `glossary.index.json`.
- Public featured stock summary number overflow is fixed by narrower summary grids and wrapped flow values.

## Preserved rules

- Public pages do not expose admin scoring, candidate ranking, raw JSON, proof checklist, thumbnail drafts, or analytics.
- Buy/Sell aggressor quantity and amount are still visible in market, sector, stock, daily, weekly, and archive views.
- Sector grouping remains `equity_meta.sectorName → promoter_meta.sectorName → Unmapped`.
- HIDCLP remains Investment through promoter fallback.
- Daily and weekly content are date-locked and generated from indexed JSON files.
- ChatGPT is used for wording only; facts come from database-generated prompts.

## Tested

- Daily issue generation: OK
- Content index generation: OK
- Python compile/import: OK
- Public/admin separation validation: OK
- Frontend production build: OK
