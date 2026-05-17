import yfinance as yf
import time
from typing import Dict, List, Optional

_quote_cache: Dict[str, tuple] = {}
_search_cache: Dict[str, tuple] = {}
_history_cache: Dict[str, tuple] = {}

QUOTE_TTL = 60
SEARCH_TTL = 3600
HISTORY_TTL = 300

EXCHANGE_COUNTRY_MAP = {
    "NYQ": "US", "NMS": "US", "NGM": "US", "PCX": "US", "BTS": "US",
    "NSI": "India", "BSE": "India", "BOM": "India",
    "TOR": "Canada", "CNQ": "Canada", "NEO": "Canada",
    "LSE": "UK", "IOB": "UK",
    "FRA": "Germany", "GER": "Germany",
    "PAR": "France",
    "TYO": "Japan",
    "SHH": "China", "SHZ": "China",
    "CCC": "Crypto",
    "CCY": "Commodity",
}


def search_ticker(query: str) -> List[dict]:
    cache_key = query.lower().strip()
    if cache_key in _search_cache:
        data, ts = _search_cache[cache_key]
        if time.time() - ts < SEARCH_TTL:
            return data

    try:
        tickers = yf.Ticker(query)
        info = tickers.info
        if info and info.get("symbol"):
            result = [{
                "ticker": info.get("symbol", query),
                "name": info.get("longName") or info.get("shortName", query),
                "exchange": info.get("exchange", ""),
                "asset_type": _classify_asset(info),
                "currency": info.get("currency", "USD"),
                "current_price": info.get("currentPrice") or info.get("regularMarketPrice") or info.get("previousClose"),
            }]
            _search_cache[cache_key] = (result, time.time())
            return result
    except Exception:
        pass

    try:
        search_results = yf.Search(query)
        quotes = search_results.quotes if hasattr(search_results, 'quotes') else []
        results = []
        for q in quotes[:8]:
            ticker_str = q.get("symbol", "")
            results.append({
                "ticker": ticker_str,
                "name": q.get("longname") or q.get("shortname", ticker_str),
                "exchange": q.get("exchange", ""),
                "asset_type": q.get("quoteType", "EQUITY").lower(),
                "currency": q.get("currency", "USD"),
                "current_price": None,
            })
        _search_cache[cache_key] = (results, time.time())
        return results
    except Exception:
        return []


def get_quotes(tickers: List[str]) -> Dict[str, dict]:
    results = {}
    uncached = []

    for t in tickers:
        if t in _quote_cache:
            data, ts = _quote_cache[t]
            if time.time() - ts < QUOTE_TTL:
                results[t] = data
                continue
        uncached.append(t)

    if uncached:
        try:
            data = yf.download(
                tickers=uncached,
                period="2d",
                interval="1d",
                group_by="ticker",
                progress=False,
                threads=True,
            )

            for t in uncached:
                try:
                    if len(uncached) == 1:
                        ticker_data = data
                    else:
                        ticker_data = data[t] if t in data.columns.get_level_values(0) else None

                    if ticker_data is not None and not ticker_data.empty:
                        latest = ticker_data.iloc[-1]
                        prev = ticker_data.iloc[-2] if len(ticker_data) > 1 else latest
                        price = float(latest["Close"].iloc[0]) if hasattr(latest["Close"], 'iloc') else float(latest["Close"])
                        prev_close = float(prev["Close"].iloc[0]) if hasattr(prev["Close"], 'iloc') else float(prev["Close"])
                        change = price - prev_close
                        change_pct = (change / prev_close * 100) if prev_close != 0 else 0

                        info = yf.Ticker(t).fast_info
                        quote = {
                            "ticker": t,
                            "price": round(price, 2),
                            "change": round(change, 2),
                            "change_percent": round(change_pct, 2),
                            "currency": getattr(info, "currency", "USD"),
                            "market_state": "open",
                        }
                        results[t] = quote
                        _quote_cache[t] = (quote, time.time())
                except Exception:
                    continue
        except Exception:
            pass

    return results


def get_history(ticker: str, period: str = "1mo", interval: str = "1d") -> List[dict]:
    cache_key = f"{ticker}:{period}:{interval}"
    if cache_key in _history_cache:
        data, ts = _history_cache[cache_key]
        if time.time() - ts < HISTORY_TTL:
            return data

    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=period, interval=interval)
        results = []
        for idx, row in hist.iterrows():
            results.append({
                "date": idx.strftime("%Y-%m-%d"),
                "open": round(float(row["Open"]), 2),
                "high": round(float(row["High"]), 2),
                "low": round(float(row["Low"]), 2),
                "close": round(float(row["Close"]), 2),
                "volume": int(row["Volume"]),
            })
        _history_cache[cache_key] = (results, time.time())
        return results
    except Exception:
        return []


def _classify_asset(info: dict) -> str:
    quote_type = info.get("quoteType", "").upper()
    if quote_type == "CRYPTOCURRENCY":
        return "crypto"
    if quote_type == "ETF":
        return "etf"
    if quote_type == "MUTUALFUND":
        return "mutual_fund"
    if quote_type == "FUTURE" or quote_type == "COMMODITY":
        return "commodity"
    symbol = info.get("symbol", "")
    if symbol.endswith("=F") or symbol.endswith("=X"):
        return "commodity"
    if "-USD" in symbol and quote_type != "EQUITY":
        return "crypto"
    return "stock"


def get_exchange_country(exchange_code: str) -> str:
    return EXCHANGE_COUNTRY_MAP.get(exchange_code, "Other")
