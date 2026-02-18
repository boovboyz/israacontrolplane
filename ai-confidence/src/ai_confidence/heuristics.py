from typing import Sequence, Tuple, Dict, Any
from .models import RetrievedChunk
from .judge import clamp01

def retrieval_quality(chunks: Sequence[RetrievedChunk]) -> Tuple[float, Dict[str, Any]]:
    sims = [c.similarity for c in chunks if c.similarity is not None]
    if not sims:
        return 0.0, {"reason": "no_similarity_scores"}
    
    max_sim = max(sims)
    avg_sim = sum(sims) / len(sims)
    
    # 60% max similarity, 40% average similarity
    score = 0.6 * max_sim + 0.4 * avg_sim
    return clamp01(score), {"max_similarity": max_sim, "avg_similarity": avg_sim}
