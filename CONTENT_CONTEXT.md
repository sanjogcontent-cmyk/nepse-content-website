# CONTENT_CONTEXT — NEPSE MTA Daily Publication System

## Product identity

This is a daily NEPSE order-flow publication website, not a full analysis terminal.

The public site should answer quickly:

1. What happened in the market today?
2. Which sectors mattered?
3. Which stock is the story of the day?
4. Why should the viewer watch the video?

The proof remains inside the existing NEPSE Truth Viewer / Order Flow Platform.

## Non-negotiable display rules

- Use full numbers. Never abbreviate as 10K, 1.2M, or 3.0B.
- Market and sector summaries do not show Agg Avg Px or VWAP.
- Stock summary can show Agg Avg Px and VWAP.
- Buy/Sell means aggressor flow, not participant buyer/seller.
- Agg Amt is proxy-allocated by aggressor-qty share inside each bucket.
- Evidence quality must be visible: Confidence, Explainability, Gap/Wipe/Lock flags.

## Database truth rules

- Analysis DB: bucket metrics, aggressor quantity, proxy amount, confidence, explainability, flags.
- Company Meta DB: sector and company identity.
- Index Intelligence DB: index close/movement context only.
- WS DB: later phase can use it for richer intraday visible state charts; Version 1 uses analysis intervals.

## Sector rule

Do not create extra sector mapping files.

Use:

```txt
nepse_index_meta.json membership → optional company-meta fallback → Unmapped
```

HIDCLP should display as Investment because promoter fallback gives Investment.

## Page flow

```txt
Hero thesis
Market summary
Market pulse
Sector board
Selected sector drilldown
Stocks inside selected sector
Selected stock teaser
Featured stock of the day
Written article
YouTube package
Method and trust note
```

## Content rule

The model writes language, not facts.

Facts must come from generated JSON.

## Brand tone

Serious, professional, data-first, not hype.

Use phrases like:

- bucket-level order-flow context
- aggressor flow
- sector pressure
- evidence quality
- watch the video for proof

Avoid:

- guaranteed signals
- buy/sell recommendations
- overconfident predictions
- financial advice

---

## Phase 2 public page context

This bundle starts from Phase 1 payload generation and upgrades the public daily page.

Important implementation choices:

- Public page is reader mode only. It does not expose copy buttons for YouTube content.
- Admin editor remains separate at `/admin/daily/:date`.
- `VideoPackage` now supports public mode: embedded YouTube video if a URL exists, otherwise a designed placeholder.
- Sector and stock state are deep-linkable through URL query parameters.
- No extra sector file is introduced. Sector identity remains from `nepse_index_meta.json`: index-meta sector membership first, optional company-meta fallback, then Unmapped.
- HIDCLP remains Investment through promoter fallback, not manual override.
- Full numbers remain mandatory: no 10k, no 10.1M.
- Market and sector summaries do not show VWAP / aggressor average price. Stock summaries do.

The page order is intentionally:

Market → Pulse → Sector Board → Sector Stocks → Featured Stock → Article → Video → Method.

This is designed for content publishing and YouTube conversion, not terminal-style research overload.

---

## Phase 3 sector interaction context

Phase 3 makes sector exploration feel like a publication workspace, not a raw terminal.

The public reader can now:

- search sectors,
- filter sectors by pressure and evidence,
- sort sectors by turnover, net pressure, buy/sell aggression, evidence, index movement, or active stock count,
- move previous/next between sectors,
- copy a deep link for the selected sector and stock,
- see leader cards inside a sector,
- search/filter/sort stocks inside the selected sector,
- click any stock to update the stock teaser.

The public page still must not become a full forensic analysis tool. The sector interaction should answer:

1. Which sector mattered?
2. Was that sector buy- or sell-aggressive?
3. Which stocks inside the sector carried the pressure?
4. Which stock should the video prove deeply?

The sector workspace should tease the reader and create a clear path to the YouTube video and Truth Viewer workflow.


## Current baseline after Phase 4

The latest baseline is `nepse_mta_content_engine_phase4_featured_youtube_v1`.

Important continuation rules:

1. Continue from this Phase 4 bundle, not older Phase 1/2/3 bundles.
2. Do not create a manual sector mapping file.
3. Sector membership comes from `nepse_index_meta.json` using nepse_index_meta.json membership with optional company-meta fallback.
4. HIDCLP should display under Investment because promoter fallback maps it there when equity sector is missing.
5. `index_intelligence.sqlite` is only index/sector movement context, not sector membership.
6. Public page should tease the story; deep proof belongs in video and Truth Viewer / Order Flow Platform.
7. Featured stock selection should remain deterministic from database score, while ChatGPT writes wording and packaging only.
8. YouTube package should be generated from the same daily issue payload.

