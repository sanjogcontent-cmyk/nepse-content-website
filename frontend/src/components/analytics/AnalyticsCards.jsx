import React from 'react';
import { fmtInt, fmtPct } from '../../utils.js';

export function MetricCard({ label, value, sub, tone }) {
  return <div className={`analytics-metric ${tone || ''}`}><span>{label}</span><strong>{fmtInt(value)}</strong>{sub && <em>{sub}</em>}</div>;
}

export function FunnelChart({ funnel }) {
  const steps = funnel?.steps || [];
  const max = Math.max(...steps.map(s => Number(s.count || 0)), 1);
  return <div className="analytics-panel"><div className="analytics-panel-head"><p className="eyebrow">Daily funnel</p><h2>Market → sector → stock → video</h2></div><div className="funnel-list">{steps.map((s, idx) => <div className="funnel-row" key={s.label}><span>{idx + 1}. {s.label}</span><b>{fmtInt(s.count)}</b><em>{fmtPct(s.pct_of_issue)}</em><i style={{ width: `${Math.max(3, Number(s.count || 0) / max * 100)}%` }} /></div>)}</div></div>;
}

export function TopSectorsTable({ items = [] }) {
  return <div className="analytics-panel"><div className="analytics-panel-head"><p className="eyebrow">Sector interest</p><h2>Top sectors readers opened</h2></div><div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Rank</th><th>Sector</th><th>Views</th><th>Clicks</th><th>Stock clicks</th><th>Link copies</th><th>Score</th></tr></thead><tbody>{items.map((x, i) => <tr key={x.sector_name}><td>#{i + 1}</td><td><b>{x.sector_name}</b></td><td>{fmtInt(x.views)}</td><td>{fmtInt(x.clicks)}</td><td>{fmtInt(x.stock_clicks_inside_sector)}</td><td>{fmtInt(x.deep_link_copies)}</td><td>{Number(x.reader_interest_score || 0).toFixed(2)}</td></tr>)}</tbody></table></div></div>;
}

export function TopStocksTable({ items = [] }) {
  return <div className="analytics-panel"><div className="analytics-panel-head"><p className="eyebrow">Stock interest</p><h2>Top stocks readers clicked</h2></div><div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Rank</th><th>Symbol</th><th>Sector</th><th>Rows</th><th>Teaser</th><th>Featured</th><th>YouTube</th><th>Search</th><th>Score</th></tr></thead><tbody>{items.map((x, i) => <tr key={x.symbol}><td>#{i + 1}</td><td><b>{x.symbol}</b></td><td>{x.sector_name || '—'}</td><td>{fmtInt(x.row_clicks)}</td><td>{fmtInt(x.teaser_views)}</td><td>{fmtInt(x.featured_views)}</td><td>{fmtInt(x.youtube_clicks)}</td><td>{fmtInt(x.search_hits)}</td><td>{Number(x.reader_interest_score || 0).toFixed(2)}</td></tr>)}</tbody></table></div></div>;
}

export function VideoConversionCard({ video }) {
  return <div className="analytics-panel"><div className="analytics-panel-head"><p className="eyebrow">YouTube conversion</p><h2>Featured story → video click</h2></div><div className="video-conversion-grid"><MetricCard label="Video block views" value={video?.video_block_views || 0} /><MetricCard label="YouTube clicks" value={video?.youtube_clicks || 0} tone="buy" /><MetricCard label="Conversion" value={video?.conversion_pct || 0} sub="percent" /></div></div>;
}

export function SearchTermsTable({ items = [] }) {
  return <div className="analytics-panel"><div className="analytics-panel-head"><p className="eyebrow">Search demand</p><h2>What users searched</h2></div><div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Term</th><th>Scope</th><th>Searches</th><th>Clicks</th><th>No result</th></tr></thead><tbody>{items.map((x) => <tr key={`${x.search_term}-${x.search_scope}`}><td><b>{x.search_term}</b></td><td>{x.search_scope}</td><td>{fmtInt(x.searches)}</td><td>{fmtInt(x.result_clicks)}</td><td>{fmtInt(x.no_result_count)}</td></tr>)}</tbody></table></div></div>;
}

export function ContentOpportunityTable({ items = [] }) {
  return <div className="analytics-panel"><div className="analytics-panel-head"><p className="eyebrow">Content opportunity</p><h2>Next video candidates from reader demand</h2></div><div className="analytics-table-wrap"><table className="analytics-table"><thead><tr><th>Rank</th><th>Symbol</th><th>Sector</th><th>Reader score</th><th>Opportunity</th><th>Reason</th></tr></thead><tbody>{items.map((x, i) => <tr key={x.symbol}><td>#{i + 1}</td><td><b>{x.symbol}</b></td><td>{x.sector_name || '—'}</td><td>{Number(x.reader_interest_score || 0).toFixed(2)}</td><td>{Number(x.content_opportunity_score || 0).toFixed(2)}</td><td>{x.reason}</td></tr>)}</tbody></table></div></div>;
}
