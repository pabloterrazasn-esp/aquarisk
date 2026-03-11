#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('/Users/pablo/Desktop/Claude Terranava');
const OUTPUT_DIR = path.join(ROOT, 'aquarisk-data', 'dem', 'bolivia');

const GUIDE_BASINS = [
  {
    id: 'bol-amazonica',
    name: 'Cuenca Amazónica · Bolivia',
    river: 'Río Mamoré / Beni / Madre de Dios',
    area_km2: 724000,
    main_channel_length_km: 1200,
    main_channel_slope_pct: 0.8,
    cn_ref: 72,
    climate_context: 'Tropical húmedo',
  },
  {
    id: 'bol-pilcomayo',
    name: 'Río Pilcomayo · Bolivia / Paraguay',
    river: 'Río Pilcomayo → Río Paraguay',
    area_km2: 97600,
    main_channel_length_km: 1100,
    main_channel_slope_pct: 1.8,
    cn_ref: 80,
    climate_context: 'Subtropical semiárido / Chaqueño',
  },
  {
    id: 'bol-pilcomayo-tarija',
    name: 'Río Pilcomayo (Alto) · Tarija, Bolivia',
    river: 'Río Pilcomayo superior',
    area_km2: 35200,
    main_channel_length_km: 340,
    main_channel_slope_pct: 4.2,
    cn_ref: 78,
    climate_context: 'Semiárido andino',
  },
  {
    id: 'bol-altiplano',
    name: 'Cuenca del Altiplano · Bolivia / Perú',
    river: 'Lago Titicaca → Desaguadero → Poopó / Uyuni',
    area_km2: 145000,
    main_channel_length_km: 560,
    main_channel_slope_pct: 0.4,
    cn_ref: 68,
    climate_context: 'Semiárido de altura',
  },
  {
    id: 'bol-mamore',
    name: 'Río Mamoré · Bolivia',
    river: 'Río Mamoré → Madeira',
    area_km2: 188000,
    main_channel_length_km: 1900,
    main_channel_slope_pct: 0.3,
    cn_ref: 70,
    climate_context: 'Tropical húmedo / Sabana',
  },
];

function estimateTcHours(lengthKm, slopePct, cn = 75) {
  const L = Number(lengthKm) * 1000;
  const S = Number(slopePct) / 100;
  const CN = Math.max(30, Math.min(98, Number(cn) || 75));
  if (!Number.isFinite(L) || !Number.isFinite(S) || S <= 0) return null;

  const tcKirpich = (0.0195 * Math.pow(L, 0.77) * Math.pow(S, -0.385)) / 60;
  const Lkm = L / 1000;
  const Jpct = S * 100;
  const tcTemez = 0.3 * Math.pow(Lkm / Math.pow(Jpct, 0.25), 0.76);
  const Lft = L * 3.28084;
  const Scn = (1000 / CN) - 10;
  const tcScs = Math.pow(Lft, 0.8) * Math.pow(Scn + 1, 0.7) / (1900 * Math.pow(S * 100, 0.5));

  return {
    mean_hours: Number(((tcKirpich + tcTemez + tcScs) / 3).toFixed(3)),
    kirpich_hours: Number(tcKirpich.toFixed(3)),
    temez_hours: Number(tcTemez.toFixed(3)),
    scs_lag_hours: Number(tcScs.toFixed(3)),
  };
}

async function writeJson(targetPath, payload) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

async function main() {
  const generatedAt = new Date().toISOString();
  const records = {};

  for (const basin of GUIDE_BASINS) {
    records[basin.id] = {
      id: basin.id,
      country: 'Bolivia',
      source_type: 'guide_basin',
      source_label: 'Motor morfométrico guía TerraNava',
      quality_flag: 'Derivado TerraNava v0 · geometría guía (sin DEM final)',
      confidence_label: 'Preliminar',
      morphometry_basis: 'guide_geometry',
      dem_status: 'pilot_geometry_ready_for_copernicus',
      name: basin.name,
      river: basin.river,
      climate_context: basin.climate_context,
      metrics: {
        area_km2: basin.area_km2,
        main_channel_length_km: basin.main_channel_length_km,
        main_channel_slope_pct: basin.main_channel_slope_pct,
        cn_ref: basin.cn_ref,
        tc_estimate: estimateTcHours(basin.main_channel_length_km, basin.main_channel_slope_pct, basin.cn_ref),
      },
      derivation: {
        terrain_source: 'Geometría guía TerraNava',
        intended_dem_source: 'Copernicus DEM GLO-30',
        tc_method: 'Promedio Kirpich + Témez + SCS Lag',
      },
      pending_fields: [
        'elevation_min_m',
        'elevation_max_m',
        'relief_m',
        'longitudinal_profile',
        'hypsometric_curve',
        'slope_raster',
        'hand_screening',
      ],
    };
  }

  const catalog = {
    version: 'v1',
    generated_at: generatedAt,
    country: 'Bolivia',
    label: 'Motor DEM piloto Bolivia',
    description: 'Catálogo piloto de morfometría para cuencas guía Bolivia. Prepara la arquitectura local-first del Motor DEM antes de la ingestión completa de Copernicus DEM GLO-30.',
    records,
  };

  const summary = {
    version: 'v1',
    generated_at: generatedAt,
    country: 'Bolivia',
    record_count: Object.keys(records).length,
    source_label: 'Motor DEM piloto Bolivia',
    source_quality: 'Derivado TerraNava v0 · geometría guía (sin DEM final)',
    intended_dem_source: 'Copernicus DEM GLO-30',
    implemented_metrics: ['area_km2', 'main_channel_length_km', 'main_channel_slope_pct', 'tc_estimate'],
    pending_metrics: ['elevation_range', 'relief', 'longitudinal_profile', 'hypsometry', 'slope_map', 'HAND'],
  };

  await writeJson(path.join(OUTPUT_DIR, 'morphometry-guide.v1.json'), catalog);
  await writeJson(path.join(OUTPUT_DIR, 'summary.v1.json'), summary);

  console.log(`Motor DEM piloto Bolivia generado: ${Object.keys(records).length} registros`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
