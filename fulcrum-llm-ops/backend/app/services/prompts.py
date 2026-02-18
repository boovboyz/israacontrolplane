import json
import os
import re
from datetime import datetime
from typing import List, Optional, Dict, Any
from app.schemas import Prompt, PromptVersion, CreatePromptRequest, CreateVersionRequest

DATA_DIR = ".fulcrum_data"
PROMPTS_FILE = os.path.join(DATA_DIR, "prompts.json")

class PromptsService:
    def __init__(self):
        self._ensure_storage()

    def _ensure_storage(self):
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        if not os.path.exists(PROMPTS_FILE):
            with open(PROMPTS_FILE, "w") as f:
                json.dump([], f)

    def _load_prompts(self) -> List[Dict]:
        try:
            with open(PROMPTS_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_prompts(self, prompts: List[Dict]):
        with open(PROMPTS_FILE, "w") as f:
            json.dump(prompts, f, indent=2)

    def list_prompts(self) -> List[Prompt]:
        data = self._load_prompts()
        return [Prompt(**p) for p in data]

    def get_prompt(self, slug: str) -> Optional[Prompt]:
        prompts = self.list_prompts()
        for p in prompts:
            if p.id == slug:
                return p
        return None

    def create_prompt(self, req: CreatePromptRequest) -> Prompt:
        prompts = self._load_prompts()
        
        # Check if exists
        for p in prompts:
            if p["id"] == req.slug:
                raise ValueError(f"Prompt with slug '{req.slug}' already exists")

        now = datetime.now().isoformat()
        
        # Extract variables
        variables = self._extract_variables(req.template)

        initial_version = PromptVersion(
            version="v1",
            template=req.template,
            variables=variables,
            author=req.author,
            created_at=now
        )

        new_prompt = Prompt(
            id=req.slug,
            name=req.name,
            latest_version=initial_version,
            versions=[initial_version],
            status=req.status,
            updated_at=now,
            author=req.author
        )

        prompts.append(new_prompt.dict())
        self._save_prompts(prompts)
        return new_prompt

    def create_version(self, slug: str, req: CreateVersionRequest) -> Prompt:
        prompts = self._load_prompts()
        target_idx = -1
        
        for idx, p in enumerate(prompts):
            if p["id"] == slug:
                target_idx = idx
                break
        
        if target_idx == -1:
            raise ValueError("Prompt not found")

        prompt_data = prompts[target_idx]
        current_versions = prompt_data.get("versions", [])
        
        # Calculate new version
        next_v = 1
        if current_versions:
            last_v = current_versions[0]["version"] # Assumes sorted desc
            try:
                next_v = int(last_v.replace("v", "")) + 1
            except:
                next_v = len(current_versions) + 1
        
        new_v_str = f"v{next_v}"
        now = datetime.now().isoformat()
        variables = self._extract_variables(req.template)

        new_version = PromptVersion(
            version=new_v_str,
            template=req.template,
            variables=variables,
            author=req.author,
            created_at=now
        )

        # Prepend to versions list
        prompt_data["versions"].insert(0, new_version.dict())
        prompt_data["latest_version"] = new_version.dict()
        prompt_data["updated_at"] = now
        
        prompts[target_idx] = prompt_data
        self._save_prompts(prompts)
        return Prompt(**prompt_data)

    def _extract_variables(self, template: str) -> List[str]:
        # Simple regex to find {{param}}
        pattern = r"\{\{\s*(\w+)\s*\}\}"
        matches = re.findall(pattern, template)
        return sorted(list(set(matches)))

    def render_prompt(self, template: str, variables: Dict[str, Any]) -> str:
        # Simple substitution
        rendered = template
        for k, v in variables.items():
            # Replace {{ k }} and {{k}}
            pattern = r"\{\{\s*" + re.escape(k) + r"\s*\}\}"
            rendered = re.sub(pattern, str(v), rendered)
        return rendered

prompts_service = PromptsService()
