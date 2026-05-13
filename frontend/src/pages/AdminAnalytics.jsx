import React, { useEffect, useMemo, useState } from 'react';
import { loadJson, setRoute } from '../utils.js';
import { ContentOpportunityTable, FunnelChart, MetricCard, SearchTermsTable, TopSectorsTable, TopStocksTable, VideoConversionCard } from '../components/analytics/AnalyticsCards.jsx';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
async function apiJson(path) { return loadJson(`${API_BASE}${path}`); }

function EmptyAnalytics({ date }) {
  return <div className="analytics-empty panel"><h2>No analytics yet</h2><p>Open the public daily issue and click sectors, stocks, and the video block. Phase 8 tracks only privacy-safe content interactions.</p><button className="primary" onClick={() => setRoute(`/daily/${date}`)}>Open public issue</button></div>;
}

export default function AdminAnalytics({ issue }) {
  const date = issue?.business_date;
  const [metrics, setMetrics] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [video, setVideo] = useState(null);
  const [search, setSearch] = useState([]);
  const [opps, setOpps] = useState([]);
  const [insights, setInsights] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancel = false;
    async function run() {
      setError('');
      try {
        const [m, f, sec, st, vid, srch, opp, ins] = await Promise.all([
          apiJson(`/api/analytics/daily/${date}`),
          apiJson(`/api/analytics/daily/${date}/funnel`),
          apiJson(`/api/analytics/daily/${date}/sectors`),
          apiJson(`/api/analytics/daily/${date}/stocks`),
          apiJson(`/api/analytics/daily/${date}/video`),
          apiJson(`/api/analytics/daily/${date}/search`),
          apiJson(`/api/analytics/admin/content-opportunities?business_date=${encodeURIComponent(date)}`),
          apiJson(`/api/analytics/daily/${date}/insights`),
        ]);
        if (!cancel) { setMetrics(m); setFunnel(f); setSectors(sec.items || []); setStocks(st.items || []); setVideo(vid); setSearch(srch.items || []); setOpps(opp.items || []); setInsights(ins.insights || []); }
      } catch (e) {
        if (!cancel) setError(String(e.message || e));
      }
    }
    if (date) run();
    return () => { cancel = true; };
  }, [date]);

  const hasAny = useMemo(() => Number(metrics?.issue_views || 0) + sectors.length + stocks.length > 0, [metrics, sectors, stocks]);

  return <main className="analytics-page phase8-page">
    <section className="panel analytics-hero">
      <p className="eyebrow">Phase 8 · Reader analytics</p>
      <h1>Content intelligence for {date}</h1>
      <p className="lead">This dashboard shows what readers cared about: sectors opened, stocks clicked, video conversion, search demand, archive interest, and next content opportunities.</p>
      <div className="analytics-actions"><button className="primary" onClick={() => setRoute(`/daily/${date}`)}>Open daily issue</button><button className="secondary" onClick={() => setRoute(`/admin/daily/${date}`)}>Open editor</button></div>
      {error && <p className="phase8-error">Backend analytics is not reachable yet: {error}</p>}
    </section>

    {hasAny ? <>
      <section className="analytics-metrics-grid">
        <MetricCard label="Issue views" value={metrics?.issue_views || 0} />
        <MetricCard label="Unique sessions" value={metrics?.unique_sessions || 0} />
        <MetricCard label="Sector clicks" value={metrics?.sector_clicks || 0} />
        <MetricCard label="Stock clicks" value={metrics?.stock_clicks || 0} />
        <MetricCard label="YouTube clicks" value={metrics?.youtube_clicks || 0} tone="buy" />
        <MetricCard label="Avg reading sec" value={metrics?.avg_reading_seconds || 0} />
      </section>
      <section className="analytics-insights panel"><p className="eyebrow">Actionable insights</p><h2>What this means for content</h2><ul>{insights.map((x, i) => <li key={i}>{x}</li>)}</ul></section>
      <FunnelChart funnel={funnel} />
      <div className="analytics-two"><TopSectorsTable items={sectors} /><TopStocksTable items={stocks} /></div>
      <div className="analytics-two"><VideoConversionCard video={video} /><SearchTermsTable items={search} /></div>
      <ContentOpportunityTable items={opps} />
    </> : <EmptyAnalytics date={date} />}

    <section className="panel analytics-privacy-note">
      <p className="eyebrow">Privacy rule</p>
      <h2>Track content behavior, not private users</h2>
      <p>Phase 8 uses anonymous session IDs and aggregated content events. It does not track holdings, broker accounts, exact personal identity, keystrokes, or invasive fingerprints.</p>
    </section>
  </main>;
}
