import React, { useMemo, useState } from 'react';
import { setRoute, fmtRs, fmtInt, fmtPct, cssSafe } from '../utils.js';
import { EvidenceBadge } from '../components/Numbers.jsx';
import SectorPressureBar from '../components/sectors/SectorPressureBar.jsx';
import SectorPressureBadge from '../components/sectors/SectorPressureBadge.jsx';
import SectorLeadStocks from '../components/sectors/SectorLeadStocks.jsx';
import { IndexSparkline } from '../components/IndexChart.jsx';
import {
  cssToneClass,
  filterSectors,
  getSectorPressureRead,
  getSectorPressureTone,
  n,
  pressureShares,
  sectorAmounts,
  sortSectors,
  topSectorStocks,
} from '../components/sectors/sectorPressureUtils.js';

function sectorRows(issue) {
  return [...(issue?.sectors || [])]
    .map((sector) => ({
      ...sector,
      sector_slug: cssSafe(sector.sector_name),
      summary: sector.summary || {},
      stocks: sector.stocks || [],
      business_date: issue?.business_date || sector.business_date || '',
    }))
    .sort((a, b) => n(b.summary?.trade_amt_rs) - n(a.summary?.trade_amt_rs));
}

function MetricCard({ label, value, note, tone }) {
  return (
    <article className={`pressure-leader-card ${tone || ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

function SectorPressureHero({ rows, issue }) {
  const totalTurnover = rows.reduce((acc, row) => acc + n(row.summary?.trade_amt_rs), 0);
  const largest = sortSectors(rows, 'turnover')[0];
  const buy = sortSectors(rows, 'buyPressure')[0];
  const sell = sortSectors(rows, 'sellPressure')[0];
  const ambig = sortSectors(rows, 'ambiguity')[0];
  const market = issue?.market_summary || {};
  const marketTone = getSectorPressureTone(market);

  return (
    <section className="sector-pressure-hero">
      <div className="sector-pressure-hero-copy">
        <p className="eyebrow">Sector Pressure Map · {issue?.business_date || 'latest'}</p>
        <h1>Where buy money, sell money and ambiguity concentrated.</h1>
        <p>Sector presentation is now based on aggressor-side amount, not raw quantity. Each card shows the money-pressure split first, then lead stocks and secondary context.</p>
        <div className="sector-pressure-hero-actions">
          <button onClick={() => setRoute(`/daily/${issue?.business_date || ''}`)}>Daily issue</button>
          <button onClick={() => setRoute('/boards')}>Market boards</button>
          <button onClick={() => setRoute('/stocks')}>Stock board</button>
        </div>
      </div>
      <div className="sector-pressure-hero-grid">
        <MetricCard label="Mapped sectors" value={fmtInt(rows.length)} note="sector metadata + analysis truth" />
        <MetricCard label="Sector turnover" value={fmtRs(totalTurnover)} note="sum of sector bucket turnover" />
        <MetricCard label="Market pressure" value={marketTone === 'buy' ? 'Buy-led' : marketTone === 'sell' ? 'Sell-led' : 'Mixed'} tone={cssToneClass(marketTone)} note={fmtRs(sectorAmounts(market).buy - sectorAmounts(market).sell)} />
        <MetricCard label="Largest footprint" value={largest?.sector_name || '—'} note={fmtRs(largest?.summary?.trade_amt_rs)} />
        <MetricCard label="Strongest buy money" value={buy?.sector_name || '—'} tone="buy" note={fmtRs(sectorAmounts(buy?.summary).buy)} />
        <MetricCard label="Strongest sell money" value={sell?.sector_name || '—'} tone="sell" note={fmtRs(sectorAmounts(sell?.summary).sell)} />
        <MetricCard label="Highest ambiguity" value={ambig?.sector_name || '—'} tone="mixed" note={fmtRs(sectorAmounts(ambig?.summary).ambig)} />
      </div>
    </section>
  );
}

function SectorLeaderStrip({ rows }) {
  const leaders = [
    { key: 'turnover', label: 'Largest footprint', sector: sortSectors(rows, 'turnover')[0], value: (s) => fmtRs(s?.summary?.trade_amt_rs), note: 'Most active by traded value' },
    { key: 'buy', label: 'Strongest buy pressure', sector: sortSectors(rows, 'buyPressure')[0], value: (s) => fmtRs(sectorAmounts(s?.summary).buy), note: 'Most buy-aggressive money' },
    { key: 'sell', label: 'Strongest sell pressure', sector: sortSectors(rows, 'sellPressure')[0], value: (s) => fmtRs(sectorAmounts(s?.summary).sell), note: 'Most sell-aggressive money' },
    { key: 'ambig', label: 'Most ambiguous', sector: sortSectors(rows, 'ambiguity')[0], value: (s) => fmtRs(sectorAmounts(s?.summary).ambig), note: 'Needs careful inspection' },
  ].filter((x) => x.sector);

  return (
    <section className="sector-pressure-leaders">
      {leaders.map((item) => (
        <button key={item.key} onClick={() => setRoute(`/sectors/${item.sector.sector_slug}?date=${item.sector.business_date || ''}`)}>
          <span>{item.label}</span>
          <strong>{item.sector.sector_name}</strong>
          <em>{item.value(item.sector)}</em>
          <small>{item.note}</small>
        </button>
      ))}
    </section>
  );
}

function AmountTriplet({ summary }) {
  const amounts = sectorAmounts(summary || {});
  const shares = pressureShares(summary || {});
  return (
    <div className="sector-amount-triplet">
      <span><small>Buy aggressor</small><b className="buy">{fmtRs(amounts.buy)}</b><em>{fmtPct(shares.buyPct)}</em></span>
      <span><small>Sell aggressor</small><b className="sell">{fmtRs(amounts.sell)}</b><em>{fmtPct(shares.sellPct)}</em></span>
      <span><small>Ambiguous</small><b className="mixed">{fmtRs(amounts.ambig)}</b><em>{fmtPct(shares.ambigPct)}</em></span>
    </div>
  );
}

function SectorPressureCard({ sector }) {
  const sm = sector.summary || {};
  const tone = cssToneClass(getSectorPressureTone(sector));
  const leaders = topSectorStocks(sector, 3);
  const idx = sector.index || {};
  const same = sm.same_broker_turnover_pct == null ? null : n(sm.same_broker_turnover_pct);

  return (
    <article className={`sector-pressure-card ${tone}`} onClick={() => setRoute(`/sectors/${sector.sector_slug}?date=${sector.business_date || ''}`)}>
      <header className="sector-pressure-card-head">
        <div>
          <p>{idx.index_code || 'Sector index'}</p>
          <h2>{sector.sector_name}</h2>
        </div>
        <SectorPressureBadge sector={sector} />
      </header>

      <div className="sector-turnover-block">
        <strong>{fmtRs(sm.trade_amt_rs)}</strong>
        <span>Total sector turnover</span>
      </div>

      <SectorPressureBar summary={sm} />
      <AmountTriplet summary={sm} />

      <div className="sector-index-mini-chart">
        <IndexSparkline index={idx} />
      </div>

      <p className="sector-pressure-read">{getSectorPressureRead(sector)}</p>

      <div className="sector-lead-block">
        <span>Lead stocks</span>
        <SectorLeadStocks sector={sector} date={sector.business_date} />
      </div>

      <footer className="sector-secondary-strip">
        <span>{fmtInt(sm.trade_qty)} shares</span>
        <span>{fmtInt(sm.transactions)} tx</span>
        {idx.change_pct == null ? <span>Index DB —</span> : <span className={n(idx.change_pct) >= 0 ? 'buy' : 'sell'}>{idx.index_code || 'Index'} {fmtPct(idx.change_pct)}</span>}
        <span>Same-broker {same == null ? '—' : fmtPct(same)}</span>
      </footer>

      <div className="sector-card-proof-line">
        {leaders.length ? leaders.map((st) => st.symbol).join(' · ') : 'No lead stock proof'}
      </div>
    </article>
  );
}

function SectorSortControls({ sort, setSort, filter, setFilter, query, setQuery }) {
  return (
    <section className="sector-pressure-controls">
      <div>
        <p className="eyebrow">All sectors</p>
        <h2>Visual pressure board</h2>
      </div>
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sector" />
      <div className="sector-chip-controls" aria-label="Sort sectors">
        {[
          ['turnover', 'Largest footprint'],
          ['buyPressure', 'Buy pressure'],
          ['sellPressure', 'Sell pressure'],
          ['ambiguity', 'Ambiguity'],
          ['sameBroker', 'Same-broker'],
        ].map(([value, label]) => <button key={value} className={sort === value ? 'active' : ''} onClick={() => setSort(value)}>{label}</button>)}
      </div>
      <div className="sector-chip-controls" aria-label="Filter sectors">
        {[
          ['all', 'All'],
          ['buy', 'Buy-led'],
          ['sell', 'Sell-led'],
          ['mixed', 'Mixed'],
          ['indexUp', 'Index up'],
          ['indexDown', 'Index down'],
        ].map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}
      </div>
    </section>
  );
}

function SectorTableDrawer({ rows }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <section className="sector-table-drawer-gate">
        <div>
          <p className="eyebrow">Full audit table</p>
          <h2>Need every value?</h2>
          <p>The first view stays presentation-clean. Open this when you want all sector audit values.</p>
        </div>
        <button onClick={() => setOpen(true)}>Show full sector table</button>
      </section>
    );
  }
  return (
    <section className="sector-table-drawer-gate open">
      <div className="sector-table-title-row">
        <div><p className="eyebrow">Full audit table</p><h2>All sector values</h2></div>
        <button onClick={() => setOpen(false)}>Hide table</button>
      </div>
      <div className="sector-table-wrap pressure-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Sector</th><th>Turnover</th><th>Buy Amount</th><th>Sell Amount</th><th>Ambig Amount</th><th>Buy %</th><th>Sell %</th><th>Ambig %</th><th>Shares</th><th>Tx</th><th>Same-Broker</th><th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const sm = row.summary || {};
              const amounts = sectorAmounts(sm);
              const shares = pressureShares(sm);
              return (
                <tr key={row.sector_name} onClick={() => setRoute(`/sectors/${row.sector_slug}?date=${row.business_date || ''}`)}>
                  <td><b>{row.sector_name}</b><small>{getSectorPressureRead(row)}</small></td>
                  <td>{fmtRs(sm.trade_amt_rs)}</td>
                  <td className="buy">{fmtRs(amounts.buy)}</td>
                  <td className="sell">{fmtRs(amounts.sell)}</td>
                  <td className="mixed">{fmtRs(amounts.ambig)}</td>
                  <td>{fmtPct(shares.buyPct)}</td>
                  <td>{fmtPct(shares.sellPct)}</td>
                  <td>{fmtPct(shares.ambigPct)}</td>
                  <td>{fmtInt(sm.trade_qty)}</td>
                  <td>{fmtInt(sm.transactions)}</td>
                  <td>{sm.same_broker_turnover_pct == null ? '—' : fmtPct(sm.same_broker_turnover_pct)}</td>
                  <td><EvidenceBadge label={sm.evidence_label} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function SectorArchive({ issue }) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('turnover');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => sectorRows(issue), [issue]);
  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = filterSectors(rows, filter);
    if (q) out = out.filter((row) => `${row.sector_name} ${row.index?.index_code || ''}`.toLowerCase().includes(q));
    return sortSectors(out, sort);
  }, [rows, filter, sort, query]);

  return (
    <main className="sector-pressure-page">
      <SectorPressureHero rows={rows} issue={issue} />
      <SectorLeaderStrip rows={rows} />
      <SectorSortControls sort={sort} setSort={setSort} filter={filter} setFilter={setFilter} query={query} setQuery={setQuery} />
      <section className="sector-pressure-grid">
        {visibleRows.map((row) => <SectorPressureCard key={row.sector_name} sector={row} />)}
      </section>
      <SectorTableDrawer rows={visibleRows} />
    </main>
  );
}
