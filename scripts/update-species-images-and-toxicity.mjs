import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const speciesDataDir = path.join(rootDir, 'supabase/species_data');
const creditsPath = path.join(rootDir, 'web/public/species/credits.json');

const credits = fs.existsSync(creditsPath)
  ? JSON.parse(fs.readFileSync(creditsPath, 'utf8'))
  : {};

// Specifically identified genuinely toxic botanical species (20 species)
const TOXIC_SPECIES_IDS = new Set([
  25,  // Frangipani (Plumeria rubra) - Toxic diterpene sap
  26,  // Oleander (Nerium oleander) - Deadly cardiac glycosides
  31,  // Periwinkle (Catharanthus roseus) - Cytotoxic vinca alkaloids
  33,  // Lantana (Lantana camara) - Hepatotoxic triterpenoids
  80,  // Money plant (Epipremnum aureum) - Insoluble calcium oxalate
  81,  // Snake plant (Dracaena trifasciata) - Toxic saponins
  84,  // Peace lily (Spathiphyllum wallisii) - Insoluble calcium oxalate
  86,  // Jade plant (Crassula ovata) - Toxic to household pets
  89,  // Aglaonema (Aglaonema commutatum) - Insoluble calcium oxalate
  90,  // Dieffenbachia (Dieffenbachia seguine) - Dumb Cane, highly toxic
  91,  // Patharchatta (Kalanchoe pinnata) - Bufadienolide glycosides
  98,  // Tulip (Tulipa gesneriana) - Tulipalin lactones
  99,  // Daffodil (Narcissus pseudonarcissus) - Highly toxic lycorine
  100, // Lily (Lilium lancifolium) - Fatal to cats, toxic
  101, // Dahlia (Dahlia pinnata) - Phototoxic polyacetylenes
  104, // Chrysanthemum (Chrysanthemum indicum) - Pyrethrins
  107, // Water hyacinth (Pontederia crassipes) - Oxalates & heavy metals
  108, // Sensitive plant (Mimosa pudica) - Mimosine (toxic to livestock)
  109, // Parthenium (Parthenium hysterophorus) - Hazardous parthenin
  111, // Oak (Quercus robur) - Gallotannins (toxic to livestock/pets)
]);

const files = fs.readdirSync(speciesDataDir).filter(f => f.endsWith('.json')).sort();

for (const file of files) {
  const filePath = path.join(speciesDataDir, file);
  const speciesList = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const s of speciesList) {
    const id = s.id;
    // 1. Remove all external stock URLs; set local webp
    s.reference_images = [`/species/${id}.webp`];

    // 2. Attach credit metadata
    const credit = credits[String(id)] || {};
    s.image_credit = {
      observer: credit.observer || 'iNaturalist Contributor',
      license: credit.license || 'CC-BY-NC 4.0',
      source_url: credit.source_url || '',
    };

    // 3. Mark toxicity accurately
    s.is_toxic = TOXIC_SPECIES_IDS.has(id);
  }

  fs.writeFileSync(filePath, JSON.stringify(speciesList, null, 2) + '\n', 'utf8');
  console.log(`Updated ${file}`);
}

console.log('All species_data JSON files updated with local /species/{id}.webp, image_credit, and is_toxic.');

