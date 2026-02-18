import json
import os
import uuid
from datetime import datetime
from typing import List, Optional
from app.schemas import Alert, RunDetail

DATA_DIR = ".fulcrum_data"
ALERTS_FILE = os.path.join(DATA_DIR, "alerts.json")

class AlertsService:
    def __init__(self):
        self._ensure_storage()

    def _ensure_storage(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        if not os.path.exists(ALERTS_FILE):
            with open(ALERTS_FILE, "w") as f:
                json.dump([], f)

    def _load_alerts(self) -> List[dict]:
        try:
            with open(ALERTS_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []

    def _save_alerts(self, alerts: List[dict]):
        with open(ALERTS_FILE, "w") as f:
            json.dump(alerts, f, indent=2)

    def get_alerts(self, limit: int = 100, resolved: bool = False) -> List[Alert]:
        raw_alerts = self._load_alerts()
        # Sort by created_at desc
        raw_alerts.sort(key=lambda x: x["created_at"], reverse=True)
        
        filtered = [a for a in raw_alerts if a.get("is_resolved", False) == resolved]
        return [Alert(**a) for a in filtered[:limit]]

    def resolve_alert(self, alert_id: str) -> bool:
        alerts = self._load_alerts()
        for alert in alerts:
            if alert["id"] == alert_id:
                alert["is_resolved"] = True
                self._save_alerts(alerts)
                return True
        return False

    def evaluate_run(self, run: RunDetail):
        """
        Evaluates a finished run against alert rules.
        """
        if run.status != "success":
            return # Only evaluate successful runs for content issues, or handle error runs differently
            
        new_alerts = []
        
        # 1. Low Confidence
        # Conf < 0.5 triggers warning
        confidence = run.confidence if run.confidence is not None else run.confidence_score
        if confidence is not None and confidence < 0.5:
            new_alerts.append({
                "type": "LOW_CONFIDENCE",
                "severity": "medium",
                "message": f"Run {run.run_id} has low confidence ({confidence:.2f})."
            })

        # 2. Policy Fail
        # If we have policy checks. Assuming 'policy_pass' metric or tag? 
        # For now, let's look at checks/artifacts if we have them, or just a placeholder logic.
        # The prompt mentioned: "policy_pass == 0 (from stored field or artifact)"
        # Let's check metrics
        if run.metrics and run.metrics.get("policy_pass") == 0:
             new_alerts.append({
                "type": "POLICY_FAIL",
                "severity": "high",
                "message": f"Run {run.run_id} failed policy checks."
            })

        # 3. High Latency
        # > 5000ms default
        latency_threshold = int(os.getenv("ALERT_LATENCY_THRESHOLD_MS", "5000"))
        if run.latency_ms and run.latency_ms > latency_threshold:
             new_alerts.append({
                "type": "HIGH_LATENCY",
                "severity": "low",
                "message": f"Run {run.run_id} took {run.latency_ms}ms (threshold: {latency_threshold}ms)."
            })

        # 4. Retrieval Empty
        # Provide check if retrieval artifact was expected but missing/empty?
        # For now, let's look for "retrieval_count" metric if it exists
        if run.metrics and run.metrics.get("retrieval_count", 1) == 0:
             new_alerts.append({
                "type": "RETRIEVAL_EMPTY",
                "severity": "medium",
                "message": f"Run {run.run_id} yielded no retrieved context."
            })

        if new_alerts:
            self._persist_alerts(new_alerts, run.run_id)

    def _persist_alerts(self, alerts_data: List[dict], run_id: str):
        existing = self._load_alerts()
        for a in alerts_data:
            alert_obj = {
                "id": str(uuid.uuid4()),
                "run_id": run_id,
                "type": a["type"],
                "severity": a["severity"],
                "message": a["message"],
                "created_at": datetime.utcnow().isoformat(),
                "is_resolved": False
            }
            existing.append(alert_obj)
        self._save_alerts(existing)

    def seed_demo_alerts(self):
        """Seeds sample alerts for demo mode if empty."""
        if len(self._load_alerts()) > 0:
            return

        demo_alerts = [
            {
                "id": str(uuid.uuid4()),
                "run_id": "demo-run-123",
                "type": "POLICY_FAIL",
                "severity": "high",
                "message": "PII usage detected in output (credit card pattern).",
                "created_at": datetime.utcnow().isoformat(),
                "is_resolved": False
            },
            {
                "id": str(uuid.uuid4()),
                "run_id": "demo-run-456",
                "type": "LOW_CONFIDENCE",
                "severity": "medium",
                "message": "Model confidence 0.35 below threshold 0.5.",
                "created_at": datetime.utcnow().isoformat(),
                "is_resolved": False
            },
             {
                "id": str(uuid.uuid4()),
                "run_id": "demo-run-789",
                "type": "HIGH_LATENCY",
                "severity": "low",
                "message": "Response time 8500ms exceeded SLA 5000ms.",
                "created_at": datetime.utcnow().isoformat(),
                "is_resolved": True
            }
        ]
        self._save_alerts(demo_alerts)

alerts_service = AlertsService()
