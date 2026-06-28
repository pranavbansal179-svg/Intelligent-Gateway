import { useState } from "react";

const MODEL_LABELS = {
  "mzai:Qwen/Qwen3-30B-A3B-Instruct-2507": "Qwen3-30B",
  "mzai:meta-llama/Llama-3.3-70B-Instruct": "Llama-3.3-70B",
  "mzai:NousResearch/Hermes-4-70B": "Hermes-4-70B",
};

const TIER_META = {
  "1": { color: "var(--t1)", name: "Fast model", why: "Classified as a simple question — routed to the fastest, cheapest model." },
  "2": { color: "var(--t2)", name: "Mid-tier model", why: "Moderate complexity detected — routed to a balanced model for better reasoning." },
  "3": { color: "var(--t3)", name: "Frontier model", why: "High complexity detected — escalated to the most capable model for detailed analysis." },
};

/* Decision → { icon, color } */
const DECISION_STYLE = {
  passed:     { icon: "✓", color: "var(--teal)" },
  approved:   { icon: "✓", color: "var(--teal)" },
  completed:  { icon: "✓", color: "var(--teal)" },
  hit:        { icon: "⚡", color: "var(--teal)" },
  injected:   { icon: "↓", color: "var(--blue)" },
  compressed: { icon: "↓", color: "var(--violet)" },
  miss:       { icon: "–", color: "var(--text-dim)" },
  skipped:    { icon: "–", color: "var(--text-dim)" },
  blocked:    { icon: "✕", color: "var(--rose)" },
  downgraded: { icon: "↓", color: "var(--amber)" },
};

function getDecisionStyle(decision) {
  if (decision?.startsWith("tier_")) return { icon: "◆", color: "var(--blue)" };
  return DECISION_STYLE[decision] ?? { icon: "·", color: "var(--text-dim)" };
}

