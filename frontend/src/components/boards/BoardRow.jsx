import React from 'react';
import { fmtInt, fmtRs, fmtPx, n, boardRead, setRoute } from '../home/homeUtils.js';
import FlowPill from './FlowPill.jsx';
import SameBrokerMini from './SameBrokerMini.jsx';

function signed(v, suffix = '') {
  const x = n(v);
  return `${x >= 0 ? '+' : ''}${x.toLocaleString('en-US', { maximumFractionDigits: 2, minimumFractionDigits: suffix === '%' ? 2 : 2 })}${suffix}`;
}

function metricLine(boardKey, row) {
  if (boardKey === 'top_turnover') return <><b>{fmtRs(row.turnover_rs)}</b><span>{fmtPx(row.ltp_rs)}</span></>;
  if (boardKey === 'top_volume') return <><b>{fmtInt(row.shares_traded)}</b><span>{fmtPx(row.ltp_rs)}</span></>;
  if (boardKey === 'top_transactions') return <><b>{fmtInt(row.transactions)}</b><span>{fmtPx(row.ltp_rs)}</span></>;
  return <><b>{fmtPx(row.ltp_rs)}</b><span className={n(row.change_rs) >= 0 ? 'buy' : 'sell'}>{signed(row.change_rs)}</span><span className={n(row.change_pct) >= 0 ? 'buy' : 'sell'}>{signed(row.change_pct, '%')}</span></>;
}

export default function BoardRow({ row, boardKey, businessDate, compact = true }) {
  const path = `/stocks/${encodeURIComponent(row.symbol)}${businessDate ? `?date=${businessDate}` : ''}`;
  return <button className={`board-row-card ${compact ? 'compact' : 'full'}`} onClick={() => setRoute(path)}>
    <div className="board-row-symbol">
      <strong>{row.symbol}</strong>
      <small>{row.sector_name || 'Unmapped'}</small>
    </div>
    <div className="board-row-metrics">{metricLine(boardKey, row)}</div>
    <div className="board-row-read">
      <FlowPill row={row} />
      <span>{boardRead(row)}</span>
      <SameBrokerMini row={row} quiet />
    </div>
  </button>;
}
