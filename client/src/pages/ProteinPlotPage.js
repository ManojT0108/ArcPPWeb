// src/pages/ProteinPlotPage.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import ProteinPlot from '../components/ProteinPlot';

function ProteinPlotPage() {
  const { hvoId } = useParams();

  return (
    <div>
      <h2 style={{ textAlign: 'center' }}>Protein Visualization for {hvoId}</h2>
      <ProteinPlot hvoId={hvoId} />
    </div>
  );
}

export default ProteinPlotPage;
