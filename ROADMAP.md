# ROADMAP — NEPSE MTA Content Website

## Version 1 — Implemented in this bundle

### Phase 1 — Daily payload generator

Creates deterministic JSON from:

- `analysis_2026.sqlite`
- `nepse_company_meta.sqlite`
- optional `index_intelligence.sqlite`

Output:

```txt
frontend/public/content/latest.json
frontend/public/content/daily/YYYY-MM-DD.json
```

### Phase 2 — Public daily page

Route:

```txt
/daily/YYYY-MM-DD
```

Renders:

- hero thesis
- market summary
- market pulse
- sector contribution
- article flow
- method block

### Phase 3 — Sector interaction

Implemented:

- sector tiles
- selected sector summary
- sector index close context when available
- sortable stocks inside sector
- stock teaser panel

### Phase 4 — Featured stock + YouTube block

Implemented:

- deterministic featured stock score
- featured stock summary
- why selected list
- YouTube title options
- thumbnail text options
- hook
- chapters
- description
- pinned comment

### Phase 5 — Admin editor

Implemented route:

```txt
/admin/daily/YYYY-MM-DD
```

Includes:

- validation check
- metadata mapping check
- promoter fallback count
- article copy
- YouTube package copy
- raw JSON copy
- sector review

### Phase 6 — Archive and SEO foundation

Implemented:

- `/daily` archive route
- clean daily URL structure
- JSON payload structure ready for Article/Video metadata expansion

## Version 1 skips intentionally

- Admin login
- YouTube API upload
- CMS publishing workflow
- member-only paywall
- direct replay embed
- full stock/sector historical archive listing

## Next implementation sequence

### Version 2 — Real publishing workflow

- Save edited article version.
- Add YouTube URL after upload.
- Mark status: Draft / Ready / Published.
- Export markdown article.
- Generate social post text.

### Version 3 — WS and chart expansion

- Use WS DB for visible-depth intraday pulse.
- Add best bid/ask pressure chart.
- Add gap-aware chart markers.
- Add stock mini intraday chart from WS/analysis.

### Version 4 — Archive intelligence

- Browse by date.
- Browse by sector.
- Browse by featured stock.
- Browse by market bias.
- Add sitemap and SEO metadata generator.

### Version 5 — Video integration

- Paste YouTube ID in admin.
- Render embedded video on public issue.
- Add VideoObject metadata.
- Add chapter/timestamp export.

### Version 6 — Deep app linking

- Buttons from public page to Truth Viewer state.
- Open featured stock in Order Flow Platform.
- Open selected bucket time range in replay.

## Core rule forever

Website summarises. App/video proves.

---

## Phase 2 update — Public Daily Page

Status: implemented in `nepse_mta_content_engine_phase2_public_daily_page_v1`.

The public daily page now focuses on reader mode:

1. Hero thesis and at-a-glance market summary.
2. Sticky scope navigation: date, market, pulse, sectors, stocks, featured stock, article, video, method.
3. Whole-market summary using full numbers, no abbreviations.
4. Market pulse chart and sector contribution chart.
5. Sector board with clickable tiles.
6. Deep-linked sector and stock state using query parameters:
   - `/daily/2026-05-06?sector=Hydro%20Power`
   - `/daily/2026-05-06?sector=Hydro%20Power&symbol=SOHL`
7. Selected sector drilldown with sector summary, market share, and index intelligence when available.
8. Stock table and stock teaser panel.
9. Featured stock block after market and sector context.
10. Public video proof block. It shows an embedded YouTube iframe if `youtube_url` exists in the payload; otherwise it shows a professional video placeholder and package preview.
11. Article flow remains concise: market, sectors, featured stock, video bridge.
12. Method and trust boundary remain visible.

Phase 2 keeps the rule: the website summarises and teases; the Truth Viewer / Order Flow Platform / video proves.

Next step: Phase 3 should polish sector interaction further with search/filter controls, sector share ranking, and better stock teaser charts.

---

## Phase 3 update — Sector Interaction

Status: implemented in `nepse_mta_content_engine_phase3_sector_interaction_v1`.

This phase upgrades the public daily page sector experience without changing database truth rules.

Implemented:

1. Sector board search by sector name.
2. Sector board filters for buy pressure, sell pressure, mixed, and evidence quality.
3. Sector board sorting by trade amount, absolute net pressure, buy aggression, sell aggression, evidence quality, index movement, and active stock count.
4. Sector turnover-share bar using full market turnover.
5. Sector evidence/stat strip so the reader sees how many sectors are buy/sell dominated.
6. Sector command bar with previous/next sector navigation and deep-link copy.
7. Sector workspace tabs: Overview, Leaders, Stocks, Stock teaser.
8. Sector leader cards: top turnover, strongest buy net, strongest sell net, and largest imbalance.
9. Stock table search, bias filter, evidence filter, quick sort chips, sticky rank/symbol columns, and full-number display.
10. Stock teaser remains summary-first and sends the reader to video proof instead of overloading the public website.

Still preserved:

- No extra sector mapping file.
- HIDCLP remains Investment through promoter fallback.
- Index intelligence is context only, not sector membership.
- Market and sector summaries do not show VWAP or aggressor average price.
- Stock summary can show VWAP and proxy average prices.

