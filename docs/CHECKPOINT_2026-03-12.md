# Checkpoint 2026-03-12

## Propósito

Este documento fija el estado actual de TerraNava y AquaRisk para poder retomar el trabajo desde otro chat o desde otra sesión sin depender de la conversación anterior.

## Ubicación principal de trabajo

- Workspace principal:
  - `/Volumes/Crucial X10/Workspaces/Claude Terranava`
- Ruta estable desde Escritorio:
  - `/Users/pablo/Desktop/Claude Terranava`
- Carpeta de checkpoints:
  - `/Volumes/Crucial X10/Workspaces/TerraNava-checkpoints`

## Regla de recuperación

Si en otro chat se pregunta “dónde está guardado todo”, la respuesta debe empezar buscando en el SSD externo, concretamente en:

- `/Volumes/Crucial X10/Workspaces/TerraNava-checkpoints`
- `/Volumes/Crucial X10/Workspaces/Claude Terranava/docs`

## Estado funcional resumido

### Sitio institucional

- Home institucional consolidada.
- Páginas estáticas coherentes:
  - `/`
  - `/about/`
  - `/services/`
  - `/methodology/`
  - `/contact/`
  - `/data-sources/`

### AquaRisk

- Flujo basin-first con cuencas precargadas.
- Bolivia activa.
- España en beta hidrológica con premium en preparación.
- Informes preliminares reforzados.
- Sistema de figuras de informe implementado:
  - localización
  - cuenca
  - estaciones
  - clima
  - premium
- Vista previa PDF integrada en la misma página.
- Catálogo georreferenciado oficial de estaciones hidrológicas España integrado.

### Documentación estratégica y de auditoría

- `Service_Level_Standard.md`
- `Country_Activation_Checklist.md`
- `Spain_Premium_Spec.md`
- `Spain_Premium_Source_Inventory.md`
- `Service_Portfolio_Auditable_v1.md`
- `Client_Packs_v1.md`
- `Service_to_AquaRisk_Matrix_v1.md`
- `Audit_Readiness_Roadmap_v1.md`
- `Location_Inset_System_Spec_v1.md`

## Archivos clave trabajados recientemente

- `/Users/pablo/Desktop/Claude Terranava/aquarisk-ong.html`
- `/Users/pablo/Desktop/Claude Terranava/hostinger-deploy/aquarisk/index.html`
- `/Users/pablo/Desktop/Claude Terranava/aquarisk-data/manifest/index.v1.json`
- `/Users/pablo/Desktop/Claude Terranava/terranava-site/index.html`
- `/Users/pablo/Desktop/Claude Terranava/terranava-site/methodology/index.html`
- `/Users/pablo/Desktop/Claude Terranava/terranava-site/services/index.html`
- `/Users/pablo/Desktop/Claude Terranava/terranava-site/data-sources/index.html`

## Dataset y referencias ya integradas o preparadas

### Bolivia

- Tarija como laboratorio reforzado.
- DEM y derivados web ligeros.
- estaciones Bolivia/Tarija con trazabilidad.

### España

- inventario de fuentes premium
- catálogo georreferenciado oficial de estaciones hidrológicas
- capas oficiales WMS de apoyo a figuras
- backbone DEM premium todavía pendiente de consolidación completa

## Últimos temas trabajados

1. Mejora de informes para que se parezcan más a una lámina técnica institucional.
2. Sistema de figuras cartográficas dentro del informe.
3. Figura premium con base cartográfica y capas oficiales.
4. Revisión crítica del mapa de ubicación.
5. Especificación formal del nuevo sistema de inset en:
   - `docs/Location_Inset_System_Spec_v1.md`

## Próximo bloque recomendado

### Prioridad 1

Implementar el nuevo sistema de mapa de ubicación según la especificación:

- Bolivia:
  - `Bolivia -> Tarija -> localización relativa`
- España:
  - `España -> comunidad autónoma`
  - y `España -> demarcación` cuando corresponda

### Prioridad 2

Seguir con España premium:

- backbone DEM
- relieve y derivados
- hidrografía premium
- mejora del informe premium

### Prioridad 3

Crear fichas de servicio auditables por línea:

- Cuencas y morfometría
- Riesgo hídrico territorial
- Sequía y clima

## Política de memoria práctica

No se debe confiar en “memoria del chat”.  
La continuidad debe apoyarse en:

- este checkpoint
- los documentos de `docs`
- los paquetes comprimidos del SSD
- el historial Git

## Nota de seguridad

Durante el trabajo se usó acceso directo al servidor Hostinger por `SSH/SFTP`.
La contraseña quedó expuesta en la conversación y debe considerarse comprometida hasta que se cambie.
