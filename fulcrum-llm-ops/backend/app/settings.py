import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MLFLOW_TRACKING_URI: str = "file:../../mlruns"
    MLFLOW_EXPERIMENT_NAME: str = "sales-predictor-layer2"
    FULCRUM_API_KEY: str = "dev-key-123"
    AUTH_DISABLED: bool = False
    CORS_ORIGINS: list[str] = [
        "*",
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Resolve relative file: URIs to absolute paths so that both the
        # Streamlit app and this backend always read the same mlruns store.
        if self.MLFLOW_TRACKING_URI.startswith("file:"):
            path = self.MLFLOW_TRACKING_URI.replace("file:", "")
            if not os.path.isabs(path):
                # Resolve relative to the backend directory (where uvicorn
                # runs from).  __file__ = backend/app/settings.py, so two
                # dirname calls get us to the backend/ dir.
                backend_dir = os.path.dirname(
                    os.path.dirname(os.path.abspath(__file__))
                )
                path = os.path.normpath(os.path.join(backend_dir, path))
            self.MLFLOW_TRACKING_URI = "file:" + path


settings = Settings()
