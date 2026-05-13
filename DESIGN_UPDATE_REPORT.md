# MTA Content Website Redesign Update

Base bundle: Archive(74).zip
Update date: 2026-05-08

## What changed

- Replaced the public header with the new **MTA bull/mountain logo** from `ChatGPT Image May 7, 2026 at 12_25_11 AM.png`.
- Redesigned the public **Home** page into a content-first NEPSE order-flow website:
  - dark premium MTA header
  - hero section with index context
  - five KPI cards: NEPSE Index, Buy Aggressor, Sell Aggressor, Ambiguity, Same-Broker Context
  - Today’s Market Story card
  - Sector Flow Map
  - Top Stocks by Order-Flow Strength
  - Quick Takeaways
  - Market Pulse
  - Learn / Daily Issue / Archive CTA strip
- Redesigned the public **Daily Issue** page:
  - editorial daily hero
  - NEPSE Index + flow relation card
  - sticky section tabs
  - 5 summary cards
  - market story chart
  - sector board with filters
  - stock battle table
  - What this means / Featured Story cards
- Kept the backend data structure and public content payload compatibility intact.
- Kept admin/backend routes intact; only public presentation components were redesigned.

## Main files changed

- `frontend/public/mta-logo.png`
- `frontend/src/components/Header.jsx`
- `frontend/src/pages/Home.jsx`
- `frontend/src/pages/DailyIssue.jsx`
- `frontend/src/styles.css`

## Verification

Frontend production build was tested successfully with:

```bash
cd frontend
npm install --no-audit --no-fund
npm run build
```

Build result: passed.

## Run

Use your existing script:

```bash
./scripts/run_all.sh
```

Or frontend only:

```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```
