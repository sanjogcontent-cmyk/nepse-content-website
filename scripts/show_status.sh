#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
echo "Backend log:"
tail -n 30 logs/backend.log 2>/dev/null || true
echo ""
echo "Frontend log:"
tail -n 30 logs/frontend.log 2>/dev/null || true
echo ""
echo "Content validation:"
python3 scripts/check_content_bundle.py 2>/dev/null || true
