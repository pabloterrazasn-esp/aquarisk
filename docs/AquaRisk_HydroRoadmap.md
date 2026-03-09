# AquaRisk: hoja de ruta hidrológica

## Criterio rector

AquaRisk no debe crecer como un visor con más capas por acumulación. Debe crecer como una plataforma que ayude a responder problemas centrales de la hidrología moderna:

- coexistencia de inundación y sequía en una misma cuenca
- lectura multiescala de cuencas, subcuencas y redes de drenaje
- presión antrópica y cambio de uso del suelo
- trazabilidad de la conectividad aguas arriba y aguas abajo
- interoperabilidad entre cartografía, indicadores y herramientas de decisión
- necesidad de productos ligeros, auditables y publicables en infraestructura sencilla

## Lo que AquaRisk ya resuelve

- curvas IDF
- modelo lluvia-escorrentía SCS
- balance hídrico Thornthwaite-Mather
- caudal racional y comparadores metodológicos
- delimitación puntual de cuencas usando API externa
- visualización básica de cuencas precargadas

## Lo que falta para dar un salto real

### 1. Atlas de cuencas jerárquicas

Base recomendada:

- HydroBASINS niveles 4 a 8
- HydroATLAS como fuente de atributos

Objetivo:

- navegar desde macrocuenca a subcuenca
- mostrar conectividad Pfafstetter
- dejar de depender solo del clic puntual

Valor hidrológico:

- permite análisis multiescala
- mejora lectura regional y transfronteriza
- ordena comparación de cuencas

### 2. Ficha hidrológica de cuenca

Base recomendada:

- HydroATLAS / BasinATLAS

Indicadores prioritarios:

- precipitación media
- aridez
- estacionalidad
- pendiente
- elevación media
- cobertura del suelo
- influencia antrópica

Valor hidrológico:

- conecta la geometría con el contexto hidroambiental
- permite pasar de “polígono” a “diagnóstico rápido”

### 3. Relieve y estructura del drenaje

Base recomendada:

- hillshade derivado de HydroSHEDS DEM 15s o 30s
- HydroRIVERS para red principal

Objetivo:

- mejorar la lectura visual del control topográfico
- mostrar jerarquía de drenaje y ejes principales

Valor hidrológico:

- evita que la cartografía parezca abstracta
- hace visible la lógica morfológica de la cuenca

### 4. Curva hipsométrica y perfil longitudinal

Base recomendada:

- DEM derivado y muestreo sobre la cuenca
- cauce principal desde HydroRIVERS o red propia

Objetivo:

- mostrar distribución altitudinal
- estimar madurez geomorfológica y potencial de respuesta rápida

Valor hidrológico:

- mejora lectura de pendientes, energía del relieve y tiempos de respuesta

### 5. Diagnóstico rápido de respuesta hidrológica

Entradas:

- área
- pendiente
- longitud de cauce
- curva hipsométrica
- orden de drenaje
- aridez

Salidas:

- susceptibilidad a crecidas rápidas
- sensibilidad a escasez estacional
- tipología hidrológica orientativa

Valor hidrológico:

- traduce parámetros dispersos a interpretación útil

### 6. Presión hidroambiental

Base recomendada:

- HydroATLAS
- más adelante HydroWASTE / capas propias

Indicadores deseables:

- presión agrícola
- alteración antrópica
- presión regulatoria o de infraestructura
- conflicto entre demanda y disponibilidad

Valor hidrológico:

- acerca AquaRisk a gestión moderna, no solo a geomorfología clásica

## Prioridad recomendada

### Fase 1

- Atlas de cuencas con HydroBASINS
- Red principal con HydroRIVERS
- Relieve visual ligero
- Ficha rápida de cuenca

### Fase 2

- Curva hipsométrica
- Perfil longitudinal
- Comparador de cuencas

### Fase 3

- Diagnóstico de presión hidroambiental
- Indicadores de vulnerabilidad y respuesta
- herramientas de priorización

## Qué subir a Hostinger y qué no

Sí conviene subir:

- GeoJSON derivados y simplificados por región y nivel
- JSON con atributos resumidos
- tiles ligeros de hillshade o relieve

No conviene subir:

- DEMs brutos continentales
- shapefiles completos sin simplificar
- bases globales pesadas tal como se descargan

## Estructura recomendada en el sitio

```text
/aquarisk-data/
  hydrobasins/
    eu/
      lev04.geojson
      lev05.geojson
      lev06.geojson
      lev07.geojson
    sa/
      lev04.geojson
      lev05.geojson
      lev06.geojson
      lev07.geojson
  hydrorivers/
    eu_main.geojson
    sa_main.geojson
  manifest/
    atlas.json
  relief/
    eu/
    sa/
```

## Decisión recomendada

El siguiente paso correcto para AquaRisk es construir un módulo de “Atlas de Cuencas” usando HydroBASINS + HydroRIVERS + atributos resumidos. Eso aporta más valor hidrológico e institucional que subir un DEM bruto a Hostinger.
