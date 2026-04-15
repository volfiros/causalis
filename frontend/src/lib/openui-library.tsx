import { createLibrary, defineComponent } from "@openuidev/react-lang";
import { useEffect } from "react";
import { z } from "zod";
import { emitGlobeEvent } from "./globe-events";

function StatCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        padding: "16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-mono), ui-monospace, monospace",
          fontSize: "11px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "rgba(255, 255, 255, 0.5)",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-outfit), system-ui, sans-serif",
          fontSize: "24px",
          fontWeight: 600,
          color: highlight ? "#22d3ee" : "#ffffff",
        }}
      >
        {value}
      </div>
    </div>
  );
}

export const ImpactStats = defineComponent({
  name: "ImpactStats",
  description: "High-level metrics grid showing vessels affected, routes disrupted, and estimated cost",
  props: z.object({
    vessels: z.number().describe("Number of vessels affected"),
    routes: z.number().describe("Number of routes disrupted"),
    cost_usd: z.number().describe("Estimated cost impact in USD"),
  }),
  component: ({ props }) => {
    const { vessels, routes, cost_usd } = props;

    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "1px",
          backgroundColor: "rgba(255, 255, 255, 0.08)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <StatCell label="Vessels" value={vessels.toLocaleString()} />
        <StatCell label="Routes" value={routes.toLocaleString()} />
        <StatCell label="Est. Cost" value={`$${(cost_usd / 1_000_000).toFixed(1)}M`} highlight />
      </div>
    );
  },
});

export const CarrierTable = defineComponent({
  name: "CarrierTable",
  description: "Carrier exposure ranking with exposure scores",
  props: z.object({
    carriers: z.array(
      z.object({
        name: z.string().describe("Carrier name"),
        exposure: z.number().describe("Exposure score 0-1"),
      }),
    ).describe("List of carriers with exposure data"),
  }),
  component: ({ props }) => {
    const { carriers } = props;

    return (
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          Carrier Exposure
        </div>
        {carriers.slice(0, 5).map((carrier, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderBottom: i < carriers.length - 1 ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "14px",
                color: "#ffffff",
              }}
            >
              {carrier.name}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "80px",
                  height: "4px",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderRadius: "2px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${carrier.exposure * 100}%`,
                    height: "100%",
                    backgroundColor: carrier.exposure > 0.7 ? "#22d3ee" : "rgba(255, 255, 255, 0.5)",
                    borderRadius: "2px",
                  }}
                />
              </div>
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "12px",
                  color: "rgba(255, 255, 255, 0.7)",
                  minWidth: "36px",
                  textAlign: "right",
                }}
              >
                {(carrier.exposure * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  },
});

export const ReroutingCard = defineComponent({
  name: "ReroutingCard",
  description: "Route alternative information showing delay and cost impact",
  props: z.object({
    route_id: z.string().describe("Route identifier"),
    additional_days: z.number().describe("Additional transit days"),
    additional_cost_usd: z.number().describe("Additional cost in USD"),
    vessels_affected: z.number().describe("Number of vessels affected"),
  }),
  component: ({ props }) => {
    const { route_id, additional_days, additional_cost_usd, vessels_affected } = props;

    return (
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.5)",
            }}
          >
            {route_id}
          </span>
          <span
            style={{
              fontFamily: "var(--font-outfit), system-ui, sans-serif",
              fontSize: "12px",
              color: "rgba(255, 255, 255, 0.7)",
            }}
          >
            {vessels_affected} vessels
          </span>
        </div>
        <div style={{ display: "flex", gap: "24px" }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.4)",
                marginBottom: "4px",
              }}
            >
              Delay
            </div>
            <div
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "18px",
                fontWeight: 600,
                color: "#22d3ee",
              }}
            >
              +{additional_days} days
            </div>
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "rgba(255, 255, 255, 0.4)",
                marginBottom: "4px",
              }}
            >
              Added Cost
            </div>
            <div
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "18px",
                fontWeight: 600,
                color: "#ffffff",
              }}
            >
              ${(additional_cost_usd / 1000).toFixed(0)}K
            </div>
          </div>
        </div>
      </div>
    );
  },
});

