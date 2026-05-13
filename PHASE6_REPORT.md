# Phase 6 Report — Archive / SEO Foundation

Phase 6 completes the first full content-production implementation for the NEPSE MTA daily publication system.

## Baseline

Previous baseline:

```txt
nepse_mta_content_engine_phase5_admin_editor_v1
```

New baseline:

```txt
nepse_mta_content_engine_phase6_archive_seo_v1
```

## What Phase 6 adds

### 1. Generated archive outputs

The daily issue writer now creates durable archive files under:

```txt
frontend/public/content/archive/daily.json
frontend/public/content/archive/stocks.json
frontend/public/content/archive/sectors.json
frontend/public/content/archive/videos.json
```

These are generated from the daily issue JSON files, not manually authored content.

### 2. SEO metadata outputs

Each issue now includes a `seo` object and writes:

```txt
frontend/public/content/seo/daily/YYYY-MM-DD.json
frontend/public/content/seo/index.json
frontend/public/content/sitemap.json
```

The SEO payload includes:

```txt
title
description
canonical path
Open Graph metadata
Twitter metadata
keywords
Article structured data
Video structured data foundation
internal links
thumbnail text options
```

### 3. Public archive pages

Added frontend routes:

```txt
/daily       Daily issue archive
/archive     Alias for daily issue archive
/stocks      Stock story archive
/stocks/:symbol
/sectors     Sector archive
/sectors/:sectorSlug
/videos      YouTube/video package archive
```

These pages read generated archive JSON first and fall back to the latest issue if the archive files do not exist yet.

### 4. SEO sync on public daily page

The public daily page now syncs browser-level metadata from the generated issue payload:

```txt
document title
meta description
Open Graph title/description/type
Twitter card
canonical link
Article JSON-LD
Video JSON-LD foundation
```

This is a SPA-compatible SEO foundation. For stronger search indexing later, the same JSON can be used for SSR/static rendering.

### 5. Backend API archive routes

Added FastAPI routes:

```txt
GET /api/content/archive/daily
GET /api/content/archive/stocks
GET /api/content/archive/sectors
GET /api/content/archive/videos
GET /api/content/seo/daily/{business_date}
GET /api/content/sitemap.json
```

### 6. Daily issue schema update

Schema is now:

```txt
content-issue-v2-phase6
```

The issue includes:

```txt
seo
archive_entry
archive_foundation
```

## Preserved rules

Sector grouping still uses only existing databases:

```txt
equity_meta.sectorName → promoter_meta.sectorName → Unmapped
```

No extra sector mapping file was created.

HIDCLP remains correct:

```txt
HIDCLP → Investment
```

Index intelligence remains only context for index/sector movement. It is not used for sector membership.

## Tested result

Using uploaded databases:

```txt
analysis_2026_2026-05-06(5).sqlite
nepse_company_meta.sqlite
index_intelligence(1).sqlite
```

Generated:

```txt
frontend/public/content/daily/2026-05-06.json
frontend/public/content/latest.json
frontend/public/content/archive/daily.json
frontend/public/content/archive/stocks.json
frontend/public/content/archive/sectors.json
frontend/public/content/archive/videos.json
frontend/public/content/seo/daily/2026-05-06.json
frontend/public/content/seo/index.json
frontend/public/content/sitemap.json
```

Validation:

```txt
Business date: 2026-05-06
Buckets: 26,705
Trade Qty: 6,310,857
Sectors: 12
Analysis symbols: 269
Mapped symbols: 269
Unmapped symbols: 0
Promoter fallback: HIDCLP
Featured stock: SOHL
```

## What comes after Phase 6

The first implementation is now complete. Future optional improvements should be treated as new version work:

```txt
Phase 7 / v2: Static pre-rendering or SSR for stronger SEO
Phase 8 / v2: Multi-day generation batch
Phase 9 / v2: Member-only deeper stock evidence pages
Phase 10 / v2: YouTube publish integration
```
