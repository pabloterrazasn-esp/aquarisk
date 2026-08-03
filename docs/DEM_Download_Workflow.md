# DEM Download Workflow

## Objetivo

Normalizar la adquisicion de DEMs crudos en el SSD antes de generar derivados para AquaRisk.

La regla es:

- `raw`: DEM crudo descargado y documentado
- `processed`: recortes, mosaicos y reproyecciones
- `tiles`: productos ligeros publicados en AquaRisk

## Herramienta

Comando facil recomendado:

- [tools/dem.sh](/Users/pablo/Desktop/Claude%20Terranava/tools/dem.sh)

Motor base:

- [tools/download_dem_sources.mjs](/Users/pablo/Desktop/Claude%20Terranava/tools/download_dem_sources.mjs)

Soporta dos flujos:

1. `skadi-bbox`
- fallback publico inmediato para pilotos
- util para Bolivia, Tarija y pruebas iniciales

2. `url-manifest`
- descarga por manifiesto JSON
- pensado para fuentes oficiales o premium como Espana

## Salida

Por defecto, todo se guarda en:

- [workspace-data/raw/dem](/Users/pablo/Desktop/Claude%20Terranava/workspace-data/raw/dem)

Estructura:

- `workspace-data/raw/dem/<country>/<dataset>/<name>/source`
- `workspace-data/raw/dem/<country>/<dataset>/<name>/expanded`
- `workspace-data/raw/dem/<country>/<dataset>/<name>/acquisition.manifest.v1.json`

## Uso rapido

### Flujo facil con presets

```bash
./tools/dem.sh
```

o con doble clic en Finder:

```text
tools/terranava-dem.command
```

Comandos rapidos:

```bash
./tools/dem.sh tarija
./tools/dem.sh tarija all
./tools/dem.sh guadalquivir
./tools/dem.sh spain
```

Para Espana premium:

```bash
./tools/dem.sh spain
```

Eso te deja una plantilla editable en:

- [workspace-data/reference/dem-manifests](/Users/pablo/Desktop/Claude%20Terranava/workspace-data/reference/dem-manifests)

Despues de editarla con URLs reales:

```bash
node tools/download_dem_sources.mjs url-manifest \
  --manifest workspace-data/reference/dem-manifests/spain-premium.v1.json
```

### Tarija / Bolivia con Skadi

```bash
./tools/dem.sh tarija
```

Si quieres reutilizar ese crudo directamente en el stack de Tarija:

```bash
./tools/dem.sh tarija all
```

### Espana premium con manifiesto oficial

```bash
./tools/dem.sh spain
```

Primero edita el manifiesto copiado y reemplaza las URLs de ejemplo por enlaces reales ya verificados.

## Politica de fuente

- prioridad 1: fuentes oficiales nacionales
- prioridad 2: productos europeos de referencia
- prioridad 3: fallback abierto trazable

## Lo que no se publica

- DEM crudo
- mosaicos originales pesados
- ZIPs o tiles sin ficha de origen

## Siguiente paso despues de descargar

1. verificar el `acquisition.manifest.v1.json`
2. mover el DEM crudo a pipeline de `processed`
3. generar hillshade, pendiente, hipsometria o perfiles
4. publicar solo derivados ligeros en AquaRisk
