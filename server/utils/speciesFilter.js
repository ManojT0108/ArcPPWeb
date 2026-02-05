const speciesToProteinIdFilter = (raw) => {
  if (!raw) return {};

  const key = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

  const aliases = {
    haloferax_volcanii: { protein_id: { $regex: '^HVO_\\d{4}$', $options: 'i' } },
  };

  return aliases[key] || {};
};

module.exports = { speciesToProteinIdFilter };
