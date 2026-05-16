import httpx
import time
from typing import Dict, Optional

_cache: Dict[str, float] = {}
_cache_time: float = 0
_CACHE_TTL = 3600  # 1 hour

SUPPORTED_CURRENCIES = ["USD", "CAD", "INR", "EUR", "GBP", "CNY", "JPY", "AED"]

async def get_exchange_rates(base: str = "USD") -> Dict[str, float]:
    """
    Fetch exchange rates from a free API. Returns rates relative to base currency.
    Uses frankfurter.app (free, no API key, supports major currencies).
    """
    global _cache, _cache_time

    cache_key = base
    if _cache and time.time() - _cache_time < _CACHE_TTL and cache_key in str(_cache):
        return _cache

    targets = ",".join(c for c in SUPPORTED_CURRENCIES if c != base)
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://api.frankfurter.app/latest?from={base}&to={targets}",
                timeout=10.0
            )
            resp.raise_for_status()
            data = resp.json()
            rates = data.get("rates", {})
            rates[base] = 1.0
            _cache = rates
            _cache_time = time.time()
            return rates
    except Exception:
        # Fallback: approximate rates if API is down
        fallback = {
            "USD": 1.0, "CAD": 1.37, "INR": 83.5, "EUR": 0.92,
            "GBP": 0.79, "CNY": 7.24, "JPY": 155.0, "AED": 3.67
        }
        if base == "USD":
            return fallback
        base_in_usd = fallback.get(base, 1.0)
        return {k: v / base_in_usd for k, v in fallback.items()}


def convert_amount(amount: float, from_currency: str, to_currency: str, rates: Dict[str, float]) -> float:
    """Convert an amount between currencies given rates relative to a base."""
    if from_currency == to_currency:
        return amount
    # rates are relative to whatever base was used to fetch them
    # If rates base is 'to_currency', then: result = amount * rates[from_currency] would be wrong
    # rates[X] = how much of X you get for 1 unit of base
    # To convert from_currency -> to_currency:
    # amount_in_base = amount / rates[from_currency]
    # amount_in_target = amount_in_base * rates[to_currency]
    from_rate = rates.get(from_currency, 1.0)
    to_rate = rates.get(to_currency, 1.0)
    if from_rate == 0:
        return amount
    return amount / from_rate * to_rate
