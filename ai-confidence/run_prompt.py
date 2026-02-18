import os
import uuid
from ai_confidence.pipeline import run_prompt

def require_env(name: str) -> str:
    v = os.getenv(name)
    if not v:
        raise RuntimeError(f"Missing environment variable: {name}")
    return v

# Try to load .env if available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

AZURE_CFG = {
    "endpoint": os.getenv("AZURE_OPENAI_ENDPOINT", ""),
    "api_key": os.getenv("AZURE_OPENAI_KEY", ""),
    "deployment": os.getenv("AZURE_OPENAI_DEPLOYMENT", ""),
    "api_version": os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01"),
}

if __name__ == "__main__":
    if not AZURE_CFG["endpoint"] or not AZURE_CFG["api_key"] or not AZURE_CFG["deployment"]:
        print("ERROR: Missing Azure OpenAI environment variables.")
        print("Please export AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_KEY, AZURE_OPENAI_DEPLOYMENT")
        exit(1)

    print(f"Using Deployment: {AZURE_CFG['deployment']}")
    prompt = input("Enter Prompt: ").strip()
    if not prompt: 
        print("Empty prompt. Exiting.")
        exit(0)
        
    run_id = str(uuid.uuid4())
    print(f"\nRunning confidence pipeline [Run ID: {run_id}]...")
    
    try:
        output, conf = run_prompt(
            run_id=run_id,
            system_prompt="You are a helpful assistant.",
            user_prompt=prompt,
            azure_cfg=AZURE_CFG,
        )
        print("\n--- OUTPUT -----------------------")
        print(output)
        print("\n--- CONFIDENCE REPORT ------------")
        print(f"Score: {conf.overall_confidence}/100")
        print(f"Rating: {conf.routing.upper()}")
        print(f"Gates Triggered: {conf.gates_triggered}")
        print("----------------------------------")
    except Exception as e:
        print(f"\nError: {e}")
