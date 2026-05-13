from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any

from .config import SECTOR_TO_INDEX_CODE

DEFAULT_INDEX_META_JSON = "/Users/sanjoggautam/Desktop/sanjog codex/daily_floorsheet_divisor/database/meta/nepal_stock_meta/nepse_index_meta.json"

INDEX_CODE_TO_SECTOR = {v: k for k, v in SECTOR_TO_INDEX_CODE.items()}
SECTOR_INDEX_CODES = set(INDEX_CODE_TO_SECTOR)
BROAD_INDEX_CODES = {"NEPSE", "SENSIND", "FLOATIND", "SENSFLTIND"}
IGNORED_CONTEXT_KEYS = {
    "constituents", "sectorMaster", "activeStatus", "description", "baseYearMarketCapitalization",
    "keyIndexFlag", "id", "closePrice", "lastTradedPrice", "percentageChange", "previousClose",
    "securityId", "securityName", "totalTradeQuantity", "indexId",
}

# Common spelling variations seen across NEPSE/public index metadata.
SECTOR_ALIASES = {
    "commercial bank": "Commercial Banks",
    "commercial banks": "Commercial Banks",
    "development bank": "Development Banks",
    "development banks": "Development Banks",
    "finance": "Finance",
    "finance index": "Finance",
    "hotels and tourism": "Hotels And Tourism",
    "hotel and tourism": "Hotels And Tourism",
    "hydro power": "Hydro Power",
    "hydropower": "Hydro Power",
    "hydro power index": "Hydro Power",
    "investment": "Investment",
    "life insurance": "Life Insurance",
    "manufacturing and processing": "Manufacturing And Processing",
    "manufacturing & processing": "Manufacturing And Processing",
    "microfinance": "Microfinance",
    "micro finance": "Microfinance",
    "mutual fund": "Mutual Fund",
    "mutual funds": "Mutual Fund",
    "non life insurance": "Non Life Insurance",
    "non-life insurance": "Non Life Insurance",
    "others": "Others",
    "trading": "Tradings",
    "tradings": "Tradings",
}

SYMBOL_KEYS = {
    "symbol", "stockSymbol", "stock_symbol", "securitySymbol", "security_symbol",
    "scrip", "scripSymbol", "ticker", "tickerSymbol", "companySymbol",
}
NAME_KEYS = {"companyName", "company_name", "securityName", "security_name", "name", "stockName", "stock_name"}
SECTOR_KEYS = {"sectorName", "sector_name", "sector", "indexName", "index_name", "subIndexName", "sub_index_name", "sectorDescription", "sector_description"}
INDEX_CODE_KEYS = {"indexCode", "index_code", "subIndex", "sub_index", "sectorCode", "sector_code"}


def _clean_symbol(value: Any) -> str | None:
    if value is None:
        return None
    sym = str(value).strip().upper()
    if not sym or len(sym) > 32:
        return None
    # Avoid treating index codes or long names as symbols.
    if sym in BROAD_INDEX_CODES or sym in INDEX_CODE_TO_SECTOR:
        return None
    if " " in sym:
        return None
    return sym


def _normal_key(value: Any) -> str:
    raw = str(value or "").strip().lower().replace("_", " ").replace("-", " ")
    return " ".join(raw.split())


def _canon_sector(value: Any, *, allow_unknown: bool = False) -> str | None:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    code = raw.upper()
    if code in INDEX_CODE_TO_SECTOR:
        return INDEX_CODE_TO_SECTOR[code]
    if code in BROAD_INDEX_CODES:
        return None
    key = _normal_key(raw)
    if key in SECTOR_ALIASES:
        return SECTOR_ALIASES[key]
    for sector in SECTOR_TO_INDEX_CODE:
        if sector.lower() == key:
            return sector
    return raw if allow_unknown else None


def _first_text(d: dict[str, Any], keys: set[str]) -> str | None:
    for k in keys:
        if k in d and d[k] not in (None, ""):
            return str(d[k]).strip()
    return None


