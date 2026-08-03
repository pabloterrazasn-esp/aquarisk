#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = path.resolve('/Users/pablo/Desktop/Claude Terranava');
const sourceInventoryPath = path.join(
  repoRoot,
  'workspace-data',
  'reference',
  'spain-premium',
  'source-inventory.v1.json',
);
const outputDir = path.join(repoRoot, 'aquarisk-data', 'stations', 'spain');
const rawGmlPath = process.env.SPAIN_ROEA_GML_PATH
  || '/Volumes/Crucial X10/Data/TerraNava/raw/stations/spain/miteco-aforos/browser-download/gml/extracted/4capas.gml';
const lastVerifiedAt = '2026-03-11';
const sourcePriority = 'oficial_primero_con_fallback_abierto_trazable';
const sourceLabel = 'MITECO · Anuario de Aforos 2020-21 (SAIH-ROEA)';
const sourceDownloadUrl = 'https://www.mapama.gob.es/app/descargas/descargafichero.aspx?f=gml-roea.zip';
const wmsServiceMeta = {
  type: 'wms',
  label: 'MITECO · Red Integrada de Estaciones de Aforos (SAIH-ROEA)',
  url: 'https://wms.mapama.gob.es/sig/Agua/Aforos/wms.aspx',
  layers: 'EF.EnvironmentalMonitoringFacilities',
  capabilities: 'https://wms.mapama.gob.es/sig/Agua/Aforos/wms.aspx?request=GetCapabilities&Service=WMS',
  status: 'verified_http_200',
};

const statusColors = {
  operativa: '#0f766e',
  histórica: '#64748b',
  'pendiente de verificación': '#d97706',
};

const typeLabels = {
  rio: 'Aforo en río',
  embalse: 'Embalse',
  conduccion: 'Conducción',
  evaporimetrica: 'Estación evaporimétrica',
  sin_clasificar: 'Estación hidrológica',
};

const operatorAliases = new Map([
  ['c h duero', 'C.H. Duero'],
  ['c h tajo', 'C.H. Tajo'],
  ['c h ebro', 'C.H. Ebro'],
  ['c h guadiana', 'C.H. Guadiana'],
  ['c h guadalquivir', 'C.H. Guadalquivir'],
  ['c h segura', 'C.H. Segura'],
  ['augas de galicia xunta de galicia', 'Augas de Galicia · Xunta de Galicia'],
]);

const provinceAliases = new Map([
  ['asturias principado', 'Asturias'],
  ['asturias provincia', 'Asturias'],
  ['burgos provincia', 'Burgos'],
  ['la rioja provincia', 'La Rioja'],
  ['murcia provincia', 'Murcia'],
  ['navarra comunidad foral', 'Navarra'],
  ['navarra provincia', 'Navarra'],
  ['ourense orense', 'Ourense / Orense'],
  ['orense', 'Ourense / Orense'],
  ['gerona', 'Girona'],
  ['almeria', 'Almería'],
  ['vizcaya', 'Vizcaya / Bizkaia'],
  ['bizkaia', 'Vizcaya / Bizkaia'],
  ['vizcaya bizkaia', 'Vizcaya / Bizkaia'],
  ['vizcaya bizkaia provincia', 'Vizcaya / Bizkaia'],
  ['sevilla provincia', 'Sevilla'],
  ['soria provincia', 'Soria'],
  ['zaragoza provincia', 'Zaragoza'],
]);

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function toTitleCase(value = '') {
  return String(value)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(' ');
}

function sanitizeProvince(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return 'España';
  if (/^[a-z]:\\/i.test(raw)) return 'España';

  const firstSegment = raw
    .split('/')
    .map((item) => item.trim())
    .find(Boolean) || raw;

  let cleaned = firstSegment
    .replace(/,\s*Provincia$/i, '')
    .replace(/,\s*Principado$/i, '')
    .replace(/,\s*Comunidad Foral$/i, '')
    .trim();

  const normalized = normalizeText(cleaned);
  return provinceAliases.get(normalized) || cleaned || 'España';
}

