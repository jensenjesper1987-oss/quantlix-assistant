import type { GovernanceOutcome, GovernanceStatus } from "./governanceOutcome";

/** Full turn result for UI: Quantlix decision + optional model output. */
export type ChatTurnResult = {
  latencyMs: number;
  status: GovernanceStatus;
  /** Line under the status badge (decision explanation). */
  summary: string;
  detail?: string;
  caught?: string;
  /** Model text when the request reached the provider; null when stopped at gateway. */
  aiResponse: string | null;
};

export function toChatTurnResult(
  outcome: GovernanceOutcome,
  latencyMs: number,
): ChatTurnResult {
  switch (outcome.status) {
    case "allowed":
      return {
        latencyMs,
        status: "allowed",
        summary: "Message passed policy checks and reached the model.",
        aiResponse: outcome.text,
      };
    case "blocked":
      return {
        latencyMs,
        status: "blocked",
        summary: outcome.headline,
        detail: outcome.detail || undefined,
        caught: outcome.caught,
        aiResponse: null,
      };
    case "budget_capped":
      return {
        latencyMs,
        status: "budget_capped",
        summary: outcome.detail,
        aiResponse: null,
      };
    case "flagged":
      return {
        latencyMs,
        status: "flagged",
        summary: outcome.note,
        aiResponse: outcome.text,
      };
  }
}

export function statusIcon(status: GovernanceStatus): string {
  switch (status) {
    case "allowed":
      return "✅";
    case "blocked":
      return "🛑";
    case "budget_capped":
      return "💸";
    case "flagged":
      return "⚠️";
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

export function blockedAiPlaceholder(): string {
  return "No response — Quantlix stopped the request before the model was called.";
}
