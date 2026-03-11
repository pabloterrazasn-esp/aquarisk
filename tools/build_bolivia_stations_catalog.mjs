#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/Users/pablo/Desktop/Claude Terranava';
const OUTPUT_DIR = path.join(ROOT, 'aquarisk-data', 'stations', 'bolivia');
const METEO_SOURCE_PATH = path.join(ROOT, 'aquarisk-data', 'metadata', 'senamhi-bolivia-stations.v1.json');
const MUNICIPALITIES_PATH = path.join(ROOT, 'aquarisk-data', 'risk', 'bolivia', 'municipios.v1.geojson');
const RIVERS_PATH = path.join(ROOT, 'aquarisk-data', 'risk', 'bolivia', 'rivers.v1.geojson');

const METEO_REFERENCE_SOURCE = 'https://senamhi.gob.bo/pronjsondiario.php?dias=1';
const METEO_STATS_SOURCE = 'https://anda.ine.gob.bo/index.php/catalog/239';
const HYDRO_STATS_SOURCE = 'https://anda.ine.gob.bo/index.php/catalog/209';
const HYDRO_REPORT_SOURCE = 'https://senamhi.gob.bo/redCuentas/2023/INFORME%20RENDICION%20PUBLICA%20DE%20CUENTAS%20FINAL%202023.pdf';
const HYDRO_LEVELS_SOURCE = 'https://senamhi.gob.bo/meteorologia/boletines/reporte_de_niveles/2025/03/reporte_de_niveles_09032025.pdf';
const HYDRO_FORECAST_SOURCE = 'https://senamhi.gob.bo/meteorologia/boletines/pronostico_hidrologico/2025/03/pronostico_hidrologico_09032025.pdf';
const LAST_VERIFIED_AT = '2026-03-10';
const SOURCE_PRIORITY = 'oficial_primero_con_fallback_abierto_trazable';

const STATUS_COLORS = {
  operativa: '#1d4ed8',
  histórica: '#64748b',
  intermitente: '#d97706',
  'pendiente de verificación': '#9333ea',
};

const TYPE_COLORS = {
  meteorological: '#2563eb',
  hydrological: '#0f766e',
};

const MACROBASIN_CENTERS = [
  { id: 'amazonia', label: 'Sistema Amazónico', lat: -13.6, lon: -65.7 },
  { id: 'altiplano', label: 'Sistema Altiplano', lat: -16.7, lon: -68.6 },
  { id: 'pilcomayo', label: 'Sistema Pilcomayo', lat: -21.3, lon: -64.1 },
  { id: 'valles', label: 'Valles Interandinos', lat: -18.1, lon: -65.8 },
];

const DEPARTMENT_LABELS = new Map([
  ['beni', 'Beni'],
  ['chuquisaca', 'Chuquisaca'],
  ['cochabamba', 'Cochabamba'],
  ['la paz', 'La Paz'],
  ['oruro', 'Oruro'],
  ['pando', 'Pando'],
  ['potosi', 'Potosí'],
  ['potosí', 'Potosí'],
  ['santa cruz', 'Santa Cruz'],
  ['tarija', 'Tarija'],
]);

