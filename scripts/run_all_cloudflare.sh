#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

source "$ROOT_DIR/scripts/load_truth_config.sh"
load_truth_config "$ROOT_DIR"

mkdir -p logs

if command -v xattr >/dev/null 2>&1; then
  xattr -dr com.apple.quarantine . 2>/dev/null || true
fi

choose_free_port() {
  local port="$1"
  while lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
    port=$((port + 1))
  done
  printf '%s\n' "$port"
}

wait_for_http() {
  local url="$1"
  local name="$2"
  local tries="${3:-90}"
  local i
  for ((i = 1; i <= tries; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  echo "$name did not become ready at $url"
  return 1
}

cleanup() {
  local status=$?
  trap - EXIT INT TERM
  echo
  echo "Stopping NEPSE MTA content app..."
  for pid in "${BACKEND_PID:-}" "${FRONTEND_PID:-}" "${CLOUDFLARE_PID:-}"; do
    if [ -n "$pid" ] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
    fi
  done
  exit "$status"
}
trap cleanup EXIT INT TERM

BACKEND_PORT="$(choose_free_port "${BACKEND_PORT:-8000}")"
FRONTEND_PORT="$(choose_free_port "${FRONTEND_PORT:-5173}")"
export BACKEND_PORT FRONTEND_PORT
export CORS_ALLOW_ORIGINS="${CORS_ALLOW_ORIGINS:-http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}}"
export INDEX_META_JSON_PATH="${INDEX_META_JSON_PATH:-/Users/sanjoggautam/Desktop/sanjog codex/daily_floorsheet_divisor/database/meta/nepal_stock_meta/nepse_index_meta.json}"
export COMPANY_META_DB_PATH="${COMPANY_META_DB_PATH:-}"

if [ -z "${BUSINESS_DATE:-}" ]; then
  BUSINESS_DATE="$(python3 - <<'PY' 2>/dev/null || true
import os
import sqlite3

path = os.environ.get("AN_DB_PATH", "")
try:
    with sqlite3.connect(path) as con:
        print(con.execute("SELECT MAX(business_date) FROM an_buckets").fetchone()[0] or "")
except Exception:
    print("")
PY
)"
  export BUSINESS_DATE="${BUSINESS_DATE:-2026-05-06}"
fi

echo "Project: $ROOT_DIR"
echo "Backend port:  $BACKEND_PORT"
echo "Frontend port: $FRONTEND_PORT"
echo "TRUTH_CONFIG: ${TRUTH_CONFIG_FILE:-$ROOT_DIR/truth.config.env}"
echo "TRUTH_ROOT: $TRUTH_ROOT"
echo "WS_DB_PATH: ${WS_DB_PATH:-}"
echo "FS_DB_PATH: $FS_DB_PATH"
echo "AN_DB_PATH: $AN_DB_PATH"
echo "INDEX_DB_PATH: ${INDEX_DB_PATH:-}"
echo "CONTENT_ANALYTICS_DB_PATH: $CONTENT_ANALYTICS_DB_PATH"
echo "INDEX_META_JSON_PATH: ${INDEX_META_JSON_PATH:-}"
echo "COMPANY_META_DB_PATH fallback: ${COMPANY_META_DB_PATH:-}"
echo "BUSINESS_DATE: $BUSINESS_DATE"
echo

if [ "${SKIP_CONTENT_GENERATE:-0}" != "1" ]; then
  ./scripts/generate_daily_issue.sh "$BUSINESS_DATE"
else
  echo "SKIP_CONTENT_GENERATE=1; using existing generated content."
fi

echo "Starting backend..."
nohup ./scripts/run_backend.sh </dev/null > logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" > logs/backend.pid

wait_for_http "http://127.0.0.1:${BACKEND_PORT}/api/health" "Backend" 90 || {
  tail -n 100 logs/backend.log || true
  exit 1
}

echo "Starting frontend..."
nohup ./scripts/run_frontend.sh </dev/null > logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" > logs/frontend.pid

wait_for_http "http://127.0.0.1:${FRONTEND_PORT}/daily/${BUSINESS_DATE}" "Frontend" 90 || {
  tail -n 100 logs/frontend.log || true
  exit 1
}

if [ -n "${CLOUDFLARED:-}" ]; then
  :
elif command -v cloudflared >/dev/null 2>&1; then
  CLOUDFLARED="$(command -v cloudflared)"
else
  CLOUDFLARED="$HOME/bin/cloudflared"
fi

if [ ! -x "$CLOUDFLARED" ]; then
  echo "Installing cloudflared to $HOME/bin/cloudflared..."
  mkdir -p "$HOME/bin"
  curl -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz" -o /tmp/cloudflared.tgz
  tar -xzf /tmp/cloudflared.tgz -C "$HOME/bin"
  chmod +x "$HOME/bin/cloudflared"
  CLOUDFLARED="$HOME/bin/cloudflared"
fi

echo "Starting Cloudflare tunnel..."
: > logs/cloudflared.log
"$CLOUDFLARED" tunnel --url "http://127.0.0.1:${FRONTEND_PORT}" --loglevel info --metrics "127.0.0.1:0" > logs/cloudflared.log 2>&1 &
CLOUDFLARE_PID=$!

PUBLIC_URL=""
for _ in $(seq 1 90); do
  PUBLIC_URL="$(grep -Eo 'https://[-a-zA-Z0-9.]+\.trycloudflare\.com' logs/cloudflared.log | tail -n 1 || true)"
  if [ -n "$PUBLIC_URL" ]; then
    break
  fi
  sleep 1
done

echo
echo "Local UI:  http://127.0.0.1:${FRONTEND_PORT}"
if [ -n "$PUBLIC_URL" ]; then
  echo "$PUBLIC_URL" > logs/public_url.txt
  echo "Public UI: $PUBLIC_URL"
  echo "Public daily issue: $PUBLIC_URL/daily/${BUSINESS_DATE}"
  echo "Public sectors:     $PUBLIC_URL/sectors"
  echo "Public SYPNL stock: $PUBLIC_URL/stocks/SYPNL?date=${BUSINESS_DATE}"
  echo "Saved public URL to logs/public_url.txt"
else
  echo "Cloudflare link was not found yet. Check logs/cloudflared.log"
fi
echo
echo "Keep this terminal open. Press Ctrl+C to stop backend, frontend, and Cloudflare."

while true; do
  for pid in "$BACKEND_PID" "$FRONTEND_PID" "$CLOUDFLARE_PID"; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      echo "One process stopped. Recent logs:"
      tail -n 40 logs/backend.log || true
      tail -n 40 logs/frontend.log || true
      tail -n 40 logs/cloudflared.log || true
      exit 1
    fi
  done
  sleep 3
done
