import { fmtInt, fmtRs, fmtPct, fmtPx } from './utils.js';

function deepMerge(base, extra) {
  if (!extra || typeof extra !== 'object') return base;
  const out = Array.isArray(base) ? [...base] : { ...(base || {}) };
  for (const [key, value] of Object.entries(extra)) {
    if (Array.isArray(value)) out[key] = value;
    else if (value && typeof value === 'object' && !Array.isArray(value)) out[key] = deepMerge(out[key] || {}, value);
    else if (value !== undefined) out[key] = value;
  }
  return out;
}

function biasLabel(summary = {}) {
  const net = Number(summary.net_aggr_qty || 0);
  if (net > 0) return 'buy-aggressive pressure';
  if (net < 0) return 'sell-aggressive pressure';
  return 'mixed aggressor pressure';
}

function firstSector(issue = {}) {
  return (issue.sectors || [])[0] || {};
}

export function defaultCmsFromIssue(issue = {}) {
  const article = issue.article || {};
  const market = issue.market_summary || {};
  const sector = firstSector(issue);
  const featured = issue.featured_stock || {};
  const fs = featured.summary || {};
  const youtube = issue.youtube_package || {};
  const publishing = issue.publishing || {};
  const videoUrl = publishing.youtube_url || youtube.youtube_url || '';
  const featuredName = featured.company_name || featured.security_name || featured.symbol || 'featured stock';
  return {
    layout: {
      mode: 'publication',
      show_quick_read: true,
      show_story_board: true,
      show_editorial_blocks: true,
      show_price_flow_truth: true,
      show_sector_board: true,
      show_stock_table: true,
      show_video_cta: true,
      show_method: true,
      public_density: 'clean',
      featured_position: 'after_sector_board',
    },
    editorial: {
      kicker: 'NEPSE Order-Flow Daily',
      reader_intro: article.opening || 'A reader-first summary of market pressure, sector context, and the featured stock story from reconstructed bucket-level flow.',
      key_takeaways: [
        `Market bias: ${biasLabel(market)} from net aggressor quantity of ${fmtInt(market.net_aggr_qty)}.`,
        `Leading sector: ${sector.sector_name || '—'} with turnover of ${fmtRs((sector.summary || {}).trade_amt_rs)}.`,
        `Featured stock: ${featured.symbol || '—'} with close ${fmtPx(fs.close_rs)} and day VWAP ${fmtPx(fs.day_vwap_rs || fs.vwap_rs)}.`,
      ],
      story_path: [
        { label: 'Market', text: 'Start with the whole-market pressure.' },
        { label: 'Sector', text: 'Then narrow into the sector with strongest public context.' },
        { label: 'Stock', text: 'Then inspect one stock story with clean numbers.' },
        { label: 'Proof', text: 'Use video/replay to prove the bucket evidence.' },
      ],
      blocks: [
        { id: 'opening', type: 'lead', title: 'Opening view', body: article.opening || '', visible: true },
        { id: 'market', type: 'market', title: 'Market story', body: article.market_paragraph || '', visible: true },
        { id: 'sector', type: 'sector', title: 'Sector story', body: article.sector_paragraph || '', visible: true },
        { id: 'featured', type: 'featured', title: `${featured.symbol || 'Featured stock'} story`, body: article.featured_stock_paragraph || '', visible: true },
        { id: 'video', type: 'proof', title: 'What the video should prove', body: article.video_intro || '', visible: true },
      ],
    },
    featured: {
      headline: featured.symbol ? `${featured.symbol} — ${featuredName}` : 'Featured stock of the day',
      editor_angle: article.featured_stock_paragraph || '',
      why_selected: [
        `Net aggressor quantity: ${fmtInt(fs.net_aggr_qty)}.`,
        `Buy Agg VWAP: ${fmtPx(fs.buy_aggr_vwap_rs || fs.buy_aggr_avg_px_rs)}; Sell Agg VWAP: ${fmtPx(fs.sell_aggr_vwap_rs || fs.sell_aggr_avg_px_rs)}.`,
        `Evidence: confidence ${fmtPct(fs.confidence_pct)}, explainability ${fmtPct(fs.explainability_pct)}.`,
      ],
      proof_points: [
        'Check whether aggression continued or failed after the bucket.',
        'Check whether price accepted the pressure near VWAP.',
        'Check gaps, wipes, and locked-depth warnings before making the public story strong.',
      ],
    },
    cta: {
      video_title: `Watch the proof behind ${featured.symbol || 'today\'s stock story'}`,
      video_body: 'The website summarizes the day. The video should prove it with PRE → POST bucket movement, aggressor flow, and evidence quality.',
      primary_label: videoUrl ? 'Watch on YouTube' : 'Video coming soon',
      secondary_label: 'Read method note',
      youtube_url: videoUrl,
    },
    social: {
      community_post: youtube.community_post || '',
      shorts_caption: '',
      pinned_comment: youtube.pinned_comment || '',
      hashtags: ['#NEPSE', '#OrderFlow', '#MarketAnalysis', '#NepseMasterTrade'],
    },
  };
}

export function issueCms(issue = {}) {
  const base = defaultCmsFromIssue(issue);
  return deepMerge(base, issue.cms || issue.public_cms || issue.public?.cms || {});
}

export function normalizeCms(cms = {}, issue = {}) {
  return issueCms({ ...issue, cms });
}

export function linesToArray(text) {
  return String(text || '').split('\n').map(x => x.trim()).filter(Boolean);
}

export function arrayToLines(items) {
  return (items || []).map(x => typeof x === 'string' ? x : JSON.stringify(x)).join('\n');
}
