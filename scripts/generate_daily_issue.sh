#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

: "${AN_DB_PATH:?Set AN_DB_PATH to analysis_2026.sqlite}"
DATE="${1:-${BUSINESS_DATE:-2026-05-13}}"

if [ ! -f "$AN_DB_PATH" ]; then
  echo "ERROR: AN_DB_PATH does not exist:" >&2
  echo "  $AN_DB_PATH" >&2
  exit 1
fi

INDEX_ARG=()
if [ -n "${INDEX_DB_PATH:-}" ]; then
  if [ -f "$INDEX_DB_PATH" ]; then
    INDEX_ARG=(--index-db "$INDEX_DB_PATH")
  else
    echo "WARNING: INDEX_DB_PATH does not exist, continuing without index intelligence:" >&2
    echo "  $INDEX_DB_PATH" >&2
  fi
fi

META_ARG=()
if [ -n "${INDEX_META_JSON_PATH:-}" ] && [ -f "$INDEX_META_JSON_PATH" ]; then
  META_ARG=(--index-meta-json "$INDEX_META_JSON_PATH")
elif [ -n "${NEPSE_INDEX_META_JSON_PATH:-}" ] && [ -f "$NEPSE_INDEX_META_JSON_PATH" ]; then
  META_ARG=(--index-meta-json "$NEPSE_INDEX_META_JSON_PATH")
else
  default_meta="/Users/sanjoggautam/Desktop/sanjog codex/daily_floorsheet_divisor/database/meta/nepal_stock_meta/nepse_index_meta.json"
  if [ -f "$default_meta" ]; then
    META_ARG=(--index-meta-json "$default_meta")
  elif [ -n "${COMPANY_META_DB_PATH:-}" ] && [ -f "$COMPANY_META_DB_PATH" ]; then
    echo "WARNING: nepse_index_meta.json not found; using old company meta fallback." >&2
  else
    echo "WARNING: no sector metadata file found; generated content will mark stocks as Unmapped." >&2
  fi
fi

COMPANY_ARG=()
if [ -n "${COMPANY_META_DB_PATH:-}" ] && [ -f "$COMPANY_META_DB_PATH" ]; then
  COMPANY_ARG=(--company-meta-db "$COMPANY_META_DB_PATH")
fi

cd backend

# macOS ships Bash 3.2. With `set -u`, expanding an empty optional array like
# "${COMPANY_ARG[@]}" can raise "unbound variable" even after ARRAY=().
# Disable nounset only for this optional argument expansion so a missing company
# meta fallback is a clean, valid path while spaces in real paths are preserved.
set +u
python3 -m app.content.daily_issue_builder \
  --analysis-db "$AN_DB_PATH" \
  "${COMPANY_ARG[@]}" \
  "${META_ARG[@]}" \
  "${INDEX_ARG[@]}" \
  --date "$DATE" \
  --out-root ../frontend/public/content
set -u

cd ..
./scripts/build_content_indexes.sh
