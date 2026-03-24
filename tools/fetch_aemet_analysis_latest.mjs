#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, '..');
const outputPath = path.join(workspaceRoot, 'aquarisk-data/weather/spain/aemet-analysis-latest.v1.json');
const endpoint = 'https://opendata.aemet.es/opendata/api/mapasygraficos/analisis';
const specUrl = 'https://opendata.aemet.es/AEMET_OpenData_specification.json';
const portalUrl = 'https://opendata.aemet.es/dist/index.html#/mapas-y-graficos/Mapas%20de%20an%C3%A1lisis.%20%C3%9Altima%20pasada.';
const apiKey = process.env.AEMET_OPENDATA_API_KEY || process.env.AEMET_API_KEY || '';

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} al consultar ${url}`);
  }
  return response.json();
}

async function fetchWithFallback(url, headers) {
  try {
    return await fetchJson(url, { headers });
  } catch (error) {
    return fetchJson(url);
  }
}

async function writeBlockedPlaceholder() {
  const payload = {
    version: 'v1',
    country: 'España',
    product: 'AEMET OpenData · Mapas de análisis · última pasada',
    status: 'blocked_missing_api_key',
    last_verified_at: new Date().toISOString().slice(0, 10),
    requires_secret: true,
    secret_name: 'AEMET_OPENDATA_API_KEY',
    refresh_cadence_hours: 12,
    endpoint_path: '/api/mapasygraficos/analisis',
    specification_url: specUrl,
    portal_url: portalUrl,
    summary: 'Artefacto reservado para el contexto sinóptico oficial de España. La ingestión queda preparada pero no se activa sin api_key válida en cabecera.',
    activation: {
      builder: '/tools/fetch_aemet_analysis_latest.mjs',
      command: 'AEMET_OPENDATA_API_KEY=... node tools/fetch_aemet_analysis_latest.mjs',
      output: '/aquarisk-data/weather/spain/aemet-analysis-latest.v1.json',
    },
    items: [],
  };
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  if (!apiKey) {
    await writeBlockedPlaceholder();
    console.error('Falta AEMET_OPENDATA_API_KEY o AEMET_API_KEY. Se dejó el placeholder bloqueado en aquarisk-data/weather/spain.');
    process.exit(1);
  }

  const envelope = await fetchJson(endpoint, {
    headers: {
      api_key: apiKey,
      accept: 'application/json',
    },
  });

  const dataUrl = envelope?.datos;
  const items = dataUrl
    ? await fetchWithFallback(dataUrl, {
        api_key: apiKey,
        accept: 'application/json',
      })
    : [];

  const payload = {
    version: 'v1',
    country: 'España',
    product: 'AEMET OpenData · Mapas de análisis · última pasada',
    status: 'active',
    last_verified_at: new Date().toISOString().slice(0, 10),
    requires_secret: true,
    secret_name: 'AEMET_OPENDATA_API_KEY',
    refresh_cadence_hours: 12,
    endpoint_path: '/api/mapasygraficos/analisis',
    specification_url: specUrl,
    portal_url: portalUrl,
    envelope,
    items: Array.isArray(items) ? items : [items],
    activation: {
      builder: '/tools/fetch_aemet_analysis_latest.mjs',
      command: 'AEMET_OPENDATA_API_KEY=... node tools/fetch_aemet_analysis_latest.mjs',
      output: '/aquarisk-data/weather/spain/aemet-analysis-latest.v1.json',
    },
  };

  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`AEMET análisis actualizado: ${Array.isArray(payload.items) ? payload.items.length : 0} items -> ${outputPath}`);
}

main().catch(async (error) => {
  await writeBlockedPlaceholder().catch(() => {});
  console.error(error.message || error);
  process.exit(1);
});
