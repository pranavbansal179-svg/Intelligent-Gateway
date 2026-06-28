"""
Fetch recent headlines from Yahoo Finance RSS — no API key needed.
Injected into Tier-3 prompts to ground LLM reasoning in current events.
"""
import asyncio
import logging
import xml.etree.ElementTree as ET
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

_RSS_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"
_TIMEOUT = 3.0  # seconds per ticker


async def _fetch_headlines(ticker: str, limit: int = 2) -> list[str]:
    url = _RSS_URL.format(ticker=ticker)
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as http:
            resp = await http.get(url, follow_redirects=True)
            resp.raise_for_status()
            root = ET.fromstring(resp.text)
            headlines = []
            for item in root.findall(".//item")[:limit]:
                title = item.findtext("title", "").strip()
                if title:
                    headlines.append(title)
            return headlines
    except Exception as e:
        logger.warning("NEWS fetch failed | ticker=%s | error=%s", ticker, e)
        return []


async def fetch_news_context(tickers: list[str], per_ticker: int = 2) -> Optional[str]:
    """
    Concurrently fetch headlines for up to 3 tickers.
    Returns a formatted block or None if no headlines retrieved.
    """
    if not tickers:
        return None

    limited = tickers[:3]
    results = await asyncio.gather(*[_fetch_headlines(t, per_ticker) for t in limited])

    lines = ["[Recent News Headlines]"]
    for ticker, headlines in zip(limited, results):
        for h in headlines:
            lines.append(f"  [{ticker}] {h}")

    if len(lines) <= 1:
        return None
    return "\n".join(lines)
