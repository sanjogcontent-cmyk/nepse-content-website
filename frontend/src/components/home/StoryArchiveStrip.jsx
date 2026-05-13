import React from 'react';
import { setRoute } from './homeUtils.js';

export default function StoryArchiveStrip({ issue }) {
  const date = issue?.business_date || '';
  const cards = [
    ['Daily Issue', 'Read the full market, sector and stock story.', date ? `/daily/${date}` : '/daily'],
    ['Sector Stories', 'Browse sector-level flow and leadership.', '/sectors'],
    ['Stock Archive', 'Open stock pages and proof candidates.', '/stocks'],
    ['Video Candidates', 'Find stories ready for replay proof.', '/videos'],
  ];
  return <section className="story-archive-strip editorial-section" id="archive-strip">
    <div className="section-title-row compact">
      <div>
        <p className="editorial-kicker">E. Story Archive</p>
        <h2>Keep the front page clean, keep the research accessible</h2>
      </div>
    </div>
    <div className="archive-strip-grid">
      {cards.map(([title, body, path]) => <button key={title} onClick={() => setRoute(path)}>
        <strong>{title}</strong>
        <span>{body}</span>
        <em>Open →</em>
      </button>)}
    </div>
  </section>;
}
