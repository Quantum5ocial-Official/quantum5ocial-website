//pages/ecosystem/questions-answered.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type AnswerRow = {
  id: string;
  question_id: string;
  created_at: string | null;
};

type QRow = {
  id: string;
  title: string;
  created_at: string | null;
};

export default function QuestionsAnsweredPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [items, setItems] = useState<QRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user)
      router.replace("/auth?redirect=/ecosystem/questions-answered");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const run = async () => {
      setBusy(true);
      setErr(null);

      try {
        // 1) Load my answers -> get question ids
        const { data: answers, error: aErr } = await supabase
          .from("qna_answers")
          .select("id, question_id, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(200);

        if (aErr) throw aErr;

        const rows = (answers || []) as AnswerRow[];
        const qIds = Array.from(new Set(rows.map((r) => r.question_id).filter(Boolean)));

        if (qIds.length === 0) {
          setItems([]);
          setBusy(false);
          return;
        }

        // 2) Fetch questions
        const { data: qs, error: qErr } = await supabase
          .from("qna_questions")
          .select("id, title, created_at")
          .in("id", qIds)
          .order("created_at", { ascending: false });

        if (qErr) throw qErr;

        setItems((qs || []) as QRow[]);
      } catch (e: any) {
        setErr(e?.message || "Could not load answered questions.");
        setItems([]);
      } finally {
        setBusy(false);
      }
    };

    run();
  }, [user]);

  if (!user && !loading) return null;

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Questions answered</div>
          <div className="section-sub">Q&A threads where you replied.</div>
        </div>
        <Link href="/ecosystem" className="section-link">
          ← Back to ecosystem
        </Link>
      </div>

      {busy && <div className="products-status">Loading…</div>}
      {err && !busy && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {err}
        </div>
      )}

      {!busy && !err && items.length === 0 && (
        <div className="products-empty">No answered questions yet.</div>
      )}

      {!busy && !err && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((q) => (
            <Link
              key={q.id}
              href={`/qna?open=${q.id}`}
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
              <div style={{ fontWeight: 800 }}>{q.title || "Untitled question"}</div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
                {q.created_at ? new Date(q.created_at).toLocaleString() : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

(QuestionsAnsweredPage as any).layoutProps = { variant: "two-left", right: null };
