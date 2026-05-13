# Phase 8 — Analytics & Reader Intelligence Report

## Purpose

Phase 8 adds privacy-safe reader analytics so the content website can answer:

- Which sectors readers open.
- Which stocks readers click.
- Which daily issue converts into YouTube interest.
- Which searches reveal future content demand.
- Which stocks should become future video candidates.

This does **not** replace market intelligence. It adds a second layer:

```txt
Market intelligence = what happened in NEPSE
Reader intelligence = what users cared about
```

## Added backend modules

```txt
backend/app/analytics/models.py
backend/app/analytics/store.py
backend/app/analytics/rollups.py
backend/app/analytics/insights.py
backend/app/analytics/routes.py
```

## Added backend routes

```txt
POST /api/analytics/event
POST /api/analytics/admin/event
GET  /api/analytics/health
GET  /api/analytics/daily/{business_date}
GET  /api/analytics/daily/{business_date}/funnel
GET  /api/analytics/daily/{business_date}/sectors
GET  /api/analytics/daily/{business_date}/stocks
GET  /api/analytics/daily/{business_date}/video
GET  /api/analytics/daily/{business_date}/search
GET  /api/analytics/daily/{business_date}/insights
GET  /api/analytics/admin/overview
GET  /api/analytics/admin/content-opportunities
```

## Analytics database

The database path is controlled by:

```bash
export CONTENT_ANALYTICS_DB_PATH="$TRUTH_ROOT/content_analytics/analytics.sqlite"
```

The analytics schema includes:

```txt
analytics_events
daily_issue_metrics
sector_interest_daily
stock_interest_daily
video_conversion_daily
search_terms_daily
admin_production_events
```

## Added frontend files

```txt
frontend/src/analytics/tracker.js
frontend/src/pages/AdminAnalytics.jsx
frontend/src/components/analytics/AnalyticsCards.jsx
```

## Added frontend routes

```txt
/admin/analytics
/admin/analytics/daily/YYYY-MM-DD
```

## Public page instrumentation

The public daily issue now tracks privacy-safe events such as:

```txt
daily_issue_viewed
market_summary_viewed
market_pulse_viewed
sector_board_viewed
sector_clicked
sector_search_used
sector_filter_used
sector_sort_used
stock_row_clicked
stock_search_used
stock_filter_used
stock_sort_used
featured_stock_viewed
video_block_viewed
youtube_clicked
method_note_opened
scroll_25 / scroll_50 / scroll_75 / scroll_100
reading_time_recorded
```

## Admin production instrumentation

The admin editor now tracks:

```txt
admin_daily_opened
admin_state_saved
admin_state_save_failed
youtube_package_copied
youtube_title_copied
youtube_description_copied
youtube_chapters_copied
pinned_comment_copied
```

## Admin analytics dashboard

The `/admin/analytics` dashboard shows:

- Issue views.
- Unique sessions.
- Sector clicks.
- Stock clicks.
- YouTube clicks.
- Average reading seconds.
- Daily funnel.
- Top sector interest.
- Top stock interest.
- Video conversion.
- Search demand.
- Content opportunity table.
- Human-readable insights.

## Privacy rule

Phase 8 intentionally tracks content behavior only. It does not track:

- Personal holdings.
- Broker accounts.
- Real identity.
- Keystrokes.
- Exact private location.
- Invasive fingerprinting.

It uses anonymous session IDs and aggregated interaction events.

## Preserved product rules

- Sector membership is still not manually maintained.
- Sector = `equity_meta.sectorName → promoter_meta.sectorName → Unmapped`.
- HIDCLP displays under Investment through promoter fallback.
- Index intelligence is movement/context only, not membership.
- Website summarizes; Truth Viewer / Order Flow Platform / video proves.
- Full numbers are shown; no 10k / 10.1M abbreviation.

## New validation script

```bash
./scripts/validate_analytics.sh
```

This inserts test events into a temporary analytics SQLite DB, rebuilds rollups, and verifies metrics, funnel, sector interest, stock interest, video conversion, and insights.
