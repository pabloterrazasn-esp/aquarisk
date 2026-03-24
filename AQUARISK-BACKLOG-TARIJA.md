# AquaRisk Backlog Tecnico Tarija

Base de referencia metodologica:
- `/Users/pablo/Desktop/Balance hidrico Tarija.pdf`

Base de codigo actual:
- `/Users/pablo/Desktop/Claude Terranava/aquarisk-ong.html`
- `/Users/pablo/Desktop/Claude Terranava/aquarisk-data/manifest/index.v1.json`
- `/Users/pablo/Desktop/Claude Terranava/tools/prepare_hydrosheds_layers.sh`
- `/Users/pablo/Desktop/Claude Terranava/tools/build_bolivia_climate_lines.mjs`
- `/Users/pablo/Desktop/Claude Terranava/tools/build_bolivia_stations_catalog.mjs`
- `/Users/pablo/Desktop/Claude Terranava/tools/build_dem_morphometry_pilot.mjs`

## Objetivo

Traducir los componentes mas utiles del estudio de Tarija a capas y herramientas reales dentro de AquaRisk, manteniendo:
- utilidad hidrologica
- trazabilidad metodologica
- rendimiento web
- despliegue compatible con hosting simple

No se busca replicar WEAP ni vender una calibracion que AquaRisk no tiene. Se busca construir un visor hidrologico trazable con modulos tecnicos defendibles.

## Principios de implementacion

- Primero capas estructurales y trazables.
- Luego herramientas analiticas derivadas del DEM y del clima.
- El modulo Tarija avanzado debe vivir como laboratorio especifico, no como comportamiento por defecto de todo AquaRisk.
- Toda capa derivada debe declarar fuente, periodo y limites.
- Las salidas que dependan de interpolacion o inferencia deben marcarse como derivado TerraNava.

## Mapa de integracion en AquaRisk

Puntos de entrada existentes en la interfaz:
- `panel-cuencas`: atlas, mapa principal, ficha de cuenca y lectura climatica
- `map-info-panel`: ficha de punto o cuenca seleccionada
- `atlas-basin-card`: diagnostico hidrologico de la cuenca jerarquica
- `basin-stats-card`: parametros morfometricos
- `panel-metodologia`: trazabilidad y notas metodologicas

Puntos de entrada propuestos:
- `tarija context layers` dentro de `panel-cuencas`
- `tarija validation panel` dentro de `panel-metodologia`
- `tarija profile tools` dentro de `map-info-panel` y `basin-stats-card`
- `tarija stations overlay` como capa activable en el mapa principal

## Fase 1

Objetivo:
- dejar una base cartografica robusta y visible para Tarija

### T1. Capa de relieve base Tarija

Entrega:
- hillshade y hipsometria ligera para la cuenca Guadalquivir y entorno inmediato

Archivos nuevos:
- `aquarisk-data/dem/tarija/hillshade/manifest.v1.json`
- `aquarisk-data/dem/tarija/hillshade/{z}/{x}/{y}.webp`
- `aquarisk-data/dem/tarija/relief-summary.v1.json`
- `tools/build_tarija_relief_tiles.sh`

Fuente:
- Copernicus DEM GLO-30 preferente
- SRTM 30 m como fallback

Formato:
- WebP XYZ

Integracion UI:
- toggle nuevo en el mapa principal: `Relieve Tarija`

Criterios de aceptacion:
- la capa carga en Leaflet sin bloquear el mapa
- el peso inicial no degrada el primer render
- el relieve se lee claramente a escalas 8-14
- la ficha metodologica declara DEM y resolucion

### T2. Capa de pendiente Tarija

Entrega:
- raster ligero de pendiente por clases

Archivos nuevos:
- `aquarisk-data/dem/tarija/slope/manifest.v1.json`
- `aquarisk-data/dem/tarija/slope/{z}/{x}/{y}.webp`
- `tools/build_tarija_slope_tiles.sh`

Clases sugeridas:
- 0-3
- 3-12
- 12-25
- 25-50
- >50

Integracion UI:
- toggle: `Pendiente`
- leyenda visible en `map-overlay-context`

