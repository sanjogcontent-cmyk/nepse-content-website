import React, { useEffect, useMemo, useState } from 'react';
import { loadJson, fmtRs, fmtInt, fmtPx, fmtPct, setRoute } from '../utils.js';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const apiUrl = path => `${API_BASE}${path}`;

const PROMPT_TYPES = [
  {
    key: 'daily_article',
    label: 'Daily Website Article',
    use: 'Main public article for the Daily Issue page.',
    ask: 'Ask ChatGPT to turn the market, sector, and featured-stock facts into clean website writing.',
  },
  {
    key: 'featured_stock_story',
    label: 'Featured Stock Story',
    use: 'Focused stock block using OHLC, role VWAP, flow, and evidence.',
    ask: 'Ask ChatGPT to explain why this stock became today’s story without giving a recommendation.',
  },
  {
    key: 'youtube_script',
    label: 'YouTube Script',
    use: '5–7 minute spoken script for your video.',
    ask: 'Ask ChatGPT to write a hook, market story, sector transition, stock proof path, and closing.',
  },
  {
    key: 'shorts_script',
    label: 'Shorts / TikTok Script',
    use: '45-second short-form video script.',
    ask: 'Ask ChatGPT to compress the day into one hook, one stock, one proof reason, and one CTA.',
  },
  {
    key: 'title_thumbnail',
    label: 'Titles + Thumbnail',
    use: 'YouTube packaging, thumbnail text, pinned comment, keywords.',
    ask: 'Ask ChatGPT for packaging after the fact lock is fixed, not before.',
  },
  {
    key: 'learn_explainer',
    label: 'Learn Explainer',
    use: 'Educational page explaining OHLC, VWAP, aggressor VWAP, and evidence.',
    ask: 'Ask ChatGPT to teach the reader how to understand your website numbers.',
  },
  {
    key: 'social_post',
    label: 'Social Posts',
    use: 'Community post, TikTok caption, X/Twitter post, LinkedIn-style post.',
    ask: 'Ask ChatGPT to distribute the same daily story across platforms without hype.',
  },
];

async function copyText(t) {
  await navigator.clipboard?.writeText(t);
}

function metricTone(v) {
  const n = Number(v || 0);
  if (n > 0) return 'buy';
  if (n < 0) return 'sell';
  return '';
}

function FactPill({ label, value, tone = '' }) {
  return <span className={`writer-fact-pill ${tone}`}><small>{label}</small><b>{value}</b></span>;
}

function ContentStrategyGuide() {
  return (
    <section className="panel writer-strategy-panel">
      <p className="eyebrow">Content operating system</p>
      <h2>What content should be written from the analysis database?</h2>
      <p className="writer-help-text">Use the database to create facts. Use ChatGPT to create language, structure, explanation, video scripts, and packaging. Never ask ChatGPT to guess market facts.</p>
      <div className="writer-strategy-grid">
        <article>
          <strong>1. Daily article</strong>
          <p>Market → sector → featured stock → video proof. This is the main website article.</p>
        </article>
        <article>
          <strong>2. Featured stock story</strong>
          <p>OHLC, close rule, VWAP, Buy Agg VWAP, Sell Agg VWAP, Ambig VWAP, and evidence quality.</p>
        </article>
        <article>
          <strong>3. Video script</strong>
          <p>Do not repeat the website. The script tells viewers what the Truth Viewer and Order Flow Platform will prove.</p>
        </article>
        <article>
          <strong>4. Short-form clips</strong>
          <p>One stock, one pressure fact, one reason to watch the full video.</p>
        </article>
        <article>
          <strong>5. Learn content</strong>
          <p>Explain concepts: aggressor flow, VWAP, previous close, close, high, low, evidence, and gap flags.</p>
        </article>
        <article>
          <strong>6. Social posts</strong>
          <p>Same facts, different format. No recommendations, no hype, no invented claims.</p>
        </article>
      </div>
    </section>
  );
}

