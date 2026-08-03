#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const SOURCE_GEOJSON = path.join(ROOT, 'aquarisk-data', 'stations', 'bolivia', 'stations.v1.geojson');
const SOURCE_SUMMARY = path.join(ROOT, 'aquarisk-data', 'stations', 'bolivia', 'summary.v1.json');
const OUTPUT_DIR = path.join(ROOT, 'aquarisk-data', 'stations', 'tarija');
const VERSION = 'v1';
const TARGET_DEPARTMENT = 'Tarija';
const LAST_VERIFIED_AT = '2026-03-10';
const SOURCE_PRIORITY = 'oficial_primero_con_fallback_abierto_trazable';

function toTitleCase(value = '') {
  if (!value) return value;
  return String(value)
    .split(/\s+/)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join(' ');
}

function inferConfidenceLabel(props = {}) {
  const quality = String(props.location_quality || '').toLowerCase();
  if (quality.includes('coordenada pública') || quality.includes('coordenada oficial')) {
    return 'Alta';
  }
  if (quality.includes('ajustada al cauce') || props.snap_distance_km != null) {
    return 'Media';
  }
  return 'Media';
}

function inferSeriesUse(props = {}) {
  if (props.series_available) return 'Serie utilizable';
  if (props.network_type === 'hydrological') return 'Seguimiento operativo';
  return 'Referencia catalográfica';
}

function bboxFromFeatures(features = []) {
  const coords = features
    .map((feature) => feature?.geometry?.coordinates)
    .filter((pair) => Array.isArray(pair) && Number.isFinite(pair[0]) && Number.isFinite(pair[1]));
  const lons = coords.map((pair) => pair[0]);
  const lats = coords.map((pair) => pair[1]);
  return {
    minLon: Math.min(...lons),
    minLat: Math.min(...lats),
    maxLon: Math.max(...lons),
    maxLat: Math.max(...lats),
  };
}

