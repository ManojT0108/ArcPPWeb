import React, { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';
import GlassCard from './GlassCard';

function makeGlassTheme(mode = 'light') {
  const isDark =
    mode === 'auto'
      ? (typeof window !== 'undefined' &&
          window.matchMedia?.('(prefers-color-scheme: dark)').matches) || false
      : mode === 'dark';

  const fg = isDark ? '#e5e7eb' : '#0b1b3a';
  const tick = isDark ? '#cbd5e1' : '#3b4a6b';
  const grid = isDark ? 'rgba(148,163,184,0.15)' : 'rgba(51,65,85,0.12)';
  const gridY = isDark ? 'rgba(148,163,184,0.08)' : 'rgba(51,65,85,0.08)';
  const axisLine = isDark ? 'rgba(148,163,184,0.25)' : 'rgba(51,65,85,0.25)';

  return {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, ui-sans-serif, system-ui', color: fg },
    margin: { l: 140, r: 20, t: 36, b: 40 },
    xaxis: {
      automargin: true,
      tickfont: { size: 12, color: tick },
      gridcolor: grid,
      zeroline: false,
      linecolor: axisLine,
      tickmode: 'auto',
      tickformat: 'd',
    },
    yaxis: {
      automargin: true,
      tickfont: { size: 12, color: tick },
      gridcolor: gridY,
      zeroline: false,
      linecolor: axisLine,
    },
    legend: { bgcolor: 'rgba(0,0,0,0)', borderwidth: 0, font: { color: tick } },
    hovermode: 'closest',
  };
}

const PeptideCoveragePlot = forwardRef(({
  hvoId,
  title = 'Peptides - Sites - Modifications',
  mode = 'auto',
  zoomToPosition = null,
}, ref) => {
  const [spec, setSpec] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const plotRef = useRef(null);
  const sequenceLength = useRef(null);

  const handleResetZoom = useCallback(() => {
    if (!plotRef.current?.el || !window.Plotly || !sequenceLength.current) return;
    window.Plotly.relayout(plotRef.current.el, {
      'xaxis.autorange': true,
    });
  }, []);

  async function load() {
    setErr('');
    setLoading(true);
    try {
      const res = await axios.get(`/api/plot/peptide-coverage/${hvoId}`);
      const payload = res.data || {};
      if (payload?.data?.length) {
        const seqLen =
          payload.layout?.xaxis?.range?.[1] ||
          payload.layout?.xaxis?.tickvals?.length ||
          1000;
        sequenceLength.current = seqLen;

        if (payload.layout?.xaxis) {
          payload.layout.xaxis.range = [1, seqLen];
          payload.layout.xaxis.fixedrange = false;
        }

        setSpec(payload);
      } else {
        setErr('No plot data returned for this protein ID.');
      }
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to load plot data.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (hvoId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hvoId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;
      if (e.key === 'Home') {
        e.preventDefault();
        handleResetZoom();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleResetZoom]);

  useEffect(() => {
    if (zoomToPosition && plotRef.current && spec && sequenceLength.current) {
      const windowSize = 40;
      const maxPos = sequenceLength.current;
      const start = Math.max(1, zoomToPosition - windowSize / 2);
      const end = Math.min(maxPos, zoomToPosition + windowSize / 2);
      setTimeout(() => {
        if (plotRef.current?.el && window.Plotly) {
          window.Plotly.relayout(plotRef.current.el, { 'xaxis.range': [start, end] });
        }
      }, 100);
    }
  }, [zoomToPosition, spec]);

  useImperativeHandle(ref, () => ({
    zoomToRange: (start, end) => {
      if (plotRef.current?.el && window.Plotly && sequenceLength.current) {
        window.Plotly.relayout(plotRef.current.el, {
          'xaxis.range': [Math.max(1, start), Math.min(sequenceLength.current, end)],
        });
      }
    },
    resetZoom: handleResetZoom,
  }));

  const glass = useMemo(() => makeGlassTheme(mode), [mode]);

  // Memoize layout so parent re-renders (e.g. from zoomToPosition changes)
  // don't cause Plotly to re-apply layout and reset axis ticks.
  // Strip tickvals/ticktext/tickmode from API xaxis so numeric auto-ticks always work.
  const layout = useMemo(() => {
    if (!spec) return null;
    const specXaxis = spec.layout?.xaxis || {};
    const { tickvals, ticktext, tickmode: _tm, ...xaxisRest } = specXaxis;

    return {
      ...glass,
      ...(spec.layout || {}),
      margin: { ...glass.margin, ...(spec.layout?.margin || {}) },
      xaxis: {
        ...glass.xaxis,
        ...xaxisRest,
        type: 'linear',
        tickmode: 'auto',
        tickformat: 'd',
        showticklabels: true,
      },
      yaxis: { ...glass.yaxis, ...(spec.layout?.yaxis || {}) },
      dragmode: 'pan',
    };
  }, [spec, glass]);

  const config = {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    doubleClick: 'autosize',
    modeBarButtonsToAdd: ['pan2d'],
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
  };

  const glassVariant = mode === 'dark' ? 'dark' : 'light';

  if (err) {
    return (
      <GlassCard title={title} variant={glassVariant}>
        <div style={{ color: mode === 'dark' ? '#fecaca' : '#b91c1c', marginBottom: 12 }}>{err}</div>
        <button
          onClick={load}
          style={{
            padding: '8px 12px', borderRadius: 8,
            background: mode === 'dark' ? '#0f172a' : '#001833',
            color: 'white', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </GlassCard>
    );
  }

  if (loading || !spec) {
    return (
      <GlassCard title={title} variant={glassVariant}>
        <div style={{ color: mode === 'dark' ? '#cbd5e1' : '#3b4a6b' }}>Loading peptide coverage...</div>
      </GlassCard>
    );
  }

  return (
    <GlassCard title={title} variant={glassVariant}>
      <Plot
        ref={plotRef}
        data={spec.data}
        layout={layout}
        config={config}
        style={{ width: '100%', height: 400, borderRadius: 14 }}
        useResizeHandler
        onRelayout={(ev) => {
          if (!plotRef.current?.el || !window.Plotly || !sequenceLength.current) return;
          const maxPos = sequenceLength.current;
          const x0 = ev['xaxis.range[0]'];
          const x1 = ev['xaxis.range[1]'];
          if (typeof x0 !== 'number' || typeof x1 !== 'number') return;
          if (x0 < 0 || x1 > maxPos) {
            window.Plotly.relayout(plotRef.current.el, {
              'xaxis.range': [Math.max(0, x0), Math.min(maxPos, x1)],
            });
          }
        }}
      />
    </GlassCard>
  );
});

PeptideCoveragePlot.displayName = 'PeptideCoveragePlot';
export default PeptideCoveragePlot;
