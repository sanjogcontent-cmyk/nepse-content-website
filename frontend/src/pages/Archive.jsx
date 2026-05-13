import React, { useEffect, useMemo, useState } from 'react';
import { setRoute, fmtRs, fmtInt, loadJson } from '../utils.js';
import { EvidenceBadge } from '../components/Numbers.jsx';

function ArchiveCard({ item }) {
  const buy = Number(item.buy_aggr_amt_rs || 0);
  const sell = Number(item.sell_aggr_amt_rs || 0);
  const ambig = Number(item.ambig_amt_rs || 0);
  const total = Math.max(buy + sell + ambig, 1);
  const bp = Math.max(0, buy / total * 100);
  const sp = Math.max(0, sell / total * 100);
  const ap = Math.max(0, 100 - bp - sp);
  return (
    <article className="archive-card panel archive-card-v4" onClick={() => setRoute(item.url)}>
      <div className="archive-story">
        <div className="archive-card-top"><span>{item.business_date}</span><EvidenceBadge label={item.evidence_label} /></div>
        <h2>{item.title}</h2>
        <p>{item.description || 'Daily order-flow story with market, sector, stock and flow-bias context.'}</p>
        <div className="real-stack archive-stack"><i className="buy" style={{width:`${bp}%`}}/><i className="sell" style={{width:`${sp}%`}}/><i className="warn" style={{width:`${ap}%`}}/></div>
      </div>
      <div className="archive-metrics">
        <span>Trade Amt <b>{fmtRs(item.trade_amt_rs)}</b></span>
        <span>Trade Qty <b>{fmtInt(item.trade_qty)}</b></span>
        <span>Buy Agg <b className="buy">{fmtRs(item.buy_aggr_amt_rs)}</b></span>
        <span>Sell Agg <b className="sell">{fmtRs(item.sell_aggr_amt_rs)}</b></span>
        <span>Featured <b>{item.featured_symbol || '—'}</b></span>
        <span>Top Sector <b>{item.top_sector || '—'}</b></span>
      </div>
    </article>
  );
}

export default function Archive({ issue }) {
  const [archive, setArchive] = useState({ items: [] });
  const [query, setQuery] = useState('');
  const [bias, setBias] = useState('all');

  useEffect(() => {
    let cancel = false;
    async function run() {
      try {
        const data = await loadJson('/content/indexes/daily.index.json');
        if (!cancel) setArchive(data);
      } catch {
        if (!cancel) setArchive({ items: issue?.archive_entry ? [issue.archive_entry] : [{
          business_date: issue.business_date,
          url: `/daily/${issue.business_date}`,
          title: issue.article?.title,
          description: issue.article?.hero_thesis,
          trade_amt_rs: issue.market_summary?.trade_amt_rs,
          trade_qty: issue.market_summary?.trade_qty,
          featured_symbol: issue.featured_stock?.symbol,
          top_sector: issue.sectors?.[0]?.sector_name,
          evidence_label: issue.market_summary?.evidence_label,
          market_bias: issue.market_summary?.bias,
        }] });
      }
    }
    run();
    return () => { cancel = true; };
  }, [issue]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (archive.items || []).filter(item => {
      const hay = `${item.business_date} ${item.title} ${item.description} ${item.featured_symbol} ${item.top_sector}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (bias !== 'all' && item.market_bias !== bias) return false;
      return true;
    });
  }, [archive, query, bias]);

  return (
    <main className="archive-page phase6-page">
      <section className="panel archive-head phase6-hero">
        <p className="eyebrow">Daily archive</p>
        <h1>Daily issue archive</h1>
        <p className="lead">Every market summary becomes a durable publication entry, searchable by date, featured stock, leading sector, and flow bias.</p>
        <div className="archive-tabs">
          <button className="active" onClick={() => setRoute('/daily')}>Daily issues</button>
          <button onClick={() => setRoute('/weekly')}>Weekly</button>
          <button onClick={() => setRoute('/stocks')}>Stock stories</button>
          <button onClick={() => setRoute('/sectors')}>Sector archive</button>
          <button onClick={() => setRoute('/videos')}>Videos</button>
        </div>
      </section>
      <section className="panel archive-filters">
        <label><span>Search</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="date, stock, sector, title" /></label>
        <label><span>Market bias</span><select value={bias} onChange={e => setBias(e.target.value)}><option value="all">All</option><option value="buy">Buy</option><option value="sell">Sell</option><option value="mixed">Mixed</option></select></label>
        <div className="archive-count"><b>{items.length}</b><span>issues</span></div>
      </section>
      <section className="archive-list">
        {items.map(item => <ArchiveCard key={item.business_date} item={item} />)}
      </section>
    </main>
  );
}
