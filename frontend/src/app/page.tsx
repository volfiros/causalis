"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import SideGlobe from "@/components/SideGlobe";

function RevealLine({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div ref={ref} className="overflow-hidden">
      <div
        className={className}
        style={{
          transform: shown ? "translateY(0)" : "translateY(110%)",
          opacity: shown ? 1 : 0,
          transition: `transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms, opacity 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function FadeIn({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? "translateY(0)" : "translateY(16px)",
        transition: `opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1), transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)`,
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function LineReveal({ delay = 0 }: { delay?: number }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
      className="h-px bg-transparent origin-left"
      style={{
        transform: shown ? "scaleX(1)" : "scaleX(0)",
        transition: "transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
        transitionDelay: `${delay}ms`,
      }}
    />
  );
}

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <div
        style={{
          position: "absolute",
          top: "-10%",
          right: "-15%",
          width: "75%",
          height: "120%",
          zIndex: 0,
        }}
      >
        <SideGlobe autoRotate={true} />
      </div>

      <div className="absolute inset-0 pointer-events-none">
        <div
          className="h-full w-full"
          style={{
            background:
              "linear-gradient(to right, #000 0%, #000 25%, rgba(0,0,0,0.9) 35%, transparent 55%)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col justify-between h-full px-12 lg:px-20 py-16">
        <div />

        <div className="max-w-2xl">
          <FadeIn delay={400}>
            <p
              className="text-xs font-medium tracking-[0.25em] uppercase mb-10"
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                color: "var(--color-text-muted)",
              }}
            >
              Maritime Intelligence Platform
            </p>
          </FadeIn>

          <LineReveal delay={600} />

          <div className="mt-10">
            <RevealLine delay={700}>
              <h1
                className="text-[3.5rem] sm:text-[4.5rem] lg:text-[5.5rem] font-semibold leading-[0.95] tracking-[-0.035em]"
                style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}
              >
                Predict
              </h1>
            </RevealLine>

            <RevealLine delay={850}>
              <h1
                className="text-[3.5rem] sm:text-[4.5rem] lg:text-[5.5rem] font-semibold leading-[0.95] tracking-[-0.035em]"
                style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}
              >
                disruption
              </h1>
            </RevealLine>

            <RevealLine delay={1000}>
              <h1
                className="text-[3.5rem] sm:text-[4.5rem] lg:text-[5.5rem] font-semibold leading-[0.95] tracking-[-0.035em] text-white/40"
                style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}
              >
                before it cascades.
              </h1>
            </RevealLine>
          </div>

          <FadeIn delay={1300}>
            <p
              className="mt-8 text-base leading-[1.75] max-w-md"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Causalis maps how shipping disruptions ripple through ocean
              movement, routing decisions, and carrier&nbsp;behavior.
            </p>
          </FadeIn>

          <FadeIn delay={1600}>
            <button
              onClick={() => router.push("/chat")}
              className="mt-12 group relative inline-flex items-center gap-3 pl-8 pr-6 py-4 bg-white text-black text-sm font-semibold tracking-wide overflow-hidden transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
              style={{ borderRadius: "6px" }}
            >
              <span>Begin Session</span>
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-7-7 7 7-7 7" />
              </svg>
            </button>
          </FadeIn>
        </div>

        <FadeIn delay={2000}>
          <div className="flex items-center gap-8">
            <span
              className="text-[11px] tracking-[0.2em] uppercase"
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                color: "var(--color-text-muted)",
              }}
            >
              28 chokepoints monitored
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span
              className="text-[11px] tracking-[0.2em] uppercase"
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                color: "var(--color-text-muted)",
              }}
            >
              Real-time causal analysis
            </span>
            <span className="w-px h-3 bg-white/10" />
            <span
              className="text-[11px] tracking-[0.2em] uppercase"
              style={{
                fontFamily: "var(--font-mono), ui-monospace, monospace",
                color: "var(--color-text-muted)",
              }}
            >
              Global carrier coverage
            </span>
          </div>
        </FadeIn>
      </div>
    </div>
  );
}
