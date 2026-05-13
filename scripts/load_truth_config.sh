#!/usr/bin/env bash

load_truth_config() {
  local root_dir="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
  local config_file="${TRUTH_CONFIG_FILE:-$root_dir/truth.config.env}"

  if [ -f "$config_file" ]; then
    set -a
    # shellcheck disable=SC1090
    source "$config_file"
    set +a
  fi

  export TRUTH_ROOT="${TRUTH_ROOT:-/Volumes/SANJOG DRIVE/untitled folder/truth}"
  export TRUTH_YEAR="${TRUTH_YEAR:-2026}"

  if [ -z "${WS_DB_PATH:-}" ] && [ -d "$TRUTH_ROOT/ws" ]; then
    WS_DB_PATH="$(find "$TRUTH_ROOT/ws" -maxdepth 1 -type f -name 'week_*.sqlite' | sort | tail -n 1)"
    export WS_DB_PATH
  fi

  export FS_DB_PATH="${FS_DB_PATH:-$TRUTH_ROOT/floorsheet/floorsheet_${TRUTH_YEAR}.sqlite}"
  export AN_DB_PATH="${AN_DB_PATH:-$TRUTH_ROOT/analysis/analysis_${TRUTH_YEAR}.sqlite}"

  if [ -z "${INDEX_DB_PATH:-}" ]; then
    if [ -f "$TRUTH_ROOT/index_analysis/index_intelligence.sqlite" ]; then
      export INDEX_DB_PATH="$TRUTH_ROOT/index_analysis/index_intelligence.sqlite"
    else
      export INDEX_DB_PATH="$TRUTH_ROOT/index_analysis/index_analysis_${TRUTH_YEAR}.sqlite"
    fi
  fi

  if [ -z "${WS_CONT_DB_PATH:-}" ] && [ -f "$TRUTH_ROOT/ws_analysis/ws_analysis_${TRUTH_YEAR}.sqlite" ]; then
    export WS_CONT_DB_PATH="$TRUTH_ROOT/ws_analysis/ws_analysis_${TRUTH_YEAR}.sqlite"
  fi

  export INDEX_META_JSON_PATH="${INDEX_META_JSON_PATH:-/Users/sanjoggautam/Desktop/sanjog codex/daily_floorsheet_divisor/database/meta/nepal_stock_meta/nepse_index_meta.json}"
  export COMPANY_META_DB_PATH="${COMPANY_META_DB_PATH:-/Users/sanjoggautam/Desktop/sanjog codex/daily_floorsheet_divisor/database/meta/nepse_company_meta.sqlite}"
  export CONTENT_ANALYTICS_DB_PATH="${CONTENT_ANALYTICS_DB_PATH:-$TRUTH_ROOT/content_analytics/analytics.sqlite}"
  export READ_MODEL_CACHE_DB_PATH="${READ_MODEL_CACHE_DB_PATH:-$TRUTH_ROOT/cache/orderflow_read_models.sqlite}"
}
