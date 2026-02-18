from __future__ import annotations
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional

@dataclass(frozen=True)
class EvalSample:
    id: str
    template: str
    question: str
    contexts: List[str]
    answer: str
    ground_truth: Optional[str] = None
    metadata: Dict[str, object] = None

def load_jsonl(path: str) -> List[Dict]:
    rows = []
    if not Path(path).exists():
        return []
    for line in Path(path).read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except:
            pass
    return rows

def load_eval_samples(samples_path: str, ground_truths_path: Optional[str] = None) -> List[EvalSample]:
    samples = {r["id"]: r for r in load_jsonl(samples_path)}
    gts = {}
    if ground_truths_path:
        gts = {r["id"]: r["ground_truth"] for r in load_jsonl(ground_truths_path)}
    
    out: List[EvalSample] = []
    for sid, r in samples.items():
        out.append(
            EvalSample(
                id=sid,
                template=r.get("template", "unknown"),
                question=r["question"],
                contexts=r.get("contexts", []),
                answer=r["answer"],
                ground_truth=gts.get(sid),
                metadata=r.get("metadata") or {},
            )
        )
    return out
