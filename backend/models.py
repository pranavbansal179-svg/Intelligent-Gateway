from pydantic import BaseModel
from typing import Optional


class ChatRequest(BaseModel):
    message: str
    session_id: str


class ChatResponse(BaseModel):
    answer: str
    model: str
    routing_reason: str
    call_cost: float
    budget_remaining: float
    budget_state: str
    injection_blocked: bool = False


class ClassifyResponse(BaseModel):
    tier: int
    reason: str
    model: str


class BudgetStatusResponse(BaseModel):
    session_id: str
    spent: float
    remaining: float
    state: str
    formatted: str


class ErrorResponse(BaseModel):
    error: str
    message: str
