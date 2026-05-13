import React from 'react';
import { compactQty, n } from '../home/homeUtils.js';

export default function FlowPill({ row, summary, className = '' }) {
  const source = summary || row || {};
  const net = n(source.net_aggr_qty);
  const tone = net > 0 ? 'buy' : net < 0 ? 'sell' : 'neutral';
  const label = net > 0 ? `Buy +${compactQty(net)}` : net < 0 ? `Sell ${compactQty(net)}` : 'Neutral';
  return <span className={`flow-pill flow-pill-${tone} ${className}`}>{label}</span>;
}
