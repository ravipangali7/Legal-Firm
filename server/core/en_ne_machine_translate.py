"""Best-effort English → Nepali machine translation via MyMemory (server-side; no browser CORS)."""

from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

_LOG = logging.getLogger(__name__)

MYMEMORY_URL = "https://api.mymemory.translated.net/get"
MAX_CHUNK = 420
MAX_TOTAL_INPUT = 100_000
MAX_WORKERS = 4


def _split_for_translate(text: str, maxlen: int = MAX_CHUNK) -> list[str]:
    """Split long text into chunks, preferring newline boundaries."""
    if not text:
        return []
    if len(text) <= maxlen:
        return [text]
    parts: list[str] = []
    rest = text
    while rest:
        if len(rest) <= maxlen:
            parts.append(rest)
            break
        cut = rest.rfind("\n", 0, maxlen)
        if cut < maxlen // 2:
            cut = maxlen
        parts.append(rest[:cut])
        rest = rest[cut:]
    return parts


def _translate_chunk(q: str, langpair: str = "en|ne") -> str:
    stripped = (q or "").strip()
    if not stripped:
        return q or ""
    params = urllib.parse.urlencode({"q": stripped, "langpair": langpair})
    url = f"{MYMEMORY_URL}?{params}"
    req = urllib.request.Request(url, headers={"User-Agent": "LegalFirm/1.0"})
    with urllib.request.urlopen(req, timeout=45) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    data = json.loads(raw)
    status = int(data.get("responseStatus") or 0)
    if status != 200:
        detail = data.get("responseDetails") or data.get("error") or "translation failed"
        raise ValueError(f"MyMemory status {status}: {detail}")
    out = (data.get("responseData") or {}).get("translatedText")
    if not isinstance(out, str):
        raise ValueError("unexpected MyMemory response shape")
    return out


def translate_en_to_ne(text: str) -> str:
    """Translate a single English string to Nepali; chunks and merges."""
    if not text:
        return ""
    if len(text) > MAX_TOTAL_INPUT:
        text = text[:MAX_TOTAL_INPUT]
    chunks = _split_for_translate(text, MAX_CHUNK)
    if len(chunks) == 1:
        return _translate_chunk(chunks[0])
    out_parts: list[str | None] = [None] * len(chunks)
    with ThreadPoolExecutor(max_workers=min(MAX_WORKERS, len(chunks))) as pool:
        futs = {pool.submit(_translate_chunk, c): i for i, c in enumerate(chunks)}
        for fut in as_completed(futs):
            i = futs[fut]
            try:
                out_parts[i] = fut.result()
            except Exception:
                _LOG.warning("translate chunk %s failed", i, exc_info=True)
                raise
    return "".join(x or "" for x in out_parts)


def translate_en_to_ne_many(parts: list[str]) -> list[str]:
    """Translate each part independently (preserves order)."""
    if not parts:
        return []
    if len(parts) > 12:
        raise ValueError("too many parts")
    total = sum(len(p or "") for p in parts)
    if total > MAX_TOTAL_INPUT:
        raise ValueError("combined text too long")
    results: list[str] = []
    for p in parts:
        try:
            results.append(translate_en_to_ne(p or ""))
        except (urllib.error.URLError, urllib.error.HTTPError, ValueError, json.JSONDecodeError) as e:
            _LOG.warning("translate part failed: %s", e)
            raise
    return results
