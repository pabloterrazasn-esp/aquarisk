#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = '/Volumes/Crucial X10/Workspaces/Claude Terranava';
const HTML_PATH = path.join(ROOT, 'aquarisk-ong.html');
const ATLAS_MANIFEST_PATH = path.join(ROOT, 'aquarisk-data', 'manifest', 'atlas.json');
const CALIBRATION_PATH = path.join(ROOT, 'aquarisk-data', 'hydrology', 'outlet-calibration.v1.json');
const AUDIT_JSON_PATH = path.join(ROOT, 'aquarisk-data', 'hydrology', 'outlet-audit.v1.json');
const AUDIT_MD_PATH = path.join(ROOT, 'docs', 'AquaRisk_Outlet_Audit_2026-03-13.md');
const HOSTINGER_CALIBRATION_PATH = path.join(ROOT, 'hostinger-deploy', 'aquarisk-data', 'hydrology', 'outlet-calibration.v1.json');
const THRESHOLD_ON_RIVER_KM = 0.15;
const MAX_PATH_POINTS = 18;
const GRID_SIZE_DEG = 0.35;
const ATLAS_LEVELS = [4, 5, 6, 7, 8];

const REGION_CONFIG = {
  bolivia: { regionKey: 'sa', label: 'Bolivia' },
  spain: { regionKey: 'eu', label: 'España' },
  sa: { regionKey: 'sa', label: 'Sudamérica' },
  eu: { regionKey: 'eu', label: 'Europa' },
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const html = await fs.readFile(HTML_PATH, 'utf8');
  const wsGeo = extractConstObject(html, 'WS_GEO');
  const subbasins = extractConstObject(html, 'SUBBASINS');
  const atlasManifest = JSON.parse(await fs.readFile(ATLAS_MANIFEST_PATH, 'utf8'));

  const riverIndexByRegion = {};
  for (const regionKey of ['sa', 'eu']) {
    const riverPath = path.join(ROOT, atlasManifest.regions[regionKey].hydrorivers.replace(/^\//, ''));
    const rivers = JSON.parse(await fs.readFile(riverPath, 'utf8'));
    riverIndexByRegion[regionKey] = buildRiverIndex(rivers);
  }

  const atlasByRegion = {};
  for (const regionKey of ['sa', 'eu']) {
    atlasByRegion[regionKey] = {};
    for (const level of ATLAS_LEVELS) {
      const featurePath = atlasManifest.regions[regionKey].hydrobasins
        .find((item) => item.includes(`lev${String(level).padStart(2, '0')}`));
      const geojson = JSON.parse(await fs.readFile(path.join(ROOT, featurePath.replace(/^\//, '')), 'utf8'));
      atlasByRegion[regionKey][level] = geojson.features || [];
    }
  }

  const staticAudit = auditStaticUnits(wsGeo, subbasins, riverIndexByRegion);
  const atlasAudit = auditAtlasUnits(atlasByRegion, riverIndexByRegion);
  const auditUnits = [...staticAudit.units, ...atlasAudit.units];
  const summary = buildAuditSummary(auditUnits);
  const calibrationCatalog = buildCalibrationCatalog(auditUnits, summary);
  const auditJson = {
    generated_at: new Date().toISOString(),
    threshold_on_river_km: THRESHOLD_ON_RIVER_KM,
    summary,
    units: auditUnits,
  };
  const auditMarkdown = buildAuditMarkdown(summary, auditUnits);

  await fs.mkdir(path.dirname(CALIBRATION_PATH), { recursive: true });
  await fs.mkdir(path.dirname(AUDIT_MD_PATH), { recursive: true });
  await fs.mkdir(path.dirname(HOSTINGER_CALIBRATION_PATH), { recursive: true });
  await fs.writeFile(CALIBRATION_PATH, JSON.stringify(calibrationCatalog));
  await fs.writeFile(AUDIT_JSON_PATH, JSON.stringify(auditJson));
  await fs.writeFile(AUDIT_MD_PATH, auditMarkdown);
  await fs.writeFile(HOSTINGER_CALIBRATION_PATH, JSON.stringify(calibrationCatalog));

  console.log(JSON.stringify({
    calibration_path: CALIBRATION_PATH,
    audit_json_path: AUDIT_JSON_PATH,
    audit_md_path: AUDIT_MD_PATH,
    summary,
  }, null, 2));
}

function extractConstObject(source, constName) {
  const marker = `const ${constName} =`;
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error(`No se encontró ${constName} en ${HTML_PATH}`);
  }
  const braceIndex = source.indexOf('{', markerIndex);
  if (braceIndex === -1) {
    throw new Error(`No se encontró el inicio de ${constName}`);
  }

  let depth = 0;
  let inString = null;
  let escaped = false;
  let inLineComment = false;
  let inBlockComment = false;
  let endIndex = -1;

  for (let index = braceIndex; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inLineComment) {
      if (char === '\n') inLineComment = false;
      continue;
    }

    if (inBlockComment) {
      if (char === '*' && next === '/') {
        inBlockComment = false;
        index += 1;
      }
      continue;
    }

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === inString) {
        inString = null;
      }
      continue;
    }

    if (char === '/' && next === '/') {
      inLineComment = true;
      index += 1;
      continue;
    }

    if (char === '/' && next === '*') {
      inBlockComment = true;
      index += 1;
      continue;
    }

    if (char === '"' || char === '\'' || char === '`') {
      inString = char;
      continue;
    }

    if (char === '{') {
      depth += 1;
      continue;
    }

    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        endIndex = index;
        break;
      }
    }
  }

  if (endIndex === -1) {
    throw new Error(`No se pudo cerrar ${constName}`);
  }

  const literal = source.slice(braceIndex, endIndex + 1);
  const context = {};
  vm.runInNewContext(`const ${constName} = ${literal}; this.output = ${constName};`, context);
  return context.output;
}

