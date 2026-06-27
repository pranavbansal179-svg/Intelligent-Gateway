import threading
import time

import numpy as np
from sentence_transformers import SentenceTransformer

_SIMILARITY_THRESHOLD = 0.87
_MODEL_NAME = "all-MiniLM-L6-v2"  # ~22 MB, no API key needed


class SemanticCache:
    """
    Global semantic cache. Stores LLM answers keyed by meaning, not exact text.
    Uses cosine similarity on sentence embeddings so paraphrases ("What is an NDA?"
    vs "Define a Non-Disclosure Agreement") resolve to the same cached answer.
    """

    def __init__(self, threshold: float = _SIMILARITY_THRESHOLD):
        self._model = SentenceTransformer(_MODEL_NAME)
        self._entries: list[dict] = []
        self._lock = threading.Lock()
        self._threshold = threshold

    def _encode(self, text: str) -> np.ndarray:
        return self._model.encode(text, normalize_embeddings=True)

    def lookup(self, query: str) -> dict | None:
        """Return a cached entry if a semantically similar query was seen before."""
        if not self._entries:
            return None
        q_emb = self._encode(query)
        with self._lock:
            best_sim, best_entry = 0.0, None
            for entry in self._entries:
                sim = float(np.dot(q_emb, entry["embedding"]))
                if sim > best_sim:
                    best_sim, best_entry = sim, entry
        if best_sim >= self._threshold:
            return best_entry
        return None

    def store(
        self,
        query: str,
        answer: str,
        model: str,
        routing_reason: str,
        call_cost: float,
        naive_cost: float,
    ) -> None:
        emb = self._encode(query)
        with self._lock:
            self._entries.append({
                "embedding": emb,
                "query": query,
                "answer": answer,
                "model": model,
                "routing_reason": routing_reason,
                "call_cost": call_cost,
                "naive_cost": naive_cost,
                "ts": time.time(),
            })

    @property
    def size(self) -> int:
        return len(self._entries)
