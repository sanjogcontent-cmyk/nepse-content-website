import React, { useEffect, useMemo, useState } from 'react';
import { loadJson, setRoute, fmtRs, fmtInt, fmtPct, fmtPx } from '../utils.js';

const n = (v) => Number(v || 0);
const pct = (a, b) => b ? (n(a) / b) * 100 : 0;
const summary = (row) => row.summary || row || {};
function flattenIssueStocks(issue) {
  return (issue?.sectors || []).flatMap(sec => (sec.stocks || []).map(st => ({
    ...st,
    sector_name: st.sector_name || sec.sector_name,
    business_date: issue.business_date,
    summary: st.summary || {},
    ...(st.summary || {})
  })));
}
function flattenIndex(index) {
  return Object.values(index.items || {}).flatMap(node => (node.entries || []).map(e => ({
    ...e,
    company_name: e.company_name || node.company_name,
    sector_name: e.sector_name || node.sector_name,
    summary: e
  })));
}
function val(row, key) {
  const s = summary(row);
  if (key === 'close') return n(s.ltp_rs ?? s.close_rs);
  if (key === 'change_pct') return n(s.change_pct);
  if (key === 'turnover') return n(s.trade_amt_rs);
  if (key === 'volume') return n(s.trade_qty);
  if (key === 'transactions') return n(s.transactions);
  if (key === 'activity') return n(s.buckets || s.matched_buckets);
  if (key === 'buy') return n(s.buy_aggr_amt_rs);
  if (key === 'sell') return n(s.sell_aggr_amt_rs);
  if (key === 'net') return n(s.net_aggr_amt_rs);
  if (key === 'abs_net') return Math.abs(n(s.net_aggr_amt_rs));
  if (key === 'ambig') return n(s.ambig_amt_rs);
  if (key === 'same') return n(s.same_broker_turnover_pct);
  return n(s[key]);
}
function top(rows, key, dir = 'desc', count = 5) {
  return [...rows].sort((a, b) => dir === 'desc' ? val(b, key) - val(a, key) : val(a, key) - val(b, key)).slice(0, count);
}
const TEXT_SORT_KEYS = new Set(['stock', 'sector', 'read', 'evidence']);
function sortValue(row, key) {
  const s = summary(row);
  if (key === 'stock') return `${row.symbol || ''} ${row.company_name || row.security_name || ''}`.trim();
  if (key === 'sector') return row.sector_name || '';
  if (key === 'ltp') return n(s.ltp_rs ?? s.close_rs);
  if (key === 'change') return n(s.change_pct);
  if (key === 'turnover') return n(s.trade_amt_rs);
  if (key === 'volume') return n(s.trade_qty);
  if (key === 'transactions') return n(s.transactions || s.buckets || s.matched_buckets);
  if (key === 'net') return n(s.net_aggr_amt_rs);
  if (key === 'buy') return n(s.buy_aggr_amt_rs);
  if (key === 'sell') return n(s.sell_aggr_amt_rs);
  if (key === 'same') return n(s.same_broker_turnover_pct);
  if (key === 'read') return flowClass(row).label || '';
  if (key === 'evidence') return `${s.evidence_label || ''} ${n(s.confidence_pct)} ${n(s.explainability_pct)}`;
  return val(row, key);
}
function defaultSortDirection(key) {
  return TEXT_SORT_KEYS.has(key) ? 'asc' : 'desc';
}
function compareRowsBySort(a, b, key, direction = 'desc') {
  const av = sortValue(a, key);
  const bv = sortValue(b, key);
  let out;
  if (typeof av === 'string' || typeof bv === 'string') {
    out = String(av || '').localeCompare(String(bv || ''), undefined, { numeric: true, sensitivity: 'base' });
  } else {
    out = n(av) - n(bv);
  }
  return direction === 'asc' ? out : -out;
}
function SortableTh({ label, sortKey, activeKey, direction, onSort }) {
  const active = activeKey === sortKey;
  return <th>
    <button
      type="button"
      className={`table-sort-btn ${active ? 'active' : ''}`}
      onClick={() => onSort(sortKey)}
      title={`Sort by ${label}`}
    >
      <span>{label}</span>
      <em>{active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</em>
    </button>
  </th>;
}
function amountTone(v) { return n(v) >= 0 ? 'buy' : 'sell'; }
function flowClass(row) {
  const s = summary(row);
  const priceUp = n(s.change_pct) >= 0;
  const buyDom = n(s.net_aggr_amt_rs || s.net_aggr_qty) >= 0;
  if (priceUp && buyDom) return { key: 'healthy', label: 'Confirms upside', tone: 'buy', title: 'Price up + buy flow' };
  if (priceUp && !buyDom) return { key: 'resilience', label: 'Price up, sellers active', tone: 'same', title: 'Price up vs sell flow' };
  if (!priceUp && !buyDom) return { key: 'clean-sell', label: 'Confirms downside', tone: 'sell', title: 'Price down + sell flow' };
  return { key: 'failed-buying', label: 'Buy support failed', tone: 'warn', title: 'Price down vs buy flow' };
}
function sameBrokerAmount(scope) { return scope?.same_broker_amt_rs ?? scope?.same_broker_matched_amt_rs ?? scope?.same_broker_turnover_rs ?? null; }
function MixBar({ row }) {
  const s = summary(row);
  const total = Math.max(n(s.buy_aggr_amt_rs) + n(s.sell_aggr_amt_rs) + n(s.ambig_amt_rs), 1);
  return <span className="stock-mix-mini">
    <i className="buy" style={{ width: `${pct(s.buy_aggr_amt_rs, total)}%` }} />
    <i className="sell" style={{ width: `${pct(s.sell_aggr_amt_rs, total)}%` }} />
    <i className="warn" style={{ width: `${pct(s.ambig_amt_rs, total)}%` }} />
  </span>;
}
function Sparkline({ points = [], field = 'indexValue' }) {
  const vals = points.map(p => n(p[field])).filter(Number.isFinite);
  if (vals.length < 2) return <div className="presentation-empty-spark">No index history</div>;
  const w = 340, h = 86, pad = 10, min = Math.min(...vals), max = Math.max(...vals), span = Math.max(max - min, 1);
  const line = vals.map((v, i) => `${pad + i * (w - pad * 2) / (vals.length - 1)},${h - pad - ((v - min) / span) * (h - pad * 2)}`).join(' ');
  const up = vals[vals.length - 1] >= vals[0];
  return <svg className={`presentation-spark ${up ? 'buy' : 'sell'}`} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none"><polyline points={line} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function MarketContext({ issue, indexHistory }) {
  const m = issue?.market_summary || {}, idx = issue?.market_index || {};
  const nepse = indexHistory?.by_code?.NEPSE || [];
  const buyShare = pct(m.buy_aggr_amt_rs, Math.max(n(m.buy_aggr_amt_rs) + n(m.sell_aggr_amt_rs) + n(m.ambig_amt_rs), 1));
  const sellShare = pct(m.sell_aggr_amt_rs, Math.max(n(m.buy_aggr_amt_rs) + n(m.sell_aggr_amt_rs) + n(m.ambig_amt_rs), 1));
  return <section className="presentation-hero stock-index-hero-clean">
    <div className="presentation-hero-copy">
      <p className="eyebrow">Stock presentation board · {issue?.business_date}</p>
      <h1>Stocks, but organized as stories</h1>
      <p>Start with the normal market board, then read the order-flow layer: price movement, turnover, volume, buy/sell aggression, same-broker context and evidence quality.</p>
      <div className="presentation-mix-legend hero-inline">
        <span><b className="buy">Buy</b>{fmtPct(buyShare)}</span>
        <span><b className="sell">Sell</b>{fmtPct(sellShare)}</span>
        <span><b>Turnover</b>{fmtRs(m.trade_amt_rs)}</span>
        <span><b>Same-broker</b>{fmtPct(m.same_broker_turnover_pct)}</span>
      </div>
    </div>
    <div className="presentation-hero-scoreboard stock-scoreboard">
      <article className="presentation-kpi"><span>NEPSE Index</span><strong>{idx.close ? fmtInt(idx.close) : '—'}</strong><small className={amountTone(idx.change)}>{idx.change != null ? `${idx.change >= 0 ? '+' : ''}${idx.change.toFixed(2)} · ${fmtPct(idx.change_pct)}` : 'index DB'}</small></article>
      <article className="presentation-kpi"><span>Market flow</span><strong className={amountTone(m.net_aggr_amt_rs)}>{n(m.net_aggr_amt_rs) >= 0 ? 'Buy-led' : 'Sell-led'}</strong><small>{fmtRs(m.net_aggr_amt_rs)}</small></article>
      <Sparkline points={nepse.slice(-30)} />
    </div>
  </section>;
}
function HeroStockCard({ title, row, metric, body }) {
  if (!row) return null;
  const fc = flowClass(row), s = summary(row);
  return <button className="stock-story-card" onClick={() => setRoute(`/stocks/${row.symbol}?date=${row.business_date}`)}>
    <div className="stock-story-top"><small>{title}</small><strong>{row.symbol}</strong><em>{row.company_name || row.security_name || row.sector_name}</em></div>
    <div className="stock-story-metric"><b>{metric(row)}</b><span className={fc.tone}>{fc.label}</span></div>
    <MixBar row={row} />
    <p>{body}</p>
    <span className="open-link">Open stock story →</span>
  </button>;
}
function QuickCard({ title, rows, metricFn, tone }) {
  const r = rows?.[0];
  return <article className={`stock-quick-card ${tone || ''}`}>{r ? <>
    <small>{title}</small>
    <strong>{r.symbol}</strong>
    <b>{metricFn(r)}</b>
    <MixBar row={r} />
    <span>{flowClass(r).label}</span>
  </> : <><small>{title}</small><strong>—</strong></>}</article>;
}
function LeaderRow({ row, rank, metric }) {
  const fc = flowClass(row), s = summary(row), same = sameBrokerAmount(s);
  return <button className="stock-leader-row" onClick={() => setRoute(`/stocks/${row.symbol}?date=${row.business_date}`)}>
    <b className="rank">{rank}</b>
    <strong>{row.symbol}<small>{row.sector_name}</small></strong>
    <span>{metric}</span>
    <em className={fc.tone}>{fc.label}</em>
    <small className="same-mini">Same {same == null ? '—' : fmtPct(s.same_broker_turnover_pct)}</small>
  </button>;
}
function LeaderList({ rows, metricFn }) {
  return <div className="stock-leader-list">{rows.map((r, i) => <LeaderRow key={`${r.symbol}-${i}`} row={r} rank={i + 1} metric={metricFn(r)} />)}</div>;
}
function BehaviorMap({ groups }) {
  const defs = [
    ['healthy', 'Confirmed upside', 'buy', 'Price increased while buy aggression led.'],
    ['resilience', 'Absorption / resilience', 'same', 'Price increased even though sellers were active.'],
    ['cleanSell', 'Confirmed downside', 'sell', 'Price fell while sell aggression led.'],
    ['failed', 'Failed buy support', 'warn', 'Buy pressure appeared but price still fell.']
  ];
  return <section className="stock-behavior-grid">{defs.map(([key, label, tone, body]) => {
    const rows = groups[key] || [];
    return <article className={`stock-behavior-card ${tone}`} key={key}>
      <div><strong>{label}</strong><b>{fmtInt(rows.length)}</b></div>
      <p>{body}</p>
      <div>{rows.slice(0, 5).map(r => <button key={r.symbol} onClick={() => setRoute(`/stocks/${r.symbol}?date=${r.business_date}`)}>{r.symbol}<span>{fmtPct(summary(r).change_pct)}</span></button>)}</div>
    </article>;
  })}</section>;
}
function ExportStrip({ rows, date }) {
  return <section className="presentation-panel stock-export-clean"><div><p className="eyebrow">Presentation block</p><h2>Screenshot-ready top movers · {date}</h2><p>Use this as a compact social or video script block: price first, order-flow explanation second.</p></div><ol>{rows.slice(0, 5).map((r, i) => <li key={r.symbol}><b>{i + 1}. {r.symbol}</b><span>{fmtPct(summary(r).change_pct)} · {flowClass(r).label}</span></li>)}</ol><button onClick={() => window.print()}>Print / Save PDF</button></section>;
}

export default function StockArchive({ issue, symbol }) {
  const [index, setIndex] = useState({ items: {} });
  const [indexHistory, setIndexHistory] = useState({ by_code: {} });
  const [query, setQuery] = useState(symbol || '');
  const [sector, setSector] = useState('all');
  const [relationship, setRelationship] = useState('all');
  const [sort, setSort] = useState('turnover');
  const [sortDirection, setSortDirection] = useState('desc');
  const [leader, setLeader] = useState('price');
  const [flowView, setFlowView] = useState('buy');
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    let cancelled = false;
    loadJson('/content/indexes/stocks.index.json').then(d => { if (!cancelled) setIndex(d); }).catch(() => {});
    loadJson('/content/indexes/index-history.json').then(d => { if (!cancelled) setIndexHistory(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const latestRows = useMemo(() => flattenIssueStocks(issue), [issue]);
  const allHistory = useMemo(() => flattenIndex(index), [index]);
  const rows = symbol ? allHistory.filter(r => r.symbol === symbol) : latestRows;
  const sectors = useMemo(() => ['all', ...Array.from(new Set(latestRows.map(r => r.sector_name).filter(Boolean))).sort()], [latestRows]);

  const filtered = useMemo(() => {
    let out = [...rows];
    const q = query.trim().toLowerCase();
    if (q) out = out.filter(r => `${r.symbol} ${r.company_name || ''} ${r.security_name || ''} ${r.sector_name || ''}`.toLowerCase().includes(q));
    if (sector !== 'all') out = out.filter(r => r.sector_name === sector);
    if (relationship !== 'all') out = out.filter(r => flowClass(r).key === relationship);
    out.sort((a, b) => compareRowsBySort(a, b, sort, sortDirection));
    return out;
  }, [rows, query, sector, relationship, sort, sortDirection]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const handleTableSort = (key) => {
    setPage(1);
    if (key === sort) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(key);
      setSortDirection(defaultSortDirection(key));
    }
  };

  const t = {
    gain: top(latestRows, 'change_pct'),
    lose: top(latestRows, 'change_pct', 'asc'),
    turn: top(latestRows, 'turnover'),
    vol: top(latestRows, 'volume'),
    act: top(latestRows, 'transactions'),
    buy: top(latestRows, 'buy'),
    sell: top(latestRows, 'sell'),
    ambig: top(latestRows, 'ambig'),
    netBuy: [...latestRows].filter(r => val(r, 'net') > 0).sort((a, b) => val(b, 'net') - val(a, 'net')).slice(0, 5),
    netSell: [...latestRows].filter(r => val(r, 'net') < 0).sort((a, b) => val(a, 'net') - val(b, 'net')).slice(0, 5)
  };
  const groups = {
    healthy: latestRows.filter(r => flowClass(r).key === 'healthy'),
    resilience: latestRows.filter(r => flowClass(r).key === 'resilience'),
    cleanSell: latestRows.filter(r => flowClass(r).key === 'clean-sell'),
    failed: latestRows.filter(r => flowClass(r).key === 'failed-buying')
  };
  const leaderView = {
    price: <div className="stock-leader-two"><LeaderList rows={t.gain} metricFn={r => `${fmtPx(summary(r).ltp_rs ?? summary(r).close_rs)} · ${fmtPct(summary(r).change_pct)}`} /><LeaderList rows={t.lose} metricFn={r => `${fmtPx(summary(r).ltp_rs ?? summary(r).close_rs)} · ${fmtPct(summary(r).change_pct)}`} /></div>,
    turnover: <div className="stock-leader-two"><LeaderList rows={t.turn} metricFn={r => fmtRs(summary(r).trade_amt_rs)} /><LeaderList rows={t.vol} metricFn={r => `${fmtInt(summary(r).trade_qty)} shares`} /></div>,
    activity: <LeaderList rows={t.act} metricFn={r => `${fmtInt(summary(r).transactions || summary(r).buckets)} transactions`} />,
    flow: <><div className="presentation-tabs small"><button className={flowView === 'buy' ? 'active' : ''} onClick={() => setFlowView('buy')}>Buy Agg</button><button className={flowView === 'sell' ? 'active' : ''} onClick={() => setFlowView('sell')}>Sell Agg</button><button className={flowView === 'netBuy' ? 'active' : ''} onClick={() => setFlowView('netBuy')}>Strong Buy Net</button><button className={flowView === 'netSell' ? 'active' : ''} onClick={() => setFlowView('netSell')}>Strong Sell Net</button><button className={flowView === 'ambig' ? 'active' : ''} onClick={() => setFlowView('ambig')}>Ambiguity</button></div><LeaderList rows={t[flowView]} metricFn={r => flowView === 'buy' ? fmtRs(summary(r).buy_aggr_amt_rs) : flowView === 'sell' ? fmtRs(summary(r).sell_aggr_amt_rs) : flowView === 'ambig' ? fmtRs(summary(r).ambig_amt_rs) : fmtRs(summary(r).net_aggr_amt_rs)} /></>,
    behavior: <BehaviorMap groups={groups} />
  };

  return <main className="presentation-page stock-presentation-page">
    <section className="presentation-shell">
      <MarketContext issue={issue} indexHistory={indexHistory} />

      <section className="stock-story-grid">
        <HeroStockCard title="Top gainer" row={t.gain[0]} metric={r => fmtPct(summary(r).change_pct)} body="The price leader becomes more meaningful when the order-flow label explains whether demand confirmed the move." />
        <HeroStockCard title="Top turnover" row={t.turn[0]} metric={r => fmtRs(summary(r).trade_amt_rs)} body="Turnover is presented as a story only after connecting it to aggressor pressure and price behavior." />
        <HeroStockCard title="Strong buy flow" row={t.netBuy[0]} metric={r => fmtRs(summary(r).net_aggr_amt_rs)} body="Net buy flow highlights where aggressive demand exceeded sell pressure." />
      </section>

      <section className="stock-quick-strip">
        <QuickCard title="Buy Agg Leader" rows={t.buy} metricFn={r => fmtRs(summary(r).buy_aggr_amt_rs)} tone="buy" />
        <QuickCard title="Sell Agg Leader" rows={t.sell} metricFn={r => fmtRs(summary(r).sell_aggr_amt_rs)} tone="sell" />
        <QuickCard title="Strong Buy Net" rows={t.netBuy} metricFn={r => fmtRs(summary(r).net_aggr_amt_rs)} tone="buy" />
        <QuickCard title="Strong Sell Net" rows={t.netSell} metricFn={r => fmtRs(summary(r).net_aggr_amt_rs)} tone="sell" />
        <QuickCard title="Highest Ambiguity" rows={t.ambig} metricFn={r => fmtRs(summary(r).ambig_amt_rs)} tone="warn" />
      </section>

      <section className="presentation-panel stock-board-panel">
        <div className="presentation-head split"><div><p className="eyebrow">Leadership board</p><h2>One board, many clean views</h2></div><small>Normal market board + one order-flow read.</small></div>
        <div className="presentation-tabs">
          <button className={leader === 'price' ? 'active' : ''} onClick={() => setLeader('price')}>Price</button>
          <button className={leader === 'turnover' ? 'active' : ''} onClick={() => setLeader('turnover')}>Turnover / Volume</button>
          <button className={leader === 'activity' ? 'active' : ''} onClick={() => setLeader('activity')}>Transactions</button>
          <button className={leader === 'flow' ? 'active' : ''} onClick={() => setLeader('flow')}>Aggressor Flow</button>
          <button className={leader === 'behavior' ? 'active' : ''} onClick={() => setLeader('behavior')}>Price × Flow</button>
        </div>
        {leaderView[leader]}
      </section>

      <ExportStrip rows={t.gain} date={issue?.business_date} />

      <section className="presentation-panel table-panel-clean">
        <div className="presentation-head split"><div><p className="eyebrow">Complete stock index</p><h2>Search, filter and open any stock</h2></div><small>{fmtInt(filtered.length)} rows</small></div>
        <div className="presentation-controls stock-controls-clean">
          <label><span>Search</span><input value={query} onChange={e => { setQuery(e.target.value.toUpperCase()); setPage(1); }} placeholder="Symbol, company, sector" /></label>
          <label><span>Sector</span><select value={sector} onChange={e => { setSector(e.target.value); setPage(1); }}>{sectors.map(s => <option key={s} value={s}>{s === 'all' ? 'All sectors' : s}</option>)}</select></label>
          <label><span>Price × Flow</span><select value={relationship} onChange={e => { setRelationship(e.target.value); setPage(1); }}><option value="all">All reads</option><option value="healthy">Confirmed upside</option><option value="resilience">Price up, sellers active</option><option value="clean-sell">Confirmed downside</option><option value="failed-buying">Buy support failed</option></select></label>
          <label><span>Sort</span><select value={sort} onChange={e => { const key = e.target.value; setSort(key); setSortDirection(defaultSortDirection(key)); setPage(1); }}><option value="turnover">Turnover</option><option value="stock">Stock</option><option value="sector">Sector</option><option value="ltp">LTP</option><option value="change">% Change</option><option value="volume">Volume</option><option value="transactions">Transactions</option><option value="buy">Buy Agg</option><option value="sell">Sell Agg</option><option value="net">Net Flow</option><option value="ambig">Ambiguity</option><option value="same">Same-broker %</option><option value="read">Read</option><option value="evidence">Evidence</option></select></label>
        </div>
        <div className="presentation-table-wrap">
          <table className="presentation-table stock-index-table-clean">
            <thead><tr>
              <SortableTh label="Stock" sortKey="stock" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="Sector" sortKey="sector" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="LTP" sortKey="ltp" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="Change" sortKey="change" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="Turnover" sortKey="turnover" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="Volume" sortKey="volume" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="Transactions" sortKey="transactions" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="Net Flow" sortKey="net" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="Buy Agg" sortKey="buy" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="Sell Agg" sortKey="sell" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="Same-Broker" sortKey="same" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="Read" sortKey="read" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
              <SortableTh label="Evidence" sortKey="evidence" activeKey={sort} direction={sortDirection} onSort={handleTableSort} />
            </tr></thead>
            <tbody>{paged.map((r, i) => {
              const s = summary(r), fc = flowClass(r), same = sameBrokerAmount(s);
              return <tr key={`${r.business_date}-${r.symbol}-${i}`} onClick={() => setRoute(`/stocks/${r.symbol}?date=${r.business_date || issue?.business_date}`)}>
                <td><b>{r.symbol}</b><small>{r.company_name || r.security_name || ''}</small></td>
                <td>{r.sector_name || '—'}</td>
                <td>{fmtPx(s.ltp_rs ?? s.close_rs)}</td>
                <td className={amountTone(s.change_pct)}>{fmtRs(s.change_rs)}<small>{fmtPct(s.change_pct)}</small></td>
                <td>{fmtRs(s.trade_amt_rs)}</td>
                <td>{fmtInt(s.trade_qty)}</td>
                <td>{fmtInt(s.transactions || s.buckets)}</td>
                <td className={amountTone(s.net_aggr_amt_rs)}>{fmtRs(s.net_aggr_amt_rs)}</td>
                <td className="buy">{fmtRs(s.buy_aggr_amt_rs)}</td>
                <td className="sell">{fmtRs(s.sell_aggr_amt_rs)}</td>
                <td>{same == null ? '—' : <><b className="same">{fmtPct(s.same_broker_turnover_pct)}</b><small>{fmtRs(same)}</small></>}</td>
                <td><span className={`signal ${fc.tone}`}>{fc.label}</span><small>{fc.title}</small></td>
                <td>{s.evidence_label || '—'}<small>Conf {fmtPct(s.confidence_pct)} · Expl {fmtPct(s.explainability_pct)}</small></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="presentation-pager"><button disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button><span>Page <b>{currentPage}</b> of <b>{totalPages}</b></span><button disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</button></div>
      </section>
    </section>
  </main>;
}