function auditStaticUnits(wsGeo, subbasins, riverIndexByRegion) {
  const units = [];
  for (const [regionName, watersheds] of Object.entries(wsGeo)) {
    const regionMeta = REGION_CONFIG[regionName];
    if (!regionMeta) continue;
    for (const ws of watersheds) {
      const watershedUnit = {
        unit_key: `ws:${ws.id}`,
        source_type: 'preloaded_watershed',
        region: regionName,
        region_key: regionMeta.regionKey,
        level: null,
        id: ws.id,
        dataset_id: ws.id,
        label: ws.displayName || ws.name,
        expected_area_km2: Number(ws.area) || null,
        polygon_lonlat: convertLatLngPathToLonLat(ws.polygon || []),
        guide_river_path_lonlat: convertLatLngPathToLonLat(ws.riverPath || []),
        current: deriveGuideGeometry({
          polygon: convertLatLngPathToLonLat(ws.polygon || []),
          riverPathLatLng: ws.riverPath || [],
          outletLatLng: ws.outletLatLng || null,
        }),
      };
      units.push(auditUnitAgainstRivers(watershedUnit, riverIndexByRegion[regionMeta.regionKey]));

      const nested = subbasins[ws.id] || [];
      nested.forEach((sub, index) => {
        const unit = {
          unit_key: `dataset:${ws.id}__${index}`,
          source_type: 'preloaded_subbasin',
          region: regionName,
          region_key: regionMeta.regionKey,
          level: null,
          id: `${ws.id}__${index}`,
          dataset_id: `${ws.id}__${index}`,
          parent_id: ws.id,
          label: sub.name,
          expected_area_km2: Number(sub.area) || null,
          polygon_lonlat: convertLatLngPathToLonLat(sub.polygon || []),
          guide_river_path_lonlat: convertLatLngPathToLonLat(ws.riverPath || []),
          current: deriveGuideGeometry({
            polygon: convertLatLngPathToLonLat(sub.polygon || []),
            riverPathLatLng: ws.riverPath || [],
            outletLatLng: null,
          }),
        };
        units.push(auditUnitAgainstRivers(unit, riverIndexByRegion[regionMeta.regionKey]));
      });
    }
  }
  return { units };
}

function auditAtlasUnits(atlasByRegion, riverIndexByRegion) {
  const units = [];
  for (const [regionKey, levels] of Object.entries(atlasByRegion)) {
    for (const [levelKey, features] of Object.entries(levels)) {
      const featureIndex = new Map(features.map((feature) => [String(feature.properties?.HYBAS_ID), feature]));
      for (const feature of features) {
        const props = feature.properties || {};
        const ring = getFeatureOuterRing(feature);
        if (!ring?.length) continue;
        const currentOutlet = deriveAtlasTopologyOutlet(feature, featureIndex);
        const currentPath = currentOutlet ? [currentOutlet] : [];
        units.push(auditUnitAgainstRivers({
          unit_key: `atlas:${regionKey}:${levelKey}:${props.HYBAS_ID}`,
          source_type: 'atlas_hybas',
          region: regionKey,
          region_key: regionKey,
          level: Number(levelKey),
          id: String(props.HYBAS_ID),
          dataset_id: String(props.HYBAS_ID),
          parent_id: Number(props.NEXT_DOWN) > 0 ? String(props.NEXT_DOWN) : null,
          label: `HYBAS ${props.HYBAS_ID}`,
          expected_area_km2: Number(props.UP_AREA) || Number(props.SUB_AREA) || null,
          polygon_lonlat: ring,
          current: {
            path: currentPath,
            outlet: currentOutlet,
            source: currentOutlet ? 'atlas_topology' : 'none',
          },
          atlas_props: {
            next_down: props.NEXT_DOWN,
            up_area_km2: Number(props.UP_AREA) || null,
            sub_area_km2: Number(props.SUB_AREA) || null,
            pfaf_id: props.PFAF_ID || null,
            order: Number(props.ORDER) || null,
          },
        }, riverIndexByRegion[regionKey]));
      }
    }
  }
  return { units };
}

