from fastapi import APIRouter, HTTPException
from app.schemas import EvaluationRequest, EvaluationResponse
from app.mlflow_store import mlflow_store

router = APIRouter()


@router.post("", response_model=EvaluationResponse)
def create_evaluation(req: EvaluationRequest):
    """Persist a human evaluation (rating, label, comment) as MLflow tags."""
    run = mlflow_store.get_run(req.run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    if not 1 <= req.rating <= 5:
        raise HTTPException(status_code=422, detail="Rating must be 1-5")

    mlflow_store.set_evaluation(
        run_id=req.run_id,
        rating=req.rating,
        label=req.label,
        comment=req.comment,
    )

    return EvaluationResponse(
        run_id=req.run_id,
        rating=req.rating,
        label=req.label,
        comment=req.comment,
    )
