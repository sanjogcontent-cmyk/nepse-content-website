import React, { useEffect, useMemo, useState } from 'react';
import { fmtInt, fmtRs, fmtPct, fmtPx, cssSafe, setRoute, loadJson } from '../utils.js';
import IndexChart from '../components/IndexChart.jsx';
import { CumulativeTurnoverChart, ChartStoryBridge } from '../components/OrderFlowCharts.jsx';

const n = (v) => Number(v || 0);
const pct = (part, total) => total ? (n(part) / total) * 100 : 0;
const sameBrokerAmount = (scope) => scope?.same_broker_amt_rs ?? scope?.same_broker_matched_amt_rs ?? scope?.same_broker_turnover_rs ?? null;
const flowNet = (scope) => n(scope?.net_aggr_amt_rs ?? scope?.net_aggr_qty);
const flowTone = (scope) => flowNet(scope) >= 0 ? 'buy' : 'sell';
const flowLabel = (scope) => flowNet(scope) >= 0 ? 'Buy-led' : 'Sell-led';

function MixBar({ scope }) {
  const total = Math.max(n(scope?.buy_aggr_amt_rs) + n(scope?.sell_aggr_amt_rs) + n(scope?.ambig_amt_rs), 1);
  const buy = pct(scope?.buy_aggr_amt_rs, total);
  const sell = pct(scope?.sell_aggr_amt_rs, total);
  const ambig = Math.max(0, 100 - buy - sell);
  return <div className="presentation-mix">
    <div className="presentation-mix-track" aria-label="Buy, sell and ambiguous flow mix">
      <i className="buy" style={{ width: `${buy}%` }} />
      <i className="sell" style={{ width: `${sell}%` }} />
      <i className="warn" style={{ width: `${ambig}%` }} />
    </div>
    <div className="presentation-mix-legend">
      <span><b className="buy">Buy</b>{fmtPct(buy)}</span>
      <span><b className="sell">Sell</b>{fmtPct(sell)}</span>
      <span><b className="warn">Ambig</b>{fmtPct(ambig)}</span>
    </div>
  </div>;
}

function SectorKpi({ label, value, tone, note }) {
  return <article className="presentation-kpi">
    <span>{label}</span>
    <strong className={tone || ''}>{value}</strong>
    {note && <small>{note}</small>}
  </article>;
}

