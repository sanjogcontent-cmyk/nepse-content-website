from __future__ import annotations

from fastapi import APIRouter

from .models import AnalyticsEventIn, PublishAnalyticsEventIn
from .store import insert_event, insert_admin_event, connect, ANALYTICS_DB_PATH
from .rollups import rebuild_daily_rollups, funnel
from .insights import sector_interest, stock_interest, video_conversion, search_terms, overview, content_opportunities, human_insights

router = APIRouter()


@router.get("/health")
def analytics_health():
    with connect() as con:
        tables = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").fetchall()]
    return {"ok": True, "db_path": ANALYTICS_DB_PATH, "tables": tables}


@router.post("/event")
def collect_event(event: AnalyticsEventIn):
    data = event.model_dump()
    inserted = insert_event(data)
    return {"ok": True, **inserted}


@router.post("/admin/event")
def collect_admin_event(event: PublishAnalyticsEventIn):
    inserted = insert_admin_event(event.model_dump())
    return {"ok": True, **inserted}


@router.get("/daily/{business_date}")
def daily_metrics(business_date: str):
    return rebuild_daily_rollups(business_date)


@router.get("/daily/{business_date}/funnel")
def daily_funnel(business_date: str):
    return funnel(business_date)


@router.get("/daily/{business_date}/sectors")
def daily_sectors(business_date: str):
    return {"business_date": business_date, "items": sector_interest(business_date)}


@router.get("/daily/{business_date}/stocks")
def daily_stocks(business_date: str):
    return {"business_date": business_date, "items": stock_interest(business_date)}


@router.get("/daily/{business_date}/video")
def daily_video(business_date: str):
    return video_conversion(business_date)


@router.get("/daily/{business_date}/search")
def daily_search(business_date: str):
    return {"business_date": business_date, "items": search_terms(business_date)}


@router.get("/daily/{business_date}/insights")
def daily_insights(business_date: str):
    return {"business_date": business_date, "insights": human_insights(business_date)}


@router.get("/admin/overview")
def admin_overview():
    return overview()


@router.get("/admin/content-opportunities")
def admin_content_opportunities(business_date: str | None = None):
    return {"business_date": business_date, "items": content_opportunities(business_date)}
