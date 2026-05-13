# Phase 14N · Cloudflare allowed-hosts fix

This patch keeps Phase 14M as the baseline and fixes Vite's dev-server host check when the site is opened through a random Cloudflare tunnel URL.

## Problem

Vite rejected the public tunnel host with:

```text
Blocked request. This host ("*.trycloudflare.com") is not allowed.
To allow this host, add it to server.allowedHosts in vite.config.js.
```

## Fix

Added `frontend/vite.config.js`:

```js
server: {
  host: '0.0.0.0',
  allowedHosts: true,
}
```

Cloudflare tunnel hostnames change every run, so a static host allowlist is not enough. This is a dev/share runner, not a production deployment, so allowing the dev server to respond to the tunnel host is the practical fix.

## Run

```bash
cd "/Users/sanjoggautam/Downloads/nepse_mta_content_phase14n_cloudflare_allowed_hosts_fix"
chmod +x scripts/*.sh run_cloudflare.sh
./scripts/run_sanjog_cloudflare.sh
```

Then open the `Public UI` link printed by the script.
