from typing import List, Dict, Any, Optional
from .models import RunContext, LLMCall, ConfidenceReport
from .heuristics import retrieval_quality
from .judge import clamp01, extract_json
from .prompts import GROUNDING_JUDGE_PROMPT, POLICY_JUDGE_PROMPT
from .pii import scan as pii_scan
from .routing import route

def _format_context(call: LLMCall, max_chars: int = 12000) -> str:
    parts = []
    for c in call.contexts:
        parts.append(f"[{c.source_id}:{c.chunk_id}] {c.text}")
    txt = "\n\n".join(parts)
    return txt[:max_chars]

def compute_confidence(run: RunContext, call: LLMCall, judge) -> ConfidenceReport:
    gates: List[str] = []
    notes: List[str] = []
    raw: Dict[str, Any] = {}

    # Heuristic retrieval score
    rq, rq_details = retrieval_quality(call.contexts)
    raw["retrieval"] = rq_details

    # Policy quick scan (regex) on output
    violations = pii_scan(call.output_text)
    policy_score = 1.0 if not violations else 0.0
    if violations:
        gates.append("PII_PCI_DETECTED")
        notes.append(f"PII/PCI detected: {', '.join(violations)}")

    # Policy judge as backstop (only if regex passed)
    if policy_score == 1.0:
        pol_prompt = POLICY_JUDGE_PROMPT.format(text=call.output_text)
        pol_raw = judge.complete(pol_prompt)
        pol = extract_json(pol_raw)
        raw["policy_judge"] = pol
        
        if not bool(pol.get("pass", True)):
            policy_score = 0.0
            gates.append("POLICY_JUDGE_FAIL")
            v = pol.get("violations", []) or []
            notes.append(f"Policy violations: {', '.join(v)}")

    # Groundedness judge (requires context; for generic demo we’ll use provided contexts)
    ctx = _format_context(call)
    g_prompt = GROUNDING_JUDGE_PROMPT.format(question=call.user_prompt, context=ctx, answer=call.output_text)
    g_raw = judge.complete(g_prompt)
    g = extract_json(g_raw)
    raw["grounding_judge"] = g
    groundedness = clamp01(float(g.get("score", 0.0)))

    # Conservative aggregation (simple v0.1)
    confidence_raw = 0.35 * rq + 0.50 * groundedness + 0.15 * policy_score

    # Hard gates/caps
    if policy_score == 0.0:
        confidence_raw = min(confidence_raw, 0.2)
    
    if groundedness < 0.4:
        confidence_raw = min(confidence_raw, 0.5)
        gates.append("LOW_GROUNDEDNESS")

    confidence_0_100 = int(round(clamp01(confidence_raw) * 100))
    routing = route(confidence_0_100)

    return ConfidenceReport(
        run_id=run.run_id,
        step_id=run.step_id,
        overall_confidence=confidence_0_100,
        routing=routing,
        components={
            "retrieval_quality": rq,
            "groundedness": groundedness,
            "policy_score": policy_score,
        },
        gates_triggered=gates,
        notes=notes,
        raw=raw,
    )
