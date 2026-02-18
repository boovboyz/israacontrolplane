from fastapi import APIRouter, HTTPException
from app.schemas import (
    ReplayRequest, ReplayResponse, 
    RunStagesResponse, RunStageArtifacts, 
    ReplayStagedRequest, ReplayStagedResponse
)
from app.mlflow_store import mlflow_store
import random
import time
import os
import sys
import json

# Ensure app is in path to import guardrails
# sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from app.guardrails_wrapper import validate_input, validate_output

router = APIRouter()

# ---------------- OLD REPLAY ENDPOINT (Keep for backward compat) ----------------

@router.post("", response_model=ReplayResponse)
def create_replay(request: ReplayRequest):
    from openai import OpenAI
    
    # --- Guardrails Input Check ---
    input_val = validate_input(request.prompt or "")
    if input_val.failed and input_val.metadata.get("guardrails_ai") == "failed":
        # Block the replay execution
        return ReplayResponse(
            new_run_id="blocked",
            latency_ms=0,
            cost_usd=0.0,
            confidence=0.0,
            output_text=f"Guardrails Violation: {input_val.failure_message}",
            view_run_url="#"
        )
    
    # Use validated text
    prompt = input_val.validated_text if input_val.validated_text else (request.prompt or "")

    # Try Real Replay if API Key is present
    api_key = os.getenv("OPENAI_API_KEY")
    output_text = ""
    latency = 0
    cost = 0.0
    confidence = 0.0
    
    if api_key and request.model not in ["mock-llm"]:
        try:
            client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1" if "grok" in request.model else None)
            start_time = time.time()
            
            # Simple system prompt for consistency
            messages = [
                {"role": "system", "content": "You are a helpful sales forecasting assistant."},
                {"role": "user", "content": prompt}
            ]
            
            completion = client.chat.completions.create(
                model=request.model,
                messages=messages,
                temperature=request.temperature
            )
            
            output_text = completion.choices[0].message.content
            latency = int((time.time() - start_time) * 1000)
            
            # Rough cost calc
            cost = 0.001 * (len(prompt) + len(output_text)) / 1000
            
            # Simple heuristic for confidence (same as Layer 1)
            confidence = 0.75 # Default for real run
            if "```json" in output_text:
                confidence += 0.15
            
        except Exception as e:
            output_text = f"Error calling Real LLM: {str(e)}"
            latency = 999
            
    else:
        # Fallback to Mock Logic if no key or mock-llm selected
        time.sleep(random.uniform(0.5, 1.5)) # Fake latency
        latency = random.randint(600, 2200)
        cost = round(random.uniform(0.001, 0.03), 4)
        confidence = round(random.uniform(0.4, 0.95), 2)
        
        output_text = (
            f"Based on the analysis of the sales pipeline for {request.model}, the outlook appears positive. "
            "Key indicators suggest a strong upward trend in Q3, driven primarily by enterprise deal closures. "
            "However, some risks remain in the SMB segment due to increased churn.\n\n"
            "Further examination of the data reveals that the 'Enterprise-A' campaign has yielded a 15% higher conversion rate "
            "compared to previous quarters. This suggests that the new messaging strategy is resonating well with decision-makers. "
            "We recommend doubling down on this approach for the remainder of the fiscal year.\n\n"
            "```json\n"
            "{\n"
            '  "forecast_adjustment": "+12%",\n'
            '  "primary_driver": "Enterprise Expansion",\n'
            '  "risk_factor": "SMB Churn"\n'
            "}\n"
            "```"
        )
        if request.prompt and "fail" in request.prompt.lower():
            output_text = "Analysis failed due to missing data."
            confidence = 0.1

    # --- Guardrails Output Check ---
    out_val = validate_output(output_text)
    
    # Use validated output (if we want to auto-fix output too)
    if out_val.validated_text:
         output_text = out_val.validated_text
         
    if out_val.failed:
        output_text += f"\n\n[GUARDRAILS WARNING]: {out_val.failure_message}"

    new_run_id = mlflow_store.log_replay_run(
        source_run_id=request.source_run_id,
        model=request.model,
        temperature=request.temperature,
        prompt=request.prompt,
        output_text=output_text,
        latency=latency,
        cost=cost,
        confidence=confidence
    )

    return ReplayResponse(
        new_run_id=new_run_id,
        latency_ms=latency,
        cost_usd=cost,
        confidence=confidence,
        output_text=output_text,
        view_run_url=f"/runs/{new_run_id}"
    )

