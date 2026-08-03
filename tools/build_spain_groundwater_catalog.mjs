#!/usr/bin/env node

import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const outputDir = path.join(repoRoot, 'aquarisk-data', 'groundwater', 'spain');
const sourceInventoryPath = path.join(repoRoot, 'aquarisk-data', 'reference', 'spain', 'source-inventory.v1.json');
const execFileAsync = promisify(execFile);

const SERVICE_ROOT = 'https://sig.mapama.gob.es/arcgis/rest/services/25830/WMS_Agua/MapServer';
const lastVerifiedAt = '2026-03-12';
const sourcePriority = 'oficial_primero_con_fallback_abierto_trazable';

const DATASETS = {
  masses: {
    layerId: 58,
    outputName: 'groundwater-masses.v1.geojson',
    label: 'MITECO · masas de agua subterránea PHC 2022-2027',
    fields: [
      'cod_masa',
      'nom_masa',
      'area_masa',
      'cod_ddhh',
      'nom_ddhh',
      'des_horiz',
      'vinc_mspf',
      'num_mspf',
      'asoc_eco',
      'form_geo',
      'internac',
      'version_id',
      'fecha_ini',
      'diseno_ini',
      'horizontes',
    ],
    pageSize: 50,
    format: 'geojson',
    returnGeometry: true,
    geometryPrecision: 5,
    maxAllowableOffset: 0.003,
  },
  quantitative: {
    layerId: 70,
    label: 'MITECO · estado cuantitativo de masas subterráneas PHC 2022-2027',
    fields: [
      'cod_masa',
      'nom_masa',
      'cod_demarc',
      'nom_demarc',
      'est_cu_desc',
      'est_qu_desc',
      'est_global',
    ],
    pageSize: 250,
    format: 'json',
    returnGeometry: false,
  },
  chemical: {
    layerId: 73,
    label: 'MITECO · estado químico de masas subterráneas PHC 2022-2027',
    fields: [
      'cod_masa',
      'nom_masa',
      'cod_demarc',
      'nom_demarc',
      'est_cu_desc',
      'est_qu_desc',
      'est_global',
    ],
    pageSize: 250,
    format: 'json',
    returnGeometry: false,
  },
};

const fallbackSources = [
  {
    id: 'miteco_groundwater_arcgis_service',
    label: 'MITECO · ArcGIS REST WMS_Agua',
    role: 'Servicio oficial con masas y estados de agua subterránea PHC usados por AquaRisk.',
    priority: 'official_primary',
    url: `${SERVICE_ROOT}?f=pjson`,
    status: 'verified_http_200',
  },
  {
    id: 'miteco_groundwater_masses_arcgis',
    label: 'MITECO · Masas de agua subterránea PHC 2022-2027',
    role: 'Geometría oficial de masas subterráneas para contexto territorial y soporte de informes.',
    priority: 'official_primary',
    url: `${SERVICE_ROOT}/${DATASETS.masses.layerId}?f=pjson`,
    status: 'verified_http_200',
  },
  {
    id: 'miteco_groundwater_quantitative_arcgis',
    label: 'MITECO · Estado cuantitativo masas subterráneas PHC 2022-2027',
    role: 'Clasificación oficial del estado cuantitativo por masa de agua subterránea.',
    priority: 'official_primary',
    url: `${SERVICE_ROOT}/${DATASETS.quantitative.layerId}?f=pjson`,
    status: 'verified_http_200',
  },
  {
    id: 'miteco_groundwater_chemical_arcgis',
    label: 'MITECO · Estado químico masas subterráneas PHC 2022-2027',
    role: 'Clasificación oficial del estado químico por masa de agua subterránea.',
    priority: 'official_primary',
    url: `${SERVICE_ROOT}/${DATASETS.chemical.layerId}?f=pjson`,
    status: 'verified_http_200',
  },
];

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundCoord(value) {
  return Number(Number(value).toFixed(6));
}

function sanitizeGeometry(geometry) {
  if (!geometry?.type || !geometry?.coordinates) return null;
  const { type, coordinates } = geometry;
  if (type === 'Point') {
    return {
      type,
      coordinates: [roundCoord(coordinates[0]), roundCoord(coordinates[1])],
    };
  }
  if (type === 'Polygon') {
    return {
      type,
      coordinates: coordinates.map((ring) => ring.map((coord) => [roundCoord(coord[0]), roundCoord(coord[1])])),
    };
  }
  if (type === 'MultiPolygon') {
    return {
      type,
      coordinates: coordinates.map((polygon) => polygon.map((ring) => ring.map((coord) => [roundCoord(coord[0]), roundCoord(coord[1])]))),
    };
  }
  return geometry;
}

