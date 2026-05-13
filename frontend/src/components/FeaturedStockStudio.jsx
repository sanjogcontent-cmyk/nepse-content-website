import React from 'react';
import SummaryBar from './SummaryBar.jsx';
import { EvidenceBadge, NumberValue } from './Numbers.jsx';
import { fmtInt, fmtRs, fmtPct } from '../utils.js';

function ScoreBreakdown({ stock }) {
  const breakdown = stock?.score_breakdown || {};
  const parts = breakdown.parts || {};
  const rows = [
    ['Turnover', parts.turnover],
    ['Net Agg Qty', parts.net_aggr_qty],
    ['Net Agg Amt', parts.net_aggr_amt],
    ['Bucket Count', parts.bucket_count],
    ['Confidence', parts.confidence],
    ['Explainability', parts.explainability],
    ['Sector Importance', parts.sector_importance],
    ['Imbalance', parts.imbalance_pct],
  ];
  return (
    <div className="score-card panel-soft">
      <div className="score-ring">
        <span>Featured Score</span>
        <strong>{Number(breakdown.score ?? stock?.featured_score ?? 0).toFixed(2)}</strong>
      </div>
      <div className="score-bars">
        {rows.map(([label, value]) => (
          <div className="score-line" key={label}>
            <div><span>{label}</span><b>{Number(value || 0).toFixed(2)}</b></div>
            <em><i style={{ width: `${Math.max(0, Math.min(100, Number(value || 0)))}%` }} /></em>
          </div>
        ))}
      </div>
    </div>
  );
}

function CandidateStrip({ candidates = [], activeSymbol }) {
  if (!candidates.length) return null;
  return (
    <div className="candidate-strip">
      {candidates.slice(0, 6).map((c, idx) => (
        <a href={`?sector=${encodeURIComponent(c.sector_name)}&symbol=${encodeURIComponent(c.symbol)}#featured`} className={c.symbol === activeSymbol ? 'candidate-card active' : 'candidate-card'} key={c.symbol}>
          <span>#{idx + 1}</span>
          <strong>{c.symbol}</strong>
          <em>{c.sector_name}</em>
          <b>{Number(c.featured_score || 0).toFixed(2)}</b>
        </a>
      ))}
    </div>
  );
}

function ProofPath({ stock }) {
  const path = stock?.video_angle?.proof_path || [];
  const watch = stock?.watch_next_session || [];
  return (
    <div className="proof-grid">
      <div className="panel-soft">
        <h3>Video proof path</h3>
        <ol className="proof-list">{path.map((item, idx) => <li key={idx}>{item}</li>)}</ol>
      </div>
      <div className="panel-soft">
        <h3>Watch next session</h3>
        <ul className="watch-list">{watch.map((item, idx) => <li key={idx}>{item}</li>)}</ul>
      </div>
    </div>
  );
}

export default function FeaturedStockStudio({ stock, candidates = [], youtube }) {
  if (!stock) return null;
  const sm = stock.summary || {};
  return (
    <section className="featured-studio phase4-featured" id="featured">
      <div className="section-title-row phase4-title-row">
        <div>
          <p className="eyebrow">Featured stock + video production</p>
          <h2>{stock.symbol} — {stock.company_name || stock.security_name}</h2>
          <p>{stock.video_angle?.headline_question || stock.featured_rank_reason}</p>
        </div>
        <div className="feature-badges">
          <EvidenceBadge label={sm.evidence_label} />
          <span className="feature-score-pill">Score {Number(stock.featured_score || 0).toFixed(2)}</span>
        </div>
      </div>

      <CandidateStrip candidates={candidates} activeSymbol={stock.symbol} />

      <div className="featured-grid-v4">
        <div className="featured-story-card panel">
          <p className="eyebrow">Daily story candidate</p>
          <h3>{stock.video_angle?.story_mode || 'Order-flow story'}</h3>
          <p className="featured-lead-v4">{stock.featured_rank_reason}</p>
          <div className="featured-metric-grid-v4">
            <NumberValue label="Trade Amt" value={sm.trade_amt_rs} type="rs" />
            <NumberValue label="Net Agg Qty" value={sm.net_aggr_qty} tone="auto" />
            <NumberValue label="Net Agg Amt" value={sm.net_aggr_amt_rs} type="rs" tone="auto" />
            <NumberValue label="Buckets" value={sm.buckets} />
            <NumberValue label="Confidence" value={sm.confidence_pct} type="pct" tone="buy" />
            <NumberValue label="Explainability" value={sm.explainability_pct} type="pct" tone="buy" />
          </div>
          <h3>Why selected</h3>
          <ul className="why-list phase4-why">{stock.why_selected?.map((x, i) => <li key={i}>{x}</li>)}</ul>
        </div>
        <ScoreBreakdown stock={stock} />
      </div>

      <SummaryBar title={`${stock.symbol} featured stock summary`} summary={stock.summary} scope="stock" showPrices />
      <ProofPath stock={stock} />

      {youtube?.key_on_screen_numbers?.length > 0 && (
        <div className="panel on-screen-panel">
          <div className="panel-head"><div><p className="eyebrow">For the video</p><h2>Key on-screen numbers</h2></div></div>
          <div className="on-screen-grid">
            {youtube.key_on_screen_numbers.map((x) => <span key={x.label}>{x.label}<b>{x.value}</b></span>)}
          </div>
        </div>
      )}
    </section>
  );
}
