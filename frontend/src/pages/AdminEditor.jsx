import React, { useEffect, useMemo, useState } from 'react';
import { fmtInt, fmtRs, fmtPct, setRoute } from '../utils.js';
import { issueCms, linesToArray, arrayToLines } from '../cms.js';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const apiUrl = (path) => `${API_BASE}${path}`;

function n(v){ return Number(v || 0); }
function pct(part,total){ return total > 0 ? Math.max(0, Math.min(100, part / total * 100)) : 0; }
function cr(rs){ return `Rs ${(n(rs)/10000000).toFixed(2)} Cr`; }
function setDeep(obj, path, value){
  const keys = path.split('.');
  const out = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  let cur = out;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) cur[key] = value;
    else { cur[key] = Array.isArray(cur[key]) ? [...cur[key]] : { ...(cur[key] || {}) }; cur = cur[key]; }
  });
  return out;
}
async function copyText(text){ await navigator.clipboard?.writeText(text || ''); }

function Field({ label, value, onChange, multiline=false, helper='' }){
  return <label className="studio-field"><span>{label}</span>{multiline ? <textarea value={value || ''} onChange={e=>onChange(e.target.value)} /> : <input value={value || ''} onChange={e=>onChange(e.target.value)} />}{helper && <small>{helper}</small>}</label>;
}

function AdminKpi({ label, value, sub, tone='neutral', icon='•' }){
  return <article className={`studio-kpi tone-${tone}`}><i>{icon}</i><span>{label}</span><strong>{value}</strong>{sub && <small>{sub}</small>}</article>;
}

function AggressorDonut({ summary }){
  const buy = n(summary.buy_aggr_amt_rs);
  const sell = n(summary.sell_aggr_amt_rs);
  const ambig = n(summary.ambig_amt_rs);
  const total = Math.max(1, buy + sell + ambig);
  const buyPct = pct(buy,total);
  const sellPct = pct(sell,total);
  const ambigPct = pct(ambig,total);
  const bg = `conic-gradient(var(--buy) 0 ${buyPct}%, var(--sell) ${buyPct}% ${buyPct+sellPct}%, var(--warn) ${buyPct+sellPct}% 100%)`;
  return <div className="studio-chart-card"><div className="studio-donut" style={{background:bg}}><b>{buyPct.toFixed(1)}%</b><span>Buy Agg</span></div><div className="studio-legend"><p><i className="buy-dot"/>Buy Aggressor <b>{cr(buy)}</b></p><p><i className="sell-dot"/>Sell Aggressor <b>{cr(sell)}</b></p><p><i className="warn-dot"/>Ambiguous <b>{cr(ambig)}</b></p><p><i className="purple-dot"/>Net Flow <b>{cr(buy-sell)}</b></p></div></div>;
}

function AggressorBars({ summary }){
  const buy = n(summary.buy_aggr_amt_rs);
  const sell = n(summary.sell_aggr_amt_rs);
  const ambig = n(summary.ambig_amt_rs);
  const max = Math.max(1,buy,sell,ambig);
  const rows = [
    ['Buy Aggressor', buy, 'buy'], ['Sell Aggressor', sell, 'sell'], ['Ambiguous', ambig, 'warn']
  ];
  return <div className="studio-bars">{rows.map(([label,val,tone])=><div className="studio-bar-row" key={label}><span>{label}</span><b>{cr(val)}</b><i><em className={tone} style={{width:`${Math.max(2, val/max*100)}%`}}/></i></div>)}</div>;
}

