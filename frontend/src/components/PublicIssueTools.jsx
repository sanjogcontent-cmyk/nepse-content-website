import React, { useState } from 'react';
import { trackEvent } from '../analytics/tracker.js';

async function copyText(text) {
  try {
    await navigator.clipboard?.writeText(text || '');
    return true;
  } catch {
    return false;
  }
}

export default function PublicIssueTools({ issue, sector, stock }) {
  const [copied, setCopied] = useState('');
  if (!issue) return null;
  const publicPath = `/daily/${issue.business_date}`;
  const sectorPath = `${publicPath}?sector=${encodeURIComponent(sector?.sector_name || '')}${stock?.symbol ? `&symbol=${encodeURIComponent(stock.symbol)}` : ''}`;
  const videoUrl = issue?.publishing?.youtube_url || issue?.youtube_package?.youtube_url || '';

  async function copy(label, text, eventName) {
    await copyText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1400);
    if (eventName) trackEvent(eventName, { business_date: issue.business_date, sector_name: sector?.sector_name, symbol: stock?.symbol });
  }

  return (
    <section className="public-issue-tools panel" aria-label="Reader tools">
      <div>
        <p className="eyebrow">Reader tools</p>
        <h2>{sector?.sector_name || 'Sector'} → {stock?.symbol || issue?.featured_stock?.symbol || 'Stock'}</h2>
        <p>This page is the public daily summary: market, sector, stock teaser, and video link. Admin scoring, production notes, and analytics stay out of the reader view.</p>
      </div>
      <div className="issue-command-actions">
        <button className="secondary" onClick={() => copy('daily', window.location.origin + publicPath, 'daily_deep_link_copied')}>{copied === 'daily' ? 'Copied daily link' : 'Copy daily link'}</button>
        <button className="secondary" onClick={() => copy('sector', window.location.origin + sectorPath, 'stock_deep_link_copied')}>{copied === 'sector' ? 'Copied sector/stock link' : 'Copy sector/stock link'}</button>
        {videoUrl ? <a className="primary as-button" href={videoUrl} target="_blank" rel="noreferrer" onClick={() => trackEvent('youtube_clicked', { business_date: issue.business_date, symbol: issue.featured_stock?.symbol, sector_name: issue.featured_stock?.sector_name })}>Open YouTube video</a> : <a className="primary as-button" href="#video">Video coming soon</a>}
      </div>
    </section>
  );
}
