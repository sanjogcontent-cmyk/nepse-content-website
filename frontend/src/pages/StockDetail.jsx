import React, { useEffect, useMemo, useState } from 'react';
import { fmtInt, fmtRs, fmtPct, fmtPx, setRoute, loadJson } from '../utils.js';
import { StockOrderFlowChart, ChartStoryBridge } from '../components/OrderFlowCharts.jsx';

function n(v){ return Number(v || 0); }
function pct(part,total){ return total ? (n(part)/total*100) : 0; }
function sameBrokerAmount(scope){ return scope?.same_broker_amt_rs ?? scope?.same_broker_matched_amt_rs ?? scope?.same_broker_turnover_rs ?? null; }
function safeSlug(s){ return encodeURIComponent(String(s || '').toLowerCase().replace(/[^a-z0-9]+/g,'-')); }
function compactQty(v){
  const x = Math.abs(n(v));
  const sign = n(v) < 0 ? '-' : '';
  if (x >= 1_000_000) return `${sign}${(x/1_000_000).toFixed(2)}M`;
  if (x >= 1000) return `${sign}${(x/1000).toFixed(1)}k`;
  return `${sign}${fmtInt(x)}`;
}
function signedPx(v){
  if (v === null || v === undefined) return '—';
  const x = n(v);
  return `${x >= 0 ? '+' : '-'}${fmtPx(Math.abs(x)).replace('Rs ', '')}`;
}
function signedPct(v){
  if (v === null || v === undefined) return '—';
  const x = n(v);
  return `${x >= 0 ? '+' : ''}${fmtPct(x)}`;
}
function toneFromStock(summary = {}) {
  const change = n(summary.change_rs ?? summary.change_pct);
  const net = n(summary.net_aggr_amt_rs || summary.net_aggr_qty);
  if (change > 0 && net > 0) return { tone:'buy', title:'Upside confirmed', read:'Price rose with buy-aggressive money behind it.' };
  if (change > 0 && net < 0) return { tone:'mixed', title:'Up, but sellers active', read:'Price finished higher, but sell-aggressive money was still active underneath.' };
  if (change < 0 && net < 0) return { tone:'sell', title:'Downside confirmed', read:'Price fell while sell-aggressive money dominated the tape.' };
  if (change < 0 && net > 0) return { tone:'mixed', title:'Buy support failed', read:'Buy-aggressive money appeared, but price still closed weaker.' };
  if (net > 0) return { tone:'buy', title:'Buy pressure active', read:'Buy-aggressive money led, while price response was contained.' };
  if (net < 0) return { tone:'sell', title:'Sell pressure active', read:'Sell-aggressive money led, while price response was contained.' };
  return { tone:'neutral', title:'Balanced tape', read:'No clear aggressor-side dominance in the current payload.' };
}
function pressureShares(summary = {}) {
  const buy = n(summary.buy_aggr_amt_rs);
  const sell = n(summary.sell_aggr_amt_rs);
  const ambig = n(summary.ambig_amt_rs);
  const total = Math.max(buy + sell + ambig, 1);
  return { buy, sell, ambig, total, buyPct:pct(buy,total), sellPct:pct(sell,total), ambigPct:pct(ambig,total) };
}
function stockBoardBadges(issue, symbol) {
  const defs = [
    ['top_gainers','Top Gainer'],
    ['top_losers','Top Loser'],
    ['top_turnover','Top Turnover'],
    ['top_volume','Top Volume'],
    ['top_transactions','Top Transactions'],
  ];
  const leaderboards = issue?.leaderboards || issue?.public?.leaderboards || {};
  return defs.flatMap(([key,label]) => {
    const arr = leaderboards?.[key] || [];
    const idx = arr.findIndex(x => x?.symbol === symbol);
    return idx >= 0 ? [{ key, label, rank: idx + 1 }] : [];
  });
}
function findSectorRank(issue, sectorName) {
  const sectors = [...(issue?.sectors || [])].sort((a,b)=>n(b?.summary?.trade_amt_rs)-n(a?.summary?.trade_amt_rs));
  const idx = sectors.findIndex(s => s?.sector_name === sectorName);
  return idx >= 0 ? idx + 1 : null;
}