Criterios de aceptacion:
- la capa permite leer rapidamente laderas, valles y zonas de escorrentia rapida
- el color ramp no confunde con riesgo
- existe nota de uso: capa morfometrica, no mapa de amenaza

### T3. Estaciones Tarija

Entrega:
- subcatalogo Tarija para estaciones meteorologicas e hidrometricas

Archivos nuevos:
- `aquarisk-data/stations/tarija/stations.v1.geojson`
- `aquarisk-data/stations/tarija/summary.v1.json`
- `tools/build_tarija_stations_catalog.mjs`

Fuente:
- SENAMHI / catalogos publicos
- derivacion TerraNava cuando la coordenada exacta no sea oficial

Integracion UI:
- filtro regional dentro del sistema actual de estaciones
- acceso directo desde `panel-cuencas`

Criterios de aceptacion:
- cada estacion muestra tipo, estado, fuente y nivel de confianza
- se puede filtrar por hidrometrica / meteorologica
- la ficha explica si hay serie utilizable o solo referencia catalografica

### T4. Subcuencas Tarija como vista local

Entrega:
- recorte local del atlas con foco en Guadalquivir

Archivos nuevos:
- `aquarisk-data/hydrobasins/tarija/lev_local.geojson`
- `aquarisk-data/pmtiles/hydrobasins/tarija/lev_local.pmtiles`
- `tools/build_tarija_subbasins.sh`

Fuente:
- HydroBASINS + ajuste local de nombres y topologia visible

Integracion UI:
- preset de busqueda `Tarija / Guadalquivir`
- etiqueta local para que la navegacion no dependa solo del HYBAS_ID

Criterios de aceptacion:
- se puede entrar a Tarija sin depender de una busqueda textual fragil
- la capa no duplica el atlas general
- los nombres visibles son comprensibles para un usuario local

### T5. Red hidrográfica Tarija

Entrega:
- red principal y secundaria simplificada

Archivos nuevos:
- `aquarisk-data/hydrorivers/tarija/main.geojson`
- `aquarisk-data/pmtiles/hydrorivers/tarija/main.pmtiles`
- `tools/build_tarija_hydrorivers.sh`

Fuente:
- HydroRIVERS + recorte local

Integracion UI:
- toggle: `Red hidrográfica Tarija`
- comportamiento por escala

Criterios de aceptacion:
- a escala regional solo se ven ejes principales
- a escala local aparecen tramos secundarios utiles
- no se vuelve una malla ilegible

## Fase 2

Objetivo:
- sumar herramientas analiticas fuertes y legibles

### T6. Perfil topografico por cuenca

Entrega:
- herramienta que genera perfil longitudinal o simplificado de la cuenca activa

Archivos nuevos:
- `aquarisk-data/dem/tarija/profiles/index.v1.json`
- `aquarisk-data/dem/tarija/profiles/chunks/*.json`
- `tools/build_tarija_profiles.mjs`

Fuente:
- DEM + eje principal de drenaje

Integracion UI:
- boton en `basin-stats-card`: `Ver perfil topográfico`
- salida en grafico, no como capa

Criterios de aceptacion:
- al seleccionar una cuenca de Tarija se muestra un perfil utilizable
- se declara si el perfil sigue cauce principal o transecto simplificado
- la herramienta no aparece para cuencas sin geometria valida

### T7. Curva hipsometrica y relieve de cuenca

Entrega:
- grafico de distribucion altitudinal y metricas derivadas

Archivos nuevos:
- `aquarisk-data/dem/tarija/hypsometry/index.v1.json`
- `tools/build_tarija_hypsometry.mjs`

Metricas minimas:
- elevacion minima
- elevacion maxima
- relief_m
- mediana altitudinal
- curva hipsometrica normalizada

Integracion UI:
- panel secundario dentro de `basin-stats-card`

Criterios de aceptacion:
- la curva ayuda a distinguir cabeceras, cuencas encajadas y cuencas bajas
- no se presenta como indicador de amenaza por si solo

### T8. Gradiente temperatura-altura

Entrega:
- ficha analitica que traduce la idea de la Figura 15 del estudio

