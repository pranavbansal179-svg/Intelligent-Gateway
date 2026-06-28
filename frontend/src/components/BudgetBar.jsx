import { useEffect, useState } from "react";

const STATE_META = {
  FULL: { color: "var(--teal)", label: null },
  ECONOMY: { color: "var(--gold)", label: "Economy mode" },
  WARNING: { color: "var(--amber)", label: "Low budget" },
  EXHAUSTED: { color: "var(--rose)", label: "Exhausted" },
};

/**
 * @param {{ spent: number, cap: number, state: string, lastCallCost?: number }} props
 */
export default function BudgetBar({ spent = 0, cap = 2.0, state = "FULL", lastCallCost = 0 }) {
  const remaining = Math.max(0, cap - spent);
  const pct = Math.min(100, (spent / cap) * 100);
  const meta = STATE_META[state] ?? STATE_META.FULL;
  const color = meta.color;

  const [flashCost, setFlashCost] = useState(null);
  useEffect(() => {
    if (lastCallCost > 0) {
      setFlashCost(lastCallCost);
      const t = setTimeout(() => setFlashCost(null), 3000);
      return () => clearTimeout(t);
    }
  }, [lastCallCost]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.row}>
        <span style={styles.label}>SESSION BUDGET</span>

        {meta.label && (
          <span style={{ ...styles.badge, color, background: `color-mix(in srgb, ${color} 16%, transparent)`, borderColor: `color-mix(in srgb, ${color} 35%, transparent)` }}>
            {meta.label}
          </span>
        )}

        {flashCost && (
          <span key={flashCost} style={styles.flash} className="budget-flash">
            −${flashCost.toFixed(6)} this query
          </span>
        )}

        <span style={styles.amounts}>
          <span style={{ color, fontWeight: 800, fontSize: 13 }}>${spent.toFixed(6)}</span>
          <span style={styles.muted}> spent</span>
          <span style={styles.sep}>·</span>
          <span style={{ ...styles.muted, fontWeight: 700, color: "var(--text-mid)" }}>${remaining.toFixed(6)} left</span>
          <span style={styles.sep}>/</span>
          <span style={styles.cap}>${cap.toFixed(2)}</span>
        </span>
      </div>

      <div style={styles.track}>
        <div
          style={{
            ...styles.fill,
            width: `${pct}%`,
            minWidth: pct > 0 ? 6 : 0,
            background: `linear-gradient(90deg, color-mix(in srgb, ${color} 70%, transparent), ${color})`,
            boxShadow: `0 0 14px color-mix(in srgb, ${color} 55%, transparent)`,
          }}
        />
      </div>

      <style>{`
        @keyframes budgetFlash {
          0% { opacity: 0; transform: translateY(-3px) scale(0.96); }
          12% { opacity: 1; transform: translateY(0) scale(1); }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        .budget-flash { animation: budgetFlash 3s var(--ease) forwards; }
      `}</style>
    </div>
  );
}

const styles = {
  wrapper: {
    padding: "10px 24px 13px",
    background: "linear-gradient(90deg, color-mix(in srgb, var(--amber) 10%, var(--bg-3)) 0%, var(--bg-3) 55%, color-mix(in srgb, var(--gold) 8%, var(--bg-3)) 100%)",
    borderBottom: "2px solid var(--border)", borderTop: "1px solid var(--border-soft)", zIndex: 9,
  },
  row: { display: "flex", alignItems: "center", gap: 9, marginBottom: 9, flexWrap: "wrap" },
  label: {
    fontSize: 11, color: "var(--text-mid)", fontWeight: 800,
    letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0,
  },
  badge: {
    fontSize: 10.5, fontWeight: 800, padding: "2px 10px", borderRadius: 99,
    border: "1px solid", letterSpacing: "0.03em", flexShrink: 0,
  },
  flash: {
    fontSize: 10.5, fontWeight: 800, color: "var(--amber)",
    background: "color-mix(in srgb, var(--amber) 14%, transparent)",
    border: "1px solid color-mix(in srgb, var(--amber) 35%, transparent)",
    borderRadius: 99, padding: "2px 10px", fontFamily: "'JetBrains Mono', monospace",
  },
  amounts: {
    fontSize: 12.5, fontWeight: 600, marginLeft: "auto",
    fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap",
    display: "flex", alignItems: "center", gap: 4,
  },
  muted: { color: "var(--text-lo)", fontWeight: 500 },
  sep: { color: "var(--text-dim)" },
  cap: { color: "var(--text-hi)", fontWeight: 800 },
  track: {
    height: 10, background: "var(--bg-4)", borderRadius: 99, overflow: "hidden",
    border: "1px solid var(--border)",
  },
  fill: { height: "100%", borderRadius: 99, transition: "width 0.6s var(--ease)" },
};
