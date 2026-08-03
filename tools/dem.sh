#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PRESETS_JSON="$ROOT_DIR/tools/templates/dem-presets.v1.json"
NODE_TOOL="$ROOT_DIR/tools/download_dem_sources.mjs"
SPAIN_MANIFEST_DIR="$ROOT_DIR/workspace-data/reference/dem-manifests"

print_help() {
  cat <<EOF
Uso facil:
  ./tools/dem.sh
  ./tools/dem.sh menu
  ./tools/dem.sh tarija
  ./tools/dem.sh tarija all
  ./tools/dem.sh guadalquivir
  ./tools/dem.sh spain
  ./tools/dem.sh list
  ./tools/dem.sh info <preset>
  ./tools/dem.sh plan <preset>
  ./tools/dem.sh get <preset>
  ./tools/dem.sh build tarija
  ./tools/dem.sh init-spain-premium
  doble clic en: ./tools/terranava-dem.command

Presets disponibles:
  tarija
  bolivia-core
  spain-guadalquivir
  spain-ebro
  spain-duero
  spain-premium-template

Ejemplos:
  ./tools/dem.sh
  ./tools/dem.sh tarija
  ./tools/dem.sh tarija all
  ./tools/dem.sh guadalquivir
  ./tools/dem.sh spain
EOF
}

require_preset() {
  local preset="${1:-}"
  if [[ -z "$preset" ]]; then
    echo "Falta indicar un preset." >&2
    exit 1
  fi
}

json_query() {
  local preset="$1"
  local key="$2"
  node -e '
const fs=require("fs");
const [file,preset,key]=process.argv.slice(1);
const data=JSON.parse(fs.readFileSync(file,"utf8"));
const item=data.presets?.[preset];
if(!item){process.exit(2);}
const value=item[key];
if(value===undefined || value===null){process.exit(3);}
process.stdout.write(String(value));
' "$PRESETS_JSON" "$preset" "$key"
}

print_list() {
  node -e '
const fs=require("fs");
const file=process.argv[1];
const data=JSON.parse(fs.readFileSync(file,"utf8"));
for (const [key, item] of Object.entries(data.presets || {})) {
  console.log(`${key.padEnd(22)} ${item.label || ""} :: ${item.description || ""}`);
}
' "$PRESETS_JSON"
}

print_info() {
  local preset="$1"
  node -e '
const fs=require("fs");
const [file,preset]=process.argv.slice(1);
const data=JSON.parse(fs.readFileSync(file,"utf8"));
const item=data.presets?.[preset];
if(!item){console.error(`Preset no encontrado: ${preset}`);process.exit(2);}
console.log(JSON.stringify(item, null, 2));
' "$PRESETS_JSON" "$preset"
}

preset_exists() {
  local preset="$1"
  node -e '
const fs=require("fs");
const [file,preset]=process.argv.slice(1);
const data=JSON.parse(fs.readFileSync(file,"utf8"));
process.exit(data.presets?.[preset] ? 0 : 1);
' "$PRESETS_JSON" "$preset"
}

resolve_shortcut() {
  case "${1:-}" in
    tarija) echo "tarija" ;;
    bolivia|bolivia-core) echo "bolivia-core" ;;
    guadalquivir|spain-guadalquivir) echo "spain-guadalquivir" ;;
    ebro|spain-ebro) echo "spain-ebro" ;;
    duero|spain-duero) echo "spain-duero" ;;
    spain-premium-template) echo "spain-premium-template" ;;
    *) echo "${1:-}" ;;
  esac
}

run_plan_or_get() {
  local action="$1"
  local preset="$2"
  local kind
  kind="$(json_query "$preset" kind)"

  if [[ "$kind" == "skadi-bbox" ]]; then
    local country dataset name bbox
    country="$(json_query "$preset" country)"
    dataset="$(json_query "$preset" dataset)"
    name="$(json_query "$preset" name)"
    bbox="$(json_query "$preset" bbox)"

    if [[ "$action" == "plan" ]]; then
      node "$NODE_TOOL" skadi-bbox \
        --country "$country" \
        --dataset "$dataset" \
        --name "$name" \
        --bbox "$bbox" \
        --dry-run
      return
    fi

    node "$NODE_TOOL" skadi-bbox \
      --country "$country" \
      --dataset "$dataset" \
      --name "$name" \
      --bbox "$bbox" \
      --expand
    return
  fi

  if [[ "$kind" == "url-manifest" ]]; then
    local manifest_template
    manifest_template="$(json_query "$preset" manifest_template)"
    manifest_template="$ROOT_DIR/$manifest_template"

    if [[ "$action" == "plan" ]]; then
      node "$NODE_TOOL" url-manifest --manifest "$manifest_template" --dry-run
      return
    fi

    node "$NODE_TOOL" url-manifest --manifest "$manifest_template"
    return
  fi

  echo "Preset con tipo no soportado: $kind" >&2
  exit 1
}

