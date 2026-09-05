import base64
import binascii
import json
import os
from typing import Any


MAX_QUESTION_LENGTH = 500


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

    return _response(
        200,
        {
            "verdict": "ДА",
            "confidence": 87,
            "prophecy": "Путь открыт для того, кто готов сделать первый шаг.",
            "reason": "Вопрос принят Оракулом. Ответ пока прост, но знак благоприятен.",
        },
        origin,
    )
