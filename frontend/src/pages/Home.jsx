import React from 'react';
import TodayMarketStory from '../components/home/TodayMarketStory.jsx';
import SectorFlowMap from '../components/home/SectorFlowMap.jsx';
import MarketBoards from '../components/MarketBoards.jsx';
import FeaturedStockProof from '../components/home/FeaturedStockProof.jsx';
import StoryArchiveStrip from '../components/home/StoryArchiveStrip.jsx';
import SocialExportStudio from '../components/home/SocialExportStudio.jsx';

export default function Home({ issue }) {
  const publicIssue = issue?.public?.issue || issue?.public || issue || {};
  return <main id="content-main" className="editorial-home-page">
    <TodayMarketStory issue={publicIssue} />
    <SectorFlowMap issue={publicIssue} />
    <MarketBoards issue={publicIssue} mode="compact" />
    <FeaturedStockProof issue={publicIssue} />
    <StoryArchiveStrip issue={publicIssue} />
    <SocialExportStudio issue={publicIssue} />
  </main>;
}
