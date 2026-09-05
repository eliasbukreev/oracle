import base64
import binascii
import json
import os
import re
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request


MAX_QUESTION_LENGTH = 500
MAX_RESPONSE_FIELD_LENGTH = 4000
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MAX_TOKENS = 400
DEFAULT_TEMPERATURE = 0.8


def _allowed_origins() -> set[str]:
    configured_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
    return {
        origin.strip()
        for origin in configured_origins.split(",")
        if origin.strip()
    }


def _cors_headers(origin: str | None) -> dict[str, str]:
    allowed_origins = _allowed_origins()
    allow_origin = origin if origin and ("*" in allowed_origins or origin in allowed_origins) else ""

    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Vary": "Origin",
    }

    if allow_origin:
        headers["Access-Control-Allow-Origin"] = allow_origin

    return headers


def _response(
    status_code: int,
    payload: dict[str, Any] | None,
    origin: str | None,
) -> dict[str, Any]:
    return {
        "statusCode": status_code,
        "headers": _cors_headers(origin),
        "body": json.dumps(payload, ensure_ascii=False) if payload is not None else "",
    }


def _request_body(event: dict[str, Any]) -> str:
    body = event.get("body") or ""

    if event.get("isBase64Encoded"):
        body = base64.b64decode(body).decode("utf-8")

    return body


def _request_origin(event: dict[str, Any]) -> str | None:
    headers = event.get("headers") or {}
    return headers.get("Origin") or headers.get("origin")


def _oracle_prompt() -> str:
    return (
        "Ты — Оракул. Отвечай на русском языке в мистическом стиле. "
        "Не упоминай, что ты искусственный интеллект. "
        "Верни только валидный JSON без markdown и без ``` с полями: "
        '"verdict" (ДА или НЕТ), "confidence" (число от 0 до 100), '
        '"prophecy" (короткое пророчество), "reason" (краткое объяснение).'
    )


def _provider_json() -> dict[str, Any] | None:
    api_key = os.getenv("OPENROUTER_API_KEY", "")
    model = os.getenv("ORACLE_MODEL", "")

    if not api_key or not model:
        return None

    try:
        max_tokens = int(os.getenv("ORACLE_MAX_TOKENS", str(DEFAULT_MAX_TOKENS)))
        temperature = float(os.getenv("ORACLE_TEMPERATURE", str(DEFAULT_TEMPERATURE)))
    except ValueError:
        return None

    return {
        "model": model,
        "messages": [],
        "max_tokens": max_tokens,
        "temperature": temperature,
    }


def _parse_model_json(content: str) -> dict[str, Any] | None:
    cleaned = content.strip()
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE)

    try:
        payload = json.loads(cleaned)
    except (json.JSONDecodeError, TypeError):
        return None

    if not isinstance(payload, dict):
        return None

    verdict = payload.get("verdict")
    confidence = payload.get("confidence")
    prophecy = payload.get("prophecy")
    reason = payload.get("reason")

    if (
        not isinstance(verdict, str)
        or not verdict.strip()
        or not isinstance(confidence, (int, float))
        or isinstance(confidence, bool)
        or not 0 <= confidence <= 100
        or not isinstance(prophecy, str)
        or not prophecy.strip()
        or not isinstance(reason, str)
        or not reason.strip()
    ):
        return None

    if any(len(value) > MAX_RESPONSE_FIELD_LENGTH for value in (verdict, prophecy, reason)):
        return None

    return {
        "verdict": verdict.strip(),
        "confidence": confidence,
        "prophecy": prophecy.strip(),
        "reason": reason.strip(),
    }


def _ask_openrouter(question: str) -> dict[str, Any] | None:
    provider_request = _provider_json()

    if provider_request is None:
        return None

    provider_request["messages"] = [
        {"role": "system", "content": _oracle_prompt()},
        {"role": "user", "content": question},
    ]

    request = urllib_request.Request(
        OPENROUTER_URL,
        data=json.dumps(provider_request).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {os.environ['OPENROUTER_API_KEY']}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("ORACLE_SITE_URL", "https://github.com"),
            "X-Title": "Oracle",
        },
        method="POST",
    )

    try:
        timeout = float(os.getenv("ORACLE_PROVIDER_TIMEOUT", "20"))
        with urllib_request.urlopen(request, timeout=timeout) as response:
            provider_response = json.loads(response.read().decode("utf-8"))
        content = provider_response["choices"][0]["message"]["content"]
    except (urllib_error.HTTPError, urllib_error.URLError, TimeoutError, KeyError, IndexError,
            UnicodeDecodeError, json.JSONDecodeError, TypeError, ValueError):
        return None

    return _parse_model_json(content)


def handler(event: dict[str, Any], context: Any) -> dict[str, Any]:
    """Return a minimal Oracle response for a Yandex Cloud Function HTTP event."""
    del context

    method = (event.get("httpMethod") or "POST").upper()
    origin = _request_origin(event)

    if method == "OPTIONS":
        return _response(204, None, origin)

    if method != "POST":
        return _response(405, {"error": "invalid_request"}, origin)

    try:
        payload = json.loads(_request_body(event))
    except (binascii.Error, UnicodeDecodeError, json.JSONDecodeError, ValueError, TypeError):
        return _response(400, {"error": "invalid_request"}, origin)

    question = payload.get("question") if isinstance(payload, dict) else None

    if not isinstance(question, str):
        return _response(400, {"error": "invalid_request"}, origin)

    question = question.strip()

    if not question or len(question) > MAX_QUESTION_LENGTH:
        return _response(400, {"error": "invalid_request"}, origin)

    result = _ask_openrouter(question)

    if result is None:
        return _response(502, {"error": "oracle_unavailable"}, origin)

    return _response(200, result, origin)
