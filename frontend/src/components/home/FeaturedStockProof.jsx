import React from 'react';
import { fmtRs, fmtPx, fmtInt, n, flowPillLabel, boardRead, sameBrokerLabel, setRoute } from './homeUtils.js';

export default function FeaturedStockProof({ issue }) {
  const stock = issue?.featured_stock || {};
  const sm = stock.summary || {};
  if (!stock.symbol) return null;
  const priceRow = {
    change_rs: sm.change_rs,
    change_pct: sm.change_pct,
    net_aggr_qty: sm.net_aggr_qty,
  };
  return <section className="featured-proof-section editorial-section" id="featured-proof">
    <div className="featured-proof-card">
      <div className="featured-proof-copy">
        <p className="editorial-kicker">D. Featured Stock Proof</p>
        <h2>{stock.symbol}</h2>
        <p>{stock.company_name || stock.security_name || stock.sector_name || 'Featured stock'} became the stock-level proof candidate because price action and reconstructed order flow made it worth opening in replay.</p>
        <div className="featured-actions">
          <button onClick={() => setRoute(`/stocks/${encodeURIComponent(stock.symbol)}${issue?.business_date ? `?date=${issue.business_date}` : ''}`)}>Open stock story →</button>
          <span>{stock.sector_name || 'Unmapped sector'}</span>
        </div>
      </div>
      <div className="featured-proof-metrics">
        <span><small>LTP</small><b>{fmtPx(sm.ltp_rs || sm.close_rs)}</b></span>
        <span><small>Change</small><b className={n(sm.change_rs) >= 0 ? 'buy' : 'sell'}>{n(sm.change_rs) >= 0 ? '+' : ''}{Number(sm.change_rs || 0).toFixed(2)} ({n(sm.change_pct) >= 0 ? '+' : ''}{Number(sm.change_pct || 0).toFixed(2)}%)</b></span>
        <span><small>Turnover</small><b>{fmtRs(sm.trade_amt_rs)}</b></span>
        <span><small>Volume</small><b>{fmtInt(sm.trade_qty)}</b></span>
        <span><small>Net Flow</small><b className={n(sm.net_aggr_qty) >= 0 ? 'buy' : 'sell'}>{flowPillLabel(sm)}</b></span>
        <span><small>Read</small><b>{boardRead(priceRow)}</b></span>
        {sameBrokerLabel(sm) && <span><small>Context</small><b>{sameBrokerLabel(sm)}</b></span>}
      </div>
    </div>
  </section>;
}
