// components/feed/FeedList.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type FeedProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  affiliation?: string | null;
};

type FeedOrg = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type PostRow = {
  id: string;
  user_id: string;
  org_id: string | null;
  body: string;
  created_at: string | null;
  image_url: string | null;
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
  org: FeedOrg | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export default function FeedList({
  filterUserId,
  filterOrgId,
  limit = 30,
  hideCopyLink = false,
  imageFit = "cover",
}: {
  filterUserId?: string | null;
  filterOrgId?: string | null;
  limit?: number;
  hideCopyLink?: boolean;
  imageFit?: "cover" | "contain";
}) {
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

  // Deep-link (?post=...)
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

  const initialsOf = (name: string | null | undefined) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "Q";

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

  function FeedIcon({ path, size = 18 }: { path: string; size?: number }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
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

  const loadFeed = async (uid: string | null) => {
    setLoading(true);
    setError(null);

    try {
      let q = supabase
        .from("posts")
        .select("id, user_id, org_id, body, created_at, image_url")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (filterUserId) q = q.eq("user_id", filterUserId);
      if (filterOrgId) q = q.eq("org_id", filterOrgId);

      const { data: postRows, error: postErr } = await q;
      if (postErr) throw postErr;

      const posts = (postRows || []) as PostRow[];
      const postIds = posts.map((p) => p.id);
      const userIds = Array.from(new Set(posts.map((p) => p.user_id)));
      const orgIds = Array.from(
        new Set(posts.map((p) => p.org_id).filter(Boolean) as string[])
      );

      // profiles
      const profileMap = new Map<string, FeedProfile>();
      if (userIds.length > 0) {
        const { data: profRows, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, highest_education, affiliation")
          .in("id", userIds);

        if (!profErr && profRows) {
          (profRows as FeedProfile[]).forEach((p) => profileMap.set(p.id, p));
        }
      }

      // organizations
      const orgMap = new Map<string, FeedOrg>();
      if (orgIds.length > 0) {
        const { data: orgRows, error: orgErr } = await supabase
          .from("organizations")
          .select("id, name, slug, logo_url")
          .in("id", orgIds);

        if (!orgErr && orgRows) {
          (orgRows as FeedOrg[]).forEach((o) => orgMap.set(o.id, o));
        }
      }

      // likes
      let likeRows: LikeRow[] = [];
      if (postIds.length > 0) {
        const { data: likes, error: likeErr } = await supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds);

        if (!likeErr && likes) likeRows = likes as LikeRow[];
      }

      // comments (for counts)
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
        org: p.org_id ? orgMap.get(p.org_id) || null : null,
        likeCount: likeCountByPost[p.id] || 0,
        commentCount: commentCountByPost[p.id] || 0,
        likedByMe: likedByMeSet.has(p.id),
      }));

      setItems(vms);
    } catch (e: any) {
      console.error("FeedList load error:", e);
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
  }, [userLoading, user?.id, filterUserId, filterOrgId, limit]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFeedChanged = () => loadFeed(user?.id ?? null);
    window.addEventListener("q5:feed-changed", onFeedChanged);
    return () => window.removeEventListener("q5:feed-changed", onFeedChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, filterUserId, filterOrgId, limit]);

  // Deep-link open comments + scroll
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

  if (loading) return <div className="products-status">Loading feed…</div>;

  if (error) {
    return (
      <div className="products-status" style={{ color: "#f87171" }}>
        {error}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="products-empty">
        {filterUserId || filterOrgId
          ? "No posts yet."
          : "No posts yet. Be the first to post something for the community."}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {items.map((it) => {
        const p = it.post;
        const a = it.author;
        const o = it.org;

        const actorName = o?.name || a?.full_name || "Quantum member";
        const actorAvatar = o?.logo_url || a?.avatar_url || null;
        const actorHref = o
          ? `/orgs/${o.slug}`
          : a?.id
          ? `/profile/${a.id}`
          : undefined;

        const isOpen = !!openComments[p.id];
        const comments = commentsByPost[p.id] || [];

        const headerSubtitle = o
          ? [
              a?.full_name ? `Posted by ${a.full_name}` : null,
              formatSubtitle(a),
            ]
              .filter(Boolean)
              .join(" · ") || "Organization post"
          : formatSubtitle(a) || "Quantum5ocial member";

        const actorInitials = initialsOf(actorName);

        return (
          <div key={p.id}>
            <div
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
                {actorHref ? (
                  <Link
                    href={actorHref}
                    style={{
                      textDecoration: "none",
                      display: "inline-flex",
                      cursor: "pointer",
                    }}
                    aria-label={`Open profile: ${actorName}`}
                  >
                    <div style={avatarStyle(40)}>
                      {actorAvatar ? (
                        <img
                          src={actorAvatar}
                          alt={actorName}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        actorInitials
                      )}
                    </div>
                  </Link>
                ) : (
                  <div style={avatarStyle(40)}>
                    {actorAvatar ? (
                      <img
                        src={actorAvatar}
                        alt={actorName}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      actorInitials
                    )}
                  </div>
                )}

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
                      <div
                        style={{ fontWeight: 900, fontSize: 13, lineHeight: 1.2 }}
                      >
                        {actorHref ? (
                          <Link
                            href={actorHref}
                            style={{
                              color: "rgba(226,232,240,0.95)",
                              textDecoration: "none",
                            }}
                          >
                            {actorName}
                          </Link>
                        ) : (
                          actorName
                        )}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.82,
                          marginTop: 3,
                        }}
                      >
                        {headerSubtitle}
                      </div>

                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.68,
                          marginTop: 4,
                        }}
                      >
                        {formatRelativeTime(p.created_at)}
                      </div>
                    </div>

                    {!hideCopyLink && (
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
                    )}
                  </div>

                  <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5 }}>
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
                          objectFit: imageFit,
                          borderRadius: 14,
                          border: "1px solid rgba(148,163,184,0.14)",
                          background: "rgba(2,6,23,0.25)",
                          display: "block",
                        }}
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleLike(p.id)}
                      aria-label="Like"
                      title="Like"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
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
                      <span style={{ display: "inline-flex", alignItems: "center" }}>
                        <FeedIcon path="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
                      </span>
                      <span style={{ opacity: 0.85, fontWeight: 700 }}>
                        {it.likeCount}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOpenComments((prev) => ({
                          ...prev,
                          [p.id]: !prev[p.id],
                        }));
                        if (!commentsByPost[p.id]) void loadComments(p.id);
                      }}
                      aria-label="Comment"
                      title="Comment"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "7px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.35)",
                        background: "rgba(2,6,23,0.2)",
                        color: "rgba(226,232,240,0.92)",
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 800,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center" }}>
                        <FeedIcon path="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
                      </span>
                      <span style={{ opacity: 0.85, fontWeight: 700 }}>
                        {it.commentCount}
                      </span>
                    </button>
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: 12 }}>
                      <div
                        style={{
                          display: "flex",
                          gap: 10,
                          alignItems: "flex-start",
                        }}
                      >
                        <div style={avatarStyle(30)}>
                          {user ? user.email?.[0]?.toUpperCase() || "U" : "U"}
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
                            placeholder={
                              user ? "Write a comment…" : "Login to comment…"
                            }
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
                                cursor:
                                  !user || commentSaving[p.id]
                                    ? "default"
                                    : "pointer",
                                opacity:
                                  !user || commentSaving[p.id] ? 0.6 : 1,
                                background:
                                  "linear-gradient(135deg,#3bc7f3,#8468ff)",
                                color: "#0f172a",
                              }}
                            >
                              {commentSaving[p.id] ? "Posting…" : "Post comment"}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          marginTop: 10,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                        }}
                      >
                        {comments.length === 0 ? (
                          <div style={{ fontSize: 12, opacity: 0.75 }}>
                            No comments yet.
                          </div>
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
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 10,
                                    alignItems: "flex-start",
                                  }}
                                >
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
                                        <div
                                          style={{
                                            fontSize: 12,
                                            fontWeight: 900,
                                            lineHeight: 1.2,
                                          }}
                                        >
                                          {cp?.id ? (
                                            <Link
                                              href={`/profile/${cp.id}`}
                                              style={{
                                                color:
                                                  "rgba(226,232,240,0.95)",
                                                textDecoration: "none",
                                              }}
                                            >
                                              {cName}
                                            </Link>
                                          ) : (
                                            cName
                                          )}
                                        </div>
                                        <div
                                          style={{
                                            fontSize: 12,
                                            opacity: 0.78,
                                            marginTop: 3,
                                          }}
                                        >
                                          {formatSubtitle(cp) ||
                                            "Quantum5ocial member"}
                                        </div>
                                      </div>

                                      <div
                                        style={{
                                          fontSize: 11,
                                          opacity: 0.68,
                                        }}
                                      >
                                        {formatRelativeTime(c.created_at)}
                                      </div>
                                    </div>

                                    <div
                                      style={{
                                        marginTop: 6,
                                        fontSize: 13,
                                        lineHeight: 1.45,
                                      }}
                                    >
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

            <div
              style={{
                height: 1,
                background: "rgba(148,163,184,0.18)",
                margin: "14px 0",
              }}
            />
          </div>
        );
      })}
    </div>
  );
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
