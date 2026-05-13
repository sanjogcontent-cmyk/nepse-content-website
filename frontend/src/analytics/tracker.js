const SESSION_KEY = 'mta_content_session_id';
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const sentScrollMilestones = new Set();
let pageStart = Date.now();

function cryptoId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = cryptoId();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export async function trackEvent(eventName, payload = {}) {
  try {
    const body = {
      event_name: eventName,
      session_id: getSessionId(),
      page_path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
      ...payload,
    };
    const res = await fetch(`${API_BASE}/api/analytics/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function trackAdminEvent(actionName, payload = {}) {
  try {
    const res = await fetch(`${API_BASE}/api/analytics/admin/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action_name: actionName, ...payload }),
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function resetReadingTimer() {
  pageStart = Date.now();
  sentScrollMilestones.clear();
}

export function readingSeconds() {
  return Math.max(0, Math.round((Date.now() - pageStart) / 1000));
}

export function installScrollTracking(issue) {
  if (!issue?.business_date) return () => {};
  const onScroll = () => {
    const doc = document.documentElement;
    const max = Math.max(1, doc.scrollHeight - window.innerHeight);
    const pct = Math.max(0, Math.min(100, Math.round((window.scrollY / max) * 100)));
    [25, 50, 75, 100].forEach((mark) => {
      if (pct >= mark && !sentScrollMilestones.has(mark)) {
        sentScrollMilestones.add(mark);
        trackEvent(`scroll_${mark}`, {
          business_date: issue.business_date,
          scroll_depth_pct: mark,
          reading_seconds: readingSeconds(),
        });
      }
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  return () => {
    window.removeEventListener('scroll', onScroll);
    trackEvent('reading_time_recorded', {
      business_date: issue.business_date,
      reading_seconds: readingSeconds(),
    });
  };
}

export function observeOnce(selector, eventName, payload = {}) {
  const node = document.querySelector(selector);
  if (!node || !('IntersectionObserver' in window)) return () => {};
  let done = false;
  const io = new IntersectionObserver((entries) => {
    const visible = entries.some(e => e.isIntersecting && e.intersectionRatio >= 0.2);
    if (visible && !done) {
      done = true;
      trackEvent(eventName, payload);
      io.disconnect();
    }
  }, { threshold: [0.2] });
  io.observe(node);
  return () => io.disconnect();
}
