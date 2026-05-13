import React, { useEffect, useMemo, useState } from 'react';
import { loadJson, setRoute } from '../utils.js';

export default function VideoArchive({ issue }) {
  const [data, setData] = useState({ items: [] });
  const [query, setQuery] = useState('');
  useEffect(() => {
    let cancel = false;
    loadJson('/content/indexes/videos.index.json')
      .then(d => { if (!cancel) setData(d); })
      .catch(() => { if (!cancel) setData({ items: [{
        business_date: issue.business_date,
        title: issue.youtube_package?.title_options?.[0] || issue.article?.title,
        description: issue.youtube_package?.description,
        featured_symbol: issue.featured_stock?.symbol,
        featured_sector: issue.featured_stock?.sector_name,
        url: `/daily/${issue.business_date}#video`,
        youtube_url: issue.publishing?.youtube_url || issue.youtube_package?.youtube_url || '',
        thumbnail_text_options: issue.youtube_package?.thumbnail_text_options || [],
        chapters: issue.youtube_package?.chapters || [],
        tags: issue.youtube_package?.tags || [],
        status: issue.publishing?.status || 'draft',
      }] }); });
    return () => { cancel = true; };
  }, [issue]);

  const items = useMemo(() => {
    const q = query.toLowerCase();
    return (data.items || []).filter(v => (v.youtube_url || v.status === 'published' || v.status === 'video_uploaded')).filter(v => `${v.business_date} ${v.title} ${v.featured_symbol} ${v.featured_sector}`.toLowerCase().includes(q));
  }, [data, query]);

  return (
    <main className="phase6-page video-archive-page">
      <section className="panel phase6-hero">
        <p className="eyebrow">Video archive</p>
        <h1>YouTube proof archive</h1>
        <p className="lead">Finished videos are linked back to the exact daily issue and featured stock. Draft title ideas and production notes stay inside the admin editor.</p>
        <div className="archive-tabs"><button onClick={() => setRoute('/daily')}>Daily</button><button onClick={() => setRoute('/weekly')}>Weekly</button><button onClick={() => setRoute('/stocks')}>Stocks</button><button onClick={() => setRoute('/sectors')}>Sectors</button><button className="active">Videos</button></div>
      </section>
      <section className="panel archive-filters"><label><span>Search videos</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="stock, sector, date, title" /></label><div className="archive-count"><b>{items.length}</b><span>published videos</span></div></section>
      <section className="video-archive-grid">
        {items.length === 0 && <div className="panel empty-state"><h2>No public videos yet</h2><p>Add a YouTube URL in the admin editor after recording your own analysis. Draft video packages stay hidden from the public archive.</p></div>}
        {items.map((v,i) => <article className="panel video-archive-card" key={`${v.business_date}-${i}`}>
          <div className="video-thumb-box"><b>{v.thumbnail_text_options?.[0] || 'ORDER FLOW'}</b><span>{v.featured_symbol}</span></div>
          <p className="eyebrow">{v.business_date} · {v.status}</p>
          <h2>{v.title}</h2>
          <p>{v.description}</p>
          <div className="video-archive-actions"><button className="primary" onClick={() => setRoute(v.url)}>Open issue video block</button>{v.youtube_url && <a className="secondary as-button" href={v.youtube_url} target="_blank" rel="noreferrer">Open YouTube</a>}</div>
          <small>{(v.chapters || []).length} chapters · {(v.tags || []).slice(0, 6).join(', ')}</small>
        </article>)}
      </section>
    </main>
  );
}
