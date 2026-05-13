from __future__ import annotations

import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
FRONTEND_PUBLIC = PROJECT_ROOT / "frontend" / "public"
CONTENT_ROOT = FRONTEND_PUBLIC / "content"
DAILY_ROOT = CONTENT_ROOT / "daily"
CONTENT_ADMIN_ROOT = Path(os.environ.get("CONTENT_ADMIN_ROOT", PROJECT_ROOT / "frontend" / "content_admin"))
ADMIN_DAILY_ROOT = CONTENT_ADMIN_ROOT / "daily"

AN_DB_PATH = os.environ.get("AN_DB_PATH", os.environ.get("ANALYSIS_DB_PATH", ""))
COMPANY_META_DB_PATH = os.environ.get("COMPANY_META_DB_PATH", "")
INDEX_DB_PATH = os.environ.get("INDEX_DB_PATH", os.environ.get("INDEX_INTELLIGENCE_DB_PATH", ""))

INDEX_META_JSON_PATH = os.environ.get(
    "INDEX_META_JSON_PATH",
    os.environ.get(
        "NEPSE_INDEX_META_JSON_PATH",
        "/Users/sanjoggautam/Desktop/sanjog codex/daily_floorsheet_divisor/database/meta/nepal_stock_meta/nepse_index_meta.json",
    ),
)

# Keep sector -> index-code as code, not a separate data file, to avoid duplicate sector sources.
SECTOR_TO_INDEX_CODE = {
    "Commercial Banks": "BANKSUBIND",
    "Development Banks": "DEVBANKIND",
    "Finance": "FININD",
    "Hotels And Tourism": "HOTELIND",
    "Hydro Power": "HYDPOWIND",
    "Investment": "INVIDX",
    "Life Insurance": "LIFINSIND",
    "Manufacturing And Processing": "MANPROCIND",
    "Microfinance": "MICRFININD",
    "Mutual Fund": "MUTUALIND",
    "Non Life Insurance": "NONLIFIND",
    "Others": "OTHERSIND",
    "Tradings": "TRDIND",
}
