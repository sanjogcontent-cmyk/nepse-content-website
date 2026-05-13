# Phase 11 — Content Writer Studio + Price/Flow Fact Lock

This update continues from the uploaded **Archive 2** base bundle.

## What changed

### 1. Admin Writer is now a real Content Writing Studio

Route:

```txt
/admin/writer
```

The Writer page now has:

- content operating-system guide,
- fact-lock preview,
- prompt-type cards,
- copyable ChatGPT prompts,
- article approval workflow,
- weekly prompt workflow.

Prompt types added:

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

### 2. ChatGPT prompts are now fact-locked

The prompt tells ChatGPT:

- use only supplied facts,
- do not invent missing data,
- do not give buy/sell recommendations,
- do not abbreviate full numbers,
- Buy/Sell means aggressor flow, not participant buyer/seller,
- website summarizes; video and Truth Viewer prove.

### 3. Stock-level price truth was added to generated content

For each stock summary, the generator can now add:

```txt
previous_close_rs
open_rs
high_rs
low_rs
close_rs
change_rs
change_pct
day_vwap_rs
```

Rules:

```txt
Previous Close = previous business day's final analysis close_scaled
Close = current day's last bucket POST-frame close_scaled
Open / High / Low / Day VWAP = actual matched bucket trades from v_an_bucket_trade_roles
```

### 4. Role VWAP facts were added

For each stock, the generator can now add:

```txt
buy_aggr_vwap_rs
sell_aggr_vwap_rs
ambig_vwap_rs
buy_aggr_actual_amt_rs
sell_aggr_actual_amt_rs
ambig_actual_amt_rs
```

These use actual row-level `v_an_bucket_trade_roles` amounts and quantities when that view exists.

### 5. Featured stock public card now shows better content facts

The public featured stock area now supports:

- Previous Close,
- Close,
- Change %,
- High,
- Low,
- Day VWAP,
- Buy Agg VWAP,
- Sell Agg VWAP,
- Ambig VWAP,
- Net Agg Amt.

### 6. SummaryBar now has clearer price truth

For stock summaries, it now shows:

```txt
Prev Close / Open / High / Low / Close / Change / Change % / Day VWAP
Buy Agg VWAP / Sell Agg VWAP / Ambig VWAP / Overall VWAP
```

## Tested

- Backend Python files compile.
- Frontend production build passes with Vite.
- Tested against uploaded subset analysis database for 2026-04-28.
- Verified generated stock facts for RSML:
  - previous close: Rs 4,220.00
  - open: Rs 4,225.00
  - high: Rs 4,270.00
  - low: Rs 3,981.00
  - close: Rs 4,239.00
  - day VWAP: Rs 4,074.76
  - Buy Agg VWAP: Rs 4,072.78
  - Sell Agg VWAP: Rs 4,076.21
  - Ambig VWAP: Rs 4,046.85

## How to use

```bash
cd "/Users/sanjoggautam/Desktop/sanjog codex/nepse_mta_content_engine_phase11_writer_studio_factlock_v1"
chmod +x scripts/*.sh
./scripts/run_sanjog_local.sh
```

Open:

```txt
http://127.0.0.1:5173/admin/writer
```

Best workflow:

```txt
1. Generate daily issue.
2. Open /admin/writer.
3. Pick the prompt type.
4. Copy prompt into ChatGPT.
5. Review output.
6. Paste approved article into the editor.
7. Approve article for public.
8. Use YouTube / Shorts / Social prompt outputs for content distribution.
```
