import os
from enum import Enum

BUDGET_CAP = float(os.getenv("BUDGET_CAP", "2.00"))


class BudgetState(str, Enum):
    FULL = "FULL"           # > 50% remaining
    ECONOMY = "ECONOMY"     # 10–50% remaining
    WARNING = "WARNING"     # < 10% remaining
    EXHAUSTED = "EXHAUSTED" # $0 remaining


class BudgetExhaustedError(Exception):
    def __init__(self, cap: float = BUDGET_CAP):
        self.message = (
            f"Budget cap of ${cap:.2f} reached. "
            "No further model calls can be made this session."
        )
        super().__init__(self.message)


class BudgetManager:
    def __init__(self, cap: float = BUDGET_CAP):
        self.cap = cap

    def get_remaining(self, spent: float) -> float:
        return max(0.0, self.cap - spent)

    def get_state(self, spent: float) -> BudgetState:
        remaining = self.get_remaining(spent)
        pct = remaining / self.cap if self.cap > 0 else 0.0

        if remaining <= 0:
            return BudgetState.EXHAUSTED
        elif pct < 0.10:
            return BudgetState.WARNING
        elif pct <= 0.50:
            return BudgetState.ECONOMY
        else:
            return BudgetState.FULL

    def enforce_tier(self, requested_tier: int, state: BudgetState) -> tuple[int, str | None]:
        """
        Apply budget-based tier caps.
        Returns (actual_tier, downgrade_reason_or_None).
        Raises BudgetExhaustedError when state is EXHAUSTED.
        """
        if state == BudgetState.EXHAUSTED:
            raise BudgetExhaustedError(self.cap)

        if state == BudgetState.WARNING:
            if requested_tier > 1:
                return 1, f"Downgraded from Tier {requested_tier} to Tier 1 — budget WARNING (< 10% remaining)"
            return requested_tier, None

        if state == BudgetState.ECONOMY:
            if requested_tier > 2:
                return 2, f"Downgraded from Tier {requested_tier} to Tier 2 — budget ECONOMY (10–50% remaining)"
            return requested_tier, None

        # FULL — no caps
        return requested_tier, None

    def format_remaining(self, spent: float) -> str:
        return f"${self.get_remaining(spent):.2f} / ${self.cap:.2f}"
