// pages/qna.tsx
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

/* =========================
   Types
========================= */

type ProfileLite = {
  full_name: string | null;
  avatar_url: string | null;
};

type QQuestion = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  tags: string[] | null;
  created_at: string;
  profiles?: ProfileLite | null;
  qna_answers?: { count: number }[] | null;
  qna_votes?: { count: number }[] | null;
};

type QAnswer = {
  id: string;
  question_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: ProfileLite | null;
};

/* =========================
   Helpers
========================= */

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function avatarBubble(name: string, avatar: string | null, size = 28) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        border: "1px solid rgba(148,163,184,0.45)",
        background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
        color: "#0f172a",
      }}
    >
      {avatar ? (
        <img src={avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

/* =========================
   Main Component
========================= */

function QnAMiddle() {
  const router = useRouter();
  const { user } = useSupabaseUser();

  const [questions, setQuestions] = useState<QQuestion[]>([]);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [askOpen, setAskOpen] = useState(false);
  const [askTitle, setAskTitle] = useState("");
  const [askBody, setAskBody] = useState("");
  const [askTags, setAskTags] = useState("");

  const suggestedTags = [
    "Hardware",
    "Software",
    "Careers",
    "Cryo",
    "Microwave",
    "Qubits",
    "Fabrication",
    "Theory",
    "Sensing",
  ];

  /* =========================
     Load questions
  ========================= */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      let q = supabase
        .from("qna_questions")
        .select(
          `
          id, user_id, title, body, tags, created_at,
          profiles:profiles ( full_name, avatar_url ),
          qna_answers(count),
          qna_votes(count)
        `
        )
        .order("created_at", { ascending: false });

      if (search.trim()) {
        q = q.or(`title.ilike.%${search}%,body.ilike.%${search}%`);
      }

      if (activeTag) {
        q = q.contains("tags", [activeTag]);
      }

      const { data } = await q.limit(100);
      if (!cancelled) {
        setQuestions((data || []) as QQuestion[]);
        setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [search, activeTag]);

  /* =========================
     Ask Question
  ========================= */

  const submitQuestion = async () => {
    if (!user) return router.push("/auth?redirect=/qna");

    const tags = askTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);

    const { data } = await supabase
      .from("qna_questions")
      .insert({
        user_id: user.id,
        title: askTitle.trim(),
        body: askBody.trim(),
        tags,
      })
      .select(
        `
        id, user_id, title, body, tags, created_at,
        profiles:profiles ( full_name, avatar_url ),
        qna_answers(count),
        qna_votes(count)
      `
      )
      .maybeSingle();

    if (data) {
      setQuestions((q) => [data as any, ...q]);
      setAskOpen(false);
      setAskTitle("");
      setAskBody("");
      setAskTags("");
    }
  };

  /* =========================
     UI
  ========================= */

  return (
    <section className="section">
      {/* HEADER */}
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="section-title" style={{ display: "flex", gap: 10 }}>
              QnA
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 10px",
                  borderRadius: 999,
                  border: "1px solid rgba(56,189,248,0.5)",
                  color: "#7dd3fc",
                }}
              >
                {questions.length} question{questions.length === 1 ? "" : "s"}
              </span>
            </div>
            <div className="section-sub">
              Ask questions, share answers, and build signal in the quantum ecosystem.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <button
              onClick={() => (user ? setAskOpen(true) : router.push("/auth?redirect=/qna"))}
              style={{
                padding: "10px 18px",
                borderRadius: 999,
                fontWeight: 800,
                background: "linear-gradient(90deg,#22d3ee,#6366f1)",
                color: "#0f172a",
                border: "none",
                cursor: "pointer",
              }}
            >
              Ask a question
            </button>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Hardware · Fabrication · Careers · Theory
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, marginBottom: 6 }}>Search questions</div>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by keyword (e.g. cryo wiring, resonator Q, fabrication)"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.45)",
              background: "rgba(15,23,42,0.8)",
              color: "#e5e7eb",
            }}
          />
        </div>

        {/* TAGS */}
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {suggestedTags.map((t) => (
            <span
              key={t}
              onClick={() => setActiveTag((p) => (p === t ? null : t))}
              style={{
                fontSize: 12,
                padding: "6px 10px",
                borderRadius: 999,
                cursor: "pointer",
                border:
                  activeTag === t
                    ? "1px solid rgba(56,189,248,0.7)"
                    : "1px solid rgba(148,163,184,0.45)",
                background: activeTag === t ? "rgba(56,189,248,0.12)" : "transparent",
              }}
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* QUESTIONS */}
      {loading ? (
        <div className="products-status">Loading questions…</div>
      ) : (
        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
          {questions.map((q) => (
            <div key={q.id} className="card" style={{ padding: 14, cursor: "pointer" }}>
              <div style={{ display: "flex", gap: 10 }}>
                {avatarBubble(q.profiles?.full_name || "Member", q.profiles?.avatar_url || null, 30)}
                <div>
                  <div style={{ fontWeight: 700 }}>{q.title}</div>
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                    {timeAgo(q.created_at)} · 💬 {q.qna_answers?.[0]?.count ?? 0}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ASK MODAL */}
      {askOpen && (
        <div
          onClick={() => setAskOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.65)",
            zIndex: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: "min(800px,96vw)", padding: 18 }}
          >
            <div style={{ fontWeight: 800, fontSize: 16 }}>Ask a question</div>

            <input
              value={askTitle}
              onChange={(e) => setAskTitle(e.target.value)}
              placeholder="Clear, specific title"
              style={{ width: "100%", marginTop: 12 }}
            />

            <textarea
              value={askBody}
              onChange={(e) => setAskBody(e.target.value)}
              placeholder="Explain context, constraints, what you tried…"
              rows={6}
              style={{ width: "100%", marginTop: 10 }}
            />

            <input
              value={askTags}
              onChange={(e) => setAskTags(e.target.value)}
              placeholder="Tags (comma separated)"
              style={{ width: "100%", marginTop: 10 }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={submitQuestion}>Post question</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================
   Page Export
========================= */

export default function QnAPage() {
  return <QnAMiddle />;
}

(QnAPage as any).layoutProps = {
  variant: "two-left",
  right: null,
  mobileMain: <QnAMiddle />,
};
