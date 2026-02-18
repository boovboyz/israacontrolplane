from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional
from app.schemas import Prompt, CreatePromptRequest, CreateVersionRequest, RenderPromptRequest
from app.services.prompts import prompts_service

router = APIRouter()

@router.get("", response_model=List[Prompt])
def list_prompts():
    return prompts_service.list_prompts()

@router.get("/{slug}", response_model=Prompt)
def get_prompt(slug: str):
    prompt = prompts_service.get_prompt(slug)
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    return prompt

@router.post("", response_model=Prompt)
def create_prompt(req: CreatePromptRequest):
    try:
        return prompts_service.create_prompt(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/{slug}/versions", response_model=Prompt)
def create_version(slug: str, req: CreateVersionRequest):
    try:
        return prompts_service.create_version(slug, req)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/render", response_model=str)
def render_template(req: RenderPromptRequest):
    return prompts_service.render_prompt(req.template, req.variables)
