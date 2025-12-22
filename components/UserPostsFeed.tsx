// components/UserPostsFeed.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type ProfileLite = {
  full_name: string | null;
  avatar_url: string | null;
  affiliation?: string | null;
  current_title?: string | null;
  role?: string | null;
};

type PostRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string | null;

  // optional if you have these columns
  image_url?: string | null;
  like_count?: number | null;
  comment_count?: number | null;

  // embedded profile if FK exists (posts.user_id -> profiles.id)
  profiles?: ProfileLite | ProfileLite[] | null;
};

function asProfileLite(maybe: any): ProfileLite | null {
  if (!maybe) return null;
  if (Array.isArray(maybe)) return maybe[0] || null;
  return maybe as ProfileLite;
}

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

function PostCard({
  post,
  authorFallback,
  showOpenInFeed = true,
}: {
  post: PostRow;
  authorFallback: { name: string; avatar_url: string | null; subtitle?: string | null };
  showOpenInFeed?: boolean;
}) {
  const p = asProfileLite(post.profiles);
  const name = p?.full_name || authorFallback.name || "Member";
  const avatar = p?.avatar_url || authorFallback.avatar_url || null;

  const subtitle =
    authorFallback.subtitle ||
    [p?.current_title || p?.role || null, p?.affiliation || null].filter(Boolean).join(" · ") ||
    null;

  const rel = formatRelativeTime(post.created_at);

  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    try {
      const url =
        typeof window !== "undefined"
          ? `${window.location.origin}/?post=${encodeURIComponent(post.id)}`
          : "";
      if (!url) return;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="card"
      style={{
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(15,23,42,0.92)",
      }}
    >
      {/* top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            overflow: "hidden",
            border: "1px solid rgba(148,163,184,0.35)",
            background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0f172a",
            fontWeight: 900,
          }}
        >
          {avatar ? (
            <img
              src={avatar}
              alt={name}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            name.charAt(0).toUpperCase()
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, color: "rgba(226,232,240,0.95)", lineHeight: 1.2 }}>
            {name}
          </div>
          {subtitle ? (
            <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)", marginTop: 3 }}>
              {subtitle}
            </div>
          ) : null}
          {rel ? (
            <div style={{ fontSize: 12, color: "rgba(148,163,184,0.85)", marginTop: 4 }}>
              {rel}
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={copyLink}
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.35)",
            background: "rgba(2,6,23,0.25)",
            color: "rgba(226,232,240,0.9)",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 800,
            whiteSpace: "nowrap",
          }}
          title="Copy link"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>

      {/* body */}
      <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: "rgba(226,232,240,0.95)" }}>
        {post.body}
      </div>

      {/* image (optional) */}
      {post.image_url ? (
        <div style={{ marginTop: 12 }}>
          <img
            src={post.image_url}
            alt="Post image"
            style={{
              width: "100%",
              borderRadius: 14,
              border: "1px solid rgba(148,163,184,0.18)",
              display: "block",
            }}
          />
        </div>
      ) : null}

      {/* footer */}
      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {typeof post.like_count === "number" ? (
            <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)" }}>♡ {post.like_count}</div>
          ) : null}
          {typeof post.comment_count === "number" ? (
            <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)" }}>💬 {post.comment_count}</div>
          ) : null}
        </div>

        {showOpenInFeed ? (
          <Link
            href={`/?post=${encodeURIComponent(post.id)}`}
            style={{ fontSize: 12, color: "rgba(34,211,238,0.95)", fontWeight: 800, textDecoration: "none" }}
          >
            Open in feed →
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function UserPostsFeed({
  userId,
  headerTitle = "Posts",
  headerSubtitle = "Your public posts on the global feed.",
  viewAllHref,
  limit = 50,
  showHeader = true,
  showOpenInFeed = true,
  searchEnabled = false,
}: {
  userId: string;
  headerTitle?: string;
  headerSubtitle?: string;
  viewAllHref?: string;
  limit?: number;
  showHeader?: boolean;
  showOpenInFeed?: boolean;
  searchEnabled?: boolean;
}) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [status, setStatus] = useState<string>("Loading posts…");
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus("Loading posts…");
      setError(null);

      // If your DB does NOT have a relationship configured,
      // you can remove `profiles(...)` and we’ll use fallbacks.
      const { data, error: e } = await supabase
        .from("posts")
        .select(
          `
            id, user_id, body, created_at, image_url, like_count, comment_count,
            profiles:profiles ( full_name, avatar_url, affiliation, current_title, role )
          `
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (cancelled) return;

      if (e) {
        console.error("Error loading posts", e);
        setError("Could not load posts.");
        setStatus("");
        setPosts([]);
        return;
      }

      setPosts((data || []) as PostRow[]);
      setStatus("");
    };

    if (userId) load();

    return () => {
      cancelled = true;
    };
  }, [userId, limit]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!searchEnabled || !q) return posts;
    return posts.filter((p) => (p.body || "").toLowerCase().includes(q));
  }, [posts, search, searchEnabled]);

  const total = posts.length;

  // fallback author info if relationship not present
  const authorFallback = { name: "Member", avatar_url: null as string | null, subtitle: null as string | null };

  return (
    <div style={{ marginTop: 14 }}>
      {showHeader && (
        <div
          className="card"
          style={{
            padding: 16,
            borderRadius: 16,
            marginBottom: 12,
            background: "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.18), rgba(15,23,42,0.96))",
            border: "1px solid rgba(148,163,184,0.35)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="section-title" style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {headerTitle}
                {!status && !error && (
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
                {headerSubtitle}
              </div>
            </div>

            {viewAllHref ? (
              <div style={{ display: "flex", alignItems: "flex-start" }}>
                <Link href={viewAllHref} className="section-link" style={{ fontSize: 13 }}>
                  View all →
                </Link>
              </div>
            ) : null}
          </div>

          {searchEnabled && !status && !error && total > 0 && (
            <div style={{ marginTop: 12, display: "flex", gap: 10, maxWidth: 720 }}>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search posts…"
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
                  background: "linear-gradient(135deg,#3b82f6,#93c5fd)",
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
        </div>
      )}

      {status ? <div className="dashboard-status">{status}</div> : null}
      {!status && error ? (
        <div className="products-status" style={{ color: "#f87171" }}>
          {error}
        </div>
      ) : null}

      {!status && !error && total === 0 ? (
        <div className="products-empty">No posts yet.</div>
      ) : null}

      {!status && !error && total > 0 && filtered.length === 0 ? (
        <div className="products-empty">No posts matched your search.</div>
      ) : null}

      {filtered.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} authorFallback={authorFallback} showOpenInFeed={showOpenInFeed} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
