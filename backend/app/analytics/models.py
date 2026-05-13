from __future__ import annotations

from typing import Any
from pydantic import BaseModel, Field


class AnalyticsEventIn(BaseModel):
    event_name: str = Field(min_length=1, max_length=100)
    session_id: str = Field(min_length=6, max_length=120)
    business_date: str | None = None
    page_path: str | None = None
    referrer: str | None = None
    sector_name: str | None = None
    symbol: str | None = None
    video_id: str | None = None
    scroll_depth_pct: float | None = None
    reading_seconds: float | None = None
    payload: dict[str, Any] | None = None


class PublishAnalyticsEventIn(BaseModel):
    business_date: str
    action_name: str
    status_before: str | None = None
    status_after: str | None = None
    payload: dict[str, Any] | None = None
