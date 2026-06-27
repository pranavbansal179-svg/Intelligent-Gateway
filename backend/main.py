import logging
import os
import time
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()

from .budget import BudgetExhaustedError, BudgetManager, BudgetState
from .classifier import PromptClassifier
from .guardrail import REFUSAL_MESSAGE, GuardrailFilter
from .models import (
    BudgetStatusResponse,
    ChatRequest,
    ChatResponse,
    ClassifyResponse,
    ErrorResponse,
)
from .otari_client import OtariClient
from .prompt_optimizer import optimize_prompt
from .semantic_cache import SemanticCache
from .stock import fetch_price_context

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(name)s | %(message)s")
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# App + CORS
# ---------------------------------------------------------------------------
app = FastAPI(title="Otari Finance Assistant", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Singletons
# ---------------------------------------------------------------------------
client = OtariClient()
classifier = PromptClassifier()
budget_manager = BudgetManager()
guardrail = GuardrailFilter()
semantic_cache = SemanticCache()

# ---------------------------------------------------------------------------
# Local cost tracking — accumulated per session from token counts in responses.
# We do NOT rely on client.get_usage() because the Otari usage endpoint is
# unreliable; instead we calculate cost from prompt/completion tokens returned
# by each chat completion.
#
# Pricing ($/1M tokens) sourced from Otari managed-inference catalog:
#   input price is listed; output is typically 3× input for these models.
# ---------------------------------------------------------------------------
_MODEL_PRICING: dict[str, tuple[float, float]] = {
    # model_id: (input_$/1M, output_$/1M)
    "mzai:Qwen/Qwen3-30B-A3B-Instruct-2507":  (0.10, 0.30),
    "mzai:meta-llama/Llama-3.3-70B-Instruct": (0.13, 0.40),
    "mzai:NousResearch/Hermes-4-70B":          (0.13, 0.40),
}
_DEFAULT_PRICING = (0.13, 0.40)  # fallback for unknown models

_session_spend: dict[str, float] = {}        # session_id → cumulative actual $ spent
_session_naive_spend: dict[str, float] = {}  # session_id → cumulative naive $ (always Tier 3)
_session_history: dict[str, list[dict]] = {} # session_id → conversation history

# Tier 3 pricing is the "naive" baseline — what you'd pay without smart routing
_NAIVE_PRICING = _MODEL_PRICING["mzai:NousResearch/Hermes-4-70B"]  # (0.13, 0.40)

# ---------------------------------------------------------------------------
# Dev-only: in-memory budget override (for demo/testing)
# ---------------------------------------------------------------------------
_dev_budget_override: dict[str, float] = {}  # session_id → simulated spent


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _extract_answer(response: dict) -> str:
    """Pull the assistant content from an OpenAI-compatible chat response."""
    try:
        return response["choices"][0]["message"]["content"]
    except (KeyError, IndexError):
        return str(response)


_SYSTEM_BASE = (
    "You are Otari, an expert finance assistant. You answer ALL finance-related questions directly and helpfully — "
    "including stock recommendations, investment strategies, portfolio advice, and market analysis. "
    "Never refuse a finance question or deflect to 'consult a financial advisor' — give your best, specific answer. "
    "If the user asks which stocks to buy, recommend specific tickers with reasoning. "
    "If the user asks about crypto, real estate, or any asset class, answer directly. "
    "You may add a brief risk disclaimer at the end, but always answer first."
)

SYSTEM_PROMPTS = {
    1: (
        f"{_SYSTEM_BASE} "
        "Give a short, direct answer in 2-3 sentences. Be concise."
    ),
    2: (
        f"{_SYSTEM_BASE} "
        "Give a clear, well-reasoned answer covering the key trade-offs. Keep it to 1-2 paragraphs."
    ),
    3: (
        f"{_SYSTEM_BASE} "
        "This is a complex or multi-part question. When creating a financial or investing plan, ALWAYS "
        "structure your response as:\n\n"
        "## Your Personalised Financial Plan\n"
        "### 1. Situation Summary\n"
        "### 2. Priority Order (with reasoning)\n"
        "### 3. Phase-by-Phase Action Plan\n"
        "### 4. Asset Allocation Recommendation\n"
        "### 5. Specific Stock / Fund Picks (with reasoning)\n"
        "### 6. Key Risks & Mitigations\n"
        "### 7. Next Steps\n\n"
        "Be specific with numbers, percentages, tickers, and timelines. "
        "If critical details are missing, ask one clarifying question first."
    ),
}

def _build_system_messages(tier: int = 1) -> list[dict]:
    return [{"role": "system", "content": SYSTEM_PROMPTS.get(tier, SYSTEM_PROMPTS[1])}]


def _get_spent(session_id: str) -> float:
    """Return current spend, respecting dev overrides."""
    if session_id in _dev_budget_override:
        return _dev_budget_override[session_id]
    return _session_spend.get(session_id, 0.0)


def _estimate_tokens(text: str) -> int:
    """
    Rough token estimate when the provider omits usage data.
    ~4 characters per token is the standard heuristic for English text.
    """
    return max(1, round(len(text or "") / 4))


def _record_call_cost(
    session_id: str,
    model: str,
    response: dict,
    sent_messages: list[dict] | None = None,
    answer: str | None = None,
) -> tuple[float, float]:
    """
    Extract token counts, calculate actual cost and naive (Tier 3) cost.
    Returns (call_cost, naive_cost).

    Otari's usage reporting is unreliable — some models (e.g. Hermes-4-70B)
    return zero tokens. When that happens we fall back to estimating tokens
    from the actual prompt and completion text so cost is never bogusly $0.
    """
    usage = response.get("usage") or {}
    prompt_tokens = usage.get("prompt_tokens", 0) or 0
    completion_tokens = usage.get("completion_tokens", 0) or 0

    estimated = False
    if prompt_tokens == 0 and sent_messages:
        prompt_tokens = sum(_estimate_tokens(m.get("content", "")) for m in sent_messages)
        estimated = True
    if completion_tokens == 0 and answer:
        completion_tokens = _estimate_tokens(answer)
        estimated = True

    input_price, output_price = _MODEL_PRICING.get(model, _DEFAULT_PRICING)
    call_cost = (prompt_tokens * input_price + completion_tokens * output_price) / 1_000_000

    naive_in, naive_out = _NAIVE_PRICING
    naive_cost = (prompt_tokens * naive_in + completion_tokens * naive_out) / 1_000_000

    _session_spend[session_id] = _session_spend.get(session_id, 0.0) + call_cost
    _session_naive_spend[session_id] = _session_naive_spend.get(session_id, 0.0) + naive_cost

    logger.info(
        "COST | session=%s | model=%s | prompt=%d tok | completion=%d tok%s | "
        "actual=$%.6f | naive=$%.6f | saved=$%.6f | session_total=$%.4f",
        session_id, model, prompt_tokens, completion_tokens,
        " (estimated)" if estimated else "",
        call_cost, naive_cost, naive_cost - call_cost, _session_spend[session_id],
    )
    return call_cost, naive_cost


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    return {"status": "ok", "service": "otari-finance-assistant"}


@app.get("/classify")
async def classify_prompt(prompt: str) -> ClassifyResponse:
    """
    Demo endpoint — classify a prompt without spending any budget.
    Usage: GET /classify?prompt=What+is+a+Roth+IRA
    """
    result = classifier.classify(prompt)
    return ClassifyResponse(**result)


@app.get("/budget/{session_id}", response_model=BudgetStatusResponse)
async def get_budget(session_id: str):
    spent = _get_spent(session_id)
    state = budget_manager.get_state(spent)
    return BudgetStatusResponse(
        session_id=session_id,
        spent=spent,
        remaining=budget_manager.get_remaining(spent),
        state=state.value,
        formatted=budget_manager.format_remaining(spent),
    )


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    started = time.perf_counter()
    message = request.message.strip()
    session_id = request.session_id

    def _elapsed_ms() -> int:
        return max(1, round((time.perf_counter() - started) * 1000))

    # ------------------------------------------------------------------
    # 1. Guardrail — free regex pass (no API cost, instant)
    # ------------------------------------------------------------------
    is_safe, matched_pattern = guardrail.quick_check(message)
    if not is_safe:
        logger.info("BLOCKED by quick_check | session=%s | pattern=%s", session_id, matched_pattern)
        spent = _get_spent(session_id)
        return ChatResponse(
            answer=REFUSAL_MESSAGE,
            model="none",
            routing_reason="injection_detected_by_regex",
            call_cost=0.0,
            naive_cost=0.0,
            saved=0.0,
            session_saved=max(0.0, _session_naive_spend.get(session_id, 0.0) - _get_spent(session_id)),
            budget_remaining=budget_manager.get_remaining(spent),
            budget_state=budget_manager.get_state(spent).value,
            injection_blocked=True,
            latency_ms=_elapsed_ms(),
        )

    # ------------------------------------------------------------------
    # 2. Semantic cache lookup — free, instant, $0 cost
    # ------------------------------------------------------------------
    cached = semantic_cache.lookup(message)
    if cached:
        spent = _get_spent(session_id)
        latency = _elapsed_ms()
        logger.info(
            "CACHE HIT | session=%s | %dms | similarity match for: %.60s",
            session_id, latency, message,
        )
        return ChatResponse(
            answer=cached["answer"],
            model=cached["model"],
            routing_reason=cached["routing_reason"],
            call_cost=0.0,
            naive_cost=0.0,
            saved=0.0,
            session_saved=max(0.0, _session_naive_spend.get(session_id, 0.0) - _get_spent(session_id)),
            budget_remaining=budget_manager.get_remaining(spent),
            budget_state=budget_manager.get_state(spent).value,
            injection_blocked=False,
            latency_ms=latency,
            cache_hit=True,
        )

    # ------------------------------------------------------------------
    # 3. Classify prompt
    # ------------------------------------------------------------------
    classification = classifier.classify(message)
    requested_tier = classification["tier"]
    model = classification["model"]
    routing_reason = classification["reason"]
    logger.info(
        "CLASSIFY | session=%s | tier=%d | model=%s | reason=%s",
        session_id, requested_tier, model, routing_reason,
    )

    # ------------------------------------------------------------------
    # 4. Budget check — pre-call spend
    # ------------------------------------------------------------------

    pre_spend = _get_spent(session_id)
    state = budget_manager.get_state(pre_spend)

    try:
        actual_tier, downgrade_reason = budget_manager.enforce_tier(requested_tier, state)
    except BudgetExhaustedError as exc:
        raise HTTPException(
            status_code=402,
            detail={"error": "budget_exhausted", "message": exc.message},
        )

    if downgrade_reason:
        routing_reason = f"{routing_reason} | {downgrade_reason}"
        from .classifier import MODEL_TIER1, MODEL_TIER2, MODEL_TIER3
        model = {1: MODEL_TIER1, 2: MODEL_TIER2, 3: MODEL_TIER3}[actual_tier]
        logger.info("BUDGET DOWNGRADE | session=%s | %s", session_id, downgrade_reason)

    # ------------------------------------------------------------------
    # 5. Prompt optimization — use Tier 1 to compress verbose Tier 2/3 prompts
    #    before sending to the (more expensive) target model.
    # ------------------------------------------------------------------
    opt = await optimize_prompt(message, actual_tier, client)
    effective_message = opt["optimized"]

    # ------------------------------------------------------------------
    # 6. Model call
    #    If the user is asking about a stock price, prepend live market data
    #    so the LLM answers with real numbers instead of stale training data.
    #    Full conversation history is passed so the model has context.
    # ------------------------------------------------------------------
    stock_context = fetch_price_context(effective_message)
    user_content = f"{stock_context}\n\nUser question: {effective_message}" if stock_context else effective_message

    # Retrieve and update conversation history for this session
    history = _session_history.setdefault(session_id, [])
    history.append({"role": "user", "content": user_content})

    # Keep last 20 turns (10 exchanges) to stay within context limits
    trimmed_history = history[-20:]

    messages = _build_system_messages(actual_tier) + trimmed_history
    max_tokens = 2048 if actual_tier == 3 else 1024
    try:
        raw_response = await client.chat(
            model=model,
            messages=messages,
            guardrail_profile=None,
            max_tokens=max_tokens,
        )
    except Exception as exc:
        # Surface the real Otari error to the client for easier debugging
        logger.error("Otari API call failed | session=%s | model=%s | error=%s", session_id, model, exc)
        # Remove the failed user message from history so it doesn't corrupt context
        history.pop()
        raise HTTPException(status_code=502, detail={"error": "otari_api_error", "message": str(exc)})

    answer = _extract_answer(raw_response)

    # Append assistant reply to history
    history.append({"role": "assistant", "content": answer})

    # ------------------------------------------------------------------
    # 6. Record cost and populate semantic cache for future lookups
    # ------------------------------------------------------------------
    call_cost, naive_cost = _record_call_cost(
        session_id, model, raw_response, sent_messages=messages, answer=answer
    )
    semantic_cache.store(
        query=message,
        answer=answer,
        model=model,
        routing_reason=routing_reason,
        call_cost=call_cost,
        naive_cost=naive_cost,
    )
    post_spend = _get_spent(session_id)
    remaining = budget_manager.get_remaining(post_spend)
    final_state = budget_manager.get_state(post_spend)
    session_saved = _session_naive_spend.get(session_id, 0.0) - post_spend

    latency = _elapsed_ms()
    logger.info(
        "CALL COMPLETE | session=%s | model=%s | %dms | cost=$%.6f | remaining=$%.4f | state=%s | session_saved=$%.6f",
        session_id, model, latency, call_cost, remaining, final_state.value, session_saved,
    )

    return ChatResponse(
        answer=answer,
        model=model,
        routing_reason=routing_reason,
        call_cost=call_cost,
        naive_cost=naive_cost,
        saved=max(0.0, naive_cost - call_cost),
        session_saved=max(0.0, session_saved),
        budget_remaining=remaining,
        budget_state=final_state.value,
        injection_blocked=False,
        was_optimized=opt["was_optimized"],
        original_tokens=opt["original_tokens"],
        optimized_tokens=opt["optimized_tokens"],
        latency_ms=latency,
    )


# ---------------------------------------------------------------------------
# Dev-only endpoints (only active in non-production)
# ---------------------------------------------------------------------------
if os.getenv("ENVIRONMENT", "dev").lower() != "production":

    @app.post("/dev/set-budget-state")
    async def dev_set_budget_state(body: dict[str, Any]):
        """
        Simulate budget spend for demo purposes.
        Body: { "session_id": "...", "spent": 1.95 }
        """
        session_id = body.get("session_id", "dev")
        spent = float(body.get("spent", 0.0))
        _dev_budget_override[session_id] = spent
        state = budget_manager.get_state(spent)
        return {
            "session_id": session_id,
            "simulated_spent": spent,
            "state": state.value,
            "formatted": budget_manager.format_remaining(spent),
        }

    @app.delete("/dev/set-budget-state/{session_id}")
    async def dev_clear_budget_override(session_id: str):
        _dev_budget_override.pop(session_id, None)
        return {"cleared": session_id}

    @app.delete("/dev/history/{session_id}")
    async def dev_clear_history(session_id: str):
        _session_history.pop(session_id, None)
        return {"cleared": session_id}

    @app.get("/dev/cache")
    async def dev_cache_stats():
        entries = [
            {"query": e["query"], "model": e["model"], "ts": e["ts"]}
            for e in semantic_cache._entries
        ]
        return {"size": semantic_cache.size, "threshold": semantic_cache._threshold, "entries": entries}
