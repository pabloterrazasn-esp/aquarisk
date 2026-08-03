#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
const ROOT = path.resolve(process.env.ROOT_DIR || '/Users/pablo/Desktop/Claude Terranava');
const DATA_DIR = path.join(ROOT, 'aquarisk-data');
const OUTPUT_PATH = path.join(DATA_DIR, 'metadata', 'hydrology-qa.v1.json');

function classifyClimate(aridityIndex) {
  if (aridityIndex > 1.0) return 'Húmedo';
  if (aridityIndex > 0.65) return 'Subhúmedo';
  if (aridityIndex > 0.50) return 'Subhúmedo seco';
  if (aridityIndex > 0.20) return 'Semiárido';
  return 'Árido';
}

function annualTemperatureBounds(region, entry) {
  if (entry.calibration_anchor?.template === 'altiplano') return { min: 3, max: 15 };
  if (entry.calibration_anchor?.template === 'chaco_hot_semiarid') return { min: 16, max: 30 };
  if (entry.calibration_anchor?.template === 'tropical_amazon') return { min: 20, max: 30 };
  if (entry.calibration_anchor?.template === 'subtropical_valley') return { min: 12, max: 26 };
  if (region === 'eu') return { min: -2, max: 28 };
  return { min: 3, max: 32 };
}

