# Phase 14A — macOS Bash Optional Meta Fix

## Fixed

`./scripts/generate_daily_issue.sh` could fail on macOS Bash 3.2 with:

```text
COMPANY_ARG[@]: unbound variable
```

This happened when `COMPANY_META_DB_PATH` was intentionally empty, which is now the normal path because sector/index mapping should come from `nepse_index_meta.json`, not the old company meta SQLite fallback.

## Patch

The generator now temporarily disables `nounset` only around optional Bash array expansion for:

- `COMPANY_ARG`
- `META_ARG`
- `INDEX_ARG`

This keeps strict mode everywhere else while allowing a clean no-fallback metadata configuration. Paths with spaces, including `/Volumes/SANJOG DRIVE/...` and `/Users/sanjoggautam/Desktop/sanjog codex/...`, remain safely quoted.

## Truth policy preserved

- Analysis DB last POST frame remains stock price truth.
- `ltp_scaled` remains today LTP / today close.
- `close_scaled` remains previous close.
- `nepse_index_meta.json` remains the preferred sector/index membership source.
- Old `nepse_company_meta.sqlite` remains fallback only.
