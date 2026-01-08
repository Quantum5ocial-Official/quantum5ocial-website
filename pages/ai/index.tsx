import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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
  updatedAt: number;
  messages: ChatMsg[];
};

export default function TattvaAIPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/ai");
    }
  }, [loading, user, router]);

  const username = useMemo(() => {
    const md: any = user?.user_metadata || {};
    const raw =
      (md.username as string) ||
      (md.preferred_username as string) ||
      (md.full_name as string) ||
      (md.name as string) ||
      (user?.email ? user.email.split("@")[0] : "") ||
      "there";
    return String(raw || "there").trim();
  }, [user?.id]);

  const fixedReply =
    "I’m still learning the ropes — I’ll be at your service very soon.";

  // -------- History (mock for now) --------
  const makeNewThread = (seed?: string): ChatThread => {
    const now = Date.now();
    const greet: ChatMsg = {
      id: `a-${now}`,
      role: "ai",
      text: `Hi ${username} — I’m Tattva AI. Ask me anything from the Quantum5ocial ecosystem.`,
      ts: now,
    };
    const title = seed?.trim()
      ? seed.trim().slice(0, 42)
      : "New chat";
    return {
      id: `t-${now}`,
      title,
      updatedAt: now,
      messages: [greet],
    };
  };

  const [threads, setThreads] = useState<ChatThread[]>(() => [makeNewThread()]);
  const [activeId, setActiveId] = useState<string>(() => threads[0]?.id || "");
  const [historyOpen, setHistoryOpen] = useState(false);

  const activeThread = useMemo(
    () => threads.find((t) => t.id === activeId) || threads[0],
    [threads, activeId]
  );

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // autoscroll on new messages
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeThread?.messages?.length]);

  const send = (text: string) => {
    const q = (text || "").trim();
    if (!q || !activeThread) return;

    const now = Date.now();
    const userMsg: ChatMsg = { id: `u-${now}`, role: "user", text: q, ts: now };
    const aiMsg: ChatMsg = {
      id: `a-${now + 1}`,
      role: "ai",
      text: fixedReply,
      ts: now + 1,
    };

    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== activeThread.id) return t;
        const updated = {
          ...t,
          title: t.title === "New chat" ? q.slice(0, 42) : t.title,
          updatedAt: now + 1,
          messages: [...t.messages, userMsg, aiMsg],
        };
        return updated;
      })
    );
    setInput("");
  };

  const startNewChat = () => {
    const t = makeNewThread();
    setThreads((prev) => [t, ...prev]);
    setActiveId(t.id);
    setHistoryOpen(false);
    setInput("");
  };

  const selectThread = (id: string) => {
    setActiveId(id);
    setHistoryOpen(false);
  };

  if (!user && !loading) return null;

  return (
    <section className="section">
      {/* Header card */}
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(34,211,238,0.14), rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.35)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              className="section-title"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              🧠 Tattva AI
            </div>
            <div className="section-sub" style={{ maxWidth: 640 }}>
              Your personal AI assistant for Quantum5ocial.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="section-link"
              style={{
                fontSize: 13,
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(2,6,23,0.35)",
                color: "rgba(226,232,240,0.9)",
                cursor: "pointer",
              }}
            >
              History
            </button>

            <Link href="/" className="section-link" style={{ fontSize: 13 }}>
              Back home →
            </Link>
          </div>
        </div>

        {/* History panel (overlay) */}
        {historyOpen && (
          <div
            style={{
              position: "absolute",
              top: 14,
              right: 14,
              width: 320,
              maxWidth: "calc(100% - 28px)",
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "rgba(2,6,23,0.92)",
              boxShadow: "0 18px 60px rgba(0,0,0,0.55)",
              padding: 12,
              zIndex: 20,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: 10,
              }}
            >
              <div style={{ fontWeight: 700, color: "rgba(226,232,240,0.95)" }}>
                Chats
              </div>
              <button
                type="button"
                onClick={startNewChat}
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(34,211,238,0.55)",
                  background: "rgba(2,6,23,0.6)",
                  color: "rgba(226,232,240,0.95)",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                + New
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {threads
                .slice()
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .slice(0, 10)
                .map((t) => {
                  const active = t.id === activeId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => selectThread(t.id)}
                      style={{
                        textAlign: "left",
                        padding: "10px 10px",
                        borderRadius: 14,
                        border: active
                          ? "1px solid rgba(34,211,238,0.6)"
                          : "1px solid rgba(148,163,184,0.25)",
                        background: active
                          ? "rgba(34,211,238,0.10)"
                          : "rgba(15,23,42,0.35)",
                        color: "rgba(226,232,240,0.95)",
                        cursor: "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {t.title || "New chat"}
                      </div>
                      <div style={{ fontSize: 11.5, opacity: 0.75, marginTop: 2 }}>
                        {new Date(t.updatedAt).toLocaleString()}
                      </div>
                    </button>
                  );
                })}
            </div>

            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              style={{
                marginTop: 10,
                width: "100%",
                padding: "8px 10px",
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.25)",
                background: "rgba(15,23,42,0.35)",
                color: "rgba(226,232,240,0.85)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* Chat card */}
      <div
        className="card"
        style={{
          padding: 0,
          border: "1px solid rgba(148,163,184,0.35)",
          background: "rgba(15,23,42,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Messages */}
        <div
          style={{
            height: "calc(100vh - 260px)",
            minHeight: 420,
            maxHeight: 760,
            overflowY: "auto",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {activeThread?.messages?.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "78%",
                padding: "10px 12px",
                borderRadius: 16,
                fontSize: 14,
                lineHeight: 1.35,
                border:
                  m.role === "user"
                    ? "1px solid rgba(34,211,238,0.55)"
                    : "1px solid rgba(148,163,184,0.22)",
                background:
                  m.role === "user"
                    ? "rgba(2,6,23,0.70)"
                    : "rgba(2,6,23,0.45)",
                color: "rgba(226,232,240,0.95)",
                whiteSpace: "pre-wrap",
              }}
            >
              {m.text}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Composer (NO collision + visible button) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          style={{
            borderTop: "1px solid rgba(148,163,184,0.18)",
            padding: 14,
            display: "flex",
            gap: 10,
            alignItems: "center",
            background: "rgba(2,6,23,0.35)",
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            style={{
              flex: 1,
              height: 44,
              padding: "0 14px",
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.28)",
              background: "rgba(2,6,23,0.65)",
              color: "rgba(226,232,240,0.95)",
              fontSize: 14,
              outline: "none",
            }}
          />

          <button
            type="submit"
            style={{
              height: 44,
              padding: "0 16px",
              borderRadius: 14,
              border: "1px solid rgba(34,211,238,0.7)",
              background: "rgba(34,211,238,0.14)",
              color: "rgba(226,232,240,0.98)",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 800,
              minWidth: 92,
            }}
          >
            Send
          </button>
        </form>
      </div>
    </section>
  );
}

(TattvaAIPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
