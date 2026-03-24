#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const outputDir = path.join(workspaceRoot, 'aquarisk-data/reference/location-context');

const COUNTRY_GROUPS = {
  bolivia: [
    { code: 'PER', name: 'Perú' },
    { code: 'BRA', name: 'Brasil' },
    { code: 'PRY', name: 'Paraguay' },
    { code: 'ARG', name: 'Argentina' },
    { code: 'CHL', name: 'Chile' },
  ],
  spain: [
    { code: 'PRT', name: 'Portugal' },
    { code: 'FRA', name: 'Francia' },
  ],
};

function roundCoords(value) {
  if (Array.isArray(value)) return value.map(roundCoords);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, roundCoords(entry)]));
  }
  if (typeof value === 'string' || typeof value === 'boolean' || value == null) return value;
  return Number(Number(value).toFixed(4));
}

async function fetchCountryFeature(code, name, regionKey) {
  const url = `https://raw.githubusercontent.com/johan/world.geo.json/master/countries/${code}.geo.json`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`No se pudo descargar ${code} (${response.status})`);
  }
  const payload = await response.json();
  const feature = payload?.type === 'FeatureCollection'
    ? payload.features?.[0]
    : payload;
  if (!feature?.geometry) {
    throw new Error(`Sin geometría utilizable para ${code}`);
  }
  return {
    type: 'Feature',
    properties: {
      name,
      country_code: code,
      role: 'neighbor_country',
      region_key: regionKey,
      source: url,
    },
    geometry: roundCoords(feature.geometry),
  };
}

async function buildRegion(regionKey, countries) {
  const features = [];
  for (const country of countries) {
    features.push(await fetchCountryFeature(country.code, country.name, regionKey));
  }
  const collection = {
    type: 'FeatureCollection',
    metadata: {
      region_key: regionKey,
      generated_at: new Date().toISOString(),
      source: 'johan/world.geo.json',
      role: 'country_panel_neighbors',
    },
    features,
  };
  const outputPath = path.join(outputDir, `${regionKey}-neighbors.v1.geojson`);
  await fs.writeFile(outputPath, `${JSON.stringify(collection, null, 2)}\n`, 'utf8');
  return outputPath;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const outputs = [];
  for (const [regionKey, countries] of Object.entries(COUNTRY_GROUPS)) {
    outputs.push(await buildRegion(regionKey, countries));
  }
  outputs.forEach((item) => console.log(item));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
