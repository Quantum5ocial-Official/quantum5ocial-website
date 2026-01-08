// pages/ai/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type ChatMsg = {
  id: string;
  role: "user" | "ai";
  text: string;
  ts: number;
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
    const meta: any = user?.user_metadata || {};
    return (
      meta.full_name ||
      meta.name ||
      (user?.email ? user.email.split("@")[0] : "") ||
      "there"
    );
  }, [user?.id]);

  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      id: "m0",
      role: "ai",
      text: `Hi ${username}, ask me anything from the Quantum5ocial ecosystem.`,
      ts: Date.now(),
    },
  ]);

  // Update greeting once username resolves
  useEffect(() => {
    setMsgs((prev) => {
      if (!prev.length) return prev;
      const first = prev[0];
      if (first.role !== "ai") return prev;

      const updated = `Hi ${username}, ask me anything from the Quantum5ocial ecosystem.`;
      if (first.text === updated) return prev;

      return [{ ...first, text: updated }, ...prev.slice(1)];
    });
  }, [username]);

  const fixedReply =
    "Sorry, I’m still undergoing my training. I’ll be at your service soon.";

  const send = (q: string) => {
    const text = (q || "").trim();
    if (!text) return;

    const now = Date.now();
    setMsgs((prev) => [
      ...prev,
      { id: `u-${now}`, role: "user", text, ts: now },
      { id: `a-${now + 1}`, role: "ai", text: fixedReply, ts: now + 1 },
    ]);
    setInput("");
  };

  if (!user && !loading) return null;

  return (
    <section className="section">
      {/* Header */}
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(34,211,238,0.18), rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.35)",
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
          <div>
            <div className="section-title">🧠 Tattva AI</div>
            <div className="section-sub" style={{ maxWidth: 700 }}>
              Hi <strong>{username}</strong>, ask me anything from the
              Quantum5ocial ecosystem.
            </div>
          </div>

          <Link href="/" className="section-link" style={{ fontSize: 13 }}>
            Back home →
          </Link>
        </div>
      </div>

      {/* Chat */}
      <div className="card" style={{ padding: 16 }}>
        <div
          style={{
            height: 420,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {msgs.map((m) => (
            <div
              key={m.id}
              style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                maxWidth: "75%",
                padding: "10px 12px",
                borderRadius: 16,
                fontSize: 14,
                border:
                  m.role === "user"
                    ? "1px solid rgba(34,211,238,0.45)"
                    : "1px solid rgba(148,163,184,0.22)",
                background:
                  m.role === "user"
                    ? "rgba(2,6,23,0.65)"
                    : "rgba(2,6,23,0.35)",
              }}
            >
              {m.text}
            </div>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          style={{ marginTop: 12, display: "flex", gap: 10 }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question…"
            style={{
              flex: 1,
              padding: "11px 12px",
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.28)",
              background: "rgba(2,6,23,0.65)",
              color: "var(--text-primary)",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "11px 14px",
              borderRadius: 14,
              border: "1px solid rgba(34,211,238,0.55)",
              background: "rgba(2,6,23,0.65)",
              cursor: "pointer",
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
