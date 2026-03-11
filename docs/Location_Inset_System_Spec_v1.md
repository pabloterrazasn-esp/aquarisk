# Sistema de Mapas de Ubicación para Informes AquaRisk v1

## 1. Diagnóstico del inset actual

### Problema 1. El inset no responde a la pregunta correcta

El inset actual intenta mostrar una geometría simplificada dentro de un marco país, pero no responde con claridad a la pregunta operativa del lector:

> ¿Dónde está esta cuenca dentro de un territorio que yo reconozco?

#### Por qué ocurre

- La composición actual parte de la cuenca y no del territorio de referencia.
- El localizador se dibuja desde la lógica geométrica del polígono, no desde una lógica editorial de ubicación.
- El sistema no diferencia suficientemente entre:
  - país
  - unidad administrativa útil
  - localización relativa de la cuenca

#### Por qué afecta la comprensión

- El lector ve una marca, pero no entiende bien si está viendo:
  - un departamento
  - una comunidad autónoma
  - una región hidrográfica
  - o la propia cuenca deformada

#### Consecuencia institucional

- El inset parece accesorio o provisional.
- Debilita la percepción de disciplina cartográfica del informe.

### Problema 2. La simplificación actual destruye legibilidad

#### Por qué ocurre

- El sistema reduce demasiado la información espacial para que quepa en un recuadro pequeño.
- Al dibujar la cuenca o una caja demasiado pequeña dentro del país, la marca final queda ambigua o visualmente torpe.

#### Por qué afecta la comprensión

- La escala del inset no permite interpretar una cuenca como figura principal.
- Un polígono complejo o una caja diminuta no comunican bien ubicación territorial.

#### Consecuencia institucional

- El resultado parece un placeholder técnico, no una pieza editorial.

### Problema 3. La jerarquía visual está mal resuelta

#### Por qué ocurre

- El inset usa demasiados elementos con peso parecido:
  - marco
  - país
  - marca
  - texto
- No hay una sola idea dominante.

#### Por qué afecta la comprensión

- El ojo no sabe si mirar país, marca, texto o borde.

#### Consecuencia institucional

- La pieza se percibe como poco refinada, aunque el mapa principal esté mejor resuelto.

### Problema 4. Falta contexto administrativo relevante

#### Por qué ocurre

- El sistema actual no incorpora una lógica diferenciada por país.
- En Bolivia y España el lector necesita unidades de referencia distintas:
  - departamento
  - comunidad autónoma
  - demarcación hidrográfica en ciertos casos

#### Por qué afecta la comprensión

- El lector no consigue traducir una cuenca a un territorio administrativo reconocible.

#### Consecuencia institucional

- El informe pierde utilidad para administraciones, cooperación y lectores no expertos.

### Problema 5. El inset compite con el mapa principal en vez de complementarlo

#### Por qué ocurre

- Intenta volver a representar la cuenca.

#### Por qué afecta la comprensión

- Duplica parcialmente el mensaje del mapa principal.
- No aporta una nueva capa de información.

#### Consecuencia institucional

- Reduce eficiencia visual y hace más débil la arquitectura del informe.

## 2. Principios del nuevo mapa de ubicación

### Principio 1. El inset ubica, no explica la cuenca

El mapa principal explica la unidad hidrológica.  
El inset solo debe ubicarla dentro de un marco territorial reconocible.

### Principio 2. El marco territorial debe ser reconocible en 2 segundos

El lector debe entender inmediatamente:

- país
- unidad subnacional relevante
- posición relativa de la cuenca

### Principio 3. Debe existir una jerarquía territorial explícita

El inset debe separar visualmente:

1. contexto país
2. contexto subnacional o hidrográfico
3. localización de la cuenca

### Principio 4. No se debe repetir el polígono completo de la cuenca

En tamaños pequeños, la cuenca no funciona como marca de localización.  
La geometría exacta debe sustituirse por:

- caja de ubicación
- halo
- punto de referencia
- ventana territorial

### Principio 5. El inset debe ser administrativo-geográfico, no fotográfico

No debe usar:

- satélite
- relieve fuerte
- demasiada hidrografía

porque eso roba atención y degrada lectura.

### Principio 6. Debe funcionar bien en A4

La pieza debe mantener legibilidad en impresión PDF:

- poco texto
- líneas finas
- contraste claro
- símbolos robustos

### Principio 7. El sistema debe decidir la variante por reglas

No conviene un único inset universal.  
Hace falta un pequeño sistema de tipos cartográficos con selección automática por país y caso.

## 3. Comparación de alternativas

### Alternativa A. País + cuenca marcada directamente

#### Cuándo funciona

- casi nunca en informes pequeños
- solo si la cuenca es muy grande y muy simplificada

#### Pros

- fácil de implementar

#### Contras

- la cuenca se ve como una mancha arbitraria
- destruye comprensión territorial

#### Riesgo visual

- alto

#### Bolivia

- no recomendable

#### España

- no recomendable

### Alternativa B. País + unidad subnacional destacada

#### Cuándo funciona

