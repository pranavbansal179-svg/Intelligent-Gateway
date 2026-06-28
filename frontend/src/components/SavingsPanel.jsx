/**
 * Live ROI tracker: actual cost vs naive (always-Tier-3) cost.
 * @param {{ actualTotal: number, naiveTotal: number, queryCount: number }} props
 */
export default function SavingsPanel({ actualTotal = 0, naiveTotal = 0, queryCount = 0 }) {
  const saved = Math.max(0, naiveTotal - actualTotal);
  const savingsPct = naiveTotal > 0 ? (saved / naiveTotal) * 100 : 0;
  const savedPerQuery = queryCount > 0 ? saved / queryCount : 0;
  const proj1M = savedPerQuery * 1_000_000;
  const hasData = queryCount > 0;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>📈 ROI Tracker</span>
        <span style={styles.subtitle}>vs always-Tier-3</span>
      </div>

      <div style={styles.grid}>
        <div style={styles.cell}>
          <span style={styles.cellLabel}>Without routing</span>
          <span style={{ ...styles.cellValue, color: "var(--rose)" }}>
            {hasData ? `$${naiveTotal.toFixed(5)}` : "—"}
          </span>
        </div>
        <div style={styles.vs}>vs</div>
        <div style={styles.cell}>
          <span style={styles.cellLabel}>Smart routing</span>
          <span style={{ ...styles.cellValue, color: "var(--teal)" }}>
            {hasData ? `$${actualTotal.toFixed(5)}` : "—"}
          </span>
        </div>
      </div>

      {hasData ? (
        <>
          <div style={styles.savingsRow}>
            <span style={styles.savingsLabel}>
              Saved over {queryCount} quer{queryCount === 1 ? "y" : "ies"}
            </span>
            <span style={styles.savingsAmount}>
              ${saved.toFixed(5)}
              {savingsPct > 0 && <span style={styles.savingsPct}> ({savingsPct.toFixed(0)}%)</span>}
            </span>
          </div>

          <div style={styles.projectionBox}>
            <div style={styles.projGlow} />
            <div style={styles.projectionLabel}>Projected at 1,000,000 queries</div>
            <div style={styles.projectionValue}>
              ${proj1M.toLocaleString("en-US", { maximumFractionDigits: 0 })}
            </div>
            <div style={styles.projectionSub}>saved · ${savedPerQuery.toFixed(6)}/query</div>
          </div>
        </>
      ) : (
        <p style={styles.empty}>
          <span style={{ display: "block", fontSize: 18, marginBottom: 6, opacity: 0.35 }}>📊</span>
          Send a message to start<br />tracking savings vs Tier 3
        </p>
      )}

    </div>
  );
}

const styles = {
  wrapper: {
    background: "var(--bg-1)", border: "1px solid var(--border)",
    borderRadius: 12, overflow: "hidden", marginTop: 6,
    borderLeft: "3px solid var(--teal)",
    boxShadow: "0 1px 4px rgba(18,28,64,0.08)",
  },
  header: {
    padding: "11px 14px 10px", borderBottom: "1px solid var(--border)",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "var(--bg-3)",
  },
  title: { fontSize: 12, fontWeight: 700, color: "var(--text-hi)" },
  subtitle: { fontSize: 10, color: "var(--text-dim)", fontWeight: 500 },
  grid: { display: "flex", alignItems: "center", padding: "12px 12px 6px", background: "var(--bg-1)" },
  cell: { flex: 1, display: "flex", flexDirection: "column", gap: 3, alignItems: "center", textAlign: "center" },
  cellLabel: { fontSize: 10, color: "var(--text-lo)", fontWeight: 600 },
  cellValue: { fontSize: 14, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" },
  vs: { fontSize: 10, color: "var(--text-dim)", fontWeight: 700, padding: "0 8px", textTransform: "uppercase" },
  savingsRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 14px", margin: "4px 10px 0", borderRadius: 8, background: "var(--bg-2)",
  },
  savingsLabel: { fontSize: 11, color: "var(--text-lo)" },
  savingsAmount: { fontSize: 13, fontWeight: 800, color: "var(--teal)", fontFamily: "'JetBrains Mono', monospace" },
  savingsPct: { fontSize: 11, color: "color-mix(in srgb, var(--teal) 70%, transparent)" },
  projectionBox: {
    position: "relative", margin: "10px", padding: "14px 12px", textAlign: "center",
    borderRadius: 12, overflow: "hidden",
    background: "linear-gradient(135deg, color-mix(in srgb, var(--teal) 12%, transparent), color-mix(in srgb, var(--violet) 10%, transparent))",
    border: "1px solid color-mix(in srgb, var(--teal) 28%, transparent)",
  },
  projGlow: {
    position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(0,229,172,0.15), transparent 70%)",
    pointerEvents: "none",
  },
  projectionLabel: { fontSize: 9.5, color: "var(--text-lo)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700, position: "relative" },
  projectionValue: {
    fontSize: 26, fontWeight: 900, position: "relative", letterSpacing: "-0.02em",
    background: "var(--grad-primary)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  projectionSub: { fontSize: 10, color: "var(--text-lo)", marginTop: 3, position: "relative", fontFamily: "'JetBrains Mono', monospace" },
  empty: {
    fontSize: 11, color: "var(--text-dim)", textAlign: "center",
    padding: "18px 16px 20px", margin: 0, background: "var(--bg-1)",
    lineHeight: 1.6,
  },
};
