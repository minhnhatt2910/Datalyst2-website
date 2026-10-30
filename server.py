from __future__ import annotations

import logging
import os
import time
import uuid
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field, field_validator

from datalyst_core import (
    MAX_CHAT_CHARS,
    ContextValidationError,
    build_instructions,
    build_user_input,
    make_source_trace,
    sanitize_context,
)

try:
    from openai import APIConnectionError, APIStatusError, APITimeoutError, AsyncOpenAI, RateLimitError
except ImportError:  # A health endpoint and local fallback remain available before dependencies are installed.
    APIConnectionError = APIStatusError = APITimeoutError = RateLimitError = Exception
    AsyncOpenAI = None  # type: ignore[assignment,misc]


ROOT = Path(__file__).resolve().parent
PROVIDER = os.getenv("AI_PROVIDER", "openai").strip().lower() or "openai"
MODEL = os.getenv("AI_MODEL", os.getenv("OPENAI_MODEL", "gpt-5.5")).strip() or "gpt-5.5"
API_KEY = os.getenv("AI_API_KEY", os.getenv("OPENAI_API_KEY", "")).strip()
BASE_URL = os.getenv("AI_BASE_URL", "").strip() or None
ALLOWED_ORIGINS = [origin.strip().rstrip("/") for origin in os.getenv("DATALYST_ALLOWED_ORIGINS", "").split(",") if origin.strip()]
MAX_BODY_BYTES = 64_000
RATE_LIMIT_REQUESTS = 20
RATE_LIMIT_WINDOW_SECONDS = 60
ALLOWED_ASSETS = {"index.html", "style.css", "app.js", "logo.png", "submission_output.csv"}
logger = logging.getLogger("datalyst.api")

app = FastAPI(title="Datalyst API", version="1.0.0", docs_url=None, redoc_url=None)
if ALLOWED_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Accept", "Content-Type"],
    )
_client = AsyncOpenAI(api_key=API_KEY, base_url=BASE_URL, timeout=25.0, max_retries=0) if AsyncOpenAI and API_KEY and PROVIDER in {"openai", "openai-compatible"} else None
_request_times: dict[str, deque[float]] = defaultdict(deque)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    question: str = Field(min_length=1, max_length=MAX_CHAT_CHARS)
    data_context: dict[str, Any]

    @field_validator("question")
    @classmethod
    def question_must_have_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("question không được để trống.")
        return value.strip()


def _check_origin(request: Request) -> None:
    origin = request.headers.get("origin")
    if not origin:
        return
    from urllib.parse import urlsplit

    parsed_origin = urlsplit(origin)
    same_origin = parsed_origin.netloc.lower() == request.headers.get("host", "").lower() and parsed_origin.scheme.lower() == request.url.scheme.lower()
    allowlisted_origin = origin.rstrip("/") in ALLOWED_ORIGINS
    if not same_origin and not allowlisted_origin:
        raise HTTPException(status_code=403, detail={"code": "cross_origin_denied"})


def _check_rate_limit(request: Request) -> None:
    client_ip = request.client.host if request.client else "unknown"
    now = time.monotonic()
    hits = _request_times[client_ip]
    while hits and hits[0] <= now - RATE_LIMIT_WINDOW_SECONDS:
        hits.popleft()
    if len(hits) >= RATE_LIMIT_REQUESTS:
        raise HTTPException(status_code=429, detail={"code": "rate_limited"}, headers={"Retry-After": "60"})
    hits.append(now)


@app.middleware("http")
async def reject_oversized_chat_body(request: Request, call_next):
    if request.method == "POST" and request.url.path == "/api/chat":
        content_length = request.headers.get("content-length", "")
        if content_length and (not content_length.isdigit() or int(content_length) > MAX_BODY_BYTES):
            return JSONResponse(status_code=413, content={"detail": {"code": "payload_too_large"}})
    return await call_next(request)


@app.get("/api/health")
async def health() -> dict[str, Any]:
    key_available = bool(API_KEY)
    sdk_available = AsyncOpenAI is not None
    supported_provider = PROVIDER in {"openai", "openai-compatible"}
    return {
        "status": "ok",
        "configured": key_available and sdk_available and supported_provider,
        "provider": PROVIDER,
        "model": MODEL,
        "reason": None if key_available and sdk_available and supported_provider else "missing_api_key" if not key_available else "unsupported_provider" if not supported_provider else "missing_dependency",
    }


