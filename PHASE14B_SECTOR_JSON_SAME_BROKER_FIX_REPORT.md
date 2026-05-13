# Phase 14B — Sector JSON parser + same-broker metric fix

## What was fixed

1. **Sector/index constituent mapping**
   - Fixed the JSON parser for `nepse_index_meta.json`.
   - The previous generic walker could incorrectly treat the structural key `constituents` as a sector name.
   - Broad index groups such as `NEPSE`, `FLOATIND`, `SENSIND`, and `SENSFLTIND` are now ignored for sector assignment so they cannot overwrite real sector sub-index membership.
   - Sector assignment now comes from sector sub-index objects such as `HYDPOWIND`, `MANPROCIND`, `BANKSUBIND`, etc.

2. **JSON-first + SQLite fallback metadata policy**
   - `nepse_index_meta.json` remains the first source for public sector/index constituent membership.
   - `nepse_company_meta.sqlite` is now used as fallback/enrichment for symbols missing from the JSON, especially promoter/non-standard symbols.
   - JSON sector membership is never overwritten by SQLite fallback when the JSON already maps a symbol.

3. **Same-broker match metric**
   - Added buyer=seller broker metric from `v_an_bucket_trade_roles`:
     - `same_broker_amt_rs`
     - `same_broker_matched_amt_rs`
     - `same_broker_turnover_rs`
     - `same_broker_qty`
     - `same_broker_trades`
     - `same_broker_match_count`
     - `same_broker_buckets`
     - `same_broker_turnover_pct`
     - `same_broker_qty_pct`
   - Metric definition: `buyer_member_id = seller_member_id` for the same trade row.
   - Important content rule: this is a context/evidence metric only, not proof of wash trading or coordination.

4. **UI exposure**
   - Home and Daily issue Same-Broker cards now receive real payload values.
   - Stock detail and Sector detail Same-Broker visuals now show real values instead of “Not in payload”.
   - Market Boards order-flow read now includes a same-broker line when available.

## Validation using uploaded 2026-05-13 databases

- Analysis symbols: 271
- Mapped symbols in generated issue: 271
- Unmapped symbols: 0
- Market same-broker turnover: Rs 109,404,706.50
- Market same-broker quantity: 161,498 shares
- Market same-broker trades: 1,261
- Same-broker turnover share: 3.91%

Example checks:

- SYPNL → Manufacturing And Processing; LTP 1,558.90; previous close 1,490.00; same-broker Rs 4,092,794.00.
- AHL → Hydro Power; same-broker Rs 3,904,639.00.
- JHAPA → Others; same-broker Rs 3,366,720.00.
- HIDCLP → Investment via company-meta fallback.

## Metadata source decision

Best production rule:

- Use `nepse_index_meta.json` first for sector/index constituent membership because it directly mirrors NEPSE index groups and constituent lists.
- Use `nepse_company_meta.sqlite` second for richer company metadata and for symbols that do not appear in the index JSON.
- Use `index_analysis_2026.sqlite` for index point/chart movement only, not for assigning stock sectors.
