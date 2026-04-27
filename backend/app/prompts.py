from __future__ import annotations

from typing import Final, Literal

SYSTEM_PROMPT: Final[str] = (
    "You are Quantlix Assistant. Answer questions about the Quantlix product: "
    "API and gateway behavior, deployments and revisions, contracts and pipeline lock, "
    "runtime governance and policies, budgets and auditability, provider-backed and "
    "self-hosted inference, and customer architecture patterns that run on Quantlix "
    "(including RAG/retrieval, embeddings, and grounding workflows). "
    "Use provided retrieval context when available and never fabricate features."
)

OUTPUT_FORMAT_INSTRUCTION: Final[str] = (
    "Return JSON with keys: answer (string), citations (array of {doc_id, anchor, "
    "snippet}), confidence (number 0-1), out_of_scope (boolean)."
)


def _history_section(
    history: list[tuple[Literal["user", "assistant"], str]],
) -> str:
    if not history:
        return ""
    lines: list[str] = []
    for role, content in history:
        label = "User" if role == "user" else "Assistant"
        lines.append(f"{label}: {content}")
    return (
        "Prior messages in this session (same chat, oldest first):\n"
        + "\n".join(lines)
        + "\n\n"
    )


def build_prompt(
    question: str,
    context: list[dict[str, str]],
    *,
    history: list[tuple[Literal["user", "assistant"], str]] | None = None,
) -> str:
    """Build the user prompt with retrieved context blocks."""
    context_lines: list[str] = []
    for idx, item in enumerate(context, start=1):
        block = "[doc {idx}] doc_id={doc_id} anchor={anchor}\n{text}".format(
            idx=idx,
            doc_id=item.get("doc_id", ""),
            anchor=item.get("anchor", ""),
            text=item.get("text", ""),
        )
        context_lines.append(block)

    context_blob = "\n\n".join(context_lines)
    prior = _history_section(history or [])
    return (
        "{prior}"
        "Current question:\n{question}\n\n"
        "Retrieved context:\n{context}\n\n"
        "Rules:\n"
        "- In scope: anything a Quantlix user would reasonably ask support, including "
        "how to deploy or operate RAG-style apps (retrieval, embeddings, document stores) "
        "using Quantlix deployments, inference targets, and the /run path.\n"
        "- Set out_of_scope=true only when the question has no meaningful link to "
        "Quantlix (unrelated products, personal life advice, or generic ML tutorials "
        "with no Quantlix product angle). If the user mentions RAG, retrieval, or "
        "models without naming Quantlix, still answer from a Quantlix perspective "
        "(how they would do it on the platform) when retrieval context supports it.\n"
        "- Cite sources with doc_id and anchor when asserting facts.\n"
        "- Confidence must be between 0 and 1.\n"
        "- Use prior messages only for continuity (references like \"it\", \"that step\"); "
        "the current question is what you must answer.\n"
        "- {format_instruction}"
    ).format(
        prior=prior,
        question=question,
        context=context_blob,
        format_instruction=OUTPUT_FORMAT_INSTRUCTION,
    )
