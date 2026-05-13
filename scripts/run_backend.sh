#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../backend"
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -U pip
python -m pip install -r requirements.txt

if command -v xattr >/dev/null 2>&1; then
  xattr -dr com.apple.quarantine .venv 2>/dev/null || true
fi

exec python -m uvicorn app.main:app --host 0.0.0.0 --port "${BACKEND_PORT:-8000}" --reload
