import React from "react";

export type EnforcementEvent = {
  id: string;
  outcome: "PASS" | "BLOCK";
  policy: string;
  latencyMs: number;
  reason?: string;
};

type EnforcementInsightProps = {
  events: EnforcementEvent[];
};

export function EnforcementInsight(props: EnforcementInsightProps): React.ReactElement {
  const { events } = props;

  if (!events.length) {
    return (
      <div className="ql-gov-empty">
        <p className="ql-gov-empty-title">No checks recorded yet</p>
        <p className="ql-gov-empty-copy">
          Send a message to see runtime governance decisions from the Quantlix gateway.
        </p>
      </div>
    );
  }

  return (
    <div className="ql-gov-list">
      {events.map((event) => (
        <div
          key={event.id}
          className={`ql-gov-card ql-gov-card--${event.outcome === "PASS" ? "pass" : "block"}`}
        >
          <div className="ql-gov-card-top">
            <span className="ql-gov-outcome" data-outcome={event.outcome}>
              {event.outcome === "PASS" ? "Allowed" : "Blocked"}
            </span>
            <span className="ql-gov-latency">{event.latencyMs} ms</span>
          </div>
          <p className="ql-gov-policy">{event.policy}</p>
          {event.reason ? <p className="ql-gov-reason">{event.reason}</p> : null}
        </div>
      ))}
    </div>
  );
}
