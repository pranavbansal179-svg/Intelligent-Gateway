import re
import logging

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Injection patterns — compiled once at import time
# ---------------------------------------------------------------------------
_RAW_PATTERNS = [
    r"ignore (your |all |previous )?(instructions|rules|system prompt)",
    r"you are now",
    r"pretend (you are|to be)",
    r"reveal (your |the )?(system prompt|api key|instructions)",
    r"disregard",
    r"jailbreak",
    r"DAN",
    r"act as (if you are|an? )",
    r"forget (everything|your training)",
]

INJECTION_PATTERNS = [re.compile(p, re.IGNORECASE) for p in _RAW_PATTERNS]

REFUSAL_MESSAGE = (
    "I'm a financial assistant and can't process that request. "
    "Please ask me something about personal finance."
)


class GuardrailFilter:
    def quick_check(self, prompt: str) -> tuple[bool, str | None]:
        """
        Fast regex pass — runs before any API call, zero cost.
        Returns (is_safe, matched_pattern_string_or_None).
        """
        for pattern in INJECTION_PATTERNS:
            match = pattern.search(prompt)
            if match:
                logger.warning(
                    "INJECTION BLOCKED | pattern=%r | snippet=%r",
                    pattern.pattern,
                    prompt[:120],
                )
                return False, pattern.pattern
        return True, None

    async def check_via_otari(self, prompt: str, client) -> tuple[bool, str]:
        """
        Calls Otari's guardrail endpoint.
        Falls back to quick_check if the API call fails (fail-open on network errors,
        fail-closed on known injection patterns).
        Returns (is_safe, verdict_reason).
        """
        try:
            result = await client.check_guardrail(
                prompt=prompt,
                profile="prompt-injection",
                mode="block",
            )
            is_safe: bool = result.get("safe", True)
            reason: str = result.get("reason", "")
            if not is_safe:
                logger.warning(
                    "INJECTION BLOCKED via Otari guardrail | reason=%r | snippet=%r",
                    reason,
                    prompt[:120],
                )
            return is_safe, reason
        except Exception as exc:
            logger.error("Otari guardrail API failed (%s) — falling back to quick_check", exc)
            is_safe, pattern = self.quick_check(prompt)
            reason = f"regex fallback — matched: {pattern}" if pattern else "regex fallback — clean"
            return is_safe, reason
