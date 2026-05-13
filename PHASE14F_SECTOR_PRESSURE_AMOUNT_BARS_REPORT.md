# Phase 14F — Sector Pressure Amount Bars

## Purpose

This update fixes the sector presentation logic. A sector is now presented primarily as money-pressure:

- Buy aggressor amount
- Sell aggressor amount
- Ambiguous amount
- Total sector turnover
- Lead stocks
- Secondary context only after the pressure story

The page no longer leads with net quantity, shares traded, or transactions.

## Updated pages/components

- `frontend/src/pages/SectorArchive.jsx`
- `frontend/src/components/home/SectorFlowMap.jsx`
- `frontend/src/components/sectors/sectorPressureUtils.js`
- `frontend/src/components/sectors/SectorPressureBar.jsx`
- `frontend/src/components/sectors/SectorPressureBadge.jsx`
- `frontend/src/components/sectors/SectorLeadStocks.jsx`
- `frontend/src/styles.css`

## Presentation behavior

`/sectors` now displays:

1. Sector Pressure Map hero
2. Leader strip for largest footprint, strongest buy pressure, strongest sell pressure, highest ambiguity
3. Search + sort + filter controls
4. Visual sector cards with stacked buy/sell/ambig amount bars
5. Full audit table hidden behind a button

## Card logic

Each sector card shows:

- Sector name + index code
- BUY-LED / SELL-LED / MIXED badge from amount share, not quantity
- Total sector turnover
- Stacked pressure bar:
  - green = buy aggressor amount
  - red = sell aggressor amount
  - gray = ambiguous amount
- Buy/Sell/Ambig amount labels and percentage shares
- One short interpretation line
- Lead stock chips
- Secondary row: shares, transactions, index %, same-broker %

## Badge logic

The badge uses buy/sell amount share:

- `BUY-LED`: buy amount clearly greater than sell amount
- `SELL-LED`: sell amount clearly greater than buy amount
- `MIXED`: buy and sell amount shares are within 5 percentage points, or ambiguity is high and dominance is narrow
- `LOW DATA`: no usable amount total

This prevents confusing cards such as “BUY-LED” while the visible flow line says sell-led.

## Home page sector section

The home Sector Pressure Map now also uses amount bars and compact buy/sell/ambig amount labels. Quantity and transaction counts are demoted to secondary context.

## Truth policy preserved

- Sectors still come from sector/index metadata mapping.
- Price and board truth still come from the analysis database last POST / bucket truth.
- Same-broker remains contextual only, not accusatory evidence.
- No raw-data truth was removed; the full audit table remains available.

## Validation

- `npm run build` passed.
- `python3 scripts/check_content_bundle.py frontend/public/content/daily/2026-05-13.json` passed.
