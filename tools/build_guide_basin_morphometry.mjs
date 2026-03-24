#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve('/Users/pablo/Desktop/Claude Terranava');
const CLIMATE_GUIDE_PATH = path.join(ROOT, 'aquarisk-data', 'climate', 'guide-basins.v1.json');
const OUTPUT_INDEX_PATH = path.join(ROOT, 'aquarisk-data', 'metadata', 'guide-morphometry.v1.json');
const OUTPUT_SUMMARY_PATH = path.join(ROOT, 'aquarisk-data', 'metadata', 'guide-morphometry-summary.v1.json');

const LAST_VERIFIED_AT = '2026-03-11';

const TOP_BASIN_TEMPLATES = {
  'bol-amazonica': {
    perimeter_km: 4200,
    main_channel_length_km: 1200,
    main_channel_slope_pct: 0.8,
    terrain_family: 'tropical_lowland',
    response_label: 'Llanura húmeda extensa',
  },
  'bol-pilcomayo': {
    perimeter_km: 2200,
    main_channel_length_km: 1100,
    main_channel_slope_pct: 1.8,
    terrain_family: 'chaco_transition',
    response_label: 'Cuenca semiárida de transición',
  },
  'bol-pilcomayo-tarija': {
    perimeter_km: 920,
    main_channel_length_km: 340,
    main_channel_slope_pct: 4.2,
    terrain_family: 'andean_valley',
    response_label: 'Cabeceras andinas activas',
  },
  'bol-altiplano': {
    perimeter_km: 1850,
    main_channel_length_km: 560,
    main_channel_slope_pct: 0.4,
    terrain_family: 'high_plateau',
    response_label: 'Sistema endorreico de altura',
  },
  'bol-mamore': {
    perimeter_km: 2600,
    main_channel_length_km: 1900,
    main_channel_slope_pct: 0.3,
    terrain_family: 'tropical_lowland',
    response_label: 'Gran llanura tropical almacenadora',
  },
  'es-guadalquivir': {
    perimeter_km: 1340,
    main_channel_length_km: 657,
    main_channel_slope_pct: 1.8,
    terrain_family: 'mediterranean_valley',
    response_label: 'Valle mediterráneo amplio',
  },
  'es-ebro': {
    perimeter_km: 1520,
    main_channel_length_km: 930,
    main_channel_slope_pct: 1.4,
    terrain_family: 'continental_mixed',
    response_label: 'Cuenca mixta pirenaica y continental',
  },
  'es-duero': {
    perimeter_km: 1480,
    main_channel_length_km: 897,
    main_channel_slope_pct: 1.1,
    terrain_family: 'plateau_river',
    response_label: 'Meseta fluvial extensa',
  },
  'es-tajo': {
    perimeter_km: 1480,
    main_channel_length_km: 1007,
    main_channel_slope_pct: 0.9,
    terrain_family: 'mediterranean_plateau',
    response_label: 'Plataforma mediterránea estructurada',
  },
  'es-jucar': {
    perimeter_km: 1080,
    main_channel_length_km: 498,
    main_channel_slope_pct: 2.1,
    terrain_family: 'mediterranean_semiarid',
    response_label: 'Cuenca mediterránea semiárida y torrencial',
  },
  'es-miño': {
    perimeter_km: 720,
    main_channel_length_km: 340,
    main_channel_slope_pct: 2.8,
    terrain_family: 'atlantic_mountain',
    response_label: 'Cuenca atlántica montañosa',
  },
};

