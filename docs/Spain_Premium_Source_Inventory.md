# Spain Premium Source Inventory

Estado: `v1`  
Fecha de verificación: `2026-03-11`

## Criterio

España se prepara como caso premium de AquaRisk bajo la regla:

1. fuente oficial española o nacional
2. referencia europea
3. fallback abierto con trazabilidad TerraNava

## Fuentes prioritarias validadas

### 1. DEM backbone

- Fuente: `CNIG / IGN · Modelos Digitales de Elevaciones`
- Rol: backbone DEM nacional para relieve, pendiente, hipsometría y perfiles
- URL: `https://centrodedescargas.cnig.es/CentroDescargas/modelos-digitales-elevaciones`
- Estado: verificado `HTTP 200`

### 2. Hidrografía base

- Fuente: `CNIG / IGN · Hidrografía`
- Rol: refuerzo premium de red hidrográfica y soporte cartográfico nacional
- URL: `https://centrodedescargas.cnig.es/CentroDescargas/hidrografia`
- Estado: verificado `HTTP 200`

### 3. Estaciones meteorológicas oficiales

- Fuente: `AEMET OpenData`
- Rol: estaciones meteorológicas oficiales, climatología reutilizable y trazabilidad observacional
- URL: `https://www.aemet.es/es/datos_abiertos/AEMET_OpenData`
- Estado: verificado `HTTP 200`

### 4. Estaciones hidrológicas oficiales

- Fuente: `MITECO · Anuario de Aforos`
- Rol: inventario oficial de aforos y soporte para catálogo hidrológico premium
- URL: `https://www.miteco.gob.es/es/cartografia-y-sig/ide/descargas/agua/anuario-de-aforos.html`
- Estado: verificado `HTTP 200`

### 5. Referencia operativa hidrológica

- Fuente: `MITECO · Capas SAIH`
- Rol: referencia de estaciones, puntos de medida y soporte operativo para QA
- URL: `https://www.miteco.gob.es/en/cartografia-y-sig/ide/descargas/agua/capas-saih.html`
- Estado: verificado `HTTP 200`

## Traducción a AquaRisk

- `DEM backbone`: offline en SSD, publicación solo de derivados ligeros
- `hidrografía`: refuerzo vectorial premium por cuenca y por país
- `AEMET`: catálogo de estaciones meteorológicas con operador, estado y fecha de verificación
- `Anuario de Aforos / SAIH`: catálogo hidrológico premium y soporte para QA de informes

## Siguiente paso operativo

1. descargar DEM base y documentar resolución elegida
2. montar inventario premium de estaciones meteorológicas e hidrológicas
3. derivar `hillshade`, `slope`, `hypsometry` y `profiles`
4. activar `España premium` en AquaRisk solo cuando el checklist visible quede en `L3`
