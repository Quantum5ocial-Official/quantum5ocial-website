// pages/ecosystem/my-posts.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type PostRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string | null;
  image_url: string | null; // ✅ keep consistent with homepage
};

type MyMiniProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  affiliation?: string | null;
};

function formatRelativeTime(created_at: string | null) {
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
}

function LinkifyText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);

  return (
    <>
      {parts.map((part, idx) => {
        const isUrl = /^https?:\/\/[^\s]+$/.test(part);
        if (!isUrl) return <span key={idx}>{part}</span>;

        return (
          <a
            key={idx}
            href={part}
            target="_blank"
            rel="noreferrer"
            style={{
              color: "rgba(34,211,238,0.95)",
              textDecoration: "underline",
              wordBreak: "break-word",
            }}
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

export default function EcosystemMyPostsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [me, setMe] = useState<MyMiniProfile | null>(null);

  const [posts, setPosts] = useState<PostRow[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // ✅ avoid double-load in React strict mode/dev
  const didLoadRef = useRef(false);

  // redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/ecosystem/my-posts");
    }
  }, [loading, user, router]);

  // load mini profile for header/avatar (same vibe as feed)
  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      if (!user?.id) {
        setMe(null);
        return;
      }

      const { data, error: e } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, highest_education, affiliation")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (!e && data) setMe(data as MyMiniProfile);
      else setMe({ id: user.id, full_name: null, avatar_url: null });
    };

    loadMe();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const loadMyPosts = async (uid: string) => {
    setLoadingPosts(true);
    setError(null);

    try {
      // ✅ keep query shape consistent with homepage posts query
      const { data, error: e } = await supabase
        .from("posts")
        .select("id, user_id, body, created_at, image_url")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(200);

      if (e) {
        // ✅ show REAL error (this will tell us exactly why it's 400)
        console.error("Error loading my posts (full):", e);
        const msg =
          e.message ||
          (e as any).details ||
          (e as any).hint ||
          (e as any).code ||
          "Could not load your posts.";
        setError(msg);
        setPosts([]);
        return;
      }

      setPosts((data || []) as PostRow[]);
    } catch (err: any) {
      console.error("Error loading my posts (catch):", err);
      setError(err?.message || "Could not load your posts.");
      setPosts([]);
    } finally {
      setLoadingPosts(false);
    }
  };

  // load posts
  useEffect(() => {
    if (loading) return;
    if (!user?.id) return;

    // ✅ prevent duplicate loads in dev
    if (didLoadRef.current) return;
    didLoadRef.current = true;

    loadMyPosts(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter((p) => (p.body || "").toLowerCase().includes(q));
  }, [posts, search]);

  const total = posts.length;

  if (!user && !loading) return null;

  const name = me?.full_name || (user?.email?.split("@")[0] ?? "Member");
  const subtitle = [me?.highest_education, me?.affiliation].filter(Boolean).join(" · ");

  const initials =
    (me?.full_name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || (user?.email?.[0]?.toUpperCase() ?? "U");

  const avatarNode = (
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 999,
        overflow: "hidden",
        border: "1px solid rgba(148,163,184,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
        color: "#fff",
        fontWeight: 900,
        flexShrink: 0,
      }}
      aria-hidden="true"
    >
      {me?.avatar_url ? (
        <img
          src={me.avatar_url}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        initials
      )}
    </div>
  );

  const pillBtnStyle: React.CSSProperties = {
    fontSize: 13,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.45)",
    background: "rgba(15,23,42,0.65)",
    color: "rgba(226,232,240,0.95)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <section className="section" style={{ paddingTop: 0 }}>
      {/* Header card */}
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.18), rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.35)",
          boxShadow: "0 18px 45px rgba(15,23,42,0.65)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="section-title" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              Posts
              {!loadingPosts && !error && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(59,130,246,0.55)",
                    color: "rgba(191,219,254,0.95)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {total} total
                </span>
              )}
            </div>
            <div className="section-sub" style={{ maxWidth: 560 }}>
              Your public posts on the global feed — shown in the same format as Home.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              style={pillBtnStyle}
              onClick={() => user?.id && loadMyPosts(user.id)}
              disabled={loadingPosts || !user?.id}
            >
              {loadingPosts ? "Refreshing…" : "Refresh"}
            </button>
            <Link href="/profile" className="section-link" style={{ fontSize: 13 }}>
              ← Back to profile
            </Link>
            <Link href="/" className="section-link" style={{ fontSize: 13 }}>
              Go to feed →
            </Link>
          </div>
        </div>

        {/* Search */}
        {!loadingPosts && !error && total > 0 && (
          <div style={{ marginTop: 12, display: "flex", gap: 10, maxWidth: 720 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your posts…"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.35)",
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
                background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                color: "#0f172a",
                fontWeight: 900,
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Search
            </button>
          </div>
        )}

        {!loadingPosts && !error && total > 0 && search.trim() && (
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(148,163,184,0.95)" }}>
            Showing {filtered.length} result{filtered.length === 1 ? "" : "s"} for{" "}
            <span style={{ color: "#e5e7eb", fontWeight: 700 }}>
              &quot;{search.trim()}&quot;
            </span>
          </div>
        )}
      </div>

      {/* States */}
      {loadingPosts && <div className="products-status">Loading posts…</div>}

      {!loadingPosts && error && (
        <div className="products-status" style={{ color: "#f87171" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Couldn’t load posts</div>
          <div style={{ fontSize: 13, lineHeight: 1.4, opacity: 0.95 }}>{error}</div>
          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.85 }}>
            Open DevTools → Network → the <code>/rest/v1/posts</code> request → Response (paste it
            here if it still fails).
          </div>
        </div>
      )}

      {!loadingPosts && !error && total === 0 && (
        <div className="products-empty">
          No posts yet. Go to the feed and create your first post.
        </div>
      )}

      {!loadingPosts && !error && total > 0 && filtered.length === 0 && (
        <div className="products-empty">
          No posts matched <span style={{ fontWeight: 700 }}>&quot;{search.trim()}&quot;</span>.
        </div>
      )}

      {/* Feed-style cards (like Home) */}
      {!loadingPosts && !error && filtered.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((p) => (
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
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {avatarNode}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 13, lineHeight: 1.2, color: "rgba(226,232,240,0.95)" }}>
                        {name}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.82, marginTop: 3 }}>
                        {subtitle || "Quantum5ocial member"}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.68, marginTop: 4 }}>
                        {formatRelativeTime(p.created_at)}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        type="button"
                        style={{ ...pillBtnStyle, padding: "5px 10px", fontSize: 12 }}
                        onClick={() => {
                          navigator.clipboard
                            ?.writeText(`${window.location.origin}/?post=${p.id}`)
                            .catch(() => {});
                        }}
                      >
                        Copy link
                      </button>

                      <Link
                        href={`/?post=${p.id}`}
                        className="section-link"
                        style={{ fontSize: 12, whiteSpace: "nowrap" }}
                      >
                        Open in feed →
                      </Link>
                    </div>
                  </div>

                  <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5, color: "rgba(226,232,240,0.92)" }}>
                    <LinkifyText text={p.body} />
                  </div>

                  {p.image_url && (
                    <div style={{ marginTop: 10 }}>
                      <img
                        src={p.image_url}
                        alt="Post image"
                        style={{
                          width: "100%",
                          maxHeight: 420,
                          objectFit: "cover",
                          borderRadius: 14,
                          border: "1px solid rgba(148,163,184,0.14)",
                          background: "rgba(2,6,23,0.25)",
                          display: "block",
                        }}
                        loading="lazy"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

(EcosystemMyPostsPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
