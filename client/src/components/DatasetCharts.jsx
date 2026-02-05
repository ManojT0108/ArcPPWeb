import React from 'react';
import { Button, Chip } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';

export default function DatasetCharts({
  datasetStats,
  datasetOverlap,
  selectedDatasets,
  setSelectedDatasets,
  selectedOverlaps,
  setSelectedOverlaps,
}) {
  return (
    <>
      <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #e2e8f0 20%, #e2e8f0 80%, transparent)', margin: '20px 0' }} />
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#0b1b3a', marginBottom: 6 }}>Dataset Analysis</h2>
        <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Click bars to filter proteins</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 28 }}>
          {/* Proteins per Dataset */}
          <div style={{
            background: 'white',
            padding: 20,
            borderRadius: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            border: '1px solid #e8eef7',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(88, 145, 237, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0b1b3a', margin: 0 }}>Proteins per Dataset</h3>
              {selectedDatasets.length > 0 && (
                <Button size="small" onClick={() => setSelectedDatasets([])} sx={{ textTransform: 'none', fontSize: 11, minWidth: 'auto', padding: '4px 8px' }}>Clear</Button>
              )}
            </div>
            {selectedDatasets.length > 0 && (
              <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedDatasets.map(ds => (
                  <Chip key={ds} label={ds} size="small" onDelete={() => setSelectedDatasets(prev => prev.filter(d => d !== ds))} sx={{ backgroundColor: '#dbeafe', color: '#1e40af', fontSize: 10, height: 22 }} />
                ))}
              </div>
            )}
            {datasetStats.length === 0 ? (
              <div style={{ padding: 30, color: '#94a3b8', textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>No data</div>
            ) : (
              <BarChart
                xAxis={[{ scaleType: 'band', data: datasetStats.map(d => d.dataset), tickLabelStyle: { angle: -45, textAnchor: 'end', fontSize: 9 }, categoryGapRatio: 0.2, barGapRatio: 0.05 }]}
                series={[{
                  data: datasetStats.map(d => d.proteinCount),
                  color: '#5891ed',
                  highlightScope: { highlighted: 'item', faded: 'global' }
                }]}
                height={250}
                width={450}
                yAxis={[{ label: 'Proteins' }]}
                margin={{ bottom: 80, left: 50, right: 10, top: 20 }}
                borderRadius={8}
                slotProps={{ bar: { style: { cursor: 'pointer', rx: 8 } } }}
                onItemClick={(event, data) => {
                  const clickedDataset = datasetStats[data.dataIndex]?.dataset;
                  if (clickedDataset) setSelectedDatasets(prev => prev.includes(clickedDataset) ? prev.filter(d => d !== clickedDataset) : [...prev, clickedDataset]);
                }}
              />
            )}
          </div>

          {/* Dataset Overlap */}
          <div style={{
            background: 'white',
            padding: 20,
            borderRadius: 16,
            boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
            border: '1px solid #e8eef7',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(16, 185, 129, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)';
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0b1b3a', margin: 0 }}>Dataset Overlap</h3>
              {selectedOverlaps.length > 0 && (
                <Button size="small" onClick={() => setSelectedOverlaps([])} sx={{ textTransform: 'none', fontSize: 11, minWidth: 'auto', padding: '4px 8px' }}>Clear</Button>
              )}
            </div>
            {selectedOverlaps.length > 0 && (
              <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {selectedOverlaps.map(ov => (
                  <Chip key={ov} label={`${ov} dataset${ov !== 1 ? 's' : ''}`} size="small" onDelete={() => setSelectedOverlaps(prev => prev.filter(o => o !== ov))} sx={{ backgroundColor: '#d1fae5', color: '#065f46', fontSize: 10, height: 22 }} />
                ))}
              </div>
            )}
            {datasetOverlap.length === 0 ? (
              <div style={{ padding: 30, color: '#94a3b8', textAlign: 'center', background: '#f8fafc', borderRadius: 8 }}>No data</div>
            ) : (
              <BarChart
                xAxis={[{ scaleType: 'band', data: datasetOverlap.map(d => d.overlapCount.toString()), label: 'Number of Datasets', categoryGapRatio: 0.2, barGapRatio: 0.05 }]}
                series={[{
                  data: datasetOverlap.map(d => d.proteinCount),
                  color: '#10b981',
                  highlightScope: { highlighted: 'item', faded: 'global' }
                }]}
                height={250}
                width={500}
                yAxis={[{ label: 'Proteins' }]}
                margin={{ bottom: 50, left: 50, right: 10, top: 20 }}
                borderRadius={8}
                slotProps={{ bar: { style: { cursor: 'pointer', rx: 8 } } }}
                onItemClick={(event, data) => {
                  const clickedOverlap = datasetOverlap[data.dataIndex]?.overlapCount;
                  if (clickedOverlap !== undefined) setSelectedOverlaps(prev => prev.includes(clickedOverlap) ? prev.filter(o => o !== clickedOverlap) : [...prev, clickedOverlap]);
                }}
              />
            )}
          </div>
        </div>

        {/* Active Filters */}
        {(selectedDatasets.length > 0 || selectedOverlaps.length > 0) && (
          <div style={{ marginTop: 20, padding: '16px 20px', background: 'linear-gradient(135deg, #f0f9ff 0%, #f0fdf4 100%)', borderRadius: 10, border: '1px solid #bae6fd' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                ✓
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#0b1b3a', fontSize: 13, display: 'block', marginBottom: 6 }}>Active Filters</strong>
                {selectedDatasets.length > 0 && (
                  <div style={{ marginBottom: selectedOverlaps.length > 0 ? 6 : 0, fontSize: 12 }}>
                    <span style={{ color: '#0369a1', fontWeight: 600, background: '#e0f2fe', padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>Datasets</span>
                    <span style={{ color: '#475569' }}>{selectedDatasets.join(', ')}</span>
                  </div>
                )}
                {selectedOverlaps.length > 0 && (
                  <div style={{ fontSize: 12 }}>
                    <span style={{ color: '#065f46', fontWeight: 600, background: '#d1fae5', padding: '2px 6px', borderRadius: 4, marginRight: 6 }}>Overlap</span>
                    <span style={{ color: '#475569' }}>{selectedOverlaps.map(o => `${o} dataset${o !== 1 ? 's' : ''}`).join(', ')}</span>
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