const FAMILY_PRESETS = {
  tropical_lowland: {
    kc: 1.56,
    drainageDensity: 0.42,
    profile: [100, 96, 91, 84, 76, 66, 55, 43, 30, 16, 0],
    hypsometry: [100, 97, 93, 87, 79, 69, 56, 42, 28, 14, 0],
    label: 'Llanura húmeda con pendiente longitudinal baja y amplia capacidad de almacenamiento.',
  },
  chaco_transition: {
    kc: 1.44,
    drainageDensity: 0.58,
    profile: [100, 95, 89, 81, 72, 61, 49, 36, 24, 11, 0],
    hypsometry: [100, 95, 90, 83, 75, 65, 53, 40, 26, 12, 0],
    label: 'Transición semiárida con respuesta rápida en cabeceras y disipación en planicies bajas.',
  },
  andean_valley: {
    kc: 1.34,
    drainageDensity: 0.88,
    profile: [100, 93, 86, 77, 67, 55, 42, 29, 17, 7, 0],
    hypsometry: [100, 92, 84, 75, 65, 54, 42, 29, 17, 8, 0],
    label: 'Cabeceras andinas con fuertes gradientes relativos y valle de transición marcado.',
  },
  high_plateau: {
    kc: 1.48,
    drainageDensity: 0.34,
    profile: [100, 98, 95, 91, 84, 74, 61, 45, 28, 13, 0],
    hypsometry: [100, 98, 95, 90, 82, 71, 58, 42, 25, 11, 0],
    label: 'Superficie elevada y amplia con drenaje lento y relieve relativo repartido.',
  },
  mediterranean_valley: {
    kc: 1.39,
    drainageDensity: 0.63,
    profile: [100, 96, 90, 82, 72, 60, 47, 33, 20, 9, 0],
    hypsometry: [100, 95, 89, 81, 71, 60, 47, 33, 20, 9, 0],
    label: 'Valle mediterráneo estructurado, con contraste entre cabeceras y sector medio-bajo amplio.',
  },
  continental_mixed: {
    kc: 1.42,
    drainageDensity: 0.56,
    profile: [100, 96, 90, 83, 74, 63, 50, 37, 24, 11, 0],
    hypsometry: [100, 96, 90, 82, 73, 62, 49, 35, 22, 10, 0],
    label: 'Combinación de cabeceras montañosas y ejes de valle amplios con respuesta intermedia.',
  },
  plateau_river: {
    kc: 1.45,
    drainageDensity: 0.49,
    profile: [100, 97, 92, 86, 78, 68, 56, 42, 28, 14, 0],
    hypsometry: [100, 97, 92, 86, 78, 68, 55, 41, 26, 12, 0],
    label: 'Meseta fluvial extensa, con gradiente moderado y propagación de crecida más lenta.',
  },
  mediterranean_plateau: {
    kc: 1.43,
    drainageDensity: 0.52,
    profile: [100, 97, 91, 84, 76, 66, 53, 39, 25, 12, 0],
    hypsometry: [100, 96, 90, 83, 74, 63, 50, 36, 21, 9, 0],
    label: 'Plataforma mediterránea con contraste moderado entre cabeceras y tramo medio.',
  },
  mediterranean_semiarid: {
    kc: 1.31,
    drainageDensity: 0.72,
    profile: [100, 92, 84, 75, 65, 53, 40, 28, 16, 7, 0],
    hypsometry: [100, 90, 81, 71, 60, 49, 37, 25, 15, 7, 0],
    label: 'Cuenca semiárida con relieve relativamente concentrado y respuesta torrencial alta.',
  },
  atlantic_mountain: {
    kc: 1.28,
    drainageDensity: 0.78,
    profile: [100, 91, 82, 72, 61, 49, 37, 25, 15, 6, 0],
    hypsometry: [100, 90, 80, 69, 58, 47, 35, 24, 14, 6, 0],
    label: 'Cuenca atlántica montañosa, con cabeceras activas y rápida organización del drenaje.',
  },
};

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function toPoints(series, xLabel, yLabel) {
  const lastIndex = Math.max(series.length - 1, 1);
  return series.map((value, index) => ({
    [xLabel]: Number(((index / lastIndex) * 100).toFixed(1)),
    [yLabel]: Number(value.toFixed(1)),
  }));
}

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
    mean_hours: Number(((tcKirpich + tcTemez + tcScs) / 3).toFixed(2)),
    kirpich_hours: Number(tcKirpich.toFixed(2)),
    temez_hours: Number(tcTemez.toFixed(2)),
    scs_lag_hours: Number(tcScs.toFixed(2)),
  };
}

function getCnRef(entry) {
  const ai = Number(entry?.annual?.aridity_index);
  if (!Number.isFinite(ai)) return 75;
  if (ai >= 1.5) return 68;
  if (ai >= 1.0) return 72;
  if (ai >= 0.8) return 75;
  if (ai >= 0.55) return 78;
  return 82;
}

function adjustSeries(series, delta) {
  return series.map((value, index) => clamp(
    index === 0 ? 100 : index === series.length - 1 ? 0 : value + delta,
    0,
    100
  ));
}

function inferFamily(entry, template, parentRecord) {
  if (template?.terrain_family) return template.terrain_family;
  const name = String(entry?.name || '').toLowerCase();
  const parentFamily = parentRecord?.terrain_family || null;
  if (name.includes('delta') || name.includes('bajo')) return parentFamily || 'mediterranean_valley';
  if (name.includes('alto') || name.includes('sierra') || name.includes('nacientes')) return parentFamily === 'mediterranean_valley' ? 'atlantic_mountain' : 'andean_valley';
  if (name.includes('genil')) return 'mediterranean_valley';
  return parentFamily || (entry?.region === 'spain' ? 'mediterranean_plateau' : 'chaco_transition');
}

