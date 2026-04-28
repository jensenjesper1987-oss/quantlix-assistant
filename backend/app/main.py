from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Literal
from uuid import UUID

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.prompts import SYSTEM_PROMPT, build_prompt
from app.quantlix_client import (
    EnforcementBlocked,
    QuantlixConfigError,
    QuantlixClient,
    QuantlixGatewayUnavailable,
)
from app.rag import retrieve

logger = logging.getLogger(__name__)


def _allowed_widget_origins() -> list[str]:
    raw = os.environ.get(
        "WIDGET_PUBLIC_ORIGIN",
        "http://localhost:3030,http://localhost:5173",
    )
    return [origin.strip() for origin in raw.split(",") if origin.strip()]

JAILBREAK_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(
        r"\bignore (all )?(previous|prior|above) "
        r"(instructions|rules|messages)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\byou are now\b", re.IGNORECASE),
    re.compile(r"\bsystem\s*:", re.IGNORECASE),
    re.compile(r"\bdeveloper\s*:", re.IGNORECASE),
    re.compile(r"\bassistant\s*:", re.IGNORECASE),
    re.compile(r"\bact as (the )?(system|developer|admin)\b", re.IGNORECASE),
    re.compile(
        r"\breveal (the )?(system prompt|hidden instructions|developer message)\b",
        re.IGNORECASE,
    ),
)

