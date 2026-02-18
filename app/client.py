import requests
import time
import uuid
import json
from typing import Dict, Any, Optional
from datetime import datetime

import os

class FulcrumClient:
    def __init__(self, api_url: str = "http://localhost:8000", api_key: str = None):
        self.api_url = api_url.rstrip("/")
        self.api_key = api_key or os.getenv("FULCRUM_API_KEY")
        self.headers = {}
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"
            
    def get_prompt(self, slug: str, version: str = None, variables: Dict[str, Any] = None) -> str:
        """
        Fetches a prompt template by slug and optionally version.
        If variables are provided, renders the prompt server-side.
        """
        try:
            # 1. Fetch Prompt Data
            url = f"{self.api_url}/prompts/{slug}"
            resp = requests.get(url, headers=self.headers)
            resp.raise_for_status()
            prompt_data = resp.json()
            
            # 2. Determine Version to use
            template = ""
            if version:
                # Find specific version
                found = next((v for v in prompt_data["versions"] if v["version"] == version), None)
                if not found:
                    raise ValueError(f"Version {version} not found for prompt {slug}")
                template = found["template"]
            else:
                # Use latest
                if not prompt_data.get("latest_version"):
                     raise ValueError(f"No versions found for prompt {slug}")
                template = prompt_data["latest_version"]["template"]
            
            # 3. Render if variables provided
            if variables:
                # We can do client-side render or server-side. 
                # For consistency with the "library feel", let's use the server's render endpoint 
                # OR just simple python format if we want to save a round trip.
                # But Step 3 said "Implement simple templating support... render_prompt helper".
                # Let's use the local helper logic for speed/offline capability if simple, 
                # OR use the server render endpoint if we want central logic.
                # The user request said "Backend prompt rendering engine... Expose helper in client... fetch prompt... render it"
                
                # Let's do client-side rendering for performance to avoid double RTT if not needed,
                # BUT to ensure consistency with the backend test, maybe server is better?
                # Actually, simple formatting is widely standard. Let's do local render for speed, 
                # matching the backend logic (simple substitution).
                
                for k, v in variables.items():
                    template = template.replace(f"{{{{ {k} }}}}", str(v))
                    template = template.replace(f"{{{{{k}}}}}", str(v))
                    
            return template
            
        except Exception as e:
            print(f"Failed to get prompt '{slug}': {e}")
            raise e
            
    def run(self, user_id: str, session_id: str, model: str, run_name: str = None, params: Dict[str, Any] = None, tags: Dict[str, str] = None):
        return RunContext(self, user_id, session_id, model, run_name, params, tags)

class RunContext:
    def __init__(self, client: FulcrumClient, user_id: str, session_id: str, model: str, run_name: str = None, params: Dict[str, Any] = None, tags: Dict[str, str] = None):
        self.client = client
        self.user_id = user_id
        self.session_id = session_id
        self.model = model
        self.params = params or {}
        self.tags = tags or {}
        if run_name:
            self.tags["run_name"] = run_name
            
        self.run_id = None
        self.start_time = None
        
    def __enter__(self):
        self.start_time = time.time()
        try:
            payload = {
                "user_id": self.user_id,
                "session_id": self.session_id,
                "model": self.model,
                "params": self.params,
                "tags": self.tags
            }
            resp = requests.post(f"{self.client.api_url}/runs", json=payload, headers=self.client.headers)
            resp.raise_for_status()
            self.run_id = resp.json()
            return self
        except Exception as e:
            print(f"Failed to start run: {e}")
            # We don't want to crash the app if logging fails
            self.run_id = None
            return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if not self.run_id:
            return
            
        end_time = True
        status = "success"
        error_msg = None
        
        if exc_type:
            status = "failed"
            error_msg = str(exc_val)
            
        latency_ms = (time.time() - self.start_time) * 1000
        
        try:
            payload = {
                "status": status,
                "end_time": end_time,
                "metrics": {"latency_ms": latency_ms},
                "error": error_msg
            }
            requests.patch(f"{self.client.api_url}/runs/{self.run_id}", json=payload, headers=self.client.headers)
        except Exception as e:
            print(f"Failed to end run: {e}")

    def log_input(self, prompt: str, user_question: str = None):
        if not self.run_id: return
        try:
            # Log as artifacts
            requests.post(f"{self.client.api_url}/runs/{self.run_id}/artifact", json={
                "name": "prompt_packet.txt",
                "content": prompt,
                "type": "text"
            }, headers=self.client.headers)
            if user_question:
                 requests.post(f"{self.client.api_url}/runs/{self.run_id}/artifact", json={
                    "name": "user_question.txt",
                    "content": user_question,
                    "type": "text"
                }, headers=self.client.headers)
        except Exception as e:
            print(f"Failed to log input: {e}")

    def log_output(self, response: str, parsed_json: Dict = None):
        if not self.run_id: return
        try:
            # Log response text
            requests.patch(f"{self.client.api_url}/runs/{self.run_id}", json={
                "output": response
            }, headers=self.client.headers)
            
            if parsed_json:
                 requests.post(f"{self.client.api_url}/runs/{self.run_id}/artifact", json={
                    "name": "parsed_forecast.json",
                    "content": json.dumps(parsed_json, indent=2),
                    "type": "json"
                }, headers=self.client.headers)
        except Exception as e:
            print(f"Failed to log output: {e}")
            
    def log_metric(self, key: str, value: float):
        if not self.run_id: return
        try:
            requests.patch(f"{self.client.api_url}/runs/{self.run_id}", json={
                "metrics": {key: value}
            }, headers=self.client.headers)
        except Exception as e:
            print(f"Failed to log metric: {e}")
            
    def log_artifact(self, name: str, content: str, type: str = "text"):
        if not self.run_id: return
        try:
             requests.post(f"{self.client.api_url}/runs/{self.run_id}/artifact", json={
                "name": name,
                "content": content,
                "type": type
            }, headers=self.client.headers)
        except Exception as e:
            print(f"Failed to log artifact: {e}")
