# TerraNava Workspace Operating Model

## Objetivo

Mantener un flujo estable para TerraNava y AquaRisk donde:

- el repo guarda codigo, HTML, CSS, JS y derivados publicables
- los datos pesados viven fuera del arbol principal del repo
- el trabajo visual pasa por staging antes de produccion
- QA, releases y material fuente quedan ordenados y recuperables

## Estructura

### Repo

- `index.html`
- `aquarisk-ong.html`
- `terranava-site/`
- `aquarisk-data/`
- `tools/`
- `docs/`

### Symlinks locales dentro del repo

- `workspace-data` -> data lake principal en el SSD
- `qa` -> salidas de QA y capturas
- `releases` -> paquetes listos para despliegue
- `media-source` -> material fuente de imagen y video

### Data lake en el SSD

- `raw/`: descargas originales
- `processed/`: derivados intermedios
- `tiles/`: tiles y productos optimizados para web
- `staging/`: trabajos temporales pesados
- `reference/`: material visual fuente y referencias
- `qa/`: capturas, revisiones y salidas de pruebas
- `releases/`: ZIPs y snapshots listos para publicar

## Flujo de trabajo recomendado

1. Editar contenido y UI en el repo.
2. Levantar staging local con `tools/start_staging_preview.sh`.
3. Validar responsive, contraste, textos y consola.
4. Guardar capturas y notas de QA en `qa/`.
5. Generar bundle con `tools/build_hostinger_release.sh`.
6. Publicar solo cuando staging este aprobado.

## Comandos base

### Preparar el workspace

```bash
./tools/prepare_workspace_layout.sh
```

### Levantar staging local

```bash
./tools/start_staging_preview.sh
```

### Generar release Hostinger

```bash
./tools/build_hostinger_release.sh
```

## Criterios de orden

- no guardar datasets crudos grandes dentro del repo
- no usar `output/` como cajon de sastre
- no corregir diseño directamente en produccion si puede evitarse
- no mezclar material fuente, tiles finales y capturas de QA
- cada release debe quedar con timestamp y copia recuperable

## Convencion practica

- `raw`: lo que se descarga
- `processed`: lo que se limpia o transforma
- `tiles`: lo que sirve AquaRisk
- `qa`: lo que demuestra que algo fue revisado
- `releases`: lo que esta listo para subir

## Uso para TerraNava y AquaRisk

- TerraNava web: trabajar sobre `index.html`, `assets/` y `terranava-site/`
- AquaRisk: trabajar sobre `aquarisk-ong.html`, `aquarisk-data/`, `aquarisk-api/`
- Datos pesados: moverlos a `workspace-data`
- Material visual institucional: guardarlo en `media-source`
