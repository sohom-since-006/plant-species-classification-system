#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const speciesDataDir = path.join(rootDir, 'supabase/species_data');
const labelsPath = path.join(rootDir, 'web/public/models/labels.json');
const seedSqlPath = path.join(rootDir, 'supabase/seed.sql');
const webPublicSpeciesPath = path.join(rootDir, 'web/public/data/species.json');
const webSrcSpeciesPath = path.join(rootDir, 'web/src/data/species.json');
const webSrcMetaPath = path.join(rootDir, 'web/src/data/species_meta.json');

const VALID_PLANT_TYPES = new Set([
  'herb',
  'shrub',
  'tree',
  'climber',
  'grass',
  'succulent',
  'aquatic',
  'crop',
  'epiphyte',
]);

const VALID_ORIGINS = new Set(['indian', 'global', 'both']);

function loadLabels() {
  if (!fs.existsSync(labelsPath)) {
    throw new Error(`labels.json not found at ${labelsPath}`);
  }
  return JSON.parse(fs.readFileSync(labelsPath, 'utf8'));
}

function sqlEscape(val) {
  if (val === null || val === undefined) return 'null';
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlArray(arr) {
  if (!arr || arr.length === 0) return 'ARRAY[]::text[]';
  return `ARRAY[${arr.map(sqlEscape).join(', ')}]::text[]`;
}

export function buildAndValidateSpeciesData() {
  const labels = loadLabels();
  const labelIds = Object.keys(labels).map(Number).sort((a, b) => a - b);

  if (!fs.existsSync(speciesDataDir)) {
    fs.mkdirSync(speciesDataDir, { recursive: true });
  }

  const files = fs
    .readdirSync(speciesDataDir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.warn(`No batch JSON files found in ${speciesDataDir}`);
    return {
      total: 0,
      missingIds: labelIds,
      todoCount: 0,
      valid: false,
    };
  }

  const speciesMap = new Map();
  const slugs = new Set();
  let todoCount = 0;
  const errors = [];

  for (const file of files) {
    const filePath = path.join(speciesDataDir, file);
    let batch;
    try {
      batch = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      errors.push(`JSON syntax error in ${file}: ${e.message}`);
      continue;
    }

    if (!Array.isArray(batch)) {
      errors.push(`Batch file ${file} must export an array of species objects.`);
      continue;
    }

    for (const s of batch) {
      const id = s.id;
      if (typeof id !== 'number' || id < 0 || id > 149) {
        errors.push(`Invalid species id '${id}' in ${file}`);
        continue;
      }
      if (speciesMap.has(id)) {
        errors.push(`Duplicate species id ${id} found in ${file}`);
        continue;
      }

      // Check slug uniqueness
      const slug = s.slug;
      if (!slug || typeof slug !== 'string') {
        errors.push(`Species id ${id} missing valid slug.`);
      } else if (slugs.has(slug)) {
        errors.push(`Duplicate slug '${slug}' for species id ${id}.`);
      } else {
        slugs.add(slug);
      }

      // Validate required string fields
      const requiredStrings = [
        'common_name',
        'scientific_name',
        'family',
        'genus',
        'plant_type',
        'origin',
        'description',
        'habitat',
        'distribution',
      ];
      for (const field of requiredStrings) {
        if (!s[field] || typeof s[field] !== 'string' || s[field].trim().length === 0) {
          errors.push(`Species id ${id} (${s.common_name || 'unnamed'}) missing required string '${field}'.`);
        }
      }

      // Validate enums
      if (s.plant_type && !VALID_PLANT_TYPES.has(s.plant_type.toLowerCase())) {
        errors.push(`Species id ${id} invalid plant_type '${s.plant_type}'. Allowed: ${[...VALID_PLANT_TYPES].join(', ')}`);
      }
      if (s.origin && !VALID_ORIGINS.has(s.origin.toLowerCase())) {
        errors.push(`Species id ${id} invalid origin '${s.origin}'. Allowed: ${[...VALID_ORIGINS].join(', ')}`);
      }

      // Validate required arrays
      const requiredArrays = ['identifying_features', 'uses', 'care_tips'];
      for (const arrField of requiredArrays) {
        if (!Array.isArray(s[arrField]) || s[arrField].length === 0) {
          errors.push(`Species id ${id} missing or empty array for '${arrField}'.`);
        }
      }

      // Parity check against labels.json
      const expectedLabel = labels[String(id)];
      if (expectedLabel) {
        if (
          expectedLabel.scientific_name.toLowerCase() !==
          (s.scientific_name || '').toLowerCase()
        ) {
          errors.push(
            `Species id ${id} scientific name mismatch: expected '${expectedLabel.scientific_name}', got '${s.scientific_name}'`
          );
        }
      } else {
        errors.push(`Species id ${id} not found in labels.json.`);
      }

      // Count TODO(verify)
      const fullText = JSON.stringify(s);
      const matches = fullText.match(/TODO\(verify\)/g);
      if (matches) {
        todoCount += matches.length;
      }

      speciesMap.set(id, s);
    }
  }

  // Check that all 150 IDs are present
  const presentIds = Array.from(speciesMap.keys()).sort((a, b) => a - b);
  const missingIds = labelIds.filter((id) => !speciesMap.has(id));

  if (missingIds.length > 0) {
    errors.push(`Missing species IDs: ${missingIds.join(', ')}`);
  }

  if (errors.length > 0) {
    console.error(`\nValidation FAILED with ${errors.length} error(s):`);
    errors.forEach((err) => console.error(`  - ${err}`));
    return {
      total: speciesMap.size,
      missingIds,
      todoCount,
      valid: false,
      errors,
    };
  }

  console.log(`\nValidation PASSED for all ${speciesMap.size} species!`);
  console.log(`Verified total TODO(verify) markers: ${todoCount}`);

  // Build sorted species list (0..149)
  const allSpecies = [];
  const clientSpeciesMap = {};
  const metaMap = {};

  // Helper to scrub internal developer markers from user-facing runtime strings
  function stripTodo(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\s*TODO\(verify\)\.?/g, '').trim();
  }

  for (let id = 0; id < 150; id++) {
    const s = speciesMap.get(id);
    allSpecies.push(s);

    const fullJson = JSON.stringify(s);
    const hasUnverifiedDetails = fullJson.includes('TODO(verify)');

    // Format camelCase object for client runtime (scrubbing raw TODO markers for user-facing views)
    const clientRecord = {
      id: s.id,
      slug: s.slug,
      commonName: s.common_name,
      scientificName: s.scientific_name,
      family: s.family,
      genus: s.genus,
      plantType: s.plant_type,
      origin: s.origin,
      namesHindi: s.names_hindi || null,
      namesBengali: s.names_bengali || null,
      otherNames: s.other_names || [],
      description: stripTodo(s.description),
      identifyingFeatures: (s.identifying_features || []).map(stripTodo),
      habitat: stripTodo(s.habitat) || null,
      distribution: stripTodo(s.distribution) || null,
      uses: (s.uses || []).map(stripTodo),
      careTips: (s.care_tips || []).map(stripTodo),
      toxicityNote: stripTodo(s.toxicity_note) || null,
      isToxic: Boolean(s.is_toxic),
      funFact: stripTodo(s.fun_fact) || null,
      referenceImages: s.reference_images || [],
      imageCredit: s.image_credit || null,
      wikipediaUrl: s.wikipedia_url || null,
      sources: s.sources || [],
      hasUnverifiedDetails,
    };

    clientSpeciesMap[id] = clientRecord;

    metaMap[id] = {
      id: s.id,
      slug: s.slug,
      commonName: s.common_name,
      scientificName: s.scientific_name,
      family: s.family,
      genus: s.genus,
      plantType: s.plant_type,
      origin: s.origin,
      namesHindi: s.names_hindi || null,
      namesBengali: s.names_bengali || null,
    };
  }

  // 1. Generate supabase/seed.sql
  const seedStatements = [
    '-- Supabase Seed Data for Plant Species Classification System',
    '-- Schema: public.species matching docs/BACKEND_SCHEMA.md & supabase/schema.sql',
    '-- Generated by scripts/build-species-data.mjs from supabase/species_data/*.json',
    '',
  ];

  for (const s of allSpecies) {
    seedStatements.push(`insert into public.species (
  id, slug, common_name, scientific_name, family, genus,
  plant_type, origin, names_hindi, names_bengali, other_names,
  description, identifying_features, habitat, distribution,
  uses, care_tips, toxicity_note, is_toxic, fun_fact, reference_images, image_credit, wikipedia_url, sources
) values (
  ${s.id},
  ${sqlEscape(s.slug)},
  ${sqlEscape(s.common_name)},
  ${sqlEscape(s.scientific_name)},
  ${sqlEscape(s.family)},
  ${sqlEscape(s.genus)},
  ${sqlEscape(s.plant_type)},
  ${sqlEscape(s.origin)},
  ${sqlEscape(s.names_hindi)},
  ${sqlEscape(s.names_bengali)},
  ${sqlArray(s.other_names)},
  ${sqlEscape(s.description)},
  ${sqlArray(s.identifying_features)},
  ${sqlEscape(s.habitat)},
  ${sqlEscape(s.distribution)},
  ${sqlArray(s.uses)},
  ${sqlArray(s.care_tips)},
  ${sqlEscape(s.toxicity_note)},
  ${Boolean(s.is_toxic)},
  ${sqlEscape(s.fun_fact)},
  ${sqlArray(s.reference_images)},
  ${s.image_credit ? sqlEscape(JSON.stringify(s.image_credit)) + '::jsonb' : 'null'},
  ${sqlEscape(s.wikipedia_url)},
  ${s.sources && s.sources.length > 0 ? sqlEscape(JSON.stringify(s.sources)) + '::jsonb' : "'[]'::jsonb"}
) on conflict (id) do update set
  slug = excluded.slug,
  common_name = excluded.common_name,
  scientific_name = excluded.scientific_name,
  family = excluded.family,
  genus = excluded.genus,
  plant_type = excluded.plant_type,
  origin = excluded.origin,
  names_hindi = excluded.names_hindi,
  names_bengali = excluded.names_bengali,
  other_names = excluded.other_names,
  description = excluded.description,
  identifying_features = excluded.identifying_features,
  habitat = excluded.habitat,
  distribution = excluded.distribution,
  uses = excluded.uses,
  care_tips = excluded.care_tips,
  toxicity_note = excluded.toxicity_note,
  is_toxic = excluded.is_toxic,
  fun_fact = excluded.fun_fact,
  reference_images = excluded.reference_images,
  image_credit = excluded.image_credit,
  wikipedia_url = excluded.wikipedia_url,
  sources = excluded.sources;
`);
  }

  fs.writeFileSync(seedSqlPath, seedStatements.join('\n'), 'utf8');
  console.log(`Generated ${seedSqlPath}`);

  // 2. Generate web/public/data/species.json & web/src/data/species.json
  fs.writeFileSync(webPublicSpeciesPath, JSON.stringify(clientSpeciesMap, null, 2), 'utf8');
  console.log(`Generated ${webPublicSpeciesPath}`);

  fs.writeFileSync(webSrcSpeciesPath, JSON.stringify(clientSpeciesMap, null, 2), 'utf8');
  console.log(`Generated ${webSrcSpeciesPath}`);

  // 3. Generate web/src/data/species_meta.json
  fs.writeFileSync(webSrcMetaPath, JSON.stringify(metaMap, null, 2), 'utf8');
  console.log(`Generated ${webSrcMetaPath}`);

  return {
    total: speciesMap.size,
    missingIds: [],
    todoCount,
    valid: true,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const res = buildAndValidateSpeciesData();
  if (!res.valid) {
    process.exit(1);
  }
}

