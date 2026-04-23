import React from 'react';
import { useTheme } from '../ThemeContext';

export default function CoverageOverview({ coverageLoading, selectedSpecies }) {
  const { isDark } = useTheme();

  const bg     = isDark ? 'rgba(15,25,40,0.8)' : '#ffffff';
  const border = isDark ? '1px solid rgba(157,196,224,0.14)' : '1px solid #dce5ec';
  const shadow = isDark ? '0 8px 20px rgba(3,9,16,0.32)' : '0 8px 20px rgba(17,39,58,0.07)';

  const baseCard = {
    borderRadius: 14,
    padding: '22px 28px',
    background: bg,
    border,
    boxShadow: shadow,
    marginBottom: 28,
  };

  if (coverageLoading) {
    return (
      <div style={{ ...baseCard, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ height: 10, width: 110, borderRadius: 6, background: isDark ? '#1e304a' : '#dde6ee', marginBottom: 12 }} />
          <div style={{ height: 22, width: 220, borderRadius: 6, background: isDark ? '#1e304a' : '#dde6ee' }} />
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ height: 10, width: 120, borderRadius: 6, background: isDark ? '#1e304a' : '#dde6ee', marginBottom: 12, marginLeft: 'auto' }} />
          <div style={{ height: 40, width: 100, borderRadius: 6, background: isDark ? '#1e304a' : '#dde6ee', marginLeft: 'auto', marginBottom: 12 }} />
          <div style={{ height: 6, width: 200, borderRadius: 6, background: isDark ? '#1e304a' : '#dde6ee', marginLeft: 'auto' }} />
        </div>
      </div>
    );
  }

  if (!selectedSpecies) {
    return (
      <div style={{ ...baseCard, color: isDark ? '#6b8ba4' : '#9aacb8', fontSize: 14 }}>
        Select a species to view its coverage.
      </div>
    );
  }

  const pct       = selectedSpecies.coveragePercent || 0;
  const covered   = (selectedSpecies.coveredLength  || 0).toLocaleString();
  const total     = (selectedSpecies.totalLength    || 0).toLocaleString();
  const labelColor = isDark ? '#6b8ba4' : '#8a9fb0';
  const nameColor  = isDark ? '#e2e8f0' : '#132334';
  const subColor   = isDark ? '#8ea4ba' : '#8a9fb0';
  const trackBg   = isDark ? 'rgba(95,136,173,0.15)' : '#deeaf3';

  return (
    <div style={{
      ...baseCard,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 32,
    }}>
      {/* Left: species name */}
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: labelColor,
          marginBottom: 8,
        }}>
          Selected Species
        </div>
        <div style={{
          fontSize: 22,
          fontWeight: 700,
          color: nameColor,
          fontFamily: 'Newsreader, Georgia, serif',
          lineHeight: 1.2,
        }}>
          {selectedSpecies.species}
        </div>
      </div>

      {/* Right: coverage % + bar */}
      <div style={{ flexShrink: 0, textAlign: 'right', minWidth: 220 }}>
        <div style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: labelColor,
          marginBottom: 6,
        }}>
          Proteome Coverage
        </div>

        <div style={{
          fontSize: 42,
          fontWeight: 700,
          lineHeight: 1,
          color: '#5f88ad',
          marginBottom: 10,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {pct.toFixed(1)}
          <span style={{ fontSize: 22, fontWeight: 600, color: isDark ? '#4a6f8a' : '#7aadc8', marginLeft: 2 }}>%</span>
        </div>

        {/* Progress track */}
        <div style={{
          height: 6,
          borderRadius: 99,
          background: trackBg,
          overflow: 'hidden',
          marginBottom: 8,
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(pct, 100)}%`,
            borderRadius: 99,
            background: 'linear-gradient(90deg, #4a7fa8, #7ab2d4)',
            transition: 'width 0.8s ease',
          }} />
        </div>

        <div style={{ fontSize: 12, color: subColor }}>
          {covered} <span style={{ color: isDark ? '#4a6f8a' : '#9bb8cc' }}>/ {total} AA</span>
        </div>
      </div>
    </div>
  );
}