export const PortCongestion = defineComponent({
  name: "PortCongestion",
  description: "Port congestion forecast with baseline and projected values",
  props: z.object({
    port_id: z.string().describe("Port identifier"),
    baseline: z.number().describe("Baseline congestion level"),
    forecast: z.number().describe("Forecast congestion level"),
    dwell_increase_hours: z.number().describe("Additional dwell time in hours"),
  }),
  component: ({ props }) => {
    const { port_id, baseline, forecast, dwell_increase_hours } = props;
    const change = forecast - baseline;
    const changePercent = baseline === 0 ? "0.0" : ((change / baseline) * 100).toFixed(1);

    return (
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "12px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-outfit), system-ui, sans-serif",
              fontSize: "14px",
              fontWeight: 500,
              color: "#ffffff",
            }}
          >
            {port_id}
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              fontSize: "12px",
              color: "#22d3ee",
            }}
          >
            +{dwell_increase_hours.toFixed(1)}h dwell
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "10px",
                  color: "rgba(255, 255, 255, 0.4)",
                }}
              >
                Baseline
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "10px",
                  color: "rgba(255, 255, 255, 0.6)",
                }}
              >
                {baseline.toFixed(2)}
              </span>
            </div>
            <div
              style={{
                height: "4px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(baseline * 50, 100)}%`,
                  height: "100%",
                  backgroundColor: "rgba(255, 255, 255, 0.4)",
                  borderRadius: "2px",
                }}
              />
            </div>
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              fontSize: "14px",
              color: "rgba(255, 255, 255, 0.4)",
            }}
          >
            →
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "10px",
                  color: "rgba(255, 255, 255, 0.4)",
                }}
              >
                Forecast
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "10px",
                  color: "#22d3ee",
                }}
              >
                {forecast.toFixed(2)} (+{changePercent}%)
              </span>
            </div>
            <div
              style={{
                height: "4px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min(forecast * 50, 100)}%`,
                  height: "100%",
                  backgroundColor: "#22d3ee",
                  borderRadius: "2px",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
});

export const CascadeTimeline = defineComponent({
  name: "CascadeTimeline",
  description: "Timeline showing when impacts reach key ports",
  props: z.object({
    timeline: z.array(
      z.object({
        port: z.string().describe("Port name"),
        hours_to_impact: z.number().describe("Hours until impact"),
      }),
    ).describe("List of ports with impact timing"),
  }),
  component: ({ props }) => {
    const { timeline } = props;

    return (
      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.5)",
            marginBottom: "16px",
          }}
        >
          Cascade Timeline
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {timeline.slice(0, 5).map((entry, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: i === 0 ? "#22d3ee" : "rgba(255, 255, 255, 0.3)",
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-outfit), system-ui, sans-serif",
                  fontSize: "14px",
                  color: "#ffffff",
                  flex: 1,
                }}
              >
                {entry.port}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "12px",
                  color: i === 0 ? "#22d3ee" : "rgba(255, 255, 255, 0.5)",
                }}
              >
                +{entry.hours_to_impact}h
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  },
});

export const Stack = defineComponent({
  name: "Stack",
  description: "Vertical layout container for grouping OpenUI components",
  props: z.object({
    children: z.array(z.any()).default([]).describe("Child components to render vertically"),
  }),
  component: ({ props, renderNode }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {props.children.map((child, index) => (
        <div key={index}>{renderNode(child)}</div>
      ))}
    </div>
  ),
});

function GlobeVersionButton({ version, entities }: { version: number; entities: string[] }) {
  useEffect(() => {
    console.log("[GlobeVersion] emitGlobeEvent", { version, entities });
    emitGlobeEvent({ version, entities });
  }, [version, entities]);

  return (
    <button
      onClick={() => emitGlobeEvent({ version, entities })}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        backgroundColor: "rgba(34, 211, 238, 0.1)",
        border: "1px solid rgba(34, 211, 238, 0.3)",
        borderRadius: "6px",
        cursor: "pointer",
        fontFamily: "var(--font-outfit), system-ui, sans-serif",
        fontSize: "14px",
        color: "#22d3ee",
        transition: "all 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(34, 211, 238, 0.2)";
        e.currentTarget.style.borderColor = "rgba(34, 211, 238, 0.5)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "rgba(34, 211, 238, 0.1)";
        e.currentTarget.style.borderColor = "rgba(34, 211, 238, 0.3)";
      }}
    >
      <span style={{ fontSize: "16px" }}>🌐</span>
      <span>Globe: Version {version}</span>
    </button>
  );
}

export const GlobeVersion = defineComponent({
  name: "GlobeVersion",
  description: "Trigger to display the 3D globe visualization with affected entities",
  props: z.object({
    version: z.number().describe("Version identifier for the globe state"),
    entities: z.array(z.string()).default([]).describe("Relevant chokepoint and port ids for the globe state"),
  }),
  component: ({ props }) => <GlobeVersionButton version={props.version} entities={props.entities} />,
});

export const TextBlock = defineComponent({
  name: "TextBlock",
  description: "Narrative text content",
  props: z.object({
    text: z.string().describe("Text content to display"),
  }),
  component: ({ props }) => (
    <p
      style={{
        fontFamily: "var(--font-outfit), system-ui, sans-serif",
        fontSize: "14px",
        lineHeight: 1.7,
        color: "rgba(255, 255, 255, 0.9)",
        marginBottom: "16px",
      }}
    >
      {props.text}
    </p>
  ),
});

export const library = createLibrary({
  root: "Stack",
  components: [
    Stack,
    ImpactStats,
    CarrierTable,
    ReroutingCard,
    PortCongestion,
    CascadeTimeline,
    GlobeVersion,
    TextBlock,
  ],
});
