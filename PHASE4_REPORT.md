# Phase 4 Report — Featured Stock + YouTube Production Block

## Purpose

Phase 4 turns the daily issue into a content-production workflow. The public page still teases instead of overloading, but the issue now contains a deterministic featured-stock candidate ranking and a complete YouTube production package.

## Added in Phase 4

### 1. Featured stock candidate engine

The daily payload now includes:

```json
"featured_candidates": []
```

Each candidate contains:

- `featured_score`
- `featured_rank_reason`
- `score_breakdown`
- `why_selected`
- `video_angle`
- `thumbnail_facts`
- `watch_next_session`

The scoring is deterministic and database-first. ChatGPT/narrative wording does not choose the stock blindly.

### 2. Score breakdown

The candidate score uses:

- turnover
- absolute net aggressor quantity
- absolute net aggressor amount
- bucket count
- confidence
- explainability
- sector importance
- imbalance percentage

The public UI displays the score but avoids turning the page into a heavy terminal.

### 3. Featured stock studio

New component:

```txt
frontend/src/components/FeaturedStockStudio.jsx
```

It includes:

- top candidate strip
- selected featured stock story
- featured score card
- score breakdown bars
- stock summary bar with VWAP and aggressor average price
- why selected list
- proof path for the video
- next-session watch list
- key on-screen numbers

### 4. YouTube production package v2

`youtube_package` now includes:

- title options
- thumbnail text options
- hook
- opening script
- chapters
- description
- pinned comment
- tags
- key on-screen numbers
- recording blueprint
- proof checklist
- thumbnail direction
- shorts clip ideas
- community post

### 5. Public video proof block

The public daily page shows the video block in reader mode. If no YouTube URL is attached yet, it shows a professional thumbnail-style placeholder and explains what the video will prove.

### 6. Admin editor enhancements

The admin editor now shows:

- featured candidate ranking table
- copy candidates JSON
- copy full video production text
- featured stock studio preview
- enhanced YouTube package copy tools

## Preserved rules

- No extra sector file.
- Sector grouping still uses `equity_meta.sectorName → promoter_meta.sectorName → Unmapped`.
- HIDCLP remains under Investment through promoter fallback.
- Index intelligence remains context only, not sector membership.
- Public site summarises; Truth Viewer / Order Flow Platform proves.

## Next phase

Phase 5 should focus on the admin editor as a real production cockpit:

- publish status
- editorial checklist
- video URL attach/update
- article copy states
- issue validation warnings
- export package buttons
- optional local JSON edit/save flow
