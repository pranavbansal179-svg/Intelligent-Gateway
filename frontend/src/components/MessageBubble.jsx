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
          fontSize: level <= 2 ? 16 : 14,
          fontWeight: 800,
          color: "var(--text-hi)",
          margin: "12px 0 4px",
          letterSpacing: "-0.01em",
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
      fontFamily: "'JetBrains Mono', monospace", fontSize: "0.88em",
      background: "var(--bg-3)", padding: "1px 6px", borderRadius: 5, color: "var(--teal)",
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
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: { display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 22 },
  avatar: {
    width: 34, height: 34, borderRadius: 12, flexShrink: 0, marginTop: 2,
    background: "linear-gradient(135deg, rgba(0,229,172,0.22), rgba(132,94,247,0.22))",
    border: "1px solid var(--glass-border-hi)", display: "flex", alignItems: "center",
    justifyContent: "center", boxShadow: "0 0 14px rgba(0,229,172,0.15)",
  },
  avatarText: { color: "var(--teal)", fontWeight: 900, fontSize: 14 },
  bubble: {
    padding: "14px 18px", borderRadius: 18, lineHeight: 1.65, fontSize: 14.5,
    color: "var(--text-hi)", wordBreak: "break-word",
  },
  userBubble: {
    background: "var(--grad-primary)", color: "#04110C", borderBottomRightRadius: 5,
    fontWeight: 500, boxShadow: "0 4px 16px rgba(0,229,172,0.22)",
  },
  assistantBubble: {
    background: "var(--glass-hi)", border: "1px solid var(--glass-border)",
    borderBottomLeftRadius: 5, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    color: "var(--text-mid)",
  },
  blockedBubble: {
    background: "color-mix(in srgb, var(--rose) 12%, var(--glass))",
    border: "1px solid color-mix(in srgb, var(--rose) 35%, transparent)",
  },
  blockedHeader: {
    display: "flex", alignItems: "center", gap: 6, color: "var(--rose)",
    fontWeight: 700, fontSize: 13, marginBottom: 6,
  },
  shield: { fontSize: 14 },
  content: {},
  contentUser: { whiteSpace: "pre-wrap" },
};
