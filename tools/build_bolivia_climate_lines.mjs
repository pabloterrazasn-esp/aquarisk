#!/usr/bin/env node

import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile as execFileCb } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCb);

const ROOT_DIR = '/Users/pablo/Desktop/Claude Terranava';
const RISK_MUNICIPALITIES_PATH = path.join(ROOT_DIR, 'aquarisk-data', 'risk', 'bolivia', 'municipios.v1.geojson');
const OUTPUT_DIR = path.join(ROOT_DIR, 'aquarisk-data', 'climate-lines', 'bolivia');
const MAIN_MANIFEST_PATH = path.join(ROOT_DIR, 'aquarisk-data', 'manifest', 'index.v1.json');
const VERSION = 'v1';
const COUNTRY = 'Bolivia';
const BBOX = {
  minLon: -69.8,
  maxLon: -57.2,
  minLat: -23.2,
  maxLat: -9.2,
};
const GRID_SIZE = { width: 560, height: 620 };
const INTERPOLATION = 'invdist:power=2.0:smoothing=0.35:radius1=1.45:radius2=1.45:angle=0.0:max_points=16:min_points=1:nodata=-9999';
const LINE_CONFIG = {
  temperature: {
    key: 'temperature',
    sourceField: 'annual_t_mean_c',
    interval: 2,
    decimals: 0,
    unit: '°C',
    label: 'Isoterma media anual',
    shortLabel: 'Isotermas medias anuales',
    path: '/aquarisk-data/climate-lines/bolivia/isotermas-anuales.v1.geojson',
    color: '#bb6c3f',
    simplify: '0.01',
  },
  precipitation: {
    key: 'precipitation',
    sourceField: 'annual_p_mm',
    interval: 200,
    decimals: 0,
    unit: 'mm/año',
    label: 'Isoyeta anual',
    shortLabel: 'Isoyetas anuales',
    path: '/aquarisk-data/climate-lines/bolivia/isoyetas-anuales.v1.geojson',
    color: '#2563eb',
    simplify: '0.01',
  },
};

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatValue(value, decimals = 0) {
  return Number(value).toFixed(decimals);
}

function ensureFinite(value) {
  return Number.isFinite(value) ? value : null;
}

async function run(cmd, args) {
  try {
    await execFile(cmd, args, { maxBuffer: 1024 * 1024 * 20 });
  } catch (error) {
    const stderr = error.stderr?.toString().trim();
    const stdout = error.stdout?.toString().trim();
    const detail = stderr || stdout || error.message;
    throw new Error(`${cmd} ${args.join(' ')}\n${detail}`);
  }
}

function geometryHasCoordinates(geometry) {
  if (!geometry) return false;
  if (geometry.type === 'LineString') return Array.isArray(geometry.coordinates) && geometry.coordinates.length > 1;
  if (geometry.type === 'MultiLineString') {
    return Array.isArray(geometry.coordinates) && geometry.coordinates.some((line) => Array.isArray(line) && line.length > 1);
  }
  return false;
}

function collectMunicipalitySamples(geojson) {
  return (geojson?.features || [])
    .map((feature) => {
      const props = feature?.properties || {};
      const lon = ensureFinite(Number(props.centroid_lon));
      const lat = ensureFinite(Number(props.centroid_lat));
      const annualT = ensureFinite(Number(props.annual_t_mean_c));
      const annualP = ensureFinite(Number(props.annual_p_mm));
      if (lon == null || lat == null || annualT == null || annualP == null) return null;
      return {
        municipality_code: String(props.municipality_code || ''),
        municipality: props.municipality || '',
        department: props.department || '',
        lon,
        lat,
        annual_t_mean_c: annualT,
        annual_p_mm: annualP,
      };
    })
    .filter(Boolean);
}

function buildPointFeatureCollection(samples) {
  return {
    type: 'FeatureCollection',
    features: samples.map((sample) => ({
      type: 'Feature',
      properties: {
        municipality_code: sample.municipality_code,
        municipality: sample.municipality,
        department: sample.department,
        annual_t_mean_c: sample.annual_t_mean_c,
        annual_p_mm: sample.annual_p_mm,
      },
      geometry: {
        type: 'Point',
        coordinates: [sample.lon, sample.lat],
      },
    })),
  };
}

function buildContourProperties(config, value, sampleCount) {
  const rounded = round(Number(value), config.decimals);
  return {
    value: rounded,
    label: `${formatValue(rounded, config.decimals)} ${config.unit}`,
    line_kind: config.key,
    line_label: config.label,
    source_label: 'Derivado TerraNava · superficie climática Bolivia',
    unit: config.unit,
    interval: config.interval,
    sample_count: sampleCount,
    country: COUNTRY,
    quality_flag: 'Derivado TerraNava v1 · interpolación IDW',
  };
}

