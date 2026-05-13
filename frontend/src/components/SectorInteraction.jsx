import React, { useEffect, useMemo, useState } from 'react';
import SummaryBar from './SummaryBar.jsx';
import StockTable from './StockTable.jsx';
import { FlowBar, IndexMini } from './Charts.jsx';
import { EvidenceBadge } from './Numbers.jsx';
import { fmtInt, fmtRs, fmtPct, fmtPx } from '../utils.js';
import { trackEvent } from '../analytics/tracker.js';

function sectorThesis(sector) {
  if (!sector) return '';
  const sm = sector.summary || {};
  const side = Number(sm.net_aggr_qty || 0) >= 0 ? 'buy-aggressive' : 'sell-aggressive';
  return `${sector.sector_name} recorded ${fmtRs(sm.trade_amt_rs)} turnover from ${fmtInt(sm.trade_qty)} traded shares, with ${side} net flow of ${fmtInt(sm.net_aggr_qty)} shares across ${fmtInt(sm.buckets)} buckets.`;
}

function stockThesis(stock) {
  if (!stock) return '';
  const sm = stock.summary || {};
  const side = Number(sm.net_aggr_qty || 0) >= 0 ? 'buy-aggressive dominance' : 'sell-aggressive dominance';
  return `${stock.symbol} showed ${side} with net aggressor quantity of ${fmtInt(sm.net_aggr_qty)}, confidence ${fmtPct(sm.confidence_pct)}, and explainability ${fmtPct(sm.explainability_pct)}.`;
}

function topBy(stocks = [], fn, dir = 'desc') {
  const arr = [...stocks];
  arr.sort((a, b) => {
    const r = Number(fn(a) || 0) - Number(fn(b) || 0);
    return dir === 'asc' ? r : -r;
  });
  return arr[0] || null;
}

function LeaderCard({ label, stock, metric, tone, onClick }) {
  if (!stock) return null;
  return (
    <button className="leader-card" onClick={() => onClick(stock.symbol)}>
      <span>{label}</span>
      <strong>{stock.symbol}</strong>
      <em>{stock.company_name || stock.security_name || '—'}</em>
      <b className={tone}>{metric}</b>
    </button>
  );
}

function SectorStoryStrip({ sector, stock, onSelectSymbol }) {
  const stocks = sector?.stocks || [];
  const topTurnover = useMemo(() => topBy(stocks, st => st.summary?.trade_amt_rs), [stocks]);
  const topBuy = useMemo(() => topBy(stocks, st => st.summary?.net_aggr_qty), [stocks]);
  const topSell = useMemo(() => topBy(stocks, st => st.summary?.net_aggr_qty, 'asc'), [stocks]);
  const topImbalance = useMemo(() => topBy(stocks, st => Math.abs(Number(st.summary?.net_aggr_qty || 0))), [stocks]);
  return (
    <div className="sector-story-strip">
      <LeaderCard label="Top turnover" stock={topTurnover} metric={fmtRs(topTurnover?.summary?.trade_amt_rs)} tone="" onClick={onSelectSymbol} />
      <LeaderCard label="Strongest buy net" stock={topBuy} metric={fmtInt(topBuy?.summary?.net_aggr_qty)} tone="buy" onClick={onSelectSymbol} />
      <LeaderCard label="Strongest sell net" stock={topSell} metric={fmtInt(topSell?.summary?.net_aggr_qty)} tone="sell" onClick={onSelectSymbol} />
      <LeaderCard label="Largest imbalance" stock={topImbalance} metric={fmtInt(Math.abs(Number(topImbalance?.summary?.net_aggr_qty || 0)))} tone={Number(topImbalance?.summary?.net_aggr_qty || 0) >= 0 ? 'buy' : 'sell'} onClick={onSelectSymbol} />
    </div>
  );
}

