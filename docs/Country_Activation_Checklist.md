# AquaRisk Country Activation Checklist

Use this checklist before exposing a new country in AquaRisk.

## Minimum data backbone

- DEM backbone acquired and documented
- DEM derivatives generated: hillshade, slope, and at least one profile-ready product
- hydrography available and simplified for web
- subbasins available and simplified for web
- administrative boundaries loaded for contextual reporting
- traced climate base defined
- station catalog prepared with source hierarchy and status fields

## Minimum metadata

- country-level manifest completed
- coverage level declared
- service level declared by module
- source priority declared
- last verification date declared
- dataset notes and explicit limits written

## Minimum product readiness

- country appears in coverage matrix
- one point-based report works
- one basin-based report works
- at least one observed network or observation disclaimer is visible
- terrain layers render without breaking usability
- disclaimers distinguish screening from calibrated modelling

## Minimum institutional readiness

- methodology note for the country prepared
- public language reviewed for prudence
- no unsupported operational claims
- no hidden experimental layer presented as stable output

## QA

- visual QA desktop
- visual QA mobile
- console clean or only known non-critical warnings
- manifest links return 200
- report export renders correctly
- metadata visible in UI

## Activation decision

A country should be marked:

- `preparacion` when the backbone exists but public QA is incomplete
- `activo` when the checklist above is passed
- `premium` only when the country exceeds the common baseline in data quality, documentation, and report defensibility