function PromptTypeCards({ selected, onSelect }) {
  return (
    <div className="prompt-type-grid">
      {PROMPT_TYPES.map(t => (
        <button key={t.key} className={`prompt-type-card ${selected === t.key ? 'active' : ''}`} onClick={() => onSelect(t.key)}>
          <span>{t.label}</span>
          <small>{t.use}</small>
        </button>
      ))}
    </div>
  );
}

function FactLockPreview({ issue }) {
  const m = issue?.market_summary || {};
  const st = issue?.featured_stock || {};
  const sm = st.summary || {};
  return (
    <section className="panel writer-fact-lock-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Fact lock preview</p>
          <h2>Numbers ChatGPT is allowed to use</h2>
          <p className="writer-help-text">This is the guardrail. Facts come from generated JSON / analysis database. ChatGPT only turns these facts into readable content.</p>
        </div>
        <button className="secondary" onClick={() => setRoute(`/admin/daily/${issue.business_date}`)}>Open admin issue</button>
      </div>
      <div className="writer-fact-section">
        <h3>Market</h3>
        <div className="writer-fact-grid compact">
          <FactPill label="Date" value={issue?.business_date || '—'} />
          <FactPill label="Bias" value={m.bias || '—'} />
          <FactPill label="Trade Amt" value={fmtRs(m.trade_amt_rs)} />
          <FactPill label="Trade Qty" value={fmtInt(m.trade_qty)} />
          <FactPill label="Buy Agg Qty" value={fmtInt(m.buy_aggr_qty)} tone="buy" />
          <FactPill label="Sell Agg Qty" value={fmtInt(m.sell_aggr_qty)} tone="sell" />
          <FactPill label="Net Agg Qty" value={fmtInt(m.net_aggr_qty)} tone={metricTone(m.net_aggr_qty)} />
          <FactPill label="Evidence" value={`${fmtPct(m.confidence_pct)} / ${fmtPct(m.explainability_pct)}`} />
        </div>
      </div>
      <div className="writer-fact-section">
        <h3>Featured stock price truth</h3>
        <div className="writer-fact-grid compact">
          <FactPill label="Symbol" value={st.symbol || '—'} />
          <FactPill label="Sector" value={st.sector_name || '—'} />
          <FactPill label="Previous Close" value={fmtPx(sm.previous_close_rs)} />
          <FactPill label="Open" value={fmtPx(sm.open_rs)} />
          <FactPill label="High" value={fmtPx(sm.high_rs)} />
          <FactPill label="Low" value={fmtPx(sm.low_rs)} />
          <FactPill label="Close" value={fmtPx(sm.close_rs)} />
          <FactPill label="Change %" value={fmtPct(sm.change_pct)} tone={metricTone(sm.change_pct)} />
          <FactPill label="Day VWAP" value={fmtPx(sm.day_vwap_rs || sm.vwap_rs)} />
        </div>
      </div>
      <div className="writer-fact-section">
        <h3>Featured stock flow truth</h3>
        <div className="writer-fact-grid compact">
          <FactPill label="Buy Agg Qty" value={fmtInt(sm.buy_aggr_qty)} tone="buy" />
          <FactPill label="Sell Agg Qty" value={fmtInt(sm.sell_aggr_qty)} tone="sell" />
          <FactPill label="Ambig Qty" value={fmtInt(sm.ambig_qty)} />
          <FactPill label="Buy Agg VWAP" value={fmtPx(sm.buy_aggr_vwap_rs || sm.buy_aggr_avg_px_rs)} tone="buy" />
          <FactPill label="Sell Agg VWAP" value={fmtPx(sm.sell_aggr_vwap_rs || sm.sell_aggr_avg_px_rs)} tone="sell" />
          <FactPill label="Ambig VWAP" value={fmtPx(sm.ambig_vwap_rs || sm.ambig_avg_px_rs)} />
          <FactPill label="Gap / Wipe" value={`${fmtInt(sm.gap_count)} / ${fmtInt(sm.wipe_count)}`} />
          <FactPill label="Lock U/L" value={`${fmtInt(sm.upper_lock_count)} / ${fmtInt(sm.lower_lock_count)}`} />
        </div>
      </div>
    </section>
  );
}

