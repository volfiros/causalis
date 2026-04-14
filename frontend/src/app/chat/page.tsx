"use client";

import { useRef, useEffect, useState, useMemo, Component, type ErrorInfo, type ReactNode } from "react";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport } from "ai";
import { Send, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Renderer, type Library } from "@openuidev/react-lang";
import { library } from "@/lib/openui-library";
import { GlobeEventPayload, subscribeToGlobeEvents } from "@/lib/globe-events";
import {
  getPortById,
  getChokepointById,
  fetchSpatialData,
  getAllPorts,
  getAllChokepoints,
  getAllRoutes,
  SpatialPort,
  SpatialChokepoint,
  SpatialRoute,
} from "@/lib/spatial-data";
import { GlobeSidebar, EntityInfo } from "@/components/globe-sidebar";

class RendererErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn("[openui] Renderer error:", error.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function sanitizeOpenUIResponse(response: string): string {
  let text = response.trim();
  const codeBlockMatch = text.match(/```(?:openui|openui-lang)?\n([\s\S]*?)```/);
  if (codeBlockMatch) text = codeBlockMatch[1].trim();
  if (!text.startsWith("root =")) {
    const rootMatch = text.match(/(root\s*=\s*Stack\([\s\S]*)/);
    if (rootMatch) text = rootMatch[1];
  }
  return text;
}

function extractTextFromOpenUI(text: string): string {
  if (!text.includes("TextBlock") && !text.includes("root =") && !text.includes("=")) {
    return text;
  }
  const texts: string[] = [];
  const textBlockRegex = /TextBlock\(text\s*=\s*"((?:[^"\\]|\\.)*)"\)/g;
  let match: RegExpExecArray | null;
  while ((match = textBlockRegex.exec(text)) !== null) {
    texts.push(match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"'));
  }
  if (texts.length > 0) return texts.join("\n\n");
  const stringLiterals = text.match(/"((?:[^"\\]|\\.)*)"/g);
  if (stringLiterals && stringLiterals.length > 0) {
    return stringLiterals.map(s => s.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"')).join(" ");
  }
  return text;
}

function OpenUIRenderer({
  response,
  library,
  isStreaming,
  fallback,
}: {
  response: string;
  library: Library;
  isStreaming: boolean;
  fallback: ReactNode;
}) {
  const [hasRoot, setHasRoot] = useState(false);
  const sanitized = useMemo(() => sanitizeOpenUIResponse(response), [response]);
  return (
    <RendererErrorBoundary fallback={fallback}>
      {hasRoot ? null : fallback}
      <div style={hasRoot ? undefined : { display: "none" }}>
        <Renderer
          response={sanitized}
          library={library}
          isStreaming={isStreaming}
          onError={() => {}}
          onParseResult={(result) => {
            setHasRoot(!!result?.root);
          }}
        />
      </div>
    </RendererErrorBoundary>
  );
}

const SUGGESTIONS = [
  "Simulate a full closure of the Suez Canal",
  "What happens if the Strait of Hormuz is blocked?",
  "Model a disruption at the Panama Canal",
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

function getMessageText(message: { parts?: Array<{ type: string; text?: string }> }) {
  return (message.parts ?? [])
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("");
}

function FloatingChatPanel({
  messages,
  input,
  setInput,
  isLoading,
  error,
  onSubmit,
  isExpanded,
  setIsExpanded,
}: {
  messages: Array<{ id: string; role: string; parts?: Array<{ type: string; text?: string }> }>;
  input: string;
  setInput: (s: string) => void;
  isLoading: boolean;
  error: Error | undefined;
  onSubmit: (e: React.FormEvent) => void;
  isExpanded: boolean;
  setIsExpanded: (v: boolean) => void;
}) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "400px",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(12px)",
        zIndex: 25,
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-mono), ui-monospace, monospace",
            fontSize: "11px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255, 255, 255, 0.5)",
          }}
        >
          Conversation
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.5)",
            cursor: "pointer",
            padding: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              flex: 1,
              overflow: "auto",
              padding: "16px 20px",
            }}
          >
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[90%] px-4 py-2"
                    style={
                      msg.role === "user"
                        ? {
                            backgroundColor: "rgba(255, 255, 255, 0.9)",
                            color: "#000000",
                            borderRadius: "12px 12px 4px 12px",
                          }
                        : {
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            borderRadius: "12px 12px 12px 4px",
                          }
                    }
                  >
                    <p
                      className="text-sm"
                      style={{
                        fontFamily: "var(--font-outfit), system-ui, sans-serif",
                      }}
                    >
                      {getMessageText(msg)}
                    </p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div
                    className="px-4 py-3"
                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
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

              {error && (
                <div className="flex justify-start">
                  <div
                    className="px-4 py-2"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "12px 12px 12px 4px",
                    }}
                  >
                    <p
                      className="text-sm"
                      style={{
                        fontFamily: "var(--font-outfit), system-ui, sans-serif",
                        color: "rgba(239, 68, 68, 0.9)",
                      }}
                    >
                      {error.message || "Something went wrong."}
                    </p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <form onSubmit={onSubmit}>
          <div
            className="flex items-center gap-2 px-4 py-3"
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "8px",
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about shipping..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-zinc-500"
              style={{
                fontFamily: "var(--font-outfit), system-ui, sans-serif",
                color: "#ffffff",
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2"
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
    </motion.div>
  );
}

