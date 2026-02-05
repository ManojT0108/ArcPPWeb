const router = require('express').Router();
const Protein = require('../model/proteins');
const Peptide = require('../model/peptides');
const { MOD_COLORS } = require('../utils/constants');

router.get('/plot/peptide-coverage/:protein_id', async (req, res) => {
  try {
    const proteinId = req.params.protein_id;

    // 1) get sequence + peptides from MongoDB
    const proteinDoc = await Protein.findOne(
      { protein_id: proteinId },
      { _id: 1, sequence: 1 }
    ).lean();
    if (!proteinDoc || !proteinDoc.sequence) return res.status(404).json({ error: 'Protein sequence not found' });
    const seq = proteinDoc.sequence;
    const L = seq.length;
    const peptideDocs = await Peptide.find(
      { protein_id: proteinDoc._id },
      { sequence: 1, startIndex: 1, endIndex: 1, modification: 1, _id: 0 }
    ).lean();
    const rows = peptideDocs.map(p => ({
      seq: p.sequence, start: p.startIndex, stop: p.endIndex, mods: p.modification
    }));

    // 2) enzyme sites
    const trypsinX = [],
      glucX = [];
    for (let i = 0; i < L; i++) {
      const aa = seq[i];
      const pos = i + 1;
      if (aa === 'K' || aa === 'R') trypsinX.push(pos);
      if (aa === 'D' || aa === 'E') glucX.push(pos);
    }

    // 3) peptide traces
    const peptideTraces = rows.map((r) => {
      const start = Math.max(1, r.start);
      const stop = Math.min(L, r.stop);
      const xs = Array.from({ length: stop - start + 1 }, (_, i) => start + i);
      return {
        type: 'scatter',
        mode: 'markers',
        x: xs,
        y: Array(xs.length).fill(4),
        marker: { symbol: 'square', size: 9, color: '#7EB6FF', line: { width: 0 } },
        name: 'Peptides',
        hoverinfo: 'text',
        text: xs.map(() => `Peptide: ${r.seq}<br>Range: ${start}-${stop}`),
        showlegend: false,
      };
    });

    // 4) modifications - GROUP BY POSITION to handle multiple mods
    const re = /(.+):(\d+)$/;
    const modsByPosition = {};

    for (const r of rows) {
      if (!r.mods) continue;
      for (const part of String(r.mods).split(';')) {
        const m = re.exec(part.trim());
        if (!m) continue;
        const type = m[1].trim();
        if (!MOD_COLORS[type]) continue;
        const rel = parseInt(m[2], 10);
        const abs = r.start + rel - 1;
        if (abs < 1 || abs > L) continue;

        if (!modsByPosition[abs]) modsByPosition[abs] = [];
        modsByPosition[abs].push({ type, color: MOD_COLORS[type] });
      }
    }

    // Create traces for modifications
    const modTraces = [];
    const modPositionsByType = {};
    const allModTypes = new Set();

    for (const [pos, mods] of Object.entries(modsByPosition)) {
      const position = parseInt(pos);

      mods.forEach(mod => allModTypes.add(mod.type));

      if (mods.length === 1) {
        const type = mods[0].type;
        if (!modPositionsByType[type]) modPositionsByType[type] = [];
        modPositionsByType[type].push({
          x: position,
          y: 3,
          text: `Modification: ${type}<br>Position: ${position}`
        });
      } else {
        const numMods = mods.length;

        if (numMods === 2) {
          mods.forEach((mod, idx) => {
            const type = mod.type;
            if (!modPositionsByType[type]) modPositionsByType[type] = [];
            const offset = idx === 0 ? -0.15 : 0.15;
            modPositionsByType[type].push({
              x: position + offset,
              y: 3,
              text: `${type} at position ${position}<br>(with ${mods.filter(m => m.type !== type).map(m => m.type).join(', ')})`
            });
          });
        } else if (numMods === 3) {
          const offsets = [
            { x: 0, y: 0.15 },
            { x: -0.15, y: -0.1 },
            { x: 0.15, y: -0.1 }
          ];
          mods.forEach((mod, idx) => {
            const type = mod.type;
            if (!modPositionsByType[type]) modPositionsByType[type] = [];
            modPositionsByType[type].push({
              x: position + offsets[idx].x,
              y: 3 + offsets[idx].y,
              text: `${type} at position ${position}<br>(with ${mods.filter(m => m.type !== type).map(m => m.type).join(', ')})`
            });
          });
        } else {
          const angleStep = (2 * Math.PI) / numMods;
          const radius = 0.2;
          mods.forEach((mod, idx) => {
            const type = mod.type;
            if (!modPositionsByType[type]) modPositionsByType[type] = [];
            const angle = idx * angleStep;
            modPositionsByType[type].push({
              x: position + radius * Math.cos(angle),
              y: 3 + radius * Math.sin(angle),
              text: `${type} at position ${position}<br>(with ${mods.filter(m => m.type !== type).map(m => m.type).join(', ')})`
            });
          });
        }
      }
    }

    for (const modType of allModTypes) {
      const positions = modPositionsByType[modType] || [];

      const x = positions.length > 0 ? positions.map(p => p.x) : [-1000];
      const y = positions.length > 0 ? positions.map(p => p.y) : [3];
      const text = positions.length > 0
        ? positions.map(p => p.text)
        : [`Modification: ${modType}<br>(No positions)`];

      modTraces.push({
        type: 'scatter',
        mode: 'markers',
        x: x,
        y: y,
        marker: {
          symbol: 'circle',
          size: 11,
          color: MOD_COLORS[modType],
          line: { width: 0 },
          opacity: positions.length > 0 ? 1 : 0
        },
        name: modType,
        hoverinfo: positions.length > 0 ? 'text' : 'skip',
        text: text,
        showlegend: true,
        legendgroup: modType,
      });
    }

    // 5) enzyme rows
    const glucTrace = {
      type: 'scatter',
      mode: 'markers',
      x: glucX,
      y: Array(glucX.length).fill(2),
      marker: { symbol: 'circle', size: 8, color: '#86EFAC', line: { width: 0 } },
      name: 'GluC site',
      hoverinfo: 'x+name',
      showlegend: true,
    };
    const trypsinTrace = {
      type: 'scatter',
      mode: 'markers',
      x: trypsinX,
      y: Array(trypsinX.length).fill(1),
      marker: { symbol: 'circle', size: 8, color: '#00FFFF', line: { width: 0 } },
      name: 'Trypsin site',
      hoverinfo: 'x+name',
      showlegend: true,
    };

    // 6) alternating vertical strips
    const STRIP_EVERY = 20;
    const STRIP_COLOR = 'rgba(0,0,0,0.035)';
    const shapes = [];
    for (let s = 1; s <= L; s += STRIP_EVERY * 2) {
      shapes.push({
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: s,
        x1: Math.min(s + STRIP_EVERY - 0.5, L + 0.5),
        y0: 0,
        y1: 1,
        fillcolor: STRIP_COLOR,
        line: { width: 0 },
        layer: 'below',
      });
    }

    const data = [...peptideTraces, ...modTraces, glucTrace, trypsinTrace];

    const multiModPositions = {};
    for (const [pos, mods] of Object.entries(modsByPosition)) {
      if (mods.length > 1) {
        multiModPositions[pos] = mods.map(m => ({
          type: m.type,
          color: m.color || MOD_COLORS[m.type]
        }));
      }
    }

    const layout = {
      title: `Peptide Coverage — ${proteinId}`,
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      height: 480,
      margin: { l: 60, r: 30, t: 40, b: 60 },
      hovermode: 'closest',
      legend: { title: 'Features / Mods', borderwidth: 1 },
      shapes,
      xaxis: {
        title: 'Protein Sequence Position',
        tickmode: 'array',
        tickvals: Array.from({ length: L }, (_, i) => i + 1),
        ticktext: seq.split(''),
        tickfont: { size: 9 },
        showgrid: true,
        gridcolor: '#e8e8e8',
        range: [0.5, L + 0.5],
      },
      yaxis: {
        title: 'Features',
        tickmode: 'array',
        tickvals: [4, 3, 2, 1],
        ticktext: ['Peptides', 'Modifications', 'GluC', 'Trypsin'],
        range: [0.5, 4.5],
        showgrid: false,
      },
    };
    const config = {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['toImage', 'lasso2d', 'select2d'],
    };

    res.json({ data, layout, config, multiModPositions });
  } catch (e) {
    console.error('plot endpoint error', e);
    res.status(500).json({ error: 'Failed to build plot' });
  }
});

module.exports = router;
