# AquaRisk Service Level Standard

## Purpose

This standard defines how TerraNava and AquaRisk classify outputs, modules, reports, and country deployments. The objective is to prevent ambiguous claims and to keep the public promise conservative, explicit, and defendable.

## Public product promise

AquaRisk is presented as:

- a technical platform for hydrological and territorial decision support
- an open, traceable, and replicable tool
- suitable for technical screening, preliminary formulation, briefing reports, and cooperation workflows
- not equivalent to calibrated hydrological modelling or an official warning service unless a module states that explicitly

## Service levels

### L1 Contexto cartografico

- Base layers and contextual products that help users read territory and drainage structure.
- Typical examples: DEM derivatives, hydrography, subbasins, administrative support layers.
- Not sufficient on their own for hazard statements or planning conclusions.

### L2 Diagnostico orientativo

- Derived indicators and exploratory outputs useful for first-pass screening.
- Typical examples: aridity classes, preliminary flood-risk ranking, slope screening, empirical runoff estimates.
- Useful for prioritisation and orientation, but not for regulatory validation or design.

### L3 Apoyo tecnico defendible

- Outputs that combine documented sources, reproducible rules, visible limits, and an explicit intended use.
- Typical examples: preliminary technical reports, country coverage matrices, traced station catalogs, basin profiles with explicit source hierarchy.
- Defendable for institutional dialogue and project formulation, but still below calibrated operational services.

### L4 Piloto casi operacional

- Modules or country deployments with stable data flows, verified observation support, quality controls, and repeated technical use.
- Suitable for pilot workflows with administrations or technical partners.
- Still requires explicit caveats if it is not an official service.

### L5 Servicio validado con respaldo observacional especifico

- Outputs supported by explicit observational validation, documented verification routines, and a clearly defined operational scope.
- AquaRisk should not claim this level unless the underlying evidence is visible and maintained.

## Mandatory metadata by module and layer

Every public module, layer, or report should expose:

- `service_level`
- `country`
- `coverage_level`
- `source_priority`
- `last_verified_at`
- `source_label`
- `method`
- `period`
- `resolution`
- `limits`
- `recommended_use`

## Source priority policy

TerraNava uses the following source hierarchy:

1. official source when available and traceable
2. official statistical or bulletin reference when direct geometry/series are incomplete
3. open fallback with explicit TerraNava derivation
4. exploratory derivative only when clearly labeled as such

Public shorthand:

- `oficial_primero`
- `oficial_primero_con_fallback_abierto_trazable`
- `derivado_terranava_exploratorio`

## Country activation rule

No country should be activated publicly without:

- DEM backbone and derived terrain products
- hydrography and subbasins
- traced station catalog
- base climatology
- module and country methodology note
- example report
- explicit disclaimer
- QA check completed

## Communication rule

Normative and reference frameworks may be cited, but AquaRisk should not imply formal compliance or operational equivalence without visible evidence. Preferred wording:

- `marco metodologico de referencia`
- `alineado con practicas hidrologicas reconocidas`
- `no sustituye estudios de detalle ni servicios oficiales`
