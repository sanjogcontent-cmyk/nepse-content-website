import React from 'react';
import { fmtRs, fmtPx, fmtInt, flowShares, safeArr, n, biasWord, biasTone, flowPillLabel, boardRead } from './homeUtils.js';

function ExportCard({ eyebrow, title, children, footer }) {
  return <article className="export-card-clean">
    <p>{eyebrow}</p>
    <h3>{title}</h3>
    <div className="export-card-body">{children}</div>
    <footer>{footer || 'Nepse_Master_Trade & Analysis · Educational only'}</footer>
  </article>;
}

export default function SocialExportStudio({ issue }) {
  const market = issue?.market_summary || {};
  const shares = flowShares(market, 'amount');
  const sectors = safeArr(issue?.sectors).slice().sort((a, b) => n(b.summary?.trade_amt_rs) - n(a.summary?.trade_amt_rs));
  const sector = sectors[0] || {};
  const featured = issue?.featured_stock || {};
  const sm = featured.summary || {};
  const date = issue?.business_date || 'Latest';
  const stockRow = { change_rs: sm.change_rs, change_pct: sm.change_pct, net_aggr_qty: sm.net_aggr_qty };
  return <section className="social-export-section editorial-section" id="social-export">
    <div className="section-title-row">
      <div>
        <p className="editorial-kicker">F. Export-ready Social Studio</p>
        <h2>Screenshot-ready, not poster-empty</h2>
        <p>Compact cards use real issue values and are designed for browser screenshot or print.</p>
      </div>
      <button className="soft-action" onClick={() => window.print()}>Print / Save PDF</button>
    </div>
    <div className="export-card-grid-clean">
      <ExportCard eyebrow={`NEPSE ORDER FLOW · ${date}`} title={biasTone(market) === 'buy' ? 'Buy Pressure Led the Tape' : biasTone(market) === 'sell' ? 'Sell Pressure Led the Tape' : 'Market Flow Stayed Balanced'}>
        <div className="export-chip-row"><span className="buy">Buy {shares.buy.toFixed(1)}%</span><span className="sell">Sell {shares.sell.toFixed(1)}%</span><span className="warn">Ambig {shares.ambig.toFixed(1)}%</span></div>
        <p>{sector.sector_name || 'Top sector'} carried the largest footprint. {featured.symbol || 'The featured stock'} gave the clearest stock-level proof.</p>
        <b>Total turnover {fmtRs(market.trade_amt_rs)}</b>
      </ExportCard>
      <ExportCard eyebrow="SECTOR LEADER" title={sector.sector_name || 'Top Sector'}>
        <div className="export-stat-list"><span>Turnover <b>{fmtRs(sector.summary?.trade_amt_rs)}</b></span><span>Flow bias <b>{biasWord(sector.summary || {})}</b></span><span>Active stocks <b>{fmtInt(sector.active_stocks)}</b></span></div>
        <p>Largest sector footprint. Open the sector page to separate clean confirmation from contradictory movement.</p>
      </ExportCard>
      <ExportCard eyebrow="STOCK PROOF" title={featured.symbol || 'Featured Stock'}>
        <div className="export-stat-list"><span>LTP <b>{fmtPx(sm.ltp_rs || sm.close_rs)}</b></span><span>Change <b className={n(sm.change_rs) >= 0 ? 'buy' : 'sell'}>{n(sm.change_rs) >= 0 ? '+' : ''}{Number(sm.change_rs || 0).toFixed(2)} / {n(sm.change_pct) >= 0 ? '+' : ''}{Number(sm.change_pct || 0).toFixed(2)}%</b></span><span>Turnover <b>{fmtRs(sm.trade_amt_rs)}</b></span><span>Net flow <b>{flowPillLabel(sm)}</b></span></div>
        <p>{boardRead(stockRow)}.</p>
      </ExportCard>
    </div>
  </section>;
}
