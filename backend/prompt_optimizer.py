import logging

logger = logging.getLogger(__name__)

_MIN_WORDS_TO_OPTIMIZE = 12  # don't bother compressing short prompts

_OPTIMIZER_SYSTEM = (
    "You are a prompt optimizer for a finance AI assistant. "
    "Rewrite the user's message as a concise, direct query that preserves ALL key information, "
    "numbers, names, and intent. Remove only filler words, pleasantries, and redundancy. "
    "Output ONLY the rewritten query — no explanation, no quotes, no prefix."
)


def _word_count(text: str) -> int:
    return len(text.split())


def _estimate_tokens(text: str) -> int:
    """Rough token estimate: words × 1.3 (good enough for display)."""
    return round(_word_count(text) * 1.3)


async def optimize_prompt(message: str, tier: int, client) -> dict:
    """
    For Tier 2/3 verbose prompts: use Tier 1 model to compress the message
    before it hits the more expensive model. Returns a dict with:
      - optimized: str  (compressed prompt, or original if skipped)
      - was_optimized: bool
      - original_tokens: int
      - optimized_tokens: int
    """
    from .classifier import MODEL_TIER1

    original_tokens = _estimate_tokens(message)

    # Skip optimization for Tier 1 (already cheap) or short prompts
    if tier == 1 or _word_count(message) < _MIN_WORDS_TO_OPTIMIZE:
        return {
            "optimized": message,
            "was_optimized": False,
            "original_tokens": original_tokens,
            "optimized_tokens": original_tokens,
        }

    try:
        response = await client.chat(
            model=MODEL_TIER1,
            messages=[
                {"role": "system", "content": _OPTIMIZER_SYSTEM},
                {"role": "user", "content": message},
            ],
            max_tokens=256,
        )
        compressed = response["choices"][0]["message"]["content"].strip()

        # Safety: if the model returned something clearly wrong, fall back
        if not compressed or len(compressed) > len(message) * 1.2:
            raise ValueError("Optimizer returned longer text — skipping")

        optimized_tokens = _estimate_tokens(compressed)
        logger.info(
            "PROMPT OPTIMIZED | %d→%d tokens (%.0f%% reduction) | original=%.60s | compressed=%.60s",
            original_tokens, optimized_tokens,
            max(0, (1 - optimized_tokens / original_tokens) * 100),
            message, compressed,
        )
        return {
            "optimized": compressed,
            "was_optimized": True,
            "original_tokens": original_tokens,
            "optimized_tokens": optimized_tokens,
        }

    except Exception as exc:
        logger.warning("Prompt optimizer failed, using original: %s", exc)
        return {
            "optimized": message,
            "was_optimized": False,
            "original_tokens": original_tokens,
            "optimized_tokens": original_tokens,
        }
