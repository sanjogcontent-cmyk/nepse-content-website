import React, { useMemo, useState } from 'react';
import { setRoute, fmtInt, fmtRs, fmtPct, fmtPx, cssSafe } from '../utils.js';
import IndexChart from '../components/IndexChart.jsx';
import { CumulativeTurnoverChart, ChartStoryBridge, AggressorBalanceChart } from '../components/OrderFlowCharts.jsx';

function n(v) { return Number(v || 0); }
function pct(part, total) { return total ? (n(part) / total) * 100 : 0; }
function moneyCompact(v) { return fmtRs(v); }
function price(v) { return fmtPx(v); }
function sameBrokerAmount(scope) { return scope?.same_broker_amt_rs ?? scope?.same_broker_matched_amt_rs ?? scope?.same_broker_turnover_rs ?? null; }
function stockSummary(row) { return row?.summary || row || {}; }
function cleanSlug(s) { return encodeURIComponent(cssSafe(s)); }
function totalPressure(scope) { return n(scope?.buy_aggr_amt_rs) + n(scope?.sell_aggr_amt_rs) + n(scope?.ambig_amt_rs); }
function pressureParts(scope) {
  const buy = n(scope?.buy_aggr_amt_rs);
  const sell = n(scope?.sell_aggr_amt_rs);
  const ambig = n(scope?.ambig_amt_rs);
  const total = Math.max(buy + sell + ambig, 1);
  return { buy, sell, ambig, total, buyPct: pct(buy, total), sellPct: pct(sell, total), ambigPct: pct(ambig, total) };
}
function pressureTone(scope, minDiff = 5) {
  const p = pressureParts(scope);
  const diff = Math.abs(p.buyPct - p.sellPct);
  if (diff < minDiff) return 'mixed';
  return p.buyPct > p.sellPct ? 'buy' : 'sell';
}
function pressureLabel(scope) {
  const tone = pressureTone(scope);
  if (tone === 'buy') return 'BUY-LED';
  if (tone === 'sell') return 'SELL-LED';
  return 'MIXED';
}
function pressureRead(scope, priceChangePct = null) {
  const tone = pressureTone(scope);
  const chg = Number(priceChangePct);
  if (Number.isFinite(chg)) {
    if (chg >= 0 && tone === 'buy') return 'Price move confirmed by buy-aggressive money.';
    if (chg >= 0 && tone === 'sell') return 'Price rose while sell pressure stayed active.';
    if (chg < 0 && tone === 'sell') return 'Weak price tone confirmed by sell-aggressive money.';
    if (chg < 0 && tone === 'buy') return 'Buy support appeared, but price still weakened.';
  }
  if (tone === 'buy') return 'Buy-aggressive money led this scope.';
  if (tone === 'sell') return 'Sell-aggressive money led this scope.';
  return 'Buy and sell pressure were closely balanced.';
}
function routeDate(date) { return date && date !== 'Latest' ? date : ''; }

function PressureBar({ scope, compact = false }) {
  const p = pressureParts(scope || {});
  const min = compact ? 3 : 4;
  return (
    <div className="daily-pressure-bar" title={`Buy ${fmtPct(p.buyPct)} · Sell ${fmtPct(p.sellPct)} · Ambig ${fmtPct(p.ambigPct)}`}>
      <i className="buy" style={{ width: `${Math.max(min, p.buyPct)}%` }} />
      <i className="sell" style={{ width: `${Math.max(min, p.sellPct)}%` }} />
      <i className="warn" style={{ width: `${Math.max(p.ambigPct ? min : 0, p.ambigPct)}%` }} />
    </div>
  );
}

function PressureLegend({ scope }) {
  const p = pressureParts(scope || {});
  return (
    <div className="daily-pressure-legend">
      <span><b className="buy">Buy</b><strong>{moneyCompact(p.buy)}</strong><em>{fmtPct(p.buyPct)}</em></span>
      <span><b className="sell">Sell</b><strong>{moneyCompact(p.sell)}</strong><em>{fmtPct(p.sellPct)}</em></span>
      <span><b className="warn">Ambig</b><strong>{moneyCompact(p.ambig)}</strong><em>{fmtPct(p.ambigPct)}</em></span>
    </div>
  );
}

