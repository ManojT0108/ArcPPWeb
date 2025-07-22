import React, { useEffect, useState } from 'react';
// import Plot from 'react-plotly.js';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const modColors = {
  "Acetyl": "blue",
  "Oxidation": "red",
  "SO3Hex(1)Hex(2)dHex(1)": "purple",
  "Hex(1)HexA(2)MeHexA(1)": "orange",
  "Hex(1)HexA(2)MeHexA(1)Hex(1)": "brown"
};

function ProteinPlot() {
  const { hvoId } = useParams();
  const [plotData, setPlotData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
  const fetchData = async () => {
    try {
      const res = await axios.get(`/api/protein-data/${hvoId}`);
      setPlotData(res.data);
    } catch (err) {
      setError(err.message);
    }
  };

  fetchData(); // call the async function
}, [hvoId]);

  if (error) return <div style={{ color: 'red' }}>{error}</div>;
  if (!plotData) return <div>Loading plot...</div>;

  console.log(plotData)

  const { sequenceLength, sequenceLetters, trypsin, peptides } = plotData;

  // const traces = [];

  // // Trypsin sites (y = 1)
  // traces.push({
  //   x: trypsin,
  //   y: Array(trypsin.length).fill(1),
  //   mode: 'markers',
  //   marker: {
  //     symbol: 'circle',
  //     size: 10,
  //     color: 'black',
  //     line: { width: 1, color: 'white' }
  //   },
  //   name: 'Trypsin Site',
  //   hoverinfo: 'x+name'
  // });

  // const plottedMods = new Set();

  // // Peptides and mods
  // for (const row of peptides) {
  //   const { start, stop, sequence, modifications } = row;

  //   // Peptides (y = 3)
  //   traces.push({
  //     x: Array.from({ length: stop - start + 1 }, (_, i) => start + i),
  //     y: Array(stop - start + 1).fill(3),
  //     mode: 'markers',
  //     marker: {
  //       symbol: 'circle',
  //       size: 9,
  //       color: '#7EB6FF'
  //     },
  //     name: 'Peptide',
  //     text: Array(stop - start + 1).fill(`Peptide: ${sequence}`),
  //     hoverinfo: 'text',
  //     showlegend: false
  //   });

  //   // Modifications (y = 2)
  //   if (modifications) {
  //     const modItems = modifications.split(';');
  //     for (const mod of modItems) {
  //       const match = mod.trim().match(/(.+):(\d+)$/);
  //       if (match) {
  //         const [_, type, pos] = match;
  //         const absPos = start + parseInt(pos) - 1;
  //         const showLegend = !plottedMods.has(type);
  //         if (modColors[type]) {
  //           traces.push({
  //             x: [absPos],
  //             y: [2],
  //             mode: 'markers',
  //             marker: {
  //               symbol: 'circle',
  //               size: 11,
  //               color: modColors[type]
  //             },
  //             name: showLegend ? type : undefined,
  //             hoverinfo: 'text',
  //             text: [`Mod: ${type}, Pos: ${absPos}`],
  //             legendgroup: type,
  //             showlegend: showLegend
  //           });
  //           plottedMods.add(type);
  //         }
  //       }
  //     }
  //   }
  // }

  // const aaPositions = Array.from({ length: fasta.length }, (_, i) => i + 1);

  return (
    <div>
      {sequenceLength}
    </div>
    // <div style={{ backgroundColor: "#fff", padding: "20px", borderRadius: "10px" }}>
    //   <h2 style={{ textAlign: "center" }}>Protein Visualization for {hvoId}</h2>
    //   <Plot
    //     data={traces}
    //     layout={{
    //       title: '',
    //       xaxis: {
    //         title: 'Protein Sequence Position',
    //         tickvals: Array.from({ length: sequenceLength }, (_, i) => i + 1),
    //         ticktext: sequenceLetters,
    //         tickangle: 0,
    //         tickfont: { size: 9 },
    //         showgrid: true,
    //         gridcolor: '#e8e8e8',
    //         rangeslider: { visible: true }
    //       },
    //       yaxis: {
    //         tickvals: [3, 2, 1],
    //         ticktext: ['Peptides', 'Modifications', 'Trypsin'],
    //         title: 'Features'
    //       },
    //       legend: { title: { text: 'Modifications' }, borderwidth: 1 },
    //       height: 600,
    //       margin: { l: 60, r: 40, t: 60, b: 60 },
    //       hovermode: 'closest',
    //       plot_bgcolor: '#f9f9f9',
    //       paper_bgcolor: '#f9f9f9'
    //     }}
    //     config={{
    //       displayModeBar: true,
    //       responsive: true,
    //       toImageButtonOptions: {
    //         format: 'png',
    //         filename: `${hvoId}_plot`,
    //         height: 600,
    //         width: 1200,
    //         scale: 2
    //       }
    //     }}
    //   />
    // </div>
  );
}

export default ProteinPlot;
