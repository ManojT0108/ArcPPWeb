const MOD_COLORS = {
  Acetyl: '#3B82F6',
  Oxidation: '#EF4444',
  'SO3Hex(1)Hex(2)dHex(1)': '#8B5CF6',
  'Hex(1)HexA(2)MeHexA(1)': '#F59E0B',
  'Hex(1)HexA(2)MeHexA(1)Hex(1)': '#92400E',
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

module.exports = { MOD_COLORS, HVO_RE, UNIPROT_RE, Q_VALUE_THRESHOLD, canonicalModType };