Phase 5 should enhance `/admin/daily/:date` into a serious production cockpit.

## Phase 5 context update

The admin editor is now the operational control room. It should remain internal and focused on production, not public reading. Public page continues to tease and summarize. Admin page validates and prepares the issue for publishing.

Current baseline after this phase: `nepse_mta_content_engine_phase5_admin_editor_v1`.

Important preserved rule: do not create a separate sector map file. Sector membership must continue to come from `nepse_index_meta.json`: equity sector first, promoter sector fallback, then `Unmapped`. HIDCLP should display as Investment via promoter fallback.

---

## Phase 6 context update

The content engine now has a complete archive and SEO foundation.

The system writes generated archive files from the daily issue payload:

```txt
content/archive/daily.json
content/archive/stocks.json
content/archive/sectors.json
content/archive/videos.json
content/sitemap.json
content/seo/daily/YYYY-MM-DD.json
content/seo/index.json
```

The public site now includes archive routes:

```txt
/daily
/archive
/stocks
/stocks/:symbol
/sectors
/sectors/:sectorSlug
/videos
```

The SEO design is a SPA-compatible foundation. If stronger search indexing is needed later, use the same JSON payloads for static pre-rendering or server-side rendering.

Preserve the same core data rule in future versions:

```txt
Sector grouping = nepse_index_meta.json membership → optional company-meta fallback → Unmapped
Index intelligence = movement/context only, not membership
HIDCLP = Investment through promoter fallback
```

Current baseline:

```txt
nepse_mta_content_engine_phase6_archive_seo_v1
```

## Phase 7 baseline context

The latest baseline is `nepse_mta_content_engine_phase7_refinement_polish_v1`.

Continue from this baseline for future refinements. Do not restart from older phase bundles.

Strict preserved facts:

- Sector membership is not manually maintained.
- Use `nepse_index_meta.json` only for company/sector metadata.
- Sector resolution is index-meta sector membership first, optional company-meta fallback, then Unmapped.
- HIDCLP should display as Investment through promoter fallback when equity sector is empty.
- `index_intelligence.sqlite` is used only for index/sector movement context, not membership.
- Website is public publication layer.
- NEPSE Truth Viewer / Order Flow Platform / video is proof layer.
- Use full numbers, not abbreviated 10k / 10.1M formats.

---

## Phase 8 baseline context

The latest baseline is `nepse_mta_content_engine_phase8_analytics_reader_intelligence_v1`.

Phase 8 adds privacy-safe reader analytics. The goal is content intelligence, not user spying.

Preserve these rules in future work:

- Track anonymous content interaction signals only.
- Do not track personal holdings, broker accounts, keystrokes, or invasive identity fingerprints.
- Analytics should answer which sectors, stocks, issues, searches, and videos readers care about.
- Market intelligence remains database-first from analysis/WS/index/meta DBs.
- Reader intelligence is a second layer from website events.
- Best content candidate = strong order-flow evidence + strong reader demand.

Added analytics files:

```txt
backend/app/analytics/*
frontend/src/analytics/tracker.js
frontend/src/pages/AdminAnalytics.jsx
frontend/src/components/analytics/AnalyticsCards.jsx
```

Key admin route:

```txt
/admin/analytics
```

Key backend routes:

```txt
POST /api/analytics/event
GET /api/analytics/daily/{date}/funnel
GET /api/analytics/admin/content-opportunities
```

Strict preserved facts:

- Sector membership comes from `nepse_index_meta.json` only.
- Sector resolution is index-meta sector membership first, optional company-meta fallback, then Unmapped.
- HIDCLP should display as Investment through promoter fallback when equity sector is empty.
- `index_intelligence.sqlite` is movement/context only, not sector membership.

## Current baseline after audit fix

The latest baseline is `nepse_mta_content_engine_phase8_analytics_reader_intelligence_v1_checked`.

Important corrections from the audit pass:

1. Phase 8 is now the correct documented baseline in README.
2. Content opportunity scoring combines reader-interest analytics with order-flow evidence from the generated daily issue JSON.
3. Deep-link copy, stock teaser views, and admin copy actions are now tracked.
4. Sector source rule remains unchanged: `nepse_index_meta.json membership → optional company-meta fallback → Unmapped`.
5. HIDCLP remains Investment through promoter fallback.
6. Continue from this checked zip for any future refinements.

## Phase 9 context — public/admin separation

The public site must not expose admin content. Public daily pages show market summary, sector summary, stock summary, article, method note, and clean video embed/coming-soon block only.

Admin-only content includes candidate ranking, featured score breakdown, YouTube title options, thumbnail text options, opening hook, recording blueprint, proof checklist, raw JSON, copy buttons, validation internals, and analytics.

