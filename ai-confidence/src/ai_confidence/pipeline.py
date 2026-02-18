from .llm_client_azure import AzureOpenAILLM
from .judge_azure import AzureOpenAIJudge
from .models import RetrievedChunk, LLMCall, RunContext
from .scorer import compute_confidence

def run_prompt(run_id: str, system_prompt: str, user_prompt: str, azure_cfg: dict):
    # 1. Initialize logic
    llm = AzureOpenAILLM(**azure_cfg)
    judge = AzureOpenAIJudge(**azure_cfg)
    
    # 2. Get LLM Output
    output = llm.generate(system_prompt, user_prompt)
    
    # 3. Mock Retrieval (placeholders for now)
    chunks = [
        RetrievedChunk(source_id="demo", chunk_id="0", text="(no retrieval context in this demo)", similarity=1.0)
    ]
    
    # 4. Compute Confidence
    call = LLMCall(
        model=azure_cfg["deployment"],
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        contexts=chunks,
        output_text=output,
    )
    
    run = RunContext(run_id=run_id, step_id="step_llm_01", template="generic", environment="local")
    
    report = compute_confidence(run, call, judge)
    return output, report
