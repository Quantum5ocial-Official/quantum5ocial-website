// pages/ai/index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from 'ai';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ChatMsg = {
  id: string;
  role: "user" | "ai";
  text: string;
  ts: number;
};

type ChatThread = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  msgs: ChatMsg[];
};

const FIXED_REPLY =
  "Sorry — I’m still undergoing my training at Quantum5ocial. I will be at your service soon.";

function safeId() {
  return (
    Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36)
  );
}

function firstNameOf(fullName: string | null | undefined) {
  const s = (fullName || "").trim();
  if (!s) return null;
  return s.split(/\s+/).filter(Boolean)[0] || null;
}

function lastPreviewOf(thread: ChatThread) {
  const msgs = thread.msgs || [];
  if (msgs.length === 0) return "—";
  const reversed = [...msgs].reverse();
  const last = reversed.find((m) => (m.text || "").trim().length > 0);
  return (last?.text || "—").trim();
}

function useIsMobile(maxWidth = 900) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const set = () => setIsMobile(mq.matches);

    set();

    const anyMq = mq as any;
    if (mq.addEventListener) {
      mq.addEventListener("change", set);
      return () => mq.removeEventListener("change", set);
    }
    if (anyMq.addListener) {
      anyMq.addListener(set);
      return () => anyMq.removeListener(set);
    }
  }, [maxWidth]);

  return isMobile;
}

/* =========================
   Middle (desktop + mobile)
   - Desktop: chat + right rail (same as before)
   - Mobile: chat only + history drawer (right)
   ========================= */

