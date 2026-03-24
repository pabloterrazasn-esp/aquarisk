#!/usr/bin/env node

import { createGunzip } from 'node:zlib';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DEFAULT_DATA_ROOT = path.join(ROOT_DIR, 'workspace-data', 'raw', 'dem');
const DEFAULT_SOURCE_PRIORITY = 'oficial_primero_con_fallback_abierto_trazable';
const TODAY = new Date().toISOString().slice(0, 10);

function printHelp() {
  console.log(`
Uso:
  node tools/download_dem_sources.mjs skadi-bbox --name <slug> --country <country> --bbox minLon,minLat,maxLon,maxLat [opciones]
  node tools/download_dem_sources.mjs url-manifest --manifest <ruta-json> [opciones]

Comandos:
  skadi-bbox
    Descarga tiles SRTM/Skadi a partir de un bbox. Sirve como fallback publico inmediato.

  url-manifest
    Descarga cualquier DEM listado en un manifiesto JSON. Sirve para fuentes oficiales o premium
    como CNIG o Copernicus cuando ya tienes URLs concretas o un lote preparado.

Opciones comunes:
  --data-root <ruta>      Directorio base para raw DEMs. Default: ${DEFAULT_DATA_ROOT}
  --out-dir <ruta>        Directorio final explicito para esta adquisicion
  --dry-run               No descarga; solo imprime plan y manifiesto
  --overwrite             Re-descarga archivos existentes
  --expand                Descomprime .gz a un directorio expanded/
  --source-priority <v>   Default: ${DEFAULT_SOURCE_PRIORITY}
  --last-verified-at <d>  Default: ${TODAY}

Opciones skadi-bbox:
  --bbox <minLon,minLat,maxLon,maxLat>
  --country <country>
  --dataset <slug>        Default: srtm-skadi
  --name <slug>

Opciones url-manifest:
  --manifest <ruta-json>

Ejemplos:
  node tools/download_dem_sources.mjs skadi-bbox --country bolivia --name tarija-test --bbox -64.75,-21.60,-64.65,-21.50 --expand
  node tools/download_dem_sources.mjs url-manifest --manifest tools/templates/spain-cnig-dem.example.json --dry-run
`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function ensureDir(target) {
  fs.mkdirSync(target, { recursive: true });
}

function readJson(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function writeJson(jsonPath, payload) {
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
}

function slugify(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unnamed';
}

function parseBbox(raw) {
  const parts = String(raw || '')
    .split(',')
    .map((part) => Number(part.trim()));
  if (parts.length !== 4 || parts.some((value) => !Number.isFinite(value))) {
    throw new Error('El bbox debe tener 4 numeros: minLon,minLat,maxLon,maxLat');
  }
  const [minLon, minLat, maxLon, maxLat] = parts;
  if (minLon >= maxLon || minLat >= maxLat) {
    throw new Error('El bbox es invalido: min debe ser menor que max');
  }
  return { minLon, minLat, maxLon, maxLat };
}

function latLonToSkadiCode(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  const latAbs = String(Math.abs(lat)).padStart(2, '0');
  const lonAbs = String(Math.abs(lon)).padStart(3, '0');
  return `${ns}${latAbs}/${ns}${latAbs}${ew}${lonAbs}`;
}

function buildSkadiTiles(bbox) {
  const lonStart = Math.floor(bbox.minLon);
  const lonEnd = Math.ceil(bbox.maxLon) - 1;
  const latStart = Math.floor(bbox.minLat);
  const latEnd = Math.ceil(bbox.maxLat) - 1;
  const tiles = [];
  for (let lat = latStart; lat <= latEnd; lat += 1) {
    for (let lon = lonStart; lon <= lonEnd; lon += 1) {
      const code = latLonToSkadiCode(lat, lon);
      const tileName = code.split('/')[1];
      tiles.push({
        code,
        tileName,
        url: `https://elevation-tiles-prod.s3.amazonaws.com/skadi/${code}.hgt.gz`,
        filename: `${tileName}.hgt.gz`,
      });
    }
  }
  return tiles;
}

function buildOutputRoot(args, defaults) {
  if (args['out-dir']) return path.resolve(args['out-dir']);
  const dataRoot = path.resolve(args['data-root'] || DEFAULT_DATA_ROOT);
  return path.join(
    dataRoot,
    slugify(defaults.country || 'unknown'),
    slugify(defaults.dataset || defaults.provider || 'dem'),
    slugify(defaults.name || 'acquisition')
  );
}

async function fetchToFile(url, destPath) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status} para ${url}`);
  }
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(destPath));
}

async function sha256Of(filePath) {
  const hash = createHash('sha256');
  await pipeline(fs.createReadStream(filePath), hash);
  return hash.digest('hex');
}

async function maybeExpandGzip(filePath, expandedDir) {
  if (!filePath.endsWith('.gz')) return null;
  ensureDir(expandedDir);
  const expandedPath = path.join(expandedDir, path.basename(filePath, '.gz'));
  if (fs.existsSync(expandedPath)) return expandedPath;
  await pipeline(fs.createReadStream(filePath), createGunzip(), fs.createWriteStream(expandedPath));
  return expandedPath;
}

async function processFiles(files, options) {
  const sourceDir = path.join(options.outputRoot, 'source');
  const expandedDir = path.join(options.outputRoot, 'expanded');
  ensureDir(sourceDir);
  const results = [];

  for (const file of files) {
    const destPath = path.join(sourceDir, file.filename);
    const entry = {
      ...file,
      destination: destPath,
      status: 'pending',
      downloaded_at: null,
      sha256: null,
      expanded_to: null,
    };

    if (options.dryRun) {
      entry.status = fs.existsSync(destPath) ? 'exists' : 'planned';
      results.push(entry);
      continue;
    }

    if (fs.existsSync(destPath) && !options.overwrite) {
      entry.status = 'exists';
    } else {
      await fetchToFile(file.url, destPath);
      entry.status = 'downloaded';
      entry.downloaded_at = new Date().toISOString();
    }

    if (fs.existsSync(destPath)) {
      entry.sha256 = await sha256Of(destPath);
      if (options.expand) {
        entry.expanded_to = await maybeExpandGzip(destPath, expandedDir);
      }
    }

    results.push(entry);
  }

  return results;
}

function normalizeManifestFile(file) {
  if (!file.url) {
    throw new Error('Cada fichero del manifiesto debe incluir url');
  }
  const fallbackName = path.basename(String(file.url).split('?')[0] || '');
  return {
    url: file.url,
    filename: file.filename || fallbackName || `file-${Date.now()}`,
    note: file.note || '',
    sha256_expected: file.sha256 || null,
  };
}

async function runSkadiBbox(args) {
  if (!args.name || !args.country || !args.bbox) {
    throw new Error('skadi-bbox requiere --name, --country y --bbox');
  }
  const bbox = parseBbox(args.bbox);
  const dataset = args.dataset || 'srtm-skadi';
  const outputRoot = buildOutputRoot(args, {
    country: args.country,
    dataset,
    name: args.name,
  });
  const files = buildSkadiTiles(bbox);
  const manifest = {
    version: 'v1',
    mode: 'skadi-bbox',
    provider: 'skadi',
    country: args.country,
    dataset,
    name: args.name,
    bbox,
    source_priority: args['source-priority'] || DEFAULT_SOURCE_PRIORITY,
    last_verified_at: args['last-verified-at'] || TODAY,
    created_at: new Date().toISOString(),
    output_root: outputRoot,
    notes: [
      'Fallback publico inmediato para pilotos y backbone DEM ligero.',
      'No sustituye por si mismo una fuente oficial nacional o un DEM premium de proyecto.',
    ],
    files,
  };

  const processed = await processFiles(files, {
    outputRoot,
    dryRun: Boolean(args['dry-run']),
    overwrite: Boolean(args.overwrite),
    expand: Boolean(args.expand),
  });
  manifest.files = processed;
  manifest.status = args['dry-run'] ? 'planned' : 'ready';

  if (!args['dry-run']) {
    ensureDir(outputRoot);
    writeJson(path.join(outputRoot, 'acquisition.manifest.v1.json'), manifest);
  }

  console.log(JSON.stringify(manifest, null, 2));
}

async function runUrlManifest(args) {
  if (!args.manifest) {
    throw new Error('url-manifest requiere --manifest');
  }
  const manifestPath = path.resolve(args.manifest);
  const manifest = readJson(manifestPath);
  const provider = manifest.provider || 'custom';
  const country = manifest.country || 'unknown';
  const dataset = manifest.dataset || provider;
  const name = manifest.name || path.basename(manifestPath, path.extname(manifestPath));
  const outputRoot = buildOutputRoot(args, { country, dataset, name, provider });
  const files = Array.isArray(manifest.files) ? manifest.files.map(normalizeManifestFile) : [];

  if (!files.length) {
    throw new Error('El manifiesto no incluye files[]');
  }

  const effective = {
    version: manifest.version || 'v1',
    mode: 'url-manifest',
    provider,
    country,
    dataset,
    name,
    source_priority: args['source-priority'] || manifest.source_priority || DEFAULT_SOURCE_PRIORITY,
    last_verified_at: args['last-verified-at'] || manifest.last_verified_at || TODAY,
    created_at: new Date().toISOString(),
    output_root: outputRoot,
    source_manifest: manifestPath,
    notes: manifest.notes || [],
    files,
  };

  const processed = await processFiles(files, {
    outputRoot,
    dryRun: Boolean(args['dry-run']),
    overwrite: Boolean(args.overwrite),
    expand: Boolean(args.expand),
  });
  effective.files = processed;
  effective.status = args['dry-run'] ? 'planned' : 'ready';

  if (!args['dry-run']) {
    ensureDir(outputRoot);
    writeJson(path.join(outputRoot, 'acquisition.manifest.v1.json'), effective);
  }

  console.log(JSON.stringify(effective, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const command = args._[0];

  if (!command || command === 'help' || args.help) {
    printHelp();
    return;
  }

  if (command === 'skadi-bbox') {
    await runSkadiBbox(args);
    return;
  }

  if (command === 'url-manifest') {
    await runUrlManifest(args);
    return;
  }

  throw new Error(`Comando no soportado: ${command}`);
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
