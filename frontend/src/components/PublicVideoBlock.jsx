import React from 'react';
import { trackEvent } from '../analytics/tracker.js';

function youtubeEmbedUrl(url = '') {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`;
    const id = u.searchParams.get('v');
    if (id) return `https://www.youtube.com/embed/${id}`;
    if (u.pathname.includes('/embed/')) return url;
  } catch {}
  return '';
}

export default function PublicVideoBlock({ issue }) {
  const pkg = issue?.youtube_package || {};
  const publishing = issue?.publishing || {};
  const url = publishing.youtube_url || pkg.youtube_url || pkg.url || '';
  const embed = youtubeEmbedUrl(url);
  const title = (pkg.title_options || [issue?.article?.title || 'NEPSE daily stock analysis'])[0];
  return (
    <section className="panel public-video-block" id="video">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Video analysis</p>
          <h2>{embed ? title : 'Video coming soon'}</h2>
          <p>The written page gives the daily market, sector, and stock summary. Your video should go deeper using the NEPSE Truth Viewer, Order Flow Platform, bucket replay, broker role context, and PRE → POST evidence.</p>
        </div>
      </div>
      {embed ? (
        <>
          <div className="video-embed"><iframe title="NEPSE MTA video" src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div>
          <a className="primary as-button video-watch-btn" href={url} target="_blank" rel="noreferrer" onClick={() => trackEvent('youtube_clicked', { business_date: issue.business_date, symbol: issue.featured_stock?.symbol, sector_name: issue.featured_stock?.sector_name, video_id: pkg.video_id || null })}>Open on YouTube</a>
        </>
      ) : (
        <div className="video-coming-soon">
          <strong>No public YouTube video has been added yet.</strong>
          <p>After you record your own analysis, paste the YouTube URL in the admin editor. Until then, readers see this clean coming-soon block instead of internal title ideas, thumbnail drafts, or production notes.</p>
        </div>
      )}
      <div className="public-video-covers">
        <span>Market summary</span>
        <span>Sector context</span>
        <span>Featured stock behavior</span>
        <span>Bucket/replay proof in video</span>
      </div>
    </section>
  );
}
