import type { GovernanceOutcome } from "./governanceOutcome";
import type { ChatRunRequest } from "./quantlixRun";

const DEMO_LATENCY_MS = { min: 350, max: 750 };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function demoLatency(): Promise<void> {
  const ms =
    DEMO_LATENCY_MS.min +
    Math.random() * (DEMO_LATENCY_MS.max - DEMO_LATENCY_MS.min);
  return delay(ms);
}

function matchesCardLeak(text: string): boolean {
  return /4242|credit card|card number|refund\s*#?\s*4521|visa|mastercard/i.test(text);
}

function matchesSsnLeak(text: string): boolean {
  return /\bssn\b|social security|078-05-1120|\d{3}-\d{2}-\d{4}/i.test(text);
}

function matchesCostLoop(text: string): boolean {
  return /loop|50000\s*tokens|ignore all|keep calling the api/i.test(text);
}

function matchesOffPolicy(text: string): boolean {
  return /illegal drugs|synthesiz|off-policy|ignore.{0,20}rules|harmful/i.test(text);
}

/** Simulated governance outcomes for Go Live previews without live API keys. */
export async function runDemoChat(request: ChatRunRequest): Promise<GovernanceOutcome> {
  await demoLatency();
  const text = request.question;

  if (matchesCardLeak(text)) {
    return {
      status: "blocked",
      headline: "Payment data detected. The AI never saw your message.",
      detail: "",
      caught: "VISA-like pattern",
    };
  }

  if (matchesSsnLeak(text)) {
    return {
      status: "blocked",
      headline: "Identity data detected. The AI never saw your message.",
      detail: "",
      caught: "SSN pattern",
    };
  }

  if (matchesCostLoop(text)) {
    return {
      status: "budget_capped",
      detail:
        "Session budget reached. Quantlix stopped the request before additional model cost accrued.",
    };
  }

  if (matchesOffPolicy(text)) {
    return {
      status: "flagged",
      text: "I cannot provide instructions for illegal or harmful activity.",
      note: "Quantlix flagged this prompt before a full model response was returned.",
    };
  }

  return {
    status: "allowed",
    text:
      "Quantlix governs prompts and responses on the way to your model. In production this answer comes from your deployment contract — scope, PII, jailbreak, and budget policies all run on the /run path.",
  };
}