def _index_object_sector(key: str | None, obj: dict[str, Any]) -> tuple[str | None, str | None]:
    """Return (sector_name, index_code) for a top-level NEPSE index-meta object.

    Important: broad indexes such as NEPSE/FLOAT/SENSITIVE contain many constituents but
    are not sector membership truth. Only sector sub-index codes should assign sectors.
    """
    code = str(obj.get("indexCode") or key or "").strip().upper() or None
    if code in BROAD_INDEX_CODES:
        return None, code
    sector = _canon_sector(code)
    if not sector:
        sm = obj.get("sectorMaster") if isinstance(obj.get("sectorMaster"), dict) else {}
        sector = _canon_sector(sm.get("sectorDescription")) or _canon_sector(obj.get("indexName"))
    if sector and code not in SECTOR_INDEX_CODES:
        code = SECTOR_TO_INDEX_CODE.get(sector, code or "")
    return sector, code


def _upsert_symbol(out: dict[str, dict[str, str]], symbol: str, sector_name: str | None, index_code: str | None, name: str | None, *, source_rank: int) -> None:
    existing = out.get(symbol)
    if existing and int(existing.get("_source_rank", 0)) > source_rank:
        return
    # Do not overwrite a real sector with a broad/unmapped/unknown entry.
    if existing and not sector_name and existing.get("sectorName") not in (None, "", "Unmapped"):
        return
    if existing and sector_name in (None, "", "Unmapped") and existing.get("sectorName") not in (None, "", "Unmapped"):
        return
    company = name or (existing or {}).get("companyName") or symbol
    out[symbol] = {
        "symbol": symbol,
        "sectorName": sector_name or (existing or {}).get("sectorName") or "Unmapped",
        "companyName": company,
        "securityName": company,
        "indexCode": index_code or (existing or {}).get("indexCode") or "",
        "_source_rank": str(source_rank),
    }


def _parse_nepse_index_meta(data: Any) -> dict[str, dict[str, str]]:
    """Parse the real NEPSE index JSON shape first.

    Expected shape in the user's file:
    {
      "HYDPOWIND": {
        "indexCode": "HYDPOWIND",
        "indexName": "HydroPower Index",
        "sectorMaster": {"sectorDescription": "Hydro Power"},
        "constituents": [{"symbol": "AHL", "securityName": "..."}, ...]
      },
      "NEPSE": {... broad market constituents ...},
      "FLOATIND": {... broad float constituents ...}
    }
    """
    out: dict[str, dict[str, str]] = {}
    if not isinstance(data, dict):
        return out
    for key, obj in data.items():
        if not isinstance(obj, dict):
            continue
        sector_name, index_code = _index_object_sector(str(key), obj)
        if not sector_name:
            # Broad indexes are useful for index points, but not for sector assignment.
            continue
        constituents = obj.get("constituents")
        if not isinstance(constituents, list):
            continue
        for item in constituents:
            if not isinstance(item, dict):
                continue
            sym = _clean_symbol(item.get("symbol"))
            if not sym:
                continue
            name = _first_text(item, NAME_KEYS) or sym
            _upsert_symbol(out, sym, sector_name, index_code, name, source_rank=100)
    return out


def _walk_index_meta(obj: Any, ctx: dict[str, Any], out: dict[str, dict[str, str]]) -> None:
    """Generic fallback parser for other metadata shapes.

    It is intentionally conservative: unknown object keys like `constituents` are not
    allowed to become sector names, and broad index contexts cannot overwrite sector
    sub-index mappings.
    """
    if isinstance(obj, list):
        for item in obj:
            _walk_index_meta(item, ctx, out)
        return
    if not isinstance(obj, dict):
        return

    next_ctx = dict(ctx)
    for k in INDEX_CODE_KEYS:
        if k in obj and obj[k] not in (None, ""):
            code = str(obj[k]).strip().upper()
            if code in BROAD_INDEX_CODES:
                next_ctx.pop("sector_name", None)
                next_ctx["index_code"] = code
            else:
                next_ctx["index_code"] = code
                sec = _canon_sector(code)
                if sec:
                    next_ctx["sector_name"] = sec
    for k in SECTOR_KEYS:
        if k in obj and obj[k] not in (None, ""):
            sec = _canon_sector(obj[k])
            if sec:
                next_ctx["sector_name"] = sec
                next_ctx["index_code"] = SECTOR_TO_INDEX_CODE.get(sec, next_ctx.get("index_code", ""))

    symbol = None
    for k in SYMBOL_KEYS:
        if k in obj:
            symbol = _clean_symbol(obj[k])
            if symbol:
                break

    if symbol:
        sector_name = next_ctx.get("sector_name") or _canon_sector(_first_text(obj, SECTOR_KEYS))
        index_code = next_ctx.get("index_code") or SECTOR_TO_INDEX_CODE.get(sector_name or "", "")
        name = _first_text(obj, NAME_KEYS) or symbol
        if sector_name:
            _upsert_symbol(out, symbol, sector_name, index_code, name, source_rank=50)

    for key, value in obj.items():
        # Do not let structural keys become sectors.
        if key in IGNORED_CONTEXT_KEYS:
            child_ctx = dict(next_ctx)
        else:
            sec_from_key = _canon_sector(key)
            child_ctx = dict(next_ctx)
            if sec_from_key:
                child_ctx["sector_name"] = sec_from_key
                child_ctx["index_code"] = SECTOR_TO_INDEX_CODE.get(sec_from_key, child_ctx.get("index_code", ""))
        if isinstance(value, list) and child_ctx.get("sector_name"):
            for item in value:
                if isinstance(item, str):
                    sym = _clean_symbol(item)
                    if sym:
                        _upsert_symbol(out, sym, child_ctx.get("sector_name"), child_ctx.get("index_code"), sym, source_rank=50)
                else:
                    _walk_index_meta(item, child_ctx, out)
        elif isinstance(value, (dict, list)):
            _walk_index_meta(value, child_ctx, out)


