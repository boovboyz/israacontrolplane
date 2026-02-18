
import os
import sys
import mlflow
from app.llm import ContentGenerator

# Ensure we can import app modules
sys.path.append(os.getcwd())

def test_mlflow_logging():
    print("Initializing ContentGenerator...")
    gen = ContentGenerator()
    
    packet = "Test prompt packet content."
    retrieval_context = [{"source": "test_doc.md", "content": "test snippet", "score": 0.9}]
    
    print("Calling generate_response...")
    response, run_id = gen.generate_response(
        packet=packet,
        retrieval_context=retrieval_context,
        model="grok-4-fast",
        user_question="Test question?",
        top_k=2,
        chunk_size=500
    )
    
    print(f"Response: {response}")
    print(f"Run ID: {run_id}")
    
    if not run_id:
        print("FAILED: No run_id returned.")
        return

    print("Verifying MLflow run...")
    client = mlflow.tracking.MlflowClient()
    run = client.get_run(run_id)
    
    params = run.data.params
    metrics = run.data.metrics
    artifacts = client.list_artifacts(run_id)
    artifact_names = [a.path for a in artifacts]
    
    print(f"Params: {params}")
    print(f"Metrics: {metrics}")
    print(f"Artifacts: {artifact_names}")
    
    expected_params = ["model", "user_question", "top_k", "chunk_size", "prompt_length_chars"]
    for p in expected_params:
        if p not in params:
            print(f"MISSING PARAM: {p}")
            
    expected_artifacts = ["prompt_packet.txt", "retrieved_sources.json", "llm_response.txt"]
    for a in expected_artifacts:
        if a not in artifact_names:
            print(f"MISSING ARTIFACT: {a}")
            
    if "error.txt" in artifact_names:
        print("Run logged an ERROR (Acceptable if API key invalid, but check content).")
        
    print("Test Complete.")

if __name__ == "__main__":
    test_mlflow_logging()
