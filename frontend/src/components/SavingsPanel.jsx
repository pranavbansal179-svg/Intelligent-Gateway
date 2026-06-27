/**
 * Live ROI tracker: shows actual cost vs naive (always-Tier-3) cost.
 * @param {{ actualTotal: number, naiveTotal: number, queryCount: number }} props
 */
export default function SavingsPanel({ actualTotal = 0, naiveTotal = 0, queryCount = 0 }) {
  const saved = Math.max(0, naiveTotal - actualTotal);
  const savingsPct = naiveTotal > 0 ? (saved / naiveTotal) * 100 : 0;

  // Project to 1M queries using average per-query savings
  const savedPerQuery = queryCount > 0 ? saved / queryCount : 0;
  const proj1M = savedPerQuery * 1_000_000;

  const hasData = queryCount > 0;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>ROI Tracker</span>
        <span style={styles.subtitle}>routing vs always-Tier-3</span>
      </div>

      <div style={styles.grid}>
        <div style={styles.cell}>
          <span style={styles.cellLabel}>Without routing</span>
          <span style={{ ...styles.cellValue, color: "#DA3633" }}>
            {hasData ? `$${naiveTotal.toFixed(5)}` : "—"}
          </span>
        </div>
        <div style={styles.divider} />
        <div style={styles.cell}>
          <span style={styles.cellLabel}>Actual cost</span>
          <span style={{ ...styles.cellValue, color: "#00C896" }}>
            {hasData ? `$${actualTotal.toFixed(5)}` : "—"}
          </span>
        </div>
      </div>

      {hasData ? (
        <>
          <div style={styles.savingsRow}>
            <span style={styles.savingsLabel}>
              Saved · {queryCount} quer{queryCount === 1 ? "y" : "ies"}
            </span>
            <span style={styles.savingsAmount}>
              ${saved.toFixed(5)}
              {savingsPct > 0 && (
                <span style={styles.savingsPct}> ({savingsPct.toFixed(1)}%)</span>
              )}
            </span>
          </div>

          <div style={styles.projectionBox}>
            <div style={styles.projectionLabel}>At 1,000,000 queries</div>
            <div style={styles.projectionValue}>
              ${proj1M.toLocaleString("en-US", { maximumFractionDigits: 0 })} saved
            </div>
            <div style={styles.projectionSub}>
              ${savedPerQuery.toFixed(6)} saved per query × 1M
            </div>
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
    background: "#161B22",
    border: "1px solid #21262D",
    borderRadius: 10,
    overflow: "hidden",
    margin: "0 6px 6px",
  },
  header: {
    padding: "8px 12px 6px",
    borderBottom: "1px solid #21262D",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  title: {
    fontSize: 11, fontWeight: 700, color: "#7D8590",
    textTransform: "uppercase", letterSpacing: "0.05em",
  },
  subtitle: { fontSize: 10, color: "#3D444D" },
  grid: { display: "flex", alignItems: "center", padding: "10px 12px" },
  cell: { flex: 1, display: "flex", flexDirection: "column", gap: 2 },
  cellLabel: { fontSize: 10, color: "#7D8590" },
  cellValue: { fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  divider: { width: 1, height: 32, background: "#21262D", margin: "0 12px" },
  savingsRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "6px 12px 8px", borderTop: "1px solid #21262D",
  },
  savingsLabel: { fontSize: 11, color: "#7D8590" },
  savingsAmount: {
    fontSize: 12, fontWeight: 700, color: "#00C896", fontVariantNumeric: "tabular-nums",
  },
  savingsPct: { fontSize: 11, color: "#00C89699" },
  projectionBox: {
    margin: "0 10px 10px",
    background: "#00C89610", border: "1px solid #00C89630",
    borderRadius: 8, padding: "8px 12px", textAlign: "center",
  },
  projectionLabel: { fontSize: 10, color: "#00C89699", marginBottom: 2 },
  projectionValue: { fontSize: 18, fontWeight: 800, color: "#00C896" },
  projectionSub: { fontSize: 10, color: "#00C89680", marginTop: 2 },
  empty: {
    fontSize: 11, color: "#3D444D", textAlign: "center",
    padding: "10px 0 12px", margin: 0,
  },
};
