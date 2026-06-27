import { useEffect, useState } from "react";

const STATE_COLORS = {
  FULL: "#00C896",
  ECONOMY: "#F0C040",
  WARNING: "#F0A500",
  EXHAUSTED: "#DA3633",
};

const STATE_LABELS = {
  ECONOMY: "Economy mode",
  WARNING: "Low budget",
  EXHAUSTED: "Exhausted",
};

/**
 * @param {{ spent: number, cap: number, state: string, lastCallCost?: number }} props
 */
export default function BudgetBar({ spent = 0, cap = 2.0, state = "FULL", lastCallCost = 0 }) {
  const remaining = Math.max(0, cap - spent);
  const pct = Math.min(100, (spent / cap) * 100); // fills left→right as budget consumed
  const color = STATE_COLORS[state] ?? STATE_COLORS.FULL;

  // Flash the last-query cost for 3 seconds after each new call
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
      <div style={styles.labelRow}>
        <span style={styles.label}>Budget</span>

        {state !== "FULL" && (
          <span style={{ ...styles.badge, background: color + "22", color }}>
            {STATE_LABELS[state]}
          </span>
        )}

        {flashCost && (
          <span style={styles.flashCost}>
            −${flashCost.toFixed(6)} this query
          </span>
        )}

        <span style={styles.amounts}>
          <span style={{ color: "#7D8590" }}>$</span>
          <span style={{ color, fontVariantNumeric: "tabular-nums" }}>
            {spent.toFixed(6)}
          </span>
          <span style={styles.muted}> spent · ${remaining.toFixed(6)} left / ${cap.toFixed(2)}</span>
        </span>
      </div>

      <div style={styles.track}>
        <div
          style={{
            ...styles.fill,
            width: `${pct}%`,
            background: color,
            transition: "width 0.5s ease, background 0.3s ease",
            minWidth: pct > 0 ? 3 : 0, // always show a sliver once any money is spent
          }}
        />
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    padding: "10px 16px",
    background: "#161B22",
    borderBottom: "1px solid #21262D",
  },
  labelRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 12,
    color: "#7D8590",
    fontWeight: 600,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    flexShrink: 0,
  },
  badge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 99,
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
  flashCost: {
    fontSize: 11,
    fontWeight: 700,
    color: "#F0A500",
    background: "#F0A50018",
    border: "1px solid #F0A50040",
    borderRadius: 99,
    padding: "1px 8px",
    fontVariantNumeric: "tabular-nums",
    animation: "fadeIn 0.2s ease",
  },
  amounts: {
    fontSize: 12,
    fontWeight: 600,
    marginLeft: "auto",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
  muted: { color: "#7D8590", fontWeight: 400 },
  track: {
    height: 6,
    background: "#21262D",
    borderRadius: 99,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 99,
  },
};