- cuando la unidad administrativa por sí sola orienta bien

#### Pros

- simple
- limpia
- rápida de leer

#### Contras

- no muestra dónde cae la cuenca dentro de esa unidad

#### Riesgo visual

- bajo

#### Bolivia

- aceptable como mínimo

#### España

- aceptable cuando la comunidad autónoma basta para orientar

### Alternativa C. Doble inset jerárquico

#### Cuándo funciona

- cuando el lector necesita dos escalas:
  - país
  - unidad subnacional o demarcación

#### Pros

- mejor equilibrio entre comprensión y limpieza
- excelente para informes institucionales
- permite contextualizar sin repetir la cuenca

#### Contras

- exige más reglas y más capas
- algo más complejo de implementar

#### Riesgo visual

- medio-bajo si se hace sobrio

#### Bolivia

- mejor solución

#### España

- mejor solución en la mayoría de casos

### Alternativa D. País + demarcación hidrográfica

#### Cuándo funciona

- para cuencas grandes
- intercomunitarias
- casos donde la lógica administrativa confunde más de lo que ayuda

#### Pros

- hidrológicamente más coherente

#### Contras

- menos intuitiva para lector general
- puede exigir nomenclatura adicional

#### Riesgo visual

- medio

#### Bolivia

- rara vez necesaria como primera opción

#### España

- recomendable en casos interautonómicos o de grandes cuencas

### Alternativa E. Mapa regional ampliado

#### Cuándo funciona

- si la cuenca ocupa un espacio muy amplio
- si el territorio relevante es claramente una macroregión

#### Pros

- más expresivo que el país completo en ciertos casos

#### Contras

- menos estable como sistema general

#### Riesgo visual

- medio

#### Bolivia

- secundario

#### España

- útil en algunos casos, pero no como estándar

### Elección recomendada

- Bolivia: `Alternativa C` con doble contexto `Bolivia -> departamento`
- España: `Alternativa C` como estándar y `Alternativa D` cuando la comunidad autónoma no explique bien el caso

## 4. Reglas por país

### Bolivia

#### Regla base

Usar doble contexto:

1. Bolivia con departamento resaltado
2. departamento con localización de la cuenca

#### Cuándo usar mapa nacional

- siempre en el primer nivel

#### Cuándo destacar departamento

- siempre que la cuenca sea mayoritariamente intradepartamental

#### Cuándo usar doble inset Bolivia + departamento

- por defecto para informes premium y para cualquier caso municipal o departamental

#### Cómo ubicar la cuenca dentro de Tarija o del departamento correspondiente

- no dibujar el polígono completo
- usar:
  - caja de ubicación
  - halo suave
  - punto de referencia si ayuda

#### Qué hacer con cuencas que tocan más de un departamento

- usar Bolivia con múltiples departamentos suavemente destacados o con departamento dominante
- segundo panel con recuadro regional del ámbito de cuenca

#### Nivel administrativo mínimo

- país + departamento

### España

#### Regla base

Usar doble contexto:

1. España peninsular con comunidad autónoma o demarcación resaltada
2. comunidad autónoma o demarcación con localización de la cuenca

#### Cuándo usar España peninsular

- siempre como contexto nacional base

#### Cuándo destacar comunidad autónoma

- cuando la cuenca se entienda bien desde esa unidad
- cuando el lector probablemente reconozca mejor la comunidad que la demarcación

#### Cuándo usar demarcación hidrográfica

- cuencas grandes
- cuencas interautonómicas
- casos donde la comunidad distorsiona la lógica hidrológica

#### Cómo resolver cuencas intercomunitarias

- primer nivel: España peninsular
- segundo nivel: demarcación hidrográfica o región funcional

#### Cuándo usar doble contexto España + comunidad

- por defecto en cuencas pequeñas o medianas dentro de una sola comunidad

#### Cuándo usar doble contexto España + demarcación

- en cuencas grandes o con lectura hidrológica claramente supracomunitaria

#### Nivel administrativo mínimo

- país + comunidad autónoma o demarcación

### Futuros países

- Argentina: país + provincia
- Perú: país + región/departamento
- Ecuador: país + provincia
- Colombia: país + departamento

## 5. Tipologías de mapa de ubicación

### Tipo 1. País + unidad administrativa destacada

#### Objetivo

Mostrar país y unidad subnacional principal.

#### Cuándo usarlo

- casos simples
- informes breves

#### Qué muestra

- límite país
- unidad subnacional resaltada

#### Qué no muestra

- cuenca exacta

#### Automatización

- alta

### Tipo 2. País + unidad administrativa + caja de localización

#### Objetivo

Añadir posición relativa dentro de la unidad.

#### Cuándo usarlo

- cuando hace falta una lectura más concreta

#### Qué muestra

- país
- unidad destacada
- caja o halo de localización

#### Automatización

- alta

### Tipo 3. Doble inset jerárquico

#### Objetivo

Separar contexto nacional y contexto subnacional.

#### Cuándo usarlo

- Bolivia y España como estándar premium

#### Qué muestra

- panel superior o izquierdo: país
- panel inferior o derecho: unidad subnacional con localización