function bboxFromGeometry(geometry, bbox = { minLon: Infinity, minLat: Infinity, maxLon: -Infinity, maxLat: -Infinity }) {
  if (!geometry?.type || geometry.coordinates == null) return bbox;
  const visit = (coords) => {
    if (!Array.isArray(coords)) return;
    if (coords.length >= 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
      bbox.minLon = Math.min(bbox.minLon, coords[0]);
      bbox.maxLon = Math.max(bbox.maxLon, coords[0]);
      bbox.minLat = Math.min(bbox.minLat, coords[1]);
      bbox.maxLat = Math.max(bbox.maxLat, coords[1]);
      return;
    }
    coords.forEach(visit);
  };
  visit(geometry.coordinates);
  return bbox;
}

function finalizeBBox(bbox) {
  if (!Number.isFinite(bbox.minLon)) {
    return {
      minLon: -9.6,
      minLat: 36.0,
      maxLon: 3.5,
      maxLat: 43.9,
    };
  }
  return {
    minLon: roundCoord(bbox.minLon),
    minLat: roundCoord(bbox.minLat),
    maxLon: roundCoord(bbox.maxLon),
    maxLat: roundCoord(bbox.maxLat),
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

function sortEntries(value = {}) {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'es')));
}

function sumBy(features, selector) {
  return features.reduce((total, feature) => total + (selector(feature) || 0), 0);
}

function mapGroundwaterFormation(value = '') {
  const normalized = normalizeText(value);
  if (normalized.includes('porosa')) return 'Porosa';
  if (normalized.includes('kars') || normalized.includes('karst')) return 'Kárstica';
  if (normalized.includes('fisurada')) return 'Fisurada';
  if (normalized.includes('mixta')) return 'Mixta';
  return String(value || 'No clasificada').trim() || 'No clasificada';
}

function mapGroundwaterStatus(value = '') {
  const normalized = normalizeText(value);
  if (!normalized) return 'Sin datos';
  if (normalized === 'bueno') return 'Bueno';
  if (normalized === 'malo') return 'Malo';
  if (normalized.includes('sin datos')) return 'Sin datos';
  return String(value).trim();
}

function computeGlobalStatus(quantitativeStatus, chemicalStatus, rawGlobalStatus) {
  const rawStatus = mapGroundwaterStatus(rawGlobalStatus);
  if (rawStatus !== 'Sin datos') return rawStatus;
  if (quantitativeStatus === 'Malo' || chemicalStatus === 'Malo') return 'Malo';
  if (quantitativeStatus === 'Bueno' && chemicalStatus === 'Bueno') return 'Bueno';
  return 'Sin datos';
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, attempt = 1) {
  let text = '';
  try {
    const result = await execFileAsync('curl', [
      '--fail-with-body',
      '--silent',
      '--show-error',
      '--location',
      '--max-time', '180',
      url,
    ], {
      maxBuffer: 128 * 1024 * 1024,
    });
    text = result.stdout || '';
  } catch (error) {
    if (attempt < 5) {
      await sleep(attempt * 1200);
      return fetchJson(url, attempt + 1);
    }
    throw new Error(error.stderr || error.message || `No se pudo cargar ${url}`);
  }
  if (/<!DOCTYPE html>/i.test(text) || /^</.test(text.trim())) {
    if (attempt < 5) {
      await sleep(attempt * 1200);
      return fetchJson(url, attempt + 1);
    }
    throw new Error(`Respuesta HTML inesperada al cargar ${url}`);
  }
  return JSON.parse(text);
}

function buildLayerQueryUrl(dataset, offset) {
  const params = new URLSearchParams({
    where: '1=1',
    outFields: dataset.fields.join(','),
    returnGeometry: dataset.returnGeometry ? 'true' : 'false',
    orderByFields: 'objectid',
    resultOffset: String(offset),
    resultRecordCount: String(dataset.pageSize),
    f: dataset.format,
  });
  if (dataset.returnGeometry) params.set('outSR', '4326');
  if (dataset.geometryPrecision != null) params.set('geometryPrecision', String(dataset.geometryPrecision));
  if (dataset.maxAllowableOffset != null) params.set('maxAllowableOffset', String(dataset.maxAllowableOffset));
  return `${SERVICE_ROOT}/${dataset.layerId}/query?${params.toString()}`;
}

