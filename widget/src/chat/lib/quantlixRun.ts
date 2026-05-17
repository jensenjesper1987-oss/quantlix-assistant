import type { ProtectedChatConfig } from "./config";
import { runDemoChat } from "./demoRun";
import {
  outcomeFromGenerated,
  outcomeFromHttpError,
  type GovernanceOutcome,
  type HistoryTurn,
} from "./governanceOutcome";

export type ChatRunRequest = {
  question: string;
  sessionId: string;
  history: HistoryTurn[];
};

async function runViaProxy(
  config: ProtectedChatConfig,
  request: ChatRunRequest,
): Promise<GovernanceOutcome> {
  const response = await fetch(config.proxyUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: request.question,
      session_id: request.sessionId,
      history: request.history,
    }),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return outcomeFromHttpError(response.status, body);
  }

  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    if (typeof data.answer === "string" && data.answer.trim()) {
      return outcomeFromGenerated(data.answer);
    }
  }

  return {
    status: "blocked",
    headline: "Unexpected proxy response",
    detail: "The proxy did not return an answer field.",
  };
}

async function runViaQuantlix(
  config: ProtectedChatConfig,
  request: ChatRunRequest,
): Promise<GovernanceOutcome> {
  const response = await fetch(`${config.apiBase}/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.apiKey,
    },
    body: JSON.stringify({
      deployment_id: config.deploymentId,
      input: {
        question: request.question,
        session_id: request.sessionId,
        history: request.history,
      },
      metadata: { source: "quantlix-chat-widget" },
    }),
  });

  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    return outcomeFromHttpError(response.status, body);
  }

  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    const output = data.output;
    if (output && typeof output === "object") {
      const generated = (output as Record<string, unknown>).generated;
      if (typeof generated === "string" && generated.trim()) {
        return outcomeFromGenerated(generated);
      }
    }
  }

  return {
    status: "blocked",
    headline: "No model output",
    detail:
      "Quantlix accepted the request but did not return inline output. Bind provider-backed inference on this deployment.",
  };
}

export async function runProtectedChat(
  config: ProtectedChatConfig,
  request: ChatRunRequest,
): Promise<GovernanceOutcome> {
  if (config.demo) {
    return runDemoChat(request);
  }
  if (config.proxyUrl) {
    return runViaProxy(config, request);
  }
  return runViaQuantlix(config, request);
}
