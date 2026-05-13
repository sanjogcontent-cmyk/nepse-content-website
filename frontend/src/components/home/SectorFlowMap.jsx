import React from 'react';
import { fmtRs, fmtInt, fmtPct, safeArr, n, sectorSlug, setRoute } from './homeUtils.js';
import SectorPressureBar from '../sectors/SectorPressureBar.jsx';
import SectorPressureBadge from '../sectors/SectorPressureBadge.jsx';
import SectorLeadStocks from '../sectors/SectorLeadStocks.jsx';
import { cssToneClass, getSectorPressureRead, getSectorPressureTone, pressureShares, sectorAmounts } from '../sectors/sectorPressureUtils.js';

function AmountLabels({ summary }) {
  const amounts = sectorAmounts(summary || {});
  const shares = pressureShares(summary || {});
  return <div className="home-sector-amounts">
    <span><small>Buy</small><b className="buy">{fmtRs(amounts.buy)}</b><em>{fmtPct(shares.buyPct)}</em></span>
    <span><small>Sell</small><b className="sell">{fmtRs(amounts.sell)}</b><em>{fmtPct(shares.sellPct)}</em></span>
    <span><small>Ambig</small><b className="mixed">{fmtRs(amounts.ambig)}</b><em>{fmtPct(shares.ambigPct)}</em></span>
  </div>;
}

export default function SectorFlowMap({ issue }) {
  const date = issue?.business_date || '';
  const sectors = safeArr(issue?.sectors)
    .slice()
    .sort((a, b) => n(b.summary?.trade_amt_rs) - n(a.summary?.trade_amt_rs))
    .slice(0, 6);
  if (!sectors.length) return null;
  return <section className="sector-flow-section editorial-section phase14f-home-sector" id="sector-flow">
    <div className="section-title-row">
      <div>
        <p className="editorial-kicker">B. Sector Pressure Map</p>
        <h2>Where buy money, sell money and ambiguity concentrated</h2>
        <p>Each sector card uses aggressor-side amount first, then lead stocks and secondary volume context.</p>
      </div>
      <button className="soft-action" onClick={() => setRoute('/sectors')}>Open all sectors</button>
    </div>
    <div className="sector-flow-grid amount-sector-grid">
      {sectors.map((sector) => {
        const sm = sector.summary || {};
        const tone = cssToneClass(getSectorPressureTone(sector));
        return <button key={sector.sector_name} className={`sector-flow-tile amount-sector-tile ${tone}`} onClick={() => setRoute(`/sectors/${sectorSlug(sector.sector_name)}${date ? `?date=${date}` : ''}`)}>
          <div className="amount-sector-topline">
            <SectorPressureBadge sector={sector} />
            <span>{sector.index?.index_code || 'Sector'}</span>
          </div>
          <h3>{sector.sector_name}</h3>
          <strong>{fmtRs(sm.trade_amt_rs)}</strong>
          <small>Total sector turnover</small>
          <SectorPressureBar summary={sm} />
          <AmountLabels summary={sm} />
          <p>{getSectorPressureRead(sector)}</p>
          <div className="home-sector-leads">
            <span>Lead stocks</span>
            <SectorLeadStocks sector={sector} date={date} />
          </div>
          <em>{fmtInt(sm.trade_qty)} shares · {fmtInt(sm.transactions)} tx · Same-broker {sm.same_broker_turnover_pct == null ? '—' : fmtPct(sm.same_broker_turnover_pct)}</em>
        </button>;
      })}
    </div>
  </section>;
}