function StockPressureBar({ summary = {} }) {
  const { buy, sell, ambig, buyPct, sellPct, ambigPct } = pressureShares(summary);
  return <div className="stock-pressure-block">
    <div className="stock-pressure-bar" aria-label="Buy sell ambiguous amount pressure bar">
      <span className="buy" style={{ width: `${Math.max(0, buyPct)}%` }} />
      <span className="sell" style={{ width: `${Math.max(0, sellPct)}%` }} />
      <span className="ambig" style={{ width: `${Math.max(0, ambigPct)}%` }} />
    </div>
    <div className="stock-pressure-legend">
      <span><i className="buy" />Buy <b>{fmtRs(buy)}</b><em>{fmtPct(buyPct)}</em></span>
      <span><i className="sell" />Sell <b>{fmtRs(sell)}</b><em>{fmtPct(sellPct)}</em></span>
      <span><i className="ambig" />Ambig <b>{fmtRs(ambig)}</b><em>{fmtPct(ambigPct)}</em></span>
    </div>
  </div>;
}

function MiniBar({ label, value, max, tone }) {
  return <div className="stock-mini-bar">
    <span>{label}</span>
    <div><i className={tone} style={{ width: `${Math.max(4, n(value) / Math.max(n(max), 1) * 100)}%` }} /></div>
    <b className={tone}>{fmtRs(value)}</b>
  </div>;
}

function PriceRangeCard({ summary = {} }) {
  const low = n(summary.low_rs);
  const high = n(summary.high_rs);
  const close = n(summary.close_rs ?? summary.ltp_rs);
  const open = n(summary.open_rs);
  const vwap = n(summary.day_vwap_rs || summary.vwap_rs);
  const span = Math.max(high - low, 1);
  const pos = Math.min(100, Math.max(0, ((close - low) / span) * 100));
  return <article className="stock-story-card stock-price-card">
    <div className="stock-card-head"><div><span>Price truth</span><h2>Last POST frame</h2></div><small>LTP = today close</small></div>
    <div className="stock-price-main"><strong>{fmtPx(close)}</strong><em className={n(summary.change_rs) >= 0 ? 'buy' : 'sell'}>{signedPx(summary.change_rs)} · {signedPct(summary.change_pct)}</em></div>
    <div className="stock-range-line"><i style={{ left:`${pos}%` }} /></div>
    <div className="stock-price-grid">
      <span>Open <b>{fmtPx(open)}</b></span>
      <span>High <b className="buy">{fmtPx(high)}</b></span>
      <span>Low <b className="sell">{fmtPx(low)}</b></span>
      <span>Prev Close <b>{fmtPx(summary.previous_close_rs)}</b></span>
      <span>Day VWAP <b>{fmtPx(vwap)}</b></span>
      <span>Last Trade <b>{summary.last_traded_time ? String(summary.last_traded_time).slice(11,19) : '—'}</b></span>
    </div>
  </article>;
}

