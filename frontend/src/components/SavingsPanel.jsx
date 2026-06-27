/**
 * Shows actual cost vs naive (always-Tier-3) cost, savings, and projected ROI at scale.
 * @param {{ actualTotal: number, naiveTotal: number }} props
 */
export default function SavingsPanel({ actualTotal = 0, naiveTotal = 0 }) {
  const saved = Math.max(0, naiveTotal - actualTotal);
  const savingsPct = naiveTotal > 0 ? (saved / naiveTotal) * 100 : 0;
  const projectedSavings1M = naiveTotal > 0
    ? (saved / Math.max(naiveTotal, actualTotal)) * naiveTotal * 1_000_000 / Math.max(naiveTotal, 0.000001)
    : 0;

  // Projected $ saved per 1M queries (linear scale from current session ratio)
  const queriesInSession = Math.max(1, Math.round(naiveTotal / 0.0003)); // rough estimate
  const savedPerQuery = saved / Math.max(queriesInSession, 1);
  const proj1M = savedPerQuery * 1_000_000;

  const hasData = naiveTotal > 0;

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <span style={styles.title}>ROI Tracker</span>
        <span style={styles.subtitle}>Smart routing vs always-Tier-3</span>
      </div>

      <div style={styles.grid}>
        <div style={styles.cell}>
          <span style={styles.cellLabel}>Without routing</span>
          <span style={{ ...styles.cellValue, color: "#DA3633" }}>
            ${naiveTotal.toFixed(4)}
          </span>
        </div>
        <div style={styles.divider} />
        <div style={styles.cell}>
          <span style={styles.cellLabel}>Actual cost</span>
          <span style={{ ...styles.cellValue, color: "#00C896" }}>
            ${actualTotal.toFixed(4)}
          </span>
        </div>
      </div>

      {hasData && (
        <>
          <div style={styles.savingsRow}>
            <span style={styles.savingsLabel}>Saved this session</span>
            <span style={styles.savingsAmount}>
              ${saved.toFixed(4)}
              <span style={styles.savingsPct}> ({savingsPct.toFixed(1)}%)</span>
            </span>
          </div>

          <div style={styles.projectionBox}>
            <div style={styles.projectionLabel}>At 1,000,000 queries</div>
            <div style={styles.projectionValue}>
              ${proj1M.toLocaleString("en-US", { maximumFractionDigits: 0 })} saved
            </div>
            <div style={styles.projectionSub}>
              Based on {savingsPct.toFixed(1)}% average routing savings
            </div>
          </div>
        </>
      )}

      {!hasData && (
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
    fontSize: 11,
    fontWeight: 700,
    color: "#7D8590",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  subtitle: { fontSize: 10, color: "#3D444D" },
  grid: {
    display: "flex",
    alignItems: "center",
    padding: "10px 12px",
  },
  cell: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  cellLabel: { fontSize: 10, color: "#7D8590" },
  cellValue: { fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" },
  divider: { width: 1, height: 32, background: "#21262D", margin: "0 12px" },
  savingsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "6px 12px 8px",
    borderTop: "1px solid #21262D",
  },
  savingsLabel: { fontSize: 11, color: "#7D8590" },
  savingsAmount: {
    fontSize: 13,
    fontWeight: 700,
    color: "#00C896",
    fontVariantNumeric: "tabular-nums",
  },
  savingsPct: { fontSize: 11, color: "#00C89699" },
  projectionBox: {
    margin: "0 10px 10px",
    background: "#00C89610",
    border: "1px solid #00C89630",
    borderRadius: 8,
    padding: "8px 12px",
    textAlign: "center",
  },
  projectionLabel: { fontSize: 10, color: "#00C89699", marginBottom: 2 },
  projectionValue: { fontSize: 18, fontWeight: 800, color: "#00C896" },
  projectionSub: { fontSize: 10, color: "#00C89680", marginTop: 2 },
  empty: { fontSize: 11, color: "#3D444D", textAlign: "center", padding: "10px 0 12px", margin: 0 },
};
