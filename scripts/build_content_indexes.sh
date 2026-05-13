#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
cd backend
python3 -m app.content.content_indexer --content-root ../frontend/public/content