function SectorCommandBar({ sectors = [], sector, stock, onSelectSector, onSelectSymbol }) {
  const [copied, setCopied] = useState(false);
  const idx = sectors.findIndex(s => s.sector_name === sector?.sector_name);
  const prev = idx > 0 ? sectors[idx - 1] : sectors[sectors.length - 1];
  const next = idx >= 0 && idx < sectors.length - 1 ? sectors[idx + 1] : sectors[0];

  function copyLink() {
    const url = new URL(window.location.href);
    if (sector?.sector_name) url.searchParams.set('sector', sector.sector_name);
    if (stock?.symbol) url.searchParams.set('symbol', stock.symbol);
    navigator.clipboard?.writeText(url.toString());
    trackEvent('sector_deep_link_copied', { sector_name: sector?.sector_name, symbol: stock?.symbol, page_path: window.location.pathname + window.location.search });
    if (stock?.symbol) trackEvent('stock_deep_link_copied', { sector_name: sector?.sector_name, symbol: stock.symbol, page_path: window.location.pathname + window.location.search });
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <div className="sector-command-bar panel compact-panel">
      <div>
        <span className="soft-label">Sector reader path</span>
        <strong>{sector?.sector_name || 'Sector'} → {stock?.symbol || 'Stock'}</strong>
      </div>
      <div className="command-actions">
        <button className="secondary small" onClick={() => prev && onSelectSector(prev.sector_name)}>← Previous sector</button>
        <button className="secondary small" onClick={() => next && onSelectSector(next.sector_name)}>Next sector →</button>
        <button className="secondary small" onClick={() => stock && onSelectSymbol(stock.symbol)}>Focus selected stock</button>
        <button className="primary small" onClick={copyLink}>{copied ? 'Copied link' : 'Copy deep link'}</button>
      </div>
    </div>
  );
}

function StockTeaser({ stock }) {
  useEffect(() => {
    if (stock?.symbol) {
      trackEvent('stock_teaser_viewed', { symbol: stock.symbol, sector_name: stock.sector_name });
    }
  }, [stock?.symbol]);
  if (!stock) return null;
  const sm = stock.summary || {};
  return (
    <div className="stock-teaser panel phase3-stock-teaser">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Stock teaser</p>
          <h2>{stock.symbol}</h2>
          <p>{stock.company_name || stock.security_name}</p>
        </div>
        <EvidenceBadge label={sm.evidence_label} />
      </div>
      <SummaryBar title={`${stock.symbol} daily summary`} summary={sm} scope="stock" showPrices />
      <div className="stock-teaser-grid">
        <span>VWAP <b>{fmtPx(sm.vwap_rs)}</b></span>
        <span>Buy avg proxy <b>{fmtPx(sm.buy_aggr_avg_px_rs)}</b></span>
        <span>Sell avg proxy <b>{fmtPx(sm.sell_aggr_avg_px_rs)}</b></span>
        <span>Net Agg Amt <b className={sm.net_aggr_amt_rs >= 0 ? 'buy' : 'sell'}>{fmtRs(sm.net_aggr_amt_rs)}</b></span>
      </div>
      <div className="teaser-copy">
        <h3>Why this stock matters today</h3>
        <p>{stockThesis(stock)}</p>
        <p>This website intentionally stops at the summary. The YouTube video should open the Truth Viewer and order-flow platform to prove whether the day was pressure, absorption, exhaustion, broker-led selling, or clean continuation.</p>
        <a className="primary small as-link" href="#video">Watch full video analysis</a>
      </div>
    </div>
  );
}

