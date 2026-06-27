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
    naive_cost: float       # what this call would have cost at Tier 3 pricing
    saved: float            # naive_cost - call_cost for this call
    session_saved: float    # cumulative savings for this session
    budget_remaining: float
    budget_state: str
    injection_blocked: bool = False
    cache_hit: bool = False


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
