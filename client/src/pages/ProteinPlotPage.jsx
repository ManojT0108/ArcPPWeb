// src/pages/ProteinPlotPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Tooltip } from '@mui/material';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

import NavBar from '../components/NavBar';
import PeptideCoveragePlot from '../components/PeptideCoveragePlot';
import PSMsByDatasetChart from '../components/PSMsByDatasetChart';
import GlassCard from '../components/GlassCard';
import SequenceViewer from '../components/SequenceViewer';
import MiniCardDark from '../components/MiniCardDark';
import { useTheme } from '../ThemeContext';

export default function ProteinPlotPage() {
  const { hvoId } = useParams();
  const { isDark } = useTheme();

  const [coverage, setCoverage] = useState(null);
  const [protein, setProtein] = useState(null);
  const [psmCount, setPsmCount] = useState(null);
  const [totalPsms, setTotalPsms] = useState(null);
  const [sequenceData, setSequenceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selectedPosition, setSelectedPosition] = useState(null);
  const plotRef = useRef(null);

  const pageBgStyle = {
    minHeight: '100vh',
    background: isDark ? '#0b1320' : '#f4f7f8',
  };

  const cardVariant = isDark ? 'dark' : 'light';

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setErr('');
      try {
        const [covRes, protRes, psmRes, seqRes, psmDatasetRes] = await Promise.all([
          axios.get(`/api/coverage/${hvoId}`),
          axios.get(`/api/proteins/${hvoId}/details`),
          axios.get(`/api/proteins/${hvoId}/psm-count`),
          axios.get(`/api/proteins/${hvoId}/sequence`),
          axios.get(`/api/proteins/${hvoId}/psms-by-dataset`),
        ]);

        if (!cancelled) {
          setCoverage(covRes.data);
          setProtein(protRes.data);
          setPsmCount(
            psmRes.data && typeof psmRes.data.psmCount === 'number'
              ? psmRes.data.psmCount
              : 0
          );
          setSequenceData(seqRes.data);

          if (psmDatasetRes.data.success && psmDatasetRes.data.data) {
            const total = psmDatasetRes.data.data.reduce((sum, item) => sum + item.psmCount, 0);
            setTotalPsms(total);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching data:', error);
          setErr('Failed to load protein data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => { cancelled = true; };
  }, [hvoId]);

  const handlePositionClick = (position) => {
    setSelectedPosition(position);
  };

  if (loading) {
    return (
      <div style={pageBgStyle}>
        <NavBar />
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px' }}>
          <div style={{ height: 32, width: 220, background: isDark ? '#17223a' : '#e2e8f0', borderRadius: 8, marginBottom: 8 }} />
          <div style={{ height: 16, width: 180, background: isDark ? '#17223a' : '#e2e8f0', borderRadius: 6 }} />
          <div style={{ marginTop: 24, height: 220, borderRadius: 20, background: isDark ? '#0c1428' : '#e8eef7' }} />
        </div>
      </div>
    );
  }

  if (err || !coverage || !protein) {
    return (
      <div style={pageBgStyle}>
        <NavBar />
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px', color: isDark ? '#89a2c0' : '#64748b' }}>
          {err || 'No data.'}
        </div>
      </div>
    );
  }

  const { total_length = 0, covered_length = 0, coverage_percent = 0 } = coverage;
  const { uniProtein_id, qValue, description, hydrophobicity, pI, molecular_weight } = protein;

  const tooltipContent = (
    <div style={{ lineHeight: 1.4 }}>
      <div><strong>Coverage:</strong> {coverage_percent.toFixed(2)}%</div>
      <div><strong>Total length:</strong> {total_length}</div>
      <div><strong>Covered length:</strong> {covered_length}</div>
    </div>
  );

  return (
    <div style={pageBgStyle}>
      <NavBar />

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 24px 64px' }}>
        {/* Header */}
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 36, fontWeight: 700, color: isDark ? '#e7eef8' : '#132334', margin: 0 }}>{hvoId}</h1>
          <p style={{ marginTop: 6, color: isDark ? '#9cb0c4' : '#5f7282', fontSize: 15 }}>Coverage overview</p>
        </header>

        {/* 2x2 Grid Layout */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

          {/* Tile 1: Info Cards (Top Left) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto auto auto auto auto',
            gap: 12,
            minHeight: 320
          }}>
            <MiniCardDark
              label="UNIPROT ID"
              value={uniProtein_id || '\u2014'}
              link={uniProtein_id ? `https://www.uniprot.org/uniprotkb/${uniProtein_id}/entry` : null}
              variant={cardVariant}
            />
            <MiniCardDark label="QVALUE" value={qValue ?? '\u2014'} variant={cardVariant} />
            <div style={{ gridColumn: 'span 2' }}>
              <MiniCardDark label="DESCRIPTION" value={description || '\u2014'} fullHeight variant={cardVariant} />
            </div>
            <MiniCardDark label="Peptides" value={psmCount ?? '\u2014'} variant={cardVariant} />
            <MiniCardDark label="PSMs" value={totalPsms ? totalPsms.toLocaleString() : '\u2014'} variant={cardVariant} />
            <MiniCardDark
              label="HYDROPHOBICITY"
              value={hydrophobicity !== undefined && hydrophobicity !== null ? hydrophobicity.toFixed(3) : '\u2014'}
              variant={cardVariant}
            />
            <MiniCardDark
              label="pI"
              value={pI !== undefined && pI !== null ? pI.toFixed(2) : '\u2014'}
              variant={cardVariant}
            />
            <MiniCardDark
              label="MOLECULAR WEIGHT"
              value={molecular_weight !== undefined && molecular_weight !== null ? molecular_weight : '\u2014'}
              variant={cardVariant}
            />
          </div>

          {/* Tile 2: Circular Gauge (Top Right) */}
          <GlassCard style={{ minHeight: 320 }} variant={cardVariant}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
              <div style={{ width: 170, height: 170 }}>
                <Tooltip title={tooltipContent} arrow placement="top" enterTouchDelay={0} leaveTouchDelay={2500}>
                  <div style={{ width: '100%', height: '100%' }} aria-label="Sequences identified gauge">
                    <CircularProgressbar
                      value={coverage_percent}
                      text={`${coverage_percent.toFixed(1)}%`}
                      strokeWidth={10}
                      styles={buildStyles({
                        textColor: isDark ? '#e6edf7' : '#0f172a',
                        pathColor: '#5f88ad',
                        trailColor: isDark ? '#1a2438' : '#dce5ec',
                        textSize: '20px',
                        pathTransitionDuration: 1.0,
                      })}
                    />
                  </div>
                </Tooltip>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: isDark ? '#9cb0c4' : '#5f7282', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                  Sequence Coverage
                </div>
                <div style={{ display: 'flex', gap: 24, fontSize: 12, color: isDark ? '#8ea4ba' : '#718493' }}>
                  <div>
                    <div style={{ color: '#6b99bc', fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{covered_length}</div>
                    <div>Covered AA</div>
                  </div>
                  <div>
                    <div style={{ color: isDark ? '#e6edf7' : '#0f172a', fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{total_length}</div>
                    <div>Total AA</div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Tile 3: Sequence Viewer (Bottom Left) */}
          <GlassCard
            title={<span style={{ fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', color: isDark ? '#89a2c0' : '#64748b' }}>PROTEIN SEQUENCE — Click colored amino acid to zoom</span>}
            style={{ minHeight: 320, display: 'flex', flexDirection: 'column' }}
            variant={cardVariant}
          >
            {sequenceData && sequenceData.sequence && (
              <SequenceViewer
                sequence={sequenceData.sequence}
                modifications={sequenceData.modifications || []}
                onPositionClick={handlePositionClick}
                highlightedPosition={selectedPosition}
              />
            )}
          </GlassCard>

          {/* Tile 4: PSMs by Dataset Chart (Bottom Right) */}
          <div style={{ minHeight: 320 }}>
            <PSMsByDatasetChart
              proteinId={hvoId}
              mode={isDark ? 'dark' : 'light'}
            />
          </div>

        </section>

        {/* Peptide Coverage Plot - Full Width Below */}
        <section>
          <PeptideCoveragePlot
            ref={plotRef}
            hvoId={hvoId}
            mode={isDark ? 'dark' : 'light'}
            zoomToPosition={selectedPosition}
          />
        </section>
      </main>
    </div>
  );
}