app = FastAPI(title="Quantlix Assistant Backend")


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness: process is up (no external dependencies)."""
    return {"status": "ok"}


@app.get("/health/ready")
async def ready() -> dict[str, str]:
    """Readiness: Postgres is reachable (required for RAG)."""
    dsn = os.environ.get("DATABASE_URL", "").strip()
    if not dsn:
        raise HTTPException(status_code=503, detail="DATABASE_URL not configured")

    def _ping() -> None:
        import psycopg  # type: ignore[import-not-found]

        with psycopg.connect(dsn, connect_timeout=5) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")

    try:
        await asyncio.to_thread(_ping)
    except Exception as exc:
        logger.warning("Readiness check failed: %s", exc)
        raise HTTPException(status_code=503, detail="database unavailable") from exc

    return {"status": "ready"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_widget_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class HistoryTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class ChatRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    session_id: UUID
    history: list[HistoryTurn] = Field(default_factory=list, max_length=20)


class GatewayMessage(BaseModel):
    role: Literal["system", "user"]
    content: str = Field(min_length=1)


class Citation(BaseModel):
    doc_id: str
    anchor: str
    snippet: str


class ChatResponse(BaseModel):
    answer: str
    citations: list[Citation]
    confidence: float = Field(ge=0.0, le=1.0)
    out_of_scope: bool


def looks_like_jailbreak(text: str) -> bool:
    """Detect obvious prompt-injection patterns before retrieval runs."""
    return any(pattern.search(text) for pattern in JAILBREAK_PATTERNS)


def _retrieval_query(request: ChatRequest) -> str:
    """Use recent turns + current question so follow-ups retrieve relevant docs."""
    parts = [turn.content for turn in request.history[-12:]]
    parts.append(request.question)
    return "\n".join(parts)[:2000]


def _policy_scoped_question(question: str) -> str:
    """
    Keep UX natural while making policy scope checks deterministic.

    The scope policy evaluates payload.question. Prefix ambiguous short prompts
    with explicit Quantlix context so "Show me a RAG setup" is interpreted as
    a Quantlix support request instead of generic ML advice.
    """
    normalized = question.strip()
    if not normalized:
        return question
    if "quantlix" in normalized.casefold():
        return normalized
    return f"In Quantlix platform context: {normalized}"


def assert_no_jailbreak(request: ChatRequest) -> None:
    """Fail closed for direct backend callers that bypass the widget."""
    inputs = [request.question]
    inputs.extend(turn.content for turn in request.history)
    if not any(looks_like_jailbreak(value) for value in inputs):
        return

    logger.warning(
        "Request blocked by backend jailbreak precheck for session_id=%s",
        request.session_id,
    )
    raise HTTPException(
        status_code=400,
        detail={
            "answer": "Request blocked by governance policy.",
            "violations": [
                {
                    "code": "JAILBREAK_PRECHECK_BLOCK",
                    "severity": "error",
                    "policy_id": "jailbreak-prevention",
                    "path": "$.question",
                    "message": "Prompt injection pattern detected before retrieval.",
                }
            ],
        },
    )


def _strip_markdown_json_fence(text: str) -> str:
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped
    lines = stripped.split("\n")
    if not lines:
        return stripped
    # Drop opening ``` or ```json
    lines = lines[1:]
    while lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()


def _parse_contract_output_json(generated: str) -> dict | None:
    """
    Models instructed by the deployment contract return a single JSON object
    (answer, citations, confidence, out_of_scope). Quantlix exposes that string
    as output.generated; parse it so the HTTP /chat body is a real ChatResponse.
    """
    text = _strip_markdown_json_fence(generated)
    if not text.startswith("{"):
        return None
    try:
        obj = json.loads(text)
    except json.JSONDecodeError:
        return None
    if not isinstance(obj, dict):
        return None
    answer = obj.get("answer")
    if not isinstance(answer, str) or not answer.strip():
        return None
    return obj


def _citations_from_contract(obj: dict) -> list[Citation]:
    raw = obj.get("citations")
    if not isinstance(raw, list):
        return []
    out: list[Citation] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        doc_id = item.get("doc_id")
        anchor = item.get("anchor")
        snippet = item.get("snippet")
        if not isinstance(doc_id, str) or not isinstance(anchor, str):
            continue
        if not isinstance(snippet, str):
            continue
        out.append(Citation(doc_id=doc_id, anchor=anchor, snippet=snippet[:500]))
    return out


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    assert_no_jailbreak(request)
    context = await retrieve(_retrieval_query(request), k=5)
    history_pairs = [(turn.role, turn.content) for turn in request.history]
    user_prompt = build_prompt(request.question, context, history=history_pairs)
    scoped_question = _policy_scoped_question(request.question)
    messages = [
        GatewayMessage(role="system", content=SYSTEM_PROMPT),
        GatewayMessage(role="user", content=user_prompt),
    ]

    payload = {
        "question": scoped_question,
        "session_id": str(request.session_id),
        "history": [turn.model_dump() for turn in request.history],
        "messages": [message.model_dump() for message in messages],
    }

    try:
        client = QuantlixClient.from_env()
        gateway_response = await client.run(payload)
    except QuantlixConfigError as exc:
        logger.warning("Quantlix client configuration error: %s", exc)
        raise HTTPException(
            status_code=500,
            detail={
                "answer": str(exc),
                "violations": [],
            },
        ) from exc
    except QuantlixGatewayUnavailable as exc:
        logger.warning("Quantlix gateway unavailable")
        raise HTTPException(
            status_code=502,
            detail={
                "answer": "Quantlix gateway is unavailable. Verify QUANTLIX_API_BASE.",
                "violations": [],
            },
        ) from exc
    except EnforcementBlocked as exc:
        logger.warning("Request blocked by Quantlix policies: %s", exc.violations)
        raise HTTPException(
            status_code=400,
            detail={
                "answer": "Request blocked by governance policy.",
                "violations": exc.violations,
            },
        ) from exc

    output = gateway_response.get("output")
    if isinstance(output, dict):
        generated = output.get("generated")
        if isinstance(generated, str) and generated.strip():
            parsed = _parse_contract_output_json(generated)
            if parsed is not None:
                conf = parsed.get("confidence", 0.82)
                if isinstance(conf, (int, float)):
                    confidence = max(0.0, min(1.0, float(conf)))
                else:
                    confidence = 0.82
                oos = parsed.get("out_of_scope", False)
                out_of_scope = oos if isinstance(oos, bool) else False
                return ChatResponse(
                    answer=parsed["answer"].strip(),
                    citations=_citations_from_contract(parsed),
                    confidence=confidence,
                    out_of_scope=out_of_scope,
                )
            citations = [
                Citation(doc_id=item["doc_id"], anchor=item["anchor"], snippet=item["text"][:180])
                for item in context[:3]
            ]
            return ChatResponse(
                answer=generated.strip(),
                citations=citations,
                confidence=0.82,
                out_of_scope=False,
            )

    request_id = gateway_response.get("request_id", "unknown")
    status = gateway_response.get("status", "unknown")
    logger.warning(
        "Quantlix run returned no inline output.generated (status=%s, request_id=%s)",
        status,
        request_id,
    )
    answer = (
        "Quantlix accepted the request, but this deployment did not return an "
        "inline model answer on /run. For the chat widget UX, bind a provider-backed "
        "inference target so /run returns output.generated synchronously. "
        f"Status: {status}. Request ID: {request_id}."
    )
    return ChatResponse(answer=answer, citations=[], confidence=1.0, out_of_scope=False)
