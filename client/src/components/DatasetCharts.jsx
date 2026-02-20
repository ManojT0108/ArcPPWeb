import React, { useRef, useEffect } from 'react';
import { Button, Chip } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { useTheme } from '../ThemeContext';

export default function DatasetCharts({
  datasetStats,
  datasetOverlap,
  selectedDatasets,
  setSelectedDatasets,
  selectedOverlaps,
  setSelectedOverlaps,
}) {
  const { isDark } = useTheme();
  const chart1Ref = useRef(null);
  const chart2Ref = useRef(null);

  useEffect(() => {
    const color = isDark ? '#c8d6e5' : '#334155';

    const applyToRef = (ref) => {
      if (!ref.current) return null;
      const apply = () => {
        ref.current?.querySelectorAll('text').forEach(el => {
          el.setAttribute('fill', color);
          el.style.fill = color;
        });
      };
      apply();
      const observer = new MutationObserver(apply);
      observer.observe(ref.current, { childList: true, subtree: true });
      return observer;
    };

    const o1 = applyToRef(chart1Ref);
    const o2 = applyToRef(chart2Ref);
    return () => {
      o1?.disconnect();
      o2?.disconnect();
    };
  }, [isDark, datasetStats, datasetOverlap]);

  const cardStyle = {
    background: isDark ? 'rgba(15,23,42,0.6)' : '#ffffff',
    padding: 18,
    borderRadius: 12,
    boxShadow: isDark ? '0 1px 4px rgba(0,0,0,0.2)' : '0 1px 4px rgba(0,0,0,0.06)',
    border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #e2e8f0',
  };

  const headingColor = isDark ? '#e2e8f0' : '#1e293b';
  const mutedColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <>
      <div style={{ height: 1, background: isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0', margin: '24px 0' }} />
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: headingColor, marginBottom: 4 }}>Dataset Analysis</h2>
        <p style={{ fontSize: 13, color: mutedColor, marginBottom: 18 }}>Click bars to filter proteins</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>

          {/* Proteins per Dataset */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: headingColor, margin: 0 }}>Proteins per Dataset</h3>
              {selectedDatasets.length > 0 && (
                <Button size="small" onClick={() => setSelectedDatasets([])} sx={{ textTransform: 'none', fontSize: 11, minWidth: 'auto', padding: '2px 8px' }}>Clear</Button>
              )}
            </div>
            {selectedDatasets.length > 0 && (
              <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedDatasets.map(ds => (
                  <Chip key={ds} label={ds} size="small" onDelete={() => setSelectedDatasets(prev => prev.filter(d => d !== ds))} sx={{ backgroundColor: isDark ? 'rgba(59,130,246,0.15)' : '#eff6ff', color: isDark ? '#93c5fd' : '#2563eb', fontSize: 10, height: 22 }} />
                ))}
              </div>
            )}
            {datasetStats.length === 0 ? (
              <div style={{ padding: 24, color: mutedColor, textAlign: 'center', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 8 }}>No data</div>
            ) : (
              <div ref={chart1Ref}>
                <BarChart
                  xAxis={[{ scaleType: 'band', data: datasetStats.map(d => d.dataset), tickLabelStyle: { angle: -45, textAnchor: 'end', fontSize: 9 }, categoryGapRatio: 0.2, barGapRatio: 0.05 }]}
                  series={[{ data: datasetStats.map(d => d.proteinCount), color: '#3b82f6', highlightScope: { highlighted: 'item', faded: 'global' } }]}
                  height={200}
                  width={380}
                  yAxis={[{ label: 'Proteins' }]}
                  margin={{ bottom: 65, left: 48, right: 8, top: 16 }}
                  borderRadius={4}
                  slotProps={{ bar: { style: { cursor: 'pointer' } } }}
                  onItemClick={(event, data) => {
                    const clickedDataset = datasetStats[data.dataIndex]?.dataset;
                    if (clickedDataset) setSelectedDatasets(prev => prev.includes(clickedDataset) ? prev.filter(d => d !== clickedDataset) : [...prev, clickedDataset]);
                  }}
                />
              </div>
            )}
          </div>

          {/* Dataset Overlap */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: headingColor, margin: 0 }}>Dataset Overlap</h3>
              {selectedOverlaps.length > 0 && (
                <Button size="small" onClick={() => setSelectedOverlaps([])} sx={{ textTransform: 'none', fontSize: 11, minWidth: 'auto', padding: '2px 8px' }}>Clear</Button>
              )}
            </div>
            {selectedOverlaps.length > 0 && (
              <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedOverlaps.map(ov => (
                  <Chip key={ov} label={`${ov} dataset${ov !== 1 ? 's' : ''}`} size="small" onDelete={() => setSelectedOverlaps(prev => prev.filter(o => o !== ov))} sx={{ backgroundColor: isDark ? 'rgba(34,197,94,0.12)' : '#f0fdf4', color: isDark ? '#86efac' : '#16a34a', fontSize: 10, height: 22 }} />
                ))}
              </div>
            )}
            {datasetOverlap.length === 0 ? (
              <div style={{ padding: 24, color: mutedColor, textAlign: 'center', background: isDark ? 'rgba(255,255,255,0.03)' : '#f8fafc', borderRadius: 8 }}>No data</div>
            ) : (
              <div ref={chart2Ref}>
                <BarChart
                  xAxis={[{ scaleType: 'band', data: datasetOverlap.map(d => d.overlapCount.toString()), label: 'Number of Datasets', categoryGapRatio: 0.2, barGapRatio: 0.05 }]}
                  series={[{ data: datasetOverlap.map(d => d.proteinCount), color: '#22c55e', highlightScope: { highlighted: 'item', faded: 'global' } }]}
                  height={200}
                  width={420}
                  yAxis={[{ label: 'Proteins' }]}
                  margin={{ bottom: 40, left: 48, right: 8, top: 16 }}
                  borderRadius={4}
                  slotProps={{ bar: { style: { cursor: 'pointer' } } }}
                  onItemClick={(event, data) => {
                    const clickedOverlap = datasetOverlap[data.dataIndex]?.overlapCount;
                    if (clickedOverlap !== undefined) setSelectedOverlaps(prev => prev.includes(clickedOverlap) ? prev.filter(o => o !== clickedOverlap) : [...prev, clickedOverlap]);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Active Filters */}
        {(selectedDatasets.length > 0 || selectedOverlaps.length > 0) && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: isDark ? 'rgba(59,130,246,0.06)' : '#f8fafc', borderRadius: 8, border: isDark ? '1px solid rgba(59,130,246,0.15)' : '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <strong style={{ color: headingColor, fontSize: 12, display: 'block', marginBottom: 4 }}>Active Filters</strong>
                {selectedDatasets.length > 0 && (
                  <div style={{ marginBottom: selectedOverlaps.length > 0 ? 4 : 0, fontSize: 12 }}>
                    <span style={{ color: isDark ? '#93c5fd' : '#2563eb', fontWeight: 600, marginRight: 6 }}>Datasets:</span>
                    <span style={{ color: mutedColor }}>{selectedDatasets.join(', ')}</span>
                  </div>
                )}
                {selectedOverlaps.length > 0 && (
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: isDark ? '#86efac' : '#16a34a', fontWeight: 600, marginRight: 6 }}>Overlap:</span>
                    <span style={{ color: mutedColor }}>{selectedOverlaps.map(o => `${o} dataset${o !== 1 ? 's' : ''}`).join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
