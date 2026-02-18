from fastapi import APIRouter, HTTPException, Query
from app.schemas import CompareRunsResponse
from app.mlflow_store import mlflow_store
from typing import List

router = APIRouter()


@router.get("", response_model=CompareRunsResponse)
def compare_runs(run_ids: str = Query(..., description="Comma-separated run IDs (2-4)")):
    ids = [rid.strip() for rid in run_ids.split(",") if rid.strip()]
    if len(ids) < 2 or len(ids) > 4:
        raise HTTPException(status_code=422, detail="Provide 2-4 run IDs")

    runs = []
    for rid in ids:
        run = mlflow_store.get_run(rid)
        if not run:
            raise HTTPException(status_code=404, detail=f"Run {rid} not found")
        runs.append(run)

    return CompareRunsResponse(runs=runs)
