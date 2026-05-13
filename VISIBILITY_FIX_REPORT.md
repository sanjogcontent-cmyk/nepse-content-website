# NEPSE MTA Content Website Visibility Fix v3

Implemented correction pass based on user feedback and uploaded plan.

## Public presentation fixes
- Replaced washed-out pale/foggy visual treatment with higher-contrast editorial cards.
- Restored MTA bull/mountain logo as the header/footer logo.
- Added real cover artwork asset for the hero instead of faded watermark logo treatment.
- Rebuilt Home page presentation flow: hero → KPI strip → market story + sector map → full-width top stocks → takeaways/market pulse → learn/archive actions.
- Rebuilt Daily Issue flow: story header → index context → KPI strip → market story + sector board → full-width top stocks → meaning + featured story.
- Removed fake/generic sparklines from KPI and sector cards; visual charts now use actual current payload composition only.
- Marked Same-Broker as “Not in payload” when no buyer=seller broker metric is available instead of showing fake values.
- Fixed Top Stocks clipping by making it full-width and scroll-safe.
- Fixed squeezed “What this means” / Featured Story by giving them a two-column section that stacks on small screens.
- Improved Stock Content Index and Archive contrast: stronger headers, real table contrast, visible filter bars, zebra rows, sticky table headers.

## Data-truth rules applied
- Donut charts are based on real Buy Aggressor / Sell Aggressor / Ambiguous amounts from the issue payload.
- Mini trend lines were removed unless real timeseries is available.
- Same-broker is not invented; it displays only if payload contains a same-broker turnover field.

## Verification
- Frontend build verified with: `npm run build`.
