"""
Real-time stock price lookup via yfinance (no API key required).
Called before the LLM when the user asks about a share price.
"""

import re
import logging
from typing import Optional

import yfinance as yf

logger = logging.getLogger(__name__)

# Common company name → ticker mappings (lowercase keys)
_NAME_TO_TICKER: dict[str, str] = {
    "apple": "AAPL",
    "microsoft": "MSFT",
    "google": "GOOGL",
    "alphabet": "GOOGL",
    "amazon": "AMZN",
    "meta": "META",
    "facebook": "META",
    "tesla": "TSLA",
    "nvidia": "NVDA",
    "netflix": "NFLX",
    "reliance": "RELIANCE.NS",
    "tcs": "TCS.NS",
    "infosys": "INFY.NS",
    "wipro": "WIPRO.NS",
    "hdfc": "HDFCBANK.NS",
    "icici": "ICICIBANK.NS",
    "sbi": "SBIN.NS",
    "bajaj": "BAJFINANCE.NS",
    "tata motors": "TATAMOTORS.NS",
    "maruti": "MARUTI.NS",
    "adani": "ADANIENT.NS",
    "zomato": "ZOMATO.NS",
    "paytm": "PAYTM.NS",
}

# Patterns that indicate the user wants a current price
_PRICE_PATTERNS = [
    r"\bprice\b",
    r"\btrading at\b",
    r"\bstock price\b",
    r"\bshare price\b",
    r"\bcurrent (?:price|value)\b",
    r"\bhow much (?:is|are|does)\b",
    r"\bwhat(?:'s| is) .{0,30}(?:trading|worth|at)\b",
    r"\bquote\b",
    r"\bmarket (?:cap|value|price)\b",
]

_PRICE_RE = re.compile("|".join(_PRICE_PATTERNS), re.IGNORECASE)
# Ticker: 1–5 uppercase letters, optionally with .NS / .BSE suffix
_TICKER_RE = re.compile(r"\b([A-Z]{1,5}(?:\.(?:NS|BSE|BO))?)\b")

# Portfolio query patterns
_PORTFOLIO_PATTERNS = [
    r"\bi own\b",
    r"\bi hold\b",
    r"\bmy portfolio\b",
    r"\bmy holdings?\b",
    r"\bmy stocks?\b",
    r"\banalyze my\b",
    r"\breview my (?:portfolio|holdings?|stocks?|positions?)\b",
    r"\bportfolio (?:of|with|has|contains|includes|review|analysis)\b",
    r"\bmy positions?\b",
]
_PORTFOLIO_RE = re.compile("|".join(_PORTFOLIO_PATTERNS), re.IGNORECASE)

# Common English words that look like tickers — excluded from symbol extraction
_TICKER_EXCLUDE = {
    "I", "A", "AN", "AM", "AT", "BE", "BY", "DO", "GO", "IF", "IN",
    "IS", "IT", "ME", "MY", "NO", "OF", "ON", "OR", "SO", "TO", "UP",
    "US", "WE", "AND", "ARE", "BUT", "FOR", "NOT", "THE", "YOU", "CAN",
    "GET", "HAS", "HIM", "HIS", "HOW", "ITS", "MAY", "OUR", "OUT",
    "WHO", "WHY", "WILL", "WITH", "WHAT", "WHEN", "THEN", "FROM",
    "ROTH", "IRA", "APR", "ROI", "ETF", "SIP", "EMI",
}


def is_stock_price_query(message: str) -> bool:
    return bool(_PRICE_RE.search(message))


def is_portfolio_query(message: str) -> bool:
    return bool(_PORTFOLIO_RE.search(message))


def _extract_ticker(message: str) -> Optional[str]:
    lower = message.lower()
    for name, ticker in _NAME_TO_TICKER.items():
        if name in lower:
            return ticker

    matches = _TICKER_RE.findall(message)
    for m in matches:
        if m not in _TICKER_EXCLUDE:
            return m

    return None


