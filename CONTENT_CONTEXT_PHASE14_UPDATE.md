# Content Context Phase 14 Update

Permanent rule for future work: the content website is an order-flow storytelling site, not a raw dashboard. Keep the normal market-board language that viewers know, but add order-flow explanation beside it.

Use the analysis database as the stock truth source. For each stock and date, use the last POST frame:

- Today LTP/close = `an_bucket_frames.ltp_scaled`
- Previous close = `an_bucket_frames.close_scaled`
- Day open/high/low/average = `open_scaled`/`high_scaled`/`low_scaled`/`avg_scaled`

Use `nepse_index_meta.json` for stock-to-sector/index membership. Use `index_analysis_2026.sqlite` only for index points and charts.

The new board page must remain first-class:

- Top Gainers
- Top Losers
- Top Turnover
- Top Volume
- Top Transactions
- View more from home
- Paginated full page
- Click stock rows into the stock page
- Always show an order-flow read/story hint beside the raw market-board metric.

## Phase 14L — Order-flow presentation charts

The content website now treats charting as presentation of order-flow concepts:

- Daily page: NEPSE index path + NEPSE cumulative turnover.
- Sector detail page: sector index path + sector cumulative turnover.
- Stock detail page: cumulative delta + cumulative volume.

Data-source rules:

- `index_analysis_2026.sqlite` is only for index/sector-index movement.
- `analysis_2026.sqlite` is the source for cumulative turnover, stock cumulative delta, cumulative volume and order-flow pressure.
- Stock cumulative delta is running `BUY_AGGRESSOR quantity - SELL_AGGRESSOR quantity` from `v_an_bucket_trade_roles`.
- Cumulative turnover is from analysis bucket/trade-role truth, not index DB.

Design rule: charts must explain participation and conviction for public content. Avoid dumping every indicator. One strong chart pair per detail page is preferred.