@app.post("/api/chat")
async def chat(payload: ChatRequest, request: Request) -> JSONResponse:
    _check_origin(request)
    _check_rate_limit(request)
    content_length = request.headers.get("content-length")
    if content_length and (not content_length.isdigit() or int(content_length) > MAX_BODY_BYTES):
        raise HTTPException(status_code=413, detail={"code": "payload_too_large"})
    request_id = str(uuid.uuid4())
    started = time.perf_counter()
    if not payload.question or len(payload.question) > MAX_CHAT_CHARS:
        raise HTTPException(status_code=422, detail={"code": "invalid_question"})
    try:
        context = sanitize_context(payload.data_context)
    except ContextValidationError as error:
        raise HTTPException(status_code=422, detail={"code": "invalid_data_context", "message": str(error)}) from None
    if len((payload.question + str(context)).encode("utf-8")) > MAX_BODY_BYTES:
        raise HTTPException(status_code=413, detail={"code": "payload_too_large"})
    if _client is None:
        logger.info("chat status=unavailable request_id=%s model=%s latency_ms=0", request_id, MODEL)
        code = "missing_api_key" if not API_KEY else "unsupported_provider" if PROVIDER not in {"openai", "openai-compatible"} else "missing_openai_dependency"
        raise HTTPException(status_code=503, detail={"code": code, "request_id": request_id})

    try:
        response = await _client.responses.create(
            model=MODEL,
            instructions=build_instructions(),
            input=build_user_input(payload.question, context),
            store=False,
        )
        answer = (response.output_text or "").strip()
        if not answer:
            raise HTTPException(status_code=502, detail={"code": "empty_model_response", "request_id": request_id})
        actual_model = getattr(response, "model", None) or MODEL
        upstream_request_id = getattr(response, "_request_id", None)
        latency_ms = round((time.perf_counter() - started) * 1000)
        logger.info("chat status=success request_id=%s model=%s latency_ms=%s", request_id, actual_model, latency_ms)
        return JSONResponse({
            "answer": answer,
            "source_trace": make_source_trace(context),
            "provider": PROVIDER,
            "model": actual_model,
            "request_id": request_id,
            "upstream_request_id": upstream_request_id,
            "latency_ms": latency_ms,
            "status": "llm",
        })
    except HTTPException:
        raise
    except APITimeoutError:
        logger.info("chat status=timeout request_id=%s model=%s latency_ms=%s", request_id, MODEL, round((time.perf_counter() - started) * 1000))
        raise HTTPException(status_code=504, detail={"code": "upstream_timeout", "request_id": request_id}) from None
    except RateLimitError:
        logger.info("chat status=upstream_rate_limited request_id=%s model=%s latency_ms=%s", request_id, MODEL, round((time.perf_counter() - started) * 1000))
        raise HTTPException(status_code=429, detail={"code": "upstream_rate_limited", "request_id": request_id}) from None
    except APIStatusError as error:
        status_code = getattr(error, "status_code", 0)
        code = "authentication_failed" if status_code in {401, 403} else "upstream_rate_limited" if status_code == 429 else "upstream_unavailable" if status_code >= 500 else "upstream_error"
        logger.info("chat status=%s request_id=%s model=%s latency_ms=%s", code, request_id, MODEL, round((time.perf_counter() - started) * 1000))
        raise HTTPException(status_code=502, detail={"code": code, "request_id": request_id}) from None
    except APIConnectionError:
        logger.info("chat status=upstream_error request_id=%s model=%s latency_ms=%s", request_id, MODEL, round((time.perf_counter() - started) * 1000))
        raise HTTPException(status_code=502, detail={"code": "upstream_unavailable", "request_id": request_id}) from None
    except Exception:
        logger.info("chat status=internal_error request_id=%s model=%s latency_ms=%s", request_id, MODEL, round((time.perf_counter() - started) * 1000))
        raise HTTPException(status_code=500, detail={"code": "internal_error", "request_id": request_id}) from None


@app.get("/")
async def index() -> FileResponse:
    return FileResponse(ROOT / "index.html", media_type="text/html; charset=utf-8")


@app.get("/{asset_name}")
async def static_asset(asset_name: str) -> FileResponse:
    if asset_name not in ALLOWED_ASSETS:
        raise HTTPException(status_code=404, detail={"code": "not_found"})
    path = ROOT / asset_name
    if not path.is_file():
        raise HTTPException(status_code=404, detail={"code": "not_found"})
    return FileResponse(path)
