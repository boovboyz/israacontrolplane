import mlflow
from mlflow.tracking import MlflowClient
from app.settings import settings
from app.schemas import RunListItem, RunDetail, ArtifactItem
from app.services.confidence import compute_confidence
from typing import List, Optional
import datetime
import json
import re

# Map frontend status names to MLflow native status strings
_STATUS_TO_MLFLOW = {
    "success": "FINISHED",
    "failed": "FAILED",
    "running": "RUNNING",
}

_MLFLOW_TO_STATUS = {
    "FINISHED": "success",
    "FAILED": "failed",
    "RUNNING": "running",
}


class MLflowStore:
    def __init__(self):
        mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
        self.client = MlflowClient()
        self.experiment_name = settings.MLFLOW_EXPERIMENT_NAME
        self._ensure_experiment()

    def _ensure_experiment(self):
        exp = self.client.get_experiment_by_name(self.experiment_name)
        if not exp:
            self.experiment_id = self.client.create_experiment(self.experiment_name)
        else:
            self.experiment_id = exp.experiment_id

    def get_client(self):
        return self.client

    def get_experiment_id(self):
        self._ensure_experiment()
        return self.experiment_id

    # ------------------------------------------------------------------
    # List runs
    # ------------------------------------------------------------------
    def list_runs(
        self,
        query: str = None,
        model: str = None,
        status: str = None,
        min_confidence: float = None,
        limit: int = 1000,
    ) -> List[RunListItem]:
        conditions = []

        # Status: convert frontend name -> MLflow native name
        if status:
            mlflow_status = _STATUS_TO_MLFLOW.get(status)
            if mlflow_status:
                conditions.append(f"attributes.status = '{mlflow_status}'")

        if model:
            conditions.append(f"params.model = '{model}'")

        filter_string = " AND ".join(conditions) if conditions else ""

        runs = self.client.search_runs(
            experiment_ids=[self.experiment_id],
            filter_string=filter_string,
            order_by=["attribute.start_time DESC"],
            max_results=limit,
        )

        results = []
        for run in runs:
            data = run.data
            metrics = data.metrics
            params = data.params

            latency = metrics.get("latency_ms")
            cost = metrics.get("cost_usd")
            confidence = metrics.get("confidence")
            confidence_label = data.tags.get("confidence_label")
            # We don't load components list in list_view to save bandwidth, unless requested?
            # Schema has them as Optional, so we can omit them.
            
            run_model = params.get("model_name") or params.get("model") or "unknown"

            mapped_status = _MLFLOW_TO_STATUS.get(run.info.status, "pending")

            # Client-side text search
            if query:
                q = query.lower()
                searchable = f"{run.info.run_id} {run_model} {mapped_status} {params.get('user_question', '')}".lower()
                if q not in searchable:
                    continue

            # Client-side confidence filter
            if min_confidence is not None:
                if confidence is None or confidence < min_confidence:
                    continue

            results.append(
                RunListItem(
                    run_id=run.info.run_id,
                    status=mapped_status,
                    model=run_model,
                    latency_ms=latency,
                    cost_usd=cost,
                    confidence=confidence,
                    confidence_label=confidence_label,
                    started_at=(
                        datetime.datetime.fromtimestamp(run.info.start_time / 1000.0)
                        if run.info.start_time
                        else None
                    ),
                )
            )

        return results

    def list_runs_in_range(
        self,
        days: float,  # Can be 1 for 24h
        limit: int = 10000
    ) -> List[RunListItem]:
        # Calculate cutoff timestamp in ms
        cutoff_dt = datetime.datetime.now() - datetime.timedelta(days=days)
        cutoff_ms = int(cutoff_dt.timestamp() * 1000)

        filter_string = f"attribute.start_time >= {cutoff_ms}"

        runs = self.client.search_runs(
            experiment_ids=[self.experiment_id],
            filter_string=filter_string,
            order_by=["attribute.start_time DESC"],
            max_results=limit,
        )

        results = []
        for run in runs:
            data = run.data
            metrics = data.metrics
            params = data.params

            latency = metrics.get("latency_ms")
            cost = metrics.get("cost_usd")
            confidence = metrics.get("confidence")
            confidence_label = data.tags.get("confidence_label")

            # Parse success is stored as metric (1.0 or 0.0) from previous tasks? 
            # Or we infer it? The prompt implies "metric parse_success (0/1)". 
            # Let's assume it is logged as a metric.
            parse_success_val = metrics.get("parse_success", 0)

            run_model = params.get("model_name") or params.get("model") or "unknown"
            mapped_status = _MLFLOW_TO_STATUS.get(run.info.status, "pending")

            results.append(
                RunListItem(
                    run_id=run.info.run_id,
                    status=mapped_status,
                    model=run_model,
                    latency_ms=latency,
                    cost_usd=cost,
                    confidence=confidence,
                    confidence_label=confidence_label,
                    parse_success=parse_success_val,
                    started_at=(
                        datetime.datetime.fromtimestamp(run.info.start_time / 1000.0)
                        if run.info.start_time
                        else None
                    ),
                )
            )
        
        return results

    # ------------------------------------------------------------------
    # Artifact helpers
    # ------------------------------------------------------------------
    def _list_artifacts_recursive(self, run_id: str, path: str = None) -> List[ArtifactItem]:
        artifacts = []
        try:
            items = self.client.list_artifacts(run_id, path)
        except Exception:
            return []

        for item in items:
            if item.is_dir:
                artifacts.extend(self._list_artifacts_recursive(run_id, item.path))
            else:
                art_type = "file"
                lower_path = item.path.lower()
                if lower_path.endswith(".json"):
                    art_type = "json"
                elif lower_path.endswith(
                    (".txt", ".md", ".log", ".csv", ".py", ".yaml", ".yml", ".ini")
                ):
                    art_type = "text"

                artifacts.append(
                    ArtifactItem(
                        name=item.path.split("/")[-1],
                        path=item.path,
                        type=art_type,
                    )
                )
        return artifacts

    # ------------------------------------------------------------------
    # Single run detail
    # ------------------------------------------------------------------
    def get_run(self, run_id: str) -> Optional[RunDetail]:
        try:
            run = self.client.get_run(run_id)
        except Exception:
            return None

        data = run.data
        metrics = data.metrics
        params = data.params
        tags = data.tags

        latency = metrics.get("latency_ms")
        cost = metrics.get("cost_usd")
        confidence = metrics.get("confidence")
        confidence_label = tags.get("confidence_label")
        confidence_components = self.get_json_artifact(run_id, "confidence_components.json") or {}
        confidence_explanation = self.get_json_artifact(run_id, "confidence_explanation.json")
        
        run_model = params.get("model_name") or params.get("model") or "unknown"

        mapped_status = _MLFLOW_TO_STATUS.get(run.info.status, "pending")

        artifacts = self._list_artifacts_recursive(run_id)

        # Try to resolve main inputs/outputs for preview
        input_preview = {}
        output_preview = {}
        
        # Input: params or artifacts
        if params.get("user_question"):
            input_preview["user_question"] = params.get("user_question")
        if params.get("prompt"):
            input_preview["prompt"] = params.get("prompt")
            
        # Try finding key text artifacts if params are empty
        if not input_preview:
            prompt_pkt = self.get_text_artifact(run_id, "prompt_packet.txt")
            if prompt_pkt:
                input_preview["prompt_packet"] = prompt_pkt[:2000] # Truncate for preview
            else:
                q_txt = self.get_text_artifact(run_id, "user_question.txt")
                if q_txt:
                    input_preview["user_question"] = q_txt
        
        # Output: artifacts
        # Try llm_response.txt
        llm_resp = self.get_text_artifact(run_id, "llm_response.txt")
        if llm_resp:
            output_preview["response"] = llm_resp
            # Try to grab json too
            parsed = self.get_json_artifact(run_id, "parsed_forecast.json")
            if parsed:
                output_preview["parsed"] = parsed
        else:
            # Fallback for legacy runs?
            # They stored output in artifact too?
            pass

        return RunDetail(
            run_id=run_id,
            status=mapped_status,
            model=run_model,
            latency_ms=latency,
            cost_usd=cost,
            confidence=confidence,
            confidence_label=confidence_label,
            confidence_components=confidence_components,
            confidence_explanation=confidence_explanation,
            started_at=(
                datetime.datetime.fromtimestamp(run.info.start_time / 1000.0)
                if run.info.start_time
                else None
            ),
            params=params,
            metrics=metrics,
            tags=tags,
            artifacts=artifacts,
            input_preview=input_preview,
            output_preview=output_preview,
        )

    # ------------------------------------------------------------------
    # Artifact content
    # ------------------------------------------------------------------
    # ------------------------------------------------------------------
    # Artifact content
    # ------------------------------------------------------------------
    def get_artifact_content(self, run_id: str, path: str) -> str:
        # Check cache or download
        try:
            local_path = self.client.download_artifacts(run_id, path)
            with open(local_path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return None

    def get_json_artifact(self, run_id: str, path: str) -> Optional[dict]:
        content = self.get_artifact_content(run_id, path)
        if content:
            try:
                return json.loads(content)
            except json.JSONDecodeError:
                pass
        return None

    def get_text_artifact(self, run_id: str, path: str) -> Optional[str]:
        return self.get_artifact_content(run_id, path)

    # ------------------------------------------------------------------
    # Replay
    # ------------------------------------------------------------------
    def log_replay_run(
        self,
        source_run_id,
        model,
        temperature,
        prompt,
        output_text,
        latency,
        cost,
        confidence,
        parse_success=0,
    ):
        try:
            mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
            mlflow.set_experiment(self.experiment_name)

            with mlflow.start_run() as run:
                mlflow.log_param("source_run_id", source_run_id)
                mlflow.log_param("model", model)
                mlflow.log_param("temperature", temperature)
                mlflow.set_tag("replay_of", source_run_id)
                mlflow.set_tag("run_type", "replay")

                if prompt:
                    mlflow.log_text(prompt, "prompt_override.txt")

                mlflow.log_metric("latency_ms", latency)
                mlflow.log_metric("cost_usd", cost)
                mlflow.log_metric("confidence", confidence)
                mlflow.log_metric("parse_success", parse_success)

                mlflow.log_text(output_text, "llm_response.txt")

                # Try to extract and log parsed forecast
                try:
                    pattern = r"```json\s*([\s\S]*?)\s*```"
                    match = re.search(pattern, output_text)
                    if match:
                        parsed = json.loads(match.group(1))
                        mlflow.log_dict(parsed, "parsed_forecast.json")
                except Exception:
                    pass

                return run.info.run_id
        except Exception as e:
            import traceback
            with open("backend_error.log", "w") as f:
                f.write(traceback.format_exc())
    def log_staged_run(
        self,
        source_run_id: str,
        replay_from_stage: int,
        stages: dict,
        params: dict,
        metrics: dict,
        tags: dict = None
    ):
        """
        Log a staged replay run with explicit artifacts for each stage.
        stages dict should contain keys like:
        - user_question (str)
        - retrieved_sources (json obj)
        - kpi_summary (json obj)
        - prompt_packet (str)
        - llm_response (str)
        - parsed_forecast (json obj)
        - parse_error (json obj)
        """
        try:
            mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
            mlflow.set_experiment(self.experiment_name)
            
            with mlflow.start_run() as run:
                # 1. Log Params
                mlflow.log_param("source_run_id", source_run_id)
                mlflow.log_param("replay_from_stage", replay_from_stage)
                for k, v in params.items():
                    mlflow.log_param(k, v)
                
                # 2. Log Tags
                mlflow.set_tag("run_type", "replay")
                mlflow.set_tag("replay_of", source_run_id)
                if tags:
                    for k, v in tags.items():
                        mlflow.set_tag(k, v)
                        
                # 3. Log Metrics
                for k, v in metrics.items():
                    mlflow.log_metric(k, v)
                    
                # 4. Log Stage Artifacts
                # We log them with standardized names so future replays can find them easily
                
                if stages.get("user_question"):
                    mlflow.log_text(stages["user_question"], "user_question.txt")
                    # Also log as param for searchability
                    mlflow.log_param("user_question", stages["user_question"][:500])
                    
                if stages.get("retrieved_sources"):
                    mlflow.log_dict(stages["retrieved_sources"], "retrieved_sources.json")
                    
                if stages.get("kpi_summary"):
                    mlflow.log_dict(stages["kpi_summary"], "kpi_summary.json")
                    
                if stages.get("prompt_packet"):
                    mlflow.log_text(stages["prompt_packet"], "prompt_packet.txt")
                    
                if stages.get("llm_response"):
                    mlflow.log_text(stages["llm_response"], "llm_response.txt")
                    
                if stages.get("parsed_forecast"):
                    mlflow.log_dict(stages["parsed_forecast"], "parsed_forecast.json")
                    
                if stages.get("parse_error"):
                    mlflow.log_dict(stages["parse_error"], "parse_error.json")

                return run.info.run_id
        except Exception as e:
            import traceback
            print(f"Error logging staged run: {e}")
            traceback.print_exc()
            raise e

    # ------------------------------------------------------------------
    # Evaluations (Layer 3)
    # ------------------------------------------------------------------
    def set_evaluation(self, run_id: str, rating: int, label: str, comment: str):
        """Persist human evaluation as MLflow tags on the run."""
        self.client.set_tag(run_id, "eval_rating", str(rating))
        self.client.set_tag(run_id, "eval_label", label)
        self.client.set_tag(run_id, "eval_comment", comment)

    # ------------------------------------------------------------------
    # Timeseries metrics (Layer 3)
    # ------------------------------------------------------------------
    def get_timeseries(self, metric: str = "latency_ms", days: int = 7) -> list:
        """Return per-run metric values over time for charting."""
        cutoff = datetime.datetime.now() - datetime.timedelta(days=days)
        cutoff_ms = int(cutoff.timestamp() * 1000)

        filter_string = f"attribute.start_time >= {cutoff_ms}"

        runs = self.client.search_runs(
            experiment_ids=[self.experiment_id],
            filter_string=filter_string,
            order_by=["attribute.start_time ASC"],
            max_results=2000,
        )

        points = []
        for run in runs:
            val = run.data.metrics.get(metric)
            if val is not None:
                points.append(
                    {
                        "timestamp": datetime.datetime.fromtimestamp(
                            run.info.start_time / 1000.0
                        ).isoformat(),
                        "value": val,
                        "run_id": run.info.run_id,
                        "model": run.data.params.get("model_name")
                            or run.data.params.get("model", "unknown"),
                    }
                )
        return points


    # ------------------------------------------------------------------
    # Client Logging (Write)
    # ------------------------------------------------------------------
    def start_run(self, user_id: str, session_id: str, model: str, params: dict, tags: dict = None) -> str:
        mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
        mlflow.set_experiment(self.experiment_name)
        
        # Start run
        run = self.client.create_run(self.experiment_id)
        run_id = run.info.run_id
        
        # Log initial data
        self.client.log_param(run_id, "user_id", user_id)
        self.client.log_param(run_id, "session_id", session_id)
        self.client.log_param(run_id, "model", model)
        
        for k, v in params.items():
            self.client.log_param(run_id, k, str(v)[:500]) # Truncate params safely
            
        # Default tags
        self.client.set_tag(run_id, "source", "client_api")
        if tags:
            for k, v in tags.items():
                self.client.set_tag(run_id, k, v)
                
        return run_id

    def update_run(self, run_id: str, status: str = None, metrics: dict = None, output: str = None, error: str = None, end_time: bool = False):
        if status:
            mlflow_status = _STATUS_TO_MLFLOW.get(status, "RUNNING")
            self.client.set_terminated(run_id, status=mlflow_status, end_time=int(datetime.datetime.now().timestamp() * 1000) if end_time else None)
        
        if metrics:
            for k, v in metrics.items():
                self.client.log_metric(run_id, k, v)
                
        if output:
            self.client.log_text(run_id, output, "llm_response.txt")
            
        if error:
             self.client.log_text(run_id, error, "error.txt")
             
        if status in ["success", "failed"]:
            self._compute_and_log_confidence(run_id)

    def log_artifact_data(self, run_id: str, name: str, content: str, type: str):
        if type == "json":
            try:
                data = json.loads(content)
                self.client.log_dict(run_id, data, name)
            except:
                self.client.log_text(run_id, content, name)
        else:
            self.client.log_text(run_id, content, name)
            
        self._compute_and_log_confidence(run_id)

    def _compute_and_log_confidence(self, run_id: str):
        try:
            run = self.client.get_run(run_id)
            metrics = run.data.metrics
            params = run.data.params
            status = _MLFLOW_TO_STATUS.get(run.info.status, "pending")
            
            # Extract signals for confidence
            # 1. Response Text
            response_text = self.get_text_artifact(run_id, "llm_response.txt") or ""
            
            # 2. Retrieval Count
            retrieval_count = int(metrics.get("retrieval_count", 0))
            if retrieval_count == 0:
                 # Fallback: check artifact existence if metric missing
                 if self.get_json_artifact(run_id, "retrieved_sources.json"):
                     retrieval_count = 1
            
            # 3. Parse Success
            parse_success = int(metrics.get("parse_success", 0)) == 1
            if not parse_success:
                 # Fallback: check artifact
                 if self.get_json_artifact(run_id, "parsed_forecast.json"):
                     parse_success = True

            result = compute_confidence(
                response_text=response_text,
                retrieval_count=retrieval_count,
                parse_success=parse_success,
                status=status
            )
            
            self.client.log_metric(run_id, "confidence", result["score"])
            self.client.set_tag(run_id, "confidence_label", result["label"])
            self.client.log_dict(run_id, result["components"], "confidence_components.json")
            self.client.log_dict(run_id, result["explanation"], "confidence_explanation.json")

            # Trigger Alert Evaluation
            from app.services.alerts import alerts_service
            # Need to re-fetch/construct RunDetail-like object or pass what we have
            # evaluate_run expects RunDetail. Let's use get_run to be safe and get full context
            full_run = self.get_run(run_id)
            if full_run:
                alerts_service.evaluate_run(full_run)
            
        except Exception as e:
            print(f"Failed to compute confidence for {run_id}: {e}")

mlflow_store = MLflowStore()
