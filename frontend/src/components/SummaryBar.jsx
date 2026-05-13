import React from 'react';
import { NumberValue, EvidenceBadge } from './Numbers.jsx';
import { fmtInt, fmtRs, fmtPct, fmtPx } from '../utils.js';

function FlowLine({ label, buy, sell, ambig, net, money = false }) {
  return (
    <div className="flow-line">
      <div className="flow-title">{label}</div>
      <div className="flow-items">
        <span className="buy">B {money ? fmtRs(buy) : fmtInt(buy)}</span>
        <span className="sell">S {money ? fmtRs(sell) : fmtInt(sell)}</span>
        <span className="ambig">A {money ? fmtRs(ambig) : fmtInt(ambig)}</span>
        <span className={Number(net || 0) >= 0 ? 'buy' : 'sell'}>Net {money ? fmtRs(net) : fmtInt(net)}</span>
      </div>
    </div>
  );
}

export default function SummaryBar({ title, summary, scope = 'market', showPrices = false }) {
  if (!summary) return null;
  return (
    <section className={`summary-card scope-${scope}`}>
      <div className="summary-head">
        <div>
          <p className="eyebrow">{scope} summary</p>
          <h2>{title}</h2>
        </div>
        <EvidenceBadge label={summary.evidence_label} />
      </div>
      <div className="summary-grid">
        <NumberValue label="Buckets" value={summary.buckets} />
        <NumberValue label="Matched / Pending" value={`${fmtInt(summary.matched_buckets)} / ${fmtInt(summary.pending_buckets)}`} type="raw" />
        <NumberValue label="Trade Qty" value={summary.trade_qty} />
        <NumberValue label="Trade Amt" value={summary.trade_amt_rs} type="rs" />
        <NumberValue label="Confidence" value={summary.confidence_pct} type="pct" tone="buy" />
        <NumberValue label="Explainability" value={summary.explainability_pct} type="pct" tone="buy" />
      </div>
      <div className="flow-box">
        <FlowLine label="Agg Qty" buy={summary.buy_aggr_qty} sell={summary.sell_aggr_qty} ambig={summary.ambig_qty} net={summary.net_aggr_qty} />
        <FlowLine label="Agg Amt, proxy" buy={summary.buy_aggr_amt_rs} sell={summary.sell_aggr_amt_rs} ambig={summary.ambig_amt_rs} net={summary.net_aggr_amt_rs} money />
      </div>
      <div className="flag-row">
        <span>Gap {fmtInt(summary.gap_count)}</span>
        <span>Wipe {fmtInt(summary.wipe_count)}</span>
        <span>Lock U/L {fmtInt(summary.upper_lock_count)} / {fmtInt(summary.lower_lock_count)}</span>
      </div>
      {showPrices && (
        <>
          <div className="price-row ohlc">
            <span>Prev Close {fmtPx(summary.previous_close_rs)}</span>
            <span>Open {fmtPx(summary.open_rs)}</span>
            <span>High {fmtPx(summary.high_rs)}</span>
            <span>Low {fmtPx(summary.low_rs)}</span>
            <span>Close {fmtPx(summary.close_rs)}</span>
            <span>Change {fmtPx(summary.change_rs)}</span>
            <span>Change % {fmtPct(summary.change_pct)}</span>
            <span>Day VWAP {fmtPx(summary.day_vwap_rs || summary.vwap_rs)}</span>
          </div>
          <div className="price-row vwap-truth">
            <span>Buy Agg VWAP {fmtPx(summary.buy_aggr_vwap_rs || summary.buy_aggr_avg_px_rs)}</span>
            <span>Sell Agg VWAP {fmtPx(summary.sell_aggr_vwap_rs || summary.sell_aggr_avg_px_rs)}</span>
            <span>Ambig VWAP {fmtPx(summary.ambig_vwap_rs || summary.ambig_avg_px_rs)}</span>
            <span>Overall VWAP {fmtPx(summary.day_vwap_rs || summary.vwap_rs)}</span>
          </div>
        </>
      )}
      <p className="method-note">Buy/Sell = aggressor flow, not participant buyer/seller. Agg Amt is proxy-allocated from bucket turnover by aggressor-qty share; stock VWAP facts use actual trade-role rows when available.</p>
    </section>
  );
}
