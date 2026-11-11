const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');
const csvPath = path.join(rootDir, 'ml/species_list.csv');
const labelsPath = path.join(rootDir, 'web/public/models/labels.json');

const rawCsv = fs.readFileSync(csvPath, 'utf8');
const labels = JSON.parse(fs.readFileSync(labelsPath, 'utf8'));

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = [];
    let cur = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') {
        inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        parts.push(cur.trim());
        cur = '';
      } else {
        cur += c;
      }
    }
    parts.push(cur.trim());
    rows.push(parts);
  }
  return rows;
}

const csvRows = parseCsv(rawCsv);

const allMeta = {};
for (const parts of csvRows) {
  const id = parseInt(parts[0], 10);
  const commonName = parts[1];
  const scientificName = parts[2];
  const family = parts[3];
  const genus = parts[4];
  let pType = (parts[5] || 'herb').toLowerCase();
  if (pType === 'vine') pType = 'climber';
  if (!['herb', 'shrub', 'tree', 'climber', 'grass', 'succulent', 'aquatic', 'crop'].includes(pType)) {
    pType = 'herb';
  }
  let origin = (parts[6] || 'both').toLowerCase();
  if (origin === 'native') origin = 'indian';
  else if (origin === 'introduced') origin = 'global';
  else origin = 'both';

  const hindiName = parts[7] || null;
  const bengaliName = parts[8] || null;
  const slug = scientificName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  allMeta[id] = {
    id,
    slug,
    commonName,
    scientificName,
    family,
    genus,
    plantType: pType,
    origin,
    namesHindi: hindiName,
    namesBengali: bengaliName,
  };
}

console.log(`Parsed ${Object.keys(allMeta).length} metadata entries.`);
console.log('Sample 40:', allMeta[40]);

fs.writeFileSync(
  path.join(rootDir, 'web/src/data/species_meta.json'),
  JSON.stringify(allMeta, null, 2),
  'utf8'
);
console.log('Wrote web/src/data/species_meta.json');
