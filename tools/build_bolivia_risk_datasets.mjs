#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = '/Users/pablo/Desktop/Claude Terranava';
const OUTPUT_DIR = path.join(ROOT, 'aquarisk-data', 'risk', 'bolivia');
const CPV_URL = 'https://cpv2024.ine.gob.bo/';
const ADM3_URL = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BOL/ADM3/geoBoundaries-BOL-ADM3_simplified.geojson';
const ADM1_URL = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BOL/ADM1/geoBoundaries-BOL-ADM1_simplified.geojson';
const RIVERS_PATH = path.join(ROOT, 'aquarisk-data', 'hydrorivers', 'sa_main.geojson');
const HYBAS_PATH = path.join(ROOT, 'aquarisk-data', 'hydrobasins', 'sa', 'lev06.geojson');
const HYBAS_CLIMATE_PATH = path.join(ROOT, 'aquarisk-data', 'climate', 'hybas', 'sa', 'lev06', 'index.v1.json');

const DEPARTMENTS = [
  ['chuquisaca', 'Chuquisaca'],
  ['lapaz', 'La Paz'],
  ['cochabamba', 'Cochabamba'],
  ['oruro', 'Oruro'],
  ['potosi', 'Potosí'],
  ['tarija', 'Tarija'],
  ['santacruz', 'Santa Cruz'],
  ['beni', 'Beni'],
  ['pando', 'Pando'],
];

const NAME_ALIASES = new Map([
  ['san pedro de curahuara', 'curahuara de carangas'],
  ['santiago de callapa', 'santiago de callapa'],
  ['santiago de huari', 'huari'],
  ['charazani', 'curva'],
  ['el puente', 'el puente'],
  ['santisima trinidad', 'trinidad'],
  ['general juan jose perez', 'corque'],
  ['san andres de machaca', 'san andres de machaca'],
  ['san pedro de totora', 'totora'],
  ['santuario de quillacas', 'quillacas'],
  ['torotoro', 'toro toro'],
  ['santiago de huayllamarca', 'huayllamarca'],
  ['vitiche', 'vitichi'],
  ['huacaya autonomia guarani chaqueno de huacaya', 'huacaya'],
  ['sopachui', 'sopachuy'],
  ['villa ricardo mugia icla', 'icla'],
  ['gutierrez autonomia indigena kereimba iyaambae', 'gutierrez'],
  ['pampa grande', 'pampagrande'],
  ['charagua autonomia guarani charagua iyambae', 'charagua'],
  ['uru chipaya nacion originaria uru chipaya', 'chipaya'],
  ['salinas de garci mendoza autonomia indigena originario campesina de salinas', 'salinas de garci mendoza'],
  ['la marka san andres de mach', 'la marka san andres de machaca'],
]);

const DEPT_NORMALIZED_TO_KEY = new Map(
  DEPARTMENTS.map(([key, name]) => [normalizeText(name), key]),
);

const HAZARD_COLORS = ['#d9f0d3', '#f6d365', '#f59e0b', '#c0392b'];
const EXPOSURE_COLORS = ['#dbeafe', '#93c5fd', '#3b82f6', '#1d4ed8'];
const PRIORITY_COLORS = ['#d9f0d3', '#f6d365', '#f28c28', '#b42318'];
const CLASS_LABELS = ['Baja', 'Media', 'Alta', 'Muy alta'];
const BOLIVIA_BBOX = [-69.8, -22.95, -57.35, -9.45];

