# Policies Explained: Governance in a Real App

Quantlix Assistant is intentionally opinionated: it makes enforcement visible to users and operators, not hidden behind private prompt engineering. This document explains why each policy exists, what trade-offs it introduces, and when to relax or tighten controls.

## Scope enforcement

Scope controls reduce hallucination risk by refusing requests outside product knowledge. For support assistants, broad general-purpose behavior looks helpful but often produces unverifiable answers. A semantic scope gate keeps answers aligned with known source docs and reduces legal risk from confident but irrelevant output.

Tighten scope when your assistant is public-facing or compliance-sensitive. Relax scope when internal teams explicitly need broader help and are trained to validate responses.

## Jailbreak prevention

Prompt injection is an expected adversarial input class in any public LLM surface. Quantlix applies pattern checks plus classifier signals to block role escalation attempts before model execution. This follows guidance from the OWASP LLM Top 10, especially prompt injection and insecure output handling.

Reference: [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/).

The browser widget performs a lightweight precheck for obvious role-swap and
instruction-override attempts, but that check is only a user-experience layer.
The authoritative decision must happen in Quantlix because clients can bypass
browser code.

Tighten jailbreak thresholds for external endpoints, anonymous traffic, or high impact workflows. Relax only for trusted internal cohorts with explicit observability and rollback.

## PII redaction

Support conversations frequently include emails, phones, account ids, and keys. A two-sided PII policy (input and output) prevents leakage amplification: users cannot accidentally submit sensitive data and have it echoed back by the model. Output enforcement is stricter because generated leakage can be replicated at scale.

Reference: [NIST Privacy Framework](https://www.nist.gov/privacy-framework).

Tighten redaction when logs are exported broadly or support data spans regulated domains. Relax only if you have alternate data-loss controls with equivalent coverage.

## Budget per session

Session budgets are practical governance, not just cost control. They cap abuse, bound long-running threads, and force clean state reset for support flow quality. A predictable cap also improves operator planning for shared demo or trial infrastructure.

Tighten message and token ceilings for public demos. Relax for paid tenants with contracted usage policies and active quota monitoring.

## Rate limit per IP

Per-IP limits preserve service availability and protect downstream providers from burst abuse. Governance is incomplete if a single client can starve shared capacity. Returning explicit `429` responses with retry metadata keeps behavior transparent and debuggable.

Tighten limits under active abuse or low-capacity infrastructure. Relax for known enterprise egress ranges, but pair with authenticated quotas.

## Why visibility matters

The **Governance** tab in the widget is deliberate: users can see why an answer was blocked or redacted. Governance that is visible builds trust and turns policy from a hidden system behavior into a product feature teams can audit, tune, and own.

