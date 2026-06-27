"""
Unit tests for BudgetManager.
Run with:  python backend/budget_test.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backend.budget import BudgetManager, BudgetState, BudgetExhaustedError

CAP = 2.00
mgr = BudgetManager(cap=CAP)

PASS = 0
FAIL = 0


def check(label: str, actual, expected):
    global PASS, FAIL
    if actual == expected:
        print(f"  ✅ {label}")
        PASS += 1
    else:
        print(f"  ❌ {label}  expected={expected!r}  got={actual!r}")
        FAIL += 1


# ---------------------------------------------------------------------------
# State transitions
# ---------------------------------------------------------------------------
print("\n── get_state ──")
check("$0.00 spent → FULL",        mgr.get_state(0.00),  BudgetState.FULL)
check("$0.99 spent → FULL",        mgr.get_state(0.99),  BudgetState.FULL)
check("$1.00 spent → ECONOMY",     mgr.get_state(1.00),  BudgetState.ECONOMY)
check("$1.50 spent → ECONOMY",     mgr.get_state(1.50),  BudgetState.ECONOMY)
check("$1.81 spent → WARNING",     mgr.get_state(1.81),  BudgetState.WARNING)
check("$1.99 spent → WARNING",     mgr.get_state(1.99),  BudgetState.WARNING)
check("$2.00 spent → EXHAUSTED",   mgr.get_state(2.00),  BudgetState.EXHAUSTED)
check("$2.50 spent → EXHAUSTED",   mgr.get_state(2.50),  BudgetState.EXHAUSTED)

# ---------------------------------------------------------------------------
# get_remaining
# ---------------------------------------------------------------------------
print("\n── get_remaining ──")
check("$0.00 spent → $2.00 remaining", mgr.get_remaining(0.00), 2.00)
check("$1.00 spent → $1.00 remaining", mgr.get_remaining(1.00), 1.00)
check("$2.00 spent → $0.00 remaining", mgr.get_remaining(2.00), 0.00)
check("$3.00 spent → $0.00 (floor)",   mgr.get_remaining(3.00), 0.00)

# ---------------------------------------------------------------------------
# enforce_tier — FULL state (no caps)
# ---------------------------------------------------------------------------
print("\n── enforce_tier — FULL ──")
tier, reason = mgr.enforce_tier(1, BudgetState.FULL)
check("FULL + T1 → T1, no reason", (tier, reason), (1, None))
tier, reason = mgr.enforce_tier(3, BudgetState.FULL)
check("FULL + T3 → T3, no reason", (tier, reason), (3, None))

# ---------------------------------------------------------------------------
# enforce_tier — ECONOMY state (cap at tier 2)
# ---------------------------------------------------------------------------
print("\n── enforce_tier — ECONOMY ──")
tier, reason = mgr.enforce_tier(2, BudgetState.ECONOMY)
check("ECONOMY + T2 → T2, no reason", (tier, reason), (2, None))
tier, reason = mgr.enforce_tier(3, BudgetState.ECONOMY)
check("ECONOMY + T3 → T2, with reason", tier, 2)
check("ECONOMY + T3 downgrade reason not None", reason is not None, True)

# ---------------------------------------------------------------------------
# enforce_tier — WARNING state (cap at tier 1)
# ---------------------------------------------------------------------------
print("\n── enforce_tier — WARNING ──")
tier, reason = mgr.enforce_tier(1, BudgetState.WARNING)
check("WARNING + T1 → T1, no reason", (tier, reason), (1, None))
tier, reason = mgr.enforce_tier(2, BudgetState.WARNING)
check("WARNING + T2 → T1, with reason", tier, 1)
check("WARNING + T2 downgrade reason not None", reason is not None, True)
tier, reason = mgr.enforce_tier(3, BudgetState.WARNING)
check("WARNING + T3 → T1, with reason", tier, 1)

# ---------------------------------------------------------------------------
# enforce_tier — EXHAUSTED (raises)
# ---------------------------------------------------------------------------
print("\n── enforce_tier — EXHAUSTED ──")
try:
    mgr.enforce_tier(1, BudgetState.EXHAUSTED)
    check("EXHAUSTED raises BudgetExhaustedError", False, True)
except BudgetExhaustedError as e:
    check("EXHAUSTED raises BudgetExhaustedError", True, True)
    check("Error has user-friendly message", "$2.00" in e.message, True)

# ---------------------------------------------------------------------------
# format_remaining
# ---------------------------------------------------------------------------
print("\n── format_remaining ──")
check("format $1.42 spent", mgr.format_remaining(0.58), "$1.42 / $2.00")
check("format $0.00 spent", mgr.format_remaining(0.00), "$2.00 / $2.00")
check("format $2.00 spent", mgr.format_remaining(2.00), "$0.00 / $2.00")

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
total = PASS + FAIL
print(f"\n{'='*40}")
print(f"Results: {PASS}/{total} passed", "✅" if FAIL == 0 else "❌")
if FAIL:
    sys.exit(1)
