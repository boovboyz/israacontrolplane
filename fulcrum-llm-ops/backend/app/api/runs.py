from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import PlainTextResponse
from app.mlflow_store import mlflow_store
from app.schemas import RunsResponse, RunDetail, CreateRunRequest, UpdateRunRequest, LogArtifactRequest
from app.api.deps import verify_api_key

router = APIRouter()


@router.get("", response_model=RunsResponse)
def get_runs(
    q: str = None,
    model: str = None,
    status: str = Query(None, description="Run status filter (success|failed|running|pending)"),
    min_confidence: float = Query(None, ge=0, le=1),
):
    # Fetch all runs first (unfiltered by status from MLflow) so we can
    # build full model/status lists, then apply the status filter.
    all_runs = mlflow_store.list_runs(query=q, model=model, min_confidence=min_confidence)

    # Unique models and statuses from the full set
    unique_models = sorted(set(r.model for r in all_runs if r.model))
    unique_statuses = sorted(set(r.status for r in all_runs))

    # Apply status filter client-side so the dropdown always has all options
    if status:
        filtered = [r for r in all_runs if r.status == status]
    else:
        filtered = all_runs

    return RunsResponse(
        runs=filtered,
        models=unique_models,
        statuses=unique_statuses,
    )


@router.get("/{run_id}", response_model=RunDetail)
def get_run_details(run_id: str):
    run = mlflow_store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    return run


@router.get("/{run_id}/artifact")
def get_artifact(run_id: str, path: str):
    """Return artifact content as plain text (not JSON-wrapped)."""
    try:
        content = mlflow_store.get_artifact_content(run_id, path)
        media = "application/json" if path.lower().endswith(".json") else "text/plain"
        return PlainTextResponse(content=content, media_type=media)
    except ValueError as e:
        raise HTTPException(status_code=415, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Artifact not found: {str(e)}")


# ----------------- WRITE ENDPOINTS -----------------

@router.post("", response_model=str, dependencies=[Depends(verify_api_key)])
def create_run(request: CreateRunRequest):
    try:
        run_id = mlflow_store.start_run(
            user_id=request.user_id,
            session_id=request.session_id,
            model=request.model,
            params=request.params,
            tags=request.tags
        )
        return run_id
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{run_id}", dependencies=[Depends(verify_api_key)])
def update_run(run_id: str, request: UpdateRunRequest):
    try:
        mlflow_store.update_run(
            run_id=run_id,
            status=request.status,
            metrics=request.metrics,
            output=request.output,
            error=request.error,
            end_time=request.end_time
        )
        return {"status": "updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{run_id}/artifact", dependencies=[Depends(verify_api_key)])
def log_artifact(run_id: str, request: LogArtifactRequest):
    try:
        mlflow_store.log_artifact_data(
            run_id=run_id,
            name=request.name,
            content=request.content,
            type=request.type
        )
        return {"status": "logged"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
