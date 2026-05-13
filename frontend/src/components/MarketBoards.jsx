import React, { useEffect, useMemo, useState } from 'react';
import BoardCard, { BOARD_KEYS, BOARD_META } from './boards/BoardCard.jsx';
import BoardRow from './boards/BoardRow.jsx';
import FlowPill from './boards/FlowPill.jsx';
import SameBrokerMini from './boards/SameBrokerMini.jsx';
import { fmtInt, fmtRs, fmtPx, n, boardRead, setRoute } from './home/homeUtils.js';

function getInitialBoard(available) {
  const fromUrl = new URLSearchParams(window.location.search).get('board');
  return available.includes(fromUrl) ? fromUrl : available[0] || 'top_gainers';
}

function cellSet(boardKey, row) {
  if (boardKey === 'top_turnover') return [fmtRs(row.turnover_rs), fmtPx(row.ltp_rs)];
  if (boardKey === 'top_volume') return [fmtInt(row.shares_traded), fmtPx(row.ltp_rs)];
  if (boardKey === 'top_transactions') return [fmtInt(row.transactions), fmtPx(row.ltp_rs)];
  return [fmtPx(row.ltp_rs), `${n(row.change_rs) >= 0 ? '+' : ''}${Number(row.change_rs || 0).toFixed(2)}`, `${n(row.change_pct) >= 0 ? '+' : ''}${Number(row.change_pct || 0).toFixed(2)}%`];
}

function FullBoardTable({ boardKey, rows, businessDate }) {
  const [query, setQuery] = useState('');
  const [sector, setSector] = useState('All');
  const [pageSize, setPageSize] = useState(20);
  const [page, setPage] = useState(0);
  const meta = BOARD_META[boardKey] || BOARD_META.top_gainers;
  const sectors = useMemo(() => ['All', ...Array.from(new Set(rows.map((r) => r.sector_name || 'Unmapped'))).sort()], [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || String(row.symbol || '').toLowerCase().includes(q) || String(row.company_name || '').toLowerCase().includes(q);
    const matchesSector = sector === 'All' || (row.sector_name || 'Unmapped') === sector;
    return matchesQuery && matchesSector;
  }), [rows, query, sector]);
  useEffect(() => setPage(0), [boardKey, query, sector, pageSize]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
  return <section className="full-board-panel">
    <div className="full-board-toolbar">
      <label><span>Search symbol</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="SYPNL, AHL, PCIL…" /></label>
      <label><span>Sector</span><select value={sector} onChange={(e) => setSector(e.target.value)}>{sectors.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
      <label><span>Rows</span><select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></label>
      <div className="full-board-count"><b>{fmtInt(filtered.length)}</b><span>matching symbols</span></div>
    </div>
    <div className="full-board-table-wrap">
      <table className="full-board-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Sector</th>
            {boardKey === 'top_turnover' && <th>Turnover</th>}
            {boardKey === 'top_volume' && <th>Shares</th>}
            {boardKey === 'top_transactions' && <th>Transactions</th>}
            {(boardKey === 'top_gainers' || boardKey === 'top_losers') && <><th>LTP</th><th>Pt. Change</th><th>% Change</th></>}
            {(boardKey === 'top_turnover' || boardKey === 'top_volume' || boardKey === 'top_transactions') && <th>LTP</th>}
            <th>Net Flow</th>
            <th>Read</th>
            <th>Same-Broker</th>
          </tr>
        </thead>
        <tbody>
          {visible.map((row, index) => {
            const cells = cellSet(boardKey, row);
            return <tr key={`${boardKey}-${row.symbol}-${index}`} onClick={() => setRoute(`/stocks/${encodeURIComponent(row.symbol)}${businessDate ? `?date=${businessDate}` : ''}`)}>
              <td><b>{row.symbol}</b><small>{row.company_name || ''}</small></td>
              <td>{row.sector_name || 'Unmapped'}</td>
              {cells.map((cell, i) => <td key={i} className={String(cell).startsWith('+') ? 'buy' : String(cell).startsWith('-') ? 'sell' : ''}>{cell}</td>)}
              <td><FlowPill row={row} /></td>
              <td>{boardRead(row)}</td>
              <td><SameBrokerMini row={row} quiet /></td>
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <div className="full-board-pager">
      <button disabled={safePage <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Previous</button>
      <span>Page <b>{safePage + 1}</b> / {pages}</span>
      <button disabled={safePage >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>Next →</button>
    </div>
  </section>;
}

export default function MarketBoards({ issue, mode = 'compact' }) {
  const boards = issue?.leaderboards || {};
  const businessDate = issue?.business_date || '';
  const available = useMemo(() => BOARD_KEYS.filter((key) => (boards[key] || []).length), [boards]);
  const [active, setActive] = useState(() => getInitialBoard(available));
  useEffect(() => { if (!available.includes(active) && available.length) setActive(available[0]); }, [available, active]);
  if (!available.length) return null;
  if (mode === 'full') {
    const meta = BOARD_META[active] || BOARD_META.top_gainers;
    return <main id="content-main" className="boards-page-v14c">
      <section className="boards-hero-clean">
        <p className="editorial-kicker">Market Boards</p>
        <h1>Top movers and activity with one clean order-flow read.</h1>
        <p>Use this page for exploration. The home page shows the top five; this page adds search, sector filtering, next/previous paging and stock click-through.</p>
        <div className="boards-truth-note">LTP = last POST-frame LTP. Previous close = last POST-frame close. Flow, turnover, volume and transactions = analysis bucket trade truth.</div>
      </section>
      <section className="board-tab-clean" aria-label="Board selector">
        {available.map((key) => <button key={key} className={active === key ? 'active' : ''} onClick={() => setActive(key)}>{BOARD_META[key].short}</button>)}
      </section>
      <div className="full-board-title"><h2>{meta.title}</h2><p>{meta.sub}</p></div>
      <FullBoardTable boardKey={active} rows={boards[active] || []} businessDate={businessDate} />
    </main>;
  }
  return <section className="market-boards-editorial editorial-section" id="market-boards">
    <div className="section-title-row">
      <div>
        <p className="editorial-kicker">C. Market Boards</p>
        <h2>Top movers, turnover, volume and transactions</h2>
        <p>Normal NEPSE board view, with one compact order-flow read so the story is not just price movement.</p>
      </div>
      <button className="soft-action" onClick={() => setRoute(`/boards${businessDate ? `?date=${businessDate}` : ''}`)}>Open full board page</button>
    </div>
    <div className="editorial-board-grid">
      {available.map((key) => <BoardCard key={key} boardKey={key} rows={boards[key] || []} businessDate={businessDate} limit={5} />)}
    </div>
  </section>;
}