# ---------------- NEW STAGE-BASED REPLAY ----------------

@router.get("/runs/{run_id}/stages", response_model=RunStagesResponse)
def get_run_stages(run_id: str):
    """
    Fetch all stage artifacts for a given run to populate the Replay Studio.
    """
    run = mlflow_store.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
        
    # Extract params to find initial inputs
    user_question = run.params.get("user_question", "")
    
    # Try to load artifacts
    retrieved_sources = mlflow_store.get_json_artifact(run_id, "retrieved_sources.json")
    kpi_summary = mlflow_store.get_json_artifact(run_id, "kpi_summary.json")
    prompt_packet = mlflow_store.get_text_artifact(run_id, "prompt_packet.txt")
    llm_response = mlflow_store.get_text_artifact(run_id, "llm_response.txt")
    parsed_forecast = mlflow_store.get_json_artifact(run_id, "parsed_forecast.json")
    parse_error = mlflow_store.get_json_artifact(run_id, "parse_error.json")
    
    # Retrieve temp/model from params
    model = run.params.get("model", "unknown")
    try:
        temp = float(run.params.get("temperature", 0.7))
    except (ValueError, TypeError):
        temp = 0.7

    return RunStagesResponse(
        run_id=run_id,
        model=model,
        temperature=temp,
        confidence=run.confidence,
        confidence_label=run.confidence_label,
        confidence_components=run.confidence_components,
        stages=RunStageArtifacts(
            user_question=user_question,
            retrieved_sources=retrieved_sources,
            kpi_summary=kpi_summary,
            prompt_packet=prompt_packet,
            llm_response=llm_response,
            parsed_forecast=parsed_forecast,
            parse_error=parse_error
        )
    )


