import React from 'react';
import { trackEvent } from '../analytics/tracker.js';

function CopyButton({ text, label = 'Copy', eventName, eventPayload = {} }) {
  return <button className="copy-btn" onClick={() => { navigator.clipboard?.writeText(text || ''); if (eventName) trackEvent(eventName, eventPayload); }}>{label}</button>;
}

function youtubeEmbedUrl(url) {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return `https://www.youtube.com/embed/${u.pathname.replace('/', '')}`;
    const id = u.searchParams.get('v');
    if (id) return `https://www.youtube.com/embed/${id}`;
  } catch (_) {}
  return '';
}

function VideoPlaceholder({ pkg }) {
  const title = pkg?.title_options?.[0] || 'NEPSE daily order-flow video';
  return (
    <div className="video-placeholder phase4-video-placeholder">
      <div className="thumbnail-frame phase4-thumb">
        <span className="thumb-brand">MTA</span>
        <strong>{pkg?.thumbnail_text_options?.[0] || 'ORDER FLOW TRUTH'}</strong>
        <em>{pkg?.thumbnail_text_options?.[1] || 'MARKET · SECTOR · STOCK'}</em>
      </div>
      <div className="video-promise">
        <p className="eyebrow">Video proof block</p>
        <h3>{title}</h3>
        <p>{pkg?.hook || 'The public page summarises the story. The video should prove it with Truth Viewer, bucket replay, broker role, ladder transition, and order-flow platform evidence.'}</p>
        <div className="video-mini-tags">
          <span>{pkg?.featured_symbol || 'Stock'}</span>
          <span>{pkg?.featured_sector || 'Sector'}</span>
          <span>Bucket + Broker Proof</span>
        </div>
      </div>
    </div>
  );
}

function CopyRows({ title, rows = [], publicMode = false }) {
  if (!rows?.length) return null;
  return (
    <div>
      <h3>{title}</h3>
      {rows.map((t) => <div className="copy-row" key={typeof t === 'string' ? t : JSON.stringify(t)}><span>{typeof t === 'string' ? t : t.title || t.label}</span>{!publicMode && <CopyButton text={typeof t === 'string' ? t : JSON.stringify(t)} eventName={title.toLowerCase().includes('title') ? 'youtube_title_copied' : undefined} />}</div>)}
    </div>
  );
}

export default function VideoPackage({ pkg, publicMode = false }) {
  if (!pkg) return null;
  const embed = youtubeEmbedUrl(pkg.youtube_url || pkg.url || pkg.embed_url);
  const titleRows = publicMode ? pkg.title_options?.slice(0, 1) : pkg.title_options;
  return (
    <section className="panel video-package phase4-video-package" id="video">
      <div className="panel-head">
        <div>
          <p className="eyebrow">YouTube production block</p>
          <h2>{publicMode ? 'Watch the deeper proof' : 'Same daily issue → video assets'}</h2>
          <p>{publicMode ? 'The page teases the story. The video should prove it with the Truth Viewer and Order Flow Platform.' : 'Copy titles, hook, chapters, description, pinned comment, shorts ideas, and recording blueprint.'}</p>
        </div>
        {!publicMode && <CopyButton text={JSON.stringify(pkg, null, 2)} label="Copy full package" eventName="youtube_package_copied" eventPayload={{ business_date: pkg.business_date, symbol: pkg.featured_symbol }} />}
      </div>

      {publicMode && (embed ? <div className="video-embed"><iframe title="NEPSE MTA video" src={embed} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen /></div> : <VideoPlaceholder pkg={pkg} />)}
      {publicMode && (pkg.youtube_url || pkg.url) && <a className="primary as-button video-watch-btn" href={pkg.youtube_url || pkg.url} target="_blank" rel="noreferrer" onClick={() => trackEvent('youtube_clicked', { business_date: pkg.business_date, symbol: pkg.featured_symbol, sector_name: pkg.featured_sector, video_id: pkg.video_id || null })}>Open on YouTube</a>}

      <div className="yt-grid public-yt-grid phase4-yt-grid">
        <CopyRows title={publicMode ? 'Suggested video title' : 'Title options'} rows={titleRows} publicMode={publicMode} />
        <div>
          <h3>Thumbnail text</h3>
          <div className="thumb-options">{pkg.thumbnail_text_options?.map(t => <span key={t}>{t}</span>)}</div>
          {pkg.thumbnail_direction && !publicMode && <p className="muted small-text">{pkg.thumbnail_direction.layout}</p>}
        </div>
        <div className="wide">
          <h3>Opening hook</h3><p>{pkg.hook}</p>{!publicMode && <CopyButton text={pkg.hook} eventName="youtube_hook_copied" eventPayload={{ business_date: pkg.business_date, symbol: pkg.featured_symbol }} />}
        </div>
        {pkg.opening_script && !publicMode && <div className="wide"><h3>Opening script</h3><p>{pkg.opening_script}</p><CopyButton text={pkg.opening_script} eventName="youtube_opening_script_copied" eventPayload={{ business_date: pkg.business_date, symbol: pkg.featured_symbol }} /></div>}
        <div className="wide">
          <h3>Video chapters</h3>
          <ol className="chapters">{pkg.chapters?.map(c => <li key={`${c.time}-${c.title}`}><strong>{c.time}</strong> {c.title}</li>)}</ol>
          {!publicMode && <CopyButton text={(pkg.chapters || []).map(c => `${c.time} ${c.title}`).join('\n')} label="Copy chapters" eventName="youtube_chapters_copied" eventPayload={{ business_date: pkg.business_date, symbol: pkg.featured_symbol }} />}
        </div>
        {pkg.recording_blueprint?.length > 0 && <div className="wide phase4-recording-card">
          <h3>Recording blueprint</h3>
          <ol className="recording-list">{pkg.recording_blueprint.map((x, i) => <li key={i}>{x}</li>)}</ol>
        </div>}
        {!publicMode && pkg.proof_checklist?.length > 0 && <div className="wide phase4-checklist-card">
          <h3>Proof checklist</h3>
          <ul className="proof-checklist">{pkg.proof_checklist.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>}
        {!publicMode && <div className="wide"><h3>Description</h3><p className="preline">{pkg.description}</p><CopyButton text={pkg.description} eventName="youtube_description_copied" eventPayload={{ business_date: pkg.business_date, symbol: pkg.featured_symbol }} /></div>}
        {!publicMode && <div className="wide"><h3>Pinned comment</h3><p>{pkg.pinned_comment}</p><CopyButton text={pkg.pinned_comment} eventName="pinned_comment_copied" eventPayload={{ business_date: pkg.business_date, symbol: pkg.featured_symbol }} /></div>}
        {!publicMode && pkg.shorts_clips?.length > 0 && <div className="wide"><h3>Short clips</h3><div className="shorts-grid">{pkg.shorts_clips.map((x) => <span key={x.title}><b>{x.title}</b><em>{x.duration_hint}</em></span>)}</div></div>}
        {!publicMode && pkg.community_post && <div className="wide"><h3>Community post</h3><p>{pkg.community_post}</p><CopyButton text={pkg.community_post} eventName="community_post_copied" eventPayload={{ business_date: pkg.business_date, symbol: pkg.featured_symbol }} /></div>}
      </div>
    </section>
  );
}
