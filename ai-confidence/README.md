# ai-confidence

Minimal, runnable confidence scoring demo on Azure OpenAI.

## Run

```bash
python -m venv .venv
source .venv/bin/activate
pip install -e .

# Set your Azure OpenAI environment variables
export AZURE_OPENAI_ENDPOINT="https://<your>.openai.azure.com"
export AZURE_OPENAI_KEY="***"
export AZURE_OPENAI_DEPLOYMENT="<your-deployment-name>"
export AZURE_OPENAI_API_VERSION="2024-02-01"

python run_prompt.py
```
