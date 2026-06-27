import os
from dotenv import load_dotenv
from otari import AsyncOtariClient

load_dotenv()


def _make_client() -> AsyncOtariClient:
    """
    Create an AsyncOtariClient using the platform token from .env.
    The SDK defaults to https://api.otari.ai — no base URL needed.
    """
    token = os.getenv("OTARI_API_KEY", "")
    return AsyncOtariClient(platform_token=token)


class OtariClient:
    def __init__(self):
        self.api_key = os.getenv("OTARI_API_KEY", "")

    async def chat(
        self,
        model: str,
        messages: list,
        guardrail_profile: str | None = None,
        max_tokens: int = 1024,
    ) -> dict:
        """
        Send a chat completion via the official Otari SDK.
        Returns an OpenAI-compatible response dict.
        guardrail_profile is reserved for future use (Otari guardrails are
        handled as a 'guardrails' field in the request, but we omit it here
        to avoid 502s when the service isn't configured).
        """
        async with _make_client() as client:
            response = await client.completion(
                model=model,
                messages=messages,
                max_tokens=max_tokens,
            )
            # SDK returns a typed object — convert to dict for compatibility
            return response.model_dump()

    async def get_usage(self, session_id: str) -> dict:
        """
        Fetch current spend. Falls back to 0.0 on any error so budget
        tracking degrades gracefully.
        """
        try:
            async with _make_client() as client:
                usage = await client.usage()
                # Response shape varies — try common fields
                data = usage.model_dump() if hasattr(usage, "model_dump") else {}
                spent = (
                    data.get("total_cost")
                    or data.get("spent")
                    or data.get("cost")
                    or 0.0
                )
                return {"spent": float(spent)}
        except Exception:
            return {"spent": 0.0}


# ---------------------------------------------------------------------------
# Test utility
# ---------------------------------------------------------------------------
def test_connection():
    """Run with:  python backend/otari_client.py"""
    import asyncio
    import json

    async def _run():
        client = OtariClient()
        key = client.api_key
        print(f"API Key : {'*' * max(0, len(key) - 4)}{key[-4:] if key else '(not set)'}")
        print("-" * 60)
        try:
            result = await client.chat(
                model="openai:gpt-4o-mini",
                messages=[{"role": "user", "content": "ping"}],
            )
            answer = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            print(f"✅ Response: {answer[:100]}")
        except Exception as e:
            print(f"❌ Error: {e}")

    asyncio.run(_run())


if __name__ == "__main__":
    test_connection()