export default function SectorInteraction({ issue, sectors = [], sector, selectedSymbol, onSelectSector, onSelectSymbol }) {
  const [view, setView] = useState('overview');
  const stock = useMemo(() => sector?.stocks?.find(s => s.symbol === selectedSymbol) || sector?.stocks?.[0] || null, [sector, selectedSymbol]);
  if (!sector) return null;
  const marketAmt = Number(issue.market_summary?.trade_amt_rs || 0);
  const share = marketAmt > 0 ? Number(sector.summary?.trade_amt_rs || 0) / marketAmt * 100 : 0;
  const sm = sector.summary || {};

  return (
    <section className="sector-drill phase3-sector-interaction" id="stocks">
      <SectorCommandBar sectors={sectors} sector={sector} stock={stock} onSelectSector={onSelectSector} onSelectSymbol={onSelectSymbol} />

      <div className="drill-head phase3-drill-head">
        <div>
          <p className="eyebrow">Selected sector workspace</p>
          <h2>{sector.sector_name}</h2>
          <p>{sectorThesis(sector)}</p>
        </div>
        <div className="sector-index-card phase3-index-card">
          <span>Sector share of turnover</span>
          <strong>{fmtPct(share)}</strong>
          <IndexMini index={sector.index} />
        </div>
      </div>

      <div className="sector-lens-tabs" role="tablist" aria-label="Sector interaction view">
        <button className={view === 'overview' ? 'active' : ''} onClick={() => setView('overview')}>Overview</button>
        <button className={view === 'leaders' ? 'active' : ''} onClick={() => setView('leaders')}>Leaders</button>
        <button className={view === 'stocks' ? 'active' : ''} onClick={() => setView('stocks')}>Stocks</button>
        <button className={view === 'teaser' ? 'active' : ''} onClick={() => setView('teaser')}>Stock teaser</button>
      </div>

      {(view === 'overview' || view === 'leaders') && (
        <div className="sector-overview-grid">
          <div className="panel sector-flow-panel">
            <div className="panel-head"><div><p className="eyebrow">Sector pressure mix</p><h2>Aggressor flow split</h2></div></div>
            <FlowBar buy={sm.buy_aggr_qty} sell={sm.sell_aggr_qty} ambig={sm.ambig_qty} />
            <div className="sector-flow-facts">
              <span>Buy Agg <b className="buy">{fmtInt(sm.buy_aggr_qty)}</b></span>
              <span>Sell Agg <b className="sell">{fmtInt(sm.sell_aggr_qty)}</b></span>
              <span>Ambig <b>{fmtInt(sm.ambig_qty)}</b></span>
              <span>Net <b className={sm.net_aggr_qty >= 0 ? 'buy' : 'sell'}>{fmtInt(sm.net_aggr_qty)}</b></span>
            </div>
          </div>
          <div className="panel sector-quality-panel">
            <div className="panel-head"><div><p className="eyebrow">Evidence guardrail</p><h2>Can we trust the sector read?</h2></div><EvidenceBadge label={sm.evidence_label} /></div>
            <div className="quality-meter"><span style={{ width: `${Math.min(100, Number(sm.confidence_pct || 0))}%` }} /></div>
            <div className="sector-flow-facts">
              <span>Confidence <b>{fmtPct(sm.confidence_pct)}</b></span>
              <span>Explainability <b>{fmtPct(sm.explainability_pct)}</b></span>
              <span>Gap <b>{fmtInt(sm.gap_count)}</b></span>
              <span>Wipe <b>{fmtInt(sm.wipe_count)}</b></span>
            </div>
          </div>
        </div>
      )}

      {(view === 'overview' || view === 'leaders') && <SectorStoryStrip sector={sector} stock={stock} onSelectSymbol={onSelectSymbol} />}

      {(view === 'overview' || view === 'stocks') && <SummaryBar title={`${sector.sector_name} sector summary`} summary={sector.summary} scope="sector" />}

      {(view === 'overview' || view === 'stocks') && (
        <div className="stock-list-panel panel phase3-stock-list-panel">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Stocks inside sector</p>
              <h2>Ranked stock summary</h2>
              <p>Search, filter, sort, then click a stock to update the teaser without leaving the daily issue.</p>
            </div>
          </div>
          <StockTable stocks={sector.stocks || []} selectedSymbol={stock?.symbol} onSelect={onSelectSymbol} />
        </div>
      )}

      {(view === 'overview' || view === 'teaser') && <StockTeaser stock={stock} />}
    </section>
  );
}
