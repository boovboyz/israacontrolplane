from __future__ import annotations
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Sequence
from .models import RetrievedChunk
from .judge import clamp01

# Optional dependency: ragas
try:
    from ragas import evaluate
    from datasets import Dataset
    from ragas.metrics import faithfulness, answer_relevancy, context_utilization
except Exception: 
    evaluate = None
    Dataset = None
    faithfulness = answer_relevancy = context_utilization = None

@dataclass(frozen=True)
class RagasConfig:
    enabled: bool = True
    metrics: Optional[Sequence[str]] = None 

def _to_ragas_dataset(question: str, answer: str, contexts: Sequence[RetrievedChunk]) -> Any:
    if Dataset is None:
        raise RuntimeError("datasets/ragas not installed")
    return Dataset.from_dict(
        {
            "question": [question],
            "answer": [answer],
            "contexts": [[c.text for c in contexts]],
        }
    )

def score_with_ragas(
    *,
    question: str,
    answer: str,
    contexts: Sequence[RetrievedChunk],
    cfg: RagasConfig,
    llm=None,
    embeddings=None,
) -> Dict[str, float]:
    if not cfg.enabled:
        return {}
    if evaluate is None:
        # If ragas not installed, just return empty or raise. 
        # For demo purposes, we return empty so it doesn't crash if optional dep missing.
        return {}

    ds = _to_ragas_dataset(question, answer, contexts)
    metric_objs = []
    metric_map = {
        "faithfulness": faithfulness,
        "answer_relevancy": answer_relevancy,
        "context_utilization": context_utilization,
    }
    
    wanted = cfg.metrics or ["faithfulness", "answer_relevancy", "context_utilization"]
    for m in wanted:
        if m in metric_map and metric_map[m] is not None:
            metric_objs.append(metric_map[m])
            
    if not metric_objs:
        return {}

    # Ragas evaluate returns a result object
    try:
        result = evaluate(dataset=ds, metrics=metric_objs, llm=llm, embeddings=embeddings)
        out: Dict[str, float] = {}
        for m in wanted:
            if m in result:
                out[f"ragas_{m}"] = clamp01(float(result[m]))
        return out
    except Exception as e:
        print(f"Ragas evaluation failed: {e}")
        return {}
