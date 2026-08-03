# Cartera Tecnica Auditable v1

## Proposito

Este documento traduce el plan maestro de servicios a una cartera corta, repetible y defendible para TerraNava. La logica no es vender todo a la vez, sino ordenar una oferta visible que pueda pasar por revisiones tecnicas, institucionales y de auditoria sin contradicciones con AquaRisk, metodologia y fuentes.

## Regla general

- Promesa publica conservadora.
- Fuente oficial primero, fallback abierto trazable despues.
- Ninguna salida se presenta como modelacion calibrada u operativa sin evidencia visible.
- Cada linea debe poder vincularse a un nivel de servicio `L1-L5`.

## Las 5 lineas prioritarias

### 1. Cuencas y morfometria

**Objeto**
- Delimitacion de cuencas y subcuencas
- Red de drenaje
- Parametros morfometricos
- Perfiles y relieve

**Salidas tipicas**
- ficha tecnica de cuenca
- mapa de cuenca y red
- curva hipsometrica
- perfil topografico
- informe preliminar

**Nivel de servicio esperado**
- `L1-L3`

**Evidencia minima para auditoria**
- fuente DEM declarada
- fuente de hidrografia y subcuencas
- metodo de derivacion
- limite de escala
- ejemplo de informe

### 2. Hidrologia de diseno

**Objeto**
- analisis de frecuencias
- curvas IDF
- curvas de permanencia
- lluvia-escorrentia
- tendencias en series

**Salidas tipicas**
- tablas de caudales de diseno
- ecuaciones IDF
- curvas y graficos de frecuencia
- nota tecnica de metodo

**Nivel de servicio esperado**
- `L2-L3`, solo subir a `L4` con respaldo observacional y QA especifico

**Evidencia minima para auditoria**
- origen de series
- control de calidad basico
- periodo de analisis
- distribuciones ajustadas
- incertidumbre o cautela metodologica

### 3. Riesgo hidrico territorial

**Objeto**
- inundabilidad
- exposicion de activos
- diagnosticos territoriales
- analisis de afeccion a parcelas o infraestructura

**Salidas tipicas**
- mapa de afeccion
- ficha por activo o parcela
- diagnostico de exposicion
- informe de due diligence hidrica preliminar

**Nivel de servicio esperado**
- `L1-L3`

**Evidencia minima para auditoria**
- fuente oficial de inundabilidad o amenaza
- geometrias de activos o parcelas
- criterio de cruce espacial
- disclaimer de no sustitucion de estudio hidraulico de detalle

### 4. Sequia, clima y vulnerabilidad

**Objeto**
- SPI y SPEI
- tendencias
- escenarios climaticos
- vulnerabilidad hidrica
- deficit y estres hidrico

**Salidas tipicas**
- perfiles de sequia
- mapas de anomalia o tendencia
- nota de vulnerabilidad hidrica
- informe de escenario

**Nivel de servicio esperado**
- `L2-L3`

**Evidencia minima para auditoria**
- dataset y periodo declarados
- escenario o baseline explicitado
- regla de interpretacion
- limites del uso corporativo o territorial

### 5. Observacion, teledeteccion e informes trazables

**Objeto**
- catalogos de estaciones
- teledeteccion hidrologica
- mapeo de evidencia territorial
- informes con trazabilidad
- soporte a cooperacion y formulacion

**Salidas tipicas**
- inventario observacional
- mapas satelitales o derivados
- figura tecnica de informe
- nota metodologica

**Nivel de servicio esperado**
- `L1-L3`

**Evidencia minima para auditoria**
- fuente observacional o satelital
- metodo de derivacion
- fecha y version
- ficha de cobertura
- informe ejemplo

## Lo que no deberia quedar en la promesa visible

- servicio oficial de alerta
- modelacion calibrada generalizada
- cumplimiento regulatorio implicito sin soporte
- precision local no respaldada
- expansion pais por pais sin backbone minimo

## Regla de paso a publico

Una linea solo deberia intensificarse en web, propuestas o materiales comerciales cuando ya exista:

- ficha de servicio
- ejemplo de informe
- fuente principal documentada
- modulo o respaldo visible en AquaRisk cuando aplique
- disclaimer y nivel de servicio
