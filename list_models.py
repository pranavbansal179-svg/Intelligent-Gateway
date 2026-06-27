import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    from otari import AsyncOtariClient
    token = os.getenv("OTARI_API_KEY", "")
    async with AsyncOtariClient(platform_token=token) as client:
        models = await client.list_models()
        print("\nAll available models:")
        for m in models:
            print(" ", m.id)

asyncio.run(main())
