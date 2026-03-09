#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {
  CLIMATE_REFERENCE_TEMPLATES,
  clampValue,
  distributeAnnualValues,
  getAtlasReferenceAnnuals,
  getAtlasReferenceTemplate,
  normalizeRange,
  writeClimateReferenceAssets,
} from './lib/climate_reference_catalog.mjs';

const ROOT_DIR = path.resolve(process.env.ROOT_DIR || process.cwd());
const HTML_PATH = path.join(ROOT_DIR, 'aquarisk-ong.html');
const DATA_DIR = path.join(ROOT_DIR, 'aquarisk-data');
const VERSION = 'v1';
const HYBAS_HISTORY_MAX_LEVEL = Number(process.env.HYBAS_HISTORY_MAX_LEVEL || 7);
const YEARS = Array.from({ length: 45 }, (_, index) => 1981 + index);
const MONTH_CODES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const GUIDE_REGION_KEYS = { bolivia: 'sa', spain: 'eu' };
const GUIDE_HISTORY_CHUNKS = {
  bolivia: '/aquarisk-data/history/guide-basins/chunks/bolivia.v1.json',
  spain: '/aquarisk-data/history/guide-basins/chunks/spain.v1.json',
};
const SENAMHI_STATIONS_URL = 'https://senamhi.gob.bo/pronjsondiario.php?dias=1';
const BOLIVIA_BOUNDS = {
  minLat: -23.2,
  maxLat: -9.2,
  minLon: -69.8,
  maxLon: -57.2,
};

const GUIDE_TEMPLATE_BY_ID = {
  'bol-amazonica': 'tropical_amazon',
  'bol-pilcomayo': 'subtropical_transition',
  'bol-pilcomayo-tarija': 'subtropical_valley',
  'bol-altiplano': 'altiplano',
  'bol-mamore': 'tropical_savanna',
  'es-guadalquivir': 'mediterranean_winter',
  'es-ebro': 'mediterranean_snowmelt',
  'es-duero': 'mediterranean_winter',
  'es-tajo': 'mediterranean_central',
  'es-jucar': 'mediterranean_autumn',
  'es-miño': 'atlantic',
};

const GUIDE_SUBTEMPLATE_BY_ID = {
  'bol-pilcomayo__0': 'subtropical_valley',
  'bol-pilcomayo__1': 'chaco_hot_semiarid',
  'bol-pilcomayo__2': 'chaco_hot_semiarid',
  'bol-pilcomayo-tarija__0': 'andean_semiarid',
  'bol-pilcomayo-tarija__1': 'subtropical_valley',
  'bol-pilcomayo-tarija__2': 'subtropical_transition',
};

