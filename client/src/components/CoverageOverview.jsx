import React from 'react';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

export default function CoverageOverview({ coverageData, coverageLoading }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28 }}>
      <div style={{
        background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
        borderRadius: 24,
        padding: '48px 64px',
        boxShadow: '0 8px 32px rgba(14, 165, 233, 0.15)',
        border: '2px solid #bae6fd',
        display: 'flex',
        alignItems: 'center',
        gap: 48,
        transition: 'all 0.3s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 48px rgba(14, 165, 233, 0.25)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(14, 165, 233, 0.15)';
      }}>
        {coverageLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#0284c7', fontSize: 16, fontWeight: 500 }}>
            Loading coverage data...
          </div>
        ) : coverageData.length > 0 && coverageData[0] ? (
          <>
            <div style={{ width: 200, height: 200 }}>
              <CircularProgressbar
                value={coverageData[0].coveragePercent || 0}
                text={`${(coverageData[0].coveragePercent || 0).toFixed(1)}%`}
                styles={buildStyles({
                  textSize: '20px',
                  pathColor: '#0ea5e9',
                  textColor: '#0c4a6e',
                  trailColor: '#bae6fd',
                  pathTransitionDuration: 1.5,
                  strokeLinecap: 'round'
                })}
                strokeWidth={8}
              />
            </div>

            <div style={{ maxWidth: 320 }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                borderRadius: 20,
                marginBottom: 16,
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)'
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'white',
                  animation: 'pulse 2s ease-in-out infinite'
                }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  Species Available: 1
                </span>
              </div>

              <h3 style={{
                fontSize: 28,
                fontWeight: 700,
                color: '#0c4a6e',
                margin: 0,
                marginBottom: 8,
                letterSpacing: '-0.01em'
              }}>
                Haloferax volcanii
              </h3>

              <p style={{
                fontSize: 15,
                color: '#0369a1',
                margin: 0,
                lineHeight: 1.6,
                fontWeight: 500
              }}>
                Proteome sequencing coverage represents the percentage of the complete protein set that has been successfully identified and characterized.
              </p>
            </div>
          </>
        ) : (
          <div style={{ padding: 40, color: '#94a3b8', textAlign: 'center' }}>
            No coverage data available
          </div>
        )}
      </div>
    </div>
  );
}