function ArticleEditor({ issue, setIssue }) {
  const [promptKind, setPromptKind] = useState('daily_article');
  const [prompt, setPrompt] = useState('');
  const [articleText, setArticleText] = useState('');
  const [status, setStatus] = useState('');
  const g = issue?.article || {};
  const defaultArticle = useMemo(() => [g.title, '', g.opening, '', g.market_paragraph, '', g.sector_paragraph, '', g.featured_stock_paragraph, '', g.video_intro].filter(Boolean).join('\n'), [g.title, g.opening, g.market_paragraph, g.sector_paragraph, g.featured_stock_paragraph, g.video_intro]);

  useEffect(() => {
    if (!issue?.business_date) return;
    const url = promptKind === 'daily_article'
      ? `/api/content/writer/daily/${issue.business_date}/prompt`
      : `/api/content/writer/daily/${issue.business_date}/prompt/${promptKind}`;
    loadJson(apiUrl(url)).then(d => setPrompt(d.prompt)).catch(e => setPrompt(String(e.message || e)));
  }, [issue?.business_date, promptKind]);

  useEffect(() => {
    if (!articleText && defaultArticle) setArticleText(defaultArticle);
  }, [defaultArticle, articleText]);

  async function approve() {
    const lines = articleText.split('\n').map(x => x.trim()).filter(Boolean);
    const article = {
      title: lines[0] || g.title || `NEPSE Daily Order-Flow Summary — ${issue.business_date}`,
      hero_thesis: lines[1] || g.hero_thesis || g.opening || '',
      opening: lines.slice(1, 3).join(' ') || g.opening || '',
      market_paragraph: lines.find(x => x.toLowerCase().includes('market')) || g.market_paragraph || '',
      sector_paragraph: lines.find(x => x.toLowerCase().includes('sector')) || g.sector_paragraph || '',
      featured_stock_paragraph: lines.find(x => x.toLowerCase().includes(issue.featured_stock?.symbol?.toLowerCase() || 'featured')) || g.featured_stock_paragraph || '',
      video_intro: lines.find(x => x.toLowerCase().includes('video')) || g.video_intro || '',
    };
    const res = await fetch(apiUrl(`/api/content/daily/${issue.business_date}/admin/approve-article`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article, reviewed_by: 'Sanjog', status: 'review' }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Failed to approve article');
    setStatus('Article approved and public JSON/indexes rebuilt.');
    setIssue?.(data.issue);
  }

  const selectedMeta = PROMPT_TYPES.find(t => t.key === promptKind) || PROMPT_TYPES[0];

  return (
    <section className="panel writer-panel">
      <p className="eyebrow">Prompt library</p>
      <h2>Ask ChatGPT the right thing for the right content</h2>
      <p className="writer-help-text">Choose a content type, copy the database-grounded prompt, paste it into ChatGPT, review the output, then paste only the approved final website article on the right.</p>
      <PromptTypeCards selected={promptKind} onSelect={setPromptKind} />
      <div className="selected-prompt-note">
        <strong>{selectedMeta.label}</strong>
        <span>{selectedMeta.ask}</span>
      </div>
      <div className="writer-grid upgraded">
        <div>
          <div className="writer-actions">
            <button className="primary" onClick={() => copyText(prompt)}>Copy Selected Prompt</button>
            <button className="secondary" onClick={() => copyText(prompt + '\n\nAfter writing, check that every number appears in the FACT LOCK above.')}>Copy Prompt + Check Rule</button>
            <button className="secondary" onClick={() => setRoute(`/daily/${issue.business_date}`)}>Public preview</button>
          </div>
          <textarea className="writer-prompt" value={prompt} readOnly />
        </div>
        <div>
          <div className="writer-actions">
            <button className="primary" onClick={approve}>Approve Article For Public</button>
            <button className="secondary" onClick={() => setArticleText(defaultArticle)}>Reset generated draft</button>
            {status && <span className="writer-status">{status}</span>}
          </div>
          <textarea className="writer-article" value={articleText} onChange={e => setArticleText(e.target.value)} placeholder="Paste final ChatGPT article here after your review..." />
        </div>
      </div>
    </section>
  );
}

function WeeklyWriter() {
  const [index, setIndex] = useState({ items: [] });
  const [weekId, setWeekId] = useState('');
  const [prompt, setPrompt] = useState('');

  useEffect(() => {
    loadJson('/content/indexes/weekly.index.json').then(d => {
      setIndex(d);
      setWeekId(d.items?.[0]?.week_id || '');
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (weekId) loadJson(apiUrl(`/api/content/writer/weekly/${weekId}/prompt`)).then(d => setPrompt(d.prompt)).catch(e => setPrompt(String(e.message || e)));
  }, [weekId]);

  return (
    <section className="panel writer-panel">
      <p className="eyebrow">Weekly Writer</p>
      <h2>Weekly article workflow</h2>
      <p className="writer-help-text">Weekly writing should compare persistence across days. Do not mix dates manually; use the generated weekly index.</p>
      <div className="writer-actions">
        <select value={weekId} onChange={e => setWeekId(e.target.value)}>
          {(index.items || []).map(w => <option key={w.week_id} value={w.week_id}>{w.week_id} · {w.start_date} to {w.end_date}</option>)}
        </select>
        <button className="primary" onClick={() => copyText(prompt)}>Copy Weekly Prompt</button>
        <button className="secondary" onClick={() => setRoute(weekId ? `/weekly/${weekId}` : '/weekly')}>Open weekly page</button>
      </div>
      <textarea className="writer-prompt full" value={prompt} readOnly />
    </section>
  );
}

export default function AdminWriter({ issue: initialIssue }) {
  const [issue, setIssue] = useState(initialIssue);
  const m = issue?.market_summary || {};
  const st = issue?.featured_stock || {};
  const sm = st.summary || {};

  useEffect(() => setIssue(initialIssue), [initialIssue]);

  return (
    <main className="admin-writer-page phase6-page">
      <section className="panel phase6-hero writer-hero">
        <p className="eyebrow">Admin Writer Studio</p>
        <h1>Content writing workflow powered by database facts</h1>
        <p className="lead">The app creates a fact lock from the analysis database. ChatGPT writes the article, script, explainer, title, or social post from those facts. You approve what becomes public.</p>
        <div className="writer-facts">
          <span>Date <b>{issue?.business_date}</b></span>
          <span>Featured <b>{st.symbol || '—'}</b></span>
          <span>Close <b>{fmtPx(sm.close_rs)}</b></span>
          <span>Day VWAP <b>{fmtPx(sm.day_vwap_rs || sm.vwap_rs)}</b></span>
          <span>Buy Agg VWAP <b>{fmtPx(sm.buy_aggr_vwap_rs || sm.buy_aggr_avg_px_rs)}</b></span>
          <span>Sell Agg VWAP <b>{fmtPx(sm.sell_aggr_vwap_rs || sm.sell_aggr_avg_px_rs)}</b></span>
          <span>Trade Amt <b>{fmtRs(m.trade_amt_rs)}</b></span>
          <span>Trade Qty <b>{fmtInt(m.trade_qty)}</b></span>
        </div>
      </section>
      <ContentStrategyGuide />
      <FactLockPreview issue={issue} />
      <ArticleEditor issue={issue} setIssue={setIssue} />
      <WeeklyWriter />
    </main>
  );
}
