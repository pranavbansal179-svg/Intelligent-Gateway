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
        <p style={styles.empty}>Send a message to see savings</p>
      )}
    </div>
  );
}

const styles = {
  wrapper: {
    background: "var(--bg-1)", border: "1px solid var(--border-soft)",
    borderRadius: 13, overflow: "hidden", marginTop: 3,
  },
  header: {
    padding: "12px 14px 10px", borderBottom: "1px solid var(--border-soft)",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  title: { fontSize: 12, fontWeight: 700, color: "var(--text-mid)" },
  subtitle: { fontSize: 9.5, color: "var(--text-dim)", fontWeight: 500 },
  grid: { display: "flex", alignItems: "center", padding: "13px 12px 7px" },
  cell: { flex: 1, display: "flex", flexDirection: "column", gap: 4, alignItems: "center", textAlign: "center" },
  cellLabel: { fontSize: 9.5, color: "var(--text-lo)", fontWeight: 600 },
  cellValue: { fontSize: 15, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" },
  vs: { fontSize: 10, color: "var(--text-dim)", fontWeight: 700, padding: "0 8px", textTransform: "uppercase" },
  savingsRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "8px 14px", margin: "4px 10px 0", borderRadius: 8, background: "var(--bg-2)",
  },
  savingsLabel: { fontSize: 10.5, color: "var(--text-lo)", fontWeight: 500 },
  savingsAmount: { fontSize: 13, fontWeight: 700, color: "var(--teal)", fontFamily: "'JetBrains Mono', monospace" },
  savingsPct: { fontSize: 10.5, color: "color-mix(in srgb, var(--teal) 65%, transparent)" },
  projectionBox: {
    position: "relative", margin: "11px", padding: "16px 13px", textAlign: "center",
    borderRadius: 11, overflow: "hidden",
    background: "linear-gradient(135deg, color-mix(in srgb, var(--teal) 9%, transparent), color-mix(in srgb, var(--violet) 7%, transparent))",
    border: "1px solid color-mix(in srgb, var(--teal) 24%, transparent)",
  },
  projGlow: {
    position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 0%, rgba(8,120,87,0.08), transparent 70%)",
    pointerEvents: "none",
  },
  projectionLabel: { fontSize: 9, color: "var(--text-lo)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700, position: "relative" },
  projectionValue: {
    fontSize: 28, fontWeight: 700, position: "relative", letterSpacing: "-0.03em",
    background: "var(--grad-primary)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  projectionSub: { fontSize: 10, color: "var(--text-lo)", marginTop: 4, position: "relative", fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 },
  empty: { fontSize: 11, color: "var(--text-dim)", textAlign: "center", padding: "15px 0 17px", margin: 0 },
};
