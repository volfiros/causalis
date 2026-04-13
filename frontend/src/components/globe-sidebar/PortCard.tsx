"use client";

interface PortCardProps {
  name: string;
  country: string;
  type: string;
  congestionScore: number;
  baselineDwell: number;
  currentDwell: number;
  annualTeu: number;
}

export function PortCard({
  name,
  country,
  type,
  congestionScore,
  baselineDwell,
  currentDwell,
  annualTeu,
}: PortCardProps) {
  const dwellIncrease = currentDwell - baselineDwell;
  const dwellIncreasePercent = baselineDwell > 0 ? ((dwellIncrease / baselineDwell) * 100).toFixed(0) : "0";

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (congestionScore / 100) * circumference;

  return (
    <div
      style={{
        padding: "16px",
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "8px",
        marginBottom: "16px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-outfit), system-ui, sans-serif",
          fontSize: "16px",
          fontWeight: 600,
          color: "#ffffff",
          marginBottom: "4px",
        }}
      >
        {name}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          {country}
        </span>
        <span
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "9px",
            padding: "2px 6px",
            backgroundColor: "rgba(34, 211, 238, 0.15)",
            color: "#22d3ee",
            borderRadius: "4px",
            textTransform: "uppercase",
          }}
        >
          {type}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div style={{ position: "relative", width: "52px", height: "52px" }}>
          <svg width="52" height="52" style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx="26"
              cy="26"
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="4"
            />
            <circle
              cx="26"
              cy="26"
              r={radius}
              fill="none"
              stroke="#22d3ee"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transition: "stroke-dashoffset 0.5s ease" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                fontSize: "12px",
                fontWeight: 600,
                color: "#22d3ee",
              }}
            >
              {congestionScore}%
            </span>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              fontSize: "10px",
              color: "rgba(255, 255, 255, 0.4)",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            Congestion
          </div>

          <div style={{ marginBottom: "8px" }}>
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
                Dwell
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: "10px",
                  color: dwellIncrease > 0 ? "#22d3ee" : "rgba(255, 255, 255, 0.6)",
                }}
              >
                {baselineDwell}h → {currentDwell}h (+{dwellIncreasePercent}%)
              </span>
            </div>
          </div>

          <div>
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
                TEU
              </span>
              <span
                style={{
                  fontFamily: "var(--font-outfit), system-ui, sans-serif",
                  fontSize: "11px",
                  color: "#ffffff",
                }}
              >
                {(annualTeu / 1000000).toFixed(1)}M
              </span>
            </div>
            <div
              style={{
                height: "3px",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "2px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${Math.min((annualTeu / 20000000) * 100, 100)}%`,
                  height: "100%",
                  backgroundColor: "#22d3ee",
                  borderRadius: "2px",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