async function fetchAllLayerFeatures(dataset) {
  const features = [];
  let offset = 0;
  while (true) {
    const url = buildLayerQueryUrl(dataset, offset);
    const payload = await fetchJson(url);
    const batch = Array.isArray(payload?.features) ? payload.features : [];
    features.push(...batch);
    if (batch.length < dataset.pageSize) break;
    offset += batch.length;
  }
  return features;
}

function buildStatusIndex(features = [], statusKey) {
  return new Map(
    features
      .map((feature) => {
        const props = feature?.attributes || feature?.properties || {};
        const massId = String(props.cod_masa || '').trim();
        if (!massId) return null;
        return [massId, {
          status: mapGroundwaterStatus(props[statusKey]),
          globalStatus: mapGroundwaterStatus(props.est_global),
          demarcationName: props.nom_demarc || null,
        }];
      })
      .filter(Boolean)
  );
}

function buildMassesFeatures(massesRaw = [], quantitativeRaw = [], chemicalRaw = []) {
  const quantitativeIndex = buildStatusIndex(quantitativeRaw, 'est_cu_desc');
  const chemicalIndex = buildStatusIndex(chemicalRaw, 'est_qu_desc');

  return massesRaw
    .map((feature) => {
      const geometry = sanitizeGeometry(feature?.geometry);
      if (!geometry) return null;
      const props = feature?.properties || {};
      const massId = String(props.cod_masa || feature.id || '').trim() || null;
      const quantitative = massId ? quantitativeIndex.get(massId) : null;
      const chemical = massId ? chemicalIndex.get(massId) : null;
      const quantitativeStatus = quantitative?.status || 'Sin datos';
      const chemicalStatus = chemical?.status || 'Sin datos';
      const globalStatus = computeGlobalStatus(
        quantitativeStatus,
        chemicalStatus,
        quantitative?.globalStatus || chemical?.globalStatus || null
      );
      const formation = mapGroundwaterFormation(props.form_geo);
      return {
        type: 'Feature',
        geometry,
        properties: {
          mass_id: massId,
          mass_name: props.nom_masa || 'Masa subterránea sin nombre',
          demarcation_code: props.cod_ddhh || null,
          demarcation_name: props.nom_ddhh || quantitative?.demarcationName || chemical?.demarcationName || 'Demarcación no declarada',
          area_km2: toFiniteNumber(props.area_masa),
          formation_type: formation,
          formation_detail: props.form_geo || null,
          develops_horizons: normalizeText(props.des_horiz) === 'si',
          horizons_detail: props.horizontes || null,
          linked_surface_masses: normalizeText(props.vinc_mspf) === 'si',
          linked_surface_count: toFiniteNumber(props.num_mspf),
          linked_ecosystems: normalizeText(props.asoc_eco) === 'si',
          international: normalizeText(props.internac) === 'yes' || normalizeText(props.internac) === 'si',
          quantitative_status: quantitativeStatus,
          chemical_status: chemicalStatus,
          global_status: globalStatus,
          source_label: DATASETS.masses.label,
          source_service: SERVICE_ROOT,
          source_layers: `${DATASETS.masses.layerId},${DATASETS.quantitative.layerId},${DATASETS.chemical.layerId}`,
          service_level: 'L2',
          source_priority: sourcePriority,
          last_verified_at: lastVerifiedAt,
        },
      };
    })
    .filter(Boolean);
}

function buildSummary(massesFeatures) {
  const bbox = finalizeBBox(
    massesFeatures.reduce((acc, feature) => bboxFromGeometry(feature.geometry, acc), {
      minLon: Infinity,
      minLat: Infinity,
      maxLon: -Infinity,
      maxLat: -Infinity,
    })
  );

  return {
    version: 'v1',
    country: 'España',
    label: 'Aguas subterráneas oficiales · España',
    status: 'active',
    service_level: 'L2',
    coverage_level: 'Masas oficiales PHC 2022-2027 + estado cuantitativo y químico oficial',
    source_priority: sourcePriority,
    last_verified_at: lastVerifiedAt,
    masses_count: massesFeatures.length,
    masses_note: `${massesFeatures.length.toLocaleString('es-ES')} masas oficiales de agua subterránea del ciclo PHC 2022-2027 con estado cuantitativo y químico asociado.`,
    summary_note: 'AquaRisk integra el mapa oficial de masas de agua subterránea de España y lo enriquece con estado cuantitativo y químico PHC 2022-2027 para lectura territorial defendible.',
    bbox,
    demarcation_counts: sortEntries(countBy(massesFeatures, (feature) => feature.properties?.demarcation_name)),
    formation_counts: sortEntries(countBy(massesFeatures, (feature) => feature.properties?.formation_type)),
    quantitative_status_counts: sortEntries(countBy(massesFeatures, (feature) => feature.properties?.quantitative_status)),
    chemical_status_counts: sortEntries(countBy(massesFeatures, (feature) => feature.properties?.chemical_status)),
    global_status_counts: sortEntries(countBy(massesFeatures, (feature) => feature.properties?.global_status)),
    total_groundwater_area_km2: Number(sumBy(massesFeatures, (feature) => feature.properties?.area_km2).toFixed(2)),
    suggested_view: {
      center: {
        lat: Number((((bbox.minLat + bbox.maxLat) / 2) || 39.8).toFixed(6)),
        lon: Number((((bbox.minLon + bbox.maxLon) / 2) || -3.7).toFixed(6)),
      },
      zoom: 6,
      bounds: bbox,
    },
  };
}