function MetricCard({ label, value, note, tone = 'neutral' }) {
  return (
    <article className={`daily14g-metric ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </article>
  );
}

function MarketHero({ issue, market, index, date }) {
  const p = pressureParts(market);
  const tone = pressureTone(market);
  const title = tone === 'buy' ? 'Buy money led the tape' : tone === 'sell' ? 'Sell money led the tape' : 'Market pressure stayed mixed';
  const thesis = issue?.article?.hero_thesis || issue?.article?.opening || 'Daily market story built from analysis bucket truth, sector mapping, and index context.';
  const same = sameBrokerAmount(market);
  return (
    <section className="daily14g-hero" id="story">
      <div className="daily14g-hero-copy">
        <p className="daily14g-eyebrow">NEPSE Daily Issue · {date}</p>
        <h1>{title}</h1>
        <p className="daily14g-thesis">{thesis}</p>
        <PressureBar scope={market} />
        <PressureLegend scope={market} />
        <p className="daily14g-truthline">Price truth comes from the final POST frame; pressure comes from analysis bucket trade roles.</p>
      </div>
      <aside className="daily14g-scorecard">
        <div className="daily14g-index-card">
          <span>NEPSE Index</span>
          <strong>{index?.close != null ? fmtInt(index.close) : '—'}</strong>
          <em className={n(index?.change) >= 0 ? 'buy' : 'sell'}>{index?.change != null ? `${index.change >= 0 ? '+' : ''}${Number(index.change).toFixed(2)} · ${fmtPct(index.change_pct)}` : 'Index DB not attached'}</em>
        </div>
        <MetricCard label="Total turnover" value={moneyCompact(p.total)} note="buy + sell + ambiguity" />
        <MetricCard label="Dominant pressure" value={pressureLabel(market)} tone={tone} note={pressureRead(market)} />
        <MetricCard label="Same-broker context" value={same == null ? '—' : fmtPct(market.same_broker_turnover_pct)} note={same == null ? 'not in payload' : moneyCompact(same)} tone="same" />
      </aside>
    </section>
  );
}

function MarketStoryPanel({ issue, market, sectors, featured }) {
  const topSector = sectors?.[0];
  const fs = stockSummary(featured);
  const marketText = issue?.article?.market_paragraph || issue?.article?.opening || 'The market story is built from aggressor-side money: how much traded by lifting asks, hitting bids, or staying ambiguous.';
  const sectorText = issue?.article?.sector_paragraph || (topSector ? `${topSector.sector_name} carried the largest sector footprint.` : 'Sector pressure is summarized below.');
  const stockText = issue?.article?.featured_stock_paragraph || (featured?.symbol ? `${featured.symbol} is the featured stock proof for this issue.` : 'Featured stock proof is generated from the top story candidate.');
  return (
    <section className="daily14g-story-panel">
      <article className="daily14g-panel daily14g-story-copy">
        <p className="daily14g-section-kicker">A. Today’s Market Story</p>
        <h2>One clean reading path: market → sector → stock.</h2>
        <p>{marketText}</p>
        <div className="daily14g-story-lines">
          <span><b>Market</b><em>{pressureLabel(market)} · {moneyCompact(n(market.buy_aggr_amt_rs) - n(market.sell_aggr_amt_rs))} net pressure</em></span>
          <span><b>Top sector</b><em>{topSector?.sector_name || '—'} · {moneyCompact(topSector?.summary?.trade_amt_rs)}</em></span>
          <span><b>Stock proof</b><em>{featured?.symbol || '—'} · {moneyCompact(fs.trade_amt_rs)}</em></span>
        </div>
      </article>
      <article className="daily14g-panel daily14g-explain-card">
        <h3>What the page is saying</h3>
        <p>{sectorText}</p>
        <p>{stockText}</p>
        <button onClick={() => setRoute('/')}>Open editorial home →</button>
      </article>
    </section>
  );
}

function SectorPreviewCard({ sector, date }) {
  const sm = sector?.summary || {};
  const tone = pressureTone(sm);
  const idx = sector?.index || {};
  const same = sameBrokerAmount(sm);
  const leaders = [...(sector?.stocks || [])]
    .sort((a, b) => n(stockSummary(b).trade_amt_rs) - n(stockSummary(a).trade_amt_rs))
    .slice(0, 3);
  return (
    <article className={`daily14g-sector-card ${tone}`} role="button" tabIndex={0} onClick={() => setRoute(`/sectors/${cleanSlug(sector.sector_name)}?date=${routeDate(date)}`)} onKeyDown={(e) => { if (e.key === 'Enter') setRoute(`/sectors/${cleanSlug(sector.sector_name)}?date=${routeDate(date)}`); }}>
      <header>
        <div><span>{idx.index_code || 'Sector'}</span><h3>{sector.sector_name}</h3></div>
        <b>{pressureLabel(sm)}</b>
      </header>
      <strong className="daily14g-sector-turnover">{moneyCompact(sm.trade_amt_rs)}</strong>
      <small>Total sector turnover</small>
      <PressureBar scope={sm} compact />
      <div className="daily14g-sector-amounts">
        <span><b className="buy">Buy</b>{moneyCompact(sm.buy_aggr_amt_rs)}</span>
        <span><b className="sell">Sell</b>{moneyCompact(sm.sell_aggr_amt_rs)}</span>
        <span><b className="warn">Ambig</b>{moneyCompact(sm.ambig_amt_rs)}</span>
      </div>
      <p>{pressureRead(sm, idx.change_pct)}</p>
      <footer>
        <em>{leaders.map((s) => s.symbol).join(' · ') || 'No lead stock'}</em>
        <span>{same == null ? 'Same-broker —' : `Same-broker ${fmtPct(sm.same_broker_turnover_pct)}`}</span>
      </footer>
    </article>
  );
}

function SectorMap({ sectors, date }) {
  const [mode, setMode] = useState('turnover');
  const ranked = useMemo(() => {
    const list = [...(sectors || [])];
    const sorters = {
      turnover: (a, b) => n(b.summary?.trade_amt_rs) - n(a.summary?.trade_amt_rs),
      buy: (a, b) => n(b.summary?.buy_aggr_amt_rs) - n(a.summary?.buy_aggr_amt_rs),
      sell: (a, b) => n(b.summary?.sell_aggr_amt_rs) - n(a.summary?.sell_aggr_amt_rs),
      mixed: (a, b) => n(b.summary?.ambig_amt_rs) - n(a.summary?.ambig_amt_rs),
    };
    return list.sort(sorters[mode] || sorters.turnover).slice(0, 6);
  }, [sectors, mode]);
  return (
    <section className="daily14g-panel daily14g-sector-map" id="sectors">
      <div className="daily14g-section-head">
        <div><p className="daily14g-section-kicker">B. Sector Pressure Map</p><h2>Where the money pressure concentrated.</h2><small>Sector view is based on buy-aggressive amount, sell-aggressive amount and ambiguity.</small></div>
        <button onClick={() => setRoute('/sectors')}>Open all sectors →</button>
      </div>
      <div className="daily14g-filter-row">
        {[
          ['turnover', 'Largest footprint'],
          ['buy', 'Strongest buy'],
          ['sell', 'Strongest sell'],
          ['mixed', 'Highest ambiguity'],
        ].map(([key, label]) => <button key={key} className={mode === key ? 'active' : ''} onClick={() => setMode(key)}>{label}</button>)}
      </div>
      <div className="daily14g-sector-grid">
        {ranked.map((sector) => <SectorPreviewCard key={sector.sector_name} sector={sector} date={date} />)}
      </div>
    </section>
  );
}

function boardValue(row, type) {
  if (type === 'turnover') return moneyCompact(row.turnover_rs ?? stockSummary(row).trade_amt_rs);
  if (type === 'volume') return fmtInt(row.shares_traded ?? stockSummary(row).trade_qty);
  if (type === 'transactions') return fmtInt(row.transactions ?? stockSummary(row).transactions);
  return `${row.change_rs >= 0 ? '+' : ''}${fmtRs(row.change_rs).replace('Rs ', '')} · ${row.change_pct >= 0 ? '+' : ''}${fmtPct(row.change_pct)}`;
}
function BoardMiniRow({ row, type, date }) {
  const net = n(row.net_aggr_amt_rs ?? row.net_aggr_qty);
  const tone = net >= 0 ? 'buy' : 'sell';
  const same = sameBrokerAmount(row);
  return (
    <button className="daily14g-board-row" onClick={() => setRoute(`/stocks/${row.symbol}?date=${routeDate(date)}`)}>
      <strong>{row.symbol}<small>{row.sector_name || row.company_name || ''}</small></strong>
      <span><b>{type === 'gainers' || type === 'losers' ? price(row.ltp_rs) : boardValue(row, type)}</b><small>{type === 'gainers' || type === 'losers' ? boardValue(row, type) : price(row.ltp_rs)}</small></span>
      <em className={tone}>{tone === 'buy' ? 'Buy' : 'Sell'} {moneyCompact(Math.abs(net))}</em>
      <i>{row.story_hint || pressureRead(row, row.change_pct)}</i>
      <small>{same == null ? 'Same-broker —' : `Same-broker ${fmtPct(row.same_broker_turnover_pct)}`}</small>
    </button>
  );
}

function MarketBoardsPanel({ leaderboards, date }) {
  const boards = [
    ['gainers', 'Top Gainers', 'Price leadership', leaderboards?.top_gainers || []],
    ['losers', 'Top Losers', 'Weakest price tone', leaderboards?.top_losers || []],
    ['turnover', 'Top Turnover', 'Largest money footprint', leaderboards?.top_turnover || []],
    ['volume', 'Top Volume', 'Most shares traded', leaderboards?.top_volume || []],
    ['transactions', 'Top Transactions', 'Most matched rows', leaderboards?.top_transactions || []],
  ];
  return (
    <section className="daily14g-panel daily14g-boards" id="boards">
      <div className="daily14g-section-head">
        <div><p className="daily14g-section-kicker">C. Market Boards</p><h2>Normal board view with one order-flow read.</h2><small>Top movers and activity boards stay compact here. Full exploration is on the board page.</small></div>
        <button onClick={() => setRoute('/boards')}>Open full board page →</button>
      </div>
      <div className="daily14g-board-grid">
        {boards.map(([key, title, sub, rows]) => (
          <article key={key} className="daily14g-board-card">
            <header><h3>{title}</h3><span>{sub}</span></header>
            <div>{rows.slice(0, 3).map((row) => <BoardMiniRow key={`${key}-${row.symbol}`} row={row} type={key} date={date} />)}</div>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeaturedStockProof({ featured, leaderboards, date }) {
  const stock = featured || leaderboards?.top_turnover?.[0] || {};
  const sm = stockSummary(stock);
  const tone = pressureTone(sm);
  const same = sameBrokerAmount(sm);
  return (
    <section className="daily14g-feature-grid" id="stocks">
      <article className="daily14g-panel daily14g-feature-stock">
        <p className="daily14g-section-kicker">D. Featured Stock Proof</p>
        <div className="daily14g-feature-top">
          <div><h2>{stock.symbol || '—'}</h2><span>{stock.sector_name || stock.company_name || ''}</span></div>
          <b className={tone}>{pressureLabel(sm)}</b>
        </div>
        <p>{pressureRead(sm, sm.change_pct)}</p>
        <PressureBar scope={sm} />
        <div className="daily14g-feature-metrics">
          <span><small>LTP</small><b>{price(sm.ltp_rs ?? sm.close_rs ?? stock.ltp_rs)}</b></span>
          <span><small>Change</small><b className={n(sm.change_pct ?? stock.change_pct) >= 0 ? 'buy' : 'sell'}>{n(sm.change_rs ?? stock.change_rs) >= 0 ? '+' : ''}{fmtRs(sm.change_rs ?? stock.change_rs).replace('Rs ', '')} · {n(sm.change_pct ?? stock.change_pct) >= 0 ? '+' : ''}{fmtPct(sm.change_pct ?? stock.change_pct)}</b></span>
          <span><small>Turnover</small><b>{moneyCompact(sm.trade_amt_rs ?? stock.turnover_rs)}</b></span>
          <span><small>Same-broker</small><b>{same == null ? '—' : fmtPct(sm.same_broker_turnover_pct ?? stock.same_broker_turnover_pct)}</b></span>
        </div>
        <button onClick={() => stock.symbol && setRoute(`/stocks/${stock.symbol}?date=${routeDate(date)}`)}>Open stock story →</button>
      </article>
      <article className="daily14g-panel daily14g-proof-list">
        <p className="daily14g-section-kicker">Stock proof candidates</p>
        <h2>Best stocks to inspect next.</h2>
        {(leaderboards?.top_turnover || []).slice(0, 6).map((row) => <BoardMiniRow key={`proof-${row.symbol}`} row={row} type="turnover" date={date} />)}
      </article>
    </section>
  );
}

function LearnPanel({ issue, market }) {
  const article = issue?.article || {};
  return (
    <section className="daily14g-feature-grid" id="meaning">
      <article className="daily14g-panel daily14g-article-card">
        <p className="daily14g-section-kicker">E. Public article spine</p>
        <h2>{article.title || 'Daily order-flow interpretation'}</h2>
        <p>{article.opening || article.market_paragraph || 'The article should explain market pressure first, then sector footprint, then stock proof.'}</p>
        <p>{article.video_intro || 'Use the website as the readable story and the deeper app/video as proof.'}</p>
      </article>
      <article className="daily14g-panel daily14g-method-card">
        <p className="daily14g-section-kicker">Truth method</p>
        <h2>What the reader should trust.</h2>
        <ul>
          <li><b>Price:</b> final POST frame LTP / previous close fields.</li>
          <li><b>Flow:</b> buy-aggressive amount vs sell-aggressive amount.</li>
          <li><b>Ambiguity:</b> uncertain trade-role money, shown separately.</li>
          <li><b>Same-broker:</b> buyer=seller broker context only, not accusation.</li>
        </ul>
        <button onClick={() => setRoute('/learn')}>Open learning page →</button>
      </article>
    </section>
  );
}

function SocialExportBlocks({ issue, market, sectors, leaderboards, featured, date }) {
  const p = pressureParts(market);
  const topSector = sectors?.[0];
  const topStock = featured || leaderboards?.top_turnover?.[0];
  const fs = stockSummary(topStock);
  return (
    <section className="daily14g-panel daily14g-export" id="social-export">
      <div className="daily14g-section-head">
        <div><p className="daily14g-section-kicker">F. Export-ready social cards</p><h2>Clean screenshot blocks, not noisy posters.</h2><small>Use browser screenshot or Print / Save PDF.</small></div>
        <button onClick={() => window.print()}>Print / Save PDF</button>
      </div>
      <div className="daily14g-export-grid">
        <article className="daily14g-export-card">
          <span>NEPSE ORDER FLOW · {date}</span>
          <h3>{pressureTone(market) === 'buy' ? 'Buy Pressure Led' : pressureTone(market) === 'sell' ? 'Sell Pressure Led' : 'Mixed Market Tape'}</h3>
          <PressureBar scope={market} />
          <p>Buy {fmtPct(p.buyPct)} · Sell {fmtPct(p.sellPct)} · Ambig {fmtPct(p.ambigPct)}</p>
          <footer>Nepse_Master_Trade & Analysis · Educational only</footer>
        </article>
        <article className="daily14g-export-card">
          <span>SECTOR LEADER</span>
          <h3>{topSector?.sector_name || '—'}</h3>
          <p>{moneyCompact(topSector?.summary?.trade_amt_rs)} traded. {pressureRead(topSector?.summary || {})}</p>
          <footer>{(topSector?.stocks || []).slice(0, 3).map((s) => s.symbol).join(' · ')}</footer>
        </article>
        <article className="daily14g-export-card">
          <span>STOCK PROOF</span>
          <h3>{topStock?.symbol || '—'}</h3>
          <p>{price(fs.ltp_rs ?? topStock?.ltp_rs)} · {moneyCompact(fs.trade_amt_rs ?? topStock?.turnover_rs)} turnover · {pressureRead(fs, fs.change_pct ?? topStock?.change_pct)}</p>
          <footer>{topStock?.sector_name || 'Featured stock'}</footer>
        </article>
      </div>
    </section>
  );
}

export default function DailyIssue({ issue }) {
  const market = issue?.market_summary || issue?.public?.market_summary || {};
  const index = issue?.market_index || issue?.public?.market_index || {};
  const date = issue?.business_date || issue?.public?.business_date || 'Latest';
  const sectors = issue?.sectors || issue?.public?.sectors || [];
  const leaderboards = issue?.leaderboards || issue?.public?.leaderboards || {};
  const featured = issue?.featured_stock || issue?.public?.featured_stock || leaderboards?.top_turnover?.[0] || null;

  return (
    <main id="content-main" className="daily14g-page">
      <MarketHero issue={issue} market={market} index={index} date={date} />
      {(issue?.market_cumulative_turnover || issue?.public?.market_cumulative_turnover) ? <section id="order-flow-path" className="daily14m-primary-flow">
        <div className="daily14g-section-head">
          <div>
            <p className="daily14g-section-kicker">B. Market Order-Flow Conviction</p>
            <h2>Running net aggressor amount — the tape balance around zero.</h2>
            <small>Time is on the x-axis. Positive y-axis means buy-aggressive money is leading; negative y-axis means sell-aggressive money is leading.</small>
          </div>
        </div>
        <AggressorBalanceChart
          series={issue?.market_cumulative_turnover || issue?.public?.market_cumulative_turnover}
          title="Market cumulative net aggressor amount"
          subtitle="Running buy-aggressive amount minus sell-aggressive amount across the whole market. Zero is the balance line."
        />
      </section> : null}
      <nav className="daily14g-nav" aria-label="Daily issue sections">
        <a href="#story">Story</a>
        <a href="#order-flow-path">Order-flow path</a>
        <a href="#index-chart">NEPSE chart</a>
        <a href="#sectors">Sectors</a>
        <a href="#boards">Boards</a>
        <a href="#stocks">Stock proof</a>
        <a href="#meaning">Learn</a>
        <a href="#social-export">Export</a>
      </nav>
      <section id="index-chart" className="daily14l-market-charts">
        <div className="daily14g-section-head">
          <div>
            <p className="daily14g-section-kicker">Market context + participation</p>
            <h2>Index path shows price context. Cumulative turnover shows where money built.</h2>
            <small>This is the content spine: price movement plus participation build, without turning the page into a terminal.</small>
          </div>
        </div>
        <div className="daily14l-chart-grid">
          <IndexChart index={index} title="NEPSE intraday index path" subtitle="Index analysis database · price context" />
          <CumulativeTurnoverChart series={issue?.market_cumulative_turnover || issue?.public?.market_cumulative_turnover} title="NEPSE cumulative turnover" subtitle="Analysis database · how traded value built through the session" />
        </div>
        <ChartStoryBridge
          leftTitle="Price context"
          leftValue={index?.change != null ? `${index.change >= 0 ? '+' : ''}${Number(index.change).toFixed(2)} · ${fmtPct(index.change_pct)}` : 'Index path'}
          rightTitle="Participation build"
          rightValue={fmtRs((issue?.market_cumulative_turnover || issue?.public?.market_cumulative_turnover)?.final_turnover_rs || market.trade_amt_rs)}
          read={(issue?.market_cumulative_turnover || issue?.public?.market_cumulative_turnover)?.pace_read || 'Cumulative turnover shows when participation entered the tape.'}
        />
      </section>
      <MarketStoryPanel issue={issue} market={market} sectors={sectors} featured={featured} />
      <SectorMap sectors={sectors} date={date} />
      <MarketBoardsPanel leaderboards={leaderboards} date={date} />
      <FeaturedStockProof featured={featured} leaderboards={leaderboards} date={date} />
      <LearnPanel issue={issue} market={market} />
      <SocialExportBlocks issue={issue} market={market} sectors={sectors} leaderboards={leaderboards} featured={featured} date={date} />
    </main>
  );
}
