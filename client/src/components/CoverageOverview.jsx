import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useTheme } from '../ThemeContext';

export default function CoverageOverview({ coverageData, coverageLoading }) {
  const { isDark } = useTheme();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
      <div style={{
        background: isDark ? 'rgba(15,23,42,0.6)' : '#f8fafc',
        borderRadius: 14,
        padding: '24px 36px',
        boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
        border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        gap: 32,
      }}>
        {coverageLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 150, color: isDark ? '#94a3b8' : '#64748b', fontSize: 15 }}>
            Loading coverage data...
          </div>
        ) : coverageData.length > 0 && coverageData[0] ? (
          <>
            <div style={{ width: 130, height: 130 }}>
              <CircularProgressbar
                value={coverageData[0].coveragePercent || 0}
                text={`${(coverageData[0].coveragePercent || 0).toFixed(1)}%`}
                styles={buildStyles({
                  textSize: '20px',
                  pathColor: '#3b82f6',
                  textColor: isDark ? '#e2e8f0' : '#1e293b',
                  trailColor: isDark ? 'rgba(59,130,246,0.12)' : '#e2e8f0',
                  pathTransitionDuration: 1,
                  strokeLinecap: 'round',
                })}
                strokeWidth={8}
              />
            </div>

            <div style={{ maxWidth: 320 }}>
              <div style={{
                display: 'inline-block',
                padding: '4px 10px',
                background: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff',
                borderRadius: 6,
                marginBottom: 12,
                border: isDark ? '1px solid rgba(59,130,246,0.25)' : '1px solid #bfdbfe',
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#93c5fd' : '#2563eb', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  1 Species Available
                </span>
              </div>

              <h3 style={{
                fontSize: 22,
                fontWeight: 600,
                color: isDark ? '#e2e8f0' : '#1e293b',
                margin: 0,
                marginBottom: 6,
              }}>
                Haloferax volcanii
              </h3>

              <p style={{
                fontSize: 14,
                color: isDark ? '#94a3b8' : '#64748b',
                margin: 0,
                lineHeight: 1.6,
              }}>
                Proteome coverage: percentage of the complete protein set identified and characterized.
              </p>
            </div>
          </>
        ) : (
          <div style={{ padding: 40, color: isDark ? '#64748b' : '#94a3b8', textAlign: 'center' }}>
            No coverage data available
          </div>
        )}
      </div>
    </div>
  );
}
