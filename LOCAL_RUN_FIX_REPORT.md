# Local Run Fix Report

Problem found from user run:

```text
sqlite3.OperationalError: no such table: meta.equity_meta
```

Cause:

`COMPANY_META_DB_PATH` was pointed to `$TRUTH_ROOT/meta/nepse_company_meta.sqlite`, but the user's actual metadata database is:

```text
/Users/sanjoggautam/Desktop/sanjog codex/daily_floorsheet_divisor/database/meta/nepse_company_meta.sqlite
```

Fixes added:

- `daily_issue_builder.py` now validates the attached metadata DB and checks for `equity_meta` and `promoter_meta`.
- `scripts/generate_daily_issue.sh` now fails early with a clear error if the metadata DB path is missing or wrong.
- `scripts/run_sanjog_local.sh` added for one-command local run using the user's actual paths.
- README updated with correct local commands.

Important rule preserved:

```text
sector = equity_meta.sectorName → promoter_meta.sectorName → Unmapped
HIDCLP → Investment through promoter fallback
```

Additional polish:

- `run_all.sh` now supports `SKIP_CONTENT_GENERATE=1` so one-command local run does not generate the same issue twice.
- `run_sanjog_local.sh` generates once, then starts backend/frontend with `SKIP_CONTENT_GENERATE=1`.
