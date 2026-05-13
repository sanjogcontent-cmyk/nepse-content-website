export function n(v) {
  const x = Number(v || 0);
  return Number.isFinite(x) ? x : 0;
}

export function cssToneClass(tone) {
  if (tone === 'buy') return 'buy';
  if (tone === 'sell') return 'sell';
  if (tone === 'mixed') return 'mixed';
  return 'neutral';
}

export function sectorAmounts(summary = {}) {
  const buy = n(summary.buy_aggr_amt_rs ?? summary.buy_aggressor_amt_rs ?? summary.buy_amt_rs);
  const sell = n(summary.sell_aggr_amt_rs ?? summary.sell_aggressor_amt_rs ?? summary.sell_amt_rs);
  const ambig = n(summary.ambig_amt_rs ?? summary.ambiguous_amt_rs ?? summary.ambig_trade_amt_rs ?? summary.neutral_amt_rs);
  const statedTotal = n(summary.trade_amt_rs);
  const pressureTotal = buy + sell + ambig;
  const total = pressureTotal > 0 ? pressureTotal : statedTotal;
  return { buy, sell, ambig, total, statedTotal };
}

export function pressureShares(summary = {}) {
  const { buy, sell, ambig, total } = sectorAmounts(summary);
  if (!total) return { buyPct: 0, sellPct: 0, ambigPct: 0 };
  return {
    buyPct: Math.max(0, Math.min(100, (buy / total) * 100)),
    sellPct: Math.max(0, Math.min(100, (sell / total) * 100)),
    ambigPct: Math.max(0, Math.min(100, (ambig / total) * 100)),
  };
}

export function getSectorPressureTone(sectorOrSummary = {}) {
  const summary = sectorOrSummary.summary || sectorOrSummary;
  const { buy, sell, ambig, total } = sectorAmounts(summary);
  if (!total) return 'neutral';
  const buyPct = buy / total;
  const sellPct = sell / total;
  const ambigPct = ambig / total;
  const diffPct = Math.abs(buyPct - sellPct);
  if (ambigPct >= 0.18 && diffPct < 0.12) return 'mixed';
  if (diffPct < 0.05) return 'mixed';
  return buyPct > sellPct ? 'buy' : 'sell';
}

export function getSectorPressureLabel(sectorOrSummary = {}) {
  const tone = getSectorPressureTone(sectorOrSummary);
  if (tone === 'buy') return 'BUY-LED';
  if (tone === 'sell') return 'SELL-LED';
  if (tone === 'mixed') return 'MIXED';
  return 'LOW DATA';
}

export function pressureDominancePct(summary = {}) {
  const { buyPct, sellPct } = pressureShares(summary);
  return Math.abs(buyPct - sellPct);
}

export function getSectorPressureRead(sectorOrSummary = {}) {
  const sector = sectorOrSummary.summary ? sectorOrSummary : { summary: sectorOrSummary };
  const summary = sector.summary || {};
  const tone = getSectorPressureTone(sector);
  const { buyPct, sellPct, ambigPct } = pressureShares(summary);
  const indexPct = n(sector.index?.change_pct);

  if (tone === 'mixed') {
    if (ambigPct > 12) return 'Mixed tape: pressure was split and ambiguity needs inspection.';
    return 'Mixed tape: buy and sell money were closely balanced.';
  }
  if (tone === 'buy' && indexPct < 0) return 'Buy-aggressive money appeared, but price tone stayed weak.';
  if (tone === 'sell' && indexPct > 0) return 'Price tone held up despite sell-aggressive money.';
  if (tone === 'buy') return buyPct > 60 ? 'Buy-aggressive money clearly led this sector.' : 'Buy-aggressive money led this sector.';
  if (tone === 'sell') return sellPct > 60 ? 'Sell-aggressive money clearly dominated this sector.' : 'Sell-aggressive money dominated this sector.';
  return 'Low confirmed pressure in this sector.';
}

export function sortSectors(sectors = [], mode = 'turnover') {
  const arr = [...sectors];
  if (mode === 'buyPressure') return arr.sort((a, b) => sectorAmounts(b.summary).buy - sectorAmounts(a.summary).buy);
  if (mode === 'sellPressure') return arr.sort((a, b) => sectorAmounts(b.summary).sell - sectorAmounts(a.summary).sell);
  if (mode === 'ambiguity') return arr.sort((a, b) => sectorAmounts(b.summary).ambig - sectorAmounts(a.summary).ambig);
  if (mode === 'sameBroker') return arr.sort((a, b) => n(b.summary?.same_broker_turnover_pct) - n(a.summary?.same_broker_turnover_pct));
  if (mode === 'index') return arr.sort((a, b) => n(b.index?.change_pct) - n(a.index?.change_pct));
  return arr.sort((a, b) => n(b.summary?.trade_amt_rs) - n(a.summary?.trade_amt_rs));
}

export function filterSectors(sectors = [], mode = 'all') {
  if (mode === 'buy') return sectors.filter((s) => getSectorPressureTone(s) === 'buy');
  if (mode === 'sell') return sectors.filter((s) => getSectorPressureTone(s) === 'sell');
  if (mode === 'mixed') return sectors.filter((s) => getSectorPressureTone(s) === 'mixed');
  if (mode === 'indexUp') return sectors.filter((s) => n(s.index?.change_pct) > 0);
  if (mode === 'indexDown') return sectors.filter((s) => n(s.index?.change_pct) < 0);
  return sectors;
}

export function topSectorStocks(sector = {}, count = 3) {
  return [...(sector.stocks || [])]
    .sort((a, b) => n(b.summary?.trade_amt_rs) - n(a.summary?.trade_amt_rs))
    .slice(0, count);
}