Archivos nuevos:
- `aquarisk-data/climate/tarija/lapse-rate.v1.json`
- `tools/build_tarija_lapse_rate.mjs`

Funcion:
- explicar la relacion entre relieve y temperatura en la cuenca o subcuenca activa

Integracion UI:
- bloque nuevo en `map-info-panel`

Criterios de aceptacion:
- se muestra gradiente usado, fuentes y advertencia
- no se vende como interpolacion observacional detallada si no lo es

### T9. Panel de validacion climatica Tarija

Entrega:
- modulo tecnico con cobertura observacional y comparacion de derivados

Archivos nuevos:
- `aquarisk-data/validation/tarija/summary.v1.json`
- `aquarisk-data/validation/tarija/double-mass.v1.json`
- `aquarisk-data/validation/tarija/reference-comparison.v1.json`
- `tools/build_tarija_validation_pack.mjs`

Contenido minimo:
- cobertura de estaciones
- metodo de interpolacion usado por TerraNava
- caveats sobre WorldClim/TRMM
- doble masa como grafico metodologico

Integracion UI:
- seccion nueva en `panel-metodologia`

Criterios de aceptacion:
- el usuario puede entender de donde sale la climatologia
- el panel deja claro que la capa es derivada y no observacion continua

### T10. Isoyetas e isotermas Tarija

Entrega:
- cartas climaticas locales separadas del piloto Bolivia

Archivos nuevos:
- `aquarisk-data/climate-lines/tarija/isoyetas-anuales.v1.geojson`
- `aquarisk-data/climate-lines/tarija/isotermas-anuales.v1.geojson`
- `aquarisk-data/climate-lines/tarija/summary.v1.json`
- `tools/build_tarija_climate_lines.mjs`

Fuente:
- estaciones + interpolacion TerraNava

Integracion UI:
- toggles locales dentro de `panel-cuencas`

Criterios de aceptacion:
- las curvas tienen metadata de periodo y metodo
- se pueden apagar por defecto
- no se confunden con capas oficiales nacionales

## Fase 3

Objetivo:
- abrir un laboratorio Tarija mas avanzado, sin contaminar el core general de AquaRisk

### T11. Geologia simplificada

Entrega:
- capa de geologia simplificada para lectura hidrogeologica basica

Archivos nuevos:
- `aquarisk-data/geology/tarija/geology-simple.v1.geojson`
- `aquarisk-data/pmtiles/geology/tarija/geology-simple.v1.pmtiles`
- `tools/build_tarija_geology.sh`

Fuente:
- SERGEOMIN 1:100.000 simplificado

Integracion UI:
- toggle avanzado, apagado por defecto

Criterios de aceptacion:
- leyenda simplificada
- no se publica un mapa geologico crudo ilegible

### T12. Módulo Tarija Lab

Entrega:
- espacio experimental para URH, nodos de demanda e infraestructura

Archivos nuevos:
- `aquarisk-data/tarija-lab/urh.v1.geojson`
- `aquarisk-data/tarija-lab/nodes.v1.geojson`
- `aquarisk-data/tarija-lab/infrastructure.v1.geojson`
- `aquarisk-data/tarija-lab/summary.v1.json`
- `tools/build_tarija_lab_layers.mjs`

Integracion UI:
- nuevo submodo o tarjeta dentro de `panel-cuencas`

Condicion:
- no activar globalmente
- debe etiquetarse como laboratorio local Tarija

Criterios de aceptacion:
- separa claramente visualizacion estructural y lectura de demanda
- no promete balance calibrado si no esta disponible

### T13. Oferta y demanda simplificada por unidad

Entrega:
- fichas por unidad con oferta relativa, demanda y tension

Archivos nuevos:
- `aquarisk-data/tarija-lab/water-balance-index.v1.json`
- `tools/build_tarija_balance_index.mjs`

Notas:
- mejor como ficha y grafico que como mapa continuo
- depende de T12

Criterios de aceptacion:
- la lectura deja claro que es indice TerraNava o balance simplificado
- no se presenta como contabilidad hidrica oficial

## Cambios de codigo necesarios

### Manifest