function deriveSubMetrics(entry, parentEntry, parentRecord, index) {
  const areaKm2 = Number(entry?.area_sub_km2) || 0;
  const parentAreaKm2 = Number(parentEntry?.area_sub_km2) || areaKm2;
  const areaRatio = clamp(Math.sqrt(areaKm2 / Math.max(parentAreaKm2, 1)), 0.22, 0.78);
  const family = inferFamily(entry, null, parentRecord);
  const preset = FAMILY_PRESETS[family];
  const name = String(entry?.name || '').toLowerCase();

  let lengthFactor = 0.34 + (areaRatio * 0.58);
  let slopeFactor = 1.0;

  if (name.includes('alto') || name.includes('sierra') || name.includes('nacientes')) {
    lengthFactor *= 0.86;
    slopeFactor *= 1.35;
  }
  if (name.includes('bajo') || name.includes('delta')) {
    lengthFactor *= 0.78;
    slopeFactor *= 0.62;
  }
  if (name.includes('medio') || name.includes('central')) {
    slopeFactor *= 0.95;
  }

  const mainChannelLengthKm = Number((parentRecord.main_channel_length_km * lengthFactor).toFixed(1));
  const mainChannelSlopePct = Number(clamp(parentRecord.main_channel_slope_pct * slopeFactor, 0.2, 6.5).toFixed(2));
  const compactnessKc = Number(clamp(preset.kc + ((index - 1) * 0.03), 1.18, 1.75).toFixed(3));
  const perimeterKm = Number(((compactnessKc * Math.sqrt(areaKm2)) / 0.28).toFixed(1));
  const formFactorFf = Number((areaKm2 / Math.pow(mainChannelLengthKm, 2)).toFixed(3));
  const drainageDensity = Number(clamp(preset.drainageDensity + ((1 - areaRatio) * 0.14), 0.25, 1.1).toFixed(3));
  const cnRef = getCnRef(entry);

  return {
    terrain_family: family,
    perimeter_km: perimeterKm,
    main_channel_length_km: mainChannelLengthKm,
    main_channel_slope_pct: mainChannelSlopePct,
    compactness_kc: compactnessKc,
    form_factor_ff: formFactorFf,
    drainage_density_kmkm2: drainageDensity,
    cn_ref: cnRef,
    tc_estimate: estimateTcHours(mainChannelLengthKm, mainChannelSlopePct, cnRef),
  };
}

function buildProfileSignature(entry, family, index = 0) {
  const preset = FAMILY_PRESETS[family];
  const name = String(entry?.name || '').toLowerCase();
  let profile = preset.profile;
  let hypsometry = preset.hypsometry;

  if (name.includes('alto') || name.includes('sierra') || name.includes('nacientes')) {
    profile = adjustSeries(profile, -3);
    hypsometry = adjustSeries(hypsometry, -4);
  } else if (name.includes('bajo') || name.includes('delta')) {
    profile = adjustSeries(profile, 4);
    hypsometry = adjustSeries(hypsometry, 5);
  } else if (index > 1) {
    profile = adjustSeries(profile, 1.5);
    hypsometry = adjustSeries(hypsometry, 1.5);
  }

  return {
    terrain_family: family,
    terrain_label: preset.label,
    longitudinal_profile_relative: toPoints(profile, 'distance_pct', 'elevation_pct'),
    hypsometric_curve_relative: toPoints(hypsometry, 'area_pct', 'elevation_pct'),
  };
}

function buildResponseSummary(metrics, entry, signature) {
  const tc = Number(metrics?.tc_estimate?.mean_hours) || null;
  const slope = Number(metrics?.main_channel_slope_pct) || null;
  const ai = Number(entry?.annual?.aridity_index) || null;

  let responseWindow = 'propagación lenta';
  if (tc !== null) {
    if (tc <= 18) responseWindow = 'respuesta rápida';
    else if (tc <= 48) responseWindow = 'respuesta intermedia';
    else if (tc <= 96) responseWindow = 'respuesta moderada';
  }

  let runoffBias = 'amortiguación parcial';
  if (slope !== null) {
    if (slope >= 2.5) runoffBias = 'escorrentía concentrada en cabeceras';
    else if (slope <= 0.8) runoffBias = 'propagación con almacenamiento amplio';
  }

  let climateBias = 'balance climático mixto';
  if (ai !== null) {
    if (ai < 0.6) climateBias = 'déficit hídrico estructural';
    else if (ai > 1.4) climateBias = 'superávit hídrico estructural';
  }

  return `${signature.terrain_label} La unidad sugiere ${responseWindow}, con ${runoffBias} y un contexto de ${climateBias}.`;
}

