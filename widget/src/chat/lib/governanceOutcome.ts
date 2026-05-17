export type GovernanceStatus = "allowed" | "blocked" | "budget_capped" | "flagged";

export type GovernanceOutcome =
  | { status: "allowed"; text: string }
  | { status: "blocked"; headline: string; detail: string; caught?: string }
  | { status: "budget_capped"; detail: string }
  | { status: "flagged"; text: string; note: string };

export type HistoryTurn = {
  role: "user" | "assistant";
  content: string;
};

type Violation = Record<string, unknown>;

function asViolations(value: unknown): Violation[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is Violation => !!item && typeof item === "object");
}

function collectViolations(body: unknown): Violation[] {
  if (!body || typeof body !== "object") {
    return [];
  }
  const data = body as Record<string, unknown>;
  const candidates = [
    data.violations,
    data.detail,
    data.error,
    data.result,
  ];
  const detail = data.detail;
  if (detail && typeof detail === "object") {
    const nested = detail as Record<string, unknown>;
    candidates.push(nested.violations, nested.error);
  }
  const error = data.error;
  if (error && typeof error === "object") {
    const nested = error as Record<string, unknown>;
    candidates.push(nested.violations, nested.detail);
  }

  for (const candidate of candidates) {
    const violations = asViolations(candidate);
    if (violations.length) {
      return violations;
    }
    if (candidate && typeof candidate === "object") {
      const nested = (candidate as Record<string, unknown>).violations;
      const fromNested = asViolations(nested);
      if (fromNested.length) {
        return fromNested;
      }
    }
  }
  return [];
}

function violationText(violations: Violation[]): string {
  return violations
    .map((item) => {
      const message = item.message;
      if (typeof message === "string" && message.trim()) {
        return message.trim();
      }
      const code = item.code;
      if (typeof code === "string" && code.trim()) {
        return code.trim();
      }
      return "";
    })
    .filter(Boolean)
    .join(" ");
}

function violationSignals(violations: Violation[]): string {
  return violations
    .flatMap((item) => [
      item.policy,
      item.policy_id,
      item.code,
      item.message,
      item.rule,
      item.decision,
    ])
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
}

function isBudgetSignal(signals: string, status: number): boolean {
  if (status === 429) {
    return true;
  }
  return /budget|quota|rate.?limit|token.?cap|session.?limit|upgrade_required|max_tokens/.test(
    signals,
  );
}

function isPiiSignal(signals: string): boolean {
  return /pii|payment|card|ssn|social security|luhn|visa|redact|pan/.test(signals);
}

function isOffPolicySignal(signals: string): boolean {
  return /scope|off.?policy|out_of_scope|jailbreak|injection|unsafe|harm/.test(signals);
}

function caughtLabel(signals: string): string | undefined {
  if (/visa|card|4242|payment|pan/.test(signals)) {
    return "VISA-like pattern";
  }
  if (/ssn|social security/.test(signals)) {
    return "SSN pattern";
  }
  if (/jailbreak|injection/.test(signals)) {
    return "Prompt injection pattern";
  }
  return undefined;
}

export function outcomeFromHttpError(status: number, body: unknown): GovernanceOutcome {
  const violations = collectViolations(body);
  const signals = violationSignals(violations);
  const raw = violationText(violations);

  if (isBudgetSignal(signals, status)) {
    return {
      status: "budget_capped",
      detail:
        raw ||
        "Session or plan budget reached. Quantlix stopped the request before additional model cost.",
    };
  }

  if (isPiiSignal(signals)) {
    const caught = caughtLabel(signals) ?? "Sensitive data pattern";
    const isSsn = /ssn|social security/.test(signals);
    return {
      status: "blocked",
      headline: isSsn
        ? "Identity data detected. The AI never saw your message."
        : "Payment data detected. The AI never saw your message.",
      detail: "",
      caught,
    };
  }

  if (isOffPolicySignal(signals)) {
    return {
      status: "flagged",
      text: raw || "This request was flagged by governance policy.",
      note: "Quantlix reviewed the prompt before allowing a model response.",
    };
  }

  return {
    status: "blocked",
    headline: "Blocked by Quantlix",
    detail: raw || "Request blocked before model execution.",
    caught: caughtLabel(signals),
  };
}

export function outcomeFromGenerated(generated: string): GovernanceOutcome {
  const trimmed = generated.trim();
  if (!trimmed.startsWith("{")) {
    return { status: "allowed", text: trimmed };
  }

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : trimmed;
    if (parsed.out_of_scope === true) {
      return {
        status: "flagged",
        text: answer,
        note: "Response marked out-of-policy for this deployment.",
      };
    }
    if (parsed.decision === "redacted" || parsed.decision === "blocked_out_of_scope") {
      return {
        status: "blocked",
        headline: "Governed response",
        detail: answer,
      };
    }
    return { status: "allowed", text: answer };
  } catch {
    return { status: "allowed", text: trimmed };
  }
}

export function statusLabel(status: GovernanceStatus): string {
  switch (status) {
    case "allowed":
      return "Allowed";
    case "blocked":
      return "Blocked";
    case "budget_capped":
      return "Budget capped";
    case "flagged":
      return "Flagged";
  }
}
