import React from 'react';
import { fmtInt, fmtRs, fmtPct } from '../utils.js';

export function FlowBar({ buy = 0, sell = 0, ambig = 0 }) {
  const total = Math.max(Math.abs(buy) + Math.abs(sell) + Math.abs(ambig), 1);
  const bp = Math.max(2, Math.abs(buy) / total * 100);
  const sp = Math.max(2, Math.abs(sell) / total * 100);
  const ap = Math.max(2, Math.abs(ambig) / total * 100);
  return (
    <div className="flowbar" title={`B ${fmtInt(buy)} / S ${fmtInt(sell)} / A ${fmtInt(ambig)}`}>
      <div className="flowbar-buy" style={{ width: `${bp}%` }} />
      <div className="flowbar-sell" style={{ width: `${sp}%` }} />
      <div className="flowbar-ambig" style={{ width: `${ap}%` }} />
    </div>
  );
}

export function MarketPulse({ intervals = [] }) {
  const maxAmt = Math.max(...intervals.map(x => x.trade_amt_rs || 0), 1);
  const maxNet = Math.max(...intervals.map(x => Math.abs(x.net_aggr_qty || 0)), 1);
  return (
    <section className="panel chart-panel">
      <div className="panel-head">
        <div><p className="eyebrow">Market pulse</p><h2>5-minute activity + net aggressor flow</h2></div>
        <span className="soft-label">Bars = turnover · Line proxy = net qty height</span>
      </div>
      <div className="pulse-chart">
        {intervals.map((x, idx) => {
          const h = Math.max(4, (x.trade_amt_rs || 0) / maxAmt * 100);
          const netH = Math.max(2, Math.abs(x.net_aggr_qty || 0) / maxNet * 82);
          const positive = (x.net_aggr_qty || 0) >= 0;
          return (
            <div className="pulse-col" key={`${x.time}-${idx}`} title={`${x.time}: ${fmtRs(x.trade_amt_rs)}, Net ${fmtInt(x.net_aggr_qty)}`}>
              <div className={`net-dot ${positive ? 'buy' : 'sell'}`} style={{ bottom: `${netH}%` }} />
              <div className="pulse-bar" style={{ height: `${h}%` }} />
            </div>
          );
        })}
      </div>
      <div className="pulse-axis"><span>{intervals[0]?.time || '--:--'}</span><span>{intervals[Math.floor(intervals.length/2)]?.time || ''}</span><span>{intervals[intervals.length-1]?.time || '--:--'}</span></div>
    </section>
  );
}

export function SectorContributionBars({ sectors = [] }) {
  const top = sectors.slice(0, 12);
  const maxAmt = Math.max(...top.map(s => s.summary?.trade_amt_rs || 0), 1);
  return (
    <section className="panel">
      <div className="panel-head"><div><p className="eyebrow">Sector contribution</p><h2>Ranked by turnover footprint</h2></div></div>
      <div className="rank-bars">
        {top.map(sec => {
          const sm = sec.summary || {};
          return (
            <div className="rank-row" key={sec.sector_name}>
              <div className="rank-name">{sec.sector_name}</div>
              <div className="rank-track"><div className={sm.net_aggr_qty >= 0 ? 'rank-fill buy' : 'rank-fill sell'} style={{ width: `${(sm.trade_amt_rs || 0) / maxAmt * 100}%` }} /></div>
              <div className="rank-value">{fmtRs(sm.trade_amt_rs)}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function IndexMini({ index }) {
  if (!index) return <span className="soft-label">Index intelligence unavailable</span>;
  const positive = Number(index.change || 0) >= 0;
  return (
    <div className="index-mini">
      <span>{index.index_code}</span>
      <strong>{fmtInt(index.close)}</strong>
      <em className={positive ? 'buy' : 'sell'}>{positive ? '+' : ''}{index.change?.toFixed?.(2) ?? '—'} ({fmtPct(index.change_pct)})</em>
    </div>
  );
}
