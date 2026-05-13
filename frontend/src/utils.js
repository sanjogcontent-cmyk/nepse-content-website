export const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
export const nf1 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmtInt(v) {
  return nf0.format(Number(v || 0));
}

export function fmtRs(v) {
  const x = Number(v || 0);
  const sign = x < 0 ? '-' : '';
  const ax = Math.abs(x);
  if (ax >= 1_000_000_000) return `${sign}Rs ${(ax / 1_000_000_000).toFixed(2)} B`;
  if (ax >= 10_000_000) return `${sign}Rs ${(ax / 10_000_000).toFixed(2)} Cr`;
  if (ax >= 100_000) return `${sign}Rs ${(ax / 100_000).toFixed(2)} Lac`;
  return `${sign}Rs ${nf2.format(ax)}`;
}

export function fmtPct(v) {
  if (v === null || v === undefined) return '—';
  return `${nf1.format(Number(v || 0))}%`;
}

export function fmtPx(v) {
  if (v === null || v === undefined) return '—';
  return `Rs ${nf2.format(Number(v))}`;
}

export function toneFromNumber(v) {
  const n = Number(v || 0);
  if (n > 0) return 'buy';
  if (n < 0) return 'sell';
  return 'neutral';
}

export function cssSafe(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export async function loadJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export function setRoute(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