function countBy(features, selector) {
  const counts = {};
  features.forEach((feature) => {
    const key = selector(feature);
    if (!key) return;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function sortEntries(values = {}) {
  return Object.fromEntries(Object.entries(values).sort(([a], [b]) => a.localeCompare(b, 'es')));
}

async function main() {
  const [geojsonRaw, summaryRaw] = await Promise.all([
    fs.readFile(SOURCE_GEOJSON, 'utf8'),
    fs.readFile(SOURCE_SUMMARY, 'utf8'),
  ]);

  const geojson = JSON.parse(geojsonRaw);
  const boliviaSummary = JSON.parse(summaryRaw);

  const tarijaFeatures = (geojson.features || [])
    .filter((feature) => feature?.properties?.department === TARGET_DEPARTMENT)
    .map((feature) => {
      const props = { ...(feature.properties || {}) };
      const municipality = props.municipality || props.station_name || TARGET_DEPARTMENT;
      const confidence_label = inferConfidenceLabel(props);
      return {
        ...feature,
        properties: {
          ...props,
          focus_region: 'tarija',
          municipality: toTitleCase(municipality),
          confidence_label,
          confidence: confidence_label === 'Alta' ? 'high' : 'medium',
          operator: props.operator || (props.network_type === 'hydrological' ? 'SENAMHI Bolivia / INE-ANDA' : 'SENAMHI Bolivia'),
          is_official_coordinate: props.is_official_coordinate === true
            || String(props.location_quality || '').toLowerCase().includes('coordenada pública')
            || String(props.location_quality || '').toLowerCase().includes('coordenada oficial'),
          last_verified_at: props.last_verified_at || LAST_VERIFIED_AT,
          source_priority: props.source_priority || SOURCE_PRIORITY,
          service_level: props.service_level || 'L3',
          series_use_label: inferSeriesUse(props),
          tarija_focus_label: props.network_type === 'hydrological' ? 'Seguimiento hidrológico Tarija' : 'Referencia climática Tarija',
        },
      };
    })
    .sort((a, b) => {
      const propsA = a.properties || {};
      const propsB = b.properties || {};
      if (propsA.network_type !== propsB.network_type) {
        return propsA.network_type === 'hydrological' ? -1 : 1;
      }
      return String(propsA.station_name || '').localeCompare(String(propsB.station_name || ''), 'es');
    });

  if (!tarijaFeatures.length) {
    throw new Error('No se encontraron estaciones de Tarija en el catálogo Bolivia');
  }

  const bounds = bboxFromFeatures(tarijaFeatures);
  const center = {
    lat: Number(((bounds.minLat + bounds.maxLat) / 2).toFixed(6)),
    lon: Number(((bounds.minLon + bounds.maxLon) / 2).toFixed(6)),
  };
  const municipalityCounts = sortEntries(countBy(tarijaFeatures, (feature) => feature.properties?.municipality));
  const typeCounts = sortEntries(countBy(tarijaFeatures, (feature) => feature.properties?.network_type));
  const statusCounts = sortEntries(countBy(tarijaFeatures, (feature) => feature.properties?.operational_status));
  const macrobasinCounts = sortEntries(countBy(tarijaFeatures, (feature) => feature.properties?.macrobasin_label));
  const confidenceCounts = sortEntries(countBy(tarijaFeatures, (feature) => feature.properties?.confidence_label));

  const summary = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    scope: 'Tarija · red observacional prioritaria',
    department: TARGET_DEPARTMENT,
    country: 'Bolivia',
    coverage_level: 'Tarija observacional prioritaria',
    service_level: 'L3',
    source_priority: SOURCE_PRIORITY,
    last_verified_at: LAST_VERIFIED_AT,
    recommended_use: 'Apoyo tecnico defendible para lectura observacional, proximidad a estaciones y briefings preliminares.',
    limits: 'No sustituye un inventario oficial exhaustivo ni garantiza disponibilidad de series completas en AquaRisk.',
    station_count: tarijaFeatures.length,
    station_count_note: `${tarijaFeatures.length} estaciones visibles en el subcatálogo Tarija derivado desde la red Bolivia.`,
    type_counts: typeCounts,
    status_counts: statusCounts,
    municipality_counts: municipalityCounts,
    macrobasin_counts: macrobasinCounts,
    confidence_counts: confidenceCounts,
    focus_units: [...new Set(tarijaFeatures.map((feature) => feature.properties?.dominant_hydro_unit_id).filter(Boolean))],
    suggested_view: {
      center,
      zoom: 8,
      bounds,
    },
    filters: {
      municipalities: Object.keys(municipalityCounts),
      types: Object.keys(typeCounts),
      statuses: Object.keys(statusCounts),
      macrobasins: Object.keys(macrobasinCounts),
    },
    sources: boliviaSummary.sources || [],
    caveats: [
      'El subcatálogo Tarija deriva del catálogo Bolivia ya publicado por AquaRisk. No sustituye un inventario oficial exhaustivo de estaciones activas a escala departamental.',
      'Las estaciones hidrológicas con coordenada no oficial siguen tratándose como ubicación derivada TerraNava, incluso dentro del foco Tarija.',
      'La presencia de una estación en este overlay no implica disponibilidad inmediata de series completas dentro de AquaRisk.',
      ...(boliviaSummary.caveats || []),
    ],
  };

  const outputGeojson = {
    type: 'FeatureCollection',
    name: 'tarija_stations_v1',
    features: tarijaFeatures,
  };

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(OUTPUT_DIR, 'stations.v1.geojson'), JSON.stringify(outputGeojson)),
    fs.writeFile(path.join(OUTPUT_DIR, 'summary.v1.json'), JSON.stringify(summary, null, 2)),
  ]);

  console.log(`Tarija stations catalog generado en ${OUTPUT_DIR}`);
  console.log(`Estaciones: ${tarijaFeatures.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
