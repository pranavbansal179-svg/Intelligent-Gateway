const STATE_COLORS = {
  FULL: "#00C896",
  ECONOMY: "#F0C040",
  WARNING: "#F0A500",
  EXHAUSTED: "#DA3633",
};

const STATE_LABELS = {
  ECONOMY: "Economy",
  WARNING: "Low Budget",
  EXHAUSTED: "Exhausted",
};

/**
 * @param {{ spent: number, cap: number, state: "FULL"|"ECONOMY"|"WARNING"|"EXHAUSTED" }} props
 */
export default function BudgetBar({ spent = 0, cap = 0.01, state = "FULL" }) {
  const remaining = Math.max(0, cap - spent);
  const pct = Math.min(100, (spent / cap) * 100); // fills up as you spend
  const color = STATE_COLORS[state] ?? STATE_COLORS.FULL;

  return (
    <div style={styles.wrapper}>
      <div style={styles.labelRow}>
        <span style={styles.label}>Budget</span>
        {state !== "FULL" && (
          <span style={{ ...styles.badge, background: color + "22", color }}>
            {STATE_LABELS[state]}
          </span>
        )}
        <span style={styles.amounts}>
          <span style={{ color, fontVariantNumeric: "tabular-nums" }}>
            ${spent.toFixed(6)}
          </span>
          <span style={styles.muted}> spent · </span>
          <span style={styles.muted}>${remaining.toFixed(6)} left</span>
          <span style={styles.muted}> / ${cap.toFixed(2)}</span>
        </span>
      </div>
      <div style={styles.track}>
        <div
          style={{
            ...styles.fill,
            width: `${pct}%`,
            background: color,
            transition: "width 0.4s ease, background 0.3s ease",
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
  amounts: {
    fontSize: 12,
    fontWeight: 600,
    marginLeft: "auto",
    fontVariantNumeric: "tabular-nums",
  },
  muted: { color: "#7D8590" },
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