#### Automatización

- media-alta

### Tipo 4. País + demarcación o región hidrográfica

#### Objetivo

Resolver casos donde la unidad administrativa no basta.

#### Cuándo usarlo

- grandes cuencas
- casos interregionales

#### Automatización

- media

### Tipo 5. Mapa regional ampliado

#### Objetivo

Enfatizar una región concreta cuando el país completo no aporta.

#### Cuándo usarlo

- casos especiales

#### Automatización

- media-baja

## 6. Datos y capas recomendadas

### Bolivia

#### País y departamentos

- Prioridad: fuente oficial nacional o GeoBolivia si es trazable
- Fallback: `geoBoundaries`
- Formato: `TopoJSON` o `GeoJSON` simplificado
- Uso: capa estable del sistema

#### Nombres de referencia

- departamentos
- país

#### Versiones

- versión para visor
- versión simplificada para print

### España

#### País y comunidades autónomas

- Prioridad: `CNIG / IGN`
- Fallback: `geoBoundaries` o equivalente europeo solo si hace falta
- Formato: `TopoJSON` o `GeoJSON` simplificado
- Uso: capa estable del sistema

#### Demarcaciones hidrográficas

- Prioridad: `MITECO`
- Uso: casos interautonómicos o premium

#### Nombres de referencia

- España
- comunidad autónoma
- demarcación cuando aplique

### Recomendación estructural

Guardar estas capas como contexto de print en algo como:

- `/aquarisk-data/reference/location-context/bolivia/`
- `/aquarisk-data/reference/location-context/spain/`

con una versión `screen` y otra `print`.

## 7. Reglas cartográficas precisas

### Fondo

- blanco o gris muy claro

### País

- gris claro neutro

### Unidad subnacional destacada

- azul grisáceo suave o verde agua muy controlado

### Localizador

- caja azul oscura o halo fino azul
- con borde blanco interior si hace falta contraste

### Líneas

- país: fina
- unidad destacada: media
- localizador: un poco más fuerte que el resto

### Relieve

- no

### Satélite

- no

### Malla o coordenadas

- no

### Rotulación

- solo país y unidad destacada
- como máximo una línea de subtítulo corta

### Qué no debe aparecer

- cuenca completa
- red hidrográfica densa
- norte
- escala
- relieve fuerte
- demasiadas cajas
- etiquetas pequeñas e ilegibles

## 8. Integración con AquaRisk y PDF

### Arquitectura recomendada

- componente SVG específico para inset de ubicación
- independiente del render del mapa principal

### Datos de entrada

- `country_code`
- `admin1_code`
- `admin2_code` si aplica
- `hydro_demarcation_code` opcional
- `basin_bbox`
- `basin_centroid`
- `variant_type`

### Reglas

- separar:
  - geometrías del visor
  - geometrías simplificadas de print
  - reglas editoriales

### Automatizable ya

- Bolivia con departamento
- España con comunidad autónoma

### Requiere lógica adicional

- demarcaciones hidrográficas
- cuencas intercomunitarias
- selección automática entre comunidad y demarcación

## 9. Roadmap por fases

### Fase 1

#### Entregables

- Bolivia: `Bolivia -> departamento`
- España: `España -> comunidad autónoma`
- inset sin polígono de cuenca
- localizador por caja/halo

#### Riesgo

- usar límites no suficientemente buenos para print

#### Beneficio

- mejora inmediata y profesional

### Fase 2

#### Entregables

- capas oficiales simplificadas
- casos España con demarcación hidrográfica
- mejor rotulación
- doble inset jerárquico sólido

#### Riesgo

- aumento de complejidad por país

#### Beneficio

- calidad claramente institucional

### Fase 3

#### Entregables

- expansión a Argentina, Perú, Ecuador y Colombia
- sistema generalizable de variantes

#### Riesgo

- dispersión si no se fijan reglas comunes

#### Beneficio

- arquitectura internacional coherente

## 10. Recomendación final

### Mejor solución para Bolivia

`Doble inset jerárquico`:

- Bolivia con Tarija resaltado
- Tarija con caja de localización de la cuenca

No usar la geometría completa de la cuenca en el inset.

### Mejor solución para España

`Doble inset jerárquico`, con dos variantes:

- España + comunidad autónoma para cuencas claras intracomunitarias
- España + demarcación hidrográfica para cuencas grandes o intercomunitarias

### Regla general para TerraNava

El mapa de ubicación debe ser siempre un `mapa administrativo-geográfico de contexto`, no una repetición miniaturizada del mapa principal.  
La unidad hidrológica se explica en el mapa principal.  
El inset debe explicar:

1. país
2. unidad territorial relevante
3. localización relativa de la cuenca

## Alertas

- seguir usando el polígono completo de la cuenca en el inset seguirá viéndose mal
- usar satélite en el inset degradará la lectura
- meter demasiada hidrografía o relieve lo volverá confuso
- una comunidad autónoma mal elegida en España puede confundir más que ayudar
- simplificar límites administrativos al extremo también dará sensación amateur
