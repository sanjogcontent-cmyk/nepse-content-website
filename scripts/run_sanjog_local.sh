#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Editable truth root / DB path config lives at ./truth.config.env.
source "$ROOT_DIR/scripts/load_truth_config.sh"
load_truth_config "$ROOT_DIR"

if command -v xattr >/dev/null 2>&1; then
  xattr -dr com.apple.quarantine . 2>/dev/null || true
fi

export TRUTH_ROOT="${TRUTH_ROOT:-/Volumes/SANJOG DRIVE/untitled folder/truth}"
export AN_DB_PATH="${AN_DB_PATH:-$TRUTH_ROOT/analysis/analysis_${TRUTH_YEAR:-2026}.sqlite}"
export FS_DB_PATH="${FS_DB_PATH:-$TRUTH_ROOT/floorsheet/floorsheet_${TRUTH_YEAR:-2026}.sqlite}"
export INDEX_META_JSON_PATH="${INDEX_META_JSON_PATH:-/Users/sanjoggautam/Desktop/sanjog codex/daily_floorsheet_divisor/database/meta/nepal_stock_meta/nepse_index_meta.json}"
export COMPANY_META_DB_PATH="${COMPANY_META_DB_PATH:-}"
export CONTENT_ANALYTICS_DB_PATH="${CONTENT_ANALYTICS_DB_PATH:-$TRUTH_ROOT/content_analytics/analytics.sqlite}"
export BACKEND_PORT="${BACKEND_PORT:-8000}"
export FRONTEND_PORT="${FRONTEND_PORT:-5173}"
export CORS_ALLOW_ORIGINS="${CORS_ALLOW_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173}"

if [ -z "${WS_DB_PATH:-}" ]; then
  export WS_DB_PATH="$(ls -1 "$TRUTH_ROOT"/ws/week_*.sqlite 2>/dev/null | sort | tail -n 1 || true)"
fi

if [ -z "${INDEX_DB_PATH:-}" ]; then
  if [ -f "$TRUTH_ROOT/index_analysis/index_intelligence.sqlite" ]; then
    export INDEX_DB_PATH="$TRUTH_ROOT/index_analysis/index_intelligence.sqlite"
  elif [ -f "$TRUTH_ROOT/index_analysis/index_analysis_2026.sqlite" ]; then
    export INDEX_DB_PATH="$TRUTH_ROOT/index_analysis/index_analysis_2026.sqlite"
  else
    export INDEX_DB_PATH=""
  fi
fi

if [ -z "${BUSINESS_DATE:-}" ]; then
  export BUSINESS_DATE="$(python3 - <<'PY'
import os, sqlite3
an = os.environ.get('AN_DB_PATH')
try:
    con = sqlite3.connect(an)
    d = con.execute('SELECT MAX(business_date) FROM an_buckets').fetchone()[0]
    print(d or '2026-05-06')
except Exception:
    print('2026-05-06')
PY
)"
fi

cat <<EOF
Using NEPSE MTA content app paths:
  TRUTH_ROOT=$TRUTH_ROOT
  TRUTH_CONFIG=${TRUTH_CONFIG_FILE:-$ROOT_DIR/truth.config.env}
  AN_DB_PATH=$AN_DB_PATH
  WS_DB_PATH=${WS_DB_PATH:-not used by this content app yet}
  FS_DB_PATH=$FS_DB_PATH
  INDEX_META_JSON_PATH=${INDEX_META_JSON_PATH:-none}
  COMPANY_META_DB_PATH fallback=${COMPANY_META_DB_PATH:-none}
  INDEX_DB_PATH=${INDEX_DB_PATH:-none}
  CONTENT_ANALYTICS_DB_PATH=$CONTENT_ANALYTICS_DB_PATH
  BUSINESS_DATE=$BUSINESS_DATE
EOF

./scripts/generate_daily_issue.sh "$BUSINESS_DATE"
SKIP_CONTENT_GENERATE=1 ./scripts/run_all.sh