async function fetchText(url) {
  const resp = await fetch(url, {
    headers: {
      'user-agent': 'AquaRisk/TerraNava dataset builder',
    },
  });
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.status}`);
  return resp.text();
}

async function fetchJson(url) {
  const text = await fetchText(url);
  return JSON.parse(text);
}

function normalizeText(value = '') {
  const base = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, ' ')
    .replace(/\bmunicipio\b/g, ' ')
    .replace(/\btioc\b/g, ' ')
    .replace(/\bsan\s+cruz\s+de\s+la\s+sierra\b/g, 'santa cruz de la sierra')
    .replace(/\bsantisima\s+trinidad\b/g, 'trinidad')
    .replace(/\btoro\s+toro\b/g, 'torotoro')
    .replace(/\bcurahuara\s+de\s+carangas\b/g, 'san pedro de curahuara')
    .replace(/\bquillacas\b/g, 'santuario de quillacas')
    .trim()
    .replace(/\s+/g, ' ');
  return NAME_ALIASES.get(base) || base;
}

function findLiteral(source, marker) {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`Marker not found: ${marker}`);
  }
  const startIndex = source.indexOf('[', markerIndex);
  let depth = 0;
  let inString = false;
  let stringChar = '';
  for (let i = startIndex; i < source.length; i += 1) {
    const ch = source[i];
    const prev = source[i - 1];
    if (inString) {
      if (ch === stringChar && prev !== '\\') {
        inString = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) return source.slice(startIndex, i + 1);
    }
  }
  throw new Error(`Could not parse literal for marker: ${marker}`);
}

function parseLiteral(literal) {
  return vm.runInNewContext(`(${literal})`, {});
}

function extractIneStats(html) {
  const populationEntries = [];
  const housingEntries = [];
  for (const [deptKey, deptName] of DEPARTMENTS) {
    const popLiteral = findLiteral(html, `const ${deptKey}_municipios = [`);
    const homeLiteral = findLiteral(html, `const ${deptKey}_municipios2 = [`);
    const popArray = parseLiteral(popLiteral);
    const housingArray = parseLiteral(homeLiteral);
    const housingByCode = new Map(
      housingArray.map((item) => [String(item.cod), item]),
    );
    for (const item of popArray) {
      const house = housingByCode.get(String(item.cod)) || null;
      populationEntries.push({
        dept_key: deptKey,
        department: deptName,
        ine_code: String(item.cod),
        municipality: item.mpio,
        municipality_norm: normalizeText(item.mpio),
        population_total: parseInt(String(item.población).replace(/\./g, ''), 10),
        population_urban: parseInt(String(item.urban).replace(/\./g, ''), 10),
        population_rural: parseInt(String(item.rural).replace(/\./g, ''), 10),
        housing_total: house ? parseInt(String(house.viviendas).replace(/\./g, ''), 10) : null,
        housing_particular: house ? parseInt(String(house.particulares).replace(/\./g, ''), 10) : null,
        housing_collective: house ? parseInt(String(house.colectivas).replace(/\./g, ''), 10) : null,
      });
    }
    housingEntries.push(...housingArray);
  }
  return { municipalities: populationEntries, housingEntries };
}

function ringSignedArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    sum += (x1 * y2) - (x2 * y1);
  }
  return sum / 2;
}

function ringCentroid(ring) {
  let areaFactor = 0;
  let x = 0;
  let y = 0;
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[i + 1];
    const cross = (x1 * y2) - (x2 * y1);
    areaFactor += cross;
    x += (x1 + x2) * cross;
    y += (y1 + y2) * cross;
  }
  if (!areaFactor) return ring[0];
  return [x / (3 * areaFactor), y / (3 * areaFactor)];
}

function geometryPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function geometryCoordinateSets(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon' || geometry.type === 'MultiPolygon') return geometryPolygons(geometry);
  if (geometry.type === 'LineString') return [[geometry.coordinates]];
  if (geometry.type === 'MultiLineString') return geometry.coordinates.map((line) => [line]);
  return [];
}

function geometryOuterRing(geometry) {
  const polygons = geometryPolygons(geometry);
  let best = null;
  let bestArea = -Infinity;
  for (const polygon of polygons) {
    const outer = polygon[0];
    const area = Math.abs(ringSignedArea(outer));
    if (area > bestArea) {
      bestArea = area;
      best = polygon;
    }
  }
  return best;
}

function pointInRing(point, ring) {
  let inside = false;
  const [x, y] = point;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = ((yi > y) !== (yj > y))
      && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointInPolygonGeometry(point, geometry) {
  const polygons = geometryPolygons(geometry);
  for (const polygon of polygons) {
    if (!pointInRing(point, polygon[0])) continue;
    let inHole = false;
    for (let i = 1; i < polygon.length; i += 1) {
      if (pointInRing(point, polygon[i])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

function geometryBBox(geometry) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const polygon of geometryCoordinateSets(geometry)) {
    for (const ring of polygon) {
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return [minX, minY, maxX, maxY];
}

function bboxContainsPoint(bbox, point) {
  return point[0] >= bbox[0] && point[0] <= bbox[2] && point[1] >= bbox[1] && point[1] <= bbox[3];
}

function bboxIntersects(a, b) {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

function buildFeatureIndex(features) {
  return features.map((feature) => ({
    feature,
    bbox: geometryBBox(feature.geometry),
    outer: geometryOuterRing(feature.geometry),
  }));
}

function featureCentroid(feature) {
  const polygon = geometryOuterRing(feature.geometry);
  if (!polygon) return [0, 0];
  const point = ringCentroid(polygon[0]);
  if (pointInPolygonGeometry(point, feature.geometry)) return point;
  return polygon[0][0];
}

function assignDepartment(feature, deptIndex) {
  const centroid = featureCentroid(feature);
  for (const dept of deptIndex) {
    if (!bboxContainsPoint(dept.bbox, centroid)) continue;
    if (pointInPolygonGeometry(centroid, dept.feature.geometry)) {
      return dept.feature.properties.shapeName;
    }
  }
  return null;
}

function assignHybas(point, hybasIndex) {
  for (const item of hybasIndex) {
    if (!bboxContainsPoint(item.bbox, point)) continue;
    if (pointInPolygonGeometry(point, item.feature.geometry)) {
      return item.feature.properties.HYBAS_ID;
    }
  }
  return null;
}

function scale(value, min, max) {
  if (!Number.isFinite(value)) return 0;
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return 0;
  return (value - min) / (max - min);
}

function classifyByBreaks(value, breaks) {
  for (let i = 0; i < breaks.length; i += 1) {
    if (value <= breaks[i]) return i + 1;
  }
  return breaks.length + 1;
}

function quartileBreaks(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p) => {
    const idx = (sorted.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };
  return [q(0.25), q(0.5), q(0.75)];
}

function climateLabel(entry) {
  return entry?.classification?.label || 'Sin clasificación';
}

function monthShare(entry) {
  const total = entry?.annual?.p_mm || 0;
  const max = entry?.wettest_month?.value_mm || 0;
  return total > 0 ? max / total : 0;
}

function computeAnnualCv(historySeries) {
  if (!historySeries?.p?.length) return null;
  const annualTotals = historySeries.p.map((months) => months.reduce((sum, value) => sum + value, 0));
  const mean = annualTotals.reduce((sum, value) => sum + value, 0) / annualTotals.length;
  if (!mean) return null;
  const variance = annualTotals.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / annualTotals.length;
  return Math.sqrt(variance) / mean;
}

function riskNarrative(props) {
  const threat = CLASS_LABELS[props.hazard_class - 1] || 'Sin clasificar';
  const priority = CLASS_LABELS[props.priority_class - 1] || 'Sin clasificar';
  return `${props.department} · ${props.municipality} presenta amenaza hidrológica ${threat.toLowerCase()} y prioridad institucional ${priority.toLowerCase()}. La lectura se apoya en la unidad ${props.hydro_unit_name}, con clima ${props.climate_class.toLowerCase()}, mes lluvioso dominante ${props.wettest_month_name.toLowerCase()} y población municipal registrada por INE 2024.`;
}

function formatBreaks(breaks) {
  return breaks.map((value) => +value.toFixed(3));
}

function buildRiverSubset(features) {
  const bbox = BOLIVIA_BBOX;
  return features.filter((feature) => {
    const featureBbox = geometryBBox(feature.geometry);
    return bboxIntersects(featureBbox, bbox) && feature.properties.ORD_STRA >= 7;
  });
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const [html, adm3, adm1] = await Promise.all([
    fetchText(CPV_URL),
    fetchJson(ADM3_URL),
    fetchJson(ADM1_URL),
  ]);

  const ine = extractIneStats(html);
  const statsByDeptAndName = new Map(
    ine.municipalities.map((item) => [`${item.dept_key}:${item.municipality_norm}`, item]),
  );

  const deptIndex = buildFeatureIndex(adm1.features);
  const hybasGeo = JSON.parse(await fs.readFile(HYBAS_PATH, 'utf8'));
  const hybasClimate = JSON.parse(await fs.readFile(HYBAS_CLIMATE_PATH, 'utf8'));
  const hybasHistoryDir = path.join(ROOT, 'aquarisk-data', 'history', 'hybas', 'sa', 'lev06', 'chunks');
  const hybasIndex = buildFeatureIndex(hybasGeo.features);

  const historyChunkCache = new Map();
  async function getHistorySeries(hybasId) {
    const prefix = String(hybasId).slice(0, 4);
    if (!historyChunkCache.has(prefix)) {
      const file = path.join(hybasHistoryDir, `${prefix}.v1.json`);
      const payload = JSON.parse(await fs.readFile(file, 'utf8'));
      historyChunkCache.set(prefix, payload.series || {});
    }
    return historyChunkCache.get(prefix)[hybasId] || null;
  }

  const joinedFeatures = [];
  const unmatched = [];

  for (const feature of adm3.features) {
    const departmentName = assignDepartment(feature, deptIndex);
    const deptKey = DEPT_NORMALIZED_TO_KEY.get(normalizeText(departmentName || ''));
    const municipalityNorm = normalizeText(feature.properties.shapeName);
    const stats = deptKey ? statsByDeptAndName.get(`${deptKey}:${municipalityNorm}`) : null;
    if (!stats) {
      unmatched.push({
        geometry_name: feature.properties.shapeName,
        geometry_norm: municipalityNorm,
        department: departmentName,
      });
      continue;
    }

    const centroid = featureCentroid(feature);
    const hybasId = assignHybas(centroid, hybasIndex);
    const climate = hybasId ? hybasClimate.entries[String(hybasId)] : null;
    const history = hybasId ? await getHistorySeries(String(hybasId)) : null;
    const annualCv = computeAnnualCv(history);

    joinedFeatures.push({
      type: 'Feature',
      geometry: feature.geometry,
      properties: {
        municipality_code: stats.ine_code,
        municipality: stats.municipality,
        municipality_norm: stats.municipality_norm,
        department: stats.department,
        department_key: stats.dept_key,
        population_total: stats.population_total,
        population_urban: stats.population_urban,
        population_rural: stats.population_rural,
        housing_total: stats.housing_total,
        housing_particular: stats.housing_particular,
        housing_collective: stats.housing_collective,
        crop_area_ha: null,
        hydro_unit_id: climate?.hybas_id || null,
        hydro_unit_name: climate?.name || 'Sin unidad hidrográfica asignada',
        hydro_level: climate?.level || 6,
        climate_class: climateLabel(climate),
        annual_p_mm: climate?.annual?.p_mm || null,
        annual_et0_mm: climate?.annual?.et0_mm || null,
        annual_t_mean_c: climate?.annual?.t_mean_c || null,
        aridity_index: climate?.annual?.aridity_index || null,
        water_balance_mm: climate?.annual?.water_balance_mm || null,
        wettest_month_code: climate?.wettest_month?.code || null,
        wettest_month_name: climate?.wettest_month?.name || null,
        wettest_month_mm: climate?.wettest_month?.value_mm || null,
        wettest_month_share: climate ? monthShare(climate) : null,
        annual_cv: annualCv,
        climate_mode: climate?.climate_mode || 'sin_dato_local',
        source_label: climate?.source_label || 'Sin dato local',
        quality_flag: climate?.quality_flag || 'Sin dato local',
        centroid_lon: +centroid[0].toFixed(6),
        centroid_lat: +centroid[1].toFixed(6),
      },
    });
  }

  if (unmatched.length) {
    await fs.writeFile(
      path.join(OUTPUT_DIR, 'unmatched-municipios.v1.json'),
      JSON.stringify(unmatched, null, 2),
      'utf8',
    );
  } else {
    await fs.rm(path.join(OUTPUT_DIR, 'unmatched-municipios.v1.json'), { force: true });
  }

  const values = joinedFeatures.map((feature) => feature.properties);
  const pValues = values.map((item) => item.annual_p_mm || 0);
  const aiValues = values.map((item) => item.aridity_index || 0);
  const shareValues = values.map((item) => item.wettest_month_share || 0);
  const cvValues = values.map((item) => item.annual_cv || 0);
  const popValues = values.map((item) => Math.log1p(item.population_total || 0));

  const ranges = {
    p: [Math.min(...pValues), Math.max(...pValues)],
    ai: [Math.min(...aiValues), Math.max(...aiValues)],
    share: [Math.min(...shareValues), Math.max(...shareValues)],
    cv: [Math.min(...cvValues), Math.max(...cvValues)],
    pop: [Math.min(...popValues), Math.max(...popValues)],
  };

  for (const feature of joinedFeatures) {
    const props = feature.properties;
    const wetnessNorm = scale(props.annual_p_mm || 0, ...ranges.p);
    const variabilityNorm = scale(props.annual_cv || 0, ...ranges.cv);
    const concentrationNorm = scale(props.wettest_month_share || 0, ...ranges.share);
    const flashinessNorm = 1 - scale(props.aridity_index || 0, ...ranges.ai);
    const populationNorm = scale(Math.log1p(props.population_total || 0), ...ranges.pop);

    props.hazard_score = +(0.35 * variabilityNorm + 0.25 * concentrationNorm + 0.20 * wetnessNorm + 0.20 * flashinessNorm).toFixed(4);
    props.exposure_score = +populationNorm.toFixed(4);
    props.priority_score = +(0.55 * props.hazard_score + 0.45 * populationNorm).toFixed(4);
  }

  const hazardBreaks = quartileBreaks(values.map((item) => item.hazard_score));
  const exposureBreaks = quartileBreaks(values.map((item) => item.exposure_score));
  const priorityBreaks = quartileBreaks(values.map((item) => item.priority_score));

  for (const feature of joinedFeatures) {
    const props = feature.properties;
    props.hazard_class = classifyByBreaks(props.hazard_score, hazardBreaks);
    props.hazard_label = CLASS_LABELS[props.hazard_class - 1];
    props.hazard_color = HAZARD_COLORS[props.hazard_class - 1];
    props.exposure_class = classifyByBreaks(props.exposure_score, exposureBreaks);
    props.exposure_label = CLASS_LABELS[props.exposure_class - 1];
    props.exposure_color = EXPOSURE_COLORS[props.exposure_class - 1];
    props.priority_class = classifyByBreaks(props.priority_score, priorityBreaks);
    props.priority_label = CLASS_LABELS[props.priority_class - 1];
    props.priority_color = PRIORITY_COLORS[props.priority_class - 1];
    props.population_exposed_est = null;
    props.viviendas_exposed_est = null;
    props.data_scope = 'Población y viviendas municipales totales; no equivale a población expuesta directa.';
    props.summary_text = riskNarrative(props);
  }

  const rivers = JSON.parse(await fs.readFile(RIVERS_PATH, 'utf8'));
  const riverSubset = {
    type: 'FeatureCollection',
    features: buildRiverSubset(rivers.features),
  };

  const summary = {
    version: 'v1',
    generated_at: new Date().toISOString(),
    country: 'Bolivia',
    municipality_count: joinedFeatures.length,
    total_population: joinedFeatures.reduce((sum, feature) => sum + feature.properties.population_total, 0),
    total_housing: joinedFeatures.reduce((sum, feature) => sum + (feature.properties.housing_total || 0), 0),
    hazard_breaks: formatBreaks(hazardBreaks),
    exposure_breaks: formatBreaks(exposureBreaks),
    priority_breaks: formatBreaks(priorityBreaks),
    modes: {
      hazard: {
        label: 'Amenaza hidrológica',
        colors: HAZARD_COLORS,
        classes: CLASS_LABELS,
      },
      exposure: {
        label: 'Exposición demográfica',
        colors: EXPOSURE_COLORS,
        classes: CLASS_LABELS,
      },
      priority: {
        label: 'Prioridad institucional',
        colors: PRIORITY_COLORS,
        classes: CLASS_LABELS,
      },
    },
    sources: [
      {
        type: 'official_stats',
        label: 'INE Bolivia · Censo de Población y Vivienda 2024',
        url: CPV_URL,
        notes: 'Población municipal total, urbana/rural y viviendas censadas.',
      },
      {
        type: 'geometry',
        label: 'GeoBolivia / geoBoundaries ADM3',
        url: 'https://www.geoboundaries.org/api/current/gbOpen/BOL/ADM3/',
        notes: 'Geometría municipal derivada de GeoBolivia, dominio público.',
      },
      {
        type: 'hydrology',
        label: 'HydroSHEDS / HydroBASINS / HydroRIVERS',
        url: 'https://www.hydrosheds.org/',
        notes: 'Base hidrológica TerraNava para lectura de amenaza relativa y red de drenaje.',
      },
    ],
    caveats: [
      'La capa de exposición usa población y viviendas municipales totales; no representa por sí sola población expuesta directa a inundación.',
      'La amenaza hidrológica municipal es un índice relativo TerraNava derivado de la unidad HYBAS dominante y no sustituye un mapa oficial de inundación.',
    ],
  };

  const manifest = {
    version: 'v1',
    countries: {
      bolivia: {
        municipality_geojson: '/aquarisk-data/risk/bolivia/municipios.v1.geojson',
        rivers_geojson: '/aquarisk-data/risk/bolivia/rivers.v1.geojson',
        summary: '/aquarisk-data/risk/bolivia/summary.v1.json',
      },
    },
  };

  await fs.writeFile(
    path.join(OUTPUT_DIR, 'municipios.v1.geojson'),
    JSON.stringify({ type: 'FeatureCollection', features: joinedFeatures }),
    'utf8',
  );
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'rivers.v1.geojson'),
    JSON.stringify(riverSubset),
    'utf8',
  );
  await fs.writeFile(
    path.join(OUTPUT_DIR, 'summary.v1.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  );
  await fs.mkdir(path.join(ROOT, 'aquarisk-data', 'risk'), { recursive: true });
  await fs.writeFile(
    path.join(ROOT, 'aquarisk-data', 'risk', 'manifest.v1.json'),
    JSON.stringify(manifest, null, 2),
    'utf8',
  );

  console.log(`Bolivia municipalities joined: ${joinedFeatures.length}`);
  console.log(`Unmatched municipalities: ${unmatched.length}`);
  console.log(`River subset features: ${riverSubset.features.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