function MiniPreview({ draft }){
  const market = draft.market_summary || {};
  const sectors = draft.sectors || [];
  const stocks = sectors.flatMap(s => (s.stocks || []).map(st => ({...st, sector_name:s.sector_name}))).slice(0,5);
  const article = draft.article || {};
  return <section className="studio-preview-shell"><div className="studio-preview-header"><span className="preview-logo">MTA</span><div><b>Nepse_Master_Trade & Analysis</b><small>public preview</small></div></div><h3>{article.title || 'Daily Issue'}</h3><p>{article.hero_thesis || article.opening || 'Market story preview will appear here.'}</p><AggressorDonut summary={market}/><div className="studio-preview-sectors">{sectors.slice(0,4).map(s=><span key={s.sector_name}><b>{s.sector_name}</b><small>{fmtRs(s.summary?.trade_amt_rs)}</small></span>)}</div><table className="studio-preview-table"><tbody>{stocks.map(st=><tr key={st.symbol}><td>{st.symbol}</td><td className="buy">{fmtInt(st.summary?.buy_aggr_qty)}</td><td className="sell">{fmtInt(st.summary?.sell_aggr_qty)}</td><td>{st.summary?.bias || 'Mixed'}</td></tr>)}</tbody></table></section>;
}

function PromptHelper({ draft }){
  const market = draft.market_summary || {};
  const featured = draft.featured_stock || {};
  const prompt = `Write a NEPSE content story for ${draft.business_date}. Use only these facts:\n- Buy Aggressor: ${fmtRs(market.buy_aggr_amt_rs)} / ${fmtInt(market.buy_aggr_qty)} qty\n- Sell Aggressor: ${fmtRs(market.sell_aggr_amt_rs)} / ${fmtInt(market.sell_aggr_qty)} qty\n- Ambiguous: ${fmtRs(market.ambig_amt_rs)} / ${fmtInt(market.ambig_qty)} qty\n- Net Aggressor Qty: ${fmtInt(market.net_aggr_qty)}\n- Featured stock: ${featured.symbol || 'not selected'}\nWrite in simple public language: market first, sector second, stock third, no recommendation, no hype.`;
  return <div className="studio-prompt-box"><div><h3>Prompt helper</h3><p>Copy this into ChatGPT when you want a caption, website paragraph, video intro, or short social post.</p></div><textarea value={prompt} readOnly/><button className="secondary" onClick={()=>copyText(prompt)}>Copy prompt</button></div>;
}

function StoryEditor({ draft, setDraft }){
  const a = draft.article || {};
  const cms = issueCms(draft);
  const setArticle = (key,value)=>setDraft(prev=>({...prev, article:{...(prev.article||{}), [key]:value}, published_article:{...(prev.published_article||prev.article||{}), [key]:value}}));
  const setCms = (path,value)=>setDraft(prev=>({...prev, cms:setDeep(issueCms(prev), path, value)}));
  return <div className="studio-work-grid"><section className="panel studio-card"><p className="eyebrow">Daily issue editor</p><h2>Market story writing</h2><Field label="Public title" value={a.title} onChange={v=>setArticle('title',v)} /><Field label="Hero thesis" value={a.hero_thesis} onChange={v=>setArticle('hero_thesis',v)} multiline helper="This should be the one-line story people understand first."/><Field label="Opening" value={a.opening} onChange={v=>setArticle('opening',v)} multiline/><Field label="Market paragraph" value={a.market_paragraph} onChange={v=>setArticle('market_paragraph',v)} multiline/><Field label="Sector paragraph" value={a.sector_paragraph} onChange={v=>setArticle('sector_paragraph',v)} multiline/><Field label="Featured stock paragraph" value={a.featured_stock_paragraph} onChange={v=>setArticle('featured_stock_paragraph',v)} multiline/></section><section className="panel studio-card"><p className="eyebrow">Quick takeaways</p><h2>Plain-language interpretation</h2><Field label="Reader intro" value={cms.editorial?.reader_intro} onChange={v=>setCms('editorial.reader_intro',v)} multiline/><label className="studio-field"><span>Takeaways, one per line</span><textarea value={arrayToLines(cms.editorial?.key_takeaways)} onChange={e=>setCms('editorial.key_takeaways', linesToArray(e.target.value))}/><small>These become simple “What it means” cards.</small></label><PromptHelper draft={draft}/></section></div>;
}

