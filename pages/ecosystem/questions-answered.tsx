// pages/ecosystem/questions-answered.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type AnswerRow = {
  id: string;
  question_id: string;
  user_id: string;
  body: string;
  created_at: string | null;
};

type QuestionRow = {
  id: string;
  title: string;
  body: string;
  created_at: string | null;
  tags: string[] | null;
};

type AnswerVM = {
  answer: AnswerRow;
  question: QuestionRow | null;
};

export default function EcosystemQuestionsAnsweredPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [items, setItems] = useState<AnswerVM[]>([]);
  const [status, setStatus] = useState<string>("Loading your answers…");
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/ecosystem/questions-answered");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      setStatus("Loading your answers…");
      setError(null);

      // 1) answers by me
      const { data: answers, error: aErr } = await supabase
        .from("qna_answers")
        .select("id, question_id, user_id, body, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (aErr) {
        console.error("Error loading answers", aErr);
        setError("Could not load your answers.");
        setStatus("");
        return;
      }

      const ans = (answers || []) as AnswerRow[];
      if (ans.length === 0) {
        setItems([]);
        setStatus("");
        return;
      }

      // 2) fetch questions for those answers
      const qIds = Array.from(new Set(ans.map((x) => x.question_id))).filter(Boolean);

      const { data: qs, error: qErr } = await supabase
        .from("qna_questions")
        .select("id, title, body, created_at, tags")
        .in("id", qIds);

      if (qErr) {
        console.warn("Could not load questions for answers", qErr);
      }

      const qMap = new Map<string, QuestionRow>();
      (qs || []).forEach((q: any) => qMap.set(q.id, q as QuestionRow));

      const vms: AnswerVM[] = ans.map((a) => ({
        answer: a,
        question: qMap.get(a.question_id) || null,
      }));

      setItems(vms);
      setStatus("");
    };

    if (user) load();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      const hay = [
        it.question?.title,
        it.question?.body,
        (it.question?.tags || []).join(" "),
        it.answer.body,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [items, search]);

  const total = items.length;
  const showList = !status && !error && total > 0;

  if (!user && !loading) return null;

  const formatRelativeTime = (created_at: string | null) => {
    if (!created_at) return "";
    const t = Date.parse(created_at);
    if (Number.isNaN(t)) return "";
    const diffMs = Date.now() - t;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 5) return "just now";
    if (diffSec < 60) return `${diffSec} seconds ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;

    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

    const diffWk = Math.floor(diffDay / 7);
    if (diffWk < 5) return `${diffWk} week${diffWk === 1 ? "" : "s"} ago`;

    const diffMo = Math.floor(diffDay / 30);
    return `${diffMo} month${diffMo === 1 ? "" : "s"} ago`;
  };

  return (
    <section className="section">
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(34,211,238,0.16), rgba(15,23,42,0.96))",
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
            <div
              className="section-title"
              style={{ display: "flex", gap: 10, alignItems: "center" }}
            >
              ✅ Questions answered
              {!status && !error && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(34,211,238,0.55)",
                    color: "rgba(165,243,252,0.95)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {total} answers
                </span>
              )}
            </div>

            <div className="section-sub" style={{ maxWidth: 560 }}>
              Answers you&apos;ve posted on Q&amp;A.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
            }}
          >
            <Link href="/ecosystem" className="section-link" style={{ fontSize: 13 }}>
              ← Back to ecosystem
            </Link>
            <Link href="/qna" className="section-link" style={{ fontSize: 13 }}>
              Go to Q&amp;A →
            </Link>
          </div>
        </div>

        {showList && (
          <div style={{ marginTop: 12, display: "flex", gap: 10, maxWidth: 720 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your answers… (question title, tags, answer text)"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.5)",
                background: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => setSearch((s) => s.trim())}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(135deg,#22d3ee,#a5f3fc)",
                color: "#0f172a",
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Search
            </button>
          </div>
        )}

        {showList && search.trim() && (
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(148,163,184,0.95)" }}>
            Showing {filtered.length} result{filtered.length === 1 ? "" : "s"} for{" "}
            <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
              &quot;{search.trim()}&quot;
            </span>
          </div>
        )}
      </div>

      {status && (
        <div className={error ? "dashboard-status error" : "dashboard-status"}>
          {status}
        </div>
      )}

      {!status && error && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {error}
        </div>
      )}

      {!status && !error && total === 0 && (
        <div className="products-empty">
          You haven&apos;t answered any questions yet. Visit Q&amp;A and help someone out.
        </div>
      )}

      {!status && !error && total > 0 && filtered.length === 0 && (
        <div className="products-empty">
          No answers matched{" "}
          <span style={{ fontWeight: 600 }}>&quot;{search.trim()}&quot;</span>.
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((it) => {
            const q = it.question;
            const a = it.answer;

            return (
              <Link
                key={a.id}
                href={`/qna?open=${a.question_id}`}
                className="card"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(15,23,42,0.92)",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.35 }}>
                  {q?.title || "Question"}
                </div>

                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                  Answered {formatRelativeTime(a.created_at)}
                  {q?.tags?.length ? ` · ${q.tags.join(" · ")}` : ""}
                </div>

                <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, opacity: 0.95 }}>
                  <span style={{ opacity: 0.85, fontWeight: 700 }}>Your answer: </span>
                  {a.body.length > 220 ? a.body.slice(0, 217) + "..." : a.body}
                </div>

                <div style={{ marginTop: 10, fontSize: 12, color: "rgba(34,211,238,0.95)" }}>
                  Open in Q&amp;A →
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

(EcosystemQuestionsAnsweredPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
