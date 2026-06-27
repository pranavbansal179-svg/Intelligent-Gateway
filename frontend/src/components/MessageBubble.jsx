import MetadataChip from "./MetadataChip";

/**
 * Lightweight markdown-ish renderer for assistant text.
 * Handles ### headings, **bold**, and bullet lines — enough to make
 * Tier 3 structured plans look clean without a full markdown dep.
 */
function renderContent(text) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const key = `l${i}`;
    const trimmed = line.trim();

    if (!trimmed) return <div key={key} style={{ height: 8 }} />;

    // Headings
    if (/^#{1,6}\s/.test(trimmed)) {
      const level = trimmed.match(/^(#+)/)[1].length;
      const txt = trimmed.replace(/^#+\s/, "");
      return (
        <div key={key} style={{
          fontSize: level <= 2 ? 17 : 15,
          fontWeight: 700,
          color: "var(--text-hi)",
          margin: "14px 0 6px",
          letterSpacing: "-0.015em",
        }}>{inline(txt)}</div>
      );
    }

    // Bullets
    if (/^[-*•]\s/.test(trimmed)) {
      return (
        <div key={key} style={{ display: "flex", gap: 8, margin: "3px 0", alignItems: "flex-start" }}>
          <span style={{ color: "var(--teal)", marginTop: 1, flexShrink: 0 }}>▸</span>
          <span>{inline(trimmed.replace(/^[-*•]\s/, ""))}</span>
        </div>
      );
    }

    // Numbered
    if (/^\d+\.\s/.test(trimmed)) {
      const num = trimmed.match(/^(\d+)\./)[1];
      return (
        <div key={key} style={{ display: "flex", gap: 8, margin: "3px 0", alignItems: "flex-start" }}>
          <span style={{ color: "var(--violet)", fontWeight: 700, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{num}.</span>
          <span>{inline(trimmed.replace(/^\d+\.\s/, ""))}</span>
        </div>
      );
    }

    return <div key={key} style={{ margin: "2px 0" }}>{inline(trimmed)}</div>;
  });
}

/** Inline: **bold** + `code` */
function inline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} style={{ color: "var(--text-hi)", fontWeight: 700 }}>{p.slice(2, -2)}</strong>;
    if (/^`[^`]+`$/.test(p)) return <code key={i} style={{
      fontFamily: "'JetBrains Mono', monospace", fontSize: "0.86em",
      background: "rgba(10, 125, 217, 0.1)", padding: "2px 7px", borderRadius: 4, color: "var(--blue)", fontWeight: 500,
    }}>{p.slice(1, -1)}</code>;
    return p;
  });
}

/**
 * @param {{ role: "user"|"assistant", content: string, metadata?: object, blocked?: boolean }} props
 */
export default function MessageBubble({ role, content, metadata, blocked }) {
  const isUser = role === "user";

  return (
    <div style={{ ...styles.wrapper, justifyContent: isUser ? "flex-end" : "flex-start" }} className="msg-in">
      {!isUser && (
        <div style={styles.avatar}>
          <span style={styles.avatarText}>O</span>
        </div>
      )}
      <div style={{ maxWidth: "76%", display: "flex", flexDirection: "column", alignItems: isUser ? "flex-end" : "flex-start" }}>
        <div
          style={{
            ...styles.bubble,
            ...(isUser ? styles.userBubble : styles.assistantBubble),
            ...(blocked ? styles.blockedBubble : {}),
          }}
        >
          {blocked && (
            <div style={styles.blockedHeader}>
              <span style={styles.shield}>🛡</span> Blocked by injection guard
            </div>
          )}
          <div style={isUser ? styles.contentUser : styles.content}>
            {isUser ? content : renderContent(content)}
          </div>
        </div>
        {!isUser && metadata && !blocked && (
          <MetadataChip
            model={metadata.model}
            reason={metadata.reason}
            cost={metadata.cost}
            cacheHit={metadata.cacheHit}
            wasOptimized={metadata.wasOptimized}
            originalTokens={metadata.originalTokens}
            optimizedTokens={metadata.optimizedTokens}
            latencyMs={metadata.latencyMs}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 24 },
  avatar: {
    width: 36, height: 36, borderRadius: 10, flexShrink: 0, marginTop: 2,
    background: "linear-gradient(135deg, rgba(10, 125, 217, 0.08), rgba(91, 98, 255, 0.06))",
    border: "1px solid rgba(10, 125, 217, 0.12)", display: "flex", alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "var(--blue)", fontWeight: 700, fontSize: 13 },
  bubble: {
    padding: "14px 18px", borderRadius: 12, lineHeight: 1.7, fontSize: 14.5,
    color: "var(--text-hi)", wordBreak: "break-word", fontWeight: 450,
  },
  userBubble: {
    background: "var(--grad-primary)", color: "var(--on-primary)", borderBottomRightRadius: 4,
    fontWeight: 500, boxShadow: "0 0 14px rgba(10, 125, 217, 0.22)",
  },
  assistantBubble: {
    background: "rgba(255, 255, 255, 0.65)", border: "1px solid rgba(10, 125, 217, 0.1)",
    borderBottomLeftRadius: 4, boxShadow: "0 2px 8px rgba(10, 14, 39, 0.1)",
    color: "var(--text-hi)",
  },
  blockedBubble: {
    background: "color-mix(in srgb, var(--rose) 10%, rgba(255, 255, 255, 0.8))",
    border: "1px solid color-mix(in srgb, var(--rose) 30%, transparent)",
  },
  blockedHeader: {
    display: "flex", alignItems: "center", gap: 6, color: "var(--rose)",
    fontWeight: 700, fontSize: 13, marginBottom: 6,
  },
  shield: { fontSize: 14 },
  content: {},
  contentUser: { whiteSpace: "pre-wrap" },
};
