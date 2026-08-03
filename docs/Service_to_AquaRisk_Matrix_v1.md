# Matriz Servicio -> AquaRisk -> Evidencia v1

| Linea | Servicios del plan maestro | Respaldo actual o previsto en AquaRisk | Datos minimos | Evidencia de auditoria requerida | Madurez actual |
|---|---|---|---|---|---|
| Cuencas y morfometria | delimitacion de cuencas, morfometria, red de drenaje, tiempo de concentracion | atlas de cuencas, ficha morfometrica, relieve, pendiente, red hidrografica, figuras de informe | DEM, subcuencas, hidrografia, limites, perfiles | ficha metodologica, fuente DEM, fuente hidro, ejemplo de informe, QA de geometria | media-alta |
| Hidrologia de diseno | caudales extremos, IDF, lluvia-escorrentia, permanencia, tendencias | modulo parcial; se apoya hoy en informes y analisis externos al core del visor | estaciones, series, control de calidad, periodos, metodos estadisticos | nota de serie, test usados, incertidumbre, periodo y fuente | baja-media |
| Riesgo hidrico territorial | SNCZI, afeccion por parcela, exposicion de activos | capas de riesgo, mapas de informe, cruces espaciales, fichas de apoyo | inundabilidad oficial, activos o parcelas, cartografia administrativa | fuente oficial, criterio de cruce, limite de uso, ejemplo de informe | media |
| Sequia, clima y vulnerabilidad | SPI, SPEI, tendencias, escenarios, vulnerabilidad | historicos mensuales, balance hidrico simplificado, perfiles climaticos, figuras clima | climatologia base, series, metadatos temporales, escenario cuando aplique | periodo, baseline, metodologia, disclaimer de no equivalencia a estudio de detalle | media |
| Observacion, teledeteccion e informes trazables | estaciones, teledeteccion, inventarios, notas tecnicas | catalogos observacionales, pagina de fuentes, vista de impresion, informes PDF | catalogos de estaciones, metadata satelital, figuras reproducibles | inventario de fuentes, versionado, metadatos visibles, QA de figura e informe | media-alta |

## Lectura de la matriz

- `Madurez alta` no significa servicio operacional. Significa que la evidencia ya esta relativamente ordenada.
- `Madurez media` indica que el servicio existe, pero aun exige consolidar fuentes, ejemplo de informe o QA.
- `Madurez baja-media` indica que no deberia ser una promesa central sin antes reforzar evidencia.

## Prioridad operativa

1. Cuencas y morfometria
2. Observacion, teledeteccion e informes trazables
3. Riesgo hidrico territorial
4. Sequia, clima y vulnerabilidad
5. Hidrologia de diseno

## Regla de auditoria

Si una linea no puede enlazarse con:

- metodologia
- fuentes
- ejemplo de informe
- nivel de servicio
- limites de uso

entonces no deberia intensificarse en materiales publicos ni en propuestas como capacidad consolidada.