async function loadSources() {
  try {
    const raw = await fs.readFile(sourceInventoryPath, 'utf8');
    const inventory = JSON.parse(raw);
    const sourceMap = new Map((inventory?.sources || []).map((item) => [item.id, item]));
    return fallbackSources.map((source) => sourceMap.get(source.id) || source);
  } catch (_) {
    return fallbackSources;
  }
}

function buildInventory(summary, sources) {
  return {
    version: 'v1',
    country: 'España',
    label: 'Inventario AquaRisk · aguas subterráneas España',
    verified_at: lastVerifiedAt,
    policy: sourcePriority,
    summary_note: summary.summary_note,
    bbox: summary.bbox,
    datasets: [
      {
        key: 'groundwater_masses_official',
        label: 'Masas de agua subterránea oficiales',
        operator: 'MITECO',
        status: 'active',
        service_level: 'L2',
        coverage_level: 'España · PHC 2022-2027',
        access_mode: 'official_arcgis_rest',
        sources: [
          sources.find((item) => item.id === 'miteco_groundwater_masses_arcgis') || null,
          sources.find((item) => item.id === 'miteco_groundwater_quantitative_arcgis') || null,
          sources.find((item) => item.id === 'miteco_groundwater_chemical_arcgis') || null,
        ].filter(Boolean),
        service_url: `${SERVICE_ROOT}?f=pjson`,
        layers: {
          masses: DATASETS.masses.layerId,
          quantitative_status: DATASETS.quantitative.layerId,
          chemical_status: DATASETS.chemical.layerId,
        },
        geojson: '/aquarisk-data/groundwater/spain/groundwater-masses.v1.geojson',
        intended_outputs: [
          'contexto oficial de masas subterráneas',
          'lectura territorial del estado cuantitativo y químico',
          'soporte a informes y trazabilidad España',
        ],
        limits: 'No incluye series temporales piezométricas ni análisis hidrogeológico local de detalle; representa la delimitación y clasificación oficial PHC 2022-2027.',
      },
    ],
    sources,
    sample_fields: {
      masses: [
        'cod_masa',
        'nom_masa',
        'nom_ddhh',
        'area_masa',
        'form_geo',
        'internac',
        'est_cu_desc',
        'est_qu_desc',
        'est_global',
      ],
    },
  };
}

async function main() {
  const [massesRaw, quantitativeRaw, chemicalRaw, sources] = await Promise.all([
    fetchAllLayerFeatures(DATASETS.masses),
    fetchAllLayerFeatures(DATASETS.quantitative),
    fetchAllLayerFeatures(DATASETS.chemical),
    loadSources(),
  ]);

  const massesFeatures = buildMassesFeatures(massesRaw, quantitativeRaw, chemicalRaw);
  const summary = buildSummary(massesFeatures);
  const inventory = buildInventory(summary, sources);

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(
      path.join(outputDir, DATASETS.masses.outputName),
      `${JSON.stringify({ type: 'FeatureCollection', name: 'spain_groundwater_masses_v1', features: massesFeatures })}\n`
    ),
    fs.writeFile(path.join(outputDir, 'summary.v1.json'), `${JSON.stringify(summary, null, 2)}\n`),
    fs.writeFile(path.join(outputDir, 'inventory.v1.json'), `${JSON.stringify(inventory, null, 2)}\n`),
  ]);

  process.stdout.write(
    `Datasets España · aguas subterráneas generados en ${outputDir}\n` +
    `- ${DATASETS.masses.outputName} (${massesFeatures.length} masas)\n` +
    '- summary.v1.json\n' +
    '- inventory.v1.json\n'
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
