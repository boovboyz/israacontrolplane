import time
from openai import AzureOpenAI

class AzureOpenAILLM:
    def __init__(self, endpoint: str, api_key: str, deployment: str, api_version: str):
        self.client = AzureOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            api_version=api_version,
        )
        self.deployment = deployment

    def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.2, max_tokens: int = 800, retries: int = 3) -> str:
        last_err = None
        for _ in range(retries):
            try:
                resp = self.client.chat.completions.create(
                    model=self.deployment,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return resp.choices[0].message.content or ""
            except Exception as e:
                last_err = e
                time.sleep(0.5)
        
        raise RuntimeError(f"AzureOpenAILLM failed after retries: {last_err}")
