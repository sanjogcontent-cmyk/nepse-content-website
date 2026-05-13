import React, { useMemo, useState } from 'react';
import { fmtInt, fmtRs, fmtPct } from '../utils.js';
import { EvidenceBadge } from './Numbers.jsx';
import { FlowBar, IndexMini } from './Charts.jsx';
import { trackEvent } from '../analytics/tracker.js';

function sectorBias(summary = {}) {
  const net = Number(summary.net_aggr_qty || 0);
  if (net > 0) return 'Buy pressure';
  if (net < 0) return 'Sell pressure';
  return 'Mixed';
}

function scoreFor(sec, mode) {
  const sm = sec.summary || {};
  const idx = sec.index || {};
  if (mode === 'net_abs') return Math.abs(Number(sm.net_aggr_qty || 0));
  if (mode === 'buy_pressure') return Number(sm.buy_aggr_qty || 0);
  if (mode === 'sell_pressure') return Number(sm.sell_aggr_qty || 0);
  if (mode === 'confidence') return Number(sm.confidence_pct || 0) + Number(sm.explainability_pct || 0);
  if (mode === 'index_move') return Math.abs(Number(idx.change_pct || 0));
  if (mode === 'stocks') return Number(sec.active_stocks || 0);
  return Number(sm.trade_amt_rs || 0);
}

function sortLabel(mode) {
  return {
    trade_amt: 'Trade amount',
    net_abs: 'Absolute net pressure',
    buy_pressure: 'Buy aggression',
    sell_pressure: 'Sell aggression',
    confidence: 'Evidence quality',
    index_move: 'Index movement',
    stocks: 'Active stocks'
  }[mode] || 'Trade amount';
}

function TurnoverShare({ value, total }) {
  const pct = total > 0 ? Number(value || 0) / total * 100 : 0;
  return (
    <div className="turnover-share">
      <span style={{ width: `${Math.max(2, Math.min(100, pct))}%` }} />
      <b>{fmtPct(pct)}</b>
    </div>
  );
}

