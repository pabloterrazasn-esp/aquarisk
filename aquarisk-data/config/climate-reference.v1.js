(() => {
  const payload = {"version":"v1","templates":{"tropical_amazon":{"p":[0.14,0.14,0.13,0.11,0.08,0.05,0.04,0.04,0.04,0.06,0.08,0.09],"et":[0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.08,0.09,0.09],"t":[26.2,26.1,25.8,25.2,24.4,23.8,23.7,24.4,25.2,25.9,26.1,26.2],"variability":0.14},"tropical_savanna":{"p":[0.16,0.15,0.13,0.1,0.07,0.04,0.03,0.03,0.04,0.07,0.09,0.09],"et":[0.07,0.07,0.08,0.08,0.08,0.09,0.1,0.1,0.09,0.08,0.08,0.08],"t":[27.1,27,26.4,25.7,24.8,24.1,24,25,26.2,27.1,27.4,27.3],"variability":0.18},"summer_monsoon":{"p":[0.15,0.18,0.18,0.09,0.04,0.02,0.01,0.01,0.03,0.06,0.09,0.14],"et":[0.08,0.08,0.09,0.09,0.09,0.09,0.08,0.08,0.08,0.08,0.08,0.08],"t":[23.1,22.6,21.6,19.2,16.4,13.7,13,15.1,17.6,20.1,21.7,22.7],"variability":0.26},"subtropical_transition":{"p":[0.15,0.17,0.15,0.09,0.05,0.02,0.01,0.01,0.03,0.07,0.1,0.15],"et":[0.08,0.08,0.09,0.09,0.1,0.1,0.11,0.1,0.09,0.09,0.08,0.07],"t":[26.5,25.8,24,21,17.5,14.9,14.6,16.8,19.5,22.8,24.6,25.8],"variability":0.24},"subtropical_valley":{"p":[0.16,0.18,0.16,0.08,0.03,0.01,0.01,0.01,0.03,0.07,0.1,0.16],"et":[0.07,0.07,0.08,0.08,0.09,0.1,0.11,0.1,0.09,0.08,0.07,0.06],"t":[23.8,23.4,22,19,15.4,12.7,12.4,14.5,17.3,19.8,21.9,23.2],"variability":0.22},"chaco_hot_semiarid":{"p":[0.15,0.18,0.17,0.08,0.04,0.02,0.01,0.01,0.03,0.06,0.1,0.15],"et":[0.09,0.08,0.09,0.09,0.09,0.1,0.1,0.1,0.09,0.09,0.09,0.09],"t":[27.8,27.1,25.6,22.8,19,16.8,16.5,18.7,21.5,24.6,26.5,27.4],"variability":0.25},"andean_semiarid":{"p":[0.16,0.18,0.16,0.08,0.03,0.01,0.01,0.01,0.03,0.07,0.1,0.16],"et":[0.07,0.07,0.08,0.08,0.09,0.1,0.11,0.1,0.09,0.08,0.07,0.06],"t":[17.2,16.9,15.7,13.4,10.8,8.6,8.4,10,12.3,14.6,15.8,16.7],"variability":0.24},"altiplano":{"p":[0.12,0.15,0.16,0.08,0.03,0.01,0.01,0.01,0.03,0.08,0.14,0.18],"et":[0.06,0.07,0.08,0.09,0.1,0.11,0.11,0.1,0.09,0.07,0.06,0.06],"t":[10.8,10.6,10.1,8.5,6.8,5.1,4.8,5.9,7.5,8.9,9.7,10.3],"variability":0.23},"mediterranean_winter":{"p":[0.17,0.15,0.11,0.08,0.05,0.03,0.01,0.01,0.05,0.12,0.12,0.1],"et":[0.03,0.04,0.06,0.08,0.11,0.14,0.16,0.15,0.1,0.06,0.04,0.03],"t":[9,10.6,13,15.2,18.9,23.5,27.2,27,23,18.2,12.8,9.8],"variability":0.2},"mediterranean_snowmelt":{"p":[0.1,0.09,0.09,0.12,0.14,0.1,0.06,0.05,0.06,0.08,0.06,0.05],"et":[0.02,0.03,0.05,0.07,0.1,0.13,0.16,0.16,0.11,0.08,0.05,0.04],"t":[5.5,7.2,10.1,12.4,16.3,20.8,24.2,24,20.1,15.1,9.3,6.2],"variability":0.17},"mediterranean_central":{"p":[0.14,0.13,0.11,0.1,0.08,0.04,0.02,0.02,0.05,0.11,0.11,0.09],"et":[0.03,0.04,0.06,0.08,0.11,0.15,0.17,0.16,0.1,0.05,0.03,0.02],"t":[7.8,9.4,12.3,14.7,18.3,23.5,27.7,27.3,23.1,17.4,11.5,8.6],"variability":0.18},"mediterranean_autumn":{"p":[0.1,0.1,0.07,0.07,0.06,0.03,0.01,0.02,0.2,0.18,0.11,0.05],"et":[0.03,0.04,0.06,0.08,0.11,0.15,0.18,0.17,0.1,0.05,0.02,0.01],"t":[8.8,10.6,13.1,15.5,19.3,24.2,27.8,27.6,24.2,18.3,12.3,9.5],"variability":0.28},"atlantic":{"p":[0.13,0.12,0.11,0.1,0.09,0.07,0.06,0.06,0.07,0.08,0.06,0.05],"et":[0.03,0.04,0.06,0.08,0.1,0.13,0.15,0.14,0.1,0.07,0.05,0.05],"t":[8.7,9.5,11,12.5,15,17.7,20.1,20.4,18.6,15.2,11.5,9.2],"variability":0.15}},"annualDefaults":{"tropical_amazon":{"P":1980,"PET":1140},"tropical_savanna":{"P":1540,"PET":1110},"summer_monsoon":{"P":720,"PET":1220},"subtropical_transition":{"P":760,"PET":1300},"subtropical_valley":{"P":620,"PET":1180},"chaco_hot_semiarid":{"P":680,"PET":1450},"andean_semiarid":{"P":520,"PET":1080},"altiplano":{"P":340,"PET":700},"mediterranean_winter":{"P":610,"PET":930},"mediterranean_snowmelt":{"P":760,"PET":780},"mediterranean_central":{"P":680,"PET":770},"mediterranean_autumn":{"P":460,"PET":900},"atlantic":{"P":1360,"PET":650}}};
  const ATLAS_REFERENCE_DEFAULTS = payload.annualDefaults;
  const clampValue = function clampValue(value, min, max) {
  return Math.max(min, Math.min(max, value));
};
  const normalizeRange = function normalizeRange(value, min, max) {
  if (!Number.isFinite(value) || max === min) return 0.5;
  return clampValue((value - min) / (max - min), 0, 1);
};
  const normalizeWeights = function normalizeWeights(weights = []) {
  const safe = weights.map((value) => Number(value) || 0);
  const total = safe.reduce((sum, value) => sum + value, 0);
  if (!safe.length) return [];
  if (!Number.isFinite(total) || total <= 0) {
    const uniform = 1 / safe.length;
    return safe.map(() => uniform);
  }
  return safe.map((value) => value / total);
};
  const distributeAnnualValues = function distributeAnnualValues(total, weights, digits = 1) {
  const normalized = normalizeWeights(weights);
  if (!normalized.length) return [];

  const factor = 10 ** digits;
  const targetUnits = Math.max(0, Math.round((Number(total) || 0) * factor));
  const rawUnits = normalized.map((weight) => targetUnits * weight);
  const units = rawUnits.map((value) => Math.floor(value + 1e-9));
  let remainder = targetUnits - units.reduce((sum, value) => sum + value, 0);

  const order = rawUnits
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction);

  let cursor = 0;
  while (remainder > 0 && order.length) {
    units[order[cursor % order.length].index] += 1;
    remainder -= 1;
    cursor += 1;
  }

  return units.map((value) => Number((value / factor).toFixed(digits)));
};
  const getAtlasReferenceTemplate = function getAtlasReferenceTemplate(regionKey, lat, lon, props = {}) {
  const safeLat = Number(lat);
  const safeLon = Number(lon);
  if (regionKey === 'sa') {
    if (Number(props.ENDO) === 1) return 'altiplano';
    if (safeLat <= -19.5 && safeLon <= -65.0) return 'andean_semiarid';
    if (safeLat <= -20.5 && safeLon >= -63.3) return 'chaco_hot_semiarid';
    if (safeLat <= -19.5 && safeLon <= -63.9) return 'subtropical_valley';
    if (safeLat <= -18.0) return 'subtropical_transition';
    if (safeLat <= -12.0 && safeLon >= -64.5) return 'tropical_savanna';
    return 'tropical_amazon';
  }

  if (regionKey === 'eu') {
    if (safeLon <= -7.0 && safeLat >= 41.2) return 'atlantic';
    if (safeLat >= 41.4 && safeLon >= -2.6) return 'mediterranean_snowmelt';
    if (safeLon >= -1.8 && safeLat <= 40.2) return 'mediterranean_autumn';
    if (safeLon <= -4.8 && safeLat <= 39.8) return 'mediterranean_winter';
    return 'mediterranean_central';
  }

  return safeLat < 0 ? 'summer_monsoon' : 'mediterranean_central';
};
  const getAtlasReferenceAnnuals = function getAtlasReferenceAnnuals(templateKey, regionKey, lat, lon, props = {}) {
  const defaults = ATLAS_REFERENCE_DEFAULTS[templateKey];
  if (!defaults) return null;

  const safeLat = Number(lat);
  const safeLon = Number(lon);
  const absLat = Math.abs(safeLat);
  const westness = normalizeRange(-safeLon, 58, 71);
  const upArea = Number(props.UP_AREA) || Number(props.SUB_AREA) || 0;
  const areaFactor = normalizeRange(Math.log10(Math.max(upArea, 100)), 2, 6);

  let annualP = defaults.P;
  let annualPET = defaults.PET;

  if (regionKey === 'sa') {
    if (templateKey === 'tropical_amazon') {
      annualP = 2250 - normalizeRange(absLat, 7, 16) * 520 - westness * 140;
      annualPET = 1040 + normalizeRange(absLat, 7, 16) * 110;
    } else if (templateKey === 'tropical_savanna') {
      annualP = 1680 - normalizeRange(absLat, 10, 18) * 260 + areaFactor * 60;
      annualPET = 1080 + normalizeRange(absLat, 10, 18) * 90;
    } else if (templateKey === 'summer_monsoon') {
      annualP = 620 + westness * 160 + areaFactor * 70;
      annualPET = 1180 + normalizeRange(absLat, 18, 25) * 90;
    } else if (templateKey === 'subtropical_transition') {
      annualP = 700 + westness * 150 + areaFactor * 50;
      annualPET = 1260 + normalizeRange(absLat, 18, 26) * 80;
    } else if (templateKey === 'subtropical_valley') {
      annualP = 560 + westness * 110 + areaFactor * 45;
      annualPET = 1120 + normalizeRange(absLat, 18, 25) * 60;
    } else if (templateKey === 'chaco_hot_semiarid') {
      annualP = 610 + westness * 140 + areaFactor * 55;
      annualPET = 1380 + normalizeRange(absLat, 19, 27) * 120;
    } else if (templateKey === 'andean_semiarid') {
      annualP = 430 + westness * 120 + areaFactor * 40;
      annualPET = 1020 + normalizeRange(absLat, 18, 25) * 70;
    } else if (templateKey === 'altiplano') {
      annualP = 280 + normalizeRange(absLat, 14, 23) * 110;
      annualPET = 650 + areaFactor * 60;
    }
  } else if (regionKey === 'eu') {
    const eastness = normalizeRange(safeLon, -9, 1);
    if (templateKey === 'atlantic') {
      annualP = 1450 - eastness * 190;
      annualPET = 620 + eastness * 40;
    } else if (templateKey === 'mediterranean_snowmelt') {
      annualP = 700 + normalizeRange(safeLat, 41, 44) * 120 + areaFactor * 30;
      annualPET = 740 + eastness * 55;
    } else if (templateKey === 'mediterranean_autumn') {
      annualP = 420 + eastness * 80 + areaFactor * 20;
      annualPET = 870 + normalizeRange(safeLat, 37, 40) * 50;
    } else if (templateKey === 'mediterranean_winter') {
      annualP = 560 + areaFactor * 50;
      annualPET = 900 + eastness * 35;
    } else if (templateKey === 'mediterranean_central') {
      annualP = 640 + areaFactor * 45 - eastness * 30;
      annualPET = 760 + eastness * 55;
    }
  }

  return {
    P: Math.round(clampValue(annualP, 220, 2800)),
    PET: Math.round(clampValue(annualPET, 420, 1800)),
  };
};
  window.AQUARISK_CLIMATE_REFERENCE = payload;
  window.AquaRiskClimate = {
    version: payload.version,
    templates: payload.templates,
    annualDefaults: payload.annualDefaults,
    clampValue,
    normalizeRange,
    normalizeWeights,
    distributeAnnualValues,
    getAtlasReferenceTemplate,
    getAtlasReferenceAnnuals,
  };
})();