async function buildContourDataset(config, pointsPath, municipalitiesPath, tempDir, sampleCount) {
  const rawRasterPath = path.join(tempDir, `${config.key}.raw.tif`);
  const clippedRasterPath = path.join(tempDir, `${config.key}.clip.tif`);
  const rawContourPath = path.join(tempDir, `${config.key}.raw.geojson`);
  const simplifiedContourPath = path.join(tempDir, `${config.key}.simplified.geojson`);
  const finalOutputPath = path.join(OUTPUT_DIR, path.basename(config.path));

  await run('gdal_grid', [
    '-a_srs', 'EPSG:4326',
    '-a', INTERPOLATION,
    '-zfield', config.sourceField,
    '-txe', String(BBOX.minLon), String(BBOX.maxLon),
    '-tye', String(BBOX.minLat), String(BBOX.maxLat),
    '-outsize', String(GRID_SIZE.width), String(GRID_SIZE.height),
    '-ot', 'Float32',
    '-of', 'GTiff',
    pointsPath,
    rawRasterPath,
  ]);

  await run('gdalwarp', [
    '-of', 'GTiff',
    '-cutline', municipalitiesPath,
    '-crop_to_cutline',
    '-dstnodata', '-9999',
    rawRasterPath,
    clippedRasterPath,
  ]);

  await run('gdal_contour', [
    '-a', 'value',
    '-i', String(config.interval),
    clippedRasterPath,
    rawContourPath,
  ]);

  await run('ogr2ogr', [
    '-f', 'GeoJSON',
    '-lco', 'RFC7946=YES',
    '-simplify', config.simplify,
    simplifiedContourPath,
    rawContourPath,
  ]);

  const simplified = JSON.parse(await fs.readFile(simplifiedContourPath, 'utf8'));
  const features = (simplified?.features || [])
    .filter((feature) => geometryHasCoordinates(feature.geometry))
    .map((feature, index) => {
      const value = Number(feature?.properties?.value);
      return {
        ...feature,
        properties: {
          id: `${config.key}-${index + 1}`,
          ...buildContourProperties(config, value, sampleCount),
        },
      };
    })
    .sort((a, b) => Number(a.properties.value) - Number(b.properties.value));

  await fs.writeFile(
    finalOutputPath,
    JSON.stringify({ type: 'FeatureCollection', features }),
    'utf8',
  );

  const uniqueValues = [...new Set(features.map((feature) => Number(feature.properties.value)))];
  return {
    key: config.key,
    feature_count: features.length,
    contour_values: uniqueValues,
    min_value: uniqueValues.length ? uniqueValues[0] : null,
    max_value: uniqueValues.length ? uniqueValues[uniqueValues.length - 1] : null,
    path: config.path,
  };
}

async function updateMainManifest() {
  const manifest = JSON.parse(await fs.readFile(MAIN_MANIFEST_PATH, 'utf8'));
  manifest.generated_at = new Date().toISOString();
  manifest.climate_lines = {
    ...(manifest.climate_lines || {}),
    bolivia: {
      summary: '/aquarisk-data/climate-lines/bolivia/summary.v1.json',
      annual_temperature_isotherms: LINE_CONFIG.temperature.path,
      annual_precipitation_isohyets: LINE_CONFIG.precipitation.path,
    },
  };
  await fs.writeFile(MAIN_MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const municipalities = JSON.parse(await fs.readFile(RISK_MUNICIPALITIES_PATH, 'utf8'));
  const samples = collectMunicipalitySamples(municipalities);
  if (!samples.length) {
    throw new Error('No se encontraron muestras municipales con clima anual en Bolivia.');
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aquarisk-bolivia-climate-lines-'));
  const pointGeojsonPath = path.join(tempDir, 'municipality-centroids.geojson');

  try {
    await fs.writeFile(
      pointGeojsonPath,
      JSON.stringify(buildPointFeatureCollection(samples)),
      'utf8',
    );

    const outputs = {};
    for (const config of Object.values(LINE_CONFIG)) {
      outputs[config.key] = await buildContourDataset(
        config,
        pointGeojsonPath,
        RISK_MUNICIPALITIES_PATH,
        tempDir,
        samples.length,
      );
    }

    const summary = {
      version: VERSION,
      generated_at: new Date().toISOString(),
      country: COUNTRY,
      sample_count: samples.length,
      methodology: {
        interpolation: 'IDW (gdal_grid · invdist)',
        grid_size: GRID_SIZE,
        bbox: BBOX,
        source_points: '/aquarisk-data/risk/bolivia/municipios.v1.geojson',
        source_label: 'Síntesis municipal TerraNava Bolivia · HydroBASINS dominante + calibración SENAMHI',
      },
      datasets: {
        temperature: {
          label: LINE_CONFIG.temperature.shortLabel,
          unit: LINE_CONFIG.temperature.unit,
          interval: LINE_CONFIG.temperature.interval,
          path: LINE_CONFIG.temperature.path,
          ...outputs.temperature,
        },
        precipitation: {
          label: LINE_CONFIG.precipitation.shortLabel,
          unit: LINE_CONFIG.precipitation.unit,
          interval: LINE_CONFIG.precipitation.interval,
          path: LINE_CONFIG.precipitation.path,
          ...outputs.precipitation,
        },
      },
      caveats: [
        'Las isolíneas son un derivado TerraNava interpolado desde la síntesis climática municipal de Bolivia; no sustituyen cartas climáticas oficiales.',
        'La capa busca lectura territorial continua y comparación hidrológica entre cuencas, manteniendo la experiencia AquaRisk local-first.',
      ],
    };

    await fs.writeFile(
      path.join(OUTPUT_DIR, 'summary.v1.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    );

    await updateMainManifest();

    console.log(`Climate lines Bolivia built from ${samples.length} municipal samples.`);
    console.log(`Temperature contours: ${outputs.temperature.feature_count}`);
    console.log(`Precipitation contours: ${outputs.precipitation.feature_count}`);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
