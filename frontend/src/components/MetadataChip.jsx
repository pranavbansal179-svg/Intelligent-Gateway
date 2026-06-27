/**
 * @param {{ model: string, reason: string, cost: number }} props
 */
export default function MetadataChip({ model, reason, cost }) {
  return (
    <div style={styles.row}>
      <span style={styles.chip}>{model}</span>
      <span style={styles.dot}>·</span>
      <span style={styles.text}>{reason}</span>
      <span style={styles.dot}>·</span>
      <span style={{ ...styles.text, fontVariantNumeric: "tabular-nums" }}>
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
  chip: {
    fontSize: 11,
    color: "#00C896",
    background: "#00C89622",
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
