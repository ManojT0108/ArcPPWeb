const MOD_COLORS = {
  Acetyl: '#3B82F6',
  Oxidation: '#EF4444',
  'SO3Hex(1)Hex(2)dHex(1)': '#8B5CF6',
  'Hex(1)HexA(2)MeHexA(1)': '#F59E0B',
  'Hex(1)HexA(2)MeHexA(1)Hex(1)': '#92400E',
};

const HVO_RE = /^HVO_\d{4}$/i;
const UNIPROT_RE = /^(?:[A-Z][0-9][A-Z0-9]{3}[0-9]|[A-Z0-9]{10})(?:-\d+)?$/i;

module.exports = { MOD_COLORS, HVO_RE, UNIPROT_RE };
