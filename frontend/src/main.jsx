import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Header from './components/Header.jsx';
import Home from './pages/Home.jsx';
import DailyIssue from './pages/DailyIssue.jsx';
import AdminEditor from './pages/AdminEditor.jsx';
import AdminAnalytics from './pages/AdminAnalytics.jsx';
import Archive from './pages/Archive.jsx';
import StockArchive from './pages/StockArchive.jsx';
import StockDetail from './pages/StockDetail.jsx';
import SectorArchive from './pages/SectorArchive.jsx';
import SectorDetail from './pages/SectorDetail.jsx';
import VideoArchive from './pages/VideoArchive.jsx';
import Learn from './pages/Learn.jsx';
import Weekly from './pages/Weekly.jsx';
import MarketBoardsPage from './pages/MarketBoardsPage.jsx';
import AdminWriter from './pages/AdminWriter.jsx';
import { loadJson } from './utils.js';
import { EmptyState } from './components/IssuePolish.jsx';
import './styles.css';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const apiUrl = (path) => `${API_BASE}${path}`;

function useRoute() {
  const [loc, setLoc] = useState({ path: window.location.pathname, search: window.location.search });
  useEffect(() => {
    const fn = () => setLoc({ path: window.location.pathname, search: window.location.search });
    window.addEventListener('popstate', fn);
    return () => window.removeEventListener('popstate', fn);
  }, []);
  return loc;
}

function App() {
  const { path, search } = useRoute();
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState('');
  const dateFromPath = useMemo(() => {
    const m = path.match(/\/daily\/(\d{4}-\d{2}-\d{2})/) || path.match(/\/admin\/daily\/(\d{4}-\d{2}-\d{2})/) || path.match(/\/admin\/analytics\/daily\/(\d{4}-\d{2}-\d{2})/);
    if (m?.[1]) return m[1];
    const qp = new URLSearchParams(search).get('date');
    return qp || '';
  }, [path, search]);
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setError('');
      try {
        if (dateFromPath) {
          if (path.startsWith('/admin')) {
            const adminData = await loadJson(apiUrl(`/api/content/daily/${dateFromPath}/admin/full`));
            if (adminData?.business_date && adminData.business_date !== dateFromPath) throw new Error(`Date-lock mismatch: requested ${dateFromPath}, admin API returned ${adminData.business_date}`);
            if (!cancelled) setIssue(adminData);
          } else {
            const data = await loadJson(`/content/daily/${dateFromPath}.json`);
            if (data?.business_date && data.business_date !== dateFromPath) throw new Error(`Date-lock mismatch: requested ${dateFromPath}, file contains ${data.business_date}`);
            if (!cancelled) setIssue(data);
          }
        } else {
          const latest = await loadJson('/content/latest.json');
          if (!cancelled) setIssue(latest.issue || latest);
        }
      } catch (e) {
        try {
          const api = await loadJson(apiUrl(dateFromPath ? (path.startsWith('/admin') ? `/api/content/daily/${dateFromPath}/admin/full` : `/api/content/daily/${dateFromPath}`) : '/api/content/latest'));
          const nextIssue = api.issue || api;
          if (dateFromPath && nextIssue?.business_date && nextIssue.business_date !== dateFromPath) throw new Error(`Date-lock mismatch: requested ${dateFromPath}, API returned ${nextIssue.business_date}`);
          if (!cancelled) setIssue(nextIssue);
        } catch (e2) {
          if (!cancelled) setError(String(e2.message || e2));
        }
      }
    }
    run();
    return () => { cancelled = true; };
  }, [dateFromPath, path]);

  if (error) return <div className="app"><Header issue={issue} /><main className="phase7-shell"><EmptyState title="Content not generated yet" body={error} action={<code>python -m app.content.daily_issue_builder --analysis-db ... --index-meta-json ... --index-db ... --date YYYY-MM-DD --out-root frontend/public/content</code>} /></main></div>;
  if (!issue) return <div className="loading phase7-loading"><span className="loader-orb" />Loading NEPSE MTA content issue…</div>;

  let page = <Home issue={issue} />;
  if (path.startsWith('/daily/') && dateFromPath) page = <DailyIssue issue={issue} />;
  else if (path === '/daily' || path === '/archive') page = <Archive issue={issue} />;
  else if (path === '/boards') page = <MarketBoardsPage issue={issue} />;
  else if (path === '/stocks') page = <StockArchive issue={issue} />;
  else if (path.startsWith('/stocks/')) {
    const m = path.match(/\/stocks\/([^/]+)/);
    page = <StockDetail issue={issue} symbol={m?.[1]?.toUpperCase()} />;
  }
  else if (path === '/sectors') page = <SectorArchive issue={issue} />;
  else if (path.startsWith('/sectors/')) {
    const m = path.match(/\/sectors\/([^/]+)/);
    page = <SectorDetail issue={issue} sectorSlug={m?.[1]} />;
  }
  else if (path.startsWith('/videos')) page = <VideoArchive issue={issue} />;
  else if (path.startsWith('/weekly')) {
    const m = path.match(/\/weekly\/([^/]+)/);
    page = <Weekly weekId={m?.[1]} />;
  }
  else if (path.startsWith('/admin/writer')) page = <AdminWriter issue={issue} />;
  else if (path.startsWith('/admin/analytics')) page = <AdminAnalytics issue={issue} />;
  else if (path.startsWith('/admin')) page = <AdminEditor issue={issue} />;
  else if (path.startsWith('/learn')) page = <Learn />;

  return <div className="app"><Header issue={issue} />{page}<footer className="footer"><span>NEPSE MTA · Database-first publication<span className="footer-privacy-note">Privacy-safe analytics track content interactions only, not holdings or brokerage data.</span></span><span>Educational content only. Not financial advice.</span></footer></div>;
}

createRoot(document.getElementById('root')).render(<App />);
