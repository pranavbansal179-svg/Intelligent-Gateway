const MODEL_LABELS = {
  "mzai:Qwen/Qwen3-30B-A3B-Instruct-2507": "Qwen3-30B",
  "mzai:meta-llama/Llama-3.3-70B-Instruct": "Llama-3.3-70B",
  "mzai:NousResearch/Hermes-4-70B": "Hermes-4-70B",
};

const TIER_COLORS = {
  "1": "var(--t1)",
  "2": "var(--t2)",
  "3": "var(--t3)",
};

/**
 * @param {{ model: string, reason: string, cost: number, cacheHit?: boolean, wasOptimized?: boolean, originalTokens?: number, optimizedTokens?: number }} props
 */
export default function MetadataChip({ model, reason, cost, cacheHit, wasOptimized, originalTokens, optimizedTokens, latencyMs }) {
  if (cacheHit) {
    return (
      <div style={styles.root}>
        <div style={styles.cacheBanner}>
          <span style={styles.cacheIcon}>⚡</span>
          <span style={styles.cacheLabel}>Cache hit</span>
          <span style={styles.cacheText}>semantic match</span>
          {latencyMs > 0 && <span style={styles.cacheSpeed}>served in {latencyMs}ms</span>}
          <span style={styles.cacheCost}>$0.0000</span>
        </div>
      </div>
    );
  }

  const label = MODEL_LABELS[model] ?? model.replace(/^mzai:/, "").split("/").pop();
  const tier = reason.match(/Tier (\d)/i)?.[1];
  const tierColor = TIER_COLORS[tier] ?? "var(--teal)";
  const savedPct = wasOptimized && originalTokens > 0
    ? Math.round((1 - optimizedTokens / originalTokens) * 100)
    : 0;
  const tokensSaved = (originalTokens ?? 0) - (optimizedTokens ?? 0);

  return (
    <div style={styles.root}>
      <div style={styles.row}>
        {tier && (
          <span style={{ ...styles.tierBadge, color: tierColor, background: `color-mix(in srgb, ${tierColor} 16%, transparent)`, borderColor: `color-mix(in srgb, ${tierColor} 35%, transparent)` }}>
            <span style={{ ...styles.tierDot, background: tierColor }} /> T{tier}
          </span>
        )}
        <span style={{ ...styles.chip, color: tierColor, background: `color-mix(in srgb, ${tierColor} 12%, transparent)` }}>{label}</span>
        <span style={styles.reason}>{reason}</span>
        <span style={styles.spacer} />
        {latencyMs > 0 && <span style={styles.latency}>{latencyMs}ms</span>}
        <span style={styles.cost}>${(cost ?? 0).toFixed(4)}</span>
      </div>

      {wasOptimized && savedPct > 0 && (
        <div style={styles.optimizerBanner}>
          <div style={styles.optimizerLeft}>
            <span style={styles.optimizerIcon}>✦</span>
            <span style={styles.optimizerLabel}>Prompt optimized</span>
          </div>
          <div style={styles.optimizerStats}>
            <span style={styles.statBlock}>
              <span style={styles.statValue}>{originalTokens}</span>
              <span style={styles.statUnit}>in</span>
            </span>
            <span style={styles.arrow}>→</span>
            <span style={styles.statBlock}>
              <span style={{ ...styles.statValue, color: "var(--violet)" }}>{optimizedTokens}</span>
              <span style={styles.statUnit}>sent</span>
            </span>
            <span style={styles.savingsPill}>−{tokensSaved} tok · {savedPct}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { display: "flex", flexDirection: "column", gap: 6, marginTop: 8 },
  row: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" },
  tierBadge: {
    display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 800,
    padding: "3px 9px", borderRadius: 99, border: "1px solid", letterSpacing: "0.04em",
  },
  tierDot: { width: 5, height: 5, borderRadius: "50%", boxShadow: "0 0 6px currentColor" },
  chip: {
    fontSize: 11, padding: "3px 9px", borderRadius: 99, fontWeight: 700,
    fontFamily: "'JetBrains Mono', monospace",
  },
  reason: { fontSize: 11, color: "var(--text-mid)", fontWeight: 500 },
  spacer: { flex: 1 },
  latency: {
    fontSize: 10, fontWeight: 600, color: "var(--text-lo)",
    fontFamily: "'JetBrains Mono', monospace",
    background: "transparent", borderRadius: 99, padding: "0",
  },
  cost: {
    fontSize: 11.5, fontWeight: 700, color: "var(--teal)",
    fontFamily: "'JetBrains Mono', monospace",
  },

  /* Cache banner */
  cacheBanner: {
    display: "flex", alignItems: "center", gap: 8, padding: "7px 12px",
    background: "linear-gradient(90deg, color-mix(in srgb, var(--teal) 14%, transparent), transparent)",
    border: "1px solid color-mix(in srgb, var(--teal) 30%, transparent)", borderRadius: 10,
  },
  cacheIcon: { color: "var(--teal)", fontSize: 13, textShadow: "0 0 10px var(--teal)" },
  cacheLabel: { color: "var(--teal)", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.03em" },
  cacheText: { color: "var(--text-lo)", fontSize: 11 },
  cacheSpeed: {
    fontSize: 10.5, fontWeight: 800, color: "var(--teal)",
    background: "color-mix(in srgb, var(--teal) 18%, transparent)",
    border: "1px solid color-mix(in srgb, var(--teal) 40%, transparent)",
    borderRadius: 99, padding: "2px 9px", fontFamily: "'JetBrains Mono', monospace",
  },
  cacheCost: { marginLeft: "auto", color: "var(--teal)", fontSize: 11.5, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace" },

  /* Optimizer banner */
  optimizerBanner: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
    padding: "7px 12px", borderRadius: 10, flexWrap: "wrap",
    background: "linear-gradient(90deg, color-mix(in srgb, var(--violet) 14%, transparent), transparent)",
    border: "1px solid color-mix(in srgb, var(--violet) 28%, transparent)",
  },
  optimizerLeft: { display: "flex", alignItems: "center", gap: 6 },
  optimizerIcon: { color: "var(--violet)", fontSize: 12 },
  optimizerLabel: { color: "var(--violet)", fontSize: 11.5, fontWeight: 800, letterSpacing: "0.03em" },
  optimizerStats: { display: "flex", alignItems: "center", gap: 8 },
  statBlock: { display: "flex", alignItems: "baseline", gap: 4 },
  statValue: { fontSize: 13, fontWeight: 800, color: "var(--text-hi)", fontFamily: "'JetBrains Mono', monospace" },
  statUnit: { fontSize: 9.5, color: "var(--text-lo)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 },
  arrow: { color: "var(--violet)", fontSize: 13, fontWeight: 700 },
  savingsPill: {
    fontSize: 10.5, fontWeight: 800, color: "var(--violet)",
    background: "color-mix(in srgb, var(--violet) 18%, transparent)",
    border: "1px solid color-mix(in srgb, var(--violet) 35%, transparent)",
    borderRadius: 99, padding: "3px 9px", fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap",
  },
};