init_spain_premium() {
  ensure_dir="$SPAIN_MANIFEST_DIR"
  mkdir -p "$ensure_dir"
  local target="$SPAIN_MANIFEST_DIR/spain-premium.v1.json"
  if [[ -f "$target" ]]; then
    echo "$target"
    return
  fi
  cp "$ROOT_DIR/tools/templates/spain-cnig-dem.example.json" "$target"
  echo "$target"
}

build_tarija() {
  local src_dir="$ROOT_DIR/workspace-data/raw/dem/bolivia/srtm-skadi/tarija-backbone/expanded"
  if [[ ! -d "$src_dir" ]]; then
    src_dir="$(find "$ROOT_DIR/workspace-data/raw/dem/bolivia/srtm-skadi" -maxdepth 2 -type d -name expanded | grep '/tarija' | head -n 1 || true)"
  fi
  if [[ ! -d "$src_dir" ]]; then
    echo "No existe $src_dir" >&2
    echo "Primero ejecuta: ./tools/dem.sh get tarija" >&2
    exit 1
  fi
  SRC_DIR="$src_dir" CLEANUP_SOURCE_HGT=0 bash "$ROOT_DIR/tools/build_tarija_terrain_stack.sh"
}

run_menu() {
  while true; do
    cat <<EOF

TerraNava DEM Tool
==================
1. Descargar DEM de Tarija
2. Descargar DEM de Tarija y construir capas AquaRisk
3. Ver plan de descarga de Tarija
4. Ver plan de Guadalquivir
5. Preparar plantilla España premium
6. Listar presets
7. Salir

EOF
    printf "Elige una opcion: "
    read -r choice
    case "$choice" in
      1) run_plan_or_get get tarija ;;
      2)
        run_plan_or_get get tarija
        build_tarija
        ;;
      3) run_plan_or_get plan tarija ;;
      4) run_plan_or_get plan spain-guadalquivir ;;
      5) init_spain_premium ;;
      6) print_list ;;
      7|q|Q|exit|salir) return 0 ;;
      *) echo "Opcion no valida." ;;
    esac
    echo
    printf "Pulsa Enter para volver al menu..."
    read -r _
  done
}

run_easy_mode() {
  local shortcut="$1"
  local action="${2:-get}"
  local preset
  preset="$(resolve_shortcut "$shortcut")"

  if [[ "$shortcut" == "spain" || "$shortcut" == "espana" ]]; then
    local target
    target="$(init_spain_premium)"
    echo "Plantilla creada o reutilizada:"
    echo "$target"
    echo
    echo "Edita ese JSON con URLs reales y luego ejecuta:"
    echo "node tools/download_dem_sources.mjs url-manifest --manifest workspace-data/reference/dem-manifests/spain-premium.v1.json"
    return
  fi

  if ! preset_exists "$preset"; then
    echo "Preset o alias no reconocido: $shortcut" >&2
    print_help
    exit 1
  fi

  case "$action" in
    plan)
      run_plan_or_get plan "$preset"
      ;;
    info)
      print_info "$preset"
      ;;
    get|"")
      run_plan_or_get get "$preset"
      ;;
    all)
      run_plan_or_get get "$preset"
      if [[ "$preset" == "tarija" ]]; then
        build_tarija
      else
        echo "Descarga completada. El build automatico solo esta definido para Tarija por ahora."
      fi
      ;;
    build)
      if [[ "$preset" != "tarija" ]]; then
        echo "El build rapido solo existe para Tarija por ahora." >&2
        exit 1
      fi
      build_tarija
      ;;
    *)
      echo "Accion no soportada para modo facil: $action" >&2
      exit 1
      ;;
  esac
}

cmd="${1:-menu}"

if [[ $# -eq 0 ]]; then
  run_menu
  exit 0
fi

if [[ "$cmd" != "help" && "$cmd" != "-h" && "$cmd" != "--help" && "$cmd" != "menu" ]]; then
  easy_target="$(resolve_shortcut "$cmd")"
  if [[ "$cmd" == "spain" || "$cmd" == "espana" ]] || preset_exists "$easy_target"; then
    run_easy_mode "$cmd" "${2:-get}"
    exit 0
  fi
fi

case "$cmd" in
  help|-h|--help)
    print_help
    ;;
  menu)
    run_menu
    ;;
  list)
    print_list
    ;;
  info)
    require_preset "${2:-}"
    print_info "$2"
    ;;
  plan)
    require_preset "${2:-}"
    run_plan_or_get plan "$2"
    ;;
  get)
    require_preset "${2:-}"
    run_plan_or_get get "$2"
    ;;
  build)
    require_preset "${2:-}"
    if [[ "$2" != "tarija" ]]; then
      echo "Por ahora solo existe build para el preset tarija." >&2
      exit 1
    fi
    build_tarija
    ;;
  init-spain-premium)
    init_spain_premium
    ;;
  *)
    echo "Comando no soportado: $cmd" >&2
    print_help
    exit 1
    ;;
esac
