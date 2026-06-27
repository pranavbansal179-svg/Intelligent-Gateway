import asyncio, os
from dotenv import load_dotenv
load_dotenv()

CANDIDATES = [
    # Exact SDK-example format from Otari catalog
    "mzai:google/gemma-2-2b-it",                      # $0.02 — Tier 1
    "mzai:meta-llama/Meta-Llama-3.1-8B-Instruct",    # $0.02 — Tier 1
    "mzai:meta-llama/Llama-3.3-70B-Instruct",        # $0.13 — Tier 2
    "mzai:deepseek-ai/DeepSeek-V3",                  # $0.30 — Tier 3
    "mzai:deepseek-ai/DeepSeek-V3.2",                # $0.30 — Tier 3
    "mzai:Qwen/Qwen3-30B-A3B-Instruct-2507",         # $0.10 — Tier 2
    "mzai:NousResearch/Hermes-4-70B",                # $0.13 — Tier 2
]

async def main():
    from otari import AsyncOtariClient
    token = os.getenv("OTARI_API_KEY", "")
    async with AsyncOtariClient(platform_token=token) as client:
        for model in CANDIDATES:
            try:
                r = await client.completion(
                    model=model,
                    messages=[{"role": "user", "content": "say hi"}],
                )
                print(f"WORKS: {model}")
            except Exception as e:
                print(f"FAIL:  {model}")
                print(f"       {str(e)}")
                print()

asyncio.run(main())