Full aggressor amount is important. Market, sector, stock, and archives must preserve:

- buy_aggr_qty
- sell_aggr_qty
- ambig_qty
- net_aggr_qty
- buy_aggr_amt_rs
- sell_aggr_amt_rs
- ambig_amt_rs
- net_aggr_amt_rs

Date routes must stay locked to their own JSON file. Never show latest content for an older `/daily/YYYY-MM-DD` route.

Phase 9 now writes public-safe JSON separately from admin JSON. Anything under `frontend/public/content/daily` must be reader-safe and must not contain featured candidates, validation internals, YouTube production packs, proof checklist, or analytics foundation. Full admin JSON is stored under `frontend/content_admin/daily` and loaded by the backend admin route.

## Phase 10 context

The user clarified that “index” means proper indexing of website and content, not NEPSE market index intelligence. Phase 10 therefore treats content indexes as first-class generated artifacts. Daily issues are indexed by date; weekly pages by ISO week; stocks by symbol; sectors by sector slug; videos by date/stock/sector; glossary terms by slug. ChatGPT prompts are generated from database facts and copied from the admin writer workflow, but public content requires review/approval.


## Phase 11 writer studio context

The latest baseline is `nepse_mta_content_engine_phase11_writer_studio_factlock_v1`. Continue from this baseline.

The app now treats content creation as:

```txt
Analysis database facts → fact-locked prompt → ChatGPT writing → human approval → public website
```

Prompt types inside `/admin/writer` are:

```txt
Daily Website Article
Featured Stock Story
YouTube Script
Shorts / TikTok Script
Titles + Thumbnail
Learn Explainer
Social Posts
Weekly Writer
```

Strict writing rule: ChatGPT writes language, structure, explanation, titles, and scripts. It must not invent facts or produce recommendations.

Stock price truth rules:

```txt
Previous Close = previous business day's final analysis close_scaled
Close = current day's last bucket POST-frame close_scaled
Open / High / Low / Day VWAP = actual matched bucket trades from v_an_bucket_trade_roles when available
Buy Agg VWAP / Sell Agg VWAP / Ambig VWAP = role amount / role quantity from row-level trade roles when available
```


## Phase 14B context update — sector parser and same-broker metric

Sector/index membership policy is now JSON-first, SQLite-fallback:
- `nepse_index_meta.json` is the first public sector/index constituent source.
- Only sector sub-index constituent lists assign sectors (`HYDPOWIND`, `MANPROCIND`, `BANKSUBIND`, etc.).
- Broad index groups (`NEPSE`, `FLOATIND`, `SENSIND`, `SENSFLTIND`) must not overwrite stock sector membership.
- `nepse_company_meta.sqlite` fills missing symbols and enriches names, especially promoter/non-standard symbols, but it must not override a valid JSON sector.
- `index_analysis_2026.sqlite` remains index chart/point context only, not stock sector truth.

Same-broker match is now part of the content payload. Definition: `buyer_member_id = seller_member_id` in `v_an_bucket_trade_roles`. Expose it as contextual evidence only, not an accusation: `same_broker_amt_rs`, `same_broker_qty`, `same_broker_trades`, `same_broker_turnover_pct`, and aliases used by UI cards. Home/Daily/Sector/Stock/Boards should show the metric when present and should no longer display “Not in payload” when the role view exists.

## Phase 14C context update — editorial home redesign

The home page is now an editorial market front page, not a raw terminal/table dump. Preserve this order in future updates:

1. A. Today’s Market Story — market verdict, flow split, top sector, featured stock proof, evidence and same-broker context.
2. B. Sector Flow Map — top sector cards ranked by turnover, with net-flow bias and lead stocks.
3. C. Market Boards — compact board cards for Top Gainers, Top Losers, Top Turnover, Top Volume, Top Transactions.
4. D. Featured Stock Proof — one strong stock-level proof card.
5. E. Story Archive — daily, sector, stock and video navigation.
6. F. Export-ready Social Studio — compact screenshot/print cards; no giant empty dark poster panels.

Market board rows must be compressed and readable: symbol/sector, key board values, one flow pill, one short read, and small muted same-broker context. Same-broker is contextual evidence only and must not dominate the visual story.

The full `/boards` page is now the exploration surface with board tabs, search, sector filter, page size, previous/next paging and stock click-through. Home should show only top five rows per board.

