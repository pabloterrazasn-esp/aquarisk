# Checkpoint 2026-03-11

## Estado general

- TerraNava y AquaRisk quedaron alineados a un enfoque `hydrology-first`.
- Bolivia sigue activa como cobertura principal.
- Espana ya aparece como `hidrologia beta` con cuencas historicas precargadas, mientras el estandar premium sigue pendiente de DEM, estaciones, hidrografia e informes QA.

## Cambios principales cerrados hoy

- AquaRisk ya prioriza cuencas y subcuencas precargadas por encima de consultas puntuales en linea.
- Bolivia y Espana cargan historicos locales por unidad hidrologica.
- La interfaz ya refleja `cuenca hidrologica precargada`, `cuenca precargada` y `perfil local de referencia`.
- La home y metodologia de TerraNava ya explican que Espana opera con backbone inicial de cuencas historicas precargadas.
- Se creo una herramienta interna para DEMs:
  - `tools/download_dem_sources.mjs`
  - `tools/dem.sh`
  - `tools/terranava-dem.command`
- El flujo DEM quedo simplificado para operador:
  - `./tools/dem.sh`
  - `./tools/dem.sh tarija`
  - `./tools/dem.sh tarija all`
  - `./tools/dem.sh guadalquivir`
  - `./tools/dem.sh spain`

## Validaciones hechas

- Staging local con navegador real para AquaRisk.
- Produccion en vivo de `terranava.org`, `methodology`, `aquarisk` y `manifest/index.v1.json`.
- Validacion de Espana:
  - `Río Guadalquivir · España` carga como `Cuenca hidrologica precargada`
  - `45 años · Cuenca precargada`
- Validacion de Bolivia:
  - `Río Pilcomayo (Alto) · Tarija, Bolivia` sigue cargando con serie local y anclaje SENAMHI.
- Herramienta DEM validada con:
  - help
  - dry-run
  - descarga real minima Skadi
  - manifiesto de adquisicion generado

## Siguiente paso recomendado para manana

1. Consolidar la regla `raw offline / derived online`.
2. Definir exactamente que derivados DEM si se publican en web:
   - relieve
   - pendiente
   - perfiles
   - curvas hipsometricas
   - ficha morfometrica
3. Empezar por Espana premium:
   - inventario real de fuentes oficiales
   - manifiesto DEM premium real
   - primer pipeline de relieve para una cuenca piloto

## Nota operativa

- El acceso directo en escritorio para DEM quedo en:
  - `/Users/pablo/Desktop/TerraNava DEM.command`
- La herramienta abre menu sin argumentos.