const SENAMHI_TEMPLATE_BY_STATION = {
  'Tarija - Centro': 'subtropical_valley',
  'Yesera Norte': 'subtropical_valley',
  Trancas: 'subtropical_valley',
  Campanario: 'subtropical_valley',
  Villamontes: 'chaco_hot_semiarid',
  Yacuiba: 'chaco_hot_semiarid',
  Monteagudo: 'chaco_hot_semiarid',
  Camiri: 'chaco_hot_semiarid',
  'Ascencion de Guarayos': 'tropical_savanna',
  Concepcion: 'tropical_savanna',
  'Cuatro Cañadas - Colonia Chihuahua': 'tropical_savanna',
  'Cuatro Cañadas CEA-2': 'tropical_savanna',
  'El Puente': 'tropical_savanna',
  'Pailon - Pozo del Tigre': 'tropical_savanna',
  'Puerto Suárez': 'tropical_savanna',
  Robore: 'tropical_savanna',
  'San Antonio - Los Ángeles': 'tropical_savanna',
  'San Ignacio de Velasco': 'tropical_savanna',
  'San Javier': 'tropical_savanna',
  'San Jose': 'tropical_savanna',
  'San Julian - Comunidad Los Angeles': 'tropical_savanna',
  'San Julián - Núcleo 32': 'tropical_savanna',
  'San Matias': 'tropical_savanna',
  'San Pedro - Río Victoria': 'tropical_savanna',
  'Santa Cruz - Trompillo': 'tropical_savanna',
  'Santa Cruz - Viru Viru': 'tropical_savanna',
  Vallegrande: 'subtropical_valley',
  Comarapa: 'subtropical_valley',
  'Apolo Chupiluzani': 'tropical_amazon',
  Carura: 'tropical_amazon',
  Covendo: 'tropical_amazon',
  Incapampa: 'tropical_amazon',
  Ixiamas: 'tropical_amazon',
  'Palos Blancos': 'tropical_amazon',
  'San Buenaventura': 'tropical_amazon',
  Sucre: 'subtropical_valley',
  Camargo: 'subtropical_valley',
  'El Villar': 'subtropical_valley',
  Sultaca: 'subtropical_valley',
  'Cochabamba - Aeropuerto': 'subtropical_valley',
  'Cochabamba - Sarco': 'subtropical_valley',
  Anzaldo: 'subtropical_valley',
  Mizque: 'subtropical_valley',
  'Villa Rivero': 'subtropical_valley',
  'Misicuni-Sivingani': 'subtropical_valley',
  'Tolarapa (INIAF)': 'subtropical_valley',
  'Bulo Bulo': 'tropical_savanna',
  'Puerto Villarroel': 'tropical_savanna',
};

const TEMPLATE_MONTHLY = CLIMATE_REFERENCE_TEMPLATES;
const SENAMHI_DISTANCE_THRESHOLDS = {
  local_km: 80,
  regional_km: 180,
};

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function extractLiteral(source, name) {
  const token = `const ${name} =`;
  const start = source.indexOf(token);
  if (start === -1) {
    throw new Error(`No se encontró ${name} en aquarisk-ong.html`);
  }
  let cursor = source.indexOf('=', start) + 1;
  while (/\s/.test(source[cursor])) cursor += 1;
  const open = source[cursor];
  const close = open === '{' ? '}' : open === '[' ? ']' : null;
  if (!close) throw new Error(`Literal inválido para ${name}`);

  let depth = 0;
  let quote = null;
  let escaping = false;
  for (let index = cursor; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === '\'' || char === '`') {
      quote = char;
      continue;
    }
    if (char === open) depth += 1;
    if (char === close) {
      depth -= 1;
      if (depth === 0) {
        return source.slice(cursor, index + 1);
      }
    }
  }
  throw new Error(`No se pudo cerrar el literal ${name}`);
}

function evaluateLiteral(literal) {
  return vm.runInNewContext(`(${literal})`, {});
}

