import React, { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import Plot from 'react-plotly.js';
import axios from 'axios';
import GlassCard from './GlassCard';

/* Glass theme for plot */
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
    dragmode: 'zoom',
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
  const [axisOverrides, setAxisOverrides] = useState({});
  const [currentZoom, setCurrentZoom] = useState({ start: null, end: null, level: 1 });
  const [sliderPosition, setSliderPosition] = useState(null);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const plotRef = useRef(null);
  const sequenceLength = useRef(null);
  const sliderUpdateTimeoutRef = useRef(null);

  const LETTER_THRESHOLD = 60;

  const handleSliderChange = (e) => {
    const newPosition = parseInt(e.target.value, 10);
    setSliderPosition(newPosition);
    setIsDraggingSlider(true);

    if (sliderUpdateTimeoutRef.current) {
      clearTimeout(sliderUpdateTimeoutRef.current);
    }

    sliderUpdateTimeoutRef.current = setTimeout(() => {
      jumpToPosition(newPosition);
      setIsDraggingSlider(false);
    }, 30);
  };

  const jumpToPosition = (position) => {
    if (!plotRef.current?.el || !window.Plotly || !spec || !sequenceLength.current) return;

    const maxPos = sequenceLength.current;
    const layout = plotRef.current.el.layout;
    let currentStart = layout.xaxis?.range?.[0];
    let currentEnd = layout.xaxis?.range?.[1];

    if (currentStart === undefined || currentEnd === undefined) {
      if (currentZoom.start !== null && currentZoom.end !== null) {
        currentStart = currentZoom.start;
        currentEnd = currentZoom.end;
      } else {
        currentStart = 1;
        currentEnd = maxPos;
      }
    }

    const currentSpan = currentEnd - currentStart;

    let newStart = position - currentSpan / 2;
    let newEnd = position + currentSpan / 2;

    if (newStart < 1) {
      newStart = 1;
      newEnd = Math.min(maxPos, 1 + currentSpan);
    } else if (newEnd > maxPos) {
      newEnd = maxPos;
      newStart = Math.max(1, maxPos - currentSpan);
    }

    window.Plotly.relayout(plotRef.current.el, {
      'xaxis.range': [newStart, newEnd]
    });
  };

  const handleResetZoom = useCallback(() => {
    if (!plotRef.current?.el || !window.Plotly || !spec || !sequenceLength.current) return;

    window.Plotly.relayout(plotRef.current.el, {
      'xaxis.range': [1, sequenceLength.current]
    });
  }, [spec]);

  async function load() {
    setErr('');
    setLoading(true);
    try {
      const res = await axios.get(`/api/plot/peptide-coverage/${hvoId}`);
      const payload = res.data || {};
      if (payload?.data?.length) {
        const seqLen = payload.layout?.xaxis?.range?.[1] ||
                       payload.layout?.xaxis?.tickvals?.length ||
                       1000;
        sequenceLength.current = seqLen;

        if (payload.layout?.xaxis) {
          payload.layout.xaxis.range = [1, seqLen];
          payload.layout.xaxis.fixedrange = false;
        }

        setSpec(payload);
        setAxisOverrides({
          xaxis: { tickmode: 'auto', tickformat: 'd', tickvals: null, ticktext: null, dtick: null },
        });

        setCurrentZoom({ start: 1, end: seqLen, level: 1 });
        setSliderPosition(Math.round(seqLen / 2));
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

    return () => {
      if (sliderUpdateTimeoutRef.current) {
        clearTimeout(sliderUpdateTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hvoId]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement.tagName === 'INPUT') return;

      switch(e.key) {
        case 'Home':
          e.preventDefault();
          handleResetZoom();
          break;
        default:
          break;
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
          window.Plotly.relayout(plotRef.current.el, {
            'xaxis.range': [start, end]
          });
        }
      }, 100);
    }
  }, [zoomToPosition, spec]);

  useImperativeHandle(ref, () => ({
    zoomToRange: (start, end) => {
      if (plotRef.current?.el && window.Plotly && sequenceLength.current) {
        const maxPos = sequenceLength.current;
        const constrainedStart = Math.max(1, start);
        const constrainedEnd = Math.min(maxPos, end);

        window.Plotly.relayout(plotRef.current.el, {
          'xaxis.range': [constrainedStart, constrainedEnd]
        });
      }
    },
    resetZoom: () => {
      handleResetZoom();
    }
  }));

  const glass = useMemo(() => makeGlassTheme(mode), [mode]);

  const config = {
    responsive: true,
    displaylogo: false,
    scrollZoom: true,
    doubleClick: 'reset',
    modeBarButtonsToAdd: ['pan2d'],
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
  };

  const fullTickVals = spec?.layout?.xaxis?.tickvals;
  const fullTickText = spec?.layout?.xaxis?.ticktext;
  const hasLetters = Array.isArray(fullTickVals) && Array.isArray(fullTickText);

  function handleRelayout(ev) {
    if (!sequenceLength.current) return;

    const x0 = ev['xaxis.range[0]'];
    const x1 = ev['xaxis.range[1]'];

    if (ev['xaxis.autorange'] === true) {
      const maxPos = sequenceLength.current;
      setCurrentZoom({ start: 1, end: maxPos, level: 1 });
      setSliderPosition(Math.round(maxPos / 2));

      setAxisOverrides({
        xaxis: { tickmode: 'auto', tickformat: 'd', tickvals: null, ticktext: null, dtick: null },
      });
      return;
    }

    if (typeof x0 !== 'number' || typeof x1 !== 'number') return;

    const maxPos = sequenceLength.current;

    let constrainedX0 = Math.max(1, x0);
    let constrainedX1 = Math.min(maxPos, x1);

    if (constrainedX0 !== x0 || constrainedX1 !== x1) {
      setTimeout(() => {
        if (plotRef.current?.el && window.Plotly) {
          window.Plotly.relayout(plotRef.current.el, {
            'xaxis.range': [constrainedX0, constrainedX1]
          });
        }
      }, 0);
      return;
    }

    const span = constrainedX1 - constrainedX0;
    const maxSpan = maxPos - 1;
    const zoomLevel = maxSpan / span;
    const center = Math.round((constrainedX0 + constrainedX1) / 2);
    setCurrentZoom({ start: constrainedX0, end: constrainedX1, level: zoomLevel });

    if (!isDraggingSlider) {
      setSliderPosition(center);
    }

    if (hasLetters && span <= LETTER_THRESHOLD) {
      const start = Math.max(1, Math.floor(constrainedX0));
      const end = Math.min(fullTickVals[fullTickVals.length - 1], Math.ceil(constrainedX1));
      const tickvals = [];
      const ticktext = [];
      for (let pos = start; pos <= end; pos++) {
        tickvals.push(pos);
        ticktext.push(fullTickText[pos - 1] ?? String(pos));
      }
      setAxisOverrides({
        xaxis: { tickmode: 'array', tickvals, ticktext, dtick: 1 },
      });
    } else {
      setAxisOverrides({
        xaxis: { tickmode: 'auto', tickformat: 'd', tickvals: null, ticktext: null, dtick: null },
      });
    }
  }

  const glassVariant = mode === 'dark' ? 'dark' : 'light';

  if (err) {
    return (
      <GlassCard title={title} variant={glassVariant}>
        <div style={{ color: mode === 'dark' ? '#fecaca' : '#b91c1c', marginBottom: 12 }}>{err}</div>
        <button
          onClick={load}
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: mode === 'dark' ? '#0f172a' : '#001833',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.12)',
            cursor: 'pointer',
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

  const layout = {
    ...glass,
    ...(spec.layout || {}),
    margin: { ...glass.margin, ...(spec.layout?.margin || {}) },
    xaxis: {
      ...glass.xaxis,
      ...(spec.layout?.xaxis || {}),
      ...(axisOverrides.xaxis || {}),
      range: spec.layout?.xaxis?.range || [1, sequenceLength.current],
    },
    yaxis: { ...glass.yaxis, ...(spec.layout?.yaxis || {}) },
    dragmode: 'pan',
  };

  return (
    <GlassCard title={title} variant={glassVariant}>

      {/* Range Slider */}
      {spec && sequenceLength.current && (
        <div style={{
          marginBottom: 12,
          padding: '12px 16px',
          background: mode === 'dark' ? 'rgba(15,23,42,0.6)' : 'rgba(241,245,249,0.6)',
          borderRadius: 8,
          border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 150,
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                color: mode === 'dark' ? '#94a3b8' : '#64748b',
              }}>
                Jump to:
              </div>
              <button
                onClick={handleResetZoom}
                disabled={!spec}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: mode === 'dark' ? '#1e293b' : '#ffffff',
                  color: mode === 'dark' ? '#e2e8f0' : '#1e293b',
                  border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
                  cursor: spec ? 'pointer' : 'not-allowed',
                  fontSize: 11,
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  opacity: spec ? 1 : 0.5,
                }}
                onMouseEnter={(e) => { if (spec) e.target.style.background = mode === 'dark' ? '#334155' : '#f1f5f9'; }}
                onMouseLeave={(e) => { e.target.style.background = mode === 'dark' ? '#1e293b' : '#ffffff'; }}
                title="Reset to full view"
              >
                Reset
              </button>
            </div>

            <div style={{
              fontSize: 11,
              color: mode === 'dark' ? '#64748b' : '#94a3b8',
              fontWeight: 500,
            }}>
              1
            </div>

            <input
              type="range"
              min="1"
              max={sequenceLength.current}
              value={sliderPosition || Math.round((currentZoom.start + currentZoom.end) / 2) || 1}
              onChange={handleSliderChange}
              disabled={!spec}
              style={{
                flex: 1,
                height: 6,
                borderRadius: 3,
                outline: 'none',
                background: mode === 'dark'
                  ? 'linear-gradient(to right, #3b82f6 0%, #3b82f6 ' +
                    ((sliderPosition || 1) / sequenceLength.current * 100) +
                    '%, #334155 ' +
                    ((sliderPosition || 1) / sequenceLength.current * 100) +
                    '%, #334155 100%)'
                  : 'linear-gradient(to right, #3b82f6 0%, #3b82f6 ' +
                    ((sliderPosition || 1) / sequenceLength.current * 100) +
                    '%, #cbd5e1 ' +
                    ((sliderPosition || 1) / sequenceLength.current * 100) +
                    '%, #cbd5e1 100%)',
                WebkitAppearance: 'none',
                cursor: spec ? 'pointer' : 'not-allowed',
              }}
            />

            <div style={{
              fontSize: 11,
              color: mode === 'dark' ? '#64748b' : '#94a3b8',
              fontWeight: 500,
            }}>
              {sequenceLength.current}
            </div>

            <div style={{
              fontSize: 13,
              fontWeight: 600,
              color: mode === 'dark' ? '#3b82f6' : '#2563eb',
              minWidth: 60,
              textAlign: 'right',
            }}>
              Pos: {sliderPosition || Math.round((currentZoom.start + currentZoom.end) / 2) || 1}
            </div>
          </div>

          <div style={{
            marginTop: 8,
            fontSize: 11,
            color: mode === 'dark' ? '#64748b' : '#94a3b8',
            textAlign: 'center',
          }}>
            {currentZoom.start !== null && sequenceLength.current ? (
              <span>
                Viewing: {Math.round(currentZoom.start)} - {Math.round(currentZoom.end)}
                {' '}- Zoom: {currentZoom.level.toFixed(1)}x
              </span>
            ) : (
              spec && sequenceLength.current && <span>Full View (1-{sequenceLength.current})</span>
            )}
          </div>
        </div>
      )}

      <Plot
        ref={plotRef}
        data={spec.data}
        layout={layout}
        config={config}
        style={{ width: '100%', height: 520, borderRadius: 14 }}
        useResizeHandler
        onRelayout={handleRelayout}
      />
    </GlassCard>
  );
});

PeptideCoveragePlot.displayName = 'PeptideCoveragePlot';

// Add CSS for range slider styling
const style = document.createElement('style');
style.textContent = `
  input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    border: 2px solid #ffffff;
  }

  input[type="range"]::-webkit-slider-thumb:hover {
    background: #2563eb;
    transform: scale(1.1);
  }

  input[type="range"]::-webkit-slider-thumb:active {
    background: #1d4ed8;
    transform: scale(1.15);
  }

  input[type="range"]::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #3b82f6;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    border: 2px solid #ffffff;
  }

  input[type="range"]::-moz-range-thumb:hover {
    background: #2563eb;
    transform: scale(1.1);
  }

  input[type="range"]::-moz-range-thumb:active {
    background: #1d4ed8;
    transform: scale(1.15);
  }

  input[type="range"]:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
if (!document.head.querySelector('[data-component="peptide-coverage-plot-slider"]')) {
  style.setAttribute('data-component', 'peptide-coverage-plot-slider');
  document.head.appendChild(style);
}

export default PeptideCoveragePlot;
