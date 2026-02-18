import mlflow
import random
import time
from datetime import datetime, timedelta
import os

# Connect to the same tracking URI as the backend
os.environ["MLFLOW_TRACKING_URI"] = "file:../../mlruns"
os.environ["MLFLOW_EXPERIMENT_NAME"] = "sales-predictor-layer2"

mlflow.set_tracking_uri(os.environ["MLFLOW_TRACKING_URI"])
experiment_name = os.environ["MLFLOW_EXPERIMENT_NAME"]
experiment = mlflow.get_experiment_by_name(experiment_name)
if not experiment:
    mlflow.create_experiment(experiment_name)
mlflow.set_experiment(experiment_name)

models = ["gpt-4-turbo", "gpt-4.1-mini", "claude-3-opus", "gpt-3.5-turbo"]
statuses = ["FINISHED", "FAILED", "RUNNING"]

def generate_runs(n=20):
    print(f"Generating {n} runs in experiment '{experiment_name}'...")
    
    for i in range(n):
        model = random.choice(models)
        status = random.choice(statuses) if i > 5 else "FINISHED" # Mostly finished
        
        start_time = int(time.time() * 1000) - random.randint(0, 86400 * 1000 * 7) # past 7 days
        
        with mlflow.start_run(run_name=f"run-{i}") as run:
            # Params
            mlflow.log_param("model", model)
            mlflow.log_param("temperature", random.choice([0.0, 0.7, 1.0]))
            mlflow.log_param("max_tokens", random.choice([512, 1024, 4096]))
            
            # Metrics
            latency = random.randint(200, 3000)
            cost = random.uniform(0.005, 0.15)
            confidence = random.uniform(0.6, 0.99)
            
            mlflow.log_metric("latency_ms", latency)
            mlflow.log_metric("cost_usd", cost)
            mlflow.log_metric("confidence", confidence)
            
            # Tags
            mlflow.set_tag("environment", "production" if random.random() > 0.2 else "staging")
            mlflow.set_tag("user", f"user-{random.randint(1, 5)}")
            
            # Artifacts
            with open("prompt.txt", "w") as f:
                f.write(f"Sample prompt for run {i}... Analyze sales data for region North.")
            mlflow.log_artifact("prompt.txt")
            
            with open("response.json", "w") as f:
                f.write(f'{{"text": "Sales analysis result...", "confidence": {confidence}}}')
            mlflow.log_artifact("response.json")
            
            # Fake status by manipulating end time if needed, but MLflow client usually sets status based on exit
            # If we want a failed run, we can raise exception or set status explicitly
            # But the context manager handles 'FINISHED' (success) or 'FAILED' (exception).
            # To simulate custom status logging, we might need low-level client or just let it finish.
            # But let's just let them be FINISHED for now, maybe force one fail.
            
    # Manually create a failed run
    try:
        with mlflow.start_run(run_name="failed-run"):
            mlflow.log_param("model", "gpt-4")
            raise Exception("Something went wrong")
    except:
        pass # It will be logged as FAILED

    print("Done generating runs.")
    
    # Cleanup local files
    if os.path.exists("prompt.txt"): os.remove("prompt.txt")
    if os.path.exists("response.json"): os.remove("response.json")

if __name__ == "__main__":
    generate_runs()
