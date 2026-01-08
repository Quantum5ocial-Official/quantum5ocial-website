// pages/ai/index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

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
  "Sorry — I’m still undergoing my training. I will be at your service soon.";

function safeId() {
  return Math.random().toString(36).slice(2, 10) + "-" + Date.now().toString(36);
}

function firstNameOf(fullName: string | null | undefined) {
  const s = (fullName || "").trim();
  if (!s) return null;
  return s.split(/\s+/).filter(Boolean)[0] || null;
}

export default function TattvaAIPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  // auth guard
  useEffect(() => {
    if (!loading && !user) router.replace("/auth?redirect=/ai");
  }, [loading, user, router]);

  // get name from profiles (avoid email/handle)
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

    return "there";
  }, [profileName, user?.id]);

  // history persistence per-user
  const storageKey = useMemo(() => {
    const uid = user?.id || "anon";
    return `q5:tattva:threads:v1:${uid}`;
  }, [user?.id]);

  const greetingText = useMemo(
    () =>
      `Hi ${displayFirstName} — I’m Tattva. 
    How can I assist you?`,
    [displayFirstName]
  );

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) || null,
    [threads, activeId]
  );

  // drawer state
  const [historyOpen, setHistoryOpen] = useState(false);

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

  // update greeting when name resolves (only updates first AI message)
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

  // persist
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(threads));
    } catch {
      // ignore
    }
  }, [threads, storageKey]);

  // scroller
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

  const send = () => {
    const q = input.trim();
    if (!q || !activeThread) return;

    const now = Date.now();
    const userMsg: ChatMsg = { id: `u-${now}`, role: "user", text: q, ts: now };
    const aiMsg: ChatMsg = {
      id: `a-${now + 1}`,
      role: "ai",
      text: FIXED_REPLY,
      ts: now + 1,
    };

    renameIfNeeded(activeThread.id, q);

    setThreads((prev) =>
      prev.map((t) =>
        t.id === activeThread.id
          ? { ...t, msgs: [...t.msgs, userMsg, aiMsg], updatedAt: Date.now() }
          : t
      )
    );
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
  };

  const closeHistory = () => setHistoryOpen(false);
  const openHistory = () => setHistoryOpen(true);

  // ESC closes history
  useEffect(() => {
    if (!historyOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeHistory();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [historyOpen]);

  if (!user && !loading) return null;

  const drawerW = 360;

  return (
    <section
      className="section"
      style={{
        height: "calc(100vh - 120px)",
        position: "relative",
        overflow: "hidden", // no page scrolling
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
                Explore careers, products, people, and collaborations with Tattva AI
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={openHistory}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.45)",
              background: "rgba(2,6,23,0.35)",
              color: "rgba(226,232,240,0.95)",
              cursor: "pointer",
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            History
          </button>
        </div>
      </div>

      {/* Main chat card */}
      <div
        className="card"
        style={{
          height: "calc(100% - 86px)",
          padding: 14,
          border: "1px solid rgba(148,163,184,0.22)",
          background: "rgba(15,23,42,0.72)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          borderRadius: 18,
        }}
      >
        {/* messages */}
        <div
          ref={scrollerRef}
          style={{
            flex: 1,
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
                  m.role === "user" ? "rgba(2,6,23,0.55)" : "rgba(2,6,23,0.35)",
                color: "rgba(226,232,240,0.95)",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
          ))}
        </div>

        {/* composer */}
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 10,
            alignItems: "center",
            paddingTop: 10,
            borderTop: "1px solid rgba(148,163,184,0.18)",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
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
            }}
          />

          <button
            type="button"
            onClick={send}
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              border: "1px solid rgba(34,211,238,0.55)",
              background: "rgba(2,6,23,0.55)",
              color: "rgba(226,232,240,0.95)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 800,
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
      </div>

      {/* RIGHT DRAWER: History */}
      {historyOpen && (
        <>
          {/* overlay */}
          <div
            onClick={closeHistory}
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(6px)",
              zIndex: 2000,
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
              width: drawerW,
              maxWidth: "calc(100vw - 56px)",
              zIndex: 2001, // above overlay
              borderRadius: 0,
              borderLeft: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(2,6,23,0.92)",
              boxShadow: "0 22px 70px rgba(0,0,0,0.55)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderBottom: "1px solid rgba(148,163,184,0.18)",
              }}
            >
              <div style={{ fontWeight: 900, color: "rgba(226,232,240,0.95)" }}>
                Chats
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
                    fontWeight: 800,
                  }}
                >
                  + New
                </button>

                <button
                  type="button"
                  onClick={closeHistory}
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
                  aria-label="Close history"
                  title="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              style={{
                padding: 12,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {threads
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .map((t) => {
                  const isActive = t.id === activeId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setActiveId(t.id);
                        closeHistory();
                      }}
                      style={{
                        textAlign: "left",
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: 14,
                        border: isActive
                          ? "1px solid rgba(34,211,238,0.45)"
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
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {t.title || "Chat"}
                      </div>
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 11.5,
                          color: "rgba(148,163,184,0.95)",
                        }}
                      >
                        {new Date(t.updatedAt).toLocaleString()}
                      </div>
                    </button>
                  );
                })}
            </div>
          </aside>
        </>
      )}
    </section>
  );
}

(TattvaAIPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
