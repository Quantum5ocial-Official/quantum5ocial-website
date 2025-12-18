//pages/ecosystem/my-posts.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type PostRow = {
  id: string;
  body: string;
  created_at: string | null;
};

export default function MyPostsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [items, setItems] = useState<PostRow[]>([]);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/auth?redirect=/ecosystem/my-posts");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    const run = async () => {
      setBusy(true);
      setErr(null);
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("id, body, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setItems((data || []) as PostRow[]);
      } catch (e: any) {
        setErr(e?.message || "Could not load your posts.");
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
          <div className="section-title">My posts</div>
          <div className="section-sub">Your posts from the global feed.</div>
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
        <div className="products-empty">No posts yet.</div>
      )}

      {!busy && !err && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{
                padding: 14,
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.18)",
                background: "rgba(15,23,42,0.92)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.75 }}>
                {p.created_at ? new Date(p.created_at).toLocaleString() : ""}
              </div>
              <div style={{ marginTop: 8, fontSize: 14, lineHeight: 1.5 }}>
                {p.body}
              </div>
              <div style={{ marginTop: 10 }}>
                <Link href={`/?post=${p.id}`} className="section-link">
                  Open in feed →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

(MyPostsPage as any).layoutProps = { variant: "two-left", right: null };
