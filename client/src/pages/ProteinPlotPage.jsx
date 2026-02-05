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

const pageBgStyle = {
  minHeight: '100vh',
  background:
    'radial-gradient(1400px 700px at 50% -10%, #10203f 0%, #0c162a 35%, #081322 100%)',
};

export default function ProteinPlotPage() {
  const { hvoId } = useParams();

  const [coverage, setCoverage] = useState(null);
  const [protein, setProtein] = useState(null);
  const [psmCount, setPsmCount] = useState(null);
  const [totalPsms, setTotalPsms] = useState(null);
  const [sequenceData, setSequenceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selectedPosition, setSelectedPosition] = useState(null);
  const plotRef = useRef(null);

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
          <div style={{ height: 32, width: 220, background: '#17223a', borderRadius: 8, marginBottom: 8 }} />
          <div style={{ height: 16, width: 180, background: '#17223a', borderRadius: 6 }} />
          <div style={{ marginTop: 24, height: 220, borderRadius: 20, background: '#0c1428' }} />
        </div>
      </div>
    );
  }

  if (err || !coverage || !protein) {
    return (
      <div style={pageBgStyle}>
        <NavBar />
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 24px', color: '#89a2c0' }}>
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
          <h1 style={{ fontSize: '48px', fontWeight: 700, color: '#e6edf7', letterSpacing: 0.2, margin: 0 }}>{hvoId}</h1>
          <p style={{ marginTop: 8, color: '#89a2c0', fontSize: 16 }}>Coverage overview</p>
        </header>

        {/* 2x2 Grid Layout */}
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>

          {/* Tile 1: Info Cards (Top Left) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto auto auto auto auto',
            gap: 16,
            minHeight: 400
          }}>
            <MiniCardDark
              label="UNIPROT ID"
              value={uniProtein_id || '\u2014'}
              link={uniProtein_id ? `https://www.uniprot.org/uniprotkb/${uniProtein_id}/entry` : null}
            />
            <MiniCardDark label="QVALUE" value={qValue ?? '\u2014'} />
            <div style={{ gridColumn: 'span 2' }}>
              <MiniCardDark label="DESCRIPTION" value={description || '\u2014'} fullHeight />
            </div>
            <MiniCardDark label="Peptides" value={psmCount ?? '\u2014'} />
            <MiniCardDark label="PSMs" value={totalPsms ? totalPsms.toLocaleString() : '\u2014'} />
            <MiniCardDark
              label="HYDROPHOBICITY"
              value={hydrophobicity !== undefined && hydrophobicity !== null ? hydrophobicity.toFixed(3) : '\u2014'}
            />
            <MiniCardDark
              label="pI"
              value={pI !== undefined && pI !== null ? pI.toFixed(2) : '\u2014'}
            />
            <MiniCardDark
              label="MOLECULAR WEIGHT"
              value={molecular_weight !== undefined && molecular_weight !== null ? molecular_weight : '\u2014'}
            />
          </div>

          {/* Tile 2: Circular Gauge (Top Right) */}
          <GlassCard style={{ minHeight: 400 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
              <div style={{ width: 220, height: 220 }}>
                <Tooltip title={tooltipContent} arrow placement="top" enterTouchDelay={0} leaveTouchDelay={2500}>
                  <div style={{ width: '100%', height: '100%' }} aria-label="Sequences identified gauge">
                    <CircularProgressbar
                      value={coverage_percent}
                      text={`${coverage_percent.toFixed(1)}%`}
                      strokeWidth={10}
                      styles={buildStyles({
                        textColor: '#e6edf7',
                        pathColor: '#5b8df3',
                        trailColor: '#1a2438',
                        textSize: '20px',
                        pathTransitionDuration: 1.0,
                      })}
                    />
                  </div>
                </Tooltip>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#89a2c0', fontSize: 14, fontWeight: 500, marginBottom: 12 }}>
                  Sequence Coverage
                </div>
                <div style={{ display: 'flex', gap: 24, fontSize: 12, color: '#7e92b5' }}>
                  <div>
                    <div style={{ color: '#60A5FA', fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{covered_length}</div>
                    <div>Covered AA</div>
                  </div>
                  <div>
                    <div style={{ color: '#e6edf7', fontWeight: 600, fontSize: 18, marginBottom: 4 }}>{total_length}</div>
                    <div>Total AA</div>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Tile 3: Sequence Viewer (Bottom Left) */}
          <GlassCard
            title={<span style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#89a2c0' }}>PROTEIN SEQUENCE — Click colored amino acid to zoom</span>}
            style={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}
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
          <div style={{ minHeight: 400 }}>
            <PSMsByDatasetChart
              proteinId={hvoId}
              mode="dark"
            />
          </div>

        </section>

        {/* Peptide Coverage Plot - Full Width Below */}
        <section>
          <PeptideCoveragePlot
            ref={plotRef}
            hvoId={hvoId}
            mode="dark"
            zoomToPosition={selectedPosition}
          />
        </section>
      </main>
    </div>
  );
}
