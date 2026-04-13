"use client";

import { useRef, useEffect } from "react";
import { useChat } from "@ai-sdk/react";
import { Send } from "lucide-react";
import SideGlobe from "@/components/SideGlobe";

const SUGGESTIONS = [
  "What if Suez Canal is blocked?",
  "Which carriers are most exposed to Red Sea risk?",
  "How does a Panama disruption affect US retail?",
];

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShown(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div
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

import { useState } from "react";

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat/stream",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSuggestion = (text: string) => {
    const fakeEvent = {
      target: inputRef.current,
    } as React.ChangeEvent<HTMLInputElement>;
    handleInputChange(fakeEvent);
    if (inputRef.current) {
      inputRef.current.value = text;
      const event = new Event("input", { bubbles: true });
      inputRef.current.dispatchEvent(event);
    }
    inputRef.current?.focus();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <SideGlobe />

      <div className="absolute inset-0 pointer-events-none">
        <div
          className="h-full w-full"
          style={{
            background:
              "linear-gradient(to right, #000 0%, #000 25%, rgba(0,0,0,0.9) 40%, rgba(0,0,0,0.6) 50%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <header
          className="px-12 lg:px-20 py-5 flex items-center justify-between"
          style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}
        >
          <p
            className="text-xs font-medium tracking-[0.2em] uppercase"
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              color: "rgba(255, 255, 255, 0.3)",
            }}
          >
            Causalis
          </p>
          <p
            className="text-[11px] tracking-[0.15em] uppercase"
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              color: "rgba(255, 255, 255, 0.2)",
            }}
          >
            Session Active
          </p>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-12 lg:px-20 py-12">
            {messages.length === 0 ? (
              <FadeIn delay={200}>
                <div className="mb-12">
                  <h2
                    className="text-3xl md:text-4xl font-semibold leading-[1.1] tracking-tight mb-4"
                    style={{ fontFamily: "var(--font-outfit), system-ui, sans-serif" }}
                  >
                    Ask anything about global shipping.
                  </h2>
                  <p
                    className="text-base leading-relaxed max-w-md"
                    style={{ color: "rgba(255, 255, 255, 0.4)" }}
                  >
                    Query shipping routes, ports, carriers, or disruption scenarios.
                  </p>
                </div>

                <div className="space-y-3">
                  {SUGGESTIONS.map((text, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(text)}
                      className="w-full text-left px-5 py-4 text-sm transition-all duration-300"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        color: "rgba(255, 255, 255, 0.5)",
                        borderRadius: "8px",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.06)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.15)";
                        e.currentTarget.style.color = "#ffffff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                        e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
                      }}
                    >
                      {text}
                    </button>
                  ))}
                </div>
              </FadeIn>
            ) : (
              <div className="space-y-6">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className="max-w-[80%] px-5 py-3"
                      style={
                        msg.role === "user"
                          ? {
                              backgroundColor: "#ffffff",
                              color: "#000000",
                              borderRadius: "12px 12px 4px 12px",
                            }
                          : {
                              backgroundColor: "rgba(255, 255, 255, 0.05)",
                              border: "1px solid rgba(255, 255, 255, 0.08)",
                              color: "rgba(255, 255, 255, 0.9)",
                              borderRadius: "12px 12px 12px 4px",
                            }
                      }
                    >
                      <p
                        className="text-sm leading-relaxed"
                        style={{
                          fontFamily: msg.role === "user"
                            ? "var(--font-outfit), system-ui, sans-serif"
                            : "inherit",
                        }}
                      >
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start">
                    <div
                      className="px-5 py-4"
                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        borderRadius: "12px 12px 12px 4px",
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        {[0, 150, 300].map((delay) => (
                          <div
                            key={delay}
                            className="w-1.5 h-1.5 rounded-full animate-bounce"
                            style={{
                              backgroundColor: "#22d3ee",
                              animationDelay: `${delay}ms`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        <div
          className="px-12 lg:px-20 py-6"
          style={{ borderTop: "1px solid rgba(255, 255, 255, 0.05)" }}
        >
          <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
            <div
              className="flex items-center gap-3 px-5 py-4 transition-all duration-300"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.05)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
              }}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Ask about shipping routes, ports, carriers..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500 disabled:opacity-50"
                style={{
                  fontFamily: "var(--font-outfit), system-ui, sans-serif",
                  color: "#ffffff",
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: input.trim() && !isLoading ? "#22d3ee" : "transparent",
                  color: input.trim() && !isLoading ? "#000000" : "#71717a",
                  borderRadius: "6px",
                }}
              >
                <Send className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
