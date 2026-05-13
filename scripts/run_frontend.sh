#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../frontend"
npm install

if command -v xattr >/dev/null 2>&1 && [ -d node_modules ]; then
  xattr -dr com.apple.quarantine node_modules 2>/dev/null || true
  chmod +x node_modules/.bin/* 2>/dev/null || true
fi

export VITE_API_BASE="${VITE_API_BASE:-http://127.0.0.1:${BACKEND_PORT:-8000}}"
exec node ./node_modules/vite/bin/vite.js --host 0.0.0.0 --port "${FRONTEND_PORT:-5173}" --strictPort