function auditUnitAgainstRivers(unit, riverIndex) {
  const bbox = computeBBox(unit.polygon_lonlat);
  const expectedArea = Number(unit.expected_area_km2) || null;
  const candidates = queryRiverCandidates(riverIndex, expandBBox(bbox, 0.06));
  const clippedCandidates = candidates
    .map((entry) => buildClippedRiverCandidate(entry, unit.polygon_lonlat, expectedArea, unit.source_type))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
  const best = clippedCandidates[0] || null;
  const calibrated = best ? buildCalibratedGeometry(best, clippedCandidates, riverIndex, unit.polygon_lonlat) : null;

  const currentOutlet = unit.current?.outlet || null;
  const currentDistanceKm = currentOutlet && calibrated?.path?.length
    ? Number(distancePointToPathKm(currentOutlet, calibrated.path).toFixed(3))
    : null;
  const currentOnRiver = Number.isFinite(currentDistanceKm)
    ? currentDistanceKm <= THRESHOLD_ON_RIVER_KM
    : false;
  const calibratedDistanceKm = calibrated?.outlet && calibrated?.path?.length
    ? Number(distancePointToPathKm(calibrated.outlet, calibrated.path).toFixed(3))
    : null;

  return {
    unit_key: unit.unit_key,
    source_type: unit.source_type,
    region: unit.region,
    region_key: unit.region_key,
    level: unit.level,
    id: unit.id,
    dataset_id: unit.dataset_id,
    parent_id: unit.parent_id || null,
    label: unit.label,
    expected_area_km2: expectedArea,
    current: {
      source: unit.current?.source || 'none',
      outlet: serializePoint(unit.current?.outlet || null),
      distance_to_calibrated_river_km: currentDistanceKm,
      on_river: currentOnRiver,
    },
    calibration: calibrated ? {
      source: calibrated.outlet.source,
      outlet: serializePoint(calibrated.outlet),
      distance_to_river_km: calibratedDistanceKm,
      on_river: calibratedDistanceKm != null ? calibratedDistanceKm <= THRESHOLD_ON_RIVER_KM : false,
      river_path_latlng: calibrated.path.map(([lon, lat]) => [round(lat), round(lon)]),
      river_feature_id: calibrated.river_feature_id,
      main_riv: calibrated.main_riv,
      ord_flow: calibrated.ord_flow,
      upland_skm: calibrated.upland_skm,
      clipped_length_km: Number(calibrated.length_km.toFixed(2)),
      score: Number(calibrated.score.toFixed(3)),
    } : null,
    candidates_found: clippedCandidates.length,
    probable_cause: classifyCause(unit, currentDistanceKm, calibrated),
    atlas_props: unit.atlas_props || null,
  };
}

function buildClippedRiverCandidate(entry, polygonRingLonLat, expectedArea, sourceType) {
  const clipped = clipLineToPolygonLonLat(entry.coords, polygonRingLonLat);
  if (!clipped.path.length) return null;
  const outlet = clipped.outlet
    ? { lon: clipped.outlet[0], lat: clipped.outlet[1], source: clipped.outletSource }
    : inferLineEndpointOutlet(clipped.path);
  if (!outlet) return null;

  const lengthKm = lineLengthKm(clipped.path);
  const areaRatio = expectedArea && entry.uplandSkm
    ? Math.min(expectedArea, entry.uplandSkm) / Math.max(expectedArea, entry.uplandSkm)
    : null;
  const distToSinkPenalty = Number.isFinite(entry.distDnKm) ? entry.distDnKm * 0.0006 : 0;
  const guideBias = sourceType === 'atlas_hybas' ? 0 : Math.log10(Math.max(entry.uplandSkm, 1));
  const areaScore = areaRatio != null ? areaRatio * 80 : guideBias * 8;
  const score = (outlet.source.includes('boundary') || outlet.source.includes('projection') ? 120 : 90)
    + areaScore
    + (entry.ordFlow || 0) * 5
    + Math.min(lengthKm, 32)
    - distToSinkPenalty;

  return {
    ...entry,
    clippedPath: clipped.path,
    clippedLengthKm: lengthKm,
    outlet,
    score,
  };
}

