from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os
import sys

# Ensure app is in path
# sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

from app.guardrails_wrapper import get_guardrails_wrapper

router = APIRouter()

class Policy(BaseModel):
    id: str
    name: str
    description: str
    type: str 
    status: str 
    violations_24h: int
    pattern: Optional[str] = None 

class ValidateRequest(BaseModel):
    text: str
    source: str = "user" 

class ValidateResponse(BaseModel):
    blocked: bool
    violated_policy_id: Optional[str] = None
    reason: Optional[str] = None
    validated_text: Optional[str] = None

@router.get("/policies", response_model=List[Policy])
def get_policies():
    wrapper = get_guardrails_wrapper()
    return wrapper.get_policies()

@router.post("/validate", response_model=ValidateResponse)
def validate_content(req: ValidateRequest):
    wrapper = get_guardrails_wrapper()
    
    if req.source == "user":
        result = wrapper.validate_input(req.text)
    else:
        result = wrapper.validate_output(req.text)
        
    if result.passed:
        return ValidateResponse(
            blocked=False,
            validated_text=result.validated_text
        )
    else:
        # Determine main violation
        main_fail = result.failures[0] if result.failures else "unknown"
        return ValidateResponse(
            blocked=True,
            violated_policy_id=main_fail,
            reason=result.failure_message,
            validated_text=result.validated_text
        )
