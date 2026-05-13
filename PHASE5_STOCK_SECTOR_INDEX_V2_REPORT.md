# Phase 5 — Stock/Sector Content Index v2

Implemented:
- Stock Content Index v2 with market/index context strip.
- Top Gainers, Top Losers, Top Turnover, Top Volume, Top Activity/Buckets.
- Buy Aggressor Leaders, Sell Aggressor Leaders, Strong Buy Net, Strong Sell Net, Highest Ambiguity.
- Price × Flow classification: Healthy Upmove, Price Resilience, Clean Sell Pressure, Failed Buying.
- Main stock table now includes Close/LTP, Point Change, % Change, Turnover, Volume, Buckets, Buy/Sell/Net/Ambig, VWAP, Buy VWAP, Sell VWAP, Price × Flow, Evidence.
- Sector Content Index v2 with NEPSE/market context and sector count.
- Top Gaining/Losing Sectors, Top Turnover/Volume/Activity Sectors.
- Buy/Sell Aggressor sector leaders, net pressure sector leaders, highest ambiguity sectors.
- Sector Price × Flow classification: Healthy Sector Strength, Sector Resilience, Clean Sector Weakness, Failed Sector Buying.
- Sector cards route directly to `/sectors/<sector-slug>?date=<business-date>` so sector detail opens with stocks.

Verification:
- `npm run build` passed.
- `scripts/validate_bundle.sh` passed.
- `scripts/check_content_bundle.py` passed.
