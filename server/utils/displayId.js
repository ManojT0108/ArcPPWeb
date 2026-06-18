// The display ID for a protein: the HVO locus tag for Haloferax, otherwise the
// UniProt accession. Shared so every caller derives it the same way.
function displayId(doc) {
  return doc.hvo_id || doc.protein_id;
}

module.exports = { displayId };
