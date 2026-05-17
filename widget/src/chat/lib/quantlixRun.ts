import type { ProtectedChatConfig } from "./config";
import { runDemoChat } from "./demoRun";
import { toChatTurnResult, type ChatTurnResult } from "./chatTurnResult";
import {
  outcomeFromGenerated,
  outcomeFromHttpError,
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
  started: number,
): Promise<ChatTurnResult> {
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

  const latencyMs = Math.round(performance.now() - started);

  if (!response.ok) {
    return toChatTurnResult(outcomeFromHttpError(response.status, body), latencyMs);
  }

  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    if (typeof data.answer === "string" && data.answer.trim()) {
      return toChatTurnResult(outcomeFromGenerated(data.answer), latencyMs);
    }
  }

  return toChatTurnResult(
    {
      status: "blocked",
      headline: "Unexpected proxy response",
      detail: "The proxy did not return an answer field.",
    },
    latencyMs,
  );
}

async function runViaQuantlix(
  config: ProtectedChatConfig,
  request: ChatRunRequest,
  started: number,
): Promise<ChatTurnResult> {
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

  const latencyMs = Math.round(performance.now() - started);

  if (!response.ok) {
    return toChatTurnResult(outcomeFromHttpError(response.status, body), latencyMs);
  }

  if (body && typeof body === "object") {
    const data = body as Record<string, unknown>;
    const output = data.output;
    if (output && typeof output === "object") {
      const generated = (output as Record<string, unknown>).generated;
      if (typeof generated === "string" && generated.trim()) {
        return toChatTurnResult(outcomeFromGenerated(generated), latencyMs);
      }
    }
  }

  return toChatTurnResult(
    {
      status: "blocked",
      headline: "No model output",
      detail:
        "Quantlix accepted the request but did not return inline output. Bind provider-backed inference on this deployment.",
    },
    latencyMs,
  );
}

export async function runProtectedChat(
  config: ProtectedChatConfig,
  request: ChatRunRequest,
): Promise<ChatTurnResult> {
  if (config.demo) {
    return runDemoChat(request);
  }

  const started = performance.now();

  if (config.proxyUrl) {
    return runViaProxy(config, request, started);
  }
  return runViaQuantlix(config, request, started);
}
