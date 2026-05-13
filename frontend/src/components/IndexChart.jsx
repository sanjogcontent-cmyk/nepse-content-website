import React, { useMemo, useState } from 'react';
import { fmtInt, fmtPct } from '../utils.js';

function n(v) { return Number(v || 0); }
function isNum(v) { return Number.isFinite(Number(v)); }
function fmtPoint(v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return '—';
  return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtTime(t) {
  if (!t) return '—';
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}
function chartPoints(index) {
  return Array.isArray(index?.chart?.points) ? index.chart.points.filter((p) => Number.isFinite(Number(p.value))) : [];
}
function pointValue(p) { return Number(p?.value); }
function tone(index) { return n(index?.change) >= 0 ? 'buy' : 'sell'; }
function safePctWidth(part, total) { return total > 0 ? Math.max(0, Math.min(100, (Number(part || 0) / total) * 100)) : 0; }

function getDomain(index, points, scaleMode) {
  const vals = points.map(pointValue).filter(isNum);
  const chart = index?.chart || {};
  const prev = n(index?.previous_close ?? chart.prev_close);
  const explicitLow = isNum(chart.low) ? Number(chart.low) : Math.min(...vals);
  const explicitHigh = isNum(chart.high) ? Number(chart.high) : Math.max(...vals);
  let min = Math.min(...vals, prev || explicitLow);
  let max = Math.max(...vals, prev || explicitHigh);

  if (scaleMode === 'day') {
    min = Math.min(explicitLow, ...vals, prev || explicitLow);
    max = Math.max(explicitHigh, ...vals, prev || explicitHigh);
  }

  if (scaleMode === 'prev' && prev) {
    const maxDeviation = Math.max(...vals.map((v) => Math.abs(v - prev)), Math.abs(explicitHigh - prev), Math.abs(explicitLow - prev), 1);
    min = prev - maxDeviation;
    max = prev + maxDeviation;
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1 };
  const span = Math.max(max - min, 1);
  const pad = span * (scaleMode === 'tight' ? 0.08 : 0.06);
  return { min: min - pad, max: max + pad };
}

function makeAxisTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [];
  return Array.from({ length: count }, (_, i) => max - ((max - min) * i) / (count - 1));
}

function pickTimeTicks(points, count = 5) {
  if (!points.length) return [];
  if (points.length <= count) return points.map((p, i) => ({ p, i }));
  const idxs = Array.from({ length: count }, (_, i) => Math.round((i * (points.length - 1)) / (count - 1)));
  return [...new Set(idxs)].map((i) => ({ p: points[i], i }));
}

function locateExtreme(points, mode) {
  if (!points.length) return null;
  let best = points[0];
  for (const p of points) {
    if (mode === 'high' && pointValue(p) > pointValue(best)) best = p;
    if (mode === 'low' && pointValue(p) < pointValue(best)) best = p;
  }
  return best;
}