function canonicalOperator(value = '') {
  if (!value) return 'MITECO / organismo no identificado';
  const normalized = normalizeText(value).replace(/\./g, '');
  return operatorAliases.get(normalized) || value.replace(/\s+/g, ' ').trim();
}

function mapStationStatus(value = '') {
  const normalized = normalizeText(value);
  if (normalized === 'alta') return 'operativa';
  if (normalized === 'baja') return 'histórica';
  return 'pendiente de verificación';
}

function mapSituation(value = '') {
  const normalized = normalizeText(value);
  if (!normalized) return 'rio';
  if (normalized.includes('embalse')) return 'embalse';
  if (normalized.includes('conduccion')) return 'conduccion';
  if (normalized.includes('evaporimetrica')) return 'evaporimetrica';
  return 'sin_clasificar';
}

function toFiniteNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function bboxFromFeatures(features = []) {
  const coords = features
    .map((feature) => feature?.geometry?.coordinates)
    .filter((pair) => Array.isArray(pair) && Number.isFinite(pair[0]) && Number.isFinite(pair[1]));
  const lons = coords.map((pair) => pair[0]);
  const lats = coords.map((pair) => pair[1]);
  return {
    minLon: Number(Math.min(...lons).toFixed(6)),
    minLat: Number(Math.min(...lats).toFixed(6)),
    maxLon: Number(Math.max(...lons).toFixed(6)),
    maxLat: Number(Math.max(...lats).toFixed(6)),
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

function runOgrToGeoJSON(inputPath) {
  const tempPath = path.join(os.tmpdir(), `spain-roea-${Date.now()}.geojson`);
  const result = spawnSync('ogr2ogr', ['-f', 'GeoJSON', '-t_srs', 'EPSG:4326', tempPath, inputPath], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`ogr2ogr falló: ${result.stderr || result.stdout || 'sin detalle'}`);
  }
  return tempPath;
}

function buildCatalogs(sources = [], features = [], geojsonPath = null) {
  const byId = Object.fromEntries(sources.map((source) => [source.id, source]));
  const statusCounts = sortEntries(countBy(features, (feature) => feature.properties?.operational_status));
  const situationCounts = sortEntries(countBy(features, (feature) => feature.properties?.station_type_label));
  return [
    {
      key: 'meteorological_official',
      label: 'Estaciones meteorológicas oficiales',
      operator: 'AEMET',
      status: 'planned',
      service_level: 'L1',
      coverage_level: 'Inventario premium en preparación',
      access_mode: 'opendata_official',
      source: byId.aemet_opendata || null,
      intended_outputs: [
        'catálogo de estaciones meteorológicas',
        'metadatos de operador y verificación',
        'soporte a climatología premium',
      ],
      limits: 'Pendiente de integración programática y control de cobertura por cuenca.',
    },
    {
      key: 'hydrological_official',
      label: 'Estaciones hidrológicas oficiales',
      operator: 'MITECO',
      status: features.length ? 'active' : 'planned',
      service_level: 'L2',
      coverage_level: features.length
        ? 'Catálogo georreferenciado oficial activo · España'
        : 'Catálogo premium en preparación',
      access_mode: 'official_gml_wms',
      source: byId.miteco_aforos || null,
      source_download_url: sourceDownloadUrl,
      geojson: geojsonPath,
      wms: wmsServiceMeta,
      station_count: features.length || null,
      status_counts: features.length ? statusCounts : null,
      situation_counts: features.length ? situationCounts : null,
      intended_outputs: [
        'catálogo georreferenciado de aforos',
        'metadatos hidrológicos oficiales',
        'soporte a trazabilidad de informes por cuenca',
        'capa observacional premium en AquaRisk',
      ],
      limits: features.length
        ? 'Corresponde al Anuario de Aforos 2020-21; no implica disponibilidad operativa en tiempo real ni actualización instantánea.'
        : 'Pendiente de normalización y georreferenciación unificada por cuenca.',
    },
    {
      key: 'hydrological_operational_reference',
      label: 'Referencia operativa hidrológica',
      operator: 'MITECO / SAIH',
      status: 'planned',
      service_level: 'L1',
      coverage_level: 'Referencia operativa en preparación',
      access_mode: 'official_support',
      source: byId.miteco_saih || null,
      intended_outputs: [
        'control QA de estaciones',
        'contraste operativo de red hidrológica',
        'soporte a estados de verificación',
      ],
      limits: 'No se publicará como servicio operativo AquaRisk mientras no exista pipeline y QA específicos.',
    },
  ];
}

async function main() {
  const [inventoryRaw] = await Promise.all([
    fs.readFile(sourceInventoryPath, 'utf8'),
    fs.access(rawGmlPath),
  ]);
  const inventory = JSON.parse(inventoryRaw);

  const tempGeojsonPath = runOgrToGeoJSON(rawGmlPath);
  const geojsonRaw = await fs.readFile(tempGeojsonPath, 'utf8');
  await fs.rm(tempGeojsonPath, { force: true });
  const sourceGeojson = JSON.parse(geojsonRaw);

  const features = (sourceGeojson.features || [])
    .map((feature) => {
      const props = feature?.properties || {};
      const coords = feature?.geometry?.coordinates || [];
      const lon = toFiniteNumber(coords[0]);
      const lat = toFiniteNumber(coords[1]);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;

      const status = mapStationStatus(props.ESTADO);
      const stationType = mapSituation(props.SITUACION_);
      const operator = canonicalOperator(props.ORGANISMO_);
      const hydroCode = props.COD_HIDRO != null ? String(props.COD_HIDRO) : null;
      const stationName = String(props.NOM_ANUARI || hydroCode || 'Estación hidrológica').trim();
      const province = props.PROVINCIA ? sanitizeProvince(String(props.PROVINCIA)) : 'España';
      const municipality = props.TERMINO_MU ? String(props.TERMINO_MU).trim() : province;
      const riverName = props.RIO ? String(props.RIO).trim() : 'Sin cauce declarado';
      const stationTypeLabel = typeLabels[stationType] || typeLabels.sin_clasificar;

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [Number(lon.toFixed(6)), Number(lat.toFixed(6))],
        },
        properties: {
          station_id: hydroCode ? `es-miteco-${hydroCode}` : `es-miteco-${props.gml_id || stationName}`,
          station_name: stationName,
          network_type: 'hydrological',
          network_label: 'Aforo oficial España',
          operational_status: status,
          marker_color: '#0b4f6c',
          status_color: statusColors[status] || '#0b4f6c',
          operator,
          source_label: sourceLabel,
          source_url: inventory.sources?.find((item) => item.id === 'miteco_aforos')?.url || null,
          source_download_url: sourceDownloadUrl,
          service_level: 'L2',
          source_priority: sourcePriority,
          last_verified_at: lastVerifiedAt,
          is_official_coordinate: true,
          location_quality: 'Coordenada oficial MITECO · GML Inspire',
          confidence: 'high',
          confidence_label: 'Alta',
          department: province,
          municipality,
          macrobasin_label: operator,
          variables_label: stationTypeLabel,
          station_type: stationType,
          station_type_label: stationTypeLabel,
          country: 'España',
          river_name: riverName,
          basin_authority: operator,
          province,
          hydro_code: hydroCode,
          cod_saih: props.COD_SAIH != null ? String(props.COD_SAIH) : null,
          cod_saica: props.COD_SAICA != null ? String(props.COD_SAICA) : null,
          cod_dma: props.COD_DMA != null ? String(props.COD_DMA) : null,
          year_start: toFiniteNumber(props.ANO_INICIO),
          year_end: toFiniteNumber(props.ANO_FIN_ME),
          catchment_area_km2: toFiniteNumber(props.CUENCA_REC),
          elevation_m: toFiniteNumber(props.COTA_Z),
          ownership: props.PROPIETARI || null,
          river_regime: props.REGIMEN_RI || null,
          station_structure: props.TIPO_ESTAC || null,
          sensor_primary: props.SENSOR_1 || null,
          photo_ref: props.FOTOGRAFIA || null,
          plan_ref: props.PLANO || null,
          section_ref: props.SECCION || null,
          official_dataset: 'SAIH-ROEA 2020-21',
          series_scope_label: 'Catálogo oficial de estaciones hidrológicas',
          series_available: status === 'operativa',
        },
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.properties.station_name).localeCompare(String(b.properties.station_name), 'es'));

  const bounds = bboxFromFeatures(features);
  const center = {
    lat: Number(((bounds.minLat + bounds.maxLat) / 2).toFixed(6)),
    lon: Number(((bounds.minLon + bounds.maxLon) / 2).toFixed(6)),
  };

  const outputGeojson = {
    type: 'FeatureCollection',
    name: 'spain_official_hydrological_stations_v1',
    crs: {
      type: 'name',
      properties: {
        name: 'EPSG:4326',
      },
    },
    features,
  };

  const geojsonOutputPath = '/aquarisk-data/stations/spain/stations.v1.geojson';
  const catalogs = buildCatalogs(inventory.sources || [], features, geojsonOutputPath);

  const summary = {
    version: 'v1',
    country: 'España',
    label: 'Inventario premium de estaciones · España',
    status: 'active',
    service_level: 'L2',
    coverage_level: 'Catálogo georreferenciado oficial · España',
    source_priority: inventory.policy || sourcePriority,
    last_verified_at: lastVerifiedAt,
    catalog_count: catalogs.length,
    station_count: features.length,
    hydrological_official_count: features.length,
    station_count_note: `${features.length.toLocaleString('es-ES')} estaciones oficiales georreferenciadas del Anuario de Aforos 2020-21.`,
    summary_note:
      `AquaRisk integra un catálogo georreferenciado oficial de ${features.length.toLocaleString('es-ES')} estaciones hidrológicas de MITECO (SAIH-ROEA 2020-21). El WMS oficial sigue disponible como apoyo visual y de verificación.`,
    operator_counts: sortEntries(countBy(features, (feature) => feature.properties?.operator)),
    status_counts: sortEntries(countBy(features, (feature) => feature.properties?.operational_status)),
    station_type_counts: sortEntries(countBy(features, (feature) => feature.properties?.station_type_label)),
    province_counts: sortEntries(countBy(features, (feature) => feature.properties?.province)),
    suggested_view: {
      center,
      zoom: 6,
      bounds,
    },
    catalogs: catalogs.map((catalog) => ({
      key: catalog.key,
      label: catalog.label,
      operator: catalog.operator,
      status: catalog.status,
      access_mode: catalog.access_mode,
      service_level: catalog.service_level,
      coverage_level: catalog.coverage_level,
      station_count: catalog.station_count || null,
    })),
  };

  const detailedInventory = {
    version: 'v1',
    country: 'España',
    label: 'Inventario premium de estaciones · España',
    verified_at: lastVerifiedAt,
    policy: inventory.policy || sourcePriority,
    source_gml_path: rawGmlPath,
    summary_note: summary.summary_note,
    bbox: bounds,
    catalogs,
    sample_fields: [
      'COD_HIDRO',
      'NOM_ANUARI',
      'ESTADO',
      'SITUACION_',
      'ORGANISMO_',
      'RIO',
      'TERMINO_MU',
      'PROVINCIA',
      'ANO_INICIO',
      'COTA_Z',
    ],
  };

  await fs.mkdir(outputDir, { recursive: true });
  await Promise.all([
    fs.writeFile(path.join(outputDir, 'stations.v1.geojson'), `${JSON.stringify(outputGeojson)}\n`),
    fs.writeFile(path.join(outputDir, 'summary.v1.json'), `${JSON.stringify(summary, null, 2)}\n`),
    fs.writeFile(path.join(outputDir, 'inventory.v1.json'), `${JSON.stringify(detailedInventory, null, 2)}\n`),
  ]);

  process.stdout.write(
    `Generado catálogo premium España en ${outputDir}\n` +
      `- stations.v1.geojson (${features.length} estaciones)\n` +
      `- summary.v1.json\n` +
      `- inventory.v1.json\n`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
