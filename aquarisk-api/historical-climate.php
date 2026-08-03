<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=UTF-8');
header('Cache-Control: public, max-age=86400, s-maxage=86400');
header('Access-Control-Allow-Origin: *');

function respond(int $status, array $payload): never
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function average_values(array $values, int $digits = 1): float
{
    $valid = array_values(array_filter($values, static fn($value) => is_numeric($value)));
    if (!$valid) {
        return 0.0;
    }
    $factor = 10 ** $digits;
    $mean = array_sum($valid) / count($valid);
    return round($mean * $factor) / $factor;
}

function init_year_bucket(): array
{
    return array_fill(0, 12, [
        'p' => 0.0,
        'et' => 0.0,
        't_sum' => 0.0,
        't_count' => 0,
    ]);
}

function fetch_open_meteo_chunk(float $lat, float $lon, int $startYear, int $endYear): array
{
    $query = http_build_query([
        'latitude' => number_format($lat, 4, '.', ''),
        'longitude' => number_format($lon, 4, '.', ''),
        'start_date' => sprintf('%04d-01-01', $startYear),
        'end_date' => sprintf('%04d-12-31', $endYear),
        'daily' => 'precipitation_sum,et0_fao_evapotranspiration,temperature_2m_mean',
        'models' => 'era5',
        'timezone' => 'GMT',
    ]);
    $url = 'https://archive-api.open-meteo.com/v1/archive?' . $query;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 20,
        CURLOPT_TIMEOUT => 60,
        CURLOPT_IPRESOLVE => CURL_IPRESOLVE_V4,
        CURLOPT_ENCODING => '',
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'User-Agent: TerraNava-AquaRisk/2.2',
        ],
    ]);

    $body = curl_exec($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($body === false || $error !== '') {
        throw new RuntimeException('Open-Meteo request failed: ' . ($error ?: 'unknown curl error'));
    }

    $data = json_decode($body, true);
    if (!is_array($data)) {
        throw new RuntimeException('Open-Meteo returned invalid JSON');
    }

    if ($status !== 200 || empty($data['daily']['time'])) {
        $message = $data['reason'] ?? $data['error'] ?? ('Open-Meteo HTTP ' . $status);
        throw new RuntimeException($message);
    }

    return $data['daily'];
}

function aggregate_daily_payload(array $daily, array &$years): void
{
    $dates = $daily['time'] ?? [];
    foreach ($dates as $index => $date) {
        $year = (int) substr((string) $date, 0, 4);
        $monthIndex = (int) substr((string) $date, 5, 2) - 1;
        if ($year <= 0 || $monthIndex < 0 || $monthIndex > 11) {
            continue;
        }

        if (!isset($years[$year])) {
            $years[$year] = init_year_bucket();
        }

        $bucket = &$years[$year][$monthIndex];

        $precip = $daily['precipitation_sum'][$index] ?? null;
        $et0 = $daily['et0_fao_evapotranspiration'][$index] ?? null;
        $temp = $daily['temperature_2m_mean'][$index] ?? null;

        if (is_numeric($precip)) {
            $bucket['p'] += (float) $precip;
        }
        if (is_numeric($et0)) {
            $bucket['et'] += (float) $et0;
        }
        if (is_numeric($temp)) {
            $bucket['t_sum'] += (float) $temp;
            $bucket['t_count'] += 1;
        }
    }
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    respond(405, ['error' => 'Method not allowed']);
}

$lat = filter_input(INPUT_GET, 'latitude', FILTER_VALIDATE_FLOAT);
$lon = filter_input(INPUT_GET, 'longitude', FILTER_VALIDATE_FLOAT);
if ($lat === false || $lon === false || $lat === null || $lon === null) {
    respond(400, ['error' => 'latitude and longitude are required']);
}
if ($lat < -90 || $lat > 90 || $lon < -180 || $lon > 180) {
    respond(400, ['error' => 'latitude or longitude out of range']);
}

$defaultEndYear = max(1940, (int) gmdate('Y') - 1);
$endYear = filter_input(INPUT_GET, 'end_year', FILTER_VALIDATE_INT);
$endYear = $endYear ?: $defaultEndYear;
$endYear = min($defaultEndYear, max(1940, $endYear));

$startYear = filter_input(INPUT_GET, 'start_year', FILTER_VALIDATE_INT);
$startYear = $startYear ?: 1981;
$startYear = min($endYear, max(1981, $startYear));

$publicRoot = dirname(__DIR__);
$cacheRoot = basename($publicRoot) === 'public_html'
    ? dirname($publicRoot) . '/private_html/aquarisk-cache/climate'
    : __DIR__ . '/cache';
if (!is_dir($cacheRoot) && !mkdir($cacheRoot, 0775, true) && !is_dir($cacheRoot)) {
    respond(500, ['error' => 'Unable to prepare climate cache']);
}

$cacheKey = sprintf(
    'v1_%s_%s_%d_%d.json',
    str_replace(['-', '.'], ['m', '_'], number_format($lat, 4, '.', '')),
    str_replace(['-', '.'], ['m', '_'], number_format($lon, 4, '.', '')),
    $startYear,
    $endYear
);
$cacheFile = $cacheRoot . '/' . $cacheKey;

if (is_file($cacheFile)) {
    $cached = file_get_contents($cacheFile);
    if ($cached !== false) {
        echo $cached;
        exit;
    }
}

$years = [];

try {
    $daily = fetch_open_meteo_chunk((float) $lat, (float) $lon, $startYear, $endYear);
    aggregate_daily_payload($daily, $years);
} catch (Throwable $error) {
    respond(502, ['error' => 'Upstream climate request failed', 'detail' => $error->getMessage()]);
}

ksort($years);
$sortedYears = array_keys($years);
if (!$sortedYears) {
    respond(502, ['error' => 'No daily data returned for requested point']);
}

$monthlyByYear = [];
$monthly = [];
for ($monthIndex = 0; $monthIndex < 12; $monthIndex += 1) {
    $series = [];
    foreach ($sortedYears as $year) {
        $bucket = $years[$year][$monthIndex];
        $series[] = [
            'year' => (int) $year,
            'p' => round((float) $bucket['p'], 1),
            'et' => round((float) $bucket['et'], 1),
            't' => $bucket['t_count'] > 0 ? round($bucket['t_sum'] / $bucket['t_count'], 1) : null,
        ];
    }
    $monthlyByYear[] = $series;
    $monthly[] = [
        'p' => average_values(array_column($series, 'p'), 1),
        'et' => average_values(array_column($series, 'et'), 1),
        't' => average_values(array_column($series, 't'), 1),
    ];
}

$payload = [
    'monthly' => $monthly,
    'monthlyByYear' => $monthlyByYear,
    'startYear' => (int) $sortedYears[0],
    'endYear' => (int) $sortedYears[count($sortedYears) - 1],
    'yearCount' => count($sortedYears),
    'mode' => 'historical_online',
    'sourceLabel' => 'Proxy TerraNava · Open-Meteo ERA5',
    'qualityFlag' => 'Open-Meteo · ERA5 · cache TerraNava',
];

file_put_contents($cacheFile, json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
