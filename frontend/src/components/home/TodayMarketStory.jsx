import React from 'react';
import { fmtInt, fmtRs, fmtPct, flowShares, biasWord, biasTone, safeArr, sameBrokerPct, n, netAmount, setRoute } from './homeUtils.js';
import { IndexSparkline } from '../IndexChart.jsx';
import { AggressorBalanceChart } from '../OrderFlowCharts.jsx';

function PulseCard({ label, value, sub, tone = '' }) {
  return <div className={`pulse-card ${tone}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    {sub && <small>{sub}</small>}
  </div>;
}


function AggressorAmountMix({ market, shares, tone }) {
  const buyAmt = n(market.buy_aggr_amt_rs);
  const sellAmt = n(market.sell_aggr_amt_rs);
  const ambigAmt = n(market.ambig_amt_rs);
  const totalAmt = Math.max(buyAmt + sellAmt + ambigAmt, 1);
  const buyPct = Math.max(0, (buyAmt / totalAmt) * 100);
  const sellPct = Math.max(0, (sellAmt / totalAmt) * 100);
  const ambigPct = Math.max(0, (ambigAmt / totalAmt) * 100);
  const netAmt = netAmount(market);
  const netTone = netAmt >= 0 ? 'buy' : 'sell';
  const netLabel = netAmt >= 0 ? 'Buy-led' : 'Sell-led';
  const buyEnd = buyPct;
  const ambigEnd = Math.min(100, buyPct + ambigPct);
  const pieStyle = {
    background: `conic-gradient(var(--ed-green) 0 ${buyEnd}%, #f2b02e ${buyEnd}% ${ambigEnd}%, var(--ed-red) ${ambigEnd}% 100%)`,
  };

  return <div className={`aggressor-mix-panel ${netTone}`}>
    <div className="aggressor-donut-wrap">
      <div className="aggressor-donut" style={pieStyle} aria-label="Aggressor amount composition donut">
        <div className="aggressor-donut-center">
          <span>Net aggressor</span>
          <strong>{fmtRs(netAmt)}</strong>
          <em>{netLabel}</em>
        </div>
        <div className="aggressor-donut-rim" aria-hidden="true" />
      </div>
    </div>
    <div className="aggressor-mix-copy">
      <div className="aggressor-mix-title">
        <p>Aggressor amount mix</p>
        <h3>{netAmt >= 0 ? 'Buy aggressor money led the balance' : 'Sell aggressor money led the balance'}</h3>
        <small>Donut = buy/sell/ambiguous composition. Center = net aggressor amount.</small>
      </div>
      <div className="aggressor-amount-list">
        <span className="buy"><i /> <b>Buy aggressor amount</b><strong>{fmtRs(buyAmt)}</strong><em>{buyPct.toFixed(1)}%</em></span>
        <span className="sell"><i /> <b>Sell aggressor amount</b><strong>{fmtRs(sellAmt)}</strong><em>{sellPct.toFixed(1)}%</em></span>
        <span className="warn"><i /> <b>Ambiguous amount</b><strong>{fmtRs(ambigAmt)}</strong><em>{ambigPct.toFixed(1)}%</em></span>
        <span className={`net ${netTone}`}><i /> <b>Net aggressor amount</b><strong>{fmtRs(netAmt)}</strong><em>{netLabel}</em></span>
      </div>
    </div>
  </div>;
}

function FlowBar({ shares }) {
  const buy = Math.max(0, shares.buy || 0);
  const sell = Math.max(0, shares.sell || 0);
  const ambig = Math.max(0, 100 - buy - sell);
  return <div className="editorial-flowbar" aria-label="Buy sell ambiguous turnover split">
    <i className="buy" style={{ width: `${buy}%` }} />
    <i className="sell" style={{ width: `${sell}%` }} />
    <i className="warn" style={{ width: `${ambig}%` }} />
  </div>;
}

export default function TodayMarketStory({ issue }) {
  const market = issue?.market_summary || {};
  const shares = flowShares(market, 'amount');
  const sectors = safeArr(issue?.sectors).slice().sort((a, b) => n(b.summary?.trade_amt_rs) - n(a.summary?.trade_amt_rs));
  const topSector = sectors[0] || {};
  const featured = issue?.featured_stock || {};
  const fsm = featured.summary || {};
  const samePct = sameBrokerPct(market);
  const marketIndex = issue?.market_index || {};
  const tone = biasTone(market);
  const headline = tone === 'buy' ? 'Buy pressure led the tape' : tone === 'sell' ? 'Sell pressure led the tape' : 'Market flow stayed balanced';
  const thesis = issue?.article?.hero_thesis || `${biasWord(market)} pressure shaped the market, with ${topSector.sector_name || 'the leading sector'} carrying the largest footprint and ${featured.symbol || 'the featured stock'} selected for proof.`;
  const date = issue?.business_date || '';
  const marketPath = issue?.market_cumulative_turnover || null;
  return <section className="today-story-section editorial-section" id="today-story">
    <div className={`story-hero-panel story-${tone}`}>
      <div className="story-main-copy">
        <p className="editorial-kicker">A. Today’s Market Story · {date || 'Latest'}</p>
        <h1>{headline}</h1>
        <p className="story-thesis">{thesis}</p>
        <div className="story-flow-chips">
          <span className="buy"><b>{shares.buy.toFixed(1)}%</b> Buy aggression</span>
          <span className="sell"><b>{shares.sell.toFixed(1)}%</b> Sell aggression</span>
          <span className="warn"><b>{shares.ambig.toFixed(1)}%</b> Ambiguous</span>
          {samePct !== null && <span className="same"><b>{samePct.toFixed(2)}%</b> Same-broker context</span>}
        </div>
        <FlowBar shares={shares} />
        <AggressorAmountMix market={market} shares={shares} tone={tone} />
        <p className="story-data-rule">Data rule: LTP and previous close use the last POST frame; flow, turnover, volume and transactions use analysis bucket trade truth.</p>
      </div>
      <aside className="market-pulse-stack" aria-label="Market pulse">
        <div className="home-index-pulse-card">
          <div><span>NEPSE Index</span><strong>{marketIndex?.close != null ? fmtInt(marketIndex.close) : '—'}</strong><small className={n(marketIndex?.change) >= 0 ? 'buy' : 'sell'}>{marketIndex?.change != null ? `${n(marketIndex.change) >= 0 ? '+' : ''}${Number(marketIndex.change).toFixed(2)} · ${fmtPct(marketIndex.change_pct)}` : 'index DB'}</small></div>
          <IndexSparkline index={marketIndex} />
        </div>
        <PulseCard label="Market Bias" value={biasWord(market)} sub={`${fmtRs(market.trade_amt_rs)} turnover`} tone={tone} />
        <PulseCard label="Top Sector" value={topSector.sector_name || '—'} sub={topSector.summary?.trade_amt_rs ? `${fmtRs(topSector.summary.trade_amt_rs)} traded` : 'sector flow'} />
        <PulseCard label="Stock Proof" value={featured.symbol || '—'} sub={fsm.trade_amt_rs ? `${fmtRs(fsm.trade_amt_rs)} · ${fmtInt(fsm.trade_qty)} shares` : 'featured stock'} />
        <PulseCard label="Transactions" value={fmtInt(market.transactions)} sub={`${fmtInt(market.buckets)} buckets`} />
        <PulseCard label="Evidence" value={market.evidence_label || '—'} sub={`Confidence ${Number(market.confidence_pct || 0).toFixed(1)}%`} />
      </aside>
      <button className="story-open-button" onClick={() => setRoute(date ? `/daily/${date}` : '/daily')}>Open full daily issue →</button>
    </div>
    {marketPath ? <div className="story-orderflow-chart">
      <AggressorBalanceChart
        series={marketPath}
        title="Market cumulative net aggressor amount"
        subtitle="Time is on the x-axis. The y-axis is the running balance around zero: above zero means buy-aggressive money is leading; below zero means sell-aggressive money is leading."
      />
    </div> : null}
  </section>;
}