function TattvaAIMiddle() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  // auth guard
  useEffect(() => {
    if (!loading && !user) router.replace("/auth?redirect=/ai");
  }, [loading, user, router]);

  const isMobile = useIsMobile(900);

  // name from profiles
  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let alive = true;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", uid)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.warn("AI page: could not load profile name", error);
        setProfileName(null);
        return;
      }

      setProfileName((data as any)?.full_name ?? null);
    })();

    return () => {
      alive = false;
    };
  }, [user?.id]);

  const displayFirstName = useMemo(() => {
    const fromProfile = firstNameOf(profileName);
    if (fromProfile) return fromProfile;

    const meta =
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined) ||
      null;

    const fromMeta = firstNameOf(meta);
    if (fromMeta) return fromMeta;

    // never use email
    return "there";
  }, [profileName, user?.id]);

  // history persistence per-user
  const storageKey = useMemo(() => {
    const uid = user?.id || "anon";
    return `q5:tattva:threads:v3:${uid}`;
  }, [user?.id]);

  // persistent rail collapsed state (desktop only)
  const railKey = useMemo(() => {
    const uid = user?.id || "anon";
    return `q5:tattva:railCollapsed:v1:${uid}`;
  }, [user?.id]);

  const greetingText = useMemo(
    () =>
      `Hi ${displayFirstName} — I’m Tattva.
How can I help you?`,
    [displayFirstName]
  );

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId]
  );

  // history search
  const [threadQuery, setThreadQuery] = useState("");

  const filteredThreads = useMemo(() => {
    const q = threadQuery.trim().toLowerCase();
    const list = [...(threads || [])].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return list;

    return list.filter((t) => {
      const title = (t.title || "").toLowerCase();
      const prev = lastPreviewOf(t).toLowerCase();
      return title.includes(q) || prev.includes(q);
    });
  }, [threads, threadQuery]);

  // load threads
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatThread[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThreads(parsed);
          setActiveId(parsed[0].id);
          return;
        }
      }
    } catch {
      // ignore
    }

    const t: ChatThread = {
      id: safeId(),
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      msgs: [{ id: "m0", role: "ai", text: greetingText, ts: Date.now() }],
    };
    setThreads([t]);
    setActiveId(t.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, user?.id]);

  // load rail collapsed (desktop only)
  const [railCollapsed, setRailCollapsed] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(railKey);
      if (raw === "1") setRailCollapsed(true);
    } catch {
      // ignore
    }
  }, [railKey]);

  // persist rail collapsed (desktop only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(railKey, railCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [railCollapsed, railKey]);

  // persist threads
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(threads));
    } catch {
      // ignore
    }
  }, [threads, storageKey]);

  // update greeting when name resolves (only updates first AI message of active thread)
  useEffect(() => {
    if (!activeThread) return;
    if (activeThread.msgs.length === 0) return;

    const first = activeThread.msgs[0];
    if (first.role !== "ai") return;
    if (first.text === greetingText) return;

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== activeThread.id) return t;
        const msgs = [...t.msgs];
        msgs[0] = { ...msgs[0], text: greetingText };
        return { ...t, msgs, updatedAt: Date.now() };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [greetingText]);

  // scroller for messages
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [activeId, activeThread?.msgs.length]);

  const [input, setInput] = useState("");

  const renameIfNeeded = (threadId: string, userText: string) => {
    const title = (userText || "").trim().slice(0, 42);
    if (!title) return;

    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId && (t.title === "New chat" || !t.title)
          ? { ...t, title, updatedAt: Date.now() }
          : t
      )
    );
  };

  const { messages, setMessages, sendMessage, status, stop, regenerate, error } = useChat({
    id: activeThread?.id,
    initialMessages: activeThread?.msgs.map((m) => ({
      id: m.id,
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text,
      createdAt: new Date(m.ts),
    })) ?? [],
    transport: new DefaultChatTransport({
      api: '/api/chat',
    }),
    onFinish: (message: any) => {
      // This callback runs when the AI finishes its response.
      // You can add analytics or other logic here.

      // ANSWER TO OPENAI QUESTION:
      // To use OpenAI instead of Gemini, you just need to:
      // 1. In `app/api/chat/route.ts`, change the model to `openai('gpt-4-turbo')` (or similar).
      // 2. Ensure you have the `openai` provider configured.
      // 3. This frontend code (useChat) remains EXACTLY the same! The Vercel AI SDK abstracts the provider differences.
    }
  } as any);

  const isLoading = status === "submitted" || status === "streaming";

  // Sync state: activeThread -> useChat (when switching threads)
  useEffect(() => {
    // If the thread ID changes, we reset the messages to that thread's history
    // NOTE: passing `id` and `initialMessages` to useChat handles this automatically 
    // in newer versions, but we can enforce it here if needed. 
    // With `id` passed to useChat, it should separate sessions.
  }, [activeThread?.id]);


  // Sync state: useChat -> persistence (threads)
  useEffect(() => {
    if (!activeThread) return;

    // Convert back to ChatMsg
    const currentMsgs: ChatMsg[] = messages.map((m) => ({
      id: m.id,
      role: m.role === "assistant" ? "ai" : (m.role as "user" | "ai"),
      text: m.parts?.find(p => p.type === 'text')?.text || "",
      ts: Date.now(),
    }));

    // Avoid infinite loops: check if length or content changed significantly
    if (JSON.stringify(currentMsgs) === JSON.stringify(activeThread.msgs)) {
      return;
    }

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id === activeThread.id) {
          let title = t.title;
          // Auto-rename logic
          if (title === "New chat" && currentMsgs.length > 1) {
            const firstUser = currentMsgs.find(m => m.role === 'user');
            if (firstUser) title = firstUser.text.slice(0, 40).trim();
          }
          return { ...t, msgs: currentMsgs, title, updatedAt: Date.now() };
        }
        return t;
      })
    );
  }, [messages, status, activeThread?.id]);


  const send = () => {
    const q = input.trim();
    if (!q) return;

    // Just send the message. The useEffect above will handle saving to 'activeThread'
    sendMessage({ text: q });
    setInput("");
  };

  const newThread = () => {
    const t: ChatThread = {
      id: safeId(),
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      msgs: [{ id: "m0", role: "ai", text: greetingText, ts: Date.now() }],
    };
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    if (isMobile) setHistoryOpen(false);
  };

  // mobile history drawer
  const [historyOpen, setHistoryOpen] = useState(false);

  // ESC closes drawer on mobile
  useEffect(() => {
    if (!isMobile) return;
    if (!historyOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHistoryOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, historyOpen]);

  if (!user && !loading) return null;

  const railW = 360;
  const railCollapsedW = 56;

  return (
    <section
      className="section"
      style={{
        height: "calc(100vh - 120px)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // no page scroll
      }}
    >
      {/* Header card */}
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.16), rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.35)",
          flex: "0 0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 14,
                border: "1px solid rgba(34,211,238,0.45)",
                background: "rgba(2,6,23,0.55)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 0 6px rgba(34,211,238,0.06)",
              }}
              aria-hidden
            >
              🧠
            </div>

            <div>
              <div className="section-title" style={{ marginBottom: 2 }}>
                Tattva AI
              </div>
              <div className="section-sub" style={{ maxWidth: 680 }}>
                Explore careers, products, and people at Quantum5ocial with Tattva
              </div>
            </div>
          </div>

          {/* Mobile-only: History pill */}
          {isMobile && (
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(2,6,23,0.55)",
                color: "rgba(226,232,240,0.95)",
                cursor: "pointer",
                fontSize: 13,
                fontWeight: 900,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 12px 28px rgba(15,23,42,0.35)",
                whiteSpace: "nowrap",
              }}
              title="Open chat history"
              aria-label="Open chat history"
            >
              🗂️ History
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div
        style={{
          flex: "1 1 auto",
          minHeight: 0,
          display: "flex",
          gap: 14,
          overflow: "hidden",
        }}
      >
        {/* Chat */}
        <div
          className="card"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            padding: 14,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(15,23,42,0.72)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            borderRadius: 18,
          }}
        >
          <div
            ref={scrollerRef}
            style={{
              flex: 1,
              minHeight: 0,
              overflowY: "auto",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {(activeThread?.msgs || []).map((m) => (
              <div
                key={m.id}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "78%",
                  padding: "10px 12px",
                  borderRadius: 16,
                  fontSize: 13.5,
                  lineHeight: 1.35,
                  border:
                    m.role === "user"
                      ? "1px solid rgba(34,211,238,0.40)"
                      : "1px solid rgba(148,163,184,0.22)",
                  background:
                    m.role === "user"
                      ? "rgba(2,6,23,0.55)"
                      : "rgba(2,6,23,0.35)",
                  color: "rgba(226,232,240,0.95)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <span><ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown></span>
              </div>
            ))}
          </div>
          {isLoading && (
            <div
              className="typing-indicator"
              style={{
                alignSelf: "flex-start",
                maxWidth: "78%",
                padding: "10px 12px",
                borderRadius: 16,
                fontSize: 13.5,
                lineHeight: 1.35,
                border:
                  "1px solid rgba(148,163,184,0.22)",
                background:
                  "rgba(2,6,23,0.35)",
                color: "rgba(226,232,240,0.95)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
              <span>•</span><span>•</span><span>•</span>
            </div>
          )}

          {error && (
            <div
              style={{
                alignSelf: "flex-start",
                maxWidth: "78%",
                padding: "10px 12px",
                borderRadius: 16,
                fontSize: 13.5,
                lineHeight: 1.35,
                border:
                  "1px solid rgba(148,163,184,0.22)",
                background:
                  "rgba(127, 29, 29, 0.4)",
                color: "rgba(226,232,240,0.95)",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}>
              <div>Quantum fluctuation detected: {error.message}</div>
              <button
                onClick={() => regenerate()}
                className="retry-btn"
                type="button"
              >
                ↻ Retry
              </button>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            style={{
              marginTop: 10,
              display: "flex",
              gap: 10,
              alignItems: "center",
              paddingTop: 10,
              borderTop: "1px solid rgba(148,163,184,0.18)",
              flex: "0 0 auto",
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              disabled={isLoading}
              style={{
                flex: 1,
                height: 44,
                padding: "0 14px",
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.30)",
                background: "rgba(2,6,23,0.62)",
                color: "rgba(226,232,240,0.95)",
                fontSize: 14,
                outline: "none",
                minWidth: 0,
                opacity: isLoading ? 0.5 : 1,
              }}
            />

            <button
              type="submit"
              disabled={isLoading}
              style={{
                height: 44,
                padding: "0 16px",
                borderRadius: 14,
                border: "1px solid rgba(34,211,238,0.60)",
                background: "linear-gradient(90deg,#22d3ee,#6366f1)",
                color: "#0f172a",
                fontSize: 14,
                fontWeight: 900,
                flexShrink: 0,
                opacity: isLoading ? 0.5 : 1,
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              Send
            </button>
          </form>
        </div>

        {/* Desktop right rail (unchanged) */}
        {!isMobile && (
          <aside
            className="card"
            style={{
              width: railCollapsed ? railCollapsedW : railW,
              maxWidth: "calc(100vw - 56px)",
              transition: "width 160ms ease",
              border: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(2,6,23,0.78)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              borderRadius: 18,
              flexShrink: 0,
              minHeight: 0,
            }}
          >
            {/* top bar */}
            <div
              style={{
                padding: 12,
                display: "flex",
                justifyContent: railCollapsed ? "center" : "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(148,163,184,0.18)",
                gap: 10,
              }}
            >
              {!railCollapsed && (
                <div
                  style={{ fontWeight: 900, color: "rgba(226,232,240,0.95)" }}
                >
                  History
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "flex-end",
                }}
              >
                {!railCollapsed && (
                  <button
                    type="button"
                    onClick={newThread}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.30)",
                      background: "rgba(15,23,42,0.55)",
                      color: "rgba(226,232,240,0.95)",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    + New
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setRailCollapsed((v) => !v)}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.30)",
                    background: "rgba(15,23,42,0.55)",
                    color: "rgba(226,232,240,0.95)",
                    cursor: "pointer",
                    fontSize: 14,
                    fontWeight: 900,
                  }}
                  aria-label={railCollapsed ? "Expand history" : "Collapse history"}
                  title={railCollapsed ? "Expand" : "Collapse"}
                >
                  {railCollapsed ? "❮" : "❯"}
                </button>
              </div>
            </div>

            {/* collapsed view */}
            {railCollapsed ? (
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0.85,
                  padding: 10,
                  color: "rgba(226,232,240,0.85)",
                  fontSize: 12,
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  userSelect: "none",
                  letterSpacing: "0.08em",
                }}
              >
                HISTORY
              </div>
            ) : (
              <>
                {/* search */}
                <div style={{ padding: 12 }}>
                  <input
                    value={threadQuery}
                    onChange={(e) => setThreadQuery(e.target.value)}
                    placeholder="Search chats…"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.26)",
                      background: "rgba(2,6,23,0.62)",
                      color: "rgba(226,232,240,0.95)",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />
                </div>

                {/* list */}
                <div
                  style={{
                    padding: "0 12px 12px 12px",
                    overflowY: "auto",
                    flex: 1,
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {filteredThreads.length === 0 ? (
                    <div style={{ padding: 10, opacity: 0.75, fontSize: 13 }}>
                      No chats found.
                    </div>
                  ) : (
                    filteredThreads.map((t) => {
                      const isActive = t.id === activeId;
                      const preview = lastPreviewOf(t);

                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveId(t.id)}
                          style={{
                            textAlign: "left",
                            width: "100%",
                            padding: "10px 12px",
                            borderRadius: 14,
                            border: isActive
                              ? "1px solid rgba(34,211,238,0.55)"
                              : "1px solid rgba(148,163,184,0.18)",
                            background: isActive
                              ? "rgba(2,6,23,0.72)"
                              : "rgba(15,23,42,0.35)",
                            color: "rgba(226,232,240,0.95)",
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 900,
                              fontSize: 13,
                              lineHeight: 1.15,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {t.title || "Chat"}
                          </div>

                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 12,
                              opacity: 0.78,
                              lineHeight: 1.25,
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              wordBreak: "break-word",
                            }}
                          >
                            {preview || "—"}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </aside>
        )}

        {/* Mobile history drawer (right) */}
        {isMobile && (
          <>
            {/* overlay */}
            <div
              onClick={() => setHistoryOpen(false)}
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(2,6,23,0.55)",
                opacity: historyOpen ? 1 : 0,
                pointerEvents: historyOpen ? "auto" : "none",
                transition: "opacity 160ms ease",
                zIndex: 120,
              }}
            />

            {/* drawer */}
            <aside
              className="card"
              style={{
                position: "fixed",
                top: 0,
                right: 0,
                height: "100vh",
                width: "min(360px, 88vw)",
                transform: historyOpen ? "translateX(0)" : "translateX(102%)",
                transition: "transform 180ms ease",
                zIndex: 121,
                borderRadius: 0,
                borderLeft: "1px solid rgba(148,163,184,0.28)",
                background: "rgba(2,6,23,0.92)",
                boxShadow: "-18px 0 60px rgba(0,0,0,0.55)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(148,163,184,0.18)",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 900, color: "rgba(226,232,240,0.95)" }}>
                  History
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={newThread}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.30)",
                      background: "rgba(15,23,42,0.55)",
                      color: "rgba(226,232,240,0.95)",
                      cursor: "pointer",
                      fontSize: 12.5,
                      fontWeight: 900,
                      whiteSpace: "nowrap",
                    }}
                  >
                    + New
                  </button>

                  <button
                    type="button"
                    onClick={() => setHistoryOpen(false)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.30)",
                      background: "rgba(15,23,42,0.55)",
                      color: "rgba(226,232,240,0.95)",
                      cursor: "pointer",
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                    aria-label="Close history"
                    title="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div style={{ padding: 12 }}>
                <input
                  value={threadQuery}
                  onChange={(e) => setThreadQuery(e.target.value)}
                  placeholder="Search chats…"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.26)",
                    background: "rgba(2,6,23,0.62)",
                    color: "rgba(226,232,240,0.95)",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div
                style={{
                  padding: "0 12px 12px 12px",
                  overflowY: "auto",
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {filteredThreads.length === 0 ? (
                  <div style={{ padding: 10, opacity: 0.75, fontSize: 13 }}>
                    No chats found.
                  </div>
                ) : (
                  filteredThreads.map((t) => {
                    const isActive = t.id === activeId;
                    const preview = lastPreviewOf(t);

                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setActiveId(t.id);
                          setHistoryOpen(false);
                        }}
                        style={{
                          textAlign: "left",
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 14,
                          border: isActive
                            ? "1px solid rgba(34,211,238,0.55)"
                            : "1px solid rgba(148,163,184,0.18)",
                          background: isActive
                            ? "rgba(2,6,23,0.72)"
                            : "rgba(15,23,42,0.35)",
                          color: "rgba(226,232,240,0.95)",
                          cursor: "pointer",
                        }}
                      >
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 13,
                            lineHeight: 1.15,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {t.title || "Chat"}
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            opacity: 0.78,
                            lineHeight: 1.25,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                            wordBreak: "break-word",
                          }}
                        >
                          {preview || "—"}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>
          </>
        )}
        <style jsx>{`
        .error-bubble {
          border-color: #ef4444 !important;
          color: #fecaca !important;
          background: rgba(127, 29, 29, 0.4) !important;
        }

        .error-avatar {
          border-color: #ef4444 !important;
          color: #ef4444 !important;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          padding: 4px 0;
        }
        .typing-indicator span {
          width: 6px;
          height: 6px;
          background: var(--text-muted, #94a3b8);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }

        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
        .retry-btn {
          margin-top: 8px;
          padding: 4px 12px;
          background: rgba(239, 68, 68, 0.2);
          border: 1px solid rgba(239, 68, 68, 0.5);
          color: #fecaca;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          transition: background 0.2s;
        }
        .retry-btn:hover {
          background: rgba(239, 68, 68, 0.3);
        }
        `}</style>
      </div>
    </section>
  );
}





export default function TattvaAIPage() {
  return <TattvaAIMiddle />;
  // return <Test />;
}

(TattvaAIPage as any).layoutProps = {
  variant: "two-left",
  right: null,
  mobileMain: <TattvaAIMiddle />,
};
