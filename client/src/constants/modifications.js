export const ALLOWED_MODIFICATIONS = [
  "Acetyl",
  "Oxidation",
  "SO3Hex(1)Hex(2)dHex(1)",
  "Hex(1)HexA(2)MeHexA(1)",
  "Hex(1)HexA(2)MeHexA(1)Hex(1)"
];

export const MOD_COLORS = {
  Acetyl: '#3B82F6',
  Oxidation: '#EF4444',
  'SO3Hex(1)Hex(2)dHex(1)': '#8B5CF6',
  'Hex(1)HexA(2)MeHexA(1)': '#F59E0B',
  'Hex(1)HexA(2)MeHexA(1)Hex(1)': '#92400E',
};

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
