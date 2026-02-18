from fastapi import APIRouter, Query
from app.schemas import (
    DashboardSummaryResponse, MetricsKPIs, TimeseriesResponse, TimeseriesPoint,
    CostByModelItem, ConfidenceDistributionResponse, ConfidenceBin, RunListItem
)
from app.mlflow_store import mlflow_store
from typing import List
import statistics
import math

router = APIRouter()

_RANGE_DAYS = {"24h": 1, "7d": 7, "30d": 30, "90d": 90}


def _get_days(range_str: str):
    return _RANGE_DAYS.get(range_str, 7)


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_metrics_summary(range: str = "7d"):
    days = _get_days(range)
    runs = mlflow_store.list_runs_in_range(days=days)

    latencies = [r.latency_ms for r in runs if r.latency_ms is not None]
    costs = [r.cost_usd for r in runs if r.cost_usd is not None]
    confidences = [r.confidence for r in runs if r.confidence is not None]
    
    # parse_success is patched in or added to schema
    # We added it to schema RunListItem as float
    parse_successes = [r.parse_success for r in runs if r.parse_success is not None]

    if not latencies:
        return DashboardSummaryResponse(
            range=range,
            kpis=MetricsKPIs(
                p50_latency_ms=0,
                p95_latency_ms=0,
                total_cost_usd=0,
                avg_confidence=0,
                parse_success_rate=0,
                run_count=0
            ),
            models=[]
        )

    latencies.sort()
    n = len(latencies)
    p50 = latencies[int(0.5 * n)]
    p95 = latencies[min(int(0.95 * n), n - 1)]

    unique_models = list(set(r.model for r in runs if r.model))
    
    # Calculate success rate safely
    parse_rate = 0.0
    if len(parse_successes) > 0:
        # Assuming parse_success is 0.0 or 1.0
        parse_rate = sum(parse_successes) / len(parse_successes)

    return DashboardSummaryResponse(
        range=range,
        kpis=MetricsKPIs(
            p50_latency_ms=p50,
            p95_latency_ms=p95,
            total_cost_usd=round(sum(costs), 4),
            avg_confidence=round(statistics.mean(confidences), 3) if confidences else 0,
            parse_success_rate=round(parse_rate, 3),
            run_count=len(runs)
        ),
        models=unique_models
    )


@router.get("/timeseries", response_model=TimeseriesResponse)
def get_timeseries(
    metric: str = Query("latency_ms", description="latency_ms|cost_usd|confidence|parse_success"),
    range: str = Query("7d"),
):
    days = _get_days(range)
    points = mlflow_store.get_timeseries(metric=metric, days=days)
    # Filter points to only include those in range (mlflow_store.get_timeseries does this already roughly)
    # But let's just return what we have mapped to the schema
    # RunListItem -> TimeseriesPoint mapping happened inside store? 
    # Wait, mlflow_store.get_timeseries returns list of dicts. Schema expects TimeseriesPoint objects.
    # Let's map it here to be safe or rely on Pydantic
    
    # Actually mlflow_store.get_timeseries returns a list of Dicts.
    # We need to wrap it into TimeseriesResponse
    return TimeseriesResponse(
        metric=metric,
        points=points
    )


@router.get("/cost_by_model", response_model=List[CostByModelItem])
def get_cost_by_model(range: str = "7d"):
    days = _get_days(range)
    runs = mlflow_store.list_runs_in_range(days=days)
    
    model_stats = {}
    
    for r in runs:
        m = r.model or "unknown"
        if m not in model_stats:
            model_stats[m] = {"cost": 0.0, "count": 0}
            
        if r.cost_usd:
            model_stats[m]["cost"] += r.cost_usd
        model_stats[m]["count"] += 1
        
    results = []
    for m, stats in model_stats.items():
        results.append(CostByModelItem(
            model=m,
            cost_usd=round(stats["cost"], 4),
            run_count=stats["count"]
        ))
    
    return sorted(results, key=lambda x: x.cost_usd, reverse=True)


@router.get("/confidence_distribution", response_model=ConfidenceDistributionResponse)
def get_confidence_distribution(time_range: str = Query("7d", alias="range")):
    days = _get_days(time_range)
    runs = mlflow_store.list_runs_in_range(days=days)
    
    confidences = [r.confidence for r in runs if r.confidence is not None]
    
    # 10 bins: 0.0-0.1, ... 0.9-1.0
    bins = [0] * 10
    
    for c in confidences:
        # clamp to 0-1
        val = max(0.0, min(1.0, c))
        idx = int(val * 10)
        if idx == 10: idx = 9 # handle 1.0 exactly
        bins[idx] += 1
        
    result_bins = []
    for i in range(10):
        result_bins.append(ConfidenceBin(
            min=i/10.0,
            max=(i+1)/10.0,
            count=bins[i]
        ))
        
    return ConfidenceDistributionResponse(bins=result_bins)


@router.get("/recent_runs", response_model=List[RunListItem])
def get_recent_runs(range: str = "7d", limit: int = 100):
    days = _get_days(range)
    runs = mlflow_store.list_runs_in_range(days=days, limit=limit)
    return runs
