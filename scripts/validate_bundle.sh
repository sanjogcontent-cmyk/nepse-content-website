#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/check_content_bundle.py
python3 -m compileall -q backend/app

./scripts/validate_analytics.sh