def extract_all_tickers(message: str) -> list[str]:
    """Return all unique tickers detected in a message (company names + symbols)."""
    tickers: list[str] = []
    seen: set[str] = set()
    lower = message.lower()

    for name, ticker in _NAME_TO_TICKER.items():
        if name in lower and ticker not in seen:
            tickers.append(ticker)
            seen.add(ticker)

    for m in _TICKER_RE.findall(message):
        if m not in _TICKER_EXCLUDE and m not in seen:
            tickers.append(m)
            seen.add(m)

    return tickers


def fetch_portfolio_context(message: str) -> Optional[str]:
    """
    Fetch live prices for all tickers mentioned in a portfolio query.
    Returns a multi-line context block or None if no tickers found.
    """
    tickers = extract_all_tickers(message)
    if not tickers:
        return None

    lines = ["[Live Portfolio Data — fetched right now]"]
    fetched = 0
    for sym in tickers[:8]:  # cap at 8 to avoid slow requests
        try:
            t = yf.Ticker(sym)
            info = t.fast_info
            price = getattr(info, "last_price", None)
            if price is None:
                continue
            prev = getattr(info, "previous_close", None)
            currency = getattr(info, "currency", "USD")
            year_high = getattr(info, "year_high", None)
            year_low = getattr(info, "year_low", None)

            line = f"  {sym}: {price:.2f} {currency}"
            if prev:
                chg_pct = (price - prev) / prev * 100
                sign = "+" if chg_pct >= 0 else ""
                line += f" ({sign}{chg_pct:.2f}% today)"
            if year_low and year_high:
                line += f" | 52w: {year_low:.2f}–{year_high:.2f}"
            lines.append(line)
            fetched += 1
            logger.info("PORTFOLIO | ticker=%s | price=%.2f %s", sym, price, currency)
        except Exception as e:
            logger.warning("PORTFOLIO fetch failed | ticker=%s | error=%s", sym, e)

    if fetched == 0:
        return None
    return "\n".join(lines)


def fetch_price_context(message: str) -> Optional[str]:
    """
    Returns a string like:
      '[Live data] AAPL (Apple Inc.) — Current price: $189.42 USD | Change: +1.23 (+0.65%) |
       52w range: $164.08–$199.62'
    Returns None if no ticker found or fetch fails.
    """
    if not is_stock_price_query(message):
        return None

    ticker_sym = _extract_ticker(message)
    if not ticker_sym:
        return None

    try:
        t = yf.Ticker(ticker_sym)
        info = t.fast_info  # lightweight, no full info call

        price = getattr(info, "last_price", None)
        prev_close = getattr(info, "previous_close", None)
        currency = getattr(info, "currency", "USD")
        year_high = getattr(info, "year_high", None)
        year_low = getattr(info, "year_low", None)

        # Fallback to full info for company name
        name = ticker_sym
        try:
            full = t.info
            name = full.get("shortName") or full.get("longName") or ticker_sym
        except Exception:
            pass

        if price is None:
            return None

        change = (price - prev_close) if prev_close else None
        change_pct = (change / prev_close * 100) if (change is not None and prev_close) else None

        parts = [f"[Live market data as of right now]"]
        parts.append(f"{ticker_sym} ({name})")
        parts.append(f"Current price: {price:.2f} {currency}")
        if change is not None:
            sign = "+" if change >= 0 else ""
            parts.append(f"Change: {sign}{change:.2f} ({sign}{change_pct:.2f}%)")
        if year_low and year_high:
            parts.append(f"52-week range: {year_low:.2f}–{year_high:.2f} {currency}")

        context = " | ".join(parts)
        logger.info("STOCK | ticker=%s | price=%.2f %s", ticker_sym, price, currency)
        return context

    except Exception as e:
        logger.warning("STOCK fetch failed | ticker=%s | error=%s", ticker_sym, e)
        return None
