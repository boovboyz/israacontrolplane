import os
import time
import mlflow
import contextlib
from typing import Any, Dict, Optional, Generator

# ---------------------------------------------------------------------------
# Setup MLflow URI
# ---------------------------------------------------------------------------
_PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_MLRUNS = os.path.join(_PROJECT_ROOT, "mlruns")

_raw_uri = os.getenv("MLFLOW_TRACKING_URI", "file:mlruns")
if _raw_uri.startswith("file:"):
    _path = _raw_uri.replace("file:", "")
    if not os.path.isabs(_path):
        _path = os.path.join(_PROJECT_ROOT, _path)
    _TRACKING_URI = "file:" + _path
else:
    _TRACKING_URI = _raw_uri

mlflow.set_tracking_uri(_TRACKING_URI)
_EXPERIMENT_NAME = os.getenv("MLFLOW_EXPERIMENT_NAME", "sales-predictor-layer2")

class ObservabilityClient:
    """
    Wrapper around MLflow to provide a span-like interface and centralized logging.
    """
    def __init__(self):
        self.experiment_name = _EXPERIMENT_NAME

    def set_experiment(self, name: str = None):
        mlflow.set_experiment(name or self.experiment_name)

    @contextlib.contextmanager
    def start_run(self, run_name: str = None, nested: bool = False) -> Generator[mlflow.ActiveRun, None, None]:
        """Context manager for an MLflow run."""
        self.set_experiment()
        with mlflow.start_run(run_name=run_name, nested=nested) as run:
            yield run

    @contextlib.contextmanager
    def start_span(self, name: str, parent_ctx: Any = None) -> Generator["Span", None, None]:
        """
        Mimics a tracing span. In MLflow, we might map this to a nested run 
        or just log timing metrics if nested runs are too heavy.
        For now, let's use a simple timer and log a metric on exit.
        """
        start_time = time.time()
        span = Span(name)
        try:
            yield span
        finally:
            duration_ms = (time.time() - start_time) * 1000
            mlflow.log_metric(f"{name}_duration_ms", duration_ms)
            if span.status:
                mlflow.set_tag(f"{name}.status", span.status)
            if span.metadata:
                mlflow.log_dict(span.metadata, f"{name}_metadata.json")

    def log_event(self, name: str, payload: Dict[str, Any]):
        """Logs a significant event as a dictionary artifact."""
        mlflow.log_dict(payload, f"event_{name}.json")

    def log_metric(self, key: str, value: float):
        mlflow.log_metric(key, value)

    def log_param(self, key: str, value: Any):
        mlflow.log_param(key, value)

    def log_text(self, text: str, artifact_file: str):
        mlflow.log_text(text, artifact_file)
    
    def log_dict(self, data: Dict, artifact_file: str):
        mlflow.log_dict(data, artifact_file)

    def set_tag(self, key: str, value: Any):
        mlflow.set_tag(key, value)


class Span:
    def __init__(self, name: str):
        self.name = name
        self.status = "OK"
        self.metadata = {}

    def set_status(self, status: str):
        self.status = status

    def add_metadata(self, key: str, value: Any):
        self.metadata[key] = value

# Global singleton
obs = ObservabilityClient()
