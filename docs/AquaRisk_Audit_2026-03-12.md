# Auditoría AquaRisk 2026-03-12

## Alcance

Primera auditoría técnica del flujo hidroclimático de AquaRisk con foco en:

- selección de cuenca y subcuenca Bolivia
- series locales precargadas
- construcción de temperatura, precipitación y ET0
- coherencia entre lo que AquaRisk declara como "serie histórica local calibrada" y lo que realmente almacena
- caso de control: `Río Pilcomayo (Alto) · Tarija, Bolivia`

## Hallazgos

### 1. La temperatura anual no está calibrada con estación ni con balance publicado

Severidad: alta

El builder de clima local calcula `annual.p_mm` y `annual.et0_mm` desde anuales por unidad, pero `annual.t_mean_c` sale del promedio fijo de la plantilla climática. No usa normales observadas de estación, ni series mensuales observadas, ni balances hídricos publicados.

Evidencia:

- [tools/build_local_climate_datasets.mjs](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/tools/build_local_climate_datasets.mjs#L476)
- [tools/build_local_climate_datasets.mjs](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/tools/build_local_climate_datasets.mjs#L479)
- [tools/build_local_climate_datasets.mjs](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/tools/build_local_climate_datasets.mjs#L505)

Implicación:

- Si un documento publicado reporta `22 °C` para Tarija y AquaRisk muestra `18.8 °C`, AquaRisk hoy no tiene un mecanismo riguroso para corregir eso a partir de la fuente publicada.
- El sistema actual puede acertar o desviarse, pero no puede defender ese valor como calibración observacional real.

### 2. El caso Tarija está anclado a Yesera Norte, pero su temperatura sigue siendo una plantilla genérica

Severidad: alta

El dataset activo de Tarija es `bol-pilcomayo-tarija`. Ese registro declara anclaje local a `Yesera Norte`, pero la temperatura mensual que expone es exactamente la serie fija de la plantilla `subtropical_valley`.

Evidencia del registro:

- [aquarisk-data/climate/guide-basins.v1.json](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/aquarisk-data/climate/guide-basins.v1.json)

Valores observados en el registro:

- `id`: `bol-pilcomayo-tarija`
- `station`: `Yesera Norte`
- `distance_km`: `19.9`
- `template`: `subtropical_valley`
- `annual.t_mean_c`: `18.8`

La misma serie térmica aparece también en:

- `bol-pilcomayo__0`
- `bol-pilcomayo-tarija__1`

Conclusión:

- el "anclaje SENAMHI" hoy funciona como selector de plantilla climática, no como ingestión de climatología observada por estación.
- esto queda contradicho por la fuente publicada aportada para Tarija, donde `Yesera Norte` tiene un régimen térmico claramente más frío que el que AquaRisk publica.

### 2.b El balance hídrico publicado de Tarija contradice el valor térmico y la ET0 actual de AquaRisk

Severidad: alta

La fuente publicada entregada para auditoría es:

- [Balance hidrico Tarija.pdf](/Volumes/Crucial%20X10/Documentos/Balance%20hidrico%20Tarija.pdf)

Metadatos relevantes:

- título: `BALANCE HÍDRICO INTEGRAL PARA LA CUENCA DEL RÍO GUADALQUIVIR`
- periodo climático base: `1980–2014`
- relación altitud-temperatura media: `Tmed = -0.003x + 24.78`

Hallazgos cuantitativos del PDF:

- En `Tabla 10`, `Yesera Norte` publica temperaturas medias mensuales que promedian `14.5 °C`.
- En `Tabla 10`, `Tarija Aeropuerto` publica temperaturas medias mensuales que promedian `18.0 °C`.
- AquaRisk publica para `bol-pilcomayo-tarija` una serie mensual fija que promedia `18.8 °C`.
- Por tanto, el valor actual de AquaRisk queda `+4.3 °C` por encima de `Yesera Norte`, pese a declarar esa estación como anclaje.
- Incluso frente a `Tarija Aeropuerto`, AquaRisk sigue quedando `+0.8 °C` por encima.
- En `Tabla 16`, la subcuenca `Yesera` publica `ETP anual = 876.7 mm`.
- AquaRisk publica `ET0 anual = 1150 mm` para `bol-pilcomayo-tarija`, una diferencia de `+273.3 mm` respecto de la `ETP` publicada de `Yesera`.
- En el texto asociado a la `Figura 21`, el propio estudio indica que la precipitación anual se reduce a `500–600 mm` en `Yesera` y `Uriondo`, rango en el que sí cae el `P anual = 548 mm` que hoy publica AquaRisk.

Implicación:

- el problema más serio en Tarija no parece estar en la precipitación anual, sino en la calibración térmica y en la demanda evaporativa anual.
- el dataset actual es más cálido y más evaporativo que la referencia publicada de `Yesera`.
- si AquaRisk quiere seguir declarando anclaje a `Yesera Norte`, el valor térmico actual deja de ser defendible.

### 3. "Serie histórica local" es una denominación fuerte para un histórico incompleto

Severidad: alta

El histórico local por cuenca solo guarda precipitación mensual por año. ET0 y temperatura no tienen histórico interanual; se rellenan cada año con la climatología fija mensual.

Evidencia:

- el shard histórico solo contiene la clave `p`:
  - [aquarisk-data/history/guide-basins/chunks/bolivia.v1.json](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/aquarisk-data/history/guide-basins/chunks/bolivia.v1.json)
- el runtime rellena `et` y `t` desde la climatología mensual fija:
  - [aquarisk-ong.html](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/aquarisk-ong.html#L5576)
  - [aquarisk-ong.html](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/aquarisk-ong.html#L5580)
  - [aquarisk-ong.html](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/aquarisk-ong.html#L5581)

Implicación:

- AquaRisk sí tiene un histórico sintético útil para precipitación.
- No tiene una serie histórica local equivalente para temperatura ni ET0.
- Llamarlo "serie histórica local calibrada" sin matiz puede sobredimensionar el respaldo real del dato térmico e hidrológico.

### 4. La cuenca alta de Tarija usa una sola plantilla térmica pese a su gradiente altitudinal

Severidad: media-alta

`Río Pilcomayo (Alto) · Tarija, Bolivia` se describe en la propia app como un contexto andino entre `1800–3800 m`, pero la cuenca completa usa una sola plantilla `subtropical_valley`.

Evidencia:

- descripción de la cuenca:
  - [aquarisk-ong.html](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/aquarisk-ong.html#L3507)
- asignación de plantilla:
  - [tools/build_local_climate_datasets.mjs](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/tools/build_local_climate_datasets.mjs#L40)
- subcuenca de cabeceras sí usa `andean_semiarid`:
  - [tools/build_local_climate_datasets.mjs](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/tools/build_local_climate_datasets.mjs#L55)

Implicación:

- el dataset de cuenca completa suaviza demasiado el contraste térmico interno.
- esto puede arrastrar errores de temperatura media, PET y balance hídrico anual.

### 5. La auditoría automática actual no detecta este problema

Severidad: media

La QA existente valida forma, signos, rangos amplios, coherencia de balance y clasificación. Pasa correctamente, pero no detecta que una temperatura esté heredada de plantilla en vez de una fuente observada o publicada.

Evidencia:

- [tools/qa_hydrology_datasets.mjs](/Volumes/Crucial%20X10/Workspaces/Claude%20Terranava/tools/qa_hydrology_datasets.mjs#L15)
- corrida 2026-03-12:
  - `11 datasets · 69728 registros · 0 errores · 0 advertencias`

Conclusión:

- la QA actual asegura integridad interna.
- no asegura validez externa frente a balances publicados o climatologías oficiales.

## Caso Tarija

### Estado actual en AquaRisk

Registro activo:

- `bol-pilcomayo-tarija`

Valores hoy:

- `P anual`: `548 mm`
- `ET0 anual`: `1150 mm`
- `T media anual`: `18.8 °C`
- `AI`: `0.48`
- `balance`: `-602 mm`

Fuente declarada:

- `Serie local calibrada · SENAMHI Bolivia`
- anclaje: `Yesera Norte`

### Lectura de auditoría

Este caso no puede considerarse aún "calibrado" contra un balance hídrico publicado.

Hoy está:

- calibrado de forma aproximada en precipitación anual
- anclado espacialmente a una estación SENAMHI cercana
- pero térmicamente gobernado por una plantilla
- y con una ET0 anual que no coincide con la referencia publicada disponible para `Yesera`

### Contraste con la fuente publicada

Contraste directo para `bol-pilcomayo-tarija`:

- AquaRisk declara anclaje: `Yesera Norte`
- AquaRisk publica: `T media anual 18.8 °C`
- PDF Tarija, `Tabla 10`, `Yesera Norte`: `14.5 °C`
- diferencia térmica: `+4.3 °C`

Contraste evaporativo:

- AquaRisk publica: `ET0 anual 1150 mm`
- PDF Tarija, `Tabla 16`, subcuenca `Yesera`: `ETP anual 876.7 mm`
- diferencia evaporativa: `+273.3 mm`

Lectura técnica:

- el valor térmico actual de AquaRisk se parece más a una plantilla de valle cálido que a la estación `Yesera Norte`.
- la precipitación anual sí cae dentro del rango general publicado para `Yesera`, por lo que no todos los campos están igual de desviados.
- el PDF es de la cuenca del `Guadalquivir`, no de toda la cuenca alta del `Pilcomayo`; por eso la corrección productiva no debe hacerse a ciegas sobre toda la unidad sin antes definir el alcance territorial exacto del override.

## Qué sí se puede hacer

Sí, conviene usar balances hídricos publicados y climatologías oficiales para calibrar AquaRisk.

La forma correcta no es tocar manualmente el valor en el HTML, sino introducir una capa explícita de calibración publicada por unidad.

## Recomendación de arquitectura

### Fase 1

Crear un catálogo de calibración publicada, por ejemplo:

- `aquarisk-data/climate/calibration-published.v1.json`

Por unidad debería admitir:

- `source_id`
- `source_title`
- `source_year`
- `territorial_scope`
- `period`
- `t_mean_c`
- `p_mm`
- `et0_mm` o `pet_mm`
- `water_balance_mm`
- `method`
- `confidence`
- `notes`

### Fase 2

Cambiar el builder para que:

- use climatología publicada cuando exista
- use climatología observada por estación si existe normal mensual usable
- solo use plantillas cuando no exista respaldo mejor

### Fase 3

Rebajar el lenguaje de UI:

- donde hoy dice `serie histórica local calibrada`
- separar explícitamente:
  - precipitación histórica local
  - ET0 climatológica derivada
  - temperatura climatológica derivada
  - calibración publicada disponible o no

## Próximas acciones recomendadas

1. Incorporar el documento publicado de Tarija como fuente trazable en el repo.
2. Definir si el valor publicado que se quiera usar aplica a:
   - ciudad de Tarija
   - estación específica
   - cuenca alta completa
   - periodo climatológico concreto
3. Añadir overrides publicados para Tarija antes de seguir expandiendo Bolivia.
4. Separar `scope` de calibración:
   - `Guadalquivir / Yesera / Tarija Ciudad`
   - `Pilcomayo alto completo`
5. Ampliar la QA para detectar:
   - temperatura heredada de plantilla en unidades con fuente publicada
   - desvío contra valores publicados de control
   - claims de `historical_local` cuando solo exista histórico para precipitación

## Veredicto inicial

El flujo actual de AquaRisk es consistente internamente y reproducible, pero todavía no es defendible como climatología calibrada frente a revisión técnica exigente si no se incorpora una capa explícita de calibración publicada.
