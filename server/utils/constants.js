// Biologically-relevant modifications recognized site-wide.
// Acetyl, Oxidation, and Phospho keep their own colors; every glycan shares ONE
// color (per Stefan, 2026-06-23) — the exact composition and residue position
// are shown on hover and in the peptide table. The glycan list is data-derived
// from the ingested combined_v2 files across all 8 species (see arcpp-ingestion).
// Keep in sync with client/src/constants/modifications.js.
const GLYCAN_COLOR = '#8B5CF6';

const GLYCANS = [
  'Hex',
  'Hex(1)HexA(1)',
  'Hex(1)HexA(1)SHexA(2)',
  'Hex(1)HexA(2)',
  'Hex(1)HexA(2)MeHexA(1)',
  'Hex(1)HexA(2)SHexA(1)',
  'Hex(1)HexA(3)',
  'Hex(1)HexNAc(1)SHexA(3)',
  'Hex(2)',
  'Hex(2)HexA(1)SHexA(2)',
  'Hex(2)HexA(2)MeHexA(1)',
  'Hex(2)HexA(2)SHexA(1)',
  'Hex(2)HexA(3)',
  'Hex(2)HexNAc(2)HexA(1)Pent(2)',
  'Hex(2)SHex(1)dHex(1)',
  'Hex(5)Hep(1)SdHex(1)',
  'Hex(6)Hep(1)SdHex(1)',
  'Hex(7)SHex(1)',
  'Hex(8)',
  'HexNAc(1)Hex(1)HexA(1)HexAN(1)MeHexNAcA(1)Me2Hep(1)',
  'HexNAc(1)Hex(1)HexA(1)HexAN(1)MeHexNAcA(1)Me2Hep(1)Me2HexAcA(1)',
  'HexNAc(1)Hex(1)HexA(1)HexAN(1)MeHexNAcA(1)Me2Hep(1)MeHexAcA(1)',
  'HexNAc(1)Hex(1)HexA(1)HexAN(1)MeHexNAcA(1)Me2HexAcA(1)',
  'HexNAc(1)Hex(1)HexAN(1)MeHexNAcA(1)Me2Hep(1)',
  'HexNAc(1)Hex(1)SdHex(6)',
  'HexNAc(2)Hex(4)SQv(1)',
  'SHex(1)',
  'SHex(1)Hex(1)',
  'SHex(1)Hex(2)',
  'SHex(1)Hex(2)dHex(1)',
  'SdHex(1)Hex(3)HexNAc(2)',
];

const MOD_COLORS = {
  Acetyl: '#3B82F6',
  Oxidation: '#EF4444',
  Phospho: '#10B981',
  ...GLYCANS.reduce((acc, g) => ((acc[g] = GLYCAN_COLOR), acc), {}),
};

const HVO_RE = /^HVO_\d{4}$/i;
const UNIPROT_RE = /^(?:[A-Z][0-9][A-Z0-9]{3}[0-9]|[A-Z0-9]{10})(?:-\d+)?$/i;

// PSM/peptide q-value cutoff for "confidently identified". Used by coverage,
// the coverage-stats endpoint, the protein page, and the cache builder — keep
// it in one place so they can't drift apart.
const Q_VALUE_THRESHOLD = 0.005;

// Case-insensitive map from a modification label to its canonical MOD_COLORS key.
const MOD_LOOKUP = Object.keys(MOD_COLORS).reduce((acc, k) => {
  acc[k.toLowerCase()] = k;
  return acc;
}, {});

function canonicalModType(raw) {
  return MOD_LOOKUP[String(raw || '').trim().toLowerCase()] || null;
}

module.exports = {
  MOD_COLORS,
  GLYCANS,
  GLYCAN_COLOR,
  HVO_RE,
  UNIPROT_RE,
  Q_VALUE_THRESHOLD,
  canonicalModType,
};