async function writeJson(targetPath, payload) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const climateCatalog = JSON.parse(await fs.readFile(CLIMATE_GUIDE_PATH, 'utf8'));
  const entries = climateCatalog?.entries || {};
  const records = {};

  for (const [id, entry] of Object.entries(entries)) {
    const template = TOP_BASIN_TEMPLATES[id] || null;
    const parentId = entry?.parent_id || null;
    const parentEntry = parentId ? entries[parentId] || null : null;
    const parentRecord = parentId ? records[parentId] || null : null;
    const indexMatch = id.match(/__(\d+)$/);
    const subIndex = indexMatch ? Number(indexMatch[1]) : 0;
    const areaKm2 = Number(entry?.area_sub_km2 || entry?.area_up_km2 || 0);
    const family = inferFamily(entry, template, parentRecord);
    const basePreset = FAMILY_PRESETS[family];

    let metrics;
    if (template) {
      const compactnessKc = Number(((0.28 * template.perimeter_km) / Math.sqrt(areaKm2)).toFixed(3));
      const formFactorFf = Number((areaKm2 / Math.pow(template.main_channel_length_km, 2)).toFixed(3));
      const drainageDensity = Number(basePreset.drainageDensity.toFixed(3));
      const cnRef = getCnRef(entry);
      metrics = {
        area_km2: areaKm2,
        perimeter_km: Number(template.perimeter_km.toFixed(1)),
        main_channel_length_km: Number(template.main_channel_length_km.toFixed(1)),
        main_channel_slope_pct: Number(template.main_channel_slope_pct.toFixed(2)),
        compactness_kc: compactnessKc,
        form_factor_ff: formFactorFf,
        drainage_density_kmkm2: drainageDensity,
        cn_ref: cnRef,
        tc_estimate: estimateTcHours(template.main_channel_length_km, template.main_channel_slope_pct, cnRef),
      };
    } else if (parentRecord && parentEntry) {
      metrics = {
        area_km2: areaKm2,
        ...deriveSubMetrics(entry, parentEntry, parentRecord, subIndex),
      };
    } else {
      continue;
    }

    const signature = buildProfileSignature(entry, family, subIndex);
    records[id] = {
      id,
      region: entry?.region || null,
      country: entry?.region === 'spain' ? 'España' : entry?.region === 'bolivia' ? 'Bolivia' : null,
      source_type: entry?.source_type || 'guide_basin',
      source_label: 'Morfometría relativa TerraNava',
      quality_flag: 'Derivado TerraNava v1 · perfil relativo precalculado',
      confidence_label: template ? 'Media' : 'Preliminar',
      service_level: 'L2',
      coverage_level: entry?.region === 'spain' ? 'España hidrología beta' : 'Bolivia activo',
      source_priority: 'oficial_primero_con_fallback_abierto_trazable',
      last_verified_at: LAST_VERIFIED_AT,
      morphometry_basis: template ? 'guide_basin_geometry' : 'guide_subbasin_derivation',
      dem_status: entry?.region === 'spain' ? 'premium_pending' : 'regional_backbone_pending',
      name: entry?.name || id,
      parent_id: parentId,
      climate_context: entry?.classification?.label || null,
      metrics,
      signature: {
        ...signature,
        response_label: template?.response_label || parentRecord?.response_label || 'Lectura morfométrica relativa',
        response_summary: buildResponseSummary(metrics, entry, signature),
      },
      recommended_use: 'Lectura morfométrica comparativa, apoyo a fichas por cuenca e informes preliminares.',
      limits: 'Perfil e hipsometría relativos precalculados. No representan elevaciones absolutas ni sustituyen un perfil DEM premium por proyecto.',
      notes: [
        'Usar junto con series históricas locales por cuenca y con el nivel de servicio activo.',
        'Cuando exista DEM premium por país, esta firma relativa debe reemplazarse por derivados topográficos observables.'
      ],
    };
  }

  const summary = {
    version: 'v1',
    generated_at: new Date().toISOString(),
    source_label: 'Morfometría relativa TerraNava',
    description: 'Paquete precalculado de perfiles longitudinales relativos y curvas hipsométricas relativas para cuencas guía Bolivia y España.',
    service_level: 'L2',
    source_priority: 'oficial_primero_con_fallback_abierto_trazable',
    last_verified_at: LAST_VERIFIED_AT,
    record_count: Object.keys(records).length,
    countries: {
      bolivia: Object.values(records).filter((record) => record.country === 'Bolivia').length,
      spain: Object.values(records).filter((record) => record.country === 'España').length,
    },
    limits: 'Producto orientativo para web e informe. No equivale a topografía absoluta derivada de DEM premium.',
  };

  const payload = {
    version: 'v1',
    generated_at: summary.generated_at,
    source_label: summary.source_label,
    description: summary.description,
    service_level: 'L2',
    last_verified_at: LAST_VERIFIED_AT,
    records,
  };

  await writeJson(OUTPUT_INDEX_PATH, payload);
  await writeJson(OUTPUT_SUMMARY_PATH, summary);

  console.log(`Morfometría guía TerraNava generada: ${summary.record_count} registros`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