## Phase 14D — Sector/Stock presentation refinement
- Purpose: improve `/sectors/:sectorSlug` and `/stocks` presentation without changing data truth logic.
- Sector detail is now an editorial sector page: clean hero, index/turnover/flow KPIs, top turnover stocks, strongest pressure stocks, top movers/contradictions, same-broker context, archive sparkline, and a full searchable/paginated constituent board.
- Stock index is now a presentation-first stock board: market context hero, three story cards, five quick leadership cards, tabbed leadership board, behavior map, export block, and full stock table with search/filter/pagination.
- Information is preserved, but raw tables are moved into organized full-board sections instead of dominating the first screen.
- Same-broker remains context-only: amount/qty/trades/buckets or percentage, never framed as proof of manipulation.
- No backend truth changes: LTP/previous close still come from analysis DB last POST frame fields; sector mapping remains JSON-first with SQLite fallback; index DB remains index point/chart context.

## Phase 14F — Sector Pressure Amount Bars

The `/sectors` page and the home Sector Pressure Map now treat sector presentation as money-pressure, not quantity-first flow. Sector cards use buy aggressor amount, sell aggressor amount, and ambiguous amount with a stacked visual bar. Net quantity, shares traded, and transactions are secondary context only. Badge logic is amount-share based with MIXED used when buy/sell amount dominance is narrow, preventing contradictory labels. Full sector values remain available behind a full audit table drawer.

## Phase 14G — Daily Issue Presentation Redesign
- `/daily/YYYY-MM-DD` is now treated as a publication page, not a raw evidence table.
- Daily page flow is: hero market verdict → sticky section nav → A. Today’s Market Story → B. Sector Pressure Map → C. Market Boards → D. Featured Stock Proof → E. Public article / method → F. Export-ready social cards.
- Market, sector, and stock pressure visuals use amount-based buy aggressor / sell aggressor / ambiguous bars. Quantity remains secondary and is not the main presentation layer.
- Same-broker context remains small/contextual and must not dominate the first read.
- Social cards are compact, light, screenshot/print-ready blocks; no giant dark empty poster panels.

## Phase 14H — Stock Detail Presentation Redesign
- `/stocks/:symbol?date=YYYY-MM-DD` is now a stock proof page, not a raw data dump.
- Preserve this stock page flow: breadcrumb/navigation → stock hero verdict → price truth card → amount-based money pressure card → stock proof card → same-broker context → archive/history → sector context → presentation cues → optional technical evidence drawer.
- Primary stock story uses amount-based pressure: `buy_aggr_amt_rs`, `sell_aggr_amt_rs`, `ambig_amt_rs`, and `net_aggr_amt_rs`. Net quantity is secondary only.
- Price truth remains last POST-frame truth: `ltp_rs/close_rs` = today LTP/close, `previous_close_rs` = previous close, `open_rs/high_rs/low_rs/day_vwap_rs` = day fields from analysis truth.
- Same-broker remains small contextual evidence: amount, turnover %, qty, trades, buckets. It must never be presented as manipulation proof.
- Full technical fields remain available behind the drawer so presentation stays clean while preserving detail.

## Phase 14J — Index chart experiment

Index/sector charting is now supported, but it must remain presentation-safe. The charting source is `INDEX_DB_PATH`, normally `/Volumes/SANJOG DRIVE/untitled folder/truth/index_analysis/index_analysis_2026.sqlite`. The content builder attaches it as `idx` and samples `v_idx_ticks` into compact chart paths under `market_index.chart` and each `sector.index.chart`. Do not use index DB to determine sector membership; membership remains `nepse_index_meta.json` first and company-meta fallback only. Home gets only a small NEPSE pulse; daily issue gets one full NEPSE chart; sector detail gets one full sector-index chart; `/sectors` gets only compact sparklines so amount-pressure presentation remains dominant.

## Phase 14K — Detailed / Scaled Index Chart Presentation

Index chart experiment has been refined from simple sparkline to detailed scaled presentation. `IndexChart` now supports axis labels, time labels, previous-close reference line, open/high/low/close markers, scale controls (`Auto detail`, `Full range`, `Prev-close centered`), and detail stats. Keep chart data source rules unchanged: index/sector-index movement from `index_analysis_2026.sqlite`, sector membership from `nepse_index_meta.json`, and stock/order-flow truth from `analysis_2026.sqlite`. Continue using full detailed charts only on daily and sector detail pages; use compact sparklines on home/sector cards to avoid visual noise.

## Phase 14M continuation note

Phase 14M uses the uploaded `Archive(125).zip` as baseline. The content site is now explicitly order-flow-first: daily pages show a market cumulative net aggressor amount chart immediately under the hero; stock pages show cumulative net amount and cumulative delta proof; sector detail board headers are sortable/clickable; Cloudflare tunnel sharing is supported via `./scripts/run_sanjog_cloudflare.sh` or `./run_cloudflare.sh`, and the public URL is printed plus saved to `logs/public_url.txt`.
