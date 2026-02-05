// src/components/ProteinCoverageChart.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Gauge } from '@mui/x-charts/Gauge';

/* ----- Responsive width via ResizeObserver ----- */
function useContainerSize(min = 160, max = 300) {
  const ref = useRef(null);
  const [size, setSize] = useState(220);
  useEffect(() => {
    const node = ref.current;
    if (!node || !('ResizeObserver' in window)) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = entry.contentRect.width;
      setSize(Math.max(min, Math.min(max, Math.floor(w))));
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, [min, max]);
  return { ref, size };
}

export default function ProteinCoverageChart({ hvoId, title = 'Sequences identified', variant = 'light' }) {
  const [coverage, setCoverage] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { ref, size } = useContainerSize(160, 300);

  useEffect(() => {
    if (!hvoId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch(`/api/coverage/${hvoId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to fetch coverage');

        const { total_length, identified_length, protein_id } = data || {};
        const pct =
          Number(total_length) > 0
            ? (Number(identified_length) / Number(total_length)) * 100
            : 0;

        if (!cancelled) setCoverage({ protein_id: protein_id || hvoId, percent: pct });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Unable to fetch coverage.');
        console.error('Error fetching coverage data:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hvoId]);

  // pick glass gradient
  const glassBg =
    variant === 'dark'
      ? 'linear-gradient(180deg, rgba(32,46,74,.55), rgba(17,24,39,.55))'
      : 'linear-gradient(180deg, rgba(255,255,255,.66), rgba(240,245,255,.55))';

  return (
    <div
      className="glass-card"
      style={{
        borderRadius: 18,
        padding: '16px 18px',
        background: glassBg,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 10px 30px rgba(0,0,0,.35)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        maxWidth: 420,
        margin: '0 auto',
      }}
    >
      {title ? (
        <div
          className="glass-title"
          style={{
            fontWeight: 600,
            color: variant === 'dark' ? '#e5e7eb' : '#001833',
            margin: '4px 6px 12px 6px',
          }}
        >
          {title}
        </div>
      ) : null}

      {error && (
        <div style={{ color: variant === 'dark' ? '#fecaca' : '#b91c1c', marginBottom: 8 }}>
          {error}
        </div>
      )}

      {!coverage || loading ? (
        <div style={{ color: variant === 'dark' ? '#cbd5e1' : '#3b4a6b' }}>Loading…</div>
      ) : (
        <div ref={ref} style={{ display: 'grid', placeItems: 'center' }}>
          <Gauge
            width={size}
            height={size}
            value={coverage.percent}
            startAngle={-110}
            endAngle={110}
            valueMin={0}
            valueMax={100}
            sx={{
              '.MuiChartsLegend-root': { display: 'none' },
              '.MuiGauge-valueText': {
                fill: variant === 'dark' ? '#e5e7eb' : '#0b1b3a',
                fontWeight: 700,
                fontSize: size > 220 ? '18px' : '16px',
              },
              /* KEEP your palette here */
              '.MuiGauge-valueArc': { fill: '#5b8eff' },
              '.MuiGauge-referenceArc': { fill: 'rgba(148,163,184,.35)' },
            }}
            text={({ value }) => `${value.toFixed(1)}%`}
          />
          <div style={{ marginTop: 10, textAlign: 'center', color: variant === 'dark' ? '#e5e7eb' : '#001833' }}>
            {coverage.protein_id}
          </div>
        </div>
      )}
    </div>
  );
}