function buildCalibratedGeometry(best, candidates, riverIndex, polygonRingLonLat) {
  const candidateByRawId = new Map();
  candidates.forEach((candidate) => {
    candidateByRawId.set(String(candidate.rawId), candidate);
  });

  const chain = [];
  const downstream = [];
  let cursor = best;
  while (cursor) {
    const next = cursor.nextDown ? candidateByRawId.get(String(cursor.nextDown)) : null;
    if (!next || next.mainRiv !== best.mainRiv || next.rawId === cursor.rawId) break;
    downstream.push(next);
    cursor = next;
  }

  const upstream = [];
  cursor = best;
  while (cursor) {
    const upstreamIds = riverIndex.upstreamByNext.get(String(cursor.rawId)) || [];
    const next = upstreamIds
      .map((id) => riverIndex.byId.get(id))
      .filter(Boolean)
      .map((entry) => candidateByRawId.get(String(entry.rawId)))
      .filter((candidate) => candidate && candidate.mainRiv === best.mainRiv && candidate.rawId !== cursor.rawId)
      .sort((a, b) => (b.uplandSkm || 0) - (a.uplandSkm || 0))[0];
    if (!next) break;
    upstream.push(next);
    cursor = next;
  }

  chain.push(...upstream.reverse(), best, ...downstream);

  let path = [];
  for (const candidate of chain) {
    const segment = candidate.clippedPath;
    if (!segment.length) continue;
    if (!path.length) {
      path = segment.slice();
      continue;
    }
    const aligned = orientSegmentToPrevious(path[path.length - 1], segment);
    path = dedupeLonLatPath(path.concat(aligned.slice(1)));
  }

  if (!path.length) {
    path = best.clippedPath.slice();
  }

  if (path.length > MAX_PATH_POINTS) {
    path = simplifyLonLatPath(path, MAX_PATH_POINTS);
  }

  const lastSegment = chain[chain.length - 1] || best;
  let outlet = lastSegment.outlet;
  if (!distancePointToPathKm(outlet, path)) {
    // noop - outlet already on path
  }

  if (outlet && distancePointToPathKm(outlet, path) > THRESHOLD_ON_RIVER_KM) {
    const snapped = snapPointToPath(outlet, path);
    outlet = {
      lon: round(snapped.lon),
      lat: round(snapped.lat),
      source: `${outlet.source}_snapped`,
    };
    path = dedupeLonLatPath(path.slice(0, -1).concat([[outlet.lon, outlet.lat]]));
  }

  return {
    path,
    outlet,
    river_feature_id: best.id,
    main_riv: best.mainRiv,
    ord_flow: best.ordFlow,
    upland_skm: best.uplandSkm,
    length_km: lineLengthKm(path),
    score: best.score,
  };
}

function buildCalibrationCatalog(units, summary) {
  const staticById = {};
  const datasetById = {};
  const atlasByRegionLevel = { sa: {}, eu: {} };

  units.forEach((unit) => {
    if (!unit.calibration?.outlet) return;
    const entry = {
      unit_key: unit.unit_key,
      source_type: unit.source_type,
      probable_cause: unit.probable_cause,
      outlet: unit.calibration.outlet,
      river_path_latlng: unit.calibration.river_path_latlng || [],
      river_feature_id: unit.calibration.river_feature_id,
      main_riv: unit.calibration.main_riv,
      ord_flow: unit.calibration.ord_flow,
      upland_skm: unit.calibration.upland_skm,
      clipped_length_km: unit.calibration.clipped_length_km,
    };

    if (unit.source_type === 'atlas_hybas') {
      const regionBucket = atlasByRegionLevel[unit.region_key] || (atlasByRegionLevel[unit.region_key] = {});
      const levelBucket = regionBucket[String(unit.level)] || (regionBucket[String(unit.level)] = {});
      levelBucket[String(unit.id)] = entry;
      return;
    }

    if (unit.dataset_id) {
      datasetById[String(unit.dataset_id)] = entry;
    }
    if (unit.source_type === 'preloaded_watershed' && unit.id) {
      staticById[String(unit.id)] = entry;
    }
  });

  return {
    generated_at: new Date().toISOString(),
    version: '20260313-outlet-audit-1',
    threshold_on_river_km: THRESHOLD_ON_RIVER_KM,
    summary,
    static_by_id: staticById,
    dataset_by_id: datasetById,
    atlas_by_region_level: atlasByRegionLevel,
  };
}

