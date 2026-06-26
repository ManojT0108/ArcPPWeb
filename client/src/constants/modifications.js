const GLYCAN_COLOR = '#8B5CF6';

// 31 glycans, data-derived from the ingested combined_v2 files across all 8
// species. Per Stefan (2026-06-23): every glycan shares one color; the exact
// composition and residue position are shown on hover / in the peptide table.
// Keep in sync with server/utils/constants.js.
export const GLYCANS = [
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

export const MOD_COLORS = {
  Acetyl: '#3B82F6',
  Oxidation: '#EF4444',
  Phospho: '#10B981',
  ...GLYCANS.reduce((acc, g) => ((acc[g] = GLYCAN_COLOR), acc), {}),
};

// Recognized biological modification types: Acetyl, Oxidation, Phospho + glycans.
// Derived from MOD_COLORS so the two can't drift apart.
export const ALLOWED_MODIFICATIONS = Object.keys(MOD_COLORS);

// Extract unique allowed modification types from raw modification strings.
// Each raw string is like "Oxidation:10;Label:13C(6)15N(2):21"
export function filterModifications(modifications) {
  if (!Array.isArray(modifications)) return [];
  const found = new Set();
  for (const raw of modifications) {
    const parts = raw.split(';');
    for (const part of parts) {
      const type = part.split(':')[0].trim();
      if (ALLOWED_MODIFICATIONS.includes(type)) {
        found.add(type);
      }
    }
  }
  return Array.from(found);
}
