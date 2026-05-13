import { fmtInt, fmtRs, fmtPct, fmtPx, cssSafe, setRoute } from '../../utils.js';

export { fmtInt, fmtRs, fmtPct, fmtPx, cssSafe, setRoute };

export function n(v) {
  const x = Number(v || 0);
  return Number.isFinite(x) ? x : 0;
}

export function pct(part, total) {
  const t = n(total);
  return t ? (n(part) / t) * 100 : 0;
}

export function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

export function flowTotal(summary = {}, mode = 'amount') {
  if (mode === 'qty') return Math.max(n(summary.buy_aggr_qty) + n(summary.sell_aggr_qty) + n(summary.ambig_qty), 1);
  return Math.max(n(summary.buy_aggr_amt_rs) + n(summary.sell_aggr_amt_rs) + n(summary.ambig_amt_rs), 1);
}

export function flowShares(summary = {}, mode = 'amount') {
  const total = flowTotal(summary, mode);
  if (mode === 'qty') {
    return {
      buy: pct(summary.buy_aggr_qty, total),
      sell: pct(summary.sell_aggr_qty, total),
      ambig: pct(summary.ambig_qty, total),
    };
  }
  return {
    buy: pct(summary.buy_aggr_amt_rs, total),
    sell: pct(summary.sell_aggr_amt_rs, total),
    ambig: pct(summary.ambig_amt_rs, total),
  };
}

export function netQty(summary = {}) {
  if (summary.net_aggr_qty !== undefined && summary.net_aggr_qty !== null) return n(summary.net_aggr_qty);
  return n(summary.buy_aggr_qty) - n(summary.sell_aggr_qty);
}

export function netAmount(summary = {}) {
  if (summary.net_aggr_amt_rs !== undefined && summary.net_aggr_amt_rs !== null) return n(summary.net_aggr_amt_rs);
  return n(summary.buy_aggr_amt_rs) - n(summary.sell_aggr_amt_rs);
}

export function biasWord(summary = {}) {
  const net = netAmount(summary) || netQty(summary);
  if (net > 0) return 'Buy-led';
  if (net < 0) return 'Sell-led';
  return 'Balanced';
}

export function biasTone(summary = {}) {
  const net = netAmount(summary) || netQty(summary);
  if (net > 0) return 'buy';
  if (net < 0) return 'sell';
  return 'neutral';
}

export function compactQty(v) {
  const x = n(v);
  const sign = x < 0 ? '-' : '';
  const ax = Math.abs(x);
  if (ax >= 1_000_000) return `${sign}${(ax / 1_000_000).toFixed(1)}M`;
  if (ax >= 1000) return `${sign}${(ax / 1000).toFixed(1)}k`;
  return `${sign}${fmtInt(ax)}`;
}

export function flowPillLabel(summary = {}) {
  const net = netQty(summary);
  if (net > 0) return `Buy +${compactQty(net)}`;
  if (net < 0) return `Sell ${compactQty(net)}`;
  return 'Neutral';
}

export function boardRead(row = {}) {
  const price = n(row.change_rs ?? row.change_pct);
  const flow = n(row.net_aggr_qty);
  if (price > 0 && flow > 0) return 'Confirms upside';
  if (price > 0 && flow < 0) return 'Price up, sellers active';
  if (price < 0 && flow < 0) return 'Confirms downside';
  if (price < 0 && flow > 0) return 'Price down despite buy support';
  if (flow > 0) return 'Buy pressure contained';
  if (flow < 0) return 'Sell pressure contained';
  return 'Mixed / neutral';
}

export function sameBrokerPct(scope = {}) {
  const v = scope.same_broker_turnover_pct;
  if (v === null || v === undefined) return null;
  return n(v);
}

export function sameBrokerLabel(scope = {}) {
  const pctValue = sameBrokerPct(scope);
  if (pctValue === null) return '';
  return `Same-broker ${pctValue.toFixed(2)}%`;
}

export function sectorSlug(name = '') {
  return encodeURIComponent(cssSafe(name || 'sector'));
}

export function stockRows(issue = {}) {
  return safeArr(issue.sectors).flatMap((sector) =>
    safeArr(sector.stocks).map((stock) => ({ ...stock, sector_name: stock.sector_name || sector.sector_name }))
  );
}