function validateSeriesLength(values) {
  return Array.isArray(values) && values.length === 12;
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function summarizeDataset(datasetKey, entries, region) {
  const summary = {
    dataset: datasetKey,
    record_count: 0,
    error_count: 0,
    warning_count: 0,
    issues: {
      invalid_monthly_shape: 0,
      negative_precipitation: 0,
      negative_et0: 0,
      invalid_temperature: 0,
      out_of_range_temperature: 0,
      annual_water_balance_mismatch: 0,
      annual_aridity_mismatch: 0,
      classification_mismatch: 0,
      missing_quality_flag: 0,
      unexpected_nulls: 0,
      invalid_calibration_distance: 0,
    },
    samples: [],
  };

  for (const [entryId, entry] of Object.entries(entries || {})) {
    summary.record_count += 1;
    const issues = [];
    const monthly = entry.monthly || {};
    const p = monthly.p_mm;
    const et = monthly.et0_mm;
    const t = monthly.t_c;

    if (!validateSeriesLength(p) || !validateSeriesLength(et) || !validateSeriesLength(t)) {
      summary.issues.invalid_monthly_shape += 1;
      issues.push('invalid_monthly_shape');
    }

    if ((p || []).some((value) => !isFiniteNumber(value) || Number(value) < 0)) {
      summary.issues.negative_precipitation += 1;
      issues.push('negative_precipitation');
    }

    if ((et || []).some((value) => !isFiniteNumber(value) || Number(value) < 0)) {
      summary.issues.negative_et0 += 1;
      issues.push('negative_et0');
    }

    if ((t || []).some((value) => !isFiniteNumber(value))) {
      summary.issues.invalid_temperature += 1;
      issues.push('invalid_temperature');
    }

    const annual = entry.annual || {};
    const annualP = Number(annual.p_mm);
    const annualET = Number(annual.et0_mm);
    const annualT = Number(annual.t_mean_c);
    const aridity = Number(annual.aridity_index);
    const waterBalance = Number(annual.water_balance_mm);
    const computedBalance = Math.round(annualP - annualET);
    const computedAridity = annualET > 0 ? Number((annualP / annualET).toFixed(2)) : null;
    const bounds = annualTemperatureBounds(region, entry);

    if (![annualP, annualET, annualT, aridity, waterBalance].every((value) => Number.isFinite(value))) {
      summary.issues.unexpected_nulls += 1;
      issues.push('unexpected_nulls');
    }

    if (Number.isFinite(annualT) && (annualT < bounds.min || annualT > bounds.max)) {
      summary.issues.out_of_range_temperature += 1;
      issues.push('out_of_range_temperature');
    }

    if (Number.isFinite(waterBalance) && Number.isFinite(computedBalance) && Math.abs(waterBalance - computedBalance) > 2) {
      summary.issues.annual_water_balance_mismatch += 1;
      issues.push('annual_water_balance_mismatch');
    }

    if (computedAridity != null && Math.abs(aridity - computedAridity) > 0.03) {
      summary.issues.annual_aridity_mismatch += 1;
      issues.push('annual_aridity_mismatch');
    }

    const expectedClass = classifyClimate(aridity);
    if ((entry.classification?.label || '') !== expectedClass) {
      summary.issues.classification_mismatch += 1;
      issues.push('classification_mismatch');
    }

    if (!entry.quality_flag) {
      summary.issues.missing_quality_flag += 1;
      issues.push('missing_quality_flag');
    }

    const anchorDistance = Number(entry.calibration_anchor?.distance_km);
    const anchorLevel = entry.calibration_anchor?.anchor_level;
    if (anchorLevel === 'local' && anchorDistance > 80) {
      summary.issues.invalid_calibration_distance += 1;
      issues.push('invalid_calibration_distance');
    }
    if (anchorLevel === 'regional' && (anchorDistance <= 80 || anchorDistance > 180)) {
      summary.issues.invalid_calibration_distance += 1;
      issues.push('invalid_calibration_distance');
    }

    if (issues.length) {
      summary.error_count += issues.filter((issue) => !['out_of_range_temperature', 'classification_mismatch'].includes(issue)).length;
      summary.warning_count += issues.filter((issue) => ['out_of_range_temperature', 'classification_mismatch'].includes(issue)).length;
      if (summary.samples.length < 12) {
        summary.samples.push({
          id: entryId,
          issues,
          annual: {
            p_mm: annualP,
            et0_mm: annualET,
            t_mean_c: annualT,
            aridity_index: aridity,
            water_balance_mm: waterBalance,
          },
          calibration_anchor: entry.calibration_anchor || null,
        });
      }
    }
  }

  return summary;
}

async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function buildQaSummary() {
  const manifest = await loadJson(path.join(DATA_DIR, 'manifest', 'index.v1.json'));
  const datasets = [];

  const guide = await loadJson(path.join(DATA_DIR, 'climate', 'guide-basins.v1.json'));
  datasets.push(summarizeDataset('guide-basins', guide.entries, 'bolivia'));

  for (const region of Object.keys(manifest.hybas || {})) {
    const levels = manifest.hybas[region]?.levels || {};
    for (const level of Object.keys(levels)) {
      const climateIndexPath = levels[level].climate_index.replace('/aquarisk-data/', '');
      const climateIndex = await loadJson(path.join(DATA_DIR, climateIndexPath));
      datasets.push(summarizeDataset(`hybas-${region}-lev${level}`, climateIndex.entries, region));
    }
  }

  const totals = datasets.reduce((accumulator, dataset) => {
    accumulator.datasets += 1;
    accumulator.records += dataset.record_count;
    accumulator.errors += dataset.error_count;
    accumulator.warnings += dataset.warning_count;
    for (const [issue, count] of Object.entries(dataset.issues)) {
      accumulator.issues[issue] = (accumulator.issues[issue] || 0) + count;
    }
    return accumulator;
  }, {
    datasets: 0,
    records: 0,
    errors: 0,
    warnings: 0,
    issues: {},
  });

  return {
    version: 'v1',
    generated_at: new Date().toISOString(),
    scope: 'AquaRisk hydrology climate datasets',
    totals,
    datasets,
  };
}

async function main() {
  const summary = await buildQaSummary();
  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(`QA hidrológico generado: ${summary.totals.datasets} datasets · ${summary.totals.records} registros · ${summary.totals.errors} errores · ${summary.totals.warnings} advertencias`);
  if (summary.totals.errors > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
