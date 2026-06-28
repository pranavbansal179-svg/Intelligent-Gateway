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
export default function MessageBubble({ role, content, metadata, blocked, isStreaming }) {
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
              <span style={styles.shield}>🛡</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Blocked by injection guard</div>
                <div style={{ fontSize: 11.5, fontWeight: 400, color: "var(--text-mid)", marginTop: 2 }}>
                  This message tried to override the assistant's instructions. The request was not sent to any LLM.
                </div>
              </div>
            </div>
          )}
          <div style={isUser ? styles.contentUser : styles.content}>
            {isUser ? content : (
              <>
                {content ? renderContent(content) : (
                  isStreaming && <span style={{ color: "var(--text-dim)" }}>Thinking…</span>
                )}
                {isStreaming && <span className="stream-cursor" />}
              </>
            )}
          </div>
        </div>
        {!isUser && metadata && !blocked && !isStreaming && (
          <MetadataChip
            model={metadata.model}
            reason={metadata.reason}
            cost={metadata.cost}
            cacheHit={metadata.cacheHit}
            wasOptimized={metadata.wasOptimized}
            originalTokens={metadata.originalTokens}
            optimizedTokens={metadata.optimizedTokens}
            latencyMs={metadata.latencyMs}
            pipelineTrace={metadata.pipelineTrace ?? []}
            portfolioAnalyzed={metadata.portfolioAnalyzed ?? false}
            newsInjected={metadata.newsInjected ?? false}
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
    background: "linear-gradient(135deg, #EEF3FF, #DDEAFF)",
    border: "1px solid rgba(45, 91, 255, 0.16)", display: "flex", alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "var(--blue)", fontWeight: 800, fontSize: 14 },
  bubble: {
    padding: "14px 18px", borderRadius: 18, lineHeight: 1.7, fontSize: 14.5,
    color: "var(--text-hi)", wordBreak: "break-word",
  },
  userBubble: {
    background: "var(--grad-primary)", color: "var(--on-primary)", borderBottomRightRadius: 5,
    fontWeight: 500, boxShadow: "0 4px 14px rgba(45, 91, 255, 0.28)",
  },
  assistantBubble: {
    background: "var(--bg-1)", border: "1px solid var(--border)",
    borderBottomLeftRadius: 5, boxShadow: "var(--shadow-sm)",
    color: "var(--text-hi)",
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