function BlocksEditor({ draft, setDraft }){
  const cms = issueCms(draft);
  const blocks = cms.editorial?.blocks || [];
  function update(i, patch){ setDraft(prev=>({...prev, cms:setDeep(issueCms(prev),'editorial.blocks', blocks.map((b,idx)=>idx===i?{...b,...patch}:b))})); }
  function add(){ setDraft(prev=>({...prev, cms:setDeep(issueCms(prev),'editorial.blocks',[...blocks,{id:`block-${Date.now()}`, type:'insight', title:'New content block', body:'Write the explanation here.', visible:true}])})); }
  return <section className="panel studio-card"><div className="studio-section-head"><div><p className="eyebrow">Story block editor</p><h2>Build modular public content</h2></div><button className="primary" onClick={add}>Add block</button></div><div className="studio-block-list">{blocks.map((b,i)=><article className="studio-block-editor" key={b.id || i}><div className="studio-block-top"><strong>Block {i+1}</strong><label><input type="checkbox" checked={b.visible!==false} onChange={e=>update(i,{visible:e.target.checked})}/> Visible</label></div><Field label="Title" value={b.title} onChange={v=>update(i,{title:v})}/><Field label="Body" value={b.body} onChange={v=>update(i,{body:v})} multiline/><div className="studio-block-controls"><button className="secondary" onClick={()=>update(i,{type:'insight'})}>Insight</button><button className="secondary" onClick={()=>update(i,{type:'warning'})}>Warning</button><button className="secondary" onClick={()=>update(i,{type:'method'})}>Method</button></div></article>)}</div></section>;
}

function GraphicsEditor({ draft }){
  const market = draft.market_summary || {};
  const sectors = draft.sectors || [];
  const stocks = sectors.flatMap(s => (s.stocks || []).map(st => ({...st, sector_name:s.sector_name}))).sort((a,b)=>Math.abs(n(b.summary?.net_aggr_amt_rs || b.summary?.net_aggr_qty))-Math.abs(n(a.summary?.net_aggr_amt_rs || a.summary?.net_aggr_qty))).slice(0,8);
  return <div className="studio-graphics-grid"><section className="panel studio-card"><p className="eyebrow">Graphical presentation</p><h2>Buy / sell / ambiguity visual kit</h2><AggressorDonut summary={market}/><AggressorBars summary={market}/></section><section className="panel studio-card"><p className="eyebrow">Sector graphics</p><h2>Sector flow cards</h2><div className="studio-sector-grid">{sectors.slice(0,8).map(s=>{const sm=s.summary||{}; const side=n(sm.net_aggr_qty)>=0?'Buy > Sell':'Sell > Buy'; return <article key={s.sector_name} className={n(sm.net_aggr_qty)>=0?'flow-buy':'flow-sell'}><strong>{s.sector_name}</strong><span>{fmtRs(sm.trade_amt_rs)}</span><b>{side}</b><i><em style={{width:`${Math.min(100, Math.abs(n(sm.net_aggr_qty))/Math.max(1,n(sm.trade_qty))*100)}%`}}/></i></article>})}</div></section><section className="panel studio-card full"><p className="eyebrow">Stock battle graphic</p><h2>Top stocks by order-flow strength</h2><div className="studio-stock-bars">{stocks.map(st=>{const sm=st.summary||{}; const buy=n(sm.buy_aggr_amt_rs); const sell=n(sm.sell_aggr_amt_rs); const total=Math.max(1,buy+sell+n(sm.ambig_amt_rs)); return <article key={`${st.sector_name}-${st.symbol}`}><b>{st.symbol}</b><div className="stacked-flow"><i className="buy" style={{width:`${pct(buy,total)}%`}}/><i className="sell" style={{width:`${pct(sell,total)}%`}}/><i className="warn" style={{width:`${pct(n(sm.ambig_amt_rs),total)}%`}}/></div><span>{fmtRs(sm.trade_amt_rs)}</span><em className={n(sm.net_aggr_qty)>=0?'buy':'sell'}>{sm.bias || (n(sm.net_aggr_qty)>=0?'Buy pressure':'Sell pressure')}</em></article>})}</div></section></div>;
}


