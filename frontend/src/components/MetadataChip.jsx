const MODEL_LABELS = {
  "mzai:Qwen/Qwen3-30B-A3B-Instruct-2507": "Qwen3-30B",
  "mzai:meta-llama/Llama-3.3-70B-Instruct": "Llama-3.3-70B",
  "mzai:NousResearch/Hermes-4-70B": "Hermes-4-70B",
};

const TIER_META = {
  "1": {
    color: "var(--t1)",
    name: "Fast model",
    why: "Classified as a simple question — routed to the fastest, cheapest model.",
  },
  "2": {
    color: "var(--t2)",
    name: "Mid-tier model",
    why: "Moderate complexity detected — routed to a balanced model for better reasoning.",
  },
  "3": {
    color: "var(--t3)",
    name: "Frontier model",
    why: "High complexity detected — escalated to the most capable model for detailed analysis.",
  },
};

function fmt(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

export default function MetadataChip({
  model, reason, cost, cacheHit, wasOptimized,
  originalTokens, optimizedTokens, latencyMs,
}) {
  /* ── CACHE HIT ── */
  if (cacheHit) {
    const typicalMs = 3000;
    const savedMs = latencyMs > 0 ? typicalMs - latencyMs : typicalMs;
    return (
      <div style={styles.root}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <span style={{ ...styles.iconPill, background: "color-mix(in srgb, var(--teal) 12%, transparent)", color: "var(--teal)", border: "1px solid color-mix(in srgb, var(--teal) 28%, transparent)" }}>
              ⚡ Semantic cache
            </span>
            <span style={styles.headerRight}>
              {latencyMs > 0 && <span style={styles.stat}>{fmt(latencyMs)}</span>}
              <span style={{ ...styles.stat, color: "var(--teal)" }}>Free</span>
            </span>
          </div>
          <p style={styles.cardTitle}>Answered instantly from cache</p>
          <p style={styles.cardDesc}>
            Your question matched a previous answer semantically — no LLM call was made.
            {latencyMs > 0 && savedMs > 0 && (
              <> Response served in <strong>{fmt(latencyMs)}</strong> instead of ~{fmt(typicalMs)} for a live call.</>
            )}
          </p>
        </div>
      </div>
    );
  }

  const label = MODEL_LABELS[model] ?? model.replace(/^mzai:/, "").split("/").pop();
  const tier = reason.match(/Tier (\d)/i)?.[1];
  const tm = TIER_META[tier] ?? { color: "var(--teal)", name: "Model", why: reason };
  const tierColor = tm.color;

  const savedPct = wasOptimized && originalTokens > 0
    ? Math.round((1 - optimizedTokens / originalTokens) * 100)
    : 0;
  const tokensSaved = (originalTokens ?? 0) - (optimizedTokens ?? 0);
  const estCostSaved = tokensSaved > 0 ? (tokensSaved / 1000) * 0.0004 : 0;

  return (
    <div style={styles.root}>
      {/* ── ROUTING CARD ── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={{
            ...styles.iconPill,
            background: `color-mix(in srgb, ${tierColor} 12%, transparent)`,
            color: tierColor,
            border: `1px solid color-mix(in srgb, ${tierColor} 28%, transparent)`,
          }}>
            <span style={{ ...styles.dot, background: tierColor }} />
            T{tier} · {tm.name}
          </span>
          <span style={styles.headerRight}>
            {latencyMs > 0 && <span style={styles.stat}>{fmt(latencyMs)}</span>}
            <span style={{ ...styles.stat, color: tierColor }}>${(cost ?? 0).toFixed(4)}</span>
          </span>
        </div>
        <p style={styles.cardTitle}>
          Routed to <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{label}</span>
        </p>
        <p style={styles.cardDesc}>{tm.why}</p>
      </div>

      {/* ── OPTIMIZER CARD ── */}
      {wasOptimized && savedPct > 0 && (
        <div style={{ ...styles.card, borderColor: "color-mix(in srgb, var(--violet) 28%, transparent)" }}>
          <div style={styles.cardHeader}>
            <span style={{
              ...styles.iconPill,
              background: "color-mix(in srgb, var(--violet) 10%, transparent)",
              color: "var(--violet)",
              border: "1px solid color-mix(in srgb, var(--violet) 25%, transparent)",
            }}>
              ✦ Prompt optimizer
            </span>
            <span style={styles.headerRight}>
              <span style={{ ...styles.stat, color: "var(--violet)" }}>−{savedPct}% tokens</span>
            </span>
          </div>
          <p style={styles.cardTitle}>Your prompt was compressed before sending</p>
          <p style={styles.cardDesc}>
            The router summarized your {originalTokens}-token prompt down to{" "}
            <strong>{optimizedTokens} tokens</strong> — saving {tokensSaved} tokens without losing
            the meaning of your question.
            {estCostSaved > 0 && (
              <> That's approximately <strong>${estCostSaved.toFixed(5)}</strong> saved on this call.</>
            )}
          </p>
          <div style={styles.tokenBar}>
            <div style={styles.tokenBarTrack}>
              <div style={{
                ...styles.tokenBarFill,
                width: `${(optimizedTokens / originalTokens) * 100}%`,
                background: `linear-gradient(90deg, var(--violet), color-mix(in srgb, var(--violet) 60%, transparent))`,
              }} />
            </div>
            <div style={styles.tokenBarLabels}>
              <span style={{ color: "var(--text-lo)", fontSize: 10.5 }}>
                {optimizedTokens} sent
              </span>
              <span style={{ color: "var(--text-dim)", fontSize: 10.5 }}>
                of {originalTokens} original
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  root: { display: "flex", flexDirection: "column", gap: 6, marginTop: 10 },

  card: {
    padding: "11px 14px", borderRadius: 12,
    background: "var(--bg-0)", border: "1px solid var(--border)",
    display: "flex", flexDirection: "column", gap: 5,
  },
  cardHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
  },
  iconPill: {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
    letterSpacing: "0.02em",
  },
  dot: { width: 5, height: 5, borderRadius: "50%", flexShrink: 0 },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  stat: {
    fontSize: 11, fontWeight: 700, color: "var(--text-lo)",
    fontFamily: "'JetBrains Mono', monospace",
  },

  cardTitle: {
    fontSize: 13, fontWeight: 700, color: "var(--text-hi)", lineHeight: 1.35,
  },
  cardDesc: {
    fontSize: 12, color: "var(--text-mid)", lineHeight: 1.6,
  },

  tokenBar: { marginTop: 4 },
  tokenBarTrack: {
    height: 4, background: "var(--bg-4)", borderRadius: 99, overflow: "hidden", marginBottom: 5,
  },
  tokenBarFill: { height: "100%", borderRadius: 99, transition: "width 0.6s var(--ease)" },
  tokenBarLabels: {
    display: "flex", justifyContent: "space-between",
  },
};
