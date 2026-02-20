import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { useTheme } from '../ThemeContext';

export default function CoverageOverview({ coverageData, coverageLoading }) {
  const { isDark } = useTheme();

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
      <div style={{
        background: isDark ? 'rgba(15,25,38,0.75)' : '#f7fafc',
        borderRadius: 16,
        padding: '24px 36px',
        boxShadow: isDark ? '0 10px 22px rgba(3,9,16,0.35)' : '0 10px 22px rgba(17,39,58,0.08)',
        border: isDark ? '1px solid rgba(157,196,224,0.14)' : '1px solid #d8e2e8',
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
                  pathColor: '#5f88ad',
                  textColor: isDark ? '#e2e8f0' : '#132334',
                  trailColor: isDark ? 'rgba(95,136,173,0.2)' : '#dce5ec',
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
                background: isDark ? 'rgba(159,195,222,0.12)' : '#ecf3f8',
                borderRadius: 6,
                marginBottom: 12,
                border: isDark ? '1px solid rgba(159,195,222,0.26)' : '1px solid #cfdce6',
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: isDark ? '#c6d8e7' : '#325f86', letterSpacing: '0.3px', textTransform: 'uppercase' }}>
                  1 Species Available
                </span>
              </div>

              <h3 style={{
                fontSize: 24,
                fontWeight: 600,
                color: isDark ? '#e2e8f0' : '#132334',
                margin: 0,
                marginBottom: 6,
              }}>
                Haloferax volcanii
              </h3>

              <p style={{
                fontSize: 14,
                color: isDark ? '#9cb0c4' : '#5f7282',
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
