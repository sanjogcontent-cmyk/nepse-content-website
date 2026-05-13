import React from 'react';
import BoardRow from './BoardRow.jsx';
import { fmtInt, setRoute } from '../home/homeUtils.js';

export const BOARD_META = {
  top_gainers: { title: 'Top Gainers', short: 'Gainers', sub: 'Price leaders with flow confirmation', tone: 'gain' },
  top_losers: { title: 'Top Losers', short: 'Losers', sub: 'Weakest price moves with pressure read', tone: 'loss' },
  top_turnover: { title: 'Top Turnover', short: 'Turnover', sub: 'Largest value traded', tone: 'turnover' },
  top_volume: { title: 'Top Volume', short: 'Volume', sub: 'Most shares traded', tone: 'volume' },
  top_transactions: { title: 'Top Transactions', short: 'Transactions', sub: 'Most matched trade rows', tone: 'tx' },
};

export const BOARD_KEYS = ['top_gainers', 'top_losers', 'top_turnover', 'top_volume', 'top_transactions'];

export default function BoardCard({ boardKey, rows = [], businessDate, limit = 5, showMore = true }) {
  const meta = BOARD_META[boardKey];
  const visible = rows.slice(0, limit);
  if (!meta || !visible.length) return null;
  return <article className={`editorial-board-card editorial-board-${meta.tone}`}>
    <header className="editorial-board-head">
      <div>
        <p className="mini-eyebrow">Market board</p>
        <h3>{meta.title}</h3>
        <small>{meta.sub}</small>
      </div>
      {showMore && rows.length > limit && <button onClick={() => setRoute(`/boards?board=${boardKey}${businessDate ? `&date=${businessDate}` : ''}`)}>View more</button>}
    </header>
    <div className="editorial-board-rows">
      {visible.map((row, index) => <BoardRow key={`${boardKey}-${row.symbol}-${index}`} boardKey={boardKey} row={row} businessDate={businessDate} compact />)}
    </div>
    {rows.length > limit && <footer className="editorial-board-foot">Showing top {fmtInt(limit)} of {fmtInt(rows.length)} symbols</footer>}
  </article>;
}
