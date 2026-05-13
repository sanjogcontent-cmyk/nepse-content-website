#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# Same local truth config as run_sanjog_local.sh, but exposes the frontend with a temporary Cloudflare tunnel.
# The terminal will print the trycloudflare URL and save it to logs/public_url.txt.
if command -v xattr >/dev/null 2>&1; then
  xattr -dr com.apple.quarantine . 2>/dev/null || true
fi

exec ./scripts/run_all_cloudflare.sh "$@"
