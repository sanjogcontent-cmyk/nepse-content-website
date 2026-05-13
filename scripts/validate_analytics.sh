#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export CONTENT_ANALYTICS_DB_PATH="${CONTENT_ANALYTICS_DB_PATH:-$(pwd)/content_analytics/test_analytics.sqlite}"
rm -f "$CONTENT_ANALYTICS_DB_PATH"
PYTHONPATH=backend python3 - <<'PY'
from app.analytics.store import insert_event, connect
from app.analytics.rollups import rebuild_daily_rollups, funnel
from app.analytics.insights import sector_interest, stock_interest, video_conversion, human_insights

events = [
    dict(event_name='daily_issue_viewed', session_id='phase8-test-1', business_date='2026-05-06', page_path='/daily/2026-05-06'),
    dict(event_name='market_summary_viewed', session_id='phase8-test-1', business_date='2026-05-06', page_path='/daily/2026-05-06'),
    dict(event_name='sector_board_viewed', session_id='phase8-test-1', business_date='2026-05-06', page_path='/daily/2026-05-06'),
    dict(event_name='sector_clicked', session_id='phase8-test-1', business_date='2026-05-06', sector_name='Investment', page_path='/daily/2026-05-06?sector=Investment'),
    dict(event_name='stock_row_clicked', session_id='phase8-test-1', business_date='2026-05-06', sector_name='Investment', symbol='HIDCLP', page_path='/daily/2026-05-06?sector=Investment&symbol=HIDCLP'),
    dict(event_name='video_block_viewed', session_id='phase8-test-1', business_date='2026-05-06', symbol='HIDCLP', page_path='/daily/2026-05-06'),
    dict(event_name='youtube_clicked', session_id='phase8-test-1', business_date='2026-05-06', symbol='HIDCLP', page_path='/daily/2026-05-06'),
]
for e in events:
    insert_event(e)
metrics = rebuild_daily_rollups('2026-05-06')
assert metrics['issue_views'] >= 1
assert funnel('2026-05-06')['steps']
assert sector_interest('2026-05-06')
assert stock_interest('2026-05-06')
assert video_conversion('2026-05-06')['youtube_clicks'] >= 1
assert human_insights('2026-05-06')
with connect() as con:
    tables = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()]
    assert 'analytics_events' in tables
print('Phase 10 analytics validation OK')
import os, sys
sys.stdout.flush(); sys.stderr.flush()
os._exit(0)
PY