Next step: Phase 4 should deepen the Featured Stock + YouTube block with a stronger editorial story card, featured-score transparency, YouTube package layout, thumbnail-preview system, and video production checklist.


## Phase 4 — Featured Stock + YouTube Block — COMPLETED

Implemented from the Phase 3 baseline.

Added:
- deterministic featured stock candidate ranking
- transparent featured score breakdown
- why-selected explanation
- video angle and proof path
- key on-screen numbers
- enhanced YouTube package with titles, thumbnail text, hook, opening script, chapters, description, pinned comment, tags, recording blueprint, proof checklist, shorts ideas, and community post
- public Featured Stock Studio
- enhanced admin candidate review

Next:
Phase 5 — Admin editor production cockpit.

## Phase 5 — Admin Editor — Completed

The internal editor at `/admin/daily/:date` now supports the production workflow: validation, readiness checks, featured candidate review, copy center, YouTube URL/status, local/remote save, and sector review.

## Next: Phase 6 — Archive / SEO Foundation

Build public archive and metadata foundations: `/daily` archive cards, SEO-ready issue metadata, article/video metadata JSON, stock/sector archive foundations, and sitemap-style JSON output.

---

## Phase 6 — Archive / SEO Foundation — Completed

Phase 6 completes the first complete implementation of the content website foundation.

Completed items:

```txt
/daily archive route
/archive alias
/stocks stock-story archive
/stocks/:symbol stock history foundation
/sectors sector archive
/sectors/:sectorSlug sector history foundation
/videos YouTube/video package archive
SEO object inside every daily issue
Article JSON-LD foundation
Video JSON-LD foundation
Open Graph/Twitter metadata foundation
sitemap-style JSON output
archive JSON outputs
```

Current baseline after this phase:

```txt
nepse_mta_content_engine_phase6_archive_seo_v1
```

The first implementation is now complete from Phase 1 through Phase 6.

## Phase 7 — Refinement and Polish ✅

Purpose: make the completed Phase 1–6 product feel production-ready and easier to operate.

Completed:

- Reading progress and better page flow.
- Reader command deck.
- Data-quality ribbon.
- Story tension strip connecting market, sector, and stock.
- Public purpose note: website summarises, video/tools prove.
- Empty/loading state polish.
- Accessibility polish: skip link, focus outlines, aria navigation labels.
- Header active-route polish.
- Backend production-polish endpoint.
- Bundle validation scripts.

Next optional work after Phase 7:

- User login / private admin protection.
- Real CMS persistence or database-backed publishing state.
- Automatic YouTube API integration.
- Multi-day comparison content.
- Generated thumbnails / image assets.
- Deployment hardening.

---

## Phase 8 — Analytics & Reader Intelligence ✅

Purpose: understand what readers care about and turn content interaction into future video/content decisions.

Completed:

- Privacy-safe frontend event tracker.
- Analytics SQLite database schema.
- Backend analytics event endpoint.
- Daily rollup system.
- Daily content funnel.
- Sector interest analytics.
- Stock interest analytics.
- Video conversion analytics.
- Search analytics foundation.
- Admin production analytics foundation.
- `/admin/analytics` dashboard.
- Human-readable insight generator.
- Content opportunity table.
- Privacy note in footer/dashboard.
- `validate_analytics.sh` script.

Current baseline:

```txt
nepse_mta_content_engine_phase8_analytics_reader_intelligence_v1
```

Future optional work:

- Join content opportunity score directly with generated stock order-flow evidence across multiple dates.
- Multi-day reader trend comparison.
- Export analytics reports as CSV/PDF.
- Cloud deployment with persistent analytics DB.
- Privacy policy page.
- Admin authentication.

## Phase 8 audit-fix baseline — CHECKED

Status: implemented in `nepse_mta_content_engine_phase8_analytics_reader_intelligence_v1_checked`.

This audit-fix pass keeps the Phase 8 product scope but corrects missing/polish issues found after inspecting the bundle:

- README and run examples now identify the correct Phase 8 baseline.
- Content opportunity scoring now joins reader demand with generated daily issue stock evidence when available.
- Sector and stock deep-link copy events are tracked.
- Stock teaser views are tracked.
- Admin copy actions are tracked for production analytics.
- Frontend production build, backend compile, analytics validation, and bundle validation passed after fixes.

Next work should continue from the checked Phase 8 baseline, not the earlier un-audited Phase 8 zip.

## Phase 9 — Public/Admin Separation + Publishing Hardening ✅

Phase 9 corrected the content product boundary:

- public website is a clean reader-facing daily publication,
- admin editor keeps internal scoring/production tools,
- analytics remains admin-only,
- daily routes are date-locked,
- full Buy/Sell aggressor quantity and amount remain visible in summaries and archives.

Next possible work: Phase 10 can focus on article editing/publish approval workflow, multi-day archive indexing, and optional Cloudflare deployment packaging.

## Phase 10 — Content Indexing + Writer Workflow ✅

Completed proper website indexing: daily, weekly, stocks, sectors, videos, articles, glossary, search, and sitemap. Added weekly route and admin writer workflow for ChatGPT-assisted article production. Archive pages now default to latest date to avoid accidental date mixing, with all-history view explicit.
