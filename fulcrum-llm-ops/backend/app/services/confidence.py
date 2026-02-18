from typing import Dict, List, Any

def compute_confidence(
    response_text: str,
    retrieval_count: int,
    parse_success: bool,
    status: str = "success"
) -> Dict[str, Any]:
    """
    Computes a heuristic confidence score (0-1) for an LLM run with detailed explanation.
    Returns a dict that matches the ConfidenceExplanation schema structure (plus simple score/label/components for backward compat).
    """
    
    # --- Constants & Weights ---
    VERSION = "v0.1"
    FORMULA = "score = clamp(base + json + retrieval + risk + assumption + error, 0, 1)"
    
    WEIGHTS = {
        "base_score": 0.25,
        "json_parsed": 0.30,
        "retrieval_boost_min": 0.15,
        "retrieval_boost_max": 0.25,
        "risk_keyword_hit": 0.10,
        "assumption_keyword_hit": 0.10
    }
    
    # --- Interpretation & Static Text ---
    INTERPRETATION = {
        "what_it_means": "This score estimates output reliability based on available observable signals, not ground-truth correctness.",
        "recommended_usage": "Use for triage: auto-approve high scores only if policy passes and structured output present.",
        "confidence_vs_uncertainty": "This is a heuristic confidence signal; it is not Bayesian uncertainty and does not guarantee factual correctness."
    }
    
    LIMITATIONS = [
        "Keyword-based risk/assumption detection is shallow and can be gamed.",
        "High confidence can still be wrong if the model hallucinates within a valid JSON schema.",
        "Retrieval boost assumes more sources implies better grounding; quality is not measured yet."
    ]
    
    IMPROVEMENT_ACTIONS = [
        "Increase grounding: require citations / retrieved_context present.",
        "Require schema validation for structured outputs.",
        "Add verifier model / consistency check for critical answers.",
        "Track retrieval quality (similarity thresholds, source trust)."
    ]

    # --- Calculation ---
    components_data = {}
    evidence_list = []
    
    # 1. Base Score
    score = 0.25
    components_data["base_score"] = {
        "value": 0.25,
        "fired": True, 
        "reason": "Base confidence for any completed run"
    }

    # 2. Error Check
    if status != "success":
        score = 0.0
        components_data["error_penalty"] = {
            "value": -1.0, 
            "fired": True, 
            "reason": "Run failed or timed out"
        }
        label = "low"
    else:
        # 3. Signals via Content Analysis
        
        # JSON Parsing (+0.30)
        if parse_success:
            score += 0.30
            components_data["json_parsed"] = {
                "value": 0.30, 
                "fired": True, 
                "reason": "Structured output (JSON) successfully parsed"
            }
            evidence_list.append({
                "component": "json_parsed",
                "artifact": "parsed_forecast.json",
                "path": "$",
                "excerpt": "(Valid JSON Object)",
                "note": "Valid JSON parsed from structured output"
            })
        else:
             components_data["json_parsed"] = {
                "value": 0.0, 
                "fired": False, 
                "reason": "No valid JSON structure found in output"
            }

        # Retrieval (+0.25 or +0.15)
        if retrieval_count >= 2:
            score += 0.25
            components_data["retrieval_boost"] = {
                "value": 0.25, 
                "fired": True, 
                "reason": f"High grounding: {retrieval_count} sources retrieved"
            }
            evidence_list.append({
                "component": "retrieval_boost",
                "artifact": "retrieved_sources.json",
                "path": "length",
                "excerpt": f"count={retrieval_count}",
                "note": "Multiple retrieved sources increased confidence"
            })
        elif retrieval_count >= 1:
            score += 0.15
            components_data["retrieval_boost"] = {
                "value": 0.15, 
                "fired": True, 
                "reason": f"Partial grounding: {retrieval_count} source retrieved"
            }
            evidence_list.append({
                "component": "retrieval_boost",
                "artifact": "retrieved_sources.json",
                "path": "length",
                "excerpt": f"count={retrieval_count}",
                "note": "Single source retrieval gave partial boost"
            })
        else:
            components_data["retrieval_boost"] = {
                "value": 0.0, 
                "fired": False, 
                "reason": "No context retrieved (zero-shot)"
            }

        # Keywords Analysis
        lower_text = response_text.lower()
        
        # Assumption
        if "assumption" in lower_text:
            score += 0.10
            components_data["assumption_check"] = {
                "value": 0.10, 
                "fired": True, 
                "reason": "Model explicitly checked/stated assumptions"
            }
            # Find excerpt
            idx = lower_text.find("assumption")
            start = max(0, idx - 20)
            end = min(len(response_text), idx + 50)
            excerpt = response_text[start:end].replace("\n", " ")
            evidence_list.append({
                "component": "assumption_check",
                "artifact": "llm_response.txt",
                "path": "text",
                "excerpt": f"...{excerpt}...",
                "note": "Detected keyword 'assumption'"
            })
        else:
            components_data["assumption_check"] = {
                "value": 0.0, 
                "fired": False, 
                "reason": "Model did not explicitly state assumptions"
            }

        # Risk
        if "risk" in lower_text:
            score += 0.10
            components_data["risk_analysis"] = {
                "value": 0.10, 
                "fired": True, 
                "reason": "Model performed risk analysis"
            }
             # Find excerpt
            idx = lower_text.find("risk")
            start = max(0, idx - 20)
            end = min(len(response_text), idx + 50)
            excerpt = response_text[start:end].replace("\n", " ")
            evidence_list.append({
                "component": "risk_analysis",
                "artifact": "llm_response.txt",
                "path": "text",
                "excerpt": f"...{excerpt}...",
                "note": "Detected keyword 'risk'"
            })
        else:
            components_data["risk_analysis"] = {
                "value": 0.0, 
                "fired": False, 
                "reason": "Model did not explicitly disable risk analysis"
            }
            
        label = "low"
        final_score = min(round(score, 2), 1.0)
        if final_score >= 0.8:
            label = "high"
        elif final_score >= 0.5:
            label = "medium"

    # --- Construct Final Object ---
    # Backward compat simple components dict
    simple_components = {k: v["value"] for k, v in components_data.items()}

    explanation = {
        "version": VERSION,
        "score": final_score if status == "success" else 0.0,
        "label": label,
        "formula": FORMULA,
        "weights": WEIGHTS,
        "components": components_data,
        "evidence": evidence_list,
        "interpretation": INTERPRETATION,
        "limitations": LIMITATIONS,
        "improvement_actions": IMPROVEMENT_ACTIONS
    }

    return {
        "score": final_score if status == "success" else 0.0,
        "label": label,
        "components": simple_components, 
        "explanation": explanation
    }
