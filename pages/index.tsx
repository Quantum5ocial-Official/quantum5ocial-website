// pages/index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type Job = {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
};

type Product = {
  id: string;
  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;
  price_type: "fixed" | "contact" | null;
  price_value: string | null;
  in_stock: boolean | null;
  image1_url: string | null;
};

type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  role?: string | null;
  affiliation?: string | null;
  short_bio?: string | null;
};

type MyProfileMini = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type FeedProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  affiliation?: string | null;
};

type PostRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string | null;
};

type LikeRow = { post_id: string; user_id: string };

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string | null;
};

type PostVM = {
  post: PostRow;
  author: FeedProfile | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export default function Home() {
  return (
    <>
      {/* POST + ASK PLACEHOLDERS */}
      <section className="section" style={{ paddingTop: 0 }}>
        <HomeComposerStrip />
      </section>

      {/* ✅ GLOBAL FEED */}
      <section className="section" style={{ paddingTop: 0 }}>
        <HomeGlobalFeed />
      </section>

      {/* HERO */}
      <section className="hero" id="about">
        <div>
          <h1 className="hero-title">
            Discover{" "}
            <span className="hero-highlight">jobs, products &amp; services</span>{" "}
            shaping the future of quantum technology.
          </h1>
          <p className="hero-sub">
            Quantum5ocial connects students, researchers, and companies with curated
            opportunities, services and products across the global quantum ecosystem.
          </p>

          <div className="hero-tags">
            <span className="tag-chip">Intern, PhD, Postdoc, and Industry roles</span>
            <span className="tag-chip">Startups, Vendors, and Labs</span>
            <span className="tag-chip">Hardware · Software · Services</span>
          </div>
        </div>
      </section>

      {/* GAMIFICATION */}
      <section className="section">
        <div className="gamify-strip">
          <div>
            <div className="gamify-title">
              Earn Quantum Points (QP) &amp; unlock quantum-themed badges
            </div>
            <p className="gamify-text">
              Quantum5ocial stays professional but adds a light gamified layer –
              rewarding meaningful activity like completing your profile, posting
              jobs/products, and exploring the ecosystem.
            </p>
            <ul className="gamify-list">
              <li>Complete your profile → gain QP and visibility</li>
              <li>Post roles or products → earn vendor &amp; mentor badges</li>
              <li>Explore and engage → unlock levels like Superposition, Entangled, Resonant</li>
            </ul>
          </div>
          <div className="gamify-badges">
            <div className="badge-pill">
              <span className="badge-dot" /> Superposition · New member
            </div>
            <div className="badge-pill">
              <span className="badge-dot" /> Entangled · Connected with labs
            </div>
            <div className="badge-pill">
              <span className="badge-dot" /> Quantum Vendor · Active startup
            </div>
            <div className="badge-pill">
              <span className="badge-dot" /> Resonant · Highly active profile
            </div>
            <div className="badge-pill">
              <span className="badge-dot" /> Quantum Vendor · Active startup
            </div>
            <div className="badge-pill">
              <span className="badge-dot" /> Resonant · Highly active profile
            </div>
          </div>
        </div>
      </section>

      {/* FOR WHOM */}
      <section className="section">
        <div className="section-header">
          <div>
            <div className="section-title">Built for the entire quantum community</div>
            <div className="section-sub">Different paths, one shared platform.</div>
          </div>
        </div>

        <div className="who-grid">
          <div className="who-card">
            <div className="who-title-row">
              <span className="who-emoji">👨‍🎓</span>
              <span className="who-title">Students &amp; early-career</span>
            </div>
            <p className="who-text">
              Explore internships, MSc/PhD projects, and your first postdoc or industry
              role. Build your profile as you grow into the field.
            </p>
          </div>

          <div className="who-card">
            <div className="who-title-row">
              <span className="who-emoji">🧑‍🔬</span>
              <span className="who-title">Researchers &amp; labs</span>
            </div>
            <p className="who-text">
              Showcase your group, attract collaborators, and make it easier to find the
              right candidates for your quantum projects.
            </p>
          </div>

          <div className="who-card">
            <div className="who-title-row">
              <span className="who-emoji">🏢</span>
              <span className="who-title">Companies &amp; startups</span>
            </div>
            <p className="who-text">
              Post jobs, list your hero products, and reach a focused audience that already
              cares about quantum technologies.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

/* =========================
   GLOBAL FEED
   ========================= */

function HomeGlobalFeed() {
  const { user, loading: userLoading } = useSupabaseUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<PostVM[]>([]);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentRow[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [commentSaving, setCommentSaving] = useState<Record<string, boolean>>({});

  const [commenterProfiles, setCommenterProfiles] = useState<Record<string, FeedProfile>>({});

  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const postParam = useMemo(() => {
    const raw = router.query?.post;
    if (!raw) return null;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return typeof v === "string" && v.length > 0 ? v : null;
  }, [router.query]);

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

  const formatSubtitle = (p?: FeedProfile | null) => {
    const parts = [p?.highest_education, p?.affiliation].filter(Boolean);
    return parts.join(" · ");
  };

  const loadFeed = async (uid: string | null) => {
    setLoading(true);
    setError(null);

    try {
      // 1) Posts
      const { data: postRows, error: postErr } = await supabase
        .from("posts")
        .select("id, user_id, body, created_at")
        .order("created_at", { ascending: false })
        .limit(30);

      if (postErr) throw postErr;

      const posts = (postRows || []) as PostRow[];
      const postIds = posts.map((p) => p.id);
      const userIds = Array.from(new Set(posts.map((p) => p.user_id)));

      // 2) Profiles for authors
      let profileMap = new Map<string, FeedProfile>();
      if (userIds.length > 0) {
        const { data: profRows, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, highest_education, affiliation")
          .in("id", userIds);

        if (!profErr && profRows) {
          (profRows as FeedProfile[]).forEach((p) => profileMap.set(p.id, p));
        }
      }

      // 3) Likes for these posts
      let likeRows: LikeRow[] = [];
      if (postIds.length > 0) {
        const { data: likes, error: likeErr } = await supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds);

        if (!likeErr && likes) likeRows = likes as LikeRow[];
      }

      // 4) Comments for these posts (counts only)
      let commentRows: CommentRow[] = [];
      if (postIds.length > 0) {
        const { data: comments, error: cErr } = await supabase
          .from("post_comments")
          .select("id, post_id, user_id, body, created_at")
          .in("post_id", postIds);

        if (!cErr && comments) commentRows = comments as CommentRow[];
      }

      const likeCountByPost: Record<string, number> = {};
      const likedByMeSet = new Set<string>();
      likeRows.forEach((r) => {
        likeCountByPost[r.post_id] = (likeCountByPost[r.post_id] || 0) + 1;
        if (uid && r.user_id === uid) likedByMeSet.add(r.post_id);
      });

      const commentCountByPost: Record<string, number> = {};
      commentRows.forEach((r) => {
        commentCountByPost[r.post_id] = (commentCountByPost[r.post_id] || 0) + 1;
      });

      const vms: PostVM[] = posts.map((p) => ({
        post: p,
        author: profileMap.get(p.user_id) || null,
        likeCount: likeCountByPost[p.id] || 0,
        commentCount: commentCountByPost[p.id] || 0,
        likedByMe: likedByMeSet.has(p.id),
      }));

      setItems(vms);
    } catch (e: any) {
      console.error("HomeGlobalFeed load error:", e);
      setError(e?.message || "Could not load feed.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    loadFeed(user?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFeedChanged = () => loadFeed(user?.id ?? null);
    window.addEventListener("q5:feed-changed", onFeedChanged);
    return () => window.removeEventListener("q5:feed-changed", onFeedChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!postParam) return;
    const exists = items.some((x) => x.post.id === postParam);
    if (!exists) return;

    setOpenComments((prev) => ({ ...prev, [postParam]: true }));

    const node = postRefs.current[postParam];
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });

    if (!commentsByPost[postParam]) void loadComments(postParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postParam, items]);

  const loadProfilesForUserIds = async (userIds: string[]) => {
    const uniq = Array.from(new Set(userIds)).filter(Boolean);
    const missing = uniq.filter((id) => !commenterProfiles[id]);
    if (missing.length === 0) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, highest_education, affiliation")
      .in("id", missing);

    if (error || !data) return;

    const patch: Record<string, FeedProfile> = {};
    (data as FeedProfile[]).forEach((p) => {
      patch[p.id] = p;
    });

    setCommenterProfiles((prev) => ({ ...prev, ...patch }));
  };

  const loadComments = async (postId: string) => {
    try {
      const { data: rows, error } = await supabase
        .from("post_comments")
        .select("id, post_id, user_id, body, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const list = (rows || []) as CommentRow[];
      setCommentsByPost((prev) => ({ ...prev, [postId]: list }));

      // fetch commenter profiles (avatar/name/edu/affiliation)
      await loadProfilesForUserIds(list.map((c) => c.user_id));
    } catch (e) {
      console.warn("loadComments error", e);
      setCommentsByPost((prev) => ({ ...prev, [postId]: prev[postId] || [] }));
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      window.location.href = "/auth?redirect=/";
      return;
    }

    const idx = items.findIndex((x) => x.post.id === postId);
    if (idx < 0) return;

    const cur = items[idx];
    const nextLiked = !cur.likedByMe;

    // optimistic
    setItems((prev) =>
      prev.map((x) =>
        x.post.id !== postId
          ? x
          : {
              ...x,
              likedByMe: nextLiked,
              likeCount: Math.max(0, x.likeCount + (nextLiked ? 1 : -1)),
            }
      )
    );

    try {
      if (nextLiked) {
        const { error } = await supabase.from("post_likes").insert({
          post_id: postId,
          user_id: user.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        if (error) throw error;
      }

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:notifications-changed"));
      }
    } catch (e) {
      console.warn("toggleLike error", e);
      // rollback
      setItems((prev) => prev.map((x) => (x.post.id !== postId ? x : cur)));
    }
  };

  const submitComment = async (postId: string) => {
    if (!user) {
      window.location.href = "/auth?redirect=/";
      return;
    }

    const body = (commentDraft[postId] || "").trim();
    if (!body) return;

    setCommentSaving((p) => ({ ...p, [postId]: true }));

    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          body,
        })
        .select("id, post_id, user_id, body, created_at")
        .maybeSingle();

      if (error) throw error;

      setCommentDraft((p) => ({ ...p, [postId]: "" }));
      setOpenComments((p) => ({ ...p, [postId]: true }));

      setCommentsByPost((prev) => {
        const cur = prev[postId] || [];
        const next = data ? [...cur, data as CommentRow] : cur;
        return { ...prev, [postId]: next };
      });

      // ensure commenter profile exists for rendering
      await loadProfilesForUserIds([user.id]);

      setItems((prev) =>
        prev.map((x) =>
          x.post.id === postId ? { ...x, commentCount: x.commentCount + 1 } : x
        )
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:notifications-changed"));
      }
    } catch (e) {
      console.warn("submitComment error", e);
    } finally {
      setCommentSaving((p) => ({ ...p, [postId]: false }));
    }
  };

  const pillBtnStyle: CSSProperties = {
    fontSize: 13,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.45)",
    background: "rgba(15,23,42,0.65)",
    color: "rgba(226,232,240,0.95)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  const avatarStyle = (size = 34): CSSProperties => ({
    width: size,
    height: size,
    borderRadius: 999,
    overflow: "hidden",
    border: "1px solid rgba(148,163,184,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
    color: "#fff",
    fontWeight: 800,
    flexShrink: 0,
  });

  const initialsOf = (name: string | null | undefined) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "Q";

  return (
    <div>
      <div className="section-header" style={{ marginTop: 10 }}>
        <div>
          <div className="section-title">Global feed</div>
          <div className="section-sub" style={{ maxWidth: 560 }}>
            Public posts from across the Quantum5ocial community.
          </div>
        </div>

        <button
          type="button"
          style={pillBtnStyle}
          onClick={() => loadFeed(user?.id ?? null)}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading && <div className="products-status">Loading feed…</div>}

      {error && !loading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="products-empty">
          No posts yet. Be the first to post something for the community.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((it) => {
            const p = it.post;
            const a = it.author;

            const name = a?.full_name || "Quantum member";
            const initials = initialsOf(a?.full_name);

            const isOpen = !!openComments[p.id];
            const comments = commentsByPost[p.id] || [];

            return (
              <div
                key={p.id}
                className="card"
                ref={(node) => {
                  postRefs.current[p.id] = node;
                }}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(15,23,42,0.92)",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={avatarStyle(40)}>
                    {a?.avatar_url ? (
                      <img
                        src={a.avatar_url}
                        alt={name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* HEADER */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 900, fontSize: 13, lineHeight: 1.2 }}>
                          {a?.id ? (
                            <Link
                              href={`/profile/${a.id}`}
                              style={{
                                color: "rgba(226,232,240,0.95)",
                                textDecoration: "none",
                              }}
                            >
                              {name}
                            </Link>
                          ) : (
                            name
                          )}
                        </div>

                        {/* ✅ edu + affiliation */}
                        <div style={{ fontSize: 12, opacity: 0.82, marginTop: 3 }}>
                          {formatSubtitle(a) || "Quantum5ocial member"}
                        </div>

                        {/* ✅ relative time */}
                        <div style={{ fontSize: 11, opacity: 0.68, marginTop: 4 }}>
                          {formatRelativeTime(p.created_at)}
                        </div>
                      </div>

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
                    </div>

                    <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>
                      {p.body}
                    </div>

                    <div
                      style={{
                        marginTop: 12,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleLike(p.id)}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 999,
                          border: it.likedByMe
                            ? "1px solid rgba(34,211,238,0.65)"
                            : "1px solid rgba(148,163,184,0.35)",
                          background: it.likedByMe
                            ? "rgba(34,211,238,0.12)"
                            : "rgba(2,6,23,0.2)",
                          color: "rgba(226,232,240,0.92)",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {it.likedByMe ? "♥ Liked" : "♡ Like"}{" "}
                        <span style={{ opacity: 0.85, fontWeight: 700 }}>
                          · {it.likeCount}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setOpenComments((prev) => ({ ...prev, [p.id]: !prev[p.id] }));
                          if (!commentsByPost[p.id]) void loadComments(p.id);
                        }}
                        style={{
                          padding: "7px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(148,163,184,0.35)",
                          background: "rgba(2,6,23,0.2)",
                          color: "rgba(226,232,240,0.92)",
                          cursor: "pointer",
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        💬 Comment{" "}
                        <span style={{ opacity: 0.85, fontWeight: 700 }}>
                          · {it.commentCount}
                        </span>
                      </button>
                    </div>

                    {isOpen && (
                      <div style={{ marginTop: 12 }}>
                        {/* composer */}
                        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                          <div style={avatarStyle(30)}>
                            {user ? (user.email?.[0]?.toUpperCase() || "U") : "U"}
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <textarea
                              value={commentDraft[p.id] || ""}
                              onChange={(e) =>
                                setCommentDraft((prev) => ({
                                  ...prev,
                                  [p.id]: e.target.value,
                                }))
                              }
                              placeholder={user ? "Write a comment…" : "Login to comment…"}
                              disabled={!user}
                              style={{
                                width: "100%",
                                minHeight: 54,
                                borderRadius: 12,
                                border: "1px solid rgba(148,163,184,0.2)",
                                background: "rgba(2,6,23,0.26)",
                                color: "rgba(226,232,240,0.94)",
                                padding: 10,
                                fontSize: 13,
                                lineHeight: 1.45,
                                outline: "none",
                                resize: "vertical",
                              }}
                            />

                            <div
                              style={{
                                marginTop: 8,
                                display: "flex",
                                justifyContent: "flex-end",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => submitComment(p.id)}
                                disabled={
                                  !user ||
                                  commentSaving[p.id] ||
                                  !(commentDraft[p.id] || "").trim()
                                }
                                style={{
                                  padding: "8px 14px",
                                  borderRadius: 999,
                                  border: "none",
                                  fontSize: 13,
                                  fontWeight: 900,
                                  cursor: !user || commentSaving[p.id] ? "default" : "pointer",
                                  opacity: !user || commentSaving[p.id] ? 0.6 : 1,
                                  background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                                  color: "#0f172a",
                                }}
                              >
                                {commentSaving[p.id] ? "Posting…" : "Post comment"}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* comments list */}
                        <div
                          style={{
                            marginTop: 10,
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                          }}
                        >
                          {comments.length === 0 ? (
                            <div style={{ fontSize: 12, opacity: 0.75 }}>No comments yet.</div>
                          ) : (
                            comments.map((c) => {
                              const cp = commenterProfiles[c.user_id];
                              const cName = cp?.full_name || "Quantum member";
                              const cInitials = initialsOf(cp?.full_name);

                              return (
                                <div
                                  key={c.id}
                                  style={{
                                    padding: 10,
                                    borderRadius: 12,
                                    border: "1px solid rgba(148,163,184,0.14)",
                                    background: "rgba(2,6,23,0.18)",
                                  }}
                                >
                                  <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                                    <div style={avatarStyle(30)}>
                                      {cp?.avatar_url ? (
                                        <img
                                          src={cp.avatar_url}
                                          alt={cName}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                          }}
                                        />
                                      ) : (
                                        cInitials
                                      )}
                                    </div>

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
                                          <div style={{ fontSize: 12, fontWeight: 900, lineHeight: 1.2 }}>
                                            {cp?.id ? (
                                              <Link
                                                href={`/profile/${cp.id}`}
                                                style={{
                                                  color: "rgba(226,232,240,0.95)",
                                                  textDecoration: "none",
                                                }}
                                              >
                                                {cName}
                                              </Link>
                                            ) : (
                                              cName
                                            )}
                                          </div>
                                          <div style={{ fontSize: 12, opacity: 0.78, marginTop: 3 }}>
                                            {formatSubtitle(cp) || "Quantum5ocial member"}
                                          </div>
                                        </div>

                                        <div style={{ fontSize: 11, opacity: 0.68 }}>
                                          {formatRelativeTime(c.created_at)}
                                        </div>
                                      </div>

                                      <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.45 }}>
                                        {c.body}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* =========================
   POST / ASK (merged, expand modal)
   ========================= */

function ActionButton({
  icon,
  label,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title || label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(2,6,23,0.22)",
        color: "rgba(226,232,240,0.92)",
        fontSize: 13,
        cursor: "pointer",
      }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
      <span style={{ opacity: 0.95 }}>{label}</span>
    </button>
  );
}

function MiniIcon({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d={path}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function useIsMobile(maxWidth = 520) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const set = () => setIsMobile(mq.matches);

    set();

    const anyMq = mq as any;

    if (mq.addEventListener) {
      mq.addEventListener("change", set);
      return () => mq.removeEventListener("change", set);
    }

    if (anyMq.addListener) {
      anyMq.addListener(set);
      return () => anyMq.removeListener(set);
    }

    return;
  }, [maxWidth]);

  return isMobile;
}

function HomeComposerStrip() {
  const router = useRouter();
  const { user, loading } = useSupabaseUser();
  const [me, setMe] = useState<MyProfileMini | null>(null);

  const [mode, setMode] = useState<"post" | "ask">("post");
  const [open, setOpen] = useState(false);

  const [postText, setPostText] = useState("");
  const [postSaving, setPostSaving] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [askTitle, setAskTitle] = useState("");
  const [askBody, setAskBody] = useState("");
  const [askType, setAskType] = useState<"concept" | "experiment" | "career">(
    "concept"
  );

  const [askSaving, setAskSaving] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const isMobile = useIsMobile(520);

  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      if (!user) {
        setMe(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle<MyProfileMini>();

      if (cancelled) return;
      if (!error && data) setMe(data);
      else setMe({ id: user.id, full_name: null, avatar_url: null });
    };

    if (!loading) loadMe();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const isAuthed = !!user;
  const displayName = me?.full_name || "Member";
  const firstName = (displayName.split(" ")[0] || displayName).trim() || "Member";

  const initials =
    (me?.full_name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "U";

  const avatarNode = (
    <div
      style={{
        width: isMobile ? 36 : 40,
        height: isMobile ? 36 : 40,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        border: "1px solid rgba(148,163,184,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
        color: "#fff",
        fontWeight: 800,
        letterSpacing: 0.5,
      }}
      aria-label="Your avatar"
      title={displayName}
    >
      {me?.avatar_url ? (
        <img
          src={me.avatar_url}
          alt={displayName}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        initials
      )}
    </div>
  );

  const shellStyle: CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "linear-gradient(135deg, rgba(15,23,42,0.86), rgba(15,23,42,0.94))",
    boxShadow: "0 18px 40px rgba(15,23,42,0.45)",
    padding: isMobile ? 12 : 14,
  };

  const collapsedInputStyle: CSSProperties = {
    height: isMobile ? 40 : 42,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.35)",
    color: "rgba(226,232,240,0.92)",
    padding: "0 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    userSelect: "none",
    minWidth: 0,
  };

  const toggleShell: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: 4,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.22)",
  };

  const toggleBtn = (active: boolean): CSSProperties => ({
    padding: isMobile ? "7px 10px" : "7px 11px",
    borderRadius: 999,
    border: "none",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    background: active ? "linear-gradient(135deg,#3bc7f3,#8468ff)" : "transparent",
    color: active ? "#0f172a" : "rgba(226,232,240,0.85)",
    whiteSpace: "nowrap",
  });

  const modalBackdrop: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(2,6,23,0.62)",
    backdropFilter: "blur(8px)",
    zIndex: 1000,
    display: "flex",
    alignItems: isMobile ? "flex-end" : "center",
    justifyContent: "center",
    padding: isMobile ? 10 : 18,
  };

  const modalCard: CSSProperties = {
    width: "min(740px, 100%)",
    borderRadius: isMobile ? "18px 18px 0 0" : 18,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,23,42,0.98))",
    boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
    overflow: "hidden",
    maxHeight: isMobile ? "86vh" : undefined,
  };

  const modalHeader: CSSProperties = {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(148,163,184,0.14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const closeBtn: CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.2)",
    color: "rgba(226,232,240,0.92)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const modalBody: CSSProperties = {
    padding: 16,
    overflowY: isMobile ? "auto" : undefined,
  };

  const bigTextarea: CSSProperties = {
    width: "100%",
    minHeight: isMobile ? 140 : 160,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "rgba(2,6,23,0.26)",
    color: "rgba(226,232,240,0.94)",
    padding: 14,
    fontSize: 15,
    lineHeight: 1.45,
    outline: "none",
    resize: "vertical",
  };

  const smallInput: CSSProperties = {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "rgba(2,6,23,0.26)",
    color: "rgba(226,232,240,0.94)",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
  };

  const footerBar: CSSProperties = {
    padding: "12px 16px",
    borderTop: "1px solid rgba(148,163,184,0.14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };

  const primaryBtn = (disabled?: boolean): CSSProperties => ({
    padding: "9px 16px",
    borderRadius: 999,
    border: "none",
    fontSize: 13,
    fontWeight: 800,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.55 : 1,
    background:
      mode === "ask"
        ? "linear-gradient(135deg,#a78bfa,#3bc7f3)"
        : "linear-gradient(135deg,#3bc7f3,#8468ff)",
    color: "#0f172a",
  });

  const typeChip = (active: boolean): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: active
      ? "1px solid rgba(59,199,243,0.55)"
      : "1px solid rgba(148,163,184,0.18)",
    background: active ? "rgba(59,199,243,0.12)" : "rgba(2,6,23,0.2)",
    color: "rgba(226,232,240,0.92)",
    fontSize: 13,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  });

  const openComposer = () => {
    if (!isAuthed) {
      window.location.href = "/auth?redirect=/";
      return;
    }
    setAskError(null);
    setPostError(null);
    setOpen(true);
  };

  const closeComposer = () => setOpen(false);

  const collapsedPlaceholder =
    mode === "post"
      ? isMobile
        ? "What’s on your mind?"
        : `What’s on your mind, ${firstName}?`
      : isMobile
      ? "Ask the community…"
      : "Ask the quantum community…";

  const canSubmit =
    mode === "post"
      ? !!postText.trim() && !postSaving
      : !!askTitle.trim() && !!askBody.trim() && !askSaving;

  const submitPost = async () => {
    if (!user) {
      window.location.href = "/auth?redirect=/";
      return;
    }

    const body = postText.trim();
    if (!body) return;

    setPostSaving(true);
    setPostError(null);

    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        body,
      });

      if (error) throw error;

      setPostText("");
      closeComposer();

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:feed-changed"));
      }
    } catch (e: any) {
      console.error("submitPost error:", e);
      setPostError(e?.message || "Could not create post.");
    } finally {
      setPostSaving(false);
    }
  };

  const submitAskToQnA = async () => {
    if (!user) {
      window.location.href = "/auth?redirect=/";
      return;
    }

    const title = askTitle.trim();
    const body = askBody.trim();
    if (!title || !body) return;

    setAskSaving(true);
    setAskError(null);

    try {
      let insertedId: string | null = null;

      const attempt1 = await supabase
        .from("qna_questions")
        .insert({
          user_id: user.id,
          title,
          body,
          tags: [askType],
        })
        .select("id")
        .maybeSingle();

      if (!attempt1.error) {
        insertedId = (attempt1.data as any)?.id ?? null;
      } else {
        const attempt2 = await supabase
          .from("qna_questions")
          .insert({
            user_id: user.id,
            title,
            body,
          })
          .select("id")
          .maybeSingle();

        if (attempt2.error) {
          const msg =
            attempt2.error.message ||
            attempt2.error.details ||
            "Failed to post question";
          throw new Error(msg);
        }

        insertedId = (attempt2.data as any)?.id ?? null;
      }

      setAskTitle("");
      setAskBody("");
      setAskType("concept");
      closeComposer();

      if (insertedId) {
        router.push(`/qna?open=${insertedId}`);
      } else {
        router.push(`/qna`);
      }
    } catch (e: any) {
      console.error("submitAskToQnA error:", e);
      setAskError(
        e?.message ||
          "Could not post your question. Check Supabase RLS/policies for qna_questions."
      );
    } finally {
      setAskSaving(false);
    }
  };

  return (
    <>
      <div style={shellStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {avatarNode}

          <div
            style={{ ...collapsedInputStyle, flex: "1 1 260px" }}
            onClick={openComposer}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") openComposer();
            }}
          >
            <span
              style={{
                opacity: 0.88,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {collapsedPlaceholder}
            </span>
            <span style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12, flexShrink: 0 }}>
              {mode === "post" ? "✨" : "❓"}
            </span>
          </div>

          <div
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: 4, borderRadius: 999, border: "1px solid rgba(148,163,184,0.18)", background: "rgba(2,6,23,0.22)", flex: "0 0 auto", marginLeft: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" style={toggleBtn(mode === "post")} onClick={() => setMode("post")}>
              Post
            </button>
            <button type="button" style={toggleBtn(mode === "ask")} onClick={() => setMode("ask")}>
              Ask
            </button>
          </div>
        </div>
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.62)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: isMobile ? "flex-end" : "center",
            justifyContent: "center",
            padding: isMobile ? 10 : 18,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeComposer();
          }}
        >
          <div style={modalCard}>
            <div style={modalHeader}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>
                {mode === "post" ? "Create post" : "Ask a question"}
              </div>

              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: 4, borderRadius: 999, border: "1px solid rgba(148,163,184,0.18)", background: "rgba(2,6,23,0.22)" }}>
                <button type="button" style={toggleBtn(mode === "post")} onClick={() => setMode("post")}>
                  Post
                </button>
                <button type="button" style={toggleBtn(mode === "ask")} onClick={() => setMode("ask")}>
                  Ask
                </button>
              </div>

              <button type="button" style={closeBtn} onClick={closeComposer} aria-label="Close">
                ✕
              </button>
            </div>

            <div style={modalBody}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                {avatarNode}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>{displayName}</div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                    {mode === "post" ? "Public · Quantum5ocial" : "Public · Q&A"}
                  </div>
                </div>
              </div>

              {mode === "post" ? (
                <>
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder={isMobile ? "What’s on your mind?" : `What’s on your mind, ${firstName}?`}
                    style={bigTextarea}
                  />

                  {postError && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(248,113,113,0.35)",
                        background: "rgba(248,113,113,0.10)",
                        color: "rgba(254,226,226,0.95)",
                        fontSize: 13,
                        lineHeight: 1.35,
                      }}
                    >
                      {postError}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <div style={typeChip(askType === "concept")} onClick={() => setAskType("concept")} role="button" tabIndex={0}>
                      <MiniIcon path="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12c.6.6 1 1.4 1 2v1h6v-1c0-.6.4-1.4 1-2A7 7 0 0 0 12 2Z" />
                      Concept
                    </div>
                    <div style={typeChip(askType === "experiment")} onClick={() => setAskType("experiment")} role="button" tabIndex={0}>
                      <MiniIcon path="M10 2v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V2M8 8h8" />
                      Experiment
                    </div>
                    <div style={typeChip(askType === "career")} onClick={() => setAskType("career")} role="button" tabIndex={0}>
                      <MiniIcon path="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1m-9 4h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Zm0 0V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
                      Career
                    </div>
                  </div>

                  <input
                    value={askTitle}
                    onChange={(e) => setAskTitle(e.target.value)}
                    placeholder="Question title (be specific)"
                    style={smallInput}
                  />

                  <div style={{ height: 10 }} />

                  <textarea
                    value={askBody}
                    onChange={(e) => setAskBody(e.target.value)}
                    placeholder="Add context, details, constraints, what you already tried…"
                    style={{ ...bigTextarea, minHeight: isMobile ? 140 : 150 }}
                  />

                  {askError && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(248,113,113,0.35)",
                        background: "rgba(248,113,113,0.10)",
                        color: "rgba(254,226,226,0.95)",
                        fontSize: 13,
                        lineHeight: 1.35,
                      }}
                    >
                      {askError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={footerBar}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                {mode === "post" ? (
                  <>
                    <ActionButton
                      icon={<MiniIcon path="M4 7h3l2-2h6l2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />}
                      label="Photo"
                    />
                    <ActionButton
                      icon={<MiniIcon path="M15 10l4-2v8l-4-2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2Z" />}
                      label="Video"
                    />
                    <ActionButton
                      icon={<MiniIcon path="M10 13a5 5 0 0 1 0-7l1-1a5 5 0 0 1 7 7l-1 1M14 11a5 5 0 0 1 0 7l-1 1a5 5 0 0 1-7-7l1-1" />}
                      label="Link"
                    />
                  </>
                ) : (
                  <>
                    <ActionButton icon="❓" label="Add details" title="Add more context" />
                    <ActionButton icon="🔗" label="Add link" title="Link to paper/code" />
                    <ActionButton icon="🧪" label="Add tags" title="Tag it for discovery" />
                  </>
                )}
              </div>

              <button
                type="button"
                style={primaryBtn(!canSubmit)}
                disabled={!canSubmit}
                onClick={() => {
                  if (mode === "post") submitPost();
                  else submitAskToQnA();
                }}
              >
                {mode === "post" ? (postSaving ? "Posting…" : "Post") : askSaving ? "Asking…" : "Ask"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* =========================
   RIGHT SIDEBAR (dynamic tiles)
   ========================= */

function HomeRightSidebar() {
  const [latestJob, setLatestJob] = useState<Job | null>(null);
  const [latestProduct, setLatestProduct] = useState<Product | null>(null);
  const [latestMember, setLatestMember] = useState<CommunityProfile | null>(null);

  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadingMember, setLoadingMember] = useState(true);

  const ACCENT = {
    members: "#22d3ee",
    jobs: "#22c55e",
    products: "#fbbf24",
  };

  useEffect(() => {
    let cancelled = false;

    const pickOne = async <T,>(
      table: string,
      select: string,
      fallbackOrderCol: string
    ): Promise<T | null> => {
      const { data: featured, error: featErr } = await supabase
        .from(table)
        .select(select)
        .eq("is_featured", true)
        .order("featured_rank", { ascending: true, nullsFirst: false })
        .order("featured_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (!featErr && featured && featured.length > 0) return featured[0] as T;

      const { data: latest, error: latErr } = await supabase
        .from(table)
        .select(select)
        .order(fallbackOrderCol, { ascending: false })
        .limit(1);

      if (!latErr && latest && latest.length > 0) return latest[0] as T;

      return null;
    };

    const loadAll = async () => {
      setLoadingJob(true);
      setLoadingProduct(true);
      setLoadingMember(true);

      try {
        const [job, product, member] = await Promise.all([
          pickOne<Job>(
            "jobs",
            "id, title, company_name, location, employment_type, remote_type, short_description",
            "created_at"
          ),
          pickOne<Product>(
            "products",
            "id, name, company_name, category, short_description, price_type, price_value, in_stock, image1_url",
            "created_at"
          ),
          pickOne<CommunityProfile>(
            "profiles",
            "id, full_name, avatar_url, highest_education, affiliation, short_bio, role",
            "created_at"
          ),
        ]);

        if (cancelled) return;

        setLatestJob(job);
        setLatestProduct(product);
        setLatestMember(member);
      } catch (e) {
        console.error("HomeRightSidebar load error:", e);
        if (cancelled) return;
        setLatestJob(null);
        setLatestProduct(null);
        setLatestMember(null);
      } finally {
        if (cancelled) return;
        setLoadingJob(false);
        setLoadingProduct(false);
        setLoadingMember(false);
      }
    };

    loadAll();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatJobMeta = (job: Job) =>
    [job.company_name, job.location, job.remote_type].filter(Boolean).join(" · ");

  const formatPrice = (p: Product) => {
    if (p.price_type === "fixed" && p.price_value) return p.price_value;
    if (p.price_type === "contact") return "Contact for price";
    return "";
  };

  const memberName = latestMember?.full_name || "Quantum member";
  const memberFirstName =
    typeof memberName === "string"
      ? memberName.split(" ")[0] || memberName
      : "Member";

  const memberProfileHref = latestMember ? `/profile/${latestMember.id}` : "/community";

  return (
    <div className="hero-tiles hero-tiles-vertical">
      <Link href="/jobs" className="hero-tile">
        <div className="hero-tile-inner">
          <div className="tile-label">Featured role</div>

          <div className="tile-title-row">
            <div className="tile-title" style={{ color: ACCENT.jobs, fontWeight: 700, letterSpacing: 0.3 }}>
              Hot opening
            </div>
            <div className="tile-icon-orbit">🧪</div>
          </div>

          {loadingJob ? (
            <p className="tile-text">Loading the newest job…</p>
          ) : !latestJob ? (
            <p className="tile-text">No jobs posted yet — be the first to add one.</p>
          ) : (
            <div style={{ marginTop: 8 }}>
              <Link href={`/jobs/${latestJob.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>
                  {latestJob.title || "Untitled role"}
                </div>

                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, lineHeight: 1.35 }}>
                  {formatJobMeta(latestJob) || "Quantum role"}
                </div>

                {latestJob.short_description && (
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, lineHeight: 1.35 }}>
                    {latestJob.short_description.length > 90
                      ? latestJob.short_description.slice(0, 87) + "..."
                      : latestJob.short_description}
                  </div>
                )}
              </Link>
            </div>
          )}

          <div className="tile-pill-row">
            <span className="tile-pill">MSc / PhD</span>
            <span className="tile-pill">Postdoc</span>
            <span className="tile-pill">Industry</span>
          </div>

          <div className="tile-cta">
            Browse jobs <span>›</span>
          </div>
        </div>
      </Link>

      <Link href="/products" className="hero-tile">
        <div className="hero-tile-inner">
          <div className="tile-label">Featured product</div>

          <div className="tile-title-row">
            <div className="tile-title" style={{ color: ACCENT.products, fontWeight: 700, letterSpacing: 0.3 }}>
              Product of the week
            </div>
            <div className="tile-icon-orbit">🔧</div>
          </div>

          {loadingProduct ? (
            <p className="tile-text">Loading the newest product…</p>
          ) : !latestProduct ? (
            <p className="tile-text">No products listed yet — add your first product.</p>
          ) : (
            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(148,163,184,0.18)",
                }}
              >
                {latestProduct.image1_url ? (
                  <img
                    src={latestProduct.image1_url}
                    alt={latestProduct.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      opacity: 0.75,
                    }}
                  >
                    No image
                  </div>
                )}
              </div>

              <Link href={`/products/${latestProduct.id}`} style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{latestProduct.name}</div>

                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, lineHeight: 1.35 }}>
                  {[latestProduct.company_name, latestProduct.category, formatPrice(latestProduct)]
                    .filter(Boolean)
                    .join(" · ")}
                </div>

                {latestProduct.short_description && (
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, lineHeight: 1.35 }}>
                    {latestProduct.short_description.length > 90
                      ? latestProduct.short_description.slice(0, 87) + "..."
                      : latestProduct.short_description}
                  </div>
                )}
              </Link>
            </div>
          )}

          <div className="tile-pill-row">
            <span className="tile-pill">Hardware</span>
            <span className="tile-pill">Control &amp; readout</span>
            <span className="tile-pill">Software &amp; services</span>
          </div>

          <div className="tile-cta">
            Browse products <span>›</span>
          </div>
        </div>
      </Link>

      <Link href="/community" className="hero-tile">
        <div className="hero-tile-inner">
          <div className="tile-label">Featured member</div>

          <div className="tile-title-row">
            <div className="tile-title" style={{ color: ACCENT.members, fontWeight: 700, letterSpacing: 0.3 }}>
              Spotlight
            </div>
            <div className="tile-icon-orbit">🤝</div>
          </div>

          {loadingMember ? (
            <p className="tile-text">Loading the newest member…</p>
          ) : !latestMember ? (
            <p className="tile-text">No profiles found yet.</p>
          ) : (
            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  overflow: "hidden",
                  flexShrink: 0,
                  border: "1px solid rgba(148,163,184,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {latestMember.avatar_url ? (
                  <img
                    src={latestMember.avatar_url}
                    alt={memberFirstName}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  memberFirstName.charAt(0).toUpperCase()
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={memberProfileHref} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{memberName}</div>

                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, lineHeight: 1.35 }}>
                    {[latestMember.highest_education, latestMember.role, latestMember.affiliation].filter(Boolean).join(" · ") ||
                      "Quantum5ocial community member"}
                  </div>

                  {latestMember.short_bio && (
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, lineHeight: 1.35 }}>
                      {latestMember.short_bio.length > 90
                        ? latestMember.short_bio.slice(0, 87) + "..."
                        : latestMember.short_bio}
                    </div>
                  )}
                </Link>
              </div>
            </div>
          )}

          <div className="tile-pill-row">
            <span className="tile-pill">Profiles</span>
            <span className="tile-pill">Labs &amp; companies</span>
            <span className="tile-pill">Entangle connections</span>
          </div>

          <div className="tile-cta">
            Browse community <span>›</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

(Home as any).layoutProps = {
  variant: "three",
  right: <HomeRightSidebar />,
};
