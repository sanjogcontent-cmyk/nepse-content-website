import React, { useEffect, useMemo, useState } from 'react';
import { fmtInt, fmtRs, fmtPct, setRoute } from '../utils.js';
import { EvidenceBadge } from './Numbers.jsx';

async function copyText(text) {
  try {
    await navigator.clipboard?.writeText(text || '');
    return true;
  } catch {
    return false;
  }
}

function classifyHealth(issue) {
  const validation = issue?.validation || {};
  const market = issue?.market_summary || {};
  const unmapped = (validation.unmapped_symbols || []).length;
  const conf = Number(market.confidence_pct || 0);
  const expl = Number(market.explainability_pct || 0);
  const gaps = Number(market.gap_count || 0);
  if (unmapped > 0) return { label: 'Needs mapping review', tone: 'sell' };
  if (conf >= 85 && expl >= 85 && gaps === 0) return { label: 'High evidence issue', tone: 'buy' };
  if (conf >= 70 && expl >= 70) return { label: 'Medium evidence issue', tone: 'warn' };
  return { label: 'Lower evidence issue', tone: 'sell' };
}

export function IssueCommandDeck({ issue, sector, stock }) {
  const [copied, setCopied] = useState('');
  const y = issue?.youtube_package || {};
  const publicPath = `/daily/${issue.business_date}`;
  const sectorPath = `${publicPath}?sector=${encodeURIComponent(sector?.sector_name || '')}${stock?.symbol ? `&symbol=${encodeURIComponent(stock.symbol)}` : ''}`;

  async function copy(label, text) {
    await copyText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1400);
  }

  const videoUrl = y.youtube_url || issue?.publishing?.youtube_url || '';
  return (
    <section className="issue-command-deck panel" aria-label="Reader tools">
      <div>
        <p className="eyebrow">Reader navigation</p>
        <h2>{sector?.sector_name || 'Sector'} → {stock?.symbol || issue?.featured_stock?.symbol || 'Stock'}</h2>
        <p>Use this page as the public content layer. It summarises the day; the video and truth tools prove the details.</p>
      </div>
      <div className="issue-command-actions">
        <button className="secondary" onClick={() => copy('daily', window.location.origin + publicPath)}>{copied === 'daily' ? 'Copied daily link' : 'Copy daily link'}</button>
        <button className="secondary" onClick={() => copy('sector', window.location.origin + sectorPath)}>{copied === 'sector' ? 'Copied sector link' : 'Copy sector/stock link'}</button>
        <button className="secondary" onClick={() => setRoute(`/admin/daily/${issue.business_date}`)}>Open admin editor</button>
        {videoUrl ? <a className="primary as-button" href={videoUrl} target="_blank" rel="noreferrer">Open YouTube video</a> : <a className="primary as-button" href="#video">Prepare video block</a>}
      </div>
    </section>
  );
}

export function DataQualityRibbon({ issue }) {
  const market = issue?.market_summary || {};
  const health = classifyHealth(issue);
  return (
    <section className="quality-ribbon public-quality-ribbon" aria-label="Evidence summary">
      <div className={`quality-status tone-${health.tone}`}>
        <span>Evidence quality</span>
        <strong>{health.label}</strong>
      </div>
      <div className="quality-stat"><span>Confidence</span><b>{fmtPct(market.confidence_pct)}</b></div>
      <div className="quality-stat"><span>Explainability</span><b>{fmtPct(market.explainability_pct)}</b></div>
      <div className="quality-stat"><span>Flags</span><b>Gap {fmtInt(market.gap_count)} · Wipe {fmtInt(market.wipe_count)} · Lock {fmtInt(market.upper_lock_count)}/{fmtInt(market.lower_lock_count)}</b></div>
      <div className="quality-stat wide"><span>Boundary</span><b>Summary only · Video proves deeper context</b></div>
    </section>
  );
}

export function StoryTensionStrip({ issue, sector, stock }) {
  const market = issue?.market_summary || {};
  const sm = stock?.summary || {};
  const sectorSummary = sector?.summary || {};
  const items = [
    { label: 'Market net pressure', value: fmtInt(market.net_aggr_qty), tone: Number(market.net_aggr_qty || 0) >= 0 ? 'buy' : 'sell' },
    { label: 'Sector net pressure', value: fmtInt(sectorSummary.net_aggr_qty), tone: Number(sectorSummary.net_aggr_qty || 0) >= 0 ? 'buy' : 'sell' },
    { label: 'Stock net pressure', value: fmtInt(sm.net_aggr_qty), tone: Number(sm.net_aggr_qty || 0) >= 0 ? 'buy' : 'sell' },
    { label: 'Stock turnover', value: fmtRs(sm.trade_amt_rs), tone: 'neutral' },
  ];
  return (
    <section className="story-tension-strip" aria-label="Market sector stock story bridge">
      {items.map(item => <div className={`story-tension-card tone-${item.tone}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
    </section>
  );
}

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = Math.max(1, h.scrollHeight - h.clientHeight);
      setProgress(Math.min(100, Math.max(0, (h.scrollTop / max) * 100)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return <div className="reading-progress" aria-hidden="true"><i style={{ width: `${progress}%` }} /></div>;
}

export function EmptyState({ title = 'No data available', body = 'Generate the daily issue payload and try again.', action }) {
  return (
    <section className="panel empty-state">
      <div className="empty-icon">MTA</div>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}

export function ProductionPolishNote() {
  return (
    <section className="panel production-polish-note">
      <p className="eyebrow">Production polish</p>
      <h2>Page purpose</h2>
      <p>This public issue is designed to tease the reader with clean market, sector, and stock summaries. It intentionally avoids dumping broker-level proof on the page. The detailed truth remains in your video, Truth Viewer, replay, and order-flow platform.</p>
      <div className="polish-principles">
        <span><b>Summarise</b> market and sector.</span>
        <span><b>Focus</b> one featured stock.</span>
        <span><b>Prove</b> inside video/tools.</span>
      </div>
    </section>
  );
}