def load_index_meta_rows(path: str | Path | None) -> list[dict[str, str]]:
    if not path:
        return []
    p = Path(str(path)).expanduser()
    if not p.exists():
        return []
    data = json.loads(p.read_text(encoding="utf-8"))
    rows: dict[str, dict[str, str]] = _parse_nepse_index_meta(data)
    _walk_index_meta(data, {}, rows)
    cleaned = []
    for r in rows.values():
        d = {k: v for k, v in r.items() if not k.startswith("_")}
        cleaned.append(d)
    return sorted(cleaned, key=lambda r: r["symbol"])



def load_company_meta_rows(path: str | Path | None) -> list[dict[str, str]]:
    """Read the richer local company-meta SQLite as fallback/enrichment rows.

    This is not the first source for public sector boards because it can include
    stale/delisted/promoter/debenture metadata. It is valuable to fill symbols that
    are not in sector-index constituents, for example promoter variants.
    """
    if not path:
        return []
    p = Path(str(path)).expanduser()
    if not p.exists():
        return []
    rows: dict[str, dict[str, str]] = {}
    try:
        con = sqlite3.connect(str(p))
        con.row_factory = sqlite3.Row
        for table in ("equity_meta", "promoter_meta", "debenture_meta"):
            found = con.execute("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?", (table,)).fetchone()
            if not found:
                continue
            cols = {r[1] for r in con.execute(f"PRAGMA table_info({table})")}
            sector_col = "sectorName" if "sectorName" in cols else None
            company_col = "companyName" if "companyName" in cols else None
            security_col = "securityName" if "securityName" in cols else company_col
            if not sector_col:
                continue
            select_cols = ["symbol", sector_col]
            if company_col and company_col not in select_cols:
                select_cols.append(company_col)
            if security_col and security_col not in select_cols:
                select_cols.append(security_col)
            sql = f"SELECT {', '.join(select_cols)} FROM {table} WHERE symbol IS NOT NULL"
            for rr in con.execute(sql):
                d = dict(rr)
                sym = _clean_symbol(d.get("symbol"))
                sector = _canon_sector(d.get(sector_col), allow_unknown=True)
                if not sym or not sector:
                    continue
                company = d.get(company_col) if company_col else None
                security = d.get(security_col) if security_col else None
                name = str(security or company or sym).strip()
                rows.setdefault(sym, {
                    "symbol": sym,
                    "sectorName": sector,
                    "companyName": str(company or name or sym).strip(),
                    "securityName": name or sym,
                    "indexCode": SECTOR_TO_INDEX_CODE.get(sector, ""),
                })
        con.close()
    except Exception:
        return []
    return sorted(rows.values(), key=lambda r: r["symbol"])


