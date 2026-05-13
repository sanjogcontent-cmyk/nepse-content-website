import React, { useMemo, useState } from 'react';
import { fmtInt, fmtRs, fmtPct } from '../utils.js';
import { EvidenceBadge } from './Numbers.jsx';
import { trackEvent } from '../analytics/tracker.js';

function stockValue(stock, key) {
  if (key === 'symbol') return stock.symbol || '';
  if (key === 'company') return stock.company_name || stock.security_name || '';
  if (key === 'abs_net') return Math.abs(Number(stock.summary?.net_aggr_qty || 0));
  return stock.summary?.[key] ?? 0;
}

function compareValue(a, b, key) {
  const av = stockValue(a, key);
  const bv = stockValue(b, key);
  if (typeof av === 'string' || typeof bv === 'string') return String(av).localeCompare(String(bv));
  return Number(av) - Number(bv);
}

function sortArrow(sort, key) {
  if (sort[0] !== key) return '';
  return sort[1] === 'asc' ? ' ↑' : ' ↓';
}

export default function StockTable({ stocks = [], selectedSymbol, onSelect }) {
  const [sort, setSort] = useState(['trade_amt_rs', 'desc']);
  const [query, setQuery] = useState('');
  const [bias, setBias] = useState('all');
  const [evidence, setEvidence] = useState('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stocks
      .filter(st => !q || [st.symbol, st.company_name, st.security_name].some(x => String(x || '').toLowerCase().includes(q)))
      .filter(st => {
        const net = Number(st.summary?.net_aggr_qty || 0);
        if (bias === 'buy') return net > 0;
        if (bias === 'sell') return net < 0;
        if (bias === 'mixed') return net === 0;
        return true;
      })
      .filter(st => {
        const label = String(st.summary?.evidence_label || '').toLowerCase();
        if (evidence === 'high') return label.includes('high');
        if (evidence === 'medium') return label.includes('medium');
        if (evidence === 'lower') return label.includes('lower') || label.includes('low');
        return true;
      });
  }, [stocks, query, bias, evidence]);

  const sorted = useMemo(() => {
    const [key, dir] = sort;
    const arr = [...filtered];
    arr.sort((a, b) => {
      const r = compareValue(a, b, key);
      return dir === 'asc' ? r : -r;
    });
    return arr;
  }, [filtered, sort]);

  const stats = useMemo(() => {
    const totalAmt = filtered.reduce((acc, st) => acc + Number(st.summary?.trade_amt_rs || 0), 0);
    const buy = filtered.filter(st => Number(st.summary?.net_aggr_qty || 0) > 0).length;
    const sell = filtered.filter(st => Number(st.summary?.net_aggr_qty || 0) < 0).length;
    return { totalAmt, buy, sell, total: filtered.length };
  }, [filtered]);

  const header = (label, key) => (
    <button onClick={() => setSort(([k, d]) => [key, k === key && d === 'desc' ? 'asc' : 'desc'])}>
      {label}{sortArrow(sort, key)}
    </button>
  );

  return (
    <div className="stock-worktable">
      <div className="stock-toolbar">
        <label className="search-control">
          <span>Find stock</span>
          <input value={query} onChange={e => { setQuery(e.target.value); if (e.target.value.trim()) trackEvent('stock_search_used', { payload: { search_term: e.target.value, search_scope: 'stock' } }); }} placeholder="Search symbol or company..." />
        </label>
        <label>
          <span>Bias</span>
          <select value={bias} onChange={e => { setBias(e.target.value); trackEvent('stock_filter_used', { payload: { filter: 'bias', value: e.target.value } }); }}>
            <option value="all">All stocks</option>
            <option value="buy">Buy pressure</option>
            <option value="sell">Sell pressure</option>
            <option value="mixed">Mixed / flat</option>
          </select>
        </label>
        <label>
          <span>Evidence</span>
          <select value={evidence} onChange={e => { setEvidence(e.target.value); trackEvent('stock_filter_used', { payload: { filter: 'evidence', value: e.target.value } }); }}>
            <option value="all">All evidence</option>
            <option value="high">High evidence</option>
            <option value="medium">Medium evidence</option>
            <option value="lower">Lower evidence</option>
          </select>
        </label>
        <div className="quick-sort-row" aria-label="Quick stock sorting">
          <button className="chip small" onClick={() => { setSort(['trade_amt_rs', 'desc']); trackEvent('stock_sort_used', { payload: { sort_mode: 'top_turnover' } }); }}>Top turnover</button>
          <button className="chip small" onClick={() => { setSort(['net_aggr_qty', 'desc']); trackEvent('stock_sort_used', { payload: { sort_mode: 'buy_pressure' } }); }}>Buy pressure</button>
          <button className="chip small" onClick={() => { setSort(['net_aggr_qty', 'asc']); trackEvent('stock_sort_used', { payload: { sort_mode: 'sell_pressure' } }); }}>Sell pressure</button>
          <button className="chip small" onClick={() => { setSort(['abs_net', 'desc']); trackEvent('stock_sort_used', { payload: { sort_mode: 'strongest_imbalance' } }); }}>Strongest imbalance</button>
        </div>
      </div>

      <div className="stock-result-strip">
        <span>Showing <b>{fmtInt(stats.total)}</b> stocks</span>
        <span>Filtered trade amt <b>{fmtRs(stats.totalAmt)}</b></span>
        <span>Buy pressure <b className="buy">{fmtInt(stats.buy)}</b></span>
        <span>Sell pressure <b className="sell">{fmtInt(stats.sell)}</b></span>
      </div>

      <div className="table-wrap stock-table-wrap phase3-table-wrap">
        <table className="stock-table phase3-stock-table">
          <thead><tr>
            <th>Rank</th>
            <th>{header('Symbol','symbol')}</th>
            <th>{header('Company','company')}</th>
            <th>{header('Trade Amt','trade_amt_rs')}</th>
            <th>{header('Trade Qty','trade_qty')}</th>
            <th>{header('Buy Agg','buy_aggr_qty')}</th>
            <th>{header('Sell Agg','sell_aggr_qty')}</th>
            <th>{header('Net Agg','net_aggr_qty')}</th>
            <th>{header('Buy Agg Amt','buy_aggr_amt_rs')}</th>
            <th>{header('Sell Agg Amt','sell_aggr_amt_rs')}</th>
            <th>{header('Net Agg Amt','net_aggr_amt_rs')}</th>
            <th>{header('|Net|','abs_net')}</th>
            <th>{header('Buckets','buckets')}</th>
            <th>{header('Conf','confidence_pct')}</th>
            <th>{header('Expl','explainability_pct')}</th>
            <th>Evidence</th>
            <th>Flags</th>
          </tr></thead>
          <tbody>
            {sorted.map((st, idx) => {
              const sm = st.summary || {};
              const selected = selectedSymbol === st.symbol;
              return <tr className={selected ? 'selected' : ''} key={st.symbol} onClick={() => onSelect(st.symbol)}>
                <td className="rank-cell">#{idx + 1}</td>
                <td className="symbol-cell"><strong>{st.symbol}</strong></td>
                <td className="company-cell">{st.company_name || st.security_name || '—'}</td>
                <td>{fmtRs(sm.trade_amt_rs)}</td>
                <td>{fmtInt(sm.trade_qty)}</td>
                <td className="buy">{fmtInt(sm.buy_aggr_qty)}</td>
                <td className="sell">{fmtInt(sm.sell_aggr_qty)}</td>
                <td className={sm.net_aggr_qty >= 0 ? 'buy' : 'sell'}>{fmtInt(sm.net_aggr_qty)}</td>
                <td className="buy">{fmtRs(sm.buy_aggr_amt_rs)}</td>
                <td className="sell">{fmtRs(sm.sell_aggr_amt_rs)}</td>
                <td className={sm.net_aggr_amt_rs >= 0 ? 'buy' : 'sell'}>{fmtRs(sm.net_aggr_amt_rs)}</td>
                <td>{fmtInt(Math.abs(Number(sm.net_aggr_qty || 0)))}</td>
                <td>{fmtInt(sm.buckets)}</td>
                <td>{fmtPct(sm.confidence_pct)}</td>
                <td>{fmtPct(sm.explainability_pct)}</td>
                <td><EvidenceBadge label={sm.evidence_label} /></td>
                <td>G {fmtInt(sm.gap_count)} · W {fmtInt(sm.wipe_count)} · L {fmtInt(sm.upper_lock_count)}/{fmtInt(sm.lower_lock_count)}</td>
              </tr>
            })}
          </tbody>
        </table>
      </div>
      {sorted.length === 0 && <div className="empty-table-note">No stocks match the current sector table filter.</div>}
    </div>
  );
}