function ChatPanel({
  messages,
  input,
  setInput,
  isLoading,
  error,
  inputRef,
  handleFormSubmit,
  handleSuggestion,
  messagesEndRef,
  isSidebarOpen,
  onToggleSidebar,
}: {
  messages: Array<{ id: string; role: string; parts?: Array<{ type: string; text?: string }> }>;
  input: string;
  setInput: (s: string) => void;
  isLoading: boolean;
  error: Error | undefined;
  inputRef: React.RefObject<HTMLInputElement | null>;
  handleFormSubmit: (e: React.FormEvent) => void;
  handleSuggestion: (text: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  return (
    <div 
      className="relative z-10 flex flex-col h-full transition-all duration-300 ease-in-out"
      style={{
        marginRight: isSidebarOpen ? "320px" : "0",
      }}
    >
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
        <div className="flex items-center gap-4">
          <p
            className="text-[11px] tracking-[0.15em] uppercase"
            style={{
              fontFamily: "var(--font-mono), ui-monospace, monospace",
              color: "rgba(255, 255, 255, 0.2)",
            }}
          >
            Session Active
          </p>
        </div>
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
                    className="max-w-[85%] px-5 py-3"
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
                            borderRadius: "12px 12px 12px 4px",
                          }
                    }
                  >
                    {msg.role === "user" ? (
                      <p
                        className="text-sm leading-relaxed"
                        style={{
                          fontFamily: "var(--font-outfit), system-ui, sans-serif",
                        }}
                      >
                        {getMessageText(msg)}
                      </p>
                    ) : (
                      <OpenUIRenderer
                        response={getMessageText(msg)}
                        library={library}
                        isStreaming={isLoading && msg.id === messages[messages.length - 1]?.id}
                        fallback={
                          <p
                            className="text-sm leading-relaxed"
                            style={{
                              fontFamily: "var(--font-outfit), system-ui, sans-serif",
                              color: "rgba(255, 255, 255, 0.9)",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {extractTextFromOpenUI(getMessageText(msg))}
                          </p>
                        }
                      />
                    )}
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

              {error && (
                <div className="flex justify-start">
                  <div
                    className="px-5 py-3"
                    style={{
                      backgroundColor: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      borderRadius: "12px 12px 12px 4px",
                    }}
                  >
                    <p
                      className="text-sm"
                      style={{
                        fontFamily: "var(--font-outfit), system-ui, sans-serif",
                        color: "rgba(239, 68, 68, 0.9)",
                      }}
                    >
                      {error.message || "Something went wrong. Please try again."}
                    </p>
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
        <form onSubmit={handleFormSubmit} className="max-w-2xl mx-auto">
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
              onChange={(e) => setInput(e.target.value)}
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
  );
}

function ChatContent() {
  const { messages, sendMessage, status, error } = useChat({
    transport: new TextStreamChatTransport({ api: "/api/chat/stream" }),
  });
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [globeState, setGlobeState] = useState<GlobeEventPayload | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [ports, setPorts] = useState<SpatialPort[]>([]);
  const [chokepoints, setChokepoints] = useState<SpatialChokepoint[]>([]);
  const [routes, setRoutes] = useState<SpatialRoute[]>([]);
  const clientVersionRef = useRef(0);
  const previousEntitiesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    fetchSpatialData()
      .then(() => {
        setPorts(getAllPorts());
        setChokepoints(getAllChokepoints());
        setRoutes(getAllRoutes());
      })
      .catch((err) => console.error("Failed to initialize spatial data:", err));
  }, []);

  const entityInfos = useMemo(() => {
    if (!globeState) return [];

    const infos: EntityInfo[] = [];
    for (const entityId of globeState.entities) {
      const port = getPortById(entityId);
      if (port) {
        infos.push({ id: entityId, name: port.name, type: "port" });
        continue;
      }
      const chokepoint = getChokepointById(entityId);
      if (chokepoint) {
        infos.push({ id: entityId, name: chokepoint.name, type: "chokepoint" });
      }
    }
    return infos;
  }, [globeState]);

  useEffect(() => {
    const unsubscribe = subscribeToGlobeEvents((payload) => {
      const newEntityIds = payload.entities.filter((id) => !previousEntitiesRef.current.has(id));
      const hasNewEntities = newEntityIds.length > 0;
      const removedEntityIds = Array.from(previousEntitiesRef.current).filter(
        (id) => !payload.entities.includes(id)
      );
      const hasRemovedEntities = removedEntityIds.length > 0;

      if (hasNewEntities || hasRemovedEntities) {
        clientVersionRef.current += 1;
        previousEntitiesRef.current.clear();
        payload.entities.forEach((id) => previousEntitiesRef.current.add(id));
      }

      const eventPayload: GlobeEventPayload = {
        ...payload,
        version: clientVersionRef.current,
      };

      setGlobeState(eventPayload);
      setIsSidebarOpen(true);

      if (payload.selectedEntityId) {
        setSelectedPinId(payload.selectedEntityId);
      }
    });
    return unsubscribe;
  }, []);

  const highlightedRouteIds = useMemo(() => {
    if (!selectedPinId) return [];
    return routes
      .filter(
        (r) =>
          r.chokepoints_transited.includes(selectedPinId) ||
          r.origin_port_id === selectedPinId ||
          r.destination_port_id === selectedPinId
      )
      .map((r) => r.id);
  }, [selectedPinId, routes]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const isLoading = status === "submitted" || status === "streaming";

  const handleSuggestion = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const nextInput = input;
    setInput("");
    await sendMessage({ text: nextInput });
  };

  const handleEntitySelect = (entityId: string) => {
    setSelectedPinId(entityId === selectedPinId ? null : entityId);
  };

  const handleClearFilters = () => {
    setSelectedPinId(null);
  };

  const highlightedEntities = globeState?.entities ?? [];


  return (
    <>
      <GlobeSidebar
        globeState={globeState}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        entityInfos={entityInfos}
        selectedEntityId={selectedPinId}
        onEntitySelect={handleEntitySelect}
        ports={ports}
        chokepoints={chokepoints}
        routes={routes}
        onClearFilters={handleClearFilters}
        isFullscreen={isFullscreen}
        onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
        highlightedEntities={highlightedEntities}
        highlightedRouteIds={highlightedRouteIds}
        onPinClick={setSelectedPinId}
      />

      <AnimatePresence>
        {isFullscreen && (
          <FloatingChatPanel
            messages={messages}
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            error={error}
            onSubmit={handleFormSubmit}
            isExpanded={isChatExpanded}
            setIsExpanded={setIsChatExpanded}
          />
        )}
      </AnimatePresence>

      {!isFullscreen && (
        <ChatPanel
          messages={messages}
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          error={error}
          inputRef={inputRef}
          handleFormSubmit={handleFormSubmit}
          handleSuggestion={handleSuggestion}
          messagesEndRef={messagesEndRef}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      )}
    </>
  );
}

export default function ChatPage() {
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <ChatContent />
    </div>
  );
}