function SimpleSparkline({ values = [], positiveByValue = false }) {
  const nums = values.map(n).filter(Number.isFinite);
  if (nums.length < 2) return <div className="presentation-empty-spark">No archive history yet</div>;
  const width = 360, height = 86, pad = 10;
  const min = Math.min(...nums), max = Math.max(...nums);
  const span = Math.max(max - min, 1);
  const pts = nums.map((v, i) => {
    const x = pad + (i * (width - pad * 2) / Math.max(nums.length - 1, 1));
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return `${x},${y}`;
  }).join(' ');
  const tone = positiveByValue ? (nums[nums.length - 1] >= 0 ? 'buy' : 'sell') : 'same';
  return <svg className={`presentation-spark ${tone}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
    <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function StockSignal({ stock, businessDate }) {
  const sm = stock.summary || {};
  const net = flowNet(sm);
  const chg = n(sm.change_pct);
  let read = 'Flow active, price contained';
  if (chg >= 0 && net >= 0) read = 'Price up with buy confirmation';
  else if (chg >= 0 && net < 0) read = 'Price up while sellers active';
  else if (chg < 0 && net < 0) read = 'Price down with sell pressure';
  else if (chg < 0 && net >= 0) read = 'Price down despite buy support';
  return <button className="presentation-stock-card" onClick={() => setRoute(`/stocks/${stock.symbol}?date=${businessDate}`)}>
    <div className="presentation-stock-main">
      <strong>{stock.symbol}</strong>
      <small>{stock.company_name || stock.security_name || stock.sector_name || ''}</small>
    </div>
    <div className="presentation-stock-price">
      <b>{fmtPx(sm.ltp_rs ?? sm.close_rs)}</b>
      <span className={chg >= 0 ? 'buy' : 'sell'}>{chg >= 0 ? '+' : ''}{fmtPct(chg)}</span>
    </div>
    <div className="presentation-stock-flow">
      <em className={net >= 0 ? 'buy' : 'sell'}>{net >= 0 ? 'Buy' : 'Sell'} {fmtRs(Math.abs(net))}</em>
      <span>{read}</span>
    </div>
  </button>;
}

function LeaderRow({ stock, businessDate, metricLabel, metricValue }) {
  const sm = stock.summary || {};
  const same = sameBrokerAmount(sm);
  return <button className="presentation-leader-row" onClick={() => setRoute(`/stocks/${stock.symbol}?date=${businessDate}`)}>
    <strong>{stock.symbol}<small>{stock.company_name || stock.security_name || ''}</small></strong>
    <span><small>{metricLabel}</small><b>{metricValue}</b></span>
    <span><small>Flow</small><b className={flowTone(sm)}>{flowLabel(sm)}</b></span>
    <span><small>LTP</small><b>{fmtPx(sm.ltp_rs ?? sm.close_rs)}</b></span>
    <span><small>Same-broker</small><b>{same == null ? '—' : fmtPct(sm.same_broker_turnover_pct)}</b></span>
  </button>;
}

function SameBrokerContext({ summary }) {
  const same = sameBrokerAmount(summary);
  if (same == null) return <article className="presentation-card subtle"><h3>Same-broker context</h3><p>This issue has no buyer=seller broker field for this scope.</p></article>;
  return <article className="presentation-card same-context">
    <div>
      <p className="eyebrow">Buyer = seller broker context</p>
      <h3>{fmtPct(summary.same_broker_turnover_pct)} of sector turnover</h3>
      <p>Shown as market-structure context only. It is not treated as proof of manipulation.</p>
    </div>
    <div className="same-context-grid">
      <span><small>Amount</small><b>{fmtRs(same)}</b></span>
      <span><small>Qty</small><b>{fmtInt(summary.same_broker_qty)}</b></span>
      <span><small>Trades</small><b>{fmtInt(summary.same_broker_trades || summary.same_broker_match_count)}</b></span>
      <span><small>Buckets</small><b>{fmtInt(summary.same_broker_buckets)}</b></span>
    </div>
  </article>;
}

export default function SectorDetail({ issue, sectorSlug }) {
  const sector = useMemo(() => (issue?.sectors || []).find(s => cssSafe(s.sector_name) === sectorSlug), [issue, sectorSlug]);
  const businessDate = issue?.business_date || 'latest';
  const [sectorIndex, setSectorIndex] = useState({ items: {} });
  const [query, setQuery] = useState('');
  const [sortMode, setSortMode] = useState('turnover');
  const [sortDir, setSortDir] = useState('desc');
  const [flowFilter, setFlowFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 14;

  useEffect(() => {
    let cancelled = false;
    loadJson('/content/indexes/sectors.index.json').then(d => { if (!cancelled) setSectorIndex(d); }).catch(() => { if (!cancelled) setSectorIndex({ items: {} }); });
    return () => { cancelled = true; };
  }, []);

  const historyEntries = useMemo(() => {
    const node = sectorIndex?.items?.[sectorSlug];
    return [...(node?.entries || [])].sort((a, b) => (a.business_date || '').localeCompare(b.business_date || ''));
  }, [sectorIndex, sectorSlug]);

  if (!sector) {
    return <main className="presentation-page"><section className="presentation-panel"><h1>Sector not found</h1><p>The sector link could not be resolved from the current issue.</p><button onClick={() => setRoute('/sectors')}>Open sector index</button></section></main>;
  }

  const sm = sector.summary || {};
  const stocks = [...(sector.stocks || [])];
  const topTurnover = [...stocks].sort((a, b) => n(b.summary?.trade_amt_rs) - n(a.summary?.trade_amt_rs)).slice(0, 5);
  const topPressure = [...stocks].sort((a, b) => Math.abs(flowNet(b.summary)) - Math.abs(flowNet(a.summary))).slice(0, 5);
  const topMovers = [...stocks].sort((a, b) => Math.abs(n(b.summary?.change_pct)) - Math.abs(n(a.summary?.change_pct))).slice(0, 5);
  const sectorInterpretation = issue?.cms?.sector_interpretations?.[sector.sector_name] || issue?.public_cms?.sector_interpretations?.[sector.sector_name] || '';

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = stocks.filter(st => !q || `${st.symbol} ${st.company_name || ''} ${st.security_name || ''}`.toLowerCase().includes(q));
    rows = rows.filter(st => {
      const net = flowNet(st.summary);
      if (flowFilter === 'buy') return net >= 0;
      if (flowFilter === 'sell') return net < 0;
      if (flowFilter === 'same') return n(st.summary?.same_broker_turnover_pct) > 0;
      return true;
    });
    rows.sort((a, b) => {
      const A = a.summary || {}, B = b.summary || {};
      let res = 0;
      if (sortMode === 'stock') res = String(A.symbol || a.symbol || '').localeCompare(String(B.symbol || b.symbol || ''));
      else if (sortMode === 'ltp') res = n(A.ltp_rs ?? A.close_rs) - n(B.ltp_rs ?? B.close_rs);
      else if (sortMode === 'pressure') res = Math.abs(flowNet(A)) - Math.abs(flowNet(B));
      else if (sortMode === 'change') res = n(A.change_pct) - n(B.change_pct);
      else if (sortMode === 'buy') res = n(A.buy_aggr_amt_rs) - n(B.buy_aggr_amt_rs);
      else if (sortMode === 'sell') res = n(A.sell_aggr_amt_rs) - n(B.sell_aggr_amt_rs);
      else if (sortMode === 'volume') res = n(A.trade_qty) - n(B.trade_qty);
      else if (sortMode === 'vwap') res = n(A.day_vwap_rs || A.vwap_rs) - n(B.day_vwap_rs || B.vwap_rs);
      else if (sortMode === 'evidence') res = n(A.confidence_pct) + n(A.explainability_pct) - (n(B.confidence_pct) + n(B.explainability_pct));
      else if (sortMode === 'same') res = n(A.same_broker_turnover_pct) - n(B.same_broker_turnover_pct);
      else res = n(A.trade_amt_rs) - n(B.trade_amt_rs);
      return sortDir === 'asc' ? res : -res;
    });
    return rows;
  }, [stocks, query, sortMode, sortDir, flowFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const idx = sector.index || {};
  const same = sameBrokerAmount(sm);
  const requestSort = (mode) => {
    if (sortMode === mode) setSortDir((d) => d === 'desc' ? 'asc' : 'desc');
    else {
      setSortMode(mode);
      setSortDir(mode === 'stock' ? 'asc' : 'desc');
    }
    setPage(1);
  };
  const sortMark = (mode) => sortMode === mode ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';

  return <main className="presentation-page sector-presentation-page">
    <section className="presentation-shell">
      <div className="presentation-topnav">
        <button onClick={() => setRoute(`/daily/${businessDate}`)}>← Daily Issue</button>
        <button onClick={() => setRoute('/sectors')}>All sectors</button>
        <button onClick={() => setRoute('/stocks')}>Stock board</button>
      </div>

      <section className="presentation-hero sector-hero-clean">
        <div className="presentation-hero-copy">
          <p className="eyebrow">Sector presentation · {businessDate}</p>
          <h1>{sector.sector_name}</h1>
          <p>{sectorInterpretation || `${sector.sector_name} is organized here as a readable market story: index movement, sector turnover, order-flow bias, leaders, contradictions, and the full constituent table.`}</p>
          <MixBar scope={sm} />
        </div>
        <div className="presentation-hero-scoreboard">
          <SectorKpi label="Sector turnover" value={fmtRs(sm.trade_amt_rs)} note={`${fmtInt(sm.trade_qty)} shares`} />
          <SectorKpi label="Flow signal" value={flowLabel(sm)} tone={flowTone(sm)} note={fmtRs(sm.net_aggr_amt_rs)} />
          <SectorKpi label="Active stocks" value={fmtInt(sector.active_stocks || stocks.length)} note="constituents traded" />
          <SectorKpi label={idx.index_code || 'Sector index'} value={idx.close != null ? fmtInt(idx.close) : '—'} tone={n(idx.change) >= 0 ? 'buy' : 'sell'} note={idx.change != null ? `${idx.change >= 0 ? '+' : ''}${idx.change.toFixed(2)} · ${fmtPct(idx.change_pct)}` : 'index DB'} />
        </div>
      </section>

      <section className="sector-detail-index-chart sector-detail-chart-pair">
        <div className="daily14g-section-head">
          <div>
            <p className="daily14g-section-kicker">Sector price + participation</p>
            <h2>{sector.sector_name}: index path and cumulative turnover.</h2>
            <small>The chart pair keeps presentation clean: one view for sector price context, one view for money buildup.</small>
          </div>
        </div>
        <div className="daily14l-chart-grid">
          <IndexChart index={idx} title={`${sector.sector_name} index path`} subtitle={`${idx.index_code || 'Sector index'} · index analysis database`} />
          <CumulativeTurnoverChart series={sector.cumulative_turnover} title={`${sector.sector_name} cumulative turnover`} subtitle="Analysis database · sector-filtered traded value build" />
        </div>
        <ChartStoryBridge
          leftTitle="Sector index"
          leftValue={idx.change != null ? `${idx.change >= 0 ? '+' : ''}${Number(idx.change).toFixed(2)} · ${fmtPct(idx.change_pct)}` : 'Index path'}
          rightTitle="Sector participation"
          rightValue={fmtRs(sector.cumulative_turnover?.final_turnover_rs || sm.trade_amt_rs)}
          read={sector.cumulative_turnover?.pace_read || 'Sector turnover path shows how participation built through the day.'}
        />
      </section>

      <section className="presentation-grid four">
        <SectorKpi label="Transactions" value={fmtInt(sm.transactions)} note={`${fmtInt(sm.buckets)} buckets`} />
        <SectorKpi label="Buy aggressor" value={fmtRs(sm.buy_aggr_amt_rs)} tone="buy" note={`${fmtInt(sm.buy_aggr_qty)} qty`} />
        <SectorKpi label="Sell aggressor" value={fmtRs(sm.sell_aggr_amt_rs)} tone="sell" note={`${fmtInt(sm.sell_aggr_qty)} qty`} />
        <SectorKpi label="Same-broker" value={same == null ? '—' : fmtPct(sm.same_broker_turnover_pct)} tone="same" note={same == null ? 'not in payload' : fmtRs(same)} />
      </section>

      <section className="presentation-grid two leadership-grid">
        <article className="presentation-panel">
          <div className="presentation-head"><p className="eyebrow">Leadership</p><h2>Top turnover stocks</h2></div>
          <div className="presentation-list compact">
            {topTurnover.map(st => <LeaderRow key={st.symbol} stock={st} businessDate={businessDate} metricLabel="Turnover" metricValue={fmtRs(st.summary?.trade_amt_rs)} />)}
          </div>
        </article>
        <article className="presentation-panel">
          <div className="presentation-head"><p className="eyebrow">Pressure</p><h2>Strongest flow imbalance</h2></div>
          <div className="presentation-list compact">
            {topPressure.map(st => <LeaderRow key={st.symbol} stock={st} businessDate={businessDate} metricLabel="Net flow" metricValue={fmtRs(st.summary?.net_aggr_amt_rs)} />)}
          </div>
        </article>
      </section>

      <section className="presentation-panel">
        <div className="presentation-head split"><div><p className="eyebrow">Sector map</p><h2>Movers, contradiction checks and archive context</h2></div><small>Click any stock to open the stock story page.</small></div>
        <div className="presentation-stock-grid">
          {topMovers.map(st => <StockSignal key={st.symbol} stock={st} businessDate={businessDate} />)}
        </div>
      </section>

      <section className="presentation-grid two">
        <SameBrokerContext summary={sm} />
        <article className="presentation-card">
          <p className="eyebrow">Archive history</p>
          <h3>Sector flow over saved issues</h3>
          <SimpleSparkline values={historyEntries.map(x => x.net_aggr_amt_rs)} positiveByValue />
          <div className="history-chip-row presentation-history-row">
            {historyEntries.slice(-8).map(entry => <button key={entry.business_date} onClick={() => setRoute(`/sectors/${sectorSlug}?date=${entry.business_date}`)}>
              <strong>{entry.business_date}</strong>
              <span className={n(entry.net_aggr_amt_rs) >= 0 ? 'buy' : 'sell'}>{fmtRs(entry.net_aggr_amt_rs)}</span>
            </button>)}
          </div>
        </article>
      </section>

      <section className="presentation-panel table-panel-clean">
        <div className="presentation-head split"><div><p className="eyebrow">Full constituent board</p><h2>All stocks in {sector.sector_name}</h2></div><small>{fmtInt(filtered.length)} matching stocks</small></div>
        <div className="presentation-controls">
          <label><span>Search</span><input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Symbol or company" /></label>
          <label><span>Flow</span><select value={flowFilter} onChange={e => { setFlowFilter(e.target.value); setPage(1); }}><option value="all">All</option><option value="buy">Buy-led</option><option value="sell">Sell-led</option><option value="same">Has same-broker</option></select></label>
          <label><span>Sort</span><select value={sortMode} onChange={e => { setSortMode(e.target.value); setSortDir(e.target.value === 'stock' ? 'asc' : 'desc'); setPage(1); }}><option value="turnover">Turnover</option><option value="pressure">Net pressure</option><option value="change">Price change</option><option value="buy">Buy aggressor</option><option value="sell">Sell aggressor</option><option value="same">Same-broker %</option><option value="stock">Stock</option><option value="ltp">LTP</option><option value="volume">Volume</option><option value="vwap">VWAP</option><option value="evidence">Evidence</option></select></label>
        </div>
        <div className="presentation-table-wrap">
          <table className="presentation-table">
            <thead><tr>
              <th><button className="table-sort-btn" onClick={() => requestSort('stock')}>Stock{sortMark('stock')}</button></th>
              <th><button className="table-sort-btn" onClick={() => requestSort('ltp')}>LTP{sortMark('ltp')}</button></th>
              <th><button className="table-sort-btn" onClick={() => requestSort('change')}>Change{sortMark('change')}</button></th>
              <th><button className="table-sort-btn" onClick={() => requestSort('turnover')}>Turnover{sortMark('turnover')}</button></th>
              <th><button className="table-sort-btn" onClick={() => requestSort('volume')}>Volume{sortMark('volume')}</button></th>
              <th><button className="table-sort-btn" onClick={() => requestSort('pressure')}>Net Flow{sortMark('pressure')}</button></th>
              <th><button className="table-sort-btn" onClick={() => requestSort('buy')}>Buy Agg{sortMark('buy')}</button></th>
              <th><button className="table-sort-btn" onClick={() => requestSort('sell')}>Sell Agg{sortMark('sell')}</button></th>
              <th><button className="table-sort-btn" onClick={() => requestSort('vwap')}>VWAP{sortMark('vwap')}</button></th>
              <th><button className="table-sort-btn" onClick={() => requestSort('same')}>Same-Broker{sortMark('same')}</button></th>
              <th><button className="table-sort-btn" onClick={() => requestSort('evidence')}>Evidence{sortMark('evidence')}</button></th>
            </tr></thead>
            <tbody>{paged.map(st => {
              const x = st.summary || {};
              return <tr key={st.symbol} onClick={() => setRoute(`/stocks/${st.symbol}?date=${businessDate}`)}>
                <td><b>{st.symbol}</b><small>{st.company_name || st.security_name || ''}</small></td>
                <td>{fmtPx(x.ltp_rs ?? x.close_rs)}</td>
                <td className={n(x.change_pct) >= 0 ? 'buy' : 'sell'}>{fmtRs(x.change_rs)}<small>{fmtPct(x.change_pct)}</small></td>
                <td>{fmtRs(x.trade_amt_rs)}</td>
                <td>{fmtInt(x.trade_qty)}</td>
                <td className={flowTone(x)}>{fmtRs(x.net_aggr_amt_rs)}</td>
                <td className="buy">{fmtRs(x.buy_aggr_amt_rs)}</td>
                <td className="sell">{fmtRs(x.sell_aggr_amt_rs)}</td>
                <td>{fmtPx(x.day_vwap_rs || x.vwap_rs)}</td>
                <td>{sameBrokerAmount(x) == null ? '—' : <><b className="same">{fmtPct(x.same_broker_turnover_pct)}</b><small>{fmtRs(sameBrokerAmount(x))}</small></>}</td>
                <td>{x.evidence_label || '—'}<small>Conf {fmtPct(x.confidence_pct)} · Expl {fmtPct(x.explainability_pct)}</small></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
        <div className="presentation-pager"><button disabled={currentPage <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Previous</button><span>Page <b>{currentPage}</b> of <b>{totalPages}</b></span><button disabled={currentPage >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</button></div>
      </section>
    </section>
  </main>;
}