export function IndexSparkline({ index, className = '' }) {
  const points = chartPoints(index);
  if (points.length < 2) return <div className={`index-sparkline-empty ${className}`}>No index path</div>;
  const w = 260;
  const h = 72;
  const pad = 8;
  const vals = points.map((p) => n(p.value));
  const min = Math.min(...vals, n(index?.previous_close || vals[0]));
  const max = Math.max(...vals, n(index?.previous_close || vals[0]));
  const span = Math.max(max - min, 1);
  const line = points.map((p, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(points.length - 1, 1);
    const y = h - pad - ((n(p.value) - min) / span) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const prev = n(index?.previous_close || index?.chart?.prev_close);
  const prevY = h - pad - ((prev - min) / span) * (h - pad * 2);
  const t = tone(index);
  return <svg className={`index-sparkline ${t} ${className}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`${index?.index_code || 'Index'} intraday path`}>
    {prev ? <line className="index-prev-line" x1={pad} x2={w - pad} y1={prevY} y2={prevY} /> : null}
    <polyline points={line} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function DetailedIndexPlot({ index, points, scaleMode }) {
  const w = 1200;
  const h = 360;
  const pad = { left: 70, right: 34, top: 28, bottom: 48 };
  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;
  const { min, max } = getDomain(index, points, scaleMode);
  const span = Math.max(max - min, 1);
  const xAt = (i) => pad.left + (i * chartW) / Math.max(points.length - 1, 1);
  const yAt = (v) => pad.top + ((max - Number(v)) / span) * chartH;
  const line = points.map((p, i) => `${xAt(i).toFixed(1)},${yAt(pointValue(p)).toFixed(1)}`).join(' ');
  const first = points[0];
  const last = points[points.length - 1];
  const high = locateExtreme(points, 'high');
  const low = locateExtreme(points, 'low');
  const prev = n(index?.previous_close ?? index?.chart?.prev_close);
  const yTicks = makeAxisTicks(min, max, 6);
  const xTicks = pickTimeTicks(points, 6);
  const highIndex = Math.max(0, points.indexOf(high));
  const lowIndex = Math.max(0, points.indexOf(low));
  const lastIndex = Math.max(0, points.length - 1);
  const t = tone(index);

  return <div className="index-detailed-plot-wrap">
    <svg className={`index-detailed-plot ${t}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label={`${index?.index_code || 'Index'} scaled intraday path`}>
      <defs>
        <linearGradient id={`index-area-${index?.index_code || 'idx'}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.16" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {yTicks.map((v) => <g key={`y-${v.toFixed(4)}`}>
        <line className="index-grid-line" x1={pad.left} x2={w - pad.right} y1={yAt(v)} y2={yAt(v)} />
        <text className="index-y-label" x={pad.left - 12} y={yAt(v) + 4} textAnchor="end">{fmtPoint(v)}</text>
      </g>)}

      {xTicks.map(({ p, i }) => <g key={`x-${i}`}>
        <line className="index-grid-line vertical" x1={xAt(i)} x2={xAt(i)} y1={pad.top} y2={h - pad.bottom} />
        <text className="index-x-label" x={xAt(i)} y={h - 16} textAnchor="middle">{fmtTime(p.time)}</text>
      </g>)}

      {prev ? <g>
        <line className="index-prev-line-detailed" x1={pad.left} x2={w - pad.right} y1={yAt(prev)} y2={yAt(prev)} />
        <text className="index-ref-label" x={w - pad.right - 4} y={yAt(prev) - 8} textAnchor="end">Prev close {fmtPoint(prev)}</text>
      </g> : null}

      {first ? <g>
        <circle className="index-open-dot" cx={xAt(0)} cy={yAt(pointValue(first))} r="5" />
      </g> : null}

      <polyline className="index-area-line" points={`${line} ${xAt(lastIndex)},${h - pad.bottom} ${xAt(0)},${h - pad.bottom}`} fill={`url(#index-area-${index?.index_code || 'idx'})`} stroke="none" />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={line} fill="none" stroke="rgba(255,255,255,.65)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

      {high ? <g>
        <circle className="index-extreme-dot high" cx={xAt(highIndex)} cy={yAt(pointValue(high))} r="6" />
      </g> : null}
      {low ? <g>
        <circle className="index-extreme-dot low" cx={xAt(lowIndex)} cy={yAt(pointValue(low))} r="6" />
      </g> : null}
      {last ? <g>
        <circle className="index-close-dot" cx={xAt(lastIndex)} cy={yAt(pointValue(last))} r="7" />
      </g> : null}
    </svg>
  </div>;
}

export default function IndexChart({ index, title, subtitle, compact = false }) {
  const [scaleMode, setScaleMode] = useState('tight');
  const points = chartPoints(index);
  const t = tone(index);
  const code = index?.index_code || 'INDEX';
  const chart = index?.chart || {};
  const detail = useMemo(() => {
    const vals = points.map(pointValue);
    const open = isNum(chart.open) ? Number(chart.open) : vals[0];
    const close = isNum(chart.close) ? Number(chart.close) : vals[vals.length - 1];
    const high = isNum(chart.high) ? Number(chart.high) : Math.max(...vals);
    const low = isNum(chart.low) ? Number(chart.low) : Math.min(...vals);
    const prev = n(index?.previous_close ?? chart.prev_close);
    const range = Number(high || 0) - Number(low || 0);
    const closeVsOpen = Number(close || 0) - Number(open || 0);
    const closeVsLow = Number(close || 0) - Number(low || 0);
    const recoveryPct = range > 0 ? safePctWidth(closeVsLow, range) : 0;
    return { open, close, high, low, prev, range, closeVsOpen, recoveryPct };
  }, [index, chart.open, chart.close, chart.high, chart.low, chart.prev_close, points]);

  if (!index) return null;
  if (points.length < 2) return <article className={`index-chart-card ${compact ? 'compact' : ''} ${t}`}><IndexSparkline index={index} /></article>;

  return <article className={`index-chart-card ${compact ? 'compact' : ''} ${t}`}>
    <header className="index-chart-head">
      <div>
        <p className="eyebrow">{subtitle || 'Index chart context'}</p>
        <h3>{title || code}</h3>
        {!compact ? <p className="index-chart-subline">Scaled intraday path with previous close, high/low, open/close and sampled tick context.</p> : null}
      </div>
      <div className="index-chart-close">
        <span>{code}</span>
        <strong>{index.close != null ? fmtPoint(index.close) : '—'}</strong>
        <em className={t}>{index.change != null ? `${n(index.change) >= 0 ? '+' : ''}${fmtPoint(index.change)} · ${fmtPct(index.change_pct)}` : 'Index DB'}</em>
      </div>
    </header>

    {!compact ? <div className="index-scale-toolbar" aria-label="Chart scale controls">
      <span>Scale</span>
      {[
        ['tight', 'Auto detail'],
        ['day', 'Full range'],
        ['prev', 'Prev-close centered'],
      ].map(([key, label]) => <button key={key} className={scaleMode === key ? 'active' : ''} onClick={() => setScaleMode(key)}>{label}</button>)}
    </div> : null}

    <div className="index-chart-body detailed">
      {compact ? <IndexSparkline index={index} /> : <DetailedIndexPlot index={index} points={points} scaleMode={scaleMode} />}
    </div>

    {!compact ? <div className="index-chart-read-strip">
      <span><small>Session range</small><b>{fmtPoint(detail.low)} → {fmtPoint(detail.high)}</b></span>
      <span><small>Range width</small><b>{fmtPoint(detail.range)} pts</b></span>
      <span><small>Close vs open</small><b className={detail.closeVsOpen >= 0 ? 'buy' : 'sell'}>{detail.closeVsOpen >= 0 ? '+' : ''}{fmtPoint(detail.closeVsOpen)}</b></span>
      <span><small>Close recovery from low</small><b>{detail.recoveryPct.toFixed(0)}%</b></span>
    </div> : null}

    <footer className="index-chart-stats upgraded">
      <span><small>Open</small><b>{fmtPoint(detail.open)}</b></span>
      <span><small>High</small><b>{fmtPoint(detail.high)}</b></span>
      <span><small>Low</small><b>{fmtPoint(detail.low)}</b></span>
      <span><small>Close</small><b>{fmtPoint(detail.close)}</b></span>
      <span><small>Prev close</small><b>{fmtPoint(detail.prev)}</b></span>
      <span><small>Ticks</small><b>{fmtInt(chart.point_count || points.length)}</b></span>
      <span><small>Sampled</small><b>{fmtInt(chart.sampled_points || points.length)}</b></span>
    </footer>
  </article>;
}
