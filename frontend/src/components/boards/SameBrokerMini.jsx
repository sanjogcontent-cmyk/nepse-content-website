import React from 'react';
import { sameBrokerPct } from '../home/homeUtils.js';

export default function SameBrokerMini({ row, quiet = false }) {
  const pct = sameBrokerPct(row || {});
  if (pct === null) return null;
  const high = pct >= 10;
  return <span className={`same-broker-mini ${quiet ? 'quiet' : ''} ${high ? 'watch' : ''}`} title="buyer broker equals seller broker, shown as context only">♟ Same-broker {pct.toFixed(2)}%</span>;
}
