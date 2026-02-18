from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.services.alerts import alerts_service
from app.schemas import Alert

router = APIRouter()

@router.get("", response_model=List[Alert])
def get_alerts(
    resolved: bool = Query(False, description="Filter by resolved status"),
    limit: int = 100
):
    return alerts_service.get_alerts(limit=limit, resolved=resolved)

@router.post("/{alert_id}/resolve", response_model=bool)
def resolve_alert(alert_id: str):
    success = alerts_service.resolve_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return True