export default function SectorBoard({ sectors = [], selected, onSelect, marketSummary }) {
  const [query, setQuery] = useState('');
  const [bias, setBias] = useState('all');
  const [evidence, setEvidence] = useState('all');
  const [sortMode, setSortMode] = useState('trade_amt');
  const totalAmt = useMemo(() => Number(marketSummary?.trade_amt_rs || sectors.reduce((acc, sec) => acc + Number(sec.summary?.trade_amt_rs || 0), 0)), [marketSummary, sectors]);

  const stats = useMemo(() => {
    const buy = sectors.filter(s => Number(s.summary?.net_aggr_qty || 0) > 0).length;
    const sell = sectors.filter(s => Number(s.summary?.net_aggr_qty || 0) < 0).length;
    const high = sectors.filter(s => String(s.summary?.evidence_label || '').toLowerCase().includes('high')).length;
    return { buy, sell, high, total: sectors.length };
  }, [sectors]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...sectors]
      .filter(sec => !q || sec.sector_name.toLowerCase().includes(q))
      .filter(sec => {
        const net = Number(sec.summary?.net_aggr_qty || 0);
        if (bias === 'buy') return net > 0;
        if (bias === 'sell') return net < 0;
        if (bias === 'mixed') return net === 0;
        return true;
      })
      .filter(sec => {
        const label = String(sec.summary?.evidence_label || '').toLowerCase();
        if (evidence === 'high') return label.includes('high');
        if (evidence === 'medium') return label.includes('medium');
        if (evidence === 'lower') return label.includes('lower') || label.includes('low');
        return true;
      })
      .sort((a, b) => scoreFor(b, sortMode) - scoreFor(a, sortMode));
  }, [sectors, query, bias, evidence, sortMode]);

  return (
    <section className="sector-board phase3-sector-board" id="sectors">
      <div className="section-head-inline phase3-sector-head">
        <div>
          <p className="eyebrow">Sector summary</p>
          <h2>Market → Sector → Stocks</h2>
          <p>Choose a sector to read its daily order-flow summary and the stocks inside it. Full Buy/Sell aggressor quantity and proxy amount are preserved in each summary.</p>
        </div>
        <div className="sector-board-stats" aria-label="Sector interaction summary">
          <span>Total sectors <b>{fmtInt(stats.total)}</b></span>
          <span>Buy pressure <b className="buy">{fmtInt(stats.buy)}</b></span>
          <span>Sell pressure <b className="sell">{fmtInt(stats.sell)}</b></span>
          <span>High evidence <b>{fmtInt(stats.high)}</b></span>
        </div>
      </div>

      <div className="sector-toolbar panel compact-panel">
        <label className="search-control">
          <span>Find sector</span>
          <input value={query} onChange={e => { setQuery(e.target.value); if (e.target.value.trim()) trackEvent('sector_search_used', { payload: { search_term: e.target.value, search_scope: 'sector' } }); }} placeholder="Search Hydro, Investment, Banks..." />
        </label>
        <label>
          <span>Bias</span>
          <select value={bias} onChange={e => { setBias(e.target.value); trackEvent('sector_filter_used', { payload: { filter: 'bias', value: e.target.value } }); }}>
            <option value="all">All sectors</option>
            <option value="buy">Buy pressure</option>
            <option value="sell">Sell pressure</option>
            <option value="mixed">Mixed / flat</option>
          </select>
        </label>
        <label>
          <span>Evidence</span>
          <select value={evidence} onChange={e => { setEvidence(e.target.value); trackEvent('sector_filter_used', { payload: { filter: 'evidence', value: e.target.value } }); }}>
            <option value="all">All evidence</option>
            <option value="high">High evidence</option>
            <option value="medium">Medium evidence</option>
            <option value="lower">Lower evidence</option>
          </select>
        </label>
        <label>
          <span>Sort</span>
          <select value={sortMode} onChange={e => { setSortMode(e.target.value); trackEvent('sector_sort_used', { payload: { sort_mode: e.target.value } }); }}>
            <option value="trade_amt">Trade amount</option>
            <option value="net_abs">Absolute net pressure</option>
            <option value="buy_pressure">Buy aggression</option>
            <option value="sell_pressure">Sell aggression</option>
            <option value="confidence">Evidence quality</option>
            <option value="index_move">Index movement</option>
            <option value="stocks">Active stocks</option>
          </select>
        </label>
      </div>

      <div className="sector-result-strip">
        <span>Showing <b>{fmtInt(visible.length)}</b> sectors</span>
        <span>Sorted by <b>{sortLabel(sortMode)}</b></span>
        {selected && <span>Selected <b>{selected}</b></span>}
      </div>

      <div className="sector-grid phase3-sector-grid">
        {visible.map((sec, idx) => {
          const sm = sec.summary || {};
          const active = selected === sec.sector_name;
          const net = Number(sm.net_aggr_qty || 0);
          return (
            <button
              className={`sector-tile phase3-sector-tile ${active ? 'active' : ''}`}
              key={sec.sector_name}
              onClick={() => onSelect(sec.sector_name)}
              aria-pressed={active}
              title={`Open ${sec.sector_name} sector`}
            >
              <div className="sector-title">
                <div>
                  <span className="sector-rank">#{idx + 1}</span>
                  <strong>{sec.sector_name}</strong>
                </div>
                <EvidenceBadge label={sm.evidence_label} />
              </div>
              <div className="sector-bias-row">
                <span className={net >= 0 ? 'buy' : 'sell'}>{sectorBias(sm)}</span>
                <span>{fmtInt(sec.active_stocks)} active stocks</span>
              </div>
              <FlowBar buy={sm.buy_aggr_qty} sell={sm.sell_aggr_qty} ambig={sm.ambig_qty} />
              <TurnoverShare value={sm.trade_amt_rs} total={totalAmt} />
              <div className="tile-metrics phase3-tile-metrics">
                <span>Trade Amt <b>{fmtRs(sm.trade_amt_rs)}</b></span>
                <span>Trade Qty <b>{fmtInt(sm.trade_qty)}</b></span>
                <span>Net Agg Qty <b className={net >= 0 ? 'buy' : 'sell'}>{fmtInt(sm.net_aggr_qty)}</b></span>
                <span>Buy Agg Amt <b className="buy">{fmtRs(sm.buy_aggr_amt_rs)}</b></span>
                <span>Sell Agg Amt <b className="sell">{fmtRs(sm.sell_aggr_amt_rs)}</b></span>
                <span>Buckets <b>{fmtInt(sm.buckets)}</b></span>
                <span>Confidence <b>{fmtPct(sm.confidence_pct)}</b></span>
                <span>Explainability <b>{fmtPct(sm.explainability_pct)}</b></span>
              </div>
              <IndexMini index={sec.index} />
            </button>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="panel empty-state">
          <h3>No sectors match this filter.</h3>
          <p>Clear search, bias, or evidence filters to return to the full daily sector board.</p>
          <button className="secondary small" onClick={() => { setQuery(''); setBias('all'); setEvidence('all'); }}>Clear filters</button>
        </div>
      )}
    </section>
  );
}
