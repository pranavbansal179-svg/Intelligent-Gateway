const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Stream a chat message via SSE.
 * Calls onToken for each text chunk, onDone with the full metadata payload,
 * and onError on any failure.
 */
export async function streamChat(message, sessionId, { onToken, onDone, onError }) {
  let res;
  try {
    res = await fetch(`${BASE_URL}/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId }),
    });
  } catch (e) {
    onError(e);
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail || err;
    if (res.status === 402) {
      const exc = new Error(detail.message || "Budget exhausted");
      exc.code = "budget_exhausted";
      onError(exc);
      return;
    }
    const msg = typeof detail === "object"
      ? (detail.message || detail.error || JSON.stringify(detail))
      : String(detail);
    onError(new Error(`HTTP ${res.status}: ${msg}`));
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const event = JSON.parse(raw);
          if (event.type === "token") onToken(event.text);
          else if (event.type === "done") onDone(event);
        } catch { /* ignore malformed chunk */ }
      }
    }
  } catch (e) {
    onError(e);
  }
}

/**
 * Send a chat message and return the full response object.
 * @param {string} message
 * @param {string} sessionId
 * @returns {Promise<import('./types').ChatResponse>}
 */
export async function sendChat(message, sessionId) {
  const res = await fetch(`${BASE_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail || err;
    if (res.status === 402) {
      const exc = new Error(detail.message || "Budget exhausted");
      exc.code = "budget_exhausted";
      throw exc;
    }
    // Surface the real error message (not just JSON blob)
    const msg = typeof detail === "object"
      ? (detail.message || detail.error || JSON.stringify(detail))
      : String(detail);
    throw new Error(`HTTP ${res.status}: ${msg}`);
  }

  return res.json();
}

/**
 * Classify a prompt without spending budget.
 * @param {string} prompt
 */
export async function classifyPrompt(prompt) {
  const res = await fetch(
    `${BASE_URL}/classify?prompt=${encodeURIComponent(prompt)}`
  );
  if (!res.ok) throw new Error("Classification failed");
  return res.json();
}

/**
 * Fetch current budget status for a session.
 * @param {string} sessionId
 */
export async function getBudget(sessionId) {
  const res = await fetch(`${BASE_URL}/budget/${sessionId}`);
  if (!res.ok) throw new Error("Budget fetch failed");
  return res.json();
}

/**
 * Clear conversation history for a session (starts a fresh chat context).
 * @param {string} sessionId
 */
export async function clearHistory(sessionId) {
  const res = await fetch(`${BASE_URL}/dev/history/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Clear history failed");
  return res.json();
}

/**
 * DEV ONLY — simulate budget spend level.
 * @param {string} sessionId
 * @param {number} spent
 */
export async function devSetBudgetState(sessionId, spent) {
  const res = await fetch(`${BASE_URL}/dev/set-budget-state`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, spent }),
  });
  if (!res.ok) throw new Error("Dev override failed");
  return res.json();
}
