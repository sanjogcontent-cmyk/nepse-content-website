import React from 'react';
import { pressureShares } from './sectorPressureUtils.js';

export default function SectorPressureBar({ summary }) {
  const { buyPct, sellPct, ambigPct } = pressureShares(summary || {});
  return (
    <div className="sector-pressure-bar" aria-label="Buy aggressor, sell aggressor and ambiguous amount share">
      <i className="pressure-buy" style={{ width: `${buyPct}%` }} />
      <i className="pressure-sell" style={{ width: `${sellPct}%` }} />
      <i className="pressure-ambig" style={{ width: `${ambigPct}%` }} />
    </div>
  );
}