function StockProofCard({ stock, issue }) {
  const sm = stock.summary || {};
  const interpretation = toneFromStock(sm);
  const badges = stockBoardBadges(issue, stock.symbol);
  const same = sameBrokerAmount(sm);
  const samePct = same == null ? null : pct(same, Math.max(n(sm.trade_amt_rs), 1));
  return <article className={`stock-story-card stock-proof-card ${interpretation.tone}`}>
    <div className="stock-card-head"><div><span>Stock proof</span><h2>{interpretation.title}</h2></div><small>{badges.length ? badges.map(b => `#${b.rank} ${b.label}`).join(' · ') : 'Stock detail'}</small></div>
    <p className="stock-proof-read">{interpretation.read}</p>
    <div className="stock-proof-metrics">
      <span><small>Turnover</small><b>{fmtRs(sm.trade_amt_rs)}</b></span>
      <span><small>Net money pressure</small><b className={n(sm.net_aggr_amt_rs) >= 0 ? 'buy' : 'sell'}>{fmtRs(sm.net_aggr_amt_rs)}</b></span>
      <span><small>Net quantity</small><b className={n(sm.net_aggr_qty) >= 0 ? 'buy' : 'sell'}>{compactQty(sm.net_aggr_qty)}</b></span>
      <span><small>Transactions</small><b>{fmtInt(sm.transactions)}</b></span>
    </div>
    <div className="stock-proof-badges">
      {badges.map(b => <button key={b.key} onClick={() => setRoute(`/boards?board=${b.key.replace('top_','')}&date=${issue.business_date}`)}>#{b.rank} {b.label}</button>)}
      {same != null && <button className="same">Same-broker {fmtPct(samePct)}</button>}
    </div>
  </article>;
}

function SameBrokerCompact({ summary = {} }) {
  const same = sameBrokerAmount(summary);
  const total = Math.max(n(summary.trade_amt_rs), 1);
  if (same == null) return <article className="stock-story-card stock-same-card"><div className="stock-card-head"><div><span>Same-broker</span><h2>Not available</h2></div></div><p>Buyer=seller broker matched turnover is not in this payload.</p></article>;
  const ratio = Math.min(100, pct(same, total));
  return <article className="stock-story-card stock-same-card">
    <div className="stock-card-head"><div><span>Same-broker context</span><h2>{fmtPct(ratio)} of turnover</h2></div><small>buyer = seller broker</small></div>
    <div className="stock-same-meter"><i style={{ width:`${ratio}%` }} /></div>
    <div className="stock-same-grid">
      <span>Amount <b>{fmtRs(same)}</b></span>
      <span>Qty <b>{fmtInt(summary.same_broker_qty)}</b></span>
      <span>Trades <b>{fmtInt(summary.same_broker_trades || summary.same_broker_match_count)}</b></span>
      <span>Buckets <b>{fmtInt(summary.same_broker_buckets)}</b></span>
    </div>
    <p>Context evidence only. This is shown to support market reading, not to make an accusation.</p>
  </article>;
}

function StockHistoryMini({ entries = [], symbol }) {
  const sorted = [...entries].sort((a,b)=>(a.business_date||'').localeCompare(b.business_date||''));
  const values = sorted.map(x => n(x.net_aggr_amt_rs));
  const width = 280, height = 82, pad = 8;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 1;
  const span = Math.max(max - min, 1);
  const pts = values.map((v,i)=>`${pad + i * (width - pad*2)/Math.max(values.length-1,1)},${height - pad - ((v-min)/span)*(height-pad*2)}`).join(' ');
  return <article className="stock-story-card stock-history-card">
    <div className="stock-card-head"><div><span>Archive</span><h2>Stock history</h2></div><small>{sorted.length} issue rows</small></div>
    {values.length ? <svg className={`stock-history-spark ${values.at(-1) >= 0 ? 'buy':'sell'}`} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><polyline points={pts} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg> : <div className="stock-empty-spark">No history yet</div>}
    <div className="stock-history-chips">
      {sorted.slice(-6).map(entry => <button key={entry.business_date} onClick={() => setRoute(`/stocks/${symbol}?date=${entry.business_date}`)}>
        <strong>{entry.business_date}</strong>
        <span className={n(entry.net_aggr_amt_rs) >= 0 ? 'buy' : 'sell'}>{fmtRs(entry.net_aggr_amt_rs)}</span>
      </button>)}
    </div>
  </article>;
}

function EvidenceDrawer({ stock, sectorEntry, historyEntries }) {
  const sm = stock.summary || {};
  return <details className="stock-technical-drawer">
    <summary>Open full technical evidence table</summary>
    <div className="stock-technical-grid">
      <span>Buy VWAP <b className="buy">{fmtPx(sm.buy_aggr_vwap_rs || sm.buy_aggr_avg_px_rs)}</b></span>
      <span>Sell VWAP <b className="sell">{fmtPx(sm.sell_aggr_vwap_rs || sm.sell_aggr_avg_px_rs)}</b></span>
      <span>Ambig VWAP <b className="ambig">{fmtPx(sm.ambig_vwap_rs || sm.ambig_avg_px_rs)}</b></span>
      <span>Confidence <b>{fmtPct(sm.confidence_pct)}</b></span>
      <span>Explainability <b>{fmtPct(sm.explainability_pct)}</b></span>
      <span>Evidence <b>{sm.evidence_label || '—'}</b></span>
      <span>Gap count <b>{fmtInt(sm.gap_count)}</b></span>
      <span>Wipe count <b>{fmtInt(sm.wipe_count)}</b></span>
      <span>Upper lock <b>{fmtInt(sm.upper_lock_count)}</b></span>
      <span>Lower lock <b>{fmtInt(sm.lower_lock_count)}</b></span>
      <span>Sector <b>{sectorEntry?.sector_name || stock.sector_name || '—'}</b></span>
      <span>Matched buckets <b>{fmtInt(sm.matched_buckets)}</b></span>
    </div>
    {historyEntries.length > 0 && <div className="stock-history-table-wrap"><table>
      <thead><tr><th>Date</th><th>Turnover</th><th>Buy Amt</th><th>Sell Amt</th><th>Ambig</th><th>Net</th><th>Open Daily</th></tr></thead>
      <tbody>{historyEntries.map(entry => <tr key={entry.business_date}>
        <td>{entry.business_date}</td>
        <td>{fmtRs(entry.trade_amt_rs)}</td>
        <td className="buy">{fmtRs(entry.buy_aggr_amt_rs)}</td>
        <td className="sell">{fmtRs(entry.sell_aggr_amt_rs)}</td>
        <td className="ambig">{fmtRs(entry.ambig_amt_rs)}</td>
        <td className={n(entry.net_aggr_amt_rs) >= 0 ? 'buy':'sell'}>{fmtRs(entry.net_aggr_amt_rs)}</td>
        <td><button onClick={() => setRoute(`/daily/${entry.business_date}`)}>Open</button></td>
      </tr>)}</tbody>
    </table></div>}
  </details>;
}

export default function StockDetail({ issue, symbol }) {
  const sectorEntry = useMemo(() => (issue?.sectors || []).find(sec => (sec.stocks || []).some(st => st.symbol === symbol)), [issue, symbol]);
  const stock = useMemo(() => sectorEntry?.stocks?.find(st => st.symbol === symbol), [sectorEntry, symbol]);
  const businessDate = issue?.business_date || 'latest';
  const [stockIndex, setStockIndex] = useState({ items: {} });
  useEffect(() => {
    let cancelled = false;
    loadJson('/content/indexes/stocks.index.json').then(d => { if (!cancelled) setStockIndex(d); }).catch(() => { if (!cancelled) setStockIndex({ items: {} }); });
    return () => { cancelled = true; };
  }, []);

  const historyEntries = useMemo(() => {
    const node = stockIndex?.items?.[symbol];
    return [...(node?.entries || [])].sort((a,b) => (a.business_date || '').localeCompare(b.business_date || ''));
  }, [stockIndex, symbol]);

  if (!stock) {
    return <main className="stock-public-page"><section className="stock-public-shell"><div className="stock-not-found"><h1>Stock not found</h1><p>The stock link could not be resolved from the current issue.</p><button onClick={() => setRoute('/stocks')}>Open stock index</button></div></section></main>;
  }

  const sm = stock.summary || {};
  const flow = toneFromStock(sm);
  const same = sameBrokerAmount(sm);
  const sectorRank = findSectorRank(issue, sectorEntry?.sector_name || stock.sector_name);
  const maxAmount = Math.max(n(sm.buy_aggr_amt_rs), n(sm.sell_aggr_amt_rs), n(sm.ambig_amt_rs), same || 0, 1);
  const stockInterpretation = issue?.cms?.stock_interpretations?.[stock.symbol] || issue?.public_cms?.stock_interpretations?.[stock.symbol] || '';

  return <main className="stock-public-page stock-detail-page-v14h">
    <section className="stock-public-shell">
      <div className="stock-detail-nav">
        <button onClick={() => setRoute(`/daily/${businessDate}`)}>← Daily Issue</button>
        {sectorEntry && <button onClick={() => setRoute(`/sectors/${safeSlug(sectorEntry.sector_name)}?date=${businessDate}`)}>{sectorEntry.sector_name}</button>}
        <button onClick={() => setRoute('/stocks')}>All stocks</button>
        <button onClick={() => setRoute('/boards')}>Market boards</button>
      </div>

      <section className={`stock-hero-v14h ${flow.tone}`}>
        <div className="stock-hero-copy">
          <p className="stock-kicker">Stock story · {businessDate}</p>
          <div className="stock-title-row"><h1>{stock.symbol}</h1><span>{flow.title}</span></div>
          <p className="stock-company-line">{stock.company_name || stock.security_name || 'Company name unavailable'} · {stock.sector_name || sectorEntry?.sector_name || 'Unmapped sector'}</p>
          <p className="stock-story-line">{flow.read}</p>
          <div className="stock-hero-actions">
            {sectorEntry && <button onClick={() => setRoute(`/sectors/${safeSlug(sectorEntry.sector_name)}?date=${businessDate}`)}>Open sector</button>}
            <button onClick={() => setRoute(`/daily/${businessDate}`)}>Open daily issue</button>
          </div>
        </div>
        <div className="stock-hero-scoreboard">
          <span className="ltp"><small>LTP / Today close</small><b>{fmtPx(sm.close_rs ?? sm.ltp_rs)}</b><em className={n(sm.change_rs) >= 0 ? 'buy' : 'sell'}>{signedPx(sm.change_rs)} · {signedPct(sm.change_pct)}</em></span>
          <span><small>Turnover</small><b>{fmtRs(sm.trade_amt_rs)}</b></span>
          <span><small>Net money pressure</small><b className={n(sm.net_aggr_amt_rs) >= 0 ? 'buy':'sell'}>{fmtRs(sm.net_aggr_amt_rs)}</b></span>
          <span><small>Sector rank</small><b>{sectorRank ? `#${sectorRank}` : '—'}</b><em>{sectorEntry?.sector_name || stock.sector_name || ''}</em></span>
        </div>
      </section>

      {stockInterpretation && <section className="stock-editor-note"><span>Editor interpretation</span><p>{stockInterpretation}</p></section>}

      <section className="stock-flow-proof-section">
        <div className="daily14g-section-head">
          <div>
            <p className="daily14g-section-kicker">Main order-flow proof</p>
            <h2>{stock.symbol} cumulative delta and cumulative volume.</h2>
            <small>This is the stock content chart: delta shows conviction, volume shows how participation built behind it.</small>
          </div>
        </div>
        <StockOrderFlowChart series={sm.orderflow_path} symbol={stock.symbol} />
        <ChartStoryBridge
          leftTitle="Final cumulative delta"
          leftValue={sm.orderflow_path?.final_delta_qty != null ? `${n(sm.orderflow_path.final_delta_qty) >= 0 ? '+' : ''}${fmtInt(sm.orderflow_path.final_delta_qty)}` : fmtInt(sm.net_aggr_qty)}
          rightTitle="Cumulative volume"
          rightValue={fmtInt(sm.orderflow_path?.final_volume || sm.trade_qty)}
          read={sm.orderflow_path?.flow_read || flow.read}
        />
      </section>

      <section className="stock-main-grid-v14h">
        <article className="stock-story-card stock-pressure-card-main">
          <div className="stock-card-head"><div><span>Money pressure</span><h2>Buy vs Sell vs Ambiguous</h2></div><small>amount-based truth</small></div>
          <StockPressureBar summary={sm} />
          <div className="stock-money-bars">
            <MiniBar label="Buy aggressor" value={sm.buy_aggr_amt_rs} max={maxAmount} tone="buy" />
            <MiniBar label="Sell aggressor" value={sm.sell_aggr_amt_rs} max={maxAmount} tone="sell" />
            <MiniBar label="Ambiguous" value={sm.ambig_amt_rs} max={maxAmount} tone="ambig" />
            {same != null && <MiniBar label="Same-broker" value={same} max={maxAmount} tone="same" />}
          </div>
        </article>
        <PriceRangeCard summary={sm} />
      </section>

      <section className="stock-three-grid-v14h">
        <StockProofCard stock={stock} issue={issue} />
        <SameBrokerCompact summary={sm} />
        <StockHistoryMini entries={historyEntries} symbol={symbol} />
      </section>

      <section className="stock-context-grid-v14h">
        <article className="stock-story-card stock-sector-context-card">
          <div className="stock-card-head"><div><span>Sector context</span><h2>{sectorEntry?.sector_name || stock.sector_name || 'Unmapped sector'}</h2></div><small>{sectorRank ? `#${sectorRank} by turnover` : 'sector'}</small></div>
          <div className="stock-sector-metrics">
            <span>Total sector turnover <b>{fmtRs(sectorEntry?.summary?.trade_amt_rs)}</b></span>
            <span>Sector buy amount <b className="buy">{fmtRs(sectorEntry?.summary?.buy_aggr_amt_rs)}</b></span>
            <span>Sector sell amount <b className="sell">{fmtRs(sectorEntry?.summary?.sell_aggr_amt_rs)}</b></span>
            <span>Active stocks <b>{fmtInt(sectorEntry?.active_stocks)}</b></span>
          </div>
          <p>This places {stock.symbol} inside the sector pressure map without hiding the individual stock proof.</p>
        </article>
        <article className="stock-story-card stock-cues-card">
          <div className="stock-card-head"><div><span>Story cues</span><h2>How to present it</h2></div><small>public content ready</small></div>
          <div className="stock-cue-list">
            <span><b>Price</b><small>{n(sm.change_rs) >= 0 ? 'Price closed above previous close.' : 'Price closed below previous close.'}</small></span>
            <span><b>Flow</b><small>{n(sm.net_aggr_amt_rs) >= 0 ? 'Buy-aggressive money was stronger than sell-aggressive money.' : 'Sell-aggressive money was stronger than buy-aggressive money.'}</small></span>
            <span><b>VWAP</b><small>{sm.close_rs != null && (sm.day_vwap_rs || sm.vwap_rs) != null ? `Close finished ${n(sm.close_rs) >= n(sm.day_vwap_rs || sm.vwap_rs) ? 'above' : 'below'} day VWAP.` : 'VWAP comparison unavailable.'}</small></span>
            <span><b>Evidence</b><small>{sm.evidence_label || 'Evidence label unavailable'} · confidence {fmtPct(sm.confidence_pct)}.</small></span>
          </div>
        </article>
      </section>

      <EvidenceDrawer stock={stock} sectorEntry={sectorEntry} historyEntries={historyEntries} />
    </section>
  </main>;
}
