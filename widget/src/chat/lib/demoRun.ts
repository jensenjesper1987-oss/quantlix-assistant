import type { ChatTurnResult } from "./chatTurnResult";
import type { ChatRunRequest } from "./quantlixRun";

const DEMO_LATENCY_MS = { min: 8, max: 42 };

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function demoLatency(): number {
  const ms =
    DEMO_LATENCY_MS.min +
    Math.floor(Math.random() * (DEMO_LATENCY_MS.max - DEMO_LATENCY_MS.min));
  return ms;
}

function matchesCardLeak(text: string): boolean {
  return /4242|credit card|card number|refund\s*#?\s*4521|visa|mastercard/i.test(text);
}

function matchesSsnLeak(text: string): boolean {
  return /\bssn\b|social security|078-05-1120|\d{3}-\d{2}-\d{4}/i.test(text);
}

function matchesRunawayCosts(text: string): boolean {
  return /loop|50000\s*tokens|ignore all|keep calling the api|runaway/i.test(text);
}

function matchesOffPolicy(text: string): boolean {
  return /illegal drugs|synthesiz|step-by-step guide for making/i.test(text);
}

function matchesFrance(text: string): boolean {
  return /capital of france|paris/i.test(text);
}

function matchesGreeting(text: string): boolean {
  return /^(hi|hello|hey)\b/i.test(text.trim());
}

/** Simulated end-to-end turns for Go Live previews without live API keys. */
export async function runDemoChat(request: ChatRunRequest): Promise<ChatTurnResult> {
  const latencyMs = demoLatency();
  await delay(latencyMs);
  const text = request.question;

  if (matchesCardLeak(text)) {
    return {
      latencyMs,
      status: "blocked",
      summary: "Payment data detected. The AI never saw your message.",
      caught: "VISA-like pattern",
      aiResponse: null,
    };
  }

  if (matchesSsnLeak(text)) {
    return {
      latencyMs,
      status: "blocked",
      summary: "Identity data detected. The AI never saw your message.",
      caught: "SSN pattern",
      aiResponse: null,
    };
  }

  if (matchesRunawayCosts(text)) {
    return {
      latencyMs,
      status: "budget_capped",
      summary:
        "Session budget reached. Quantlix stopped the request before additional model cost accrued.",
      aiResponse: null,
    };
  }

  if (matchesOffPolicy(text)) {
    return {
      latencyMs,
      status: "flagged",
      summary: "Sensitive topic detected. Logged for review.",
      aiResponse:
        "I cannot provide instructions for illegal or harmful activity. I can help with product support or policy questions instead.",
    };
  }

  if (matchesFrance(text)) {
    return {
      latencyMs,
      status: "allowed",
      summary: "Message passed policy checks and reached the model.",
      aiResponse: "The capital of France is Paris.",
    };
  }

  if (matchesGreeting(text)) {
    return {
      latencyMs,
      status: "allowed",
      summary: "Message passed policy checks and reached the model.",
      aiResponse: "Hello! How can I help you today?",
    };
  }

  return {
    latencyMs,
    status: "allowed",
    summary: "Message passed policy checks and reached the model.",
    aiResponse:
      "Quantlix governs prompts and responses on the way to your model. In production this answer comes from your deployment — scope, PII, jailbreak, and budget policies all run on the /run path.",
  };
}
