# Phase 14O · Today Story Aggressor Amount Mix

## Purpose
This phase updates **A. Today's Market Story** so the hero presents the core order-flow amounts clearly:

- Buy aggressor amount
- Sell aggressor amount
- Ambiguous amount
- Net aggressor amount = Buy aggressor amount - Sell aggressor amount

## Main presentation change
The hero now includes a large donut-style composition panel inside the Today Market Story block:

- Green slice = Buy aggressor amount share
- Red slice = Sell aggressor amount share
- Amber slice = Ambiguous amount share
- Center label = Net aggressor amount and Buy-led / Sell-led verdict

This avoids the wrong design of putting Net as a pie slice. Net is shown as the result, not as another component of total turnover.

## Data fields used
From `market_summary` in the daily issue payload:

- `buy_aggr_amt_rs`
- `sell_aggr_amt_rs`
- `ambig_amt_rs`
- `net_aggr_amt_rs`

## Files changed

- `frontend/src/components/home/TodayMarketStory.jsx`
- `frontend/src/styles.css`

## Tests

- `npm run build`
- `python3 scripts/check_content_bundle.py frontend/public/content/daily/2026-05-13.json`

Both passed.
