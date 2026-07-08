"""OpenRouter chat completions client."""
import asyncio
import os

import requests

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = os.environ.get("OPENROUTER_MODEL", "tencent/hy3:free")


def _headers() -> dict:
    key = os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise ValueError("OPENROUTER_API_KEY is not set")

    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    site_url = os.environ.get("OPENROUTER_SITE_URL")
    site_name = os.environ.get("OPENROUTER_SITE_NAME")
    if site_url:
        headers["HTTP-Referer"] = site_url
    if site_name:
        headers["X-Title"] = site_name
    return headers


def _post_completion(payload: dict) -> dict:
    response = requests.post(OPENROUTER_URL, headers=_headers(), json=payload, timeout=120)
    response.raise_for_status()
    return response.json()


async def chat_completion(system_message: str, user_message: str, model: str | None = None) -> str:
    payload = {
        "model": model or DEFAULT_MODEL,
        "messages": [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ],
    }

    data = await asyncio.to_thread(_post_completion, payload)

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise ValueError(f"Unexpected OpenRouter response: {data}") from exc