@router.post("/staged", response_model=ReplayStagedResponse)
def create_staged_replay(req: ReplayStagedRequest):
    """
    Smart Replay:
    1. Load source stages
    2. Apply overrides
    3. Recompute downstream stages only if needed
    4. Log new run
    """
    # 1. Load Source Data
    source_stages_resp = get_run_stages(req.source_run_id)
    s = source_stages_resp.stages
    
    # 2. Prepare Working State (Mutable)
    current_stages = {
        "user_question": s.user_question,
        "retrieved_sources": s.retrieved_sources,
        "kpi_summary": s.kpi_summary,
        "prompt_packet": s.prompt_packet,
        "llm_response": s.llm_response,
        "parsed_forecast": s.parsed_forecast,
        "parse_error": s.parse_error
    }
    
    # 3. Apply Overrides
    if req.overrides.user_question is not None:
        current_stages["user_question"] = req.overrides.user_question
    if req.overrides.retrieved_sources is not None:
        current_stages["retrieved_sources"] = req.overrides.retrieved_sources
    if req.overrides.kpi_summary is not None:
        current_stages["kpi_summary"] = req.overrides.kpi_summary
    if req.overrides.prompt_packet is not None:
        current_stages["prompt_packet"] = req.overrides.prompt_packet
    if req.overrides.llm_response is not None:
        current_stages["llm_response"] = req.overrides.llm_response

    # 4. Conditional Recomputation
    
    # --- Guardrails: Check Prompt Input ---
    # Only if we are generating response (Stage <= 3)
    if req.replay_from_stage <= 3:
        prompt_to_check = current_stages["prompt_packet"] or ""
        val_res = validate_input(prompt_to_check)
        if val_res.failed and val_res.metadata.get("guardrails_ai") == "failed":
             return ReplayStagedResponse(
                new_run_id="blocked",
                output_text=f"Guardrails Block: {val_res.failure_message}",
                parsed_forecast=None,
                metrics={"blocked": 1}
            )
        # Identify fixed text
        if val_res.validated_text:
             current_stages["prompt_packet"] = val_res.validated_text

    # --- Stage 1: Retrieval ---
    if req.replay_from_stage <= 1 and req.options.recompute_retrieval:
        pass 

    # --- Stage 2: KPI ---
    if req.replay_from_stage <= 2 and req.options.recompute_kpi:
        pass

    # --- Stage 3: Prompt Assembly ---
    # Assuming prompt_packet in current_stages is final
    
    # --- Stage 4: LLM Call ---
    api_key = os.getenv("OPENAI_API_KEY")
    latency = 0.0
    cost = 0.0
    
    if req.replay_from_stage <= 3:
        # We need to call the LLM
        prompt_to_send = current_stages["prompt_packet"] or ""
        
        if api_key and req.model != "mock-llm":
            try:
                from openai import OpenAI
                client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1" if "grok" in req.model else None)
                start_time = time.time()
                
                messages = [
                    {"role": "system", "content": "You are a helpful sales forecasting assistant."},
                    {"role": "user", "content": prompt_to_send}
                ]
                
                completion = client.chat.completions.create(
                    model=req.model,
                    messages=messages,
                    temperature=req.temperature
                )
                
                output_text = completion.choices[0].message.content
                latency = int((time.time() - start_time) * 1000)
                cost = 0.001 * (len(prompt_to_send) + len(output_text)) / 1000
                
                current_stages["llm_response"] = output_text
                
            except Exception as e:
                current_stages["llm_response"] = f"Error calling LLM: {e}"
                current_stages["parse_error"] = {"error": str(e)}
        else:
            # Mock
            time.sleep(random.uniform(0.5, 1.0))
            latency = random.randint(100, 800)
            cost = 0.002
            # Generate a consistent mock response based on prompt hash or random
            current_stages["llm_response"] = (
                "Based on the new inputs, the forecast remains strong. "
                "Enterprise deals are accelerating.\n"
                "```json\n"
                "{\n"
                '  "forecast_adjustment": "+15%",\n'
                '  "primary_driver": "Replay Success",\n'
                '  "risk_factor": "None"\n'
                "}\n"
                "```"
            )
            
        # --- Guardrails: Check Output ---
        out_val = validate_output(current_stages["llm_response"] or "")
        
        # Use validated output
        if out_val.validated_text:
             current_stages["llm_response"] = out_val.validated_text
             
        if out_val.failed:
             current_stages["llm_response"] += f"\n[GUARDRAILS WARNING]: {out_val.failure_message}"

    # --- Stage 5: Parse ---
    import re
    response_text = current_stages.get("llm_response", "")
    parsed_json = None
    parse_err = None
    parse_success = 0
    
    try:
        pattern = r"```json\s*([\s\S]*?)\s*```"
        match = re.search(pattern, response_text)
        if match:
            parsed_json = json.loads(match.group(1))
            parse_success = 1.0
            if not isinstance(parsed_json, list):
                if isinstance(parsed_json, dict):
                    parsed_json = [parsed_json]
        else:
            try:
                parsed_json = json.loads(response_text)
                parse_success = 1.0
                if isinstance(parsed_json, dict):
                    parsed_json = [parsed_json]
            except:
                pass
    except Exception as e:
        parse_err = {"error": str(e)}
        
    current_stages["parsed_forecast"] = parsed_json
    current_stages["parse_error"] = parse_err
    
    # 5. Calculate Confidence Heuristic
    heuristic = 0.0
    if parse_success == 1.0:
        heuristic += 0.35
        
    retrieval_count = 0
    if current_stages["retrieved_sources"]:
        retrieval_count = len(current_stages["retrieved_sources"])
    if retrieval_count >= 3:
        heuristic += 0.20
        
    r_lower = response_text.lower()
    if "assumption" in r_lower:
        heuristic += 0.15
    if "risk" in r_lower:
        heuristic += 0.15
    if "- " in response_text or "* " in response_text: # simple bullet check
        heuristic += 0.15
        
    heuristic = min(1.0, heuristic)

    # 6. Log Run
    metrics = {
        "latency_ms": float(latency),
        "cost_usd": cost,
        "confidence": heuristic,
        "parse_success": float(parse_success),
        "retrieval_count": float(retrieval_count),
        "prompt_length_chars": float(len(current_stages.get("prompt_packet") or "")),
    }
    
    params = {
        "model": req.model,
        "temperature": req.temperature,
        "user_question": current_stages.get("user_question", "")[:450], # truncate
    }
    
    tags = {
        "replay_from_stage": str(req.replay_from_stage),
        "recompute_retrieval": str(req.options.recompute_retrieval),
        "recompute_kpi": str(req.options.recompute_kpi),
    }

    new_run_id = mlflow_store.log_staged_run(
        source_run_id=req.source_run_id,
        replay_from_stage=req.replay_from_stage,
        stages=current_stages,
        params=params,
        metrics=metrics,
        tags=tags
    )

    return ReplayStagedResponse(
        new_run_id=new_run_id,
        output_text=response_text,
        parsed_forecast=parsed_json,
        metrics=metrics
    )
