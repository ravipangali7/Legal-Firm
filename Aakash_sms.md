# Aakash SMS — Send API integration

Use this guide to send SMS from **any** stack (backend service, serverless function, mobile backend, or alongside tools like Firebase): call the Aakash SMS **HTTP v3 send** endpoint with your account token.

---

## Credentials (environment variables)

Configure these on your server or in your secret store / `.env`; **do not commit real tokens** to git.

| Variable | Required | Purpose |
|----------|----------|---------|
| `AAKASHSMS_AUTH_TOKEN` | **Yes** | API auth token from Aakash SMS (dashboard / account). |
| `AAKASHSMS_API_URL` | No | Optional override for the send URL (default below). |

Typical loading: read both from environment in your app bootstrap (framework settings, `process.env`, Cloud Secret Manager, etc.).

- Default **`AAKASHSMS_API_URL`:** `https://sms.aakashsms.com/sms/v3/send`

---

## HTTP API — send one or more SMS

### Endpoint

- **Method:** `POST`
- **URL:** `https://sms.aakashsms.com/sms/v3/send`  
  (or your value in `AAKASHSMS_API_URL`)

### Body (form URL-encoded)

Use **`application/x-www-form-urlencoded`** (not JSON), with three fields:

| Field | Description |
|-------|--------------|
| `auth_token` | Same value as `AAKASHSMS_AUTH_TOKEN`. |
| `to` | Recipient mobile number(s): **comma-separated, 10-digit Nepal mobiles only** (e.g. `9812345678`). Do **not** send `+977` in this field — the gateway expects the **10-digit** form. |
| `text` | Message body (plain text). For OTP and short transactional text, staying under roughly **480 characters** keeps messages within a single segment on many routes. |

### Example: `curl`

Replace `YOUR_AAKASH_AUTH_TOKEN` with your real token.

```bash
curl -sS -X POST "https://sms.aakashsms.com/sms/v3/send" \
  --data-urlencode "auth_token=YOUR_AAKASH_AUTH_TOKEN" \
  --data-urlencode "to=9812345678" \
  --data-urlencode "text=Hello from our app."
```

Multiple numbers (comma-separated, each 10 digits):

```bash
curl -sS -X POST "https://sms.aakashsms.com/sms/v3/send" \
  --data-urlencode "auth_token=YOUR_AAKASH_AUTH_TOKEN" \
  --data-urlencode "to=9812345678,9851234567" \
  --data-urlencode "text=Same message to both."
```

---

## Response shape (JSON)

Responses are **JSON**. Treat **`error: false`** as the provider accepting the request for processing.

**Successful example:**

```json
{
  "error": false,
  "message": "1 messages has been queued for delivery.",
  "data": {
    "valid": [
      {
        "id": 1,
        "mobile": "9779811111111",
        "text": "hi",
        "credit": 1,
        "network": "ncell",
        "status": "queued"
      }
    ],
    "invalid": []
  }
}
```

**Failure cases:**

- HTTP status not OK — treat as failure; `message` in JSON may explain.
- JSON with `"error": true` — failure (e.g. balance, validation).
- `"error": false` but `data.invalid` populated and **`data.valid` empty** — no message was queued for valid recipients; treat as failure for the send operation.

---

## Nepal phone normalization (recommended)

Before putting a number in `to`, normalize to **10 digits starting with `9`** (e.g. `98xxxxxxxx`).

**Rules you can implement in any language:**

- Strip the input to ASCII digits `0-9` only.
- If the number starts with `977` and has more digits after, take the next **10** digits (the subscriber part).
- If you have **10** digits starting with `9`, use them as-is.
- If you have **11** digits starting with `09`, drop the leading `0` and use the remaining 10 if they start with `9`.
- Otherwise, if you have at least 10 digits, you may take the **last 10** only when that matches your country rules — for Nepal mobiles, prefer explicit `977` / `0` handling above so you do not slice incorrectly.

Send **only** the canonical 10-digit value in `to`.

---

## Minimal integration snippets

### Python (`requests`)

```python
import os
import requests

url = os.environ.get("AAKASHSMS_API_URL", "https://sms.aakashsms.com/sms/v3/send").strip()
token = os.environ["AAKASHSMS_AUTH_TOKEN"].strip()
to = "9812345678"  # 10-digit Nepal mobile(s), comma-separated if several
text = "Your message."

r = requests.post(url, data={"auth_token": token, "to": to, "text": text}, timeout=(5, 20))
r.raise_for_status()
payload = r.json()
if payload.get("error") is True:
    raise RuntimeError(payload.get("message") or "SMS failed")
```

### Node.js (`fetch` + `URLSearchParams`)

```javascript
const url = process.env.AAKASHSMS_API_URL?.trim() || "https://sms.aakashsms.com/sms/v3/send";
const token = process.env.AAKASHSMS_AUTH_TOKEN.trim();
const body = new URLSearchParams({
  auth_token: token,
  to: "9812345678",
  text: "Your message.",
});
const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
const payload = await res.json();
if (!res.ok || payload.error === true) throw new Error(payload.message || String(res.status));
```

---

## Suggested integration pattern

| Concern | Approach |
|---------|----------|
| Secrets | Load `AAKASHSMS_AUTH_TOKEN` from env or a vault; never hardcode in source. |
| Sending | One small wrapper that POSTs the three form fields and checks `error` + `data.valid`. |
| OTP / transactional | Call the wrapper from your auth or notification layer (works the same whether the rest of your app uses Firebase, another DB, etc.). |

For **local development without sending**, omit the token or short-circuit in your wrapper so you log the message instead of calling the API.

---

## Checklist for a new project

1. Obtain **`AAKASHSMS_AUTH_TOKEN`** from Aakash SMS.
2. **POST** form fields `auth_token`, `to`, `text` to `https://sms.aakashsms.com/sms/v3/send` (or your override URL).
3. Use **10-digit** Nepal numbers in `to`; multiple = comma-separated.
4. Parse JSON; require **`error === false`** and at least one **valid** recipient in `data` when you need a hard guarantee of delivery.
5. Store the token in **secrets** / environment variables only.