def _merge_meta_rows(primary: list[dict[str, str]], fallback: list[dict[str, str]]) -> tuple[list[dict[str, str]], int]:
    merged = {r["symbol"]: dict(r) for r in primary if r.get("symbol")}
    filled = 0
    for r in fallback:
        sym = r.get("symbol")
        if not sym:
            continue
        current = merged.get(sym)
        if not current:
            merged[sym] = dict(r)
            filled += 1
            continue
        if current.get("sectorName") in (None, "", "Unmapped") and r.get("sectorName"):
            current.update({k: v for k, v in r.items() if v})
            filled += 1
        elif (not current.get("companyName") or current.get("companyName") == sym) and r.get("companyName"):
            # Enrich the display name only; never override JSON sector/index assignment.
            current["companyName"] = r.get("companyName") or current.get("companyName")
            current["securityName"] = r.get("securityName") or current.get("securityName")
    return sorted(merged.values(), key=lambda r: r["symbol"]), filled

def _attach_in_memory_meta(con: sqlite3.Connection, rows: list[dict[str, str]]) -> None:
    con.execute("ATTACH DATABASE ':memory:' AS meta")
    con.execute("CREATE TABLE meta.equity_meta (symbol TEXT PRIMARY KEY, sectorName TEXT, companyName TEXT, securityName TEXT, indexCode TEXT)")
    con.execute("CREATE TABLE meta.promoter_meta (symbol TEXT PRIMARY KEY, sectorName TEXT, companyName TEXT, securityName TEXT, indexCode TEXT)")
    con.executemany(
        "INSERT OR REPLACE INTO meta.equity_meta(symbol, sectorName, companyName, securityName, indexCode) VALUES(?,?,?,?,?)",
        [(r.get("symbol"), r.get("sectorName") or "Unmapped", r.get("companyName") or r.get("symbol"), r.get("securityName") or r.get("symbol"), r.get("indexCode") or "") for r in rows],
    )


def _attach_company_meta(con: sqlite3.Connection, company_meta_db: str | None) -> bool:
    if not company_meta_db:
        return False
    p = Path(company_meta_db).expanduser()
    if not p.exists():
        return False
    con.execute("ATTACH DATABASE ? AS meta", (str(p),))
    required = {"equity_meta", "promoter_meta"}
    found = {r[0] for r in con.execute("SELECT name FROM meta.sqlite_master WHERE type='table' AND name IN ('equity_meta','promoter_meta')")}
    if required - found:
        con.execute("DETACH DATABASE meta")
        return False
    return True


def prepare_metadata(con: sqlite3.Connection, company_meta_db: str | None = None, index_meta_json: str | None = None) -> dict[str, Any]:
    """Attach a `meta` database used by the existing SQL joins.

    Priority for this content website is now:
    1. nepse_index_meta.json / INDEX_META_JSON_PATH for stock -> sector/index membership.
       Only sector sub-index constituents assign sectors. Broad NEPSE/FLOAT/SENSITIVE
       constituent lists are ignored for sector mapping so they cannot overwrite a stock.
    2. Optional old nepse_company_meta.sqlite fallback only when JSON is missing/unreadable.
    3. Empty in-memory metadata, leaving symbols as Unmapped.
    """
    json_path = index_meta_json or os.environ.get("INDEX_META_JSON_PATH") or os.environ.get("NEPSE_INDEX_META_JSON_PATH") or DEFAULT_INDEX_META_JSON
    rows = load_index_meta_rows(json_path)
    company_path = company_meta_db or os.environ.get("COMPANY_META_DB_PATH")
    if rows:
        fallback_rows = load_company_meta_rows(company_path)
        merged_rows, company_fill_count = _merge_meta_rows(rows, fallback_rows)
        _attach_in_memory_meta(con, merged_rows)
        sectors = sorted({r.get("sectorName") for r in merged_rows if r.get("sectorName") and r.get("sectorName") != "Unmapped"})
        return {
            "source": "nepse_index_meta.json + company_meta fallback",
            "path": str(Path(json_path).expanduser()),
            "mapped_symbols": len(merged_rows),
            "json_symbols": len(rows),
            "company_fallback_symbols": company_fill_count,
            "company_meta_path": str(company_path or ""),
            "mapped_sectors": sectors,
            "fallback": "company_meta_for_missing_only" if company_fill_count else "none",
        }
    if _attach_company_meta(con, company_path):
        return {"source": "nepse_company_meta.sqlite fallback", "path": str(company_path), "mapped_symbols": None, "fallback": "company_meta"}
    _attach_in_memory_meta(con, [])
    return {"source": "empty metadata fallback", "path": str(Path(json_path).expanduser()), "mapped_symbols": 0, "fallback": "unmapped"}
