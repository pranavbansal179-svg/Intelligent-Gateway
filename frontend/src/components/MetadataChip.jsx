const MODEL_LABELS = {
  "mzai:Qwen/Qwen3-30B-A3B-Instruct-2507": "Qwen3-30B",
  "mzai:meta-llama/Llama-3.3-70B-Instruct": "Llama-3.3-70B",
  "mzai:NousResearch/Hermes-4-70B": "Hermes-4-70B",
};

const TIER_COLORS = {
  "1": "#00C896",
  "2": "#F0C040",
  "3": "#F0A500",
};

/**
 * @param {{ model: string, reason: string, cost: number, cacheHit?: boolean, wasOptimized?: boolean, originalTokens?: number, optimizedTokens?: number }} props
 */
export default function MetadataChip({ model, reason, cost, cacheHit, wasOptimized, originalTokens, optimizedTokens }) {
  if (cacheHit) {
    return (
      <div style={styles.root}>
        <div style={styles.row}>
          <span style={{ ...styles.tierBadge, color: "#00C896", background: "#00C89622", borderColor: "#00C89644" }}>
            ⚡ CACHED
          </span>
          <span style={styles.dot}>·</span>
          <span style={styles.text}>semantic match · served instantly</span>
          <span style={styles.dot}>·</span>
          <span style={{ ...styles.text, fontVariantNumeric: "tabular-nums", color: "#00C896" }}>
            $0.0000
          </span>
        </div>
      </div>
    );
  }

  const label = MODEL_LABELS[model] ?? model.replace(/^mzai:/, "").split("/").pop();
  const tier = reason.match(/Tier (\d)/i)?.[1];
  const tierColor = TIER_COLORS[tier] ?? "#00C896";
  const savedPct = wasOptimized && originalTokens > 0
    ? Math.round((1 - optimizedTokens / originalTokens) * 100)
    : 0;
  const tokensSaved = (originalTokens ?? 0) - (optimizedTokens ?? 0);

  return (
    <div style={styles.root}>
      {/* Row 1: tier · model · reason · cost */}
      <div style={styles.row}>
        {tier && (
          <span style={{ ...styles.tierBadge, color: tierColor, background: tierColor + "22", borderColor: tierColor + "44" }}>
            T{tier}
          </span>
        )}
        <span style={{ ...styles.chip, color: tierColor, background: tierColor + "18" }}>{label}</span>
        <span style={styles.dot}>·</span>
        <span style={styles.text}>{reason}</span>
        <span style={styles.dot}>·</span>
        <span style={{ ...styles.text, fontVariantNumeric: "tabular-nums", color: "#00C896" }}>
          ${(cost ?? 0).toFixed(4)}
        </span>
      </div>

      {/* Row 2: optimizer banner (only when compression happened) */}
      {wasOptimized && savedPct > 0 && (
        <div style={styles.optimizerBanner}>
          <div style={styles.optimizerLeft}>
            <span style={styles.optimizerIcon}>✦</span>
            <span style={styles.optimizerLabel}>Prompt optimized</span>
          </div>
          <div style={styles.optimizerStats}>
            <span style={styles.statBlock}>
              <span style={styles.statValue}>{originalTokens}</span>
              <span style={styles.statUnit}>tokens in</span>
            </span>
            <span style={styles.arrow}>→</span>
            <span style={styles.statBlock}>
              <span style={{ ...styles.statValue, color: "#A78BFA" }}>{optimizedTokens}</span>
              <span style={styles.statUnit}>tokens sent</span>
            </span>
            <span style={styles.savingsPill}>
              −{tokensSaved} tok · {savedPct}% saved
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
    marginTop: 6,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  tierBadge: {
    fontSize: 10,
    fontWeight: 800,
    padding: "1px 6px",
    borderRadius: 99,
    border: "1px solid",
    letterSpacing: "0.05em",
  },
  chip: {
    fontSize: 11,
    padding: "2px 7px",
    borderRadius: 99,
    fontWeight: 600,
    letterSpacing: "0.03em",
  },
  dot: {
    color: "#3D444D",
    fontSize: 12,
  },
  text: {
    fontSize: 11,
    color: "#7D8590",
  },

  // Optimizer banner
  optimizerBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "5px 10px",
    background: "linear-gradient(90deg, #A78BFA12, #7C3AED08)",
    border: "1px solid #A78BFA33",
    borderRadius: 8,
    flexWrap: "wrap",
  },
  optimizerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
  optimizerIcon: {
    color: "#A78BFA",
    fontSize: 11,
  },
  optimizerLabel: {
    color: "#A78BFA",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.03em",
  },
  optimizerStats: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  statBlock: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    lineHeight: 1.2,
  },
  statValue: {
    fontSize: 13,
    fontWeight: 800,
    color: "#E6EDF3",
    fontVariantNumeric: "tabular-nums",
  },
  statUnit: {
    fontSize: 9,
    color: "#7D8590",
    letterSpacing: "0.03em",
    textTransform: "uppercase",
  },
  arrow: {
    color: "#A78BFA",
    fontSize: 13,
    fontWeight: 700,
  },
  savingsPill: {
    fontSize: 10,
    fontWeight: 700,
    color: "#A78BFA",
    background: "#A78BFA22",
    border: "1px solid #A78BFA44",
    borderRadius: 99,
    padding: "2px 8px",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  },
};
