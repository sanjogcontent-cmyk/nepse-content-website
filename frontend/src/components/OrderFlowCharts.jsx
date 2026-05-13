import React, { useMemo, useState } from 'react';
import { fmtInt, fmtRs, fmtPct } from '../utils.js';

const n = (v) => Number(v || 0);
const finite = (v) => Number.isFinite(Number(v));
const signed = (v, fmt = fmtInt) => `${n(v) >= 0 ? '+' : ''}${fmt(v)}`;
const cleanTime = (t) => (t ? String(t).slice(0, 5) : '—');

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function pointsOf(series) { return Array.isArray(series?.points) ? series.points : []; }
function extent(values, padRatio = 0.08, includeZero = false) {
  const vals = values.map(Number).filter(Number.isFinite);
  if (includeZero) vals.push(0);
  if (!vals.length) return { min: 0, max: 1 };
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const span = Math.max(max - min, 1);
  return { min: min - span * padRatio, max: max + span * padRatio };
}
function pctX(i, len, pad = 5) { return pad + (i * (100 - pad * 2)) / Math.max(len - 1, 1); }
function y(v, domain, top = 8, bottom = 86) {
  const span = Math.max(domain.max - domain.min, 1);
  return bottom - ((Number(v) - domain.min) / span) * (bottom - top);
}
function makeLine(points, key, domain) {
  return points.map((p, i) => `${pctX(i, points.length).toFixed(2)},${y(p[key], domain).toFixed(2)}`).join(' ');
}
function makeArea(points, key, domain, baseline = 90) {
  const line = makeLine(points, key, domain);
  if (!line) return '';
  return `${line} ${pctX(points.length - 1, points.length).toFixed(2)},${baseline} ${pctX(0, points.length).toFixed(2)},${baseline}`;
}
function timeTicks(points, count = 5) {
  if (!points.length) return [];
  return Array.from({ length: Math.min(count, points.length) }, (_, i) => Math.round((i * (points.length - 1)) / Math.max(Math.min(count, points.length) - 1, 1)))
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((idx) => ({ idx, point: points[idx] }));
}
function nearestMilestone(points, key, targetPct) {
  if (!points.length) return null;
  const final = n(points[points.length - 1]?.[key]);
  if (final <= 0) return null;
  const target = final * targetPct;
  return points.find((p) => n(p[key]) >= target) || points[points.length - 1];
}

function ChartHeader({ eyebrow, title, subtitle, value, change, tone = 'neutral', children }) {
  return <header className="of-chart-head">
    <div>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h3>{title}</h3>
      {subtitle ? <p>{subtitle}</p> : null}
    </div>
    <div className={`of-chart-value ${tone}`}>
      {value ? <strong>{value}</strong> : null}
      {change ? <span>{change}</span> : null}
    </div>
    {children}
  </header>;
}

export function MiniTurnoverSparkline({ series, className = '' }) {
  const pts = pointsOf(series);
  if (pts.length < 2) return <div className={`of-empty-spark ${className}`}>No turnover path</div>;
  const domain = extent(pts.map((p) => n(p.cumulative_turnover_rs)), 0.05);
  const area = makeArea(pts, 'cumulative_turnover_rs', domain);
  const line = makeLine(pts, 'cumulative_turnover_rs', domain);
  return <svg className={`of-mini-turnover ${className}`} viewBox="0 0 100 92" preserveAspectRatio="none" aria-label="Cumulative turnover mini chart">
    <polygon points={area} />
    <polyline points={line} />
  </svg>;
}

