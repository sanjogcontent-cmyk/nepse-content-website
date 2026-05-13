import React from 'react';
import MarketBoards from '../components/MarketBoards.jsx';

export default function MarketBoardsPage({ issue }) {
  return <MarketBoards issue={issue} mode="full" />;
}
