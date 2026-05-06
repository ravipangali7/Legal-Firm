"""Verify Google OAuth access tokens via the userinfo endpoint."""

from __future__ import annotations

import json
import urllib.error
import urllib.request


def fetch_google_userinfo(access_token: str) -> dict:
    """
    Return the JSON object from GET https://www.googleapis.com/oauth2/v3/userinfo.
    Raises ValueError if the token is invalid or the request fails.
    """
    token = (access_token or "").strip()
    if not token:
        raise ValueError("Missing Google access token.")

    req = urllib.request.Request(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        headers={"Authorization": f"Bearer {token}"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode()
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            raise ValueError("Invalid or expired Google token.") from e
        raise ValueError("Could not verify Google account.") from e
    except urllib.error.URLError as e:
        raise ValueError("Could not reach Google. Try again.") from e

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError("Invalid response from Google.") from e
