import React from 'react';
import { cssToneClass, getSectorPressureLabel, getSectorPressureTone } from './sectorPressureUtils.js';

export default function SectorPressureBadge({ sector }) {
  const tone = getSectorPressureTone(sector || {});
  return <span className={`sector-pressure-badge ${cssToneClass(tone)}`}>{getSectorPressureLabel(sector || {})}</span>;
}
