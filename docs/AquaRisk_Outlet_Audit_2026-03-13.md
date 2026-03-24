# AquaRisk Outlet Audit · 2026-03-13

## Resumen
- Unidades auditadas: 69686
- Unidades con calibración generada: 5929
- Unidades con outlet actual fuera del río: 5213
- Unidades sin solución defendible con HydroRIVERS local: 63757

## Causas probables
- `no_hydrorivers_candidate`: 63757
- `atlas_topology_outlet_not_snapped_to_hydrorivers`: 5193
- `already_on_river`: 714
- `subbasin_inherits_parent_river_path`: 14
- `guide_river_path_misaligned_with_real_network`: 8

## Peores casos detectados
- `atlas:sa:4:6040814820` · HYBAS 6040814820 · 601.931 km · atlas_topology_outlet_not_snapped_to_hydrorivers
- `atlas:sa:4:6040709810` · HYBAS 6040709810 · 431.094 km · atlas_topology_outlet_not_snapped_to_hydrorivers
- `atlas:sa:4:6040285990` · HYBAS 6040285990 · 414.024 km · atlas_topology_outlet_not_snapped_to_hydrorivers
- `ws:bol-altiplano` · Cuenca del Altiplano · Bolivia / Perú · 357.401 km · guide_river_path_misaligned_with_real_network
- `ws:bol-pilcomayo-tarija` · Río Pilcomayo (Alto) · Tarija, Bolivia · 326.406 km · guide_river_path_misaligned_with_real_network
- `atlas:eu:4:2040416390` · HYBAS 2040416390 · 290.085 km · atlas_topology_outlet_not_snapped_to_hydrorivers
- `atlas:sa:5:6050207670` · HYBAS 6050207670 · 248.063 km · atlas_topology_outlet_not_snapped_to_hydrorivers
- `atlas:sa:5:6050237360` · HYBAS 6050237360 · 242.233 km · atlas_topology_outlet_not_snapped_to_hydrorivers
- `atlas:sa:4:6040709820` · HYBAS 6040709820 · 234.065 km · atlas_topology_outlet_not_snapped_to_hydrorivers
- `atlas:sa:5:6050728580` · HYBAS 6050728580 · 231.110 km · atlas_topology_outlet_not_snapped_to_hydrorivers
- `atlas:sa:5:6050207660` · HYBAS 6050207660 · 222.279 km · atlas_topology_outlet_not_snapped_to_hydrorivers
- `atlas:sa:5:6050877660` · HYBAS 6050877660 · 219.430 km · atlas_topology_outlet_not_snapped_to_hydrorivers
- `dataset:bol-pilcomayo__1` · Medio Pilcomayo — Gran Chaco · 217.613 km · subbasin_inherits_parent_river_path
- `atlas:eu:4:2040309560` · HYBAS 2040309560 · 217.454 km · atlas_topology_outlet_not_snapped_to_hydrorivers
- `atlas:sa:6:6060314660` · HYBAS 6060314660 · 217.060 km · atlas_topology_outlet_not_snapped_to_hydrorivers

## Unidades todavía dudosas o sin geometría suficiente
- `dataset:es-guadalquivir__0` · Alto Guadalquivir — Sierra Cazorla · no_hydrorivers_candidate
- `dataset:es-guadalquivir__1` · Cuenca del Genil · no_hydrorivers_candidate
- `dataset:es-guadalquivir__2` · Medio Guadalquivir — Córdoba · no_hydrorivers_candidate
- `dataset:es-ebro__0` · Alto Ebro — Cantabria · no_hydrorivers_candidate
- `dataset:es-ebro__1` · Cuenca del Aragón · no_hydrorivers_candidate
- `dataset:es-ebro__2` · Cuenca del Segre · no_hydrorivers_candidate
- `ws:es-jucar` · Río Júcar · España · no_hydrorivers_candidate
- `ws:es-miño` · Río Miño · España / Portugal · no_hydrorivers_candidate
- `atlas:sa:4:6040000010` · HYBAS 6040000010 · no_hydrorivers_candidate
- `atlas:sa:4:6040000750` · HYBAS 6040000750 · no_hydrorivers_candidate
- `atlas:sa:4:6040004480` · HYBAS 6040004480 · no_hydrorivers_candidate
- `atlas:sa:4:6040004880` · HYBAS 6040004880 · no_hydrorivers_candidate
- `atlas:sa:4:6040005190` · HYBAS 6040005190 · no_hydrorivers_candidate
- `atlas:sa:4:6040005500` · HYBAS 6040005500 · no_hydrorivers_candidate
- `atlas:sa:4:6040006470` · HYBAS 6040006470 · no_hydrorivers_candidate
- `atlas:sa:4:6040006480` · HYBAS 6040006480 · no_hydrorivers_candidate
- `atlas:sa:4:6040006540` · HYBAS 6040006540 · no_hydrorivers_candidate
- `atlas:sa:4:6040280410` · HYBAS 6040280410 · no_hydrorivers_candidate
- `atlas:sa:4:6040007010` · HYBAS 6040007010 · no_hydrorivers_candidate
- `atlas:sa:4:6040007960` · HYBAS 6040007960 · no_hydrorivers_candidate
- `atlas:sa:4:6040008320` · HYBAS 6040008320 · no_hydrorivers_candidate
- `atlas:sa:4:6040389870` · HYBAS 6040389870 · no_hydrorivers_candidate
- `atlas:sa:4:6040401890` · HYBAS 6040401890 · no_hydrorivers_candidate
- `atlas:sa:4:6040009770` · HYBAS 6040009770 · no_hydrorivers_candidate
- `atlas:sa:4:6040562010` · HYBAS 6040562010 · no_hydrorivers_candidate

## Artefactos generados
- `/Volumes/Crucial X10/Workspaces/Claude Terranava/aquarisk-data/hydrology/outlet-calibration.v1.json`
- `/Volumes/Crucial X10/Workspaces/Claude Terranava/aquarisk-data/hydrology/outlet-audit.v1.json`