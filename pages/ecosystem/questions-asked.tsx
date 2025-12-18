// pages/ecosystem/questions-asked.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type QQuestion = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  tags: string[] | null;
  created_at: string | null;
};

export default function EcosystemQuestionsAskedPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [items, setItems] = useState<QQuestion[]>([]);
  const [status, setStatus] = useState<string>("Loading your questions…");
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/ecosystem/questions-asked");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;

      setStatus("Loading your questions…");
      setError(null);

      const { data, error: e } = await supabase
        .from("qna_questions")
        .select("id, user_id, title, body, tags, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(200);

      if (e) {
        console.error("Error loading questions asked", e);
        setError("Could not load your questions.");
        setStatus("");
        return;
      }

      setItems((data || []) as QQuestion[]);
      setStatus("");
    };

    if (user) load();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => {
      const hay = [it.title, it.body, (it.tags || []).join(" ")]
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
            "radial-gradient(circle at 0% 0%, rgba(168,85,247,0.18), rgba(15,23,42,0.96))",
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
              ❓ Questions asked
              {!status && !error && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(168,85,247,0.55)",
                    color: "rgba(233,213,255,0.95)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {total} total
                </span>
              )}
            </div>

            <div className="section-sub" style={{ maxWidth: 560 }}>
              Questions you&apos;ve asked on Q&amp;A.
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
              placeholder="Search your questions… (title, body, tags)"
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
                background: "linear-gradient(135deg,#a855f7,#e9d5ff)",
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
          You haven&apos;t asked any questions yet. Go to Q&amp;A and ask your first one.
        </div>
      )}

      {!status && !error && total > 0 && filtered.length === 0 && (
        <div className="products-empty">
          No questions matched{" "}
          <span style={{ fontWeight: 600 }}>&quot;{search.trim()}&quot;</span>.
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((q) => (
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
              <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.35 }}>
                {q.title}
              </div>

              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                {formatRelativeTime(q.created_at)}
                {q.tags?.length ? ` · ${q.tags.join(" · ")}` : ""}
              </div>

              <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.5, opacity: 0.95 }}>
                {q.body.length > 220 ? q.body.slice(0, 217) + "..." : q.body}
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(168,85,247,0.95)" }}>
                Open in Q&amp;A →
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

(EcosystemQuestionsAskedPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
