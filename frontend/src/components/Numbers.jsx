import React from 'react';
import { fmtInt, fmtRs, fmtPct, fmtPx, toneFromNumber } from '../utils.js';

export function NumberValue({ label, value, type = 'int', tone = 'neutral', compact = false }) {
  let out = value;
  if (type === 'int') out = fmtInt(value);
  if (type === 'rs') out = fmtRs(value);
  if (type === 'pct') out = fmtPct(value);
  if (type === 'px') out = fmtPx(value);
  const inferredTone = tone === 'auto' ? toneFromNumber(value) : tone;
  return (
    <div className={`num-card tone-${inferredTone} ${compact ? 'compact' : ''}`}>
      <span>{label}</span>
      <strong>{out}</strong>
    </div>
  );
}

export function EvidenceBadge({ label }) {
  const normalized = (label || '').toLowerCase();
  const tone = normalized.includes('high') ? 'buy' : normalized.includes('medium') ? 'warn' : 'sell';
  return <span className={`badge tone-${tone}`}>{label || 'Evidence Unknown'}</span>;
}
