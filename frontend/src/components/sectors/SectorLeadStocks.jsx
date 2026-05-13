import React from 'react';
import { setRoute } from '../../utils.js';
import { topSectorStocks } from './sectorPressureUtils.js';

export default function SectorLeadStocks({ sector, date, count = 3 }) {
  const stocks = topSectorStocks(sector || {}, count);
  if (!stocks.length) return <span className="sector-lead-empty">No stock proof yet</span>;
  return (
    <div className="sector-lead-stocks">
      {stocks.map((stock) => (
        <button
          key={stock.symbol}
          className="sector-stock-chip"
          onClick={(event) => {
            event.stopPropagation();
            setRoute(`/stocks/${stock.symbol}${date ? `?date=${date}` : ''}`);
          }}
        >
          {stock.symbol}
        </button>
      ))}
    </div>
  );
}
