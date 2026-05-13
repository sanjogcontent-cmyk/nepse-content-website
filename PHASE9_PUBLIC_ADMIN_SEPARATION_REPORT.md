# Phase 9 — Public/Admin Separation + Publishing Hardening

## Purpose

Phase 9 makes the NEPSE MTA content app publishable. The public website is a clean daily publication, while internal scoring, YouTube production assets, validation details, analytics, raw JSON, and copy tools stay in admin routes and admin-only JSON.

## Public/admin data separation

Phase 9 writes two payloads:

```txt
frontend/public/content/daily/YYYY-MM-DD.json          public-safe reader payload
frontend/content_admin/daily/YYYY-MM-DD.admin.json     full admin/production payload
```

The public JSON intentionally excludes:

```txt
featured_candidates
featured score breakdown
validation internals
admin_editor
analytics_foundation
recording_blueprint
proof_checklist
pinned_comment
thumbnail direction
raw production package
```

Admin routes load the admin payload through:

```txt
GET /api/content/daily/{date}/admin/full
```

## Public page rules implemented

- Public header hides `Admin Editor` and `Analytics` unless current route is `/admin/*` or `VITE_SHOW_ADMIN_NAV=1`.
- Public daily page no longer renders `FeaturedStockStudio`, `VideoPackage`, or `ProductionPolishNote`.
- Public page now uses:
  - `PublicIssueTools`
  - `PublicFeaturedStock`
  - `PublicVideoBlock`
- Public video block shows only YouTube embed or `Video coming soon`.
- Public featured stock hides internal score, candidate ranking, score breakdown, title ideas, thumbnail drafts, proof checklist, and recording blueprint.
- Public data-quality ribbon no longer shows promoter fallback lists or mapping diagnostics.

## Aggressor amount preservation

The user explicitly requested not to miss total Buy/Sell aggressor amount. Phase 9 preserves full aggressor quantity and amount across the public site:

- SummaryBar shows Agg Qty and Agg Amt for market, sector, and stock.
- Sector tiles include Buy Agg Amt and Sell Agg Amt.
- Stock table includes Buy Agg Amt, Sell Agg Amt, and Net Agg Amt.
- Daily archive cards include Buy Agg Amt and Sell Agg Amt.
- Stock archive includes Buy Agg Amt, Sell Agg Amt, Net Agg Amt.
- Sector archive includes Buy Agg Amt, Sell Agg Amt, Net Agg Amt.
- Generated archive JSON includes buy/sell/ambiguous/net aggressor quantity and amount fields.

## Date locking

- `/daily/YYYY-MM-DD` loads only `/content/daily/YYYY-MM-DD.json`.
- If the file date does not match the route date, the frontend shows a date-lock mismatch error.
- Dated routes do not fall back to latest issue.
- Source lock metadata is included in daily issue JSON.

## Publishing hardening

- Daily full admin schema: `content-issue-v2-phase9`.
- Public schema: `content-issue-v2-phase9-public`.
- Daily issue payload includes `source_lock`.
- Publishing state includes:
  - `status`
  - `published`
  - `article_approved`
  - `youtube_url`
  - `reviewed_by`
  - `editor_notes`
- Admin save refreshes public/admin sections before writing JSON.
- Video archive hides unfinished production packages unless a YouTube URL or uploaded/published status exists.

## Sector rule preserved

No manual sector file is created.

Sector membership remains:

```txt
equity_meta.sectorName → promoter_meta.sectorName → Unmapped
```

Therefore:

```txt
HIDCLP → Investment
```

Index intelligence remains context only and is not used for sector membership.

## Performance fix

The daily generator now aggregates stock summaries first, then joins symbol metadata once per distinct symbol. This avoids repeatedly joining metadata for every bucket and keeps generation practical on the full analysis database.

## Tested

Using uploaded test databases:

- `analysis_2026_2026-05-06(5).sqlite`
- `nepse_company_meta.sqlite`
- `index_intelligence(1).sqlite`

Result:

```txt
Daily JSON generation: OK
Public/admin JSON split: OK
Python compile: OK
Bundle validation: OK
Analytics validation: OK
Frontend production build: OK
Business date: 2026-05-06
Sectors: 12
Featured stock: SOHL
Mapped symbols: 269 / 269
Unmapped symbols: 0
Promoter fallback symbols: HIDCLP
```