function SectorStockTextEditor({ draft, setDraft }){
  const cms = issueCms(draft);
  const sectors = draft.sectors || [];
  const stocks = sectors.flatMap(sec => (sec.stocks || []).map(st => ({ ...st, sector_name: sec.sector_name })));
  const [selectedSector, setSelectedSector] = useState(sectors[0]?.sector_name || '');
  const [selectedStock, setSelectedStock] = useState(stocks[0]?.symbol || '');
  const sectorText = cms.sector_interpretations?.[selectedSector] || '';
  const stockText = cms.stock_interpretations?.[selectedStock] || '';
  const selectedSectorObj = sectors.find(s => s.sector_name === selectedSector) || sectors[0] || {};
  const selectedStockObj = stocks.find(s => s.symbol === selectedStock) || stocks[0] || {};
  function setSectorText(value){
    setDraft(prev => {
      const nextCms = issueCms(prev);
      return { ...prev, cms: { ...nextCms, sector_interpretations: { ...(nextCms.sector_interpretations || {}), [selectedSector]: value } } };
    });
  }
  function setStockText(value){
    setDraft(prev => {
      const nextCms = issueCms(prev);
      return { ...prev, cms: { ...nextCms, stock_interpretations: { ...(nextCms.stock_interpretations || {}), [selectedStock]: value } } };
    });
  }
  function sectorPrompt(){
    const sm = selectedSectorObj.summary || {};
    return `Write a short public interpretation for sector ${selectedSector} on ${draft.business_date}. Facts: Trade Amt ${fmtRs(sm.trade_amt_rs)}, Buy Agg ${fmtRs(sm.buy_aggr_amt_rs)}, Sell Agg ${fmtRs(sm.sell_aggr_amt_rs)}, Ambiguous ${fmtRs(sm.ambig_amt_rs)}, Net Agg ${fmtRs(sm.net_aggr_amt_rs)}, active stocks ${fmtInt(selectedSectorObj.active_stocks)}. Explain buy/sell pressure and mention that this is not financial advice.`;
  }
  function stockPrompt(){
    const sm = selectedStockObj.summary || {};
    return `Write a short public interpretation for stock ${selectedStock} on ${draft.business_date}. Facts: Sector ${selectedStockObj.sector_name}, Trade Amt ${fmtRs(sm.trade_amt_rs)}, Buy Agg ${fmtRs(sm.buy_aggr_amt_rs)}, Sell Agg ${fmtRs(sm.sell_aggr_amt_rs)}, Ambiguous ${fmtRs(sm.ambig_amt_rs)}, Net Agg ${fmtRs(sm.net_aggr_amt_rs)}, Day VWAP ${fmtRs(sm.day_vwap_rs || sm.vwap_rs)}, Buy VWAP ${fmtRs(sm.buy_aggr_vwap_rs || sm.buy_aggr_avg_px_rs)}, Sell VWAP ${fmtRs(sm.sell_aggr_vwap_rs || sm.sell_aggr_avg_px_rs)}, Close ${fmtRs(sm.close_rs)}. Explain pressure, VWAP relation and evidence quality without giving recommendation.`;
  }
  return <div className="studio-work-grid sector-stock-admin-grid">
    <section className="panel studio-card">
      <p className="eyebrow">Sector interpretation editor</p>
      <h2>Public sector text</h2>
      <label className="studio-field"><span>Choose sector</span><select value={selectedSector} onChange={e=>setSelectedSector(e.target.value)}>{sectors.map(s=><option key={s.sector_name} value={s.sector_name}>{s.sector_name}</option>)}</select></label>
      <div className="admin-fact-strip"><span>Trade Amt <b>{fmtRs(selectedSectorObj.summary?.trade_amt_rs)}</b></span><span>Buy Agg <b className="buy">{fmtRs(selectedSectorObj.summary?.buy_aggr_amt_rs)}</b></span><span>Sell Agg <b className="sell">{fmtRs(selectedSectorObj.summary?.sell_aggr_amt_rs)}</b></span><span>Net <b className={n(selectedSectorObj.summary?.net_aggr_amt_rs)>=0?'buy':'sell'}>{fmtRs(selectedSectorObj.summary?.net_aggr_amt_rs)}</b></span></div>
      <Field label="Sector public interpretation" value={sectorText} onChange={setSectorText} multiline helper="This appears on the sector detail page when this sector is opened." />
      <button className="secondary" onClick={()=>copyText(sectorPrompt())}>Copy sector prompt</button>
    </section>
    <section className="panel studio-card">
      <p className="eyebrow">Stock interpretation editor</p>
      <h2>Public stock text</h2>
      <label className="studio-field"><span>Choose stock</span><select value={selectedStock} onChange={e=>setSelectedStock(e.target.value)}>{stocks.map(s=><option key={s.symbol} value={s.symbol}>{s.symbol} · {s.sector_name}</option>)}</select></label>
      <div className="admin-fact-strip"><span>Trade Amt <b>{fmtRs(selectedStockObj.summary?.trade_amt_rs)}</b></span><span>Buy VWAP <b className="buy">{fmtRs(selectedStockObj.summary?.buy_aggr_vwap_rs || selectedStockObj.summary?.buy_aggr_avg_px_rs)}</b></span><span>Sell VWAP <b className="sell">{fmtRs(selectedStockObj.summary?.sell_aggr_vwap_rs || selectedStockObj.summary?.sell_aggr_avg_px_rs)}</b></span><span>Close <b>{fmtRs(selectedStockObj.summary?.close_rs)}</b></span></div>
      <Field label="Stock public interpretation" value={stockText} onChange={setStockText} multiline helper="This appears on the stock detail page when this symbol is opened." />
      <button className="secondary" onClick={()=>copyText(stockPrompt())}>Copy stock prompt</button>
    </section>
  </div>;
}