export function CumulativeTurnoverChart({ series, title = 'Cumulative turnover', subtitle = 'How traded value built through the session', compact = false }) {
  const [scale, setScale] = useState('auto');
  const pts = pointsOf(series);
  const detail = useMemo(() => {
    const final = n(series?.final_turnover_rs ?? pts.at(-1)?.cumulative_turnover_rs);
    const p25 = nearestMilestone(pts, 'cumulative_turnover_rs', 0.25);
    const p50 = nearestMilestone(pts, 'cumulative_turnover_rs', 0.50);
    const p75 = nearestMilestone(pts, 'cumulative_turnover_rs', 0.75);
    const late = pts.length > 2 ? final - n(pts[Math.floor(pts.length * 0.65)]?.cumulative_turnover_rs) : 0;
    return { final, p25, p50, p75, late };
  }, [series, pts]);

  if (pts.length < 2) return <article className="of-chart-card empty"><h3>{title}</h3><p>No cumulative turnover path in this issue payload.</p></article>;

  const values = pts.map((p) => n(p.cumulative_turnover_rs));
  const domain = scale === 'zero' ? { min: 0, max: Math.max(...values) * 1.06 || 1 } : extent(values, 0.08, false);
  const line = makeLine(pts, 'cumulative_turnover_rs', domain);
  const area = makeArea(pts, 'cumulative_turnover_rs', domain);
  const tickYs = [0.2, 0.5, 0.8].map((r) => domain.max - (domain.max - domain.min) * r);
  const ticks = timeTicks(pts, compact ? 4 : 6);

  return <article className={`of-chart-card turnover ${compact ? 'compact' : ''}`}>
    <ChartHeader
      eyebrow="Participation path"
      title={title}
      subtitle={subtitle}
      value={fmtRs(detail.final)}
      change={series?.pace_read || 'Cumulative traded value'}
      tone="same"
    >
      {!compact && <div className="of-scale-toggle" role="group" aria-label="Turnover chart scale">
        <button className={scale === 'auto' ? 'active' : ''} onClick={() => setScale('auto')}>Detail scale</button>
        <button className={scale === 'zero' ? 'active' : ''} onClick={() => setScale('zero')}>Start at zero</button>
      </div>}
    </ChartHeader>
    <div className="of-turnover-stage">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${title} chart`}>
        {tickYs.map((v, i) => <line key={i} className="of-grid" x1="5" x2="95" y1={y(v, domain)} y2={y(v, domain)} />)}
        {ticks.map(({ idx }) => <line key={`x-${idx}`} className="of-grid vertical" x1={pctX(idx, pts.length)} x2={pctX(idx, pts.length)} y1="8" y2="90" />)}
        <polygon className="of-area" points={area} />
        <polyline className="of-line" points={line} />
        {[detail.p25, detail.p50, detail.p75].filter(Boolean).map((p, i) => <circle key={i} className="of-milestone" cx={pctX(pts.indexOf(p), pts.length)} cy={y(p.cumulative_turnover_rs, domain)} r="1.25" />)}
        <circle className="of-close-dot" cx={pctX(pts.length - 1, pts.length)} cy={y(pts.at(-1).cumulative_turnover_rs, domain)} r="1.8" />
      </svg>
      {!compact && <div className="of-axis-labels y">
        <span>{fmtRs(domain.max)}</span><span>{fmtRs((domain.max + domain.min) / 2)}</span><span>{fmtRs(domain.min)}</span>
      </div>}
      <div className="of-axis-labels x">{ticks.map(({ idx, point }) => <span key={idx} style={{ left: `${pctX(idx, pts.length)}%` }}>{cleanTime(point.time_hhmm || point.time)}</span>)}</div>
    </div>
    {!compact && <div className="of-story-metrics four">
      <span><small>25% value reached</small><b>{detail.p25 ? cleanTime(detail.p25.time_hhmm || detail.p25.time) : '—'}</b></span>
      <span><small>50% value reached</small><b>{detail.p50 ? cleanTime(detail.p50.time_hhmm || detail.p50.time) : '—'}</b></span>
      <span><small>75% value reached</small><b>{detail.p75 ? cleanTime(detail.p75.time_hhmm || detail.p75.time) : '—'}</b></span>
      <span><small>Late build</small><b>{fmtRs(detail.late)}</b></span>
    </div>}
  </article>;
}

function zeroDomain(points, key) {
  const vals = points.map((p) => n(p[key]));
  return extent(vals, 0.12, true);
}
function pathTone(series) { return n(series?.final_delta_qty) >= 0 ? 'buy' : 'sell'; }
function deltaRead(series) {
  if (series?.flow_read) return series.flow_read;
  const d = n(series?.final_delta_qty);
  if (d > 0) return 'Buy aggression finished in control.';
  if (d < 0) return 'Sell aggression finished in control.';
  return 'Delta finished balanced.';
}

function balanceTone(finalValue) { return n(finalValue) >= 0 ? 'buy' : 'sell'; }
function makeYTicks(domain) {
  const top = domain.max;
  const mid = 0;
  const bottom = domain.min;
  return [top, mid, bottom];
}
function BalancePanel({ points, pointKey, domain, ticks, title, finalValue, formatter = fmtRs, tone = 'same', zeroLabel = '0' }) {
  const line = makeLine(points, pointKey, domain);
  const zeroY = clamp(y(0, domain), 8, 88);
  const highPoint = points.reduce((best, p) => n(p?.[pointKey]) > n(best?.[pointKey]) ? p : best, points[0]);
  const lowPoint = points.reduce((best, p) => n(p?.[pointKey]) < n(best?.[pointKey]) ? p : best, points[0]);
  return <section className={`of-balance-panel ${tone}`}>
    <div className="of-panel-title"><b>{title}</b><span>final {formatter(finalValue)}</span></div>
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={title}>
      <rect className="of-zone positive" x="5" y="8" width="90" height={Math.max(0, zeroY - 8)} />
      <rect className="of-zone negative" x="5" y={zeroY} width="90" height={Math.max(0, 90 - zeroY)} />
      {[25, 50, 75].map((yy) => <line key={yy} className="of-grid" x1="5" x2="95" y1={yy} y2={yy} />)}
      {ticks.map(({ idx }) => <line key={`x-${idx}`} className="of-grid vertical" x1={pctX(idx, points.length)} x2={pctX(idx, points.length)} y1="8" y2="90" />)}
      <line className="of-zero" x1="5" x2="95" y1={zeroY} y2={zeroY} />
      <polyline className="of-line" points={line} />
      <circle className="of-milestone high" cx={pctX(points.indexOf(highPoint), points.length)} cy={y(highPoint?.[pointKey], domain)} r="1.6" />
      <circle className="of-milestone low" cx={pctX(points.indexOf(lowPoint), points.length)} cy={y(lowPoint?.[pointKey], domain)} r="1.6" />
      <circle className="of-close-dot" cx={pctX(points.length - 1, points.length)} cy={y(points.at(-1)?.[pointKey], domain)} r="1.9" />
    </svg>
    <div className="of-axis-labels y inline">
      {makeYTicks(domain).map((v, i) => <span key={i}>{i === 1 ? zeroLabel : formatter(v)}</span>)}
    </div>
  </section>;
}

export function StockOrderFlowChart({ series, symbol = 'Stock', title }) {
  const pts = pointsOf(series);
  const [scale, setScale] = useState('auto');
  if (pts.length < 2) return <article className="of-chart-card empty"><h3>{symbol} order-flow path</h3><p>No cumulative delta path in this issue payload.</p></article>;
  const amountTone = balanceTone(series?.final_delta_amt_rs);
  const deltaTone = pathTone(series);
  const amountDomain = scale === 'tight'
    ? extent(pts.map((p) => n(p.cumulative_delta_amt_rs)), 0.15, true)
    : zeroDomain(pts, 'cumulative_delta_amt_rs');
  const deltaDomain = scale === 'tight'
    ? extent(pts.map((p) => n(p.cumulative_delta_qty)), 0.15, true)
    : zeroDomain(pts, 'cumulative_delta_qty');
  const ticks = timeTicks(pts, 6);

  return <article className={`of-chart-card stock-flow ${amountTone}`}>
    <ChartHeader
      eyebrow="Stock order-flow path"
      title={title || `${symbol} cumulative net aggressor amount + delta`}
      subtitle="Two clean readings: running net aggressor amount (Buy Agg Amt − Sell Agg Amt) and cumulative delta quantity (BuyAggQty − SellAggQty)."
      value={signed(series?.final_delta_amt_rs, fmtRs)}
      change={deltaRead(series)}
      tone={amountTone}
    >
      <div className="of-scale-toggle" role="group" aria-label="Stock order-flow chart scale">
        <button className={scale === 'auto' ? 'active' : ''} onClick={() => setScale('auto')}>Zero centered</button>
        <button className={scale === 'tight' ? 'active' : ''} onClick={() => setScale('tight')}>Detail scale</button>
      </div>
    </ChartHeader>

    <div className="of-stock-stage two-panels">
      <BalancePanel
        points={pts}
        pointKey="cumulative_delta_amt_rs"
        domain={amountDomain}
        ticks={ticks}
        title="Cumulative net aggressor amount"
        finalValue={series?.final_delta_amt_rs}
        formatter={fmtRs}
        tone={amountTone}
      />
      <BalancePanel
        points={pts}
        pointKey="cumulative_delta_qty"
        domain={deltaDomain}
        ticks={ticks}
        title="Cumulative delta quantity"
        finalValue={series?.final_delta_qty}
        formatter={signedQty => signed(signedQty, fmtInt)}
        tone={deltaTone}
      />
      <div className="of-axis-labels x stock">{ticks.map(({ idx, point }) => <span key={idx} style={{ left: `${pctX(idx, pts.length)}%` }}>{cleanTime(point.time_hhmm || point.time)}</span>)}</div>
    </div>

    <div className="of-story-metrics five">
      <span><small>Buy aggressor</small><b className="buy">{fmtInt(series?.final_buy_qty)}</b></span>
      <span><small>Sell aggressor</small><b className="sell">{fmtInt(series?.final_sell_qty)}</b></span>
      <span><small>Net amount</small><b className={amountTone}>{fmtRs(series?.final_delta_amt_rs)}</b></span>
      <span><small>Turnover</small><b>{fmtRs(series?.final_turnover_rs)}</b></span>
      <span><small>Transactions</small><b>{fmtInt(series?.final_transactions)}</b></span>
    </div>
  </article>;
}

export function AggressorBalanceChart({ series, title = 'Intraday money pressure path', subtitle = 'Running net aggressor amount = cumulative buy aggressor amount − cumulative sell aggressor amount.', compact = false }) {
  const pts = pointsOf(series);
  const [scale, setScale] = useState('auto');
  if (pts.length < 2) return <article className="of-chart-card empty"><h3>{title}</h3><p>No cumulative aggressor-balance path is available in this payload.</p></article>;
  const pointKey = 'cumulative_net_amt_rs';
  const finalKey = 'final_net_amt_rs';
  const domain = scale === 'tight' ? extent(pts.map((p) => n(p[pointKey])), 0.15, true) : zeroDomain(pts, pointKey);
  const ticks = timeTicks(pts, compact ? 5 : 6);
  const finalValue = series?.[finalKey] ?? pts.at(-1)?.[pointKey];
  const tone = balanceTone(finalValue);
  const strongestBuy = Math.max(...pts.map((p) => n(p[pointKey])), 0);
  const strongestSell = Math.min(...pts.map((p) => n(p[pointKey])), 0);

  return <article className={`of-chart-card aggressor-balance ${tone} ${compact ? 'compact' : ''}`}>
    <ChartHeader
      eyebrow="Order-flow balance"
      title={title}
      subtitle={subtitle}
      value={signed(finalValue, fmtRs)}
      change={finalValue >= 0 ? 'Positive means buy aggression led on amount.' : 'Negative means sell aggression led on amount.'}
      tone={tone}
    >
      {!compact && <div className="of-scale-toggle" role="group" aria-label="Aggressor-balance chart scale">
        <button className={scale === 'auto' ? 'active' : ''} onClick={() => setScale('auto')}>Zero centered</button>
        <button className={scale === 'tight' ? 'active' : ''} onClick={() => setScale('tight')}>Detail scale</button>
      </div>}
    </ChartHeader>

    <div className="of-turnover-stage balance-stage">
      <BalancePanel
        points={pts}
        pointKey={pointKey}
        domain={domain}
        ticks={ticks}
        title="Cumulative net aggressor amount"
        finalValue={finalValue}
        formatter={fmtRs}
        tone={tone}
      />
      <div className="of-axis-labels x">{ticks.map(({ idx, point }) => <span key={idx} style={{ left: `${pctX(idx, pts.length)}%` }}>{cleanTime(point.time_hhmm || point.time)}</span>)}</div>
    </div>

    {!compact && <div className="of-story-metrics five">
      <span><small>Buy aggressor</small><b className="buy">{fmtRs(series?.final_buy_amt_rs)}</b></span>
      <span><small>Sell aggressor</small><b className="sell">{fmtRs(series?.final_sell_amt_rs)}</b></span>
      <span><small>Ambiguous</small><b className="warn">{fmtRs(series?.final_ambig_amt_rs)}</b></span>
      <span><small>Strongest buy lead</small><b className="buy">{fmtRs(strongestBuy)}</b></span>
      <span><small>Strongest sell lead</small><b className="sell">{fmtRs(strongestSell)}</b></span>
    </div>}
  </article>;
}

export function ChartStoryBridge({ leftTitle, leftValue, rightTitle, rightValue, read }) {
  return <div className="of-story-bridge">
    <span><small>{leftTitle}</small><b>{leftValue}</b></span>
    <i />
    <span><small>{rightTitle}</small><b>{rightValue}</b></span>
    <p>{read}</p>
  </div>;
}
