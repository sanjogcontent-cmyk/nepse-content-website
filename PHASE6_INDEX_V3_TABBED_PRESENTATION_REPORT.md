# Phase 6 — Stock/Sector Content Index v3 Tabbed Presentation

## Goal
Keep the same leaderboard content but reduce page length and improve presentation power.

## Implemented

### Stock Content Index v3
- Replaced many always-visible Top 5 sections with one compact `Stock Leaderboard` module.
- Added main tabs:
  - Price
  - Turnover / Volume
  - Activity
  - Aggressor Flow
  - Price × Flow
- Added nested tabs inside Aggressor Flow:
  - Buy Agg
  - Sell Agg
  - Strong Buy Net
  - Strong Sell Net
  - Ambiguity
- Added compact Price × Flow behavior cards:
  - Healthy Upmove
  - Price Resilience
  - Clean Sell Pressure
  - Failed Buying
- Added export-ready content cards for:
  - Top Gainers with Flow Context
  - Top Turnover with Flow Context
- Moved the large stock table behind a Show/Hide Full Table button.

### Sector Content Index v3
- Replaced many always-visible Top 5 sector blocks with one compact `Sector Leaderboard` module.
- Added main tabs:
  - Price
  - Turnover / Volume
  - Activity
  - Aggressor Flow
  - Price × Flow
- Added nested tabs inside Aggressor Flow:
  - Buy Agg
  - Sell Agg
  - Strong Buy Net
  - Strong Sell Net
  - Ambiguity
- Added compact sector behavior cards:
  - Healthy Sector Strength
  - Sector Resilience
  - Clean Sector Weakness
  - Failed Sector Buying
- Added export-ready content cards for:
  - Top Sector Strength
  - Top Sector Turnover
- Moved the large sector table behind a Show/Hide Full Table button.

## Design result
- Same information retained.
- Much less vertical scrolling.
- Stronger public content presentation.
- Easier to understand for users: one page, one story, many views through tabs.

## Verification
- `npm run build` passed.
- `scripts/check_content_bundle.py` passed.
