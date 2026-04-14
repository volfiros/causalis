"use client";

import { useBackendHealth } from "@/lib/use-backend-health";
import { motion, AnimatePresence } from "framer-motion";

function WakeUpOverlay() {
  const { status, retryCount, progress } = useBackendHealth();

  if (status === "ready") return null;

  return (
    <AnimatePresence>
      <motion.div
        key="wakeup-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: "rgb(0, 0, 0)" }}
      >
        <div className="flex flex-col items-center gap-8 max-w-sm w-full px-8">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full"
            style={{
              border: "2px solid rgba(255, 255, 255, 0.1)",
              borderTopColor: "#22d3ee",
            }}
          />

          <div className="flex flex-col items-center gap-2">
            <h2
              className="text-lg font-semibold tracking-tight"
              style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}
            >
              {status === "checking" && "Connecting…"}
              {status === "waking" && "Waking things up…"}
              {status === "unavailable" && "Service unavailable"}
            </h2>
            <p
              className="text-sm text-center"
              style={{ color: "rgba(255, 255, 255, 0.4)" }}
            >
              {status === "checking" && "Checking backend connection"}
              {status === "waking" && "Backend is starting up. This may take a minute on first visit."}
              {status === "unavailable" && "Could not reach the backend. Please try again in a few minutes."}
            </p>
          </div>

          {status === "waking" && (
            <div className="w-full max-w-xs">
              <div
                className="w-full h-1 rounded-full overflow-hidden"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{ backgroundColor: "#22d3ee" }}
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <p
                className="text-[11px] mt-2 text-center"
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  color: "rgba(255, 255, 255, 0.2)",
                }}
              >
                Attempt {retryCount + 1}/{12}
              </p>
            </div>
          )}

          {status === "unavailable" && (
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 text-sm font-semibold"
              style={{
                backgroundColor: "#22d3ee",
                color: "#000",
                borderRadius: "6px",
              }}
            >
              Retry
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default WakeUpOverlay;