export type ResponseIntent =
  | "guide"
  | "how-to"
  | "definition"
  | "troubleshooting"
  | "answer";

const INTENT_LABEL: Record<ResponseIntent, string> = {
  guide: "Guide",
  "how-to": "How-to",
  definition: "Definition",
  troubleshooting: "Troubleshooting",
  answer: "Answer",
};

export function inferResponseIntent(answer: string): ResponseIntent {
  const t = answer.toLowerCase();
  if (
    /\b(error|failed|blocked|422|500|503|timeout|troubleshoot|doesn't work|not working)\b/.test(
      t,
    )
  ) {
    return "troubleshooting";
  }
  if (/\b(step\s*\d|steps?:|first,|then,|finally,|^\d+\.\s)/m.test(t)) {
    return "guide";
  }
  if (/\b(how do i|how to|how can i|walk me through)\b/.test(t)) {
    return "how-to";
  }
  if (/\b(what is|what are|define|definition|means)\b/.test(t)) {
    return "definition";
  }
  return "answer";
}

export function intentLabel(intent: ResponseIntent): string {
  return INTENT_LABEL[intent];
}
