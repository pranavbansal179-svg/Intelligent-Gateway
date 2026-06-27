import re

# ---------------------------------------------------------------------------
# Model name constants — swap these for the actual Otari model IDs you have
# ---------------------------------------------------------------------------
MODEL_TIER1 = "mzai:Qwen/Qwen3-30B-A3B-Instruct-2507"        # 30B — fast, $0.10/1M
MODEL_TIER2 = "mzai:meta-llama/Llama-3.3-70B-Instruct"      # 70B — balanced, $0.13/1M
MODEL_TIER3 = "mzai:NousResearch/Hermes-4-70B"              # 70B reasoning-tuned, $0.13/1M

# Finance-domain jargon that bumps the tier up by 1
FINANCE_JARGON = [
    "APR",
    "amortization",
    "asset allocation",
    "rebalance",
    "tax-loss harvesting",
    "expense ratio",
    "dollar-cost averaging",
    "debt-to-income",
]

# Phrases that always force Tier 3 regardless of word count
PLAN_TRIGGERS = [
    "investing plan",
    "investment plan",
    "financial plan",
    "retirement plan",
    "personalised plan",
    "personalized plan",
    "financial roadmap",
    "wealth plan",
    "portfolio plan",
    "savings plan",
    "create a plan",
    "build a plan",
    "prepare a plan",
    "make a plan",
    "design a plan",
]

# Multi-step planning signal words
COMPLEX_MARKERS = [
    "prioritize",
    "given that",
    "amortization",
    "APR",
    "multiple",
    "step by step",
    "plan",
    "allocate",
    "optimize",
    "portfolio",
    "retirement",
    "diversify",
    "wealth",
]

# Single-trade-off signal words — personal decision language only.
# "difference between" is intentionally excluded: it signals a definition
# request, not a personal decision, so Tier 1 handles it fine.
TRADEOFF_MARKERS = [
    "should i",
    "better option",
    "versus",
    "vs",
    "trade-off",
    "tradeoff",
    "pros and cons",
    "which is better",
    "or should",
    "which should i",
    "what should i choose",
]

# Regex to count dollar amounts / numeric constraints
DOLLAR_PATTERN = re.compile(r"\$[\d,]+|\d+k\b|\d+%|\d+\.\d+%", re.IGNORECASE)


def _contains_jargon(prompt_lower: str) -> bool:
    return any(j.lower() in prompt_lower for j in FINANCE_JARGON)


def _count_dollar_amounts(prompt: str) -> int:
    return len(DOLLAR_PATTERN.findall(prompt))


class PromptClassifier:
    def classify(self, prompt: str) -> dict:
        """
        Returns { "tier": 1|2|3, "reason": str, "model": str }
        """
        words = prompt.split()
        word_count = len(words)
        prompt_lower = prompt.lower()

        # --- Hard Tier 3 override: explicit plan requests ---
        if any(trigger in prompt_lower for trigger in PLAN_TRIGGERS):
            tier = 3
            reason = "Tier 3 — personalised financial plan request"
            model_map = {1: MODEL_TIER1, 2: MODEL_TIER2, 3: MODEL_TIER3}
            return {"tier": tier, "reason": reason, "model": model_map[tier]}

        # --- Base tier from word count ---
        if word_count < 25:
            tier = 1
            reason = "short factual lookup"
        elif word_count <= 60:
            tier = 2
            reason = "moderate-length question"
        else:
            tier = 3
            reason = "long multi-part question"

        # --- Upgrade signals ---

        # Tier 2 upgrade: trade-off language
        if tier == 1 and any(m in prompt_lower for m in TRADEOFF_MARKERS):
            tier = 2
            reason = "single trade-off question"

        # Tier 3 upgrade: complex planning markers
        complex_hit = [m for m in COMPLEX_MARKERS if m in prompt_lower]
        dollar_count = _count_dollar_amounts(prompt)

        if tier < 3 and (len(complex_hit) >= 2 or dollar_count >= 2):
            tier = 3
            reason = "multi-constraint financial planning"

        # Finance jargon bump (+1 tier, capped at 3)
        if _contains_jargon(prompt_lower):
            if tier < 3:
                tier = min(tier + 1, 3)
                reason += " (finance jargon detected)"

        # Map tier to model
        model_map = {1: MODEL_TIER1, 2: MODEL_TIER2, 3: MODEL_TIER3}
        model = model_map[tier]

        return {"tier": tier, "reason": reason, "model": model}


# ---------------------------------------------------------------------------
# Quick self-test
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    classifier = PromptClassifier()

    samples = [
        # Tier 1 expected
        ("What is a Roth IRA?", 1),
        ("Define compound interest.", 1),
        # Tier 2 expected
        ("Should I pay off my student loans or start investing in an index fund?", 2),
        ("What's the difference between a Roth and a traditional IRA?", 2),
        # Tier 3 expected
        ("I have $40k saved, $15k in credit card debt at 22% APR, and I want to buy a house in 3 years. "
         "Given that my monthly income is $6k, what should I prioritize first to optimize my finances?", 3),
        ("Help me create a multi-step plan to rebalance my portfolio: I have $200k across 4 ETFs, "
         "want to reduce expense ratio, and my debt-to-income ratio is 0.38.", 3),
    ]

    print(f"{'Prompt':<70} {'Expected':>8} {'Got':>4} {'Model':<15} Reason")
    print("-" * 130)
    for prompt, expected in samples:
        result = classifier.classify(prompt)
        status = "✅" if result["tier"] == expected else "❌"
        snippet = (prompt[:67] + "...") if len(prompt) > 70 else prompt
        print(f"{snippet:<70} {status} T{expected}  →T{result['tier']}  {result['model']:<15} {result['reason']}")