function buildAuditSummary(units) {
  const total = units.length;
  const calibrated = units.filter((unit) => unit.calibration?.outlet).length;
  const currentOffRiver = units.filter((unit) => Number.isFinite(unit.current.distance_to_calibrated_river_km) && unit.current.distance_to_calibrated_river_km > THRESHOLD_ON_RIVER_KM).length;
  const unresolved = units.filter((unit) => !unit.calibration?.outlet).length;
  const byCause = {};
  units.forEach((unit) => {
    byCause[unit.probable_cause] = (byCause[unit.probable_cause] || 0) + 1;
  });
  const worst = units
    .filter((unit) => Number.isFinite(unit.current.distance_to_calibrated_river_km))
    .sort((a, b) => b.current.distance_to_calibrated_river_km - a.current.distance_to_calibrated_river_km)
    .slice(0, 15)
    .map((unit) => ({
      unit_key: unit.unit_key,
      label: unit.label,
      distance_km: unit.current.distance_to_calibrated_river_km,
      probable_cause: unit.probable_cause,
    }));
  return {
    total_units: total,
    calibrated_units: calibrated,
    unresolved_units: unresolved,
    current_off_river_units: currentOffRiver,
    by_cause: byCause,
    worst_cases: worst,
  };
}

function buildAuditMarkdown(summary, units) {
  const causeLines = Object.entries(summary.by_cause)
    .sort((a, b) => b[1] - a[1])
    .map(([cause, count]) => `- \`${cause}\`: ${count}`)
    .join('\n');
  const worstCases = summary.worst_cases
    .map((item) => `- \`${item.unit_key}\` · ${item.label} · ${item.distance_km.toFixed(3)} km · ${item.probable_cause}`)
    .join('\n');
  const unresolved = units
    .filter((unit) => !unit.calibration?.outlet)
    .slice(0, 25)
    .map((unit) => `- \`${unit.unit_key}\` · ${unit.label} · ${unit.probable_cause}`)
    .join('\n');

  return [
    '# AquaRisk Outlet Audit · 2026-03-13',
    '',
    '## Resumen',
    `- Unidades auditadas: ${summary.total_units}`,
    `- Unidades con calibración generada: ${summary.calibrated_units}`,
    `- Unidades con outlet actual fuera del río: ${summary.current_off_river_units}`,
    `- Unidades sin solución defendible con HydroRIVERS local: ${summary.unresolved_units}`,
    '',
    '## Causas probables',
    causeLines || '- Sin causas registradas',
    '',
    '## Peores casos detectados',
    worstCases || '- Sin casos medidos',
    '',
    '## Unidades todavía dudosas o sin geometría suficiente',
    unresolved || '- Sin pendientes',
    '',
    '## Artefactos generados',
    `- \`${CALIBRATION_PATH}\``,
    `- \`${AUDIT_JSON_PATH}\``,
  ].join('\n');
}

function classifyCause(unit, currentDistanceKm, calibrated) {
  if (!calibrated?.outlet) return 'no_hydrorivers_candidate';
  if (unit.source_type === 'preloaded_subbasin') return 'subbasin_inherits_parent_river_path';
  if (unit.source_type === 'atlas_hybas' && Number.isFinite(currentDistanceKm) && currentDistanceKm > THRESHOLD_ON_RIVER_KM) {
    return 'atlas_topology_outlet_not_snapped_to_hydrorivers';
  }
  if (unit.source_type === 'preloaded_watershed' && Number.isFinite(currentDistanceKm) && currentDistanceKm > THRESHOLD_ON_RIVER_KM) {
    return 'guide_river_path_misaligned_with_real_network';
  }
  if (Number.isFinite(currentDistanceKm) && currentDistanceKm > THRESHOLD_ON_RIVER_KM) {
    return 'outlet_not_on_active_river';
  }
  return 'already_on_river';
}

function deriveGuideGeometry({ polygon, riverPathLatLng, outletLatLng }) {
  const outletHint = Array.isArray(outletLatLng) && outletLatLng.length === 2
    ? { lat: Number(outletLatLng[0]), lon: Number(outletLatLng[1]), source: 'explicit' }
    : null;
  const rawPath = orientGuidePathDownstream(riverPathLatLng || [], outletHint);
  if (!rawPath.length) {
    return {
      path: [],
      outlet: outletHint ? { lat: outletHint.lat, lon: outletHint.lon, source: outletHint.source } : null,
      source: outletHint ? outletHint.source : 'none',
    };
  }
  let path = rawPath.slice();
  let outlet = null;
  if (polygon?.length) {
    const clipped = clipLineToPolygonLonLat(path, polygon);
    path = clipped.path.length ? clipped.path : path;
    if (clipped.outlet) {
      outlet = { lon: clipped.outlet[0], lat: clipped.outlet[1], source: clipped.outletSource };
    }
  }
  if (!outlet && path.length) {
    const last = path[path.length - 1];
    outlet = { lon: last[0], lat: last[1], source: outletHint ? 'river_path_oriented' : 'river_path' };
  }
  return { path, outlet, source: outlet?.source || 'none' };
}

