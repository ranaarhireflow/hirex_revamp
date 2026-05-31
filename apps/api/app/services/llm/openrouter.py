"""OpenRouter client (OpenAI-compatible).

Default model: deepseek/deepseek-chat-v3.1. Override via OPENROUTER_MODEL or the
`model` argument on each helper.
"""
from __future__ import annotations

from collections.abc import AsyncIterator
from functools import lru_cache

from openai import AsyncOpenAI, OpenAI

from app.config import settings

_BASE_URL = "https://openrouter.ai/api/v1"


def _default_headers() -> dict[str, str]:
    return {
        "HTTP-Referer": settings.openrouter_referer,
        "X-Title": "Hirex",
    }


@lru_cache(maxsize=1)
def sync_client() -> OpenAI:
    return OpenAI(
        api_key=settings.openrouter_api_key,
        base_url=_BASE_URL,
        default_headers=_default_headers(),
    )


@lru_cache(maxsize=1)
def async_client() -> AsyncOpenAI:
    return AsyncOpenAI(
        api_key=settings.openrouter_api_key,
        base_url=_BASE_URL,
        default_headers=_default_headers(),
    )


def complete(
    *,
    system: str,
    user: str,
    model: str | None = None,
    temperature: float = 0.4,
    json_mode: bool = False,
) -> str:
    response_format = {"type": "json_object"} if json_mode else None
    resp = sync_client().chat.completions.create(
        model=model or settings.openrouter_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        response_format=response_format,  # type: ignore[arg-type]
    )
    return resp.choices[0].message.content or ""


async def complete_async(
    *,
    system: str,
    user: str,
    model: str | None = None,
    temperature: float = 0.4,
    json_mode: bool = False,
) -> str:
    response_format = {"type": "json_object"} if json_mode else None
    resp = await async_client().chat.completions.create(
        model=model or settings.openrouter_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        response_format=response_format,  # type: ignore[arg-type]
    )
    return resp.choices[0].message.content or ""


async def stream(
    *,
    system: str,
    user: str,
    model: str | None = None,
    temperature: float = 0.4,
) -> AsyncIterator[str]:
    s = await async_client().chat.completions.create(
        model=model or settings.openrouter_model,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=temperature,
        stream=True,
    )
    async for chunk in s:
        if not chunk.choices:
            continue
        delta = chunk.choices[0].delta.content
        if delta:
            yield delta