function PublishPanel({ draft, setDraft }){
  const p = draft.publishing || {};
  const setPub = (key,value)=>setDraft(prev=>({...prev,publishing:{...(prev.publishing||{}),[key]:value}}));
  return <div className="studio-work-grid"><section className="panel studio-card"><p className="eyebrow">Publish controls</p><h2>Review, publish, archive</h2><label className="studio-field"><span>Status</span><select value={p.status || 'draft'} onChange={e=>setPub('status',e.target.value)}><option value="draft">Draft</option><option value="review">Review</option><option value="published">Published</option><option value="archived">Archived</option></select></label><Field label="YouTube URL" value={p.youtube_url} onChange={v=>setPub('youtube_url',v)}/><Field label="Reviewed by" value={p.reviewed_by} onChange={v=>setPub('reviewed_by',v)}/><Field label="Editor notes" value={p.editor_notes} onChange={v=>setPub('editor_notes',v)} multiline/><div className="studio-export-grid"><button className="secondary" onClick={()=>copyText(window.location.origin+`/daily/${draft.business_date}`)}>Copy public link</button><button className="secondary" onClick={()=>copyText(JSON.stringify(draft,null,2))}>Copy JSON</button><button className="secondary" onClick={()=>window.print()}>Print / save PDF</button></div></section><section className="panel studio-card"><p className="eyebrow">Desktop + mobile preview</p><h2>Public page feel</h2><MiniPreview draft={draft}/></section></div>;
}