function deriveAtlasTopologyOutlet(feature, featureIndex) {
  const nextDown = Number(feature?.properties?.NEXT_DOWN);
  if (!(nextDown > 0)) return null;
  const nextFeature = featureIndex.get(String(nextDown));
  if (!nextFeature) return null;
  const ringA = getFeatureOuterRing(feature);
  const ringB = getFeatureOuterRing(nextFeature);
  if (!ringA?.length || !ringB?.length) return null;
  let best = null;
  for (const coordA of ringA) {
    for (const coordB of ringB) {
      const distanceKm = haversineKm(coordA[1], coordA[0], coordB[1], coordB[0]);
      if (!best || distanceKm < best.distanceKm) {
        best = {
          lon: (coordA[0] + coordB[0]) / 2,
          lat: (coordA[1] + coordB[1]) / 2,
          distanceKm,
        };
      }
    }
  }
  if (!best) return null;
  return { lon: round(best.lon), lat: round(best.lat), source: 'atlas_topology' };
}

function buildRiverIndex(geojson) {
  const byId = new Map();
  const upstreamByNext = new Map();
  const grid = new Map();
  for (const feature of geojson.features || []) {
    const lines = lineCoordsFromGeometry(feature.geometry);
    const props = feature.properties || {};
    lines.forEach((coords, lineIndex) => {
      const id = String(lineIndex ? `${props.HYRIV_ID}:${lineIndex}` : props.HYRIV_ID);
      const bbox = computeBBox(coords);
      const entry = {
        id,
        rawId: Number(props.HYRIV_ID),
        nextDown: Number(props.NEXT_DOWN) || null,
        mainRiv: Number(props.MAIN_RIV) || null,
        ordFlow: Number(props.ORD_FLOW) || 0,
        ordStra: Number(props.ORD_STRA) || 0,
        uplandSkm: Number(props.UPLAND_SKM) || 0,
        distDnKm: Number(props.DIST_DN_KM) || 0,
        lengthKm: Number(props.LENGTH_KM) || 0,
        coords,
        bbox,
      };
      byId.set(id, entry);
      const nextKey = String(entry.nextDown || '');
      if (!upstreamByNext.has(nextKey)) upstreamByNext.set(nextKey, []);
      upstreamByNext.get(nextKey).push(id);
      for (const cellKey of listGridKeys(bbox, GRID_SIZE_DEG)) {
        if (!grid.has(cellKey)) grid.set(cellKey, []);
        grid.get(cellKey).push(id);
      }
    });
  }
  return { byId, upstreamByNext, grid, gridSize: GRID_SIZE_DEG };
}

function queryRiverCandidates(riverIndex, bbox) {
  const ids = new Set();
  for (const key of listGridKeys(bbox, riverIndex.gridSize)) {
    const cell = riverIndex.grid.get(key) || [];
    cell.forEach((id) => ids.add(id));
  }
  return [...ids]
    .map((id) => riverIndex.byId.get(id))
    .filter((entry) => entry && bboxIntersects(entry.bbox, bbox));
}

function orientGuidePathDownstream(pathLatLng, outletHint) {
  const path = convertLatLngPathToLonLat(pathLatLng || []);
  if (path.length < 2 || !outletHint) return path;
  const first = path[0];
  const last = path[path.length - 1];
  const toFirst = haversineKm(first[1], first[0], outletHint.lat, outletHint.lon);
  const toLast = haversineKm(last[1], last[0], outletHint.lat, outletHint.lon);
  return toFirst < toLast ? path.slice().reverse() : path.slice();
}

function clipLineToPolygonLonLat(path, polygonRingLonLat) {
  if (!path.length || !polygonRingLonLat?.length) return { path: [], outlet: null, outletSource: null };
  const clipped = [];
  let outlet = null;
  let outletSource = null;

  for (let index = 0; index < path.length - 1; index += 1) {
    const start = path[index];
    const end = path[index + 1];
    const startInside = pointInLinearRing(start[0], start[1], polygonRingLonLat);
    const endInside = pointInLinearRing(end[0], end[1], polygonRingLonLat);

    if (startInside && endInside) {
      if (!clipped.length) clipped.push(start);
      clipped.push(end);
      continue;
    }

    if (!startInside && endInside) {
      const entry = findSegmentBoundaryIntersectionLonLat(start, end, polygonRingLonLat) || end;
      clipped.push(entry, end);
      continue;
    }

    if (startInside && !endInside) {
      const exit = findSegmentBoundaryIntersectionLonLat(start, end, polygonRingLonLat) || end;
      if (!clipped.length) clipped.push(start);
      clipped.push(exit);
      outlet = exit;
      outletSource = 'hydrorivers_boundary';
      break;
    }
  }

  const deduped = dedupeLonLatPath(clipped.length ? clipped : path.filter((coord) => pointInLinearRing(coord[0], coord[1], polygonRingLonLat)));
  if (deduped.length >= 2 && !outlet) {
    const last = deduped[deduped.length - 1];
    const prev = deduped[deduped.length - 2];
    if (pointInLinearRing(last[0], last[1], polygonRingLonLat)) {
      const projected = projectLineEndpointToBoundaryLonLat(prev, last, polygonRingLonLat);
      if (projected) {
        deduped[deduped.length - 1] = projected;
        outlet = projected;
        outletSource = 'hydrorivers_projection';
      }
    }
  }

  return {
    path: deduped,
    outlet,
    outletSource,
  };
}