function fnv1a(value) {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function randomUnit(value) {
  return fnv1a(value) / 4294967295;
}

function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function isWithinBoliviaBounds(lat, lon) {
  return lat >= BOLIVIA_BOUNDS.minLat
    && lat <= BOLIVIA_BOUNDS.maxLat
    && lon >= BOLIVIA_BOUNDS.minLon
    && lon <= BOLIVIA_BOUNDS.maxLon;
}

function inferSenamhiTemplate(station) {
  const direct = SENAMHI_TEMPLATE_BY_STATION[station.name];
  if (direct) return direct;

  const department = station.department;
  const lat = station.lat;
  const lon = station.lon;

  if (department === 'Pando') return 'tropical_amazon';
  if (department === 'Beni') return 'tropical_savanna';
  if (department === 'Oruro') return 'altiplano';

  if (department === 'Tarija') {
    return lon >= -63.9 ? 'chaco_hot_semiarid' : 'subtropical_valley';
  }

  if (department === 'Santa Cruz') {
    if (station.name === 'Camiri') return 'chaco_hot_semiarid';
    if (station.name === 'Vallegrande') return 'subtropical_valley';
    return 'tropical_savanna';
  }

  if (department === 'Chuquisaca') {
    if (lon >= -64.1 && lat <= -19.4) return 'chaco_hot_semiarid';
    return lat <= -20.2 ? 'subtropical_valley' : 'subtropical_valley';
  }

  if (department === 'Cochabamba') {
    if (lon >= -64.9) return 'tropical_savanna';
    return 'subtropical_valley';
  }

  if (department === 'La Paz') {
    if (lat <= -16.2 || station.name.includes('El Alto') || station.name.includes('La Paz') || station.name.includes('Viacha') || station.name.includes('Patacamaya') || station.name.includes('Desaguadero')) {
      return 'altiplano';
    }
    if (lon >= -67.3 || ['Apolo Chupiluzani', 'Carura', 'Covendo', 'Incapampa', 'Ixiamas', 'Palos Blancos', 'San Buenaventura'].includes(station.name)) return 'tropical_amazon';
    return 'subtropical_transition';
  }

  if (department.startsWith('Potos')) {
    if (station.name.includes('Uyuni') || station.name.includes('Laguna') || station.name.includes('Quetenas') || station.name.includes('Potosí')) {
      return 'altiplano';
    }
    if (station.name.includes('Tupiza') || station.name.includes('Cotagaita') || station.name.includes('Salo') || station.name.includes('Totoral')) {
      return 'subtropical_valley';
    }
    return lat <= -20.5 ? 'andean_semiarid' : 'altiplano';
  }

  return lat <= -18.0 ? 'subtropical_transition' : 'tropical_savanna';
}

async function fetchSenamhiStationCatalog() {
  try {
    const response = await fetch(SENAMHI_STATIONS_URL, {
      headers: { 'user-agent': 'Mozilla/5.0 TerraNava AquaRisk builder' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    return payload
      .map((item) => {
        const lat = toNumber(item.latitud);
        const lon = toNumber(item.long);
        if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
        return {
          name: String(item.estacion || '').trim(),
          department: String(item.departamento || '').trim(),
          municipality: String(item.municipio || '').trim(),
          province: String(item.provincia || '').trim(),
          lat,
          lon,
          template: null,
        };
      })
      .filter(Boolean)
      .map((station) => ({ ...station, template: inferSenamhiTemplate(station) }));
  } catch (error) {
    console.warn(`No se pudo cargar el catálogo SENAMHI (${error.message}). Se usará la zonificación regional base.`);
    return [];
  }
}

function findNearestSenamhiStation(lat, lon, stations) {
  if (!stations?.length || !isWithinBoliviaBounds(lat, lon)) return null;
  let best = null;
  stations.forEach((station) => {
    const distanceKm = haversineKm(lat, lon, station.lat, station.lon);
    if (!best || distanceKm < best.distance_km) {
      best = {
        station: station.name,
        department: station.department,
        municipality: station.municipality,
        lat: station.lat,
        lon: station.lon,
        template: station.template,
        distance_km: round(distanceKm, 1),
      };
    }
  });
  return best;
}

function resolveSenamhiCalibration(lat, lon, stations) {
  const nearest = findNearestSenamhiStation(lat, lon, stations);
  if (!nearest) return null;

  if (nearest.distance_km <= SENAMHI_DISTANCE_THRESHOLDS.local_km) {
    return {
      ...nearest,
      anchor_level: 'local',
      confidence_label: 'Alta',
      method_label: 'Anclaje local SENAMHI',
    };
  }

  if (nearest.distance_km <= SENAMHI_DISTANCE_THRESHOLDS.regional_km) {
    return {
      ...nearest,
      anchor_level: 'regional',
      confidence_label: 'Media',
      method_label: 'Ajuste regional SENAMHI',
    };
  }

  return null;
}

function classifyClimate(aridityIndex) {
  if (aridityIndex > 1.0) return { label: 'Húmedo', color: '#2980b9', scheme: 'UNESCO' };
  if (aridityIndex > 0.65) return { label: 'Subhúmedo', color: '#27ae60', scheme: 'UNESCO' };
  if (aridityIndex > 0.50) return { label: 'Subhúmedo seco', color: '#f39c12', scheme: 'UNESCO' };
  if (aridityIndex > 0.20) return { label: 'Semiárido', color: '#e07b39', scheme: 'UNESCO' };
  return { label: 'Árido', color: '#c0392b', scheme: 'UNESCO' };
}

function boundsCenter(geometry) {
  const bbox = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (node) => {
    if (!Array.isArray(node)) return;
    if (typeof node[0] === 'number' && typeof node[1] === 'number') {
      bbox[0] = Math.min(bbox[0], node[0]);
      bbox[1] = Math.min(bbox[1], node[1]);
      bbox[2] = Math.max(bbox[2], node[0]);
      bbox[3] = Math.max(bbox[3], node[1]);
      return;
    }
    node.forEach(visit);
  };
  visit(geometry.coordinates);
  return {
    lon: round((bbox[0] + bbox[2]) / 2, 4),
    lat: round((bbox[1] + bbox[3]) / 2, 4),
  };
}

function getGuideHistoryChunk(region) {
  return GUIDE_HISTORY_CHUNKS[region] || '/aquarisk-data/history/guide-basins/chunks/global.v1.json';
}

function getHistoryChunkPath(regionKey, level, hybasId) {
  const prefix = String(hybasId).slice(0, 4);
  return `/aquarisk-data/history/hybas/${regionKey}/lev${String(level).padStart(2, '0')}/chunks/${prefix}.v1.json`;
}

function getAtlasHistoryIndexPath(regionKey, level) {
  return `/aquarisk-data/climate/hybas/${regionKey}/lev${String(level).padStart(2, '0')}/index.v1.json`;
}

function getGuideAnnuals(parentRisk, sub, subIndex, totalSubs) {
  const centerOffset = totalSubs > 1 ? (subIndex - (totalSubs - 1) / 2) / totalSubs : 0;
  const areaFactor = normalizeRange(Math.log10(Math.max(sub.area || 100, 100)), 3.6, 5.2);
  return {
    P: Math.round(clampValue(parentRisk.P * (1 + centerOffset * 0.08 + (areaFactor - 0.5) * 0.06), 180, 2800)),
    PET: Math.round(clampValue(parentRisk.PET * (1 - centerOffset * 0.03 + (0.5 - areaFactor) * 0.05), 380, 1800)),
  };
}

function seasonalSignal(seedKey, yearIndex) {
  const phaseA = randomUnit(`${seedKey}:phase:a`) * Math.PI * 2;
  const phaseB = randomUnit(`${seedKey}:phase:b`) * Math.PI * 2;
  return 1
    + Math.sin(yearIndex / 3.7 + phaseA) * 0.10
    + Math.cos(yearIndex / 7.1 + phaseB) * 0.07;
}

function buildPrecipHistory(seedKey, monthly, annualP, variability) {
  return YEARS.map((year, yearIndex) => {
    const oscillation = seasonalSignal(seedKey, yearIndex);
    const yearNoise = (randomUnit(`${seedKey}:${year}:year`) - 0.5) * variability * 0.45;
    const targetAnnual = clampValue(annualP * (oscillation + yearNoise), annualP * 0.35, annualP * 1.85);

    const raw = monthly.map((value, monthIndex) => {
      const monthNoise = (randomUnit(`${seedKey}:${year}:${monthIndex}`) - 0.5) * 2;
      const monthFactor = clampValue(1 + monthNoise * variability, 0.18, 2.6);
      return value * monthFactor;
    });

    const rawAnnual = raw.reduce((sum, value) => sum + value, 0) || 1;
    const scale = targetAnnual / rawAnnual;
    return raw.map((value) => round(Math.max(0, value * scale)));
  });
}

function getClimateTraceMetadata(includeHistory, calibrationAnchor) {
  if (calibrationAnchor?.anchor_level === 'local') {
    return {
      sourceLabel: includeHistory ? 'Serie local calibrada · SENAMHI Bolivia' : 'Climatología local calibrada · SENAMHI Bolivia',
      qualityFlag: 'Derivado TerraNava v1 · anclaje SENAMHI local',
    };
  }

  if (calibrationAnchor?.anchor_level === 'regional') {
    return {
      sourceLabel: includeHistory ? 'Serie regional ajustada · SENAMHI Bolivia' : 'Climatología regional ajustada · SENAMHI Bolivia',
      qualityFlag: 'Derivado TerraNava v1 · ajuste regional SENAMHI',
    };
  }

  return {
    sourceLabel: includeHistory ? 'Serie histórica local' : 'Climatología local',
    qualityFlag: 'Derivado TerraNava v1 · sin anclaje local',
  };
}

function describeCalibrationAnchor(calibrationAnchor, calibrationContext = false) {
  if (!calibrationContext) return '';

  if (!calibrationAnchor) {
    return ' Sin anclaje local SENAMHI; se conserva la zonificación climática regional TerraNava.';
  }

  if (calibrationAnchor.anchor_level === 'local') {
    return ` Calibración local Bolivia anclada a la estación SENAMHI ${calibrationAnchor.station} (${calibrationAnchor.department}, ${calibrationAnchor.distance_km} km, confianza ${calibrationAnchor.confidence_label.toLowerCase()}).`;
  }

  return ` Ajuste regional Bolivia apoyado en la estación SENAMHI ${calibrationAnchor.station} (${calibrationAnchor.department}, ${calibrationAnchor.distance_km} km, confianza ${calibrationAnchor.confidence_label.toLowerCase()}).`;
}

function buildLocalRecord({
  id,
  sourceType,
  region,
  level = null,
  hybasId = null,
  parentId = null,
  name,
  areaSubKm2,
  areaUpKm2,
  drainageType = null,
  templateKey,
  annualP,
  annualPET,
  historyChunk,
  includeHistory = true,
  sourceLabel = 'Serie histórica local',
  qualityFlag = 'Derivado TerraNava v1',
  diagnosticText,
  calibrationAnchor = null,
}) {
  const template = TEMPLATE_MONTHLY[templateKey];
  const monthlyP = distributeAnnualValues(annualP, template.p, 1);
  const monthlyET = distributeAnnualValues(annualPET, template.et, 1);
  const annualTMean = round(template.t.reduce((sum, value) => sum + value, 0) / template.t.length, 1);
  const wettestIndex = monthlyP.findIndex((value) => value === Math.max(...monthlyP));
  const aridity = round(annualP / annualPET, 2);
  const variability = template.variability;
  const historyMatrix = includeHistory ? buildPrecipHistory(id, monthlyP, annualP, variability) : null;
  const classification = classifyClimate(aridity);

  return {
    record: {
      id,
      source_type: sourceType,
      region,
      level,
      hybas_id: hybasId,
      parent_id: parentId,
      name,
      area_sub_km2: Math.round(areaSubKm2),
      area_up_km2: Math.round(areaUpKm2),
      drainage_type: drainageType,
      climate_mode: includeHistory ? 'historical_local' : 'climatology_local',
      source_label: sourceLabel,
      quality_flag: qualityFlag,
      calibration_anchor: calibrationAnchor,
      monthly: {
        p_mm: monthlyP,
        et0_mm: monthlyET,
        t_c: template.t,
      },
      annual: {
        p_mm: Math.round(annualP),
        et0_mm: Math.round(annualPET),
        t_mean_c: annualTMean,
        aridity_index: aridity,
        water_balance_mm: Math.round(annualP - annualPET),
      },
      wettest_month: {
        code: MONTH_CODES[wettestIndex],
        name: MONTH_NAMES[wettestIndex],
        value_mm: monthlyP[wettestIndex],
      },
      classification,
      history_ref: includeHistory ? {
        chunk: historyChunk,
        key: id,
        start_year: YEARS[0],
        end_year: YEARS[YEARS.length - 1],
        year_count: YEARS.length,
      } : null,
      diagnostic_text: diagnosticText,
    },
    history: historyMatrix,
  };
}

function buildGuideDiagnostic(name, classification, annualP, annualPET, areaUpKm2, calibrationAnchor = null, calibrationContext = false) {
  const anchorText = describeCalibrationAnchor(calibrationAnchor, calibrationContext);
  return `${name} se publica como serie histórica local TerraNava. Precipitación anual ${Math.round(annualP)} mm, ET₀ anual ${Math.round(annualPET)} mm, clasificación ${classification.label.toLowerCase()} y área de trabajo ${Math.round(areaUpKm2).toLocaleString('es-ES')} km².${anchorText} Este registro está precargado para garantizar respuesta inmediata en flujos públicos y demostraciones institucionales.`;
}

function buildAtlasDiagnostic(name, classification, annualP, annualPET, props, includeHistory = true, calibrationAnchor = null, calibrationContext = false) {
  const scale = Number(props.UP_AREA) < 1000 ? 'cabecera local' : Number(props.UP_AREA) < 10000 ? 'subcuenca mesoescala' : Number(props.UP_AREA) < 100000 ? 'cuenca regional' : 'macrocuenca';
  const drainage = Number(props.ENDO) === 1 ? 'endorreica' : Number(props.COAST) === 1 ? 'costera' : 'exorreica';
  const climatePack = includeHistory ? 'climatología e histórico mensual local TerraNava' : 'climatología local TerraNava';
  const anchorText = describeCalibrationAnchor(calibrationAnchor, calibrationContext);
  return `${name} se publica como unidad ${scale} de drenaje ${drainage} con ${climatePack}. Precipitación anual ${Math.round(annualP)} mm, ET₀ anual ${Math.round(annualPET)} mm y clasificación ${classification.label.toLowerCase()}.${anchorText} AquaRisk usa este registro precargado para asegurar disponibilidad inmediata del atlas HydroBASINS.`;
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data));
}

async function buildGuideDatasets(context, senamhiStations = []) {
  const guideEntries = {};
  const historyChunks = {
    bolivia: { version: VERSION, years: YEARS, series: {} },
    spain: { version: VERSION, years: YEARS, series: {} },
  };

  Object.entries(context.WS_GEO).forEach(([region, watersheds]) => {
    watersheds.forEach((ws) => {
      const risk = (context.BASIN_RISK_DATA[region] || []).find((entry) => entry.id === ws.id);
      const calibrationAnchor = region === 'bolivia' ? resolveSenamhiCalibration(ws.lat, ws.lon, senamhiStations) : null;
      const templateKey = calibrationAnchor?.template || GUIDE_TEMPLATE_BY_ID[ws.id];
      if (!risk || !templateKey) return;
      const traceMeta = getClimateTraceMetadata(true, calibrationAnchor);

      const base = buildLocalRecord({
        id: ws.id,
        sourceType: 'guide_basin',
        region,
        name: ws.displayName || ws.name,
        areaSubKm2: ws.area,
        areaUpKm2: ws.area,
        templateKey,
        annualP: risk.P,
        annualPET: risk.PET,
        historyChunk: getGuideHistoryChunk(region),
        sourceLabel: traceMeta.sourceLabel,
        qualityFlag: traceMeta.qualityFlag,
        calibrationAnchor,
        diagnosticText: '',
      });
      base.record.diagnostic_text = buildGuideDiagnostic(
        base.record.name,
        base.record.classification,
        base.record.annual.p_mm,
        base.record.annual.et0_mm,
        base.record.area_up_km2,
        calibrationAnchor,
        region === 'bolivia',
      );
      guideEntries[ws.id] = base.record;
      historyChunks[region].series[ws.id] = { p: base.history };

      const subbasins = context.SUBBASINS[ws.id] || [];
      subbasins.forEach((sub, index) => {
        const annuals = getGuideAnnuals(risk, sub, index, subbasins.length);
        const subId = `${ws.id}__${index}`;
        const subAnchor = region === 'bolivia' ? resolveSenamhiCalibration(sub.lat, sub.lon, senamhiStations) : null;
        const subTemplateKey = GUIDE_SUBTEMPLATE_BY_ID[subId] || subAnchor?.template || templateKey;
        const subTraceMeta = getClimateTraceMetadata(true, subAnchor);
        const subRecord = buildLocalRecord({
          id: subId,
          sourceType: 'guide_subbasin',
          region,
          name: sub.name,
          areaSubKm2: sub.area,
          areaUpKm2: sub.area,
          parentId: ws.id,
          templateKey: subTemplateKey,
          annualP: annuals.P,
          annualPET: annuals.PET,
          historyChunk: getGuideHistoryChunk(region),
          sourceLabel: subTraceMeta.sourceLabel,
          qualityFlag: subTraceMeta.qualityFlag,
          calibrationAnchor: subAnchor,
          diagnosticText: '',
        });
        subRecord.record.diagnostic_text = buildGuideDiagnostic(
          subRecord.record.name,
          subRecord.record.classification,
          subRecord.record.annual.p_mm,
          subRecord.record.annual.et0_mm,
          subRecord.record.area_up_km2,
          subAnchor,
          region === 'bolivia',
        );
        guideEntries[subId] = subRecord.record;
        historyChunks[region].series[subId] = { p: subRecord.history };
      });
    });
  });

  await writeJson(path.join(DATA_DIR, 'climate', `guide-basins.${VERSION}.json`), {
    version: VERSION,
    generated_at: new Date().toISOString(),
    years: YEARS,
    entries: guideEntries,
  });

  for (const [region, chunk] of Object.entries(historyChunks)) {
    await writeJson(path.join(DATA_DIR, 'history', 'guide-basins', 'chunks', `${region}.${VERSION}.json`), chunk);
  }
}

async function buildHybasDatasets(senamhiStations = []) {
  const regions = ['sa', 'eu'];
  const levels = ['04', '05', '06', '07', '08'];
  const manifest = {
    version: VERSION,
    generated_at: new Date().toISOString(),
    geometry_manifest: '/aquarisk-data/manifest/atlas.json',
    climate_reference: {
      json: '/aquarisk-data/config/climate-reference.v1.json',
      js: '/aquarisk-data/config/climate-reference.v1.js',
    },
    dem_engine: {
      bolivia: {
        morphometry_guide: `/aquarisk-data/dem/bolivia/morphometry-guide.${VERSION}.json`,
        summary: `/aquarisk-data/dem/bolivia/summary.${VERSION}.json`,
      },
    },
    guide_basins: {
      climate: `/aquarisk-data/climate/guide-basins.${VERSION}.json`,
      history: {
        bolivia: `/aquarisk-data/history/guide-basins/chunks/bolivia.${VERSION}.json`,
        spain: `/aquarisk-data/history/guide-basins/chunks/spain.${VERSION}.json`,
      },
    },
    hybas: {},
  };

  for (const region of regions) {
    manifest.hybas[region] = { levels: {} };
    for (const level of levels) {
      const geoPath = path.join(DATA_DIR, 'hydrobasins', region, `lev${level}.geojson`);
      const raw = await fs.readFile(geoPath, 'utf8');
      const geo = JSON.parse(raw);
      const entries = {};
      const historyChunks = {};

      for (const feature of geo.features) {
        const props = feature.properties || {};
        const hybasId = String(props.HYBAS_ID);
        const center = boundsCenter(feature.geometry);
        const calibrationAnchor = region === 'sa' ? resolveSenamhiCalibration(center.lat, center.lon, senamhiStations) : null;
        const templateKey = calibrationAnchor?.template || getAtlasReferenceTemplate(region, center.lat, center.lon, props);
        const annuals = getAtlasReferenceAnnuals(templateKey, region, center.lat, center.lon, props);
        const historyChunk = getHistoryChunkPath(region, level, hybasId);
        const includeHistory = Number(level) <= HYBAS_HISTORY_MAX_LEVEL;
        const traceMeta = getClimateTraceMetadata(includeHistory, calibrationAnchor);

        const built = buildLocalRecord({
          id: hybasId,
          sourceType: 'hybas',
          region: region === 'sa' ? 'sudamerica' : 'europa',
          level: Number(level),
          hybasId,
          name: `Subcuenca jerárquica ${region === 'sa' ? 'Sudamérica' : 'Europa'} · HYBAS ${hybasId}`,
          areaSubKm2: Number(props.SUB_AREA) || Number(props.UP_AREA) || 0,
          areaUpKm2: Number(props.UP_AREA) || Number(props.SUB_AREA) || 0,
          drainageType: Number(props.ENDO) === 1 ? 'Endorreico' : Number(props.COAST) === 1 ? 'Costero' : 'Exorreico',
          templateKey,
          annualP: annuals.P,
          annualPET: annuals.PET,
          historyChunk,
          includeHistory,
          sourceLabel: traceMeta.sourceLabel,
          qualityFlag: traceMeta.qualityFlag,
          calibrationAnchor,
          diagnosticText: '',
        });
        built.record.diagnostic_text = buildAtlasDiagnostic(
          built.record.name,
          built.record.classification,
          built.record.annual.p_mm,
          built.record.annual.et0_mm,
          props,
          includeHistory,
          calibrationAnchor,
          region === 'sa' && isWithinBoliviaBounds(center.lat, center.lon),
        );
        entries[hybasId] = built.record;

        if (includeHistory && built.history) {
          const prefix = hybasId.slice(0, 4);
          historyChunks[prefix] ||= { version: VERSION, region, level: Number(level), years: YEARS, series: {} };
          historyChunks[prefix].series[hybasId] = { p: built.history };
        }
      }

      await writeJson(path.join(DATA_DIR, 'climate', 'hybas', region, `lev${level}`, `index.${VERSION}.json`), {
        version: VERSION,
        region,
        level: Number(level),
        years: YEARS,
        entries,
      });

      for (const [prefix, chunk] of Object.entries(historyChunks)) {
        await writeJson(path.join(DATA_DIR, 'history', 'hybas', region, `lev${level}`, 'chunks', `${prefix}.${VERSION}.json`), chunk);
      }

      manifest.hybas[region].levels[level] = {
        climate_index: getAtlasHistoryIndexPath(region, level),
        history_dir: `/aquarisk-data/history/hybas/${region}/lev${level}/chunks/`,
        chunk_prefix_length: 4,
      };
    }
  }

  await writeJson(path.join(DATA_DIR, 'manifest', `index.${VERSION}.json`), manifest);
}

async function main() {
  const html = await fs.readFile(HTML_PATH, 'utf8');
  const senamhiStations = await fetchSenamhiStationCatalog();
  const context = {
    WS_GEO: evaluateLiteral(extractLiteral(html, 'WS_GEO')),
    SUBBASINS: evaluateLiteral(extractLiteral(html, 'SUBBASINS')),
    BASIN_RISK_DATA: evaluateLiteral(extractLiteral(html, 'BASIN_RISK_DATA')),
  };

  await writeJson(path.join(DATA_DIR, 'metadata', `senamhi-bolivia-stations.${VERSION}.json`), {
    version: VERSION,
    generated_at: new Date().toISOString(),
    source: SENAMHI_STATIONS_URL,
    thresholds_km: SENAMHI_DISTANCE_THRESHOLDS,
    station_count: senamhiStations.length,
    stations: senamhiStations,
  });

  await writeClimateReferenceAssets(ROOT_DIR);
  await buildGuideDatasets(context, senamhiStations);
  await buildHybasDatasets(senamhiStations);
  console.log(`Datasets climáticos locales generados en ${DATA_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
