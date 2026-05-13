import React from 'react';
import SummaryBar from './SummaryBar.jsx';
import { EvidenceBadge } from './Numbers.jsx';
import { fmtInt, fmtRs, fmtPct, fmtPx, toneFromNumber } from '../utils.js';

function stockThesis(stock) {
  if (!stock) return '';
  const sm = stock.summary || {};
  const side = Number(sm.net_aggr_qty || 0) >= 0 ? 'buy-aggressive pressure' : 'sell-aggressive pressure';
  return `${stock.symbol} stood out with ${side}, net aggressor quantity of ${fmtInt(sm.net_aggr_qty)}, net proxy aggressor amount of ${fmtRs(sm.net_aggr_amt_rs)}, confidence ${fmtPct(sm.confidence_pct)}, and explainability ${fmtPct(sm.explainability_pct)}.`;
}

export default function PublicFeaturedStock({ stock }) {
  if (!stock) return null;
  const sm = stock.summary || {};
  return (
    <section className="public-featured-stock" id="featured">
      <div className="public-featured-layout">
        <article className="panel public-featured-card">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Featured stock of the day</p>
              <h2>{stock.symbol} — {stock.company_name || stock.security_name}</h2>
              <p className="featured-lead">{stockThesis(stock)}</p>
            </div>
            <EvidenceBadge label={sm.evidence_label} />
          </div>
          <div className="public-featured-metrics extended">
            <span>Sector <b>{stock.sector_name}</b></span>
            <span>Prev Close <b>{fmtPx(sm.previous_close_rs)}</b></span>
            <span>Close <b>{fmtPx(sm.close_rs)}</b></span>
            <span>Change % <b className={toneFromNumber(sm.change_pct)}>{fmtPct(sm.change_pct)}</b></span>
            <span>High <b>{fmtPx(sm.high_rs)}</b></span>
            <span>Low <b>{fmtPx(sm.low_rs)}</b></span>
            <span>Day VWAP <b>{fmtPx(sm.day_vwap_rs || sm.vwap_rs)}</b></span>
            <span>Trade Qty <b>{fmtInt(sm.trade_qty)}</b></span>
            <span>Buy Agg VWAP <b className="buy">{fmtPx(sm.buy_aggr_vwap_rs || sm.buy_aggr_avg_px_rs)}</b></span>
            <span>Sell Agg VWAP <b className="sell">{fmtPx(sm.sell_aggr_vwap_rs || sm.sell_aggr_avg_px_rs)}</b></span>
            <span>Ambig VWAP <b>{fmtPx(sm.ambig_vwap_rs || sm.ambig_avg_px_rs)}</b></span>
            <span>Net Agg Amt <b className={Number(sm.net_aggr_amt_rs || 0) >= 0 ? 'buy' : 'sell'}>{fmtRs(sm.net_aggr_amt_rs)}</b></span>
          </div>
          <h3>Why it matters today</h3>
          <p>This stock is highlighted because it combines market activity, sector context, full-number aggressor flow, and usable evidence quality. The public page gives the summary only; the detailed proof belongs in your video and analysis platform.</p>
          <ul className="public-watch-list">
            <li>Check whether the same aggressor side continues next session.</li>
            <li>Watch whether price follows the pressure or absorbs it.</li>
            <li>Use the video to inspect bucket flow, broker role, and PRE → POST behavior.</li>
          </ul>
        </article>
        <SummaryBar title={`${stock.symbol} public stock summary`} summary={stock.summary} scope="stock" showPrices />
      </div>
    </section>
  );
}