function inferLineEndpointOutlet(path) {
  const last = path[path.length - 1];
  if (!last) return null;
  return { lon: last[0], lat: last[1], source: 'hydrorivers_endpoint' };
}

function orientSegmentToPrevious(prevLast, segment) {
  if (!prevLast || segment.length < 2) return segment.slice();
  const direct = haversineKm(prevLast[1], prevLast[0], segment[0][1], segment[0][0]);
  const reversed = haversineKm(prevLast[1], prevLast[0], segment[segment.length - 1][1], segment[segment.length - 1][0]);
  return direct <= reversed ? segment.slice() : segment.slice().reverse();
}

function lineCoordsFromGeometry(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates];
  if (geometry.type === 'MultiLineString') return geometry.coordinates;
  return [];
}

function getFeatureOuterRing(feature) {
  const geometry = feature?.geometry;
  if (!geometry) return null;
  if (geometry.type === 'Polygon') return geometry.coordinates?.[0] || null;
  if (geometry.type === 'MultiPolygon') return geometry.coordinates?.[0]?.[0] || null;
  return null;
}

function convertLatLngPathToLonLat(pathLatLng) {
  return (pathLatLng || [])
    .map((coord) => Array.isArray(coord) && coord.length >= 2 ? [Number(coord[1]), Number(coord[0])] : null)
    .filter((coord) => coord && coord.every(Number.isFinite));
}

function listGridKeys(bbox, gridSize) {
  const minX = Math.floor((bbox.minLon + 180) / gridSize);
  const maxX = Math.floor((bbox.maxLon + 180) / gridSize);
  const minY = Math.floor((bbox.minLat + 90) / gridSize);
  const maxY = Math.floor((bbox.maxLat + 90) / gridSize);
  const keys = [];
  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      keys.push(`${x}:${y}`);
    }
  }
  return keys;
}

function computeBBox(coords) {
  return coords.reduce((acc, coord) => ({
    minLon: Math.min(acc.minLon, coord[0]),
    minLat: Math.min(acc.minLat, coord[1]),
    maxLon: Math.max(acc.maxLon, coord[0]),
    maxLat: Math.max(acc.maxLat, coord[1]),
  }), {
    minLon: Infinity,
    minLat: Infinity,
    maxLon: -Infinity,
    maxLat: -Infinity,
  });
}

function expandBBox(bbox, paddingDeg = 0.05) {
  return {
    minLon: bbox.minLon - paddingDeg,
    minLat: bbox.minLat - paddingDeg,
    maxLon: bbox.maxLon + paddingDeg,
    maxLat: bbox.maxLat + paddingDeg,
  };
}

function bboxIntersects(a, b) {
  return !(a.maxLon < b.minLon || a.minLon > b.maxLon || a.maxLat < b.minLat || a.minLat > b.maxLat);
}

function pointInLinearRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = Number(ring[i][0]);
    const yi = Number(ring[i][1]);
    const xj = Number(ring[j][0]);
    const yj = Number(ring[j][1]);
    const intersects = ((yi > lat) !== (yj > lat))
      && (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

function segmentIntersectionLonLat(a, b, c, d) {
  const [x1, y1] = a;
  const [x2, y2] = b;
  const [x3, y3] = c;
  const [x4, y4] = d;
  const denominator = ((x1 - x2) * (y3 - y4)) - ((y1 - y2) * (x3 - x4));
  if (Math.abs(denominator) < 1e-12) return null;
  const pre = (x1 * y2) - (y1 * x2);
  const post = (x3 * y4) - (y3 * x4);
  const x = ((pre * (x3 - x4)) - ((x1 - x2) * post)) / denominator;
  const y = ((pre * (y3 - y4)) - ((y1 - y2) * post)) / denominator;
  const epsilon = 1e-9;
  const withinAB = x >= Math.min(x1, x2) - epsilon && x <= Math.max(x1, x2) + epsilon
    && y >= Math.min(y1, y2) - epsilon && y <= Math.max(y1, y2) + epsilon;
  const withinCD = x >= Math.min(x3, x4) - epsilon && x <= Math.max(x3, x4) + epsilon
    && y >= Math.min(y3, y4) - epsilon && y <= Math.max(y3, y4) + epsilon;
  if (!withinAB || !withinCD) return null;
  return [round(x), round(y)];
}

function findSegmentBoundaryIntersectionLonLat(start, end, polygonRingLonLat) {
  let best = null;
  for (let index = 0; index < polygonRingLonLat.length; index += 1) {
    const current = polygonRingLonLat[index];
    const next = polygonRingLonLat[(index + 1) % polygonRingLonLat.length];
    const intersection = segmentIntersectionLonLat(start, end, current, next);
    if (!intersection) continue;
    const distanceToEnd = haversineKm(intersection[1], intersection[0], end[1], end[0]);
    if (!best || distanceToEnd < best.distanceToEnd) {
      best = { intersection, distanceToEnd };
    }
  }
  return best ? best.intersection : null;
}

function projectLineEndpointToBoundaryLonLat(prev, last, polygonRingLonLat) {
  const deltaLon = last[0] - prev[0];
  const deltaLat = last[1] - prev[1];
  if (Math.abs(deltaLon) < 1e-9 && Math.abs(deltaLat) < 1e-9) return null;
  const farPoint = [last[0] + deltaLon * 240, last[1] + deltaLat * 240];
  let best = null;
  for (let index = 0; index < polygonRingLonLat.length; index += 1) {
    const current = polygonRingLonLat[index];
    const next = polygonRingLonLat[(index + 1) % polygonRingLonLat.length];
    const intersection = segmentIntersectionLonLat(last, farPoint, current, next);
    if (!intersection) continue;
    const distance = haversineKm(last[1], last[0], intersection[1], intersection[0]);
    if (distance <= 1e-6) continue;
    if (!best || distance < best.distance) {
      best = { intersection, distance };
    }
  }
  return best ? best.intersection : null;
}

function dedupeLonLatPath(path) {
  return (path || []).filter((coord, index) => {
    if (!Array.isArray(coord) || coord.length < 2) return false;
    if (index === 0) return true;
    const prev = path[index - 1];
    return !prev || Math.abs(prev[0] - coord[0]) > 1e-9 || Math.abs(prev[1] - coord[1]) > 1e-9;
  });
}

function simplifyLonLatPath(path, maxPoints) {
  if (path.length <= maxPoints) return path.slice();
  const keep = [path[0]];
  const step = Math.ceil((path.length - 2) / Math.max(maxPoints - 2, 1));
  for (let index = 1; index < path.length - 1; index += step) {
    keep.push(path[index]);
  }
  keep.push(path[path.length - 1]);
  return dedupeLonLatPath(keep);
}

function lineLengthKm(path) {
  let length = 0;
  for (let index = 0; index < path.length - 1; index += 1) {
    length += haversineKm(path[index][1], path[index][0], path[index + 1][1], path[index + 1][0]);
  }
  return length;
}

function distancePointToPathKm(point, path) {
  if (!point || !path?.length) return Infinity;
  let best = Infinity;
  for (let index = 0; index < path.length - 1; index += 1) {
    best = Math.min(best, pointToSegmentDistanceKm([point.lon, point.lat], path[index], path[index + 1]));
  }
  return best;
}

function pointToSegmentDistanceKm(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (Math.abs(dx) < 1e-12 && Math.abs(dy) < 1e-12) {
    return haversineKm(y, x, y1, x1);
  }
  let t = ((x - x1) * dx + (y - y1) * dy) / ((dx * dx) + (dy * dy));
  t = Math.max(0, Math.min(1, t));
  return haversineKm(y, x, y1 + t * dy, x1 + t * dx);
}

function snapPointToPath(point, path) {
  let best = { distance: Infinity, lon: point.lon, lat: point.lat };
  for (let index = 0; index < path.length - 1; index += 1) {
    const snapped = snapPointToSegment([point.lon, point.lat], path[index], path[index + 1]);
    if (snapped.distance < best.distance) best = snapped;
  }
  return best;
}

function snapPointToSegment(point, start, end) {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t = 0;
  if (Math.abs(dx) > 1e-12 || Math.abs(dy) > 1e-12) {
    t = ((x - x1) * dx + (y - y1) * dy) / ((dx * dx) + (dy * dy));
    t = Math.max(0, Math.min(1, t));
  }
  const lon = x1 + t * dx;
  const lat = y1 + t * dy;
  return {
    lon,
    lat,
    distance: haversineKm(y, x, lat, lon),
  };
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = (Math.sin(dLat / 2) ** 2)
    + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * (Math.sin(dLon / 2) ** 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function serializePoint(point) {
  if (!point) return null;
  return {
    lat: round(point.lat),
    lng: round(point.lon),
    source: point.source,
  };
}

function round(value) {
  return Number(Number(value).toFixed(5));
}