Actualizar:
- `/Users/pablo/Desktop/Claude Terranava/aquarisk-data/manifest/index.v1.json`

Agregar secciones nuevas:
- `dem_engine.tarija`
- `stations.tarija`
- `climate_lines.tarija`
- `validation.tarija`
- `geology.tarija`
- `tarija_lab`

### UI principal

Modificar:
- `/Users/pablo/Desktop/Claude Terranava/aquarisk-ong.html`

Bloques a tocar:
- controles del mapa en `panel-cuencas`
- `map-overlay-context`
- `map-info-panel`
- `atlas-basin-card`
- `basin-stats-card`
- `panel-metodologia`

### Empaquetado

Verificar y ampliar:
- `/Users/pablo/Desktop/Claude Terranava/tools/package_hostinger_bundle.sh`

Necesario:
- incluir carpetas nuevas de `aquarisk-data`
- comprobar que no queden fuera del zip final

## Orden exacto de ejecucion recomendado

1. T1 Relieve base Tarija
2. T2 Pendiente Tarija
3. T3 Estaciones Tarija
4. T4 Subcuencas Tarija
5. T5 Red hidrográfica Tarija
6. T9 Panel de validacion climatica
7. T6 Perfil topografico
8. T7 Curva hipsometrica
9. T8 Gradiente temperatura-altura
10. T10 Isoyetas e isotermas Tarija
11. T11 Geologia simplificada
12. T12 Tarija Lab
13. T13 Oferta y demanda simplificada

## Tickets de implementacion

### Ticket A

Titulo:
- `Tarija base terrain stack`

Incluye:
- T1
- T2
- wiring minimo en `panel-cuencas`

Definicion de hecho:
- relieve y pendiente visibles en el mapa
- sin errores de consola
- metadatos accesibles

### Ticket B

Titulo:
- `Tarija observed network`

Incluye:
- T3
- filtros y ficha de estaciones

Definicion de hecho:
- estaciones visibles
- metadata clara
- diferenciacion hidrometrica / meteorologica

### Ticket C

Titulo:
- `Tarija hydro structure`

Incluye:
- T4
- T5

Definicion de hecho:
- preset Guadalquivir
- subcuencas y red funcionando con escalado correcto

### Ticket D

Titulo:
- `Tarija DEM analytics`

Incluye:
- T6
- T7
- T8

Definicion de hecho:
- perfiles y curva hipsometrica visibles para la cuenca activa
- metricas derivadas declaradas como DEM TerraNava

### Ticket E

Titulo:
- `Tarija validation and climate overlays`

Incluye:
- T9
- T10

Definicion de hecho:
- panel de validacion visible
- isoyetas e isotermas activables
- caveats visibles

### Ticket F

Titulo:
- `Tarija advanced lab`

Incluye:
- T11
- T12
- T13

Definicion de hecho:
- laboratorio local separado del core
- oferta/demanda presentada como modulo experimental o derivado

## Riesgos que hay que vigilar

- Publicar isoyetas como si fueran cartas oficiales.
- Confundir HydroBASINS con delimitacion local precisa.
- Convertir geologia en capa decorativa sin lectura hidrogeologica util.
- Sobrecargar el mapa con demasiados toggles al mismo tiempo.
- Llevar URH y demanda a todo AquaRisk sin respaldo equivalente fuera de Tarija.
- Declarar calibracion donde solo hay screening o ajuste preliminar.

## Lo que no conviene hacer

- No replicar las capturas de ArcGIS ni los semivariogramas como capas del visor.
- No poner WorldClim o TRMM como “verdad” local si el propio estudio los cuestiona.
- No subir DEM bruto entero al frontend.
- No mezclar el modulo Tarija Lab con la experiencia por defecto del atlas general.

## Salida institucional esperada

Al cerrar Fase 2, AquaRisk deberia poder mostrar:
- una base fisica seria de la cuenca
- una red observacional visible
- una lectura morfometrica defendible
- una climatologia con caveats explicitados
- una metodologia mas creible ante socios tecnicos y financiadores

Al cerrar Fase 3, AquaRisk podria abrir una demostracion local potente de Tarija sin fingir ser un modelo integral calibrado universal.
