import MetadataChip from "./MetadataChip";

/**
 * @param {{
 *   role: "user"|"assistant",
 *   content: string,
 *   metadata?: { model: string, reason: string, cost: number },
 *   blocked?: boolean
 * }} props
 */
export default function MessageBubble({ role, content, metadata, blocked }) {
  const isUser = role === "user";

  return (
    <div style={{ ...styles.wrapper, justifyContent: isUser ? "flex-end" : "flex-start" }}>
      {!isUser && (
        <div style={styles.avatar}>
          <span style={styles.avatarText}>O</span>
        </div>
      )}
      <div style={{ maxWidth: "72%" }}>
        <div
          style={{
            ...styles.bubble,
            ...(isUser ? styles.userBubble : styles.assistantBubble),
            ...(blocked ? styles.blockedBubble : {}),
          }}
        >
          {blocked && <span style={styles.blockedIcon}>🛡 </span>}
          <span style={styles.content}>{content}</span>
        </div>
        {!isUser && metadata && !blocked && (
          <MetadataChip
            model={metadata.model}
            reason={metadata.reason}
            cost={metadata.cost}
            cacheHit={metadata.cacheHit}
          />
        )}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    marginBottom: 18,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#00C89622",
    border: "1px solid #00C89640",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarText: {
    color: "#00C896",
    fontWeight: 800,
    fontSize: 13,
  },
  bubble: {
    padding: "12px 16px",
    borderRadius: 14,
    lineHeight: 1.6,
    fontSize: 14,
    color: "#E6EDF3",
    wordBreak: "break-word",
  },
  userBubble: {
    background: "#00C896",
    color: "#0D0F14",
    borderBottomRightRadius: 4,
    fontWeight: 500,
  },
  assistantBubble: {
    background: "#161B22",
    border: "1px solid #21262D",
    borderBottomLeftRadius: 4,
  },
  blockedBubble: {
    background: "#DA363322",
    border: "1px solid #DA363355",
    color: "#E6EDF3",
  },
  blockedIcon: {
    marginRight: 4,
  },
  content: {
    whiteSpace: "pre-wrap",
  },
};
