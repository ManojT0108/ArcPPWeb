import React from 'react';
import { useTheme } from '../ThemeContext';

export default function CoverageOverview({ coverageLoading, selectedSpecies, coverageData = [] }) {
  const { isDark } = useTheme();

  const bg     = isDark ? 'rgba(15,25,40,0.8)' : '#ffffff';
  const border = isDark ? '1px solid rgba(157,196,224,0.14)' : '1px solid #dce5ec';
  const shadow = isDark ? '0 8px 20px rgba(3,9,16,0.32)' : '0 8px 20px rgba(17,39,58,0.07)';

  const labelColor = isDark ? '#6b8ba4' : '#8a9fb0';
  const nameColor  = isDark ? '#e2e8f0' : '#132334';
  const subColor   = isDark ? '#8ea4ba' : '#8a9fb0';
  const trackColor = isDark ? 'rgba(95,136,173,0.18)' : '#deeaf3';
  const ringColor  = '#5f88ad';

  const baseCard = {
    borderRadius: 14,
    padding: '26px 32px',
    background: bg,
    border,
    boxShadow: shadow,
    marginBottom: 28,
  };

  if (coverageLoading) {
    return (
      <div style={{ ...baseCard, display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{ width: 132, height: 132, borderRadius: '50%', background: isDark ? '#1e304a' : '#dde6ee' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 10, width: 110, borderRadius: 6, background: isDark ? '#1e304a' : '#dde6ee', marginBottom: 12 }} />
          <div style={{ height: 22, width: 220, borderRadius: 6, background: isDark ? '#1e304a' : '#dde6ee', marginBottom: 10 }} />
          <div style={{ height: 14, width: 180, borderRadius: 6, background: isDark ? '#1e304a' : '#dde6ee' }} />
        </div>
      </div>
    );
  }

  const isAggregate = !selectedSpecies;

  let displayLabel, displayName, displayPct, displayCovered, displayTotal, displayExtra;
  if (isAggregate) {
    const totalCovered  = coverageData.reduce((s, d) => s + (d.coveredLength    || 0), 0);
    const totalLen      = coverageData.reduce((s, d) => s + (d.totalLength      || 0), 0);
    const totalProteins = coverageData.reduce((s, d) => s + (d.observedProteins || 0), 0);
    displayLabel    = 'All Species';
    displayName     = coverageData.length > 0 ? `${coverageData.length} archaeal species` : 'No data';
    displayPct      = totalLen > 0 ? (totalCovered / totalLen) * 100 : 0;
    displayCovered  = totalCovered;
    displayTotal    = totalLen;
    displayExtra    = `${totalProteins.toLocaleString()} proteins identified`;
  } else {
    displayLabel    = 'Selected Species';
    displayName     = selectedSpecies.species;
    displayPct      = selectedSpecies.coveragePercent || 0;
    displayCovered  = selectedSpecies.coveredLength   || 0;
    displayTotal    = selectedSpecies.totalLength     || 0;
    displayExtra    = `${(selectedSpecies.observedProteins || 0).toLocaleString()} proteins identified`;
  }

  const size = 132;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pctClamped = Math.min(Math.max(displayPct, 0), 100);
  const dashOffset = c * (1 - pctClamped / 100);

  return (
    <div style={{
      ...baseCard,
      display: 'flex',
      alignItems: 'center',
      gap: 28,
      flexWrap: 'wrap',
    }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={trackColor} strokeWidth={stroke}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={ringColor} strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease' }}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontSize: 28, fontWeight: 700, color: ringColor,
            lineHeight: 1, fontVariantNumeric: 'tabular-nums',
            fontFamily: 'Newsreader, Georgia, serif',
          }}>
            {displayPct.toFixed(1)}<span style={{ fontSize: 16 }}>%</span>
          </div>
          <div style={{
            fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.1em', color: labelColor, marginTop: 4,
          }}>
            Coverage
          </div>
        </div>
      </div>

      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          color: labelColor, marginBottom: 6,
        }}>
          {displayLabel}
        </div>
        <div style={{
          fontSize: 22, fontWeight: 700,
          color: nameColor,
          fontFamily: 'Newsreader, Georgia, serif',
          lineHeight: 1.2,
          marginBottom: 12,
          fontStyle: isAggregate ? 'normal' : 'italic',
        }}>
          {displayName}
        </div>
        <div style={{ fontSize: 13, color: subColor, marginBottom: 4 }}>
          {displayCovered.toLocaleString()} <span style={{ color: isDark ? '#4a6f8a' : '#9bb8cc' }}>/ {displayTotal.toLocaleString()} AA covered</span>
        </div>
        <div style={{ fontSize: 13, color: subColor }}>
          {displayExtra}
        </div>
      </div>
    </div>
  );
}
