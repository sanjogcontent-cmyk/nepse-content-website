import React, { useState } from 'react';
import { setRoute } from '../utils.js';

function navClass(path, target) {
  if (target === '/' && path === '/') return 'active';
  if (target !== '/' && path.startsWith(target)) return 'active';
  return '';
}

export default function Header({ issue }) {
  const [open, setOpen] = useState(false);
  const date = issue?.business_date;
  const path = window.location.pathname;
  const go = (nextPath) => { setOpen(false); setRoute(nextPath); };
  const nav = [
    ['Home', '/'],
    ['Daily Issue', date ? `/daily/${date}` : '/daily'],
    ['Boards', '/boards'],
    ['Sectors', '/sectors'],
    ['Stocks', '/stocks'],
    ['Archive', '/daily'],
    ['Learn', '/learn'],
  ];
  return (
    <>
      <a className="skip-link" href="#content-main">Skip to content</a>
      <header className="mta-header clean-header">
        <button className="mta-brand" onClick={() => go('/')} aria-label="Go home">
          <img src="/mta-logo.png" alt="Nepse Master Trade & Analysis logo" />
          <span><strong>Nepse_Master_Trade & Analysis</strong><small>NEPSE order-flow stories, market intelligence & content</small></span>
        </button>
        <button className="mta-menu" onClick={() => setOpen(!open)} aria-label="Toggle navigation" aria-expanded={open}>☰</button>
        <nav className={open ? 'mta-nav open' : 'mta-nav'} aria-label="Main navigation">
          {nav.map(([label, href]) => <button key={label} className={navClass(path, href)} onClick={() => go(href)}>{label}</button>)}
        </nav>
        <div className="mta-header-actions">
          <button className="mta-search" aria-label="Search">⌕</button>
          <button className="mta-cta" onClick={() => go(date ? `/daily/${date}` : '/daily')}>Explore Insights <span>→</span></button>
        </div>
      </header>
    </>
  );
}