const HYDRO_STATIONS = [
  {
    name: 'Angosto Quercano',
    lat: -15.3096,
    lon: -68.2148,
    river_system: 'Mapiri',
    location_quality: 'estimación areal TerraNava',
    location_note: 'Ubicación aproximada en el sistema Mapiri-Guanay; requiere verificación puntual con cartografía de estación.',
    operational_status: 'operativa',
    status_evidence: 'Mencionada en alertas hidrológicas recientes de SENAMHI para el río Mapiri.',
    bulletin_url: HYDRO_FORECAST_SOURCE,
  },
  {
    name: 'Cachuela Esperanza',
    lat: -10.5372514,
    lon: -65.5835987,
    river_system: 'Beni',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'operativa',
    status_evidence: 'La estación aparece en pronósticos hidrológicos recientes de SENAMHI para el sistema Beni.',
    bulletin_url: HYDRO_FORECAST_SOURCE,
  },
  {
    name: 'Riberalta',
    lat: -10.9973420,
    lon: -66.0751504,
    river_system: 'Beni',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'operativa',
    status_evidence: 'Referida en pronósticos hidrológicos recientes de SENAMHI para la red amazónica.',
    bulletin_url: HYDRO_FORECAST_SOURCE,
  },
  {
    name: 'Rurrenabaque',
    lat: -14.4437498,
    lon: -67.5311806,
    river_system: 'Beni',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'operativa',
    status_evidence: 'Referida en pronósticos hidrológicos recientes de SENAMHI para la red amazónica.',
    bulletin_url: HYDRO_FORECAST_SOURCE,
  },
  {
    name: 'Abaroa',
    lat: -16.7860690,
    lon: -65.5865741,
    river_system: 'Ichilo',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'pendiente de verificación',
    status_evidence: 'La estación figura en el catálogo ANDA/INE, pero no se encontró confirmación operativa reciente por nombre en boletines públicos.',
  },
  {
    name: 'Santa Rita',
    lat: -15.3704405,
    lon: -67.0683124,
    river_system: 'Por verificar',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'pendiente de verificación',
    status_evidence: 'La estación figura en el catálogo ANDA/INE; el estado operativo puntual requiere verificación adicional.',
  },
  {
    name: 'Calacoto',
    lat: -17.2832095,
    lon: -68.6350427,
    river_system: 'Mauri',
    location_quality: 'geocodificada sobre localidad de referencia',
    operational_status: 'pendiente de verificación',
    status_evidence: 'La estación figura en el catálogo ANDA/INE; no se encontró evidencia operativa reciente explícita por nombre.',
  },
  {
    name: 'Ulloma',
    lat: -17.4910579,
    lon: -68.4908609,
    river_system: 'Mauri',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'pendiente de verificación',
    status_evidence: 'La estación figura en el catálogo ANDA/INE; el estado operativo puntual está pendiente de contraste.',
  },
  {
    name: 'Puerto Villarroel',
    lat: -16.8390294,
    lon: -64.7928503,
    river_system: 'Ichilo',
    location_quality: 'geocodificada sobre municipio oficial',
    operational_status: 'histórica',
    status_evidence: 'Estación oficial listada por ANDA/INE sin evidencia operativa reciente integrada todavía en AquaRisk.',
  },
  {
    name: 'Achachicala',
    lat: -16.4411661,
    lon: -68.7031625,
    river_system: 'Choqueyapu',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'operativa',
    status_evidence: 'Mencionada en reportes recientes de niveles hidrológicos de SENAMHI en el sistema de La Paz.',
    bulletin_url: HYDRO_LEVELS_SOURCE,
  },
  {
    name: 'Achacachi',
    lat: -16.0438951,
    lon: -68.6849563,
    river_system: 'Keka',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'histórica',
    status_evidence: 'Estación oficial listada por ANDA/INE; se mantiene como red histórica utilizable para futuras verificaciones.',
  },
  {
    name: 'Guayaramerín',
    lat: -10.8189150,
    lon: -65.3550455,
    river_system: 'Mamoré',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'operativa',
    status_evidence: 'Mencionada en reportes recientes de niveles hidrológicos de SENAMHI para la red amazónica.',
    bulletin_url: HYDRO_LEVELS_SOURCE,
  },
  {
    name: 'Puerto Varador',
    lat: -14.8780487,
    lon: -64.9970111,
    river_system: 'Mamoré',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'histórica',
    status_evidence: 'Estación oficial listada por ANDA/INE; sin evidencia operativa reciente integrada todavía.',
  },
  {
    name: 'Puerto Siles',
    lat: -12.8003748,
    lon: -65.0044135,
    river_system: 'Mamoré',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'operativa',
    status_evidence: 'Mencionada en reportes recientes de niveles hidrológicos de SENAMHI.',
    bulletin_url: HYDRO_LEVELS_SOURCE,
  },
  {
    name: 'Humapalca',
    lat: -16.9648454,
    lon: -67.2274083,
    river_system: 'Miguillas',
    location_quality: 'geocodificada sobre curso de agua oficial',
    operational_status: 'pendiente de verificación',
    status_evidence: 'El catálogo ANDA/INE la lista como estación oficial; el estado operativo puntual requiere verificación adicional.',
  },
  {
    name: 'Villamontes',
    lat: -21.2589001,
    lon: -63.4722606,
    river_system: 'Pilcomayo',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'operativa',
    status_evidence: 'Mencionada en reportes recientes de niveles y pronósticos hidrológicos de SENAMHI para el Pilcomayo.',
    bulletin_url: HYDRO_LEVELS_SOURCE,
  },
  {
    name: 'Escoma',
    lat: -15.6613873,
    lon: -69.1289940,
    river_system: 'Súchez',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'operativa',
    status_evidence: 'Mencionada en reportes recientes de niveles y pronósticos hidrológicos de SENAMHI en el sistema Titicaca-Súchez.',
    bulletin_url: HYDRO_LEVELS_SOURCE,
  },
  {
    name: 'Puente Villa',
    lat: -16.4054509,
    lon: -67.6458383,
    river_system: 'Miguillas',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'operativa',
    status_evidence: 'Mencionada en reportes recientes de niveles hidrológicos de SENAMHI.',
    bulletin_url: HYDRO_LEVELS_SOURCE,
  },
  {
    name: 'Obrajes',
    lat: -16.5271896,
    lon: -68.1083701,
    river_system: 'Choqueyapu',
    location_quality: 'geocodificada sobre topónimo oficial',
    operational_status: 'operativa',
    status_evidence: 'Mencionada en reportes recientes de niveles hidrológicos de SENAMHI para el eje urbano de La Paz.',
    bulletin_url: HYDRO_LEVELS_SOURCE,
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

function canonicalDepartment(value = '') {
  const normalized = normalizeText(value);
  return DEPARTMENT_LABELS.get(normalized) || value || 'Bolivia';
}

function haversineKm(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
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

function geometryPolygons(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates;
  return [];
}

function geometryCoordinateSets(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [[geometry.coordinates]];
  if (geometry.type === 'MultiLineString') return geometry.coordinates.map((line) => [line]);
  return geometryPolygons(geometry);
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

function pointInRing(point, ring) {
  const [x, y] = point;
  let inside = false;
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

function buildMunicipalityIndex(features) {
  return features.map((feature) => {
    const polygon = geometryOuterRing(feature.geometry);
    const centroid = polygon ? ringCentroid(polygon[0]) : [feature.properties?.centroid_lon || 0, feature.properties?.centroid_lat || 0];
    return {
      feature,
      bbox: geometryBBox(feature.geometry),
      centroid: { lon: centroid[0], lat: centroid[1] },
    };
  });
}

function pointWithinBBox(point, bbox) {
  return point.lon >= bbox[0] && point.lon <= bbox[2] && point.lat >= bbox[1] && point.lat <= bbox[3];
}

function findMunicipality(point, index) {
  for (const item of index) {
    if (!pointWithinBBox(point, item.bbox)) continue;
    if (pointInPolygonGeometry([point.lon, point.lat], item.feature.geometry)) return item.feature;
  }
  let best = null;
  let bestDistance = Infinity;
  for (const item of index) {
    const distance = haversineKm(point, item.centroid);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = item.feature;
    }
  }
  return best;
}

function projectApprox(point) {
  const latScale = 110.574;
  const lonScale = 111.320 * Math.cos((point.lat * Math.PI) / 180);
  return { x: point.lon * lonScale, y: point.lat * latScale };
}

function closestPointOnSegment(point, start, end) {
  const p = projectApprox(point);
  const a = projectApprox(start);
  const b = projectApprox(end);
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const ab2 = (abx ** 2) + (aby ** 2);
  if (!ab2) return { point: start, distanceKm: haversineKm(point, start) };
  const t = Math.max(0, Math.min(1, (((p.x - a.x) * abx) + ((p.y - a.y) * aby)) / ab2));
  const snapped = {
    lon: start.lon + ((end.lon - start.lon) * t),
    lat: start.lat + ((end.lat - start.lat) * t),
  };
  return { point: snapped, distanceKm: haversineKm(point, snapped) };
}

function snapToNearestRiver(point, rivers) {
  let best = null;
  for (const feature of rivers.features || []) {
    const coords = feature.geometry?.coordinates || [];
    for (let i = 0; i < coords.length - 1; i += 1) {
      const start = { lon: coords[i][0], lat: coords[i][1] };
      const end = { lon: coords[i + 1][0], lat: coords[i + 1][1] };
      const candidate = closestPointOnSegment(point, start, end);
      if (!best || candidate.distanceKm < best.distanceKm) {
        best = {
          ...candidate,
          feature,
        };
      }
    }
  }
  return best;
}

function deriveMacrobasin(point, station = null) {
  const river = normalizeText(station?.river_system || '');
  if (['beni', 'mamore', 'mamoré', 'mapiri', 'ichilo', 'coroico'].includes(river)) {
    return MACROBASIN_CENTERS.find((item) => item.id === 'amazonia');
  }
  if (['pilcomayo'].includes(river)) {
    return MACROBASIN_CENTERS.find((item) => item.id === 'pilcomayo');
  }
  if (['suchez', 'súchez', 'keka', 'mauri', 'choqueyapu', 'caquena', 'kaluyo', 'desaguadero'].includes(river)) {
    return MACROBASIN_CENTERS.find((item) => item.id === 'altiplano');
  }
  let best = MACROBASIN_CENTERS[0];
  let bestDistance = Infinity;
  for (const candidate of MACROBASIN_CENTERS) {
    const distance = haversineKm(point, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = candidate;
    }
  }
  return best;
}

function buildMeteorologicalStations(meteoCatalog, municipalityIndex) {
  const stations = meteoCatalog.stations || [];
  return stations.map((station) => {
    const point = { lat: Number(station.lat), lon: Number(station.lon) };
    const municipality = findMunicipality(point, municipalityIndex);
    const props = municipality?.properties || {};
    const macro = deriveMacrobasin(point, station);
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.lon, point.lat],
      },
      properties: {
        station_id: `met-${normalizeText(station.name).replace(/\s+/g, '-')}`,
        station_name: station.name,
        network_type: 'meteorological',
        network_label: 'Meteorológica oficial',
        operator: 'SENAMHI Bolivia',
        marker_color: TYPE_COLORS.meteorological,
        status_color: STATUS_COLORS.operativa,
        operational_status: 'operativa',
        operational_basis: 'Punto público de referencia en el JSON diario de SENAMHI.',
        source_label: 'SENAMHI Bolivia · referencia pública diaria',
        source_url: METEO_REFERENCE_SOURCE,
        official_stats_label: 'INE/ANDA · Estadísticas de Meteorología',
        official_stats_url: METEO_STATS_SOURCE,
        department: canonicalDepartment(station.department || props.department || 'Bolivia'),
        municipality: station.municipality || props.municipality || '',
        province: station.province || '',
        dominant_hydro_unit_id: props.hydro_unit_id || null,
        dominant_hydro_unit_name: props.hydro_unit_name || 'Sin unidad dominante',
        macrobasin_id: macro.id,
        macrobasin_label: macro.label,
        climate_class: props.climate_class || null,
        river_system: null,
        variables_label: 'Precipitación y temperatura de referencia',
        variables_short: ['P', 'T'],
        period_label: 'Cobertura meteorológica pública vigente; series históricas detalladas no integradas todavía.',
        series_scope: 'Referencia climática utilizable',
        series_available: false,
        location_quality: 'coordenada pública SENAMHI',
        confidence: 'high',
        quality_flag: 'Dato oficial público · ubicación utilizable en AquaRisk',
        is_official_coordinate: true,
        last_verified_at: LAST_VERIFIED_AT,
        source_priority: SOURCE_PRIORITY,
        service_level: 'L3',
        lat: point.lat,
        lon: point.lon,
        summary_text: `${station.name} se integra como estación meteorológica pública SENAMHI. AquaRisk la usa como referencia climática con trazabilidad explícita; la operación estadística nacional ANDA/INE reporta 36 estaciones meteorológicas de monitoreo.`,
      },
    };
  });
}

function buildHydrologicalStations(hydrologicalRecords, municipalityIndex, rivers) {
  return hydrologicalRecords.map((station) => {
    const rawPoint = { lat: station.lat, lon: station.lon };
    const snapped = snapToNearestRiver(rawPoint, rivers);
    const useSnap = snapped && snapped.distanceKm <= 25;
    const point = useSnap ? snapped.point : rawPoint;
    const municipality = findMunicipality(point, municipalityIndex);
    const props = municipality?.properties || {};
    const macro = deriveMacrobasin(point, station);
    return {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.lon, point.lat],
      },
      properties: {
        station_id: `hyd-${normalizeText(station.name).replace(/\s+/g, '-')}`,
        station_name: station.name,
        network_type: 'hydrological',
        network_label: 'Hidrológica oficial',
        operator: 'SENAMHI Bolivia / INE-ANDA',
        marker_color: TYPE_COLORS.hydrological,
        status_color: STATUS_COLORS[station.operational_status] || STATUS_COLORS['pendiente de verificación'],
        operational_status: station.operational_status,
        operational_basis: station.status_evidence,
        source_label: 'INE/ANDA · Estadísticas de Caudales y Niveles de Ríos',
        source_url: HYDRO_STATS_SOURCE,
        official_stats_label: 'SENAMHI Bolivia · boletines hidrológicos',
        official_stats_url: station.bulletin_url || HYDRO_REPORT_SOURCE,
        department: canonicalDepartment(props.department || 'Bolivia'),
        municipality: props.municipality || '',
        province: municipality?.properties?.province || '',
        dominant_hydro_unit_id: props.hydro_unit_id || null,
        dominant_hydro_unit_name: props.hydro_unit_name || 'Sin unidad dominante',
        macrobasin_id: macro.id,
        macrobasin_label: macro.label,
        climate_class: props.climate_class || null,
        river_system: station.river_system || 'Por verificar',
        variables_label: 'Caudal y nivel',
        variables_short: ['Q', 'H'],
        period_label: 'Cobertura estadística administrativa nacional; integración de series históricas pendiente.',
        series_scope: station.operational_status === 'operativa'
          ? 'Seguimiento operativo y futura calibración'
          : 'Metadata oficial pendiente de serie',
        series_available: false,
        location_quality: useSnap
          ? `${station.location_quality} · ajustada al cauce HydroRIVERS`
          : station.location_quality,
        confidence: useSnap ? 'medium' : 'medium',
        quality_flag: useSnap
          ? 'Ubicación derivada TerraNava · topónimo oficial + ajuste al cauce'
          : 'Ubicación derivada TerraNava · topónimo oficial',
        is_official_coordinate: false,
        last_verified_at: LAST_VERIFIED_AT,
        source_priority: SOURCE_PRIORITY,
        service_level: 'L3',
        lat: point.lat,
        lon: point.lon,
        reference_lat: rawPoint.lat,
        reference_lon: rawPoint.lon,
        snap_distance_km: useSnap ? Number(snapped.distanceKm.toFixed(2)) : null,
        location_note: station.location_note || null,
        bulletin_url: station.bulletin_url || null,
        summary_text: `${station.name} se integra como estación hidrológica oficial de Bolivia a partir del catálogo ANDA/INE. AquaRisk distingue explícitamente si su estado operativo cuenta con evidencia reciente de SENAMHI o si permanece como red histórica pendiente de verificación puntual.`,
      },
    };
  });
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = item.properties?.[key];
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const [meteoCatalog, municipalities, rivers] = await Promise.all([
    fs.readFile(METEO_SOURCE_PATH, 'utf8').then(JSON.parse),
    fs.readFile(MUNICIPALITIES_PATH, 'utf8').then(JSON.parse),
    fs.readFile(RIVERS_PATH, 'utf8').then(JSON.parse),
  ]);

  const municipalityIndex = buildMunicipalityIndex(municipalities.features || []);
  const meteoFeatures = buildMeteorologicalStations(meteoCatalog, municipalityIndex);
  const hydroFeatures = buildHydrologicalStations(HYDRO_STATIONS, municipalityIndex, rivers);
  const features = [...meteoFeatures, ...hydroFeatures];

  const geojson = {
    type: 'FeatureCollection',
    features,
  };

  const summary = {
    version: 'v1',
    generated_at: new Date().toISOString(),
    country: 'Bolivia',
    coverage_level: 'Nacional Bolivia',
    service_level: 'L3',
    source_priority: SOURCE_PRIORITY,
    last_verified_at: LAST_VERIFIED_AT,
    recommended_use: 'Lectura de cobertura observacional, trazabilidad institucional y apoyo a informes preliminares.',
    limits: 'La presencia de una estacion no implica disponibilidad inmediata de series completas ni coordenada oficial exacta en todos los casos.',
    station_count: features.length,
    meteorological_public_reference_count: meteoFeatures.length,
    meteorological_stats_reference_count: 36,
    hydrological_stats_reference_count: hydroFeatures.length,
    type_counts: countBy(features, 'network_type'),
    status_counts: countBy(features, 'operational_status'),
    macrobasin_counts: countBy(features, 'macrobasin_label'),
    department_counts: countBy(features, 'department'),
    filters: {
      types: ['Todas', 'Meteorológica oficial', 'Hidrológica oficial'],
      statuses: ['Todas', 'Operativa', 'Histórica', 'Pendiente de verificación', 'Intermitente'],
      macrobasins: [...new Set(features.map((feature) => feature.properties.macrobasin_label))].sort((a, b) => a.localeCompare(b, 'es')),
      departments: [...new Set(features.map((feature) => feature.properties.department).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    },
    sources: [
      {
        type: 'official_stats',
        label: 'INE/ANDA · Estadísticas de Meteorología',
        url: METEO_STATS_SOURCE,
        notes: 'La operación estadística nacional reporta cobertura en 36 estaciones meteorológicas de monitoreo.',
      },
      {
        type: 'official_public_feed',
        label: 'SENAMHI Bolivia · referencia pública diaria',
        url: METEO_REFERENCE_SOURCE,
        notes: 'Coordenadas públicas reutilizadas por AquaRisk como red meteorológica de referencia.',
      },
      {
        type: 'official_stats',
        label: 'INE/ANDA · Estadísticas de Caudales y Niveles de Ríos',
        url: HYDRO_STATS_SOURCE,
        notes: 'Catálogo oficial de 19 estaciones de medición para caudal y nivel de ríos.',
      },
      {
        type: 'operational_network',
        label: 'SENAMHI Bolivia · Rendición Pública de Cuentas 2023',
        url: HYDRO_REPORT_SOURCE,
        notes: 'El informe reporta 16 estaciones hidrológicas automáticas funcionando y más de 50 subcuencas atendidas con pronóstico hidrológico.',
      },
      {
        type: 'operational_bulletins',
        label: 'SENAMHI Bolivia · boletines hidrológicos recientes',
        url: HYDRO_LEVELS_SOURCE,
        notes: 'Sirven como evidencia puntual para distinguir estaciones operativas de red histórica/pendiente.',
      },
    ],
    caveats: [
      'Las estaciones meteorológicas públicas SENAMHI integradas aquí no equivalen automáticamente a la base estadística ANDA/INE de 36 estaciones; AquaRisk las trata como red pública de referencia.',
      'Las estaciones hidrológicas se presentan como oficiales cuando figuran en ANDA/INE. Su estado operativo solo se marca como operativa si existe evidencia reciente en boletines o reportes públicos de SENAMHI.',
      'Las ubicaciones hidrológicas se geocodifican a partir de topónimos oficiales y, cuando conviene, se ajustan al cauce HydroRIVERS. AquaRisk declara esta localización como derivada TerraNava, no como coordenada oficial de aforo.',
    ],
  };

  await Promise.all([
    fs.writeFile(path.join(OUTPUT_DIR, 'stations.v1.geojson'), JSON.stringify(geojson)),
    fs.writeFile(path.join(OUTPUT_DIR, 'summary.v1.json'), JSON.stringify(summary, null, 2)),
  ]);

  console.log(`Estaciones Bolivia generadas: ${features.length} (${meteoFeatures.length} meteorológicas, ${hydroFeatures.length} hidrológicas)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