export default function AdminEditor({ issue }){
  const [draft,setDraft]=useState(issue);
  const [tab,setTab]=useState('story');
  const [status,setStatus]=useState('');
  useEffect(()=>setDraft(issue),[issue]);
  const market = draft?.market_summary || {};
  const readiness = useMemo(()=>{
    const cms = issueCms(draft || {});
    const checks = [draft?.article?.title, draft?.article?.hero_thesis, draft?.featured_stock?.symbol, (cms.editorial?.key_takeaways||[]).length>=2, draft?.publishing?.status];
    const ok = checks.filter(Boolean).length;
    return {ok,total:checks.length,pct:Math.round(ok/checks.length*100)};
  },[draft]);
  async function save(){
    setStatus('Saving admin studio changes…');
    const res = await fetch(apiUrl(`/api/content/daily/${draft.business_date}/admin/save-issue`), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({issue:draft}) });
    const data = await res.json().catch(()=>({}));
    if(!res.ok) { setStatus(data.detail || 'Save failed. Backend must be running.'); return; }
    setDraft(data.issue || draft); setStatus('Saved. Public JSON/admin issue rebuilt.');
  }
  const tabs = [['story','Story editor'],['blocks','Story blocks'],['graphics','Charts & graphics'],['sectorstock','Sector/stock text'],['publish','Preview + publish']];
  return <main className="studio-page"><section className="studio-hero"><div><p className="eyebrow">Content Admin Studio</p><h1>Build the public order-flow story</h1><p className="lead">Edit the content layer, not the research terminal. The page should explain buy aggressor, sell aggressor, ambiguity, same-broker context, sectors, stocks and index relation in a visually readable way.</p><div className="studio-actions"><button className="primary" onClick={save}>Save CMS + rebuild</button><button className="secondary" onClick={()=>setRoute(`/daily/${draft.business_date}`)}>Open public site</button><button className="secondary" onClick={()=>setRoute(`/admin/writer/daily/${draft.business_date}`)}>Prompt writer</button></div>{status && <p className="save-status">{status}</p>}</div><aside className="studio-command-card"><div><span>Readiness</span><strong>{readiness.ok}/{readiness.total}</strong></div><i><em style={{width:`${readiness.pct}%`}}/></i><small>{draft.business_date} · {draft.publishing?.status || 'draft'}</small></aside></section><section className="studio-kpi-grid"><AdminKpi icon="↗" tone="index" label="NEPSE / market context" value={draft.market_index?.close || 'Index card'} sub="Used to frame the story"/><AdminKpi icon="▲" tone="buy" label="Buy Aggressor" value={fmtRs(market.buy_aggr_amt_rs)} sub={fmtInt(market.buy_aggr_qty)}/><AdminKpi icon="▼" tone="sell" label="Sell Aggressor" value={fmtRs(market.sell_aggr_amt_rs)} sub={fmtInt(market.sell_aggr_qty)}/><AdminKpi icon="?" tone="warn" label="Ambiguity" value={fmtRs(market.ambig_amt_rs)} sub={fmtPct(pct(n(market.ambig_amt_rs), n(market.trade_amt_rs)))}/><AdminKpi icon="●" tone="purple" label="Same-broker / context" value="Presentation" sub="Use in charts + takeaways"/></section><nav className="studio-tabs">{tabs.map(([k,l])=><button key={k} className={tab===k?'active':''} onClick={()=>setTab(k)}>{l}</button>)}</nav>{tab==='story' && <StoryEditor draft={draft} setDraft={setDraft}/>} {tab==='blocks' && <BlocksEditor draft={draft} setDraft={setDraft}/>} {tab==='graphics' && <GraphicsEditor draft={draft}/>} {tab==='sectorstock' && <SectorStockTextEditor draft={draft} setDraft={setDraft}/>} {tab==='publish' && <PublishPanel draft={draft} setDraft={setDraft}/>}</main>;
}
