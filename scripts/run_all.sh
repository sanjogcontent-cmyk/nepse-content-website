#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [ -f "$ROOT_DIR/scripts/load_truth_config.sh" ]; then
  source "$ROOT_DIR/scripts/load_truth_config.sh"
  load_truth_config "$ROOT_DIR"
fi

if command -v xattr >/dev/null 2>&1; then
  xattr -dr com.apple.quarantine . 2>/dev/null || true
fi

export BACKEND_PORT="${BACKEND_PORT:-8000}"
export FRONTEND_PORT="${FRONTEND_PORT:-5173}"

mkdir -p logs

pid_cwd_contains_content_app() {
  local pid="$1"
  local cwd
  cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1 || true)"
  case "$cwd" in
    *nepse_mta_content*) return 0 ;;
    *) return 1 ;;
  esac
}

add_unique_pid() {
  local pid="$1"
  case "$pid" in
    ''|*[!0-9]*) return 0 ;;
  esac
  [ "$pid" = "$$" ] && return 0
  case " ${PIDS_TO_STOP:-} " in
    *" $pid "*) ;;
    *) PIDS_TO_STOP="${PIDS_TO_STOP:-} $pid" ;;
  esac
}

stop_pid_tree() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null || return 0
  pkill -TERM -P "$pid" 2>/dev/null || true
  kill -TERM "$pid" 2>/dev/null || true
}

force_stop_pid_tree() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null || return 0
  pkill -KILL -P "$pid" 2>/dev/null || true
  kill -KILL "$pid" 2>/dev/null || true
}

stop_old_content_servers() {
  PIDS_TO_STOP=""

  for pid_file in "$PWD"/logs/*.pid "$HOME"/Downloads/nepse_mta_content*/logs/*.pid "/Users/sanjoggautam/Desktop/sanjog codex"/nepse_mta_content*/logs/*.pid; do
    [ -f "$pid_file" ] || continue
    pid="$(tr -cd '0-9' < "$pid_file" | head -c 16)"
    if pid_cwd_contains_content_app "$pid"; then
      add_unique_pid "$pid"
    fi
  done

  for port in $(seq 8000 8020) $(seq 5173 5199); do
    for pid in $(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true); do
      if pid_cwd_contains_content_app "$pid"; then
        add_unique_pid "$pid"
      fi
    done
  done

  if [ -n "${PIDS_TO_STOP// }" ]; then
    echo "Stopping old NEPSE MTA content servers:${PIDS_TO_STOP}"
    for pid in $PIDS_TO_STOP; do
      stop_pid_tree "$pid"
    done
    sleep 1
    for pid in $PIDS_TO_STOP; do
      force_stop_pid_tree "$pid"
    done
  fi
}

wait_for_http() {
  local label="$1"
  local url="$2"
  local log_file="$3"
  local i

  for i in $(seq 1 60); do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then
      echo "$label ready: $url"
      return 0
    fi

    if [ -f "$log_file" ] && grep -qE 'ERR_MODULE_NOT_FOUND|ERR_DLOPEN_FAILED|Cannot find module @rollup|library load disallowed|bad interpreter|EADDRINUSE|error when starting dev server|Traceback' "$log_file"; then
      break
    fi

    sleep 0.5
  done

  echo "$label did not become ready: $url" >&2
  echo "--- $log_file (tail) ---" >&2
  tail -80 "$log_file" >&2 || true
  return 1
}

if [ "${STOP_OLD_CONTENT_SERVERS:-1}" = "1" ]; then
  stop_old_content_servers
fi

port_owner() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $2, $1; exit}'
}

find_free_port() {
  local port="$1"
  local label="$2"
  local owner pid cmd
  while true; do
    owner="$(port_owner "$port" || true)"
    if [ -z "$owner" ]; then
      printf '%s' "$port"
      return 0
    fi
    pid="${owner%% *}"
    cmd="${owner#* }"
    echo "$label port $port is already in use by PID $pid ($cmd); trying $((port + 1))." >&2
    port=$((port + 1))
  done
}

export BACKEND_PORT="$(find_free_port "$BACKEND_PORT" "Backend")"
export FRONTEND_PORT="$(find_free_port "$FRONTEND_PORT" "Frontend")"

if [ -z "${CORS_ALLOW_ORIGINS:-}" ] || [[ "$CORS_ALLOW_ORIGINS" =~ ^http://localhost:[0-9]+,http://127\.0\.0\.1:[0-9]+$ ]]; then
  export CORS_ALLOW_ORIGINS="http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT}"
fi

if [ "${SKIP_CONTENT_GENERATE:-0}" != "1" ]; then
  if [ -n "${AN_DB_PATH:-}" ]; then
    ./scripts/generate_daily_issue.sh "${BUSINESS_DATE:-2026-05-06}"
  else
    echo "AN_DB_PATH not set; using included sample JSON if available."
  fi
else
  echo "SKIP_CONTENT_GENERATE=1; using already generated daily JSON."
fi

ISSUE_DATE="${BUSINESS_DATE:-2026-05-06}"

nohup ./scripts/run_backend.sh </dev/null > logs/backend.log 2>&1 &
echo $! > logs/backend.pid
BACKEND_PID="$!"
nohup ./scripts/run_frontend.sh </dev/null > logs/frontend.log 2>&1 &
echo $! > logs/frontend.pid
FRONTEND_PID="$!"

cleanup_current_servers() {
  stop_pid_tree "$BACKEND_PID"
  stop_pid_tree "$FRONTEND_PID"
  sleep 0.5
  force_stop_pid_tree "$BACKEND_PID"
  force_stop_pid_tree "$FRONTEND_PID"
}

trap cleanup_current_servers INT TERM EXIT

echo "Backend starting:  http://127.0.0.1:${BACKEND_PORT}"
echo "Frontend starting: http://127.0.0.1:${FRONTEND_PORT}"
wait_for_http "Backend" "http://127.0.0.1:${BACKEND_PORT}/api/health" "logs/backend.log"
wait_for_http "Frontend" "http://127.0.0.1:${FRONTEND_PORT}/daily/${ISSUE_DATE}" "logs/frontend.log"
echo "Daily issue:        http://127.0.0.1:${FRONTEND_PORT}/daily/${ISSUE_DATE}"
echo "Admin editor:       http://127.0.0.1:${FRONTEND_PORT}/admin/daily/${ISSUE_DATE}"
echo "Analytics:          http://127.0.0.1:${FRONTEND_PORT}/admin/analytics"
echo "Logs: logs/backend.log and logs/frontend.log"
echo "Keep this terminal open. Press Ctrl+C to stop backend and frontend."

while true; do
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "Backend stopped unexpectedly. Tail of logs/backend.log:" >&2
    tail -80 logs/backend.log >&2 || true
    exit 1
  fi
  if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
    echo "Frontend stopped unexpectedly. Tail of logs/frontend.log:" >&2
    tail -80 logs/frontend.log >&2 || true
    exit 1
  fi
  sleep 2
done
