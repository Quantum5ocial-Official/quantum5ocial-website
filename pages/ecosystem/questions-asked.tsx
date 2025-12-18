//pages/ecosystem/questions-asked.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type QRow = {
  id: string;
  title: string;
  created_at: string | null;
  tags: string[] | null;
};

export default function QuestionsAskedPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [items, setItems] = useState<QRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user)
      router.replace("/auth?redirect=/ecosystem/questions-asked");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const run = async () => {
      setBusy(true);
      setErr(null);
      try {
        const { data, error } = await supabase
          .from("qna_questions")
          .select("id, title, created_at, tags")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setItems((data || []) as QRow[]);
      } catch (e: any) {
        setErr(e?.message || "Could not load your questions.");
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
          <div className="section-title">Questions asked</div>
          <div className="section-sub">Questions you posted to Q&A.</div>
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
        <div className="products-empty">No questions asked yet.</div>
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
                {q.tags?.length ? ` · ${q.tags.join(", ")}` : ""}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

(QuestionsAskedPage as any).layoutProps = { variant: "two-left", right: null };
