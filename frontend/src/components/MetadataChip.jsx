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
 * @param {{ model: string, reason: string, cost: number, cacheHit?: boolean }} props
 */
export default function MetadataChip({ model, reason, cost, cacheHit }) {
  if (cacheHit) {
    return (
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
    );
  }

  const label = MODEL_LABELS[model] ?? model.replace(/^mzai:/, "").split("/").pop();
  const tier = reason.match(/Tier (\d)/i)?.[1];
  const tierColor = TIER_COLORS[tier] ?? "#00C896";

  return (
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
  );
}

const styles = {
  row: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
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
};
