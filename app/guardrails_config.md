# Guardrails AI Configuration Example (RAIL Format)

This file demonstrates how to configure Guardrails AI validators using RAIL (Reliable AI Markup Language).

## Example RAIL Configuration

```xml
<rail version="0.1">
<output>
    <string
        name="sales_forecast" 
        description="Sales forecast response"
        validators="valid-length: 10 5000; toxic-language: 0.7"
        on-fail-valid-length="reask"
        on-fail-toxic-language="exception"
    />
</output>

<prompt>
Generate a sales forecast based on the following data:

{{user_query}}

@xml_prefix_prompt
</prompt>
</rail>
```

## Production Setup

For production use, install validators from Guardrails Hub:

```bash
# Configure Guardrails CLI (requires API key from https://hub.guardrailsai.com/keys)
guardrails configure

# Install validators
guardrails hub install hub://guardrails/detect_pii
guardrails hub install hub://guardrails/toxic_language
guardrails hub install hub://guardrails/valid_length
```

## Python Code Example

```python
from guardrails import Guard
from guardrails.hub import DetectPII, ToxicLanguage

# Create guard with validators
guard = Guard().use_many(
    DetectPII(pii_entities=["EMAIL_ADDRESS", "PHONE_NUMBER", "SSN"]),
    ToxicLanguage(threshold=0.5, validation_method="sentence")
)

# Validate input
result = guard.validate("Your input text here")
if result.validation_passed:
    print("Input is safe")
else:
    print(f"Validation failed: {result.validation_summaries}")
```

## Current Implementation

The current implementation in `app/guardrails_wrapper.py` uses a basic Guard without validators to demonstrate the integration pattern. This avoids authentication requirements while showing how to:

1. Wrap validation logic in a clean interface
2. Return structured ValidationResult objects
3. Log validation metadata to MLflow
4. Fallback gracefully to regex-based validation

To enable full validation:
1. Run `guardrails configure` with your API key
2. Install the desired validators from the Hub
3. Update `GuardrailsWrapper.__init__()` to use installed validators