function fmt(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

/* ── Pipeline Trace ── */
function PipelineTrace({ steps, totalMs }) {
  const [open, setOpen] = useState(false);
  if (!steps || steps.length === 0) return null;

  const stepCount = steps.length;
  const blocked = steps.some(s => s.decision === "blocked");

  return (
    <div style={traceStyles.wrapper}>
      <button style={traceStyles.toggle} onClick={() => setOpen(o => !o)}>
        <span style={traceStyles.toggleLeft}>
          <span style={{ ...traceStyles.toggleDot, background: blocked ? "var(--rose)" : "var(--teal)" }} />
          <span style={traceStyles.toggleLabel}>
            {stepCount} agent step{stepCount !== 1 ? "s" : ""}
          </span>
          <span style={traceStyles.toggleTime}>{fmt(totalMs)} total</span>
        </span>
        <span style={{ ...traceStyles.chevron, transform: open ? "rotate(180deg)" : "none" }}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </button>

      {open && (
        <div style={traceStyles.panel}>
          {steps.map((s, i) => {
            const ds = getDecisionStyle(s.decision);
            const isLast = i === steps.length - 1;
            return (
              <div key={i} style={{ ...traceStyles.row, borderBottom: isLast ? "none" : "1px solid var(--border-soft)" }}>
                {/* connector line */}
                <div style={traceStyles.connectorCol}>
                  <span style={{ ...traceStyles.stepIcon, color: ds.color }}>{ds.icon}</span>
                  {!isLast && <span style={traceStyles.connector} />}
                </div>
                {/* content */}
                <div style={traceStyles.rowContent}>
                  <div style={traceStyles.rowHeader}>
                    <span style={traceStyles.stepLabel}>{s.label}</span>
                    <span style={{ ...traceStyles.decisionBadge, color: ds.color, background: `color-mix(in srgb, ${ds.color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${ds.color} 22%, transparent)` }}>
                      {s.decision}
                    </span>
                    <span style={traceStyles.stepMs}>{fmt(s.ms)}</span>
                  </div>
                  <p style={traceStyles.stepDetail}>{s.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Main component ── */
export default function MetadataChip({
  model, reason, cost, cacheHit, wasOptimized,
  originalTokens, optimizedTokens, latencyMs, pipelineTrace = [],
  portfolioAnalyzed, newsInjected,
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
              <> Served in <strong>{fmt(latencyMs)}</strong> instead of ~{fmt(typicalMs)} for a live call.</>
            )}
          </p>
        </div>
        <PipelineTrace steps={pipelineTrace} totalMs={latencyMs} />
      </div>
    );
  }

  const label = MODEL_LABELS[model] ?? model.replace(/^mzai:/, "").split("/").pop();
  const tier = reason.match(/Tier (\d)/i)?.[1];
  const tm = TIER_META[tier] ?? { color: "var(--teal)", name: "Model", why: reason };
  const tierColor = tm.color;

  const savedPct = wasOptimized && originalTokens > 0
    ? Math.round((1 - optimizedTokens / originalTokens) * 100) : 0;
  const tokensSaved = (originalTokens ?? 0) - (optimizedTokens ?? 0);
  const estCostSaved = tokensSaved > 0 ? (tokensSaved / 1000) * 0.0004 : 0;

  return (
    <div style={styles.root}>
      {/* ── ROUTING CARD ── */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <span style={{ ...styles.iconPill, background: `color-mix(in srgb, ${tierColor} 12%, transparent)`, color: tierColor, border: `1px solid color-mix(in srgb, ${tierColor} 28%, transparent)` }}>
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

      {/* ── PORTFOLIO CARD ── */}
      {portfolioAnalyzed && (
        <div style={{ ...styles.card, borderColor: "color-mix(in srgb, var(--blue) 28%, transparent)" }}>
          <div style={styles.cardHeader}>
            <span style={{ ...styles.iconPill, background: "color-mix(in srgb, var(--blue) 10%, transparent)", color: "var(--blue)", border: "1px solid color-mix(in srgb, var(--blue) 25%, transparent)" }}>
              📊 Portfolio Analyzer
            </span>
          </div>
          <p style={styles.cardTitle}>Live prices fetched for your portfolio</p>
          <p style={styles.cardDesc}>
            All tickers detected in your message had their live prices pulled in real-time and injected into the prompt, then routed to Tier 3 for a structured portfolio review.
          </p>
        </div>
      )}

      {/* ── NEWS CARD ── */}
      {newsInjected && (
        <div style={{ ...styles.card, borderColor: "color-mix(in srgb, var(--amber) 28%, transparent)" }}>
          <div style={styles.cardHeader}>
            <span style={{ ...styles.iconPill, background: "color-mix(in srgb, var(--amber) 10%, transparent)", color: "var(--amber)", border: "1px solid color-mix(in srgb, var(--amber) 25%, transparent)" }}>
              📰 News Injected
            </span>
          </div>
          <p style={styles.cardTitle}>Recent headlines added to context</p>
          <p style={styles.cardDesc}>
            Fresh news headlines from Yahoo Finance were fetched and prepended so the model's advice is grounded in current events, not just training data.
          </p>
        </div>
      )}

      {/* ── OPTIMIZER CARD ── */}
      {wasOptimized && savedPct > 0 && (
        <div style={{ ...styles.card, borderColor: "color-mix(in srgb, var(--violet) 28%, transparent)" }}>
          <div style={styles.cardHeader}>
            <span style={{ ...styles.iconPill, background: "color-mix(in srgb, var(--violet) 10%, transparent)", color: "var(--violet)", border: "1px solid color-mix(in srgb, var(--violet) 25%, transparent)" }}>
              ✦ Prompt optimizer
            </span>
            <span style={styles.headerRight}>
              <span style={{ ...styles.stat, color: "var(--violet)" }}>−{savedPct}% tokens</span>
            </span>
          </div>
          <p style={styles.cardTitle}>Your prompt was compressed before sending</p>
          <p style={styles.cardDesc}>
            Summarized from {originalTokens} tokens down to <strong>{optimizedTokens} tokens</strong> — saving {tokensSaved} tokens without losing the meaning.
            {estCostSaved > 0 && <> Approximately <strong>${estCostSaved.toFixed(5)}</strong> saved on this call.</>}
          </p>
          <div style={styles.tokenBar}>
            <div style={styles.tokenBarTrack}>
              <div style={{ ...styles.tokenBarFill, width: `${(optimizedTokens / originalTokens) * 100}%`, background: `linear-gradient(90deg, var(--violet), color-mix(in srgb, var(--violet) 60%, transparent))` }} />
            </div>
            <div style={styles.tokenBarLabels}>
              <span style={{ color: "var(--text-lo)", fontSize: 10.5 }}>{optimizedTokens} sent</span>
              <span style={{ color: "var(--text-dim)", fontSize: 10.5 }}>of {originalTokens} original</span>
            </div>
          </div>
        </div>
      )}

      {/* ── PIPELINE TRACE ── */}
      <PipelineTrace steps={pipelineTrace} totalMs={latencyMs} />
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
  cardHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  iconPill: {
    display: "inline-flex", alignItems: "center", gap: 5,
    fontSize: 10.5, fontWeight: 700, padding: "3px 10px", borderRadius: 99, letterSpacing: "0.02em",
  },
  dot: { width: 5, height: 5, borderRadius: "50%", flexShrink: 0 },
  headerRight: { display: "flex", alignItems: "center", gap: 8 },
  stat: { fontSize: 11, fontWeight: 700, color: "var(--text-lo)", fontFamily: "'JetBrains Mono', monospace" },
  cardTitle: { fontSize: 13, fontWeight: 700, color: "var(--text-hi)", lineHeight: 1.35 },
  cardDesc: { fontSize: 12, color: "var(--text-mid)", lineHeight: 1.6 },
  tokenBar: { marginTop: 4 },
  tokenBarTrack: { height: 4, background: "var(--bg-4)", borderRadius: 99, overflow: "hidden", marginBottom: 5 },
  tokenBarFill: { height: "100%", borderRadius: 99, transition: "width 0.6s var(--ease)" },
  tokenBarLabels: { display: "flex", justifyContent: "space-between" },
};

const traceStyles = {
  wrapper: { marginTop: 2 },

  toggle: {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "none", border: "1px solid var(--border-soft)", borderRadius: 10,
    padding: "7px 12px", cursor: "pointer", transition: "background 0.15s",
    color: "var(--text-lo)",
  },
  toggleLeft: { display: "flex", alignItems: "center", gap: 8 },
  toggleDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  toggleLabel: { fontSize: 11.5, fontWeight: 600, color: "var(--text-mid)" },
  toggleTime: { fontSize: 10.5, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-dim)" },
  chevron: { color: "var(--text-dim)", transition: "transform 0.2s", display: "flex" },

  panel: {
    marginTop: 4, background: "var(--bg-0)", border: "1px solid var(--border-soft)",
    borderRadius: 10, overflow: "hidden",
  },
  row: {
    display: "flex", gap: 0, padding: "0",
  },
  connectorCol: {
    display: "flex", flexDirection: "column", alignItems: "center",
    width: 32, flexShrink: 0, paddingTop: 10,
  },
  stepIcon: {
    fontSize: 11, fontWeight: 800, lineHeight: 1, width: 18, textAlign: "center", flexShrink: 0,
  },
  connector: {
    width: 1, flex: 1, background: "var(--border-soft)", margin: "3px 0",
  },
  rowContent: {
    flex: 1, padding: "9px 12px 9px 0",
  },
  rowHeader: {
    display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap",
  },
  stepLabel: {
    fontSize: 11.5, fontWeight: 700, color: "var(--text-hi)",
  },
  decisionBadge: {
    fontSize: 9.5, fontWeight: 700, padding: "1px 7px", borderRadius: 99,
    letterSpacing: "0.04em", textTransform: "lowercase",
  },
  stepMs: {
    fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "var(--text-dim)",
    marginLeft: "auto",
  },
  stepDetail: {
    fontSize: 11.5, color: "var(--text-mid)", lineHeight: 1.5, margin: 0,
  },
};
