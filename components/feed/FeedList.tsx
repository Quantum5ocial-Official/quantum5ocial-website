// components/feed/FeedList.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import FeedCards, {
  FeedOrg,
  FeedProfile,
  PostRow,
  CommentRow,
  PostVM,
} from "./FeedCards";

export default function FeedList({
  filterUserId,
  filterOrgId,
  limit = 30,
}: {
  filterUserId?: string | null;
  filterOrgId?: string | null;
  limit?: number;
  hideCopyLink?: boolean; // kept for compatibility
  imageFit?: "cover" | "contain"; // kept for compatibility
}) {
  const { user, loading: userLoading } = useSupabaseUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<PostVM[]>([]);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, CommentRow[]>
  >({});
  const [commenterProfiles, setCommenterProfiles] = useState<
    Record<string, FeedProfile>
  >({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [commentSaving, setCommentSaving] = useState<Record<string, boolean>>(
    {}
  );

  const [savedPostIds, setSavedPostIds] = useState<Record<string, boolean>>({});
  const [savingPostId, setSavingPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const postParam = useMemo(() => {
    const raw = router.query?.post;
    if (!raw) return null;
    const value = Array.isArray(raw) ? raw[0] : raw;
    return typeof value === "string" && value.trim() ? value : null;
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
  console.log("formatSubtitle input", p);

  const primaryLabel =
    (p?.current_title || "").trim() ||
    (p?.role || "").trim() ||
    (p?.highest_education || "").trim();

  const affiliation = (p?.affiliation || "").trim();

  return [primaryLabel, affiliation].filter(Boolean).join(" · ");
};

  const initialsOf = (name: string | null | undefined) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "Q";

  const avatarStyle = (size = 34): React.CSSProperties => ({
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

  const loadProfilesForUserIds = useCallback(
    async (userIds: string[]) => {
      const uniq = Array.from(new Set(userIds)).filter(Boolean);
      const missing = uniq.filter((id) => !commenterProfiles[id]);
      if (missing.length === 0) return;

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, highest_education, role, current_title, affiliation"
        )
        .in("id", missing);

      if (error || !data) return;

      const patch: Record<string, FeedProfile> = {};
      (data as FeedProfile[]).forEach((p) => {
        patch[p.id] = p;
      });

      setCommenterProfiles((prev) => ({ ...prev, ...patch }));
    },
    [commenterProfiles]
  );

  const loadComments = useCallback(
    async (postId: string) => {
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
    },
    [loadProfilesForUserIds]
  );

  const loadSavedPosts = useCallback(
    async (postIds: string[]) => {
      if (!user || postIds.length === 0) {
        setSavedPostIds({});
        return;
      }

      try {
        const { data, error } = await supabase
          .from("saved_posts")
          .select("post_id")
          .eq("user_id", user.id)
          .in("post_id", postIds);

        if (error) throw error;

        const map: Record<string, boolean> = {};
        (data || []).forEach((row: any) => {
          if (row?.post_id) map[row.post_id] = true;
        });
        setSavedPostIds(map);
      } catch (e) {
        console.warn("loadSavedPosts error", e);
        setSavedPostIds({});
      }
    },
    [user]
  );

  const loadFeed = useCallback(
    async (uid: string | null) => {
      setLoading(true);
      setError(null);

      try {
        let q = supabase
          .from("posts")
          .select("id, user_id, org_id, body, created_at, image_url, video_url")
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

        const profileMap = new Map<string, FeedProfile>();
        if (userIds.length > 0) {
          const { data: profRows, error: profErr } = await supabase
            .from("profiles")
            .select(
              "id, full_name, avatar_url, highest_education, role, current_title, affiliation"
            )
            .in("id", userIds);

          if (!profErr && profRows) {
            (profRows as FeedProfile[]).forEach((p) => profileMap.set(p.id, p));
          }
        }

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

        let likeRows: { post_id: string; user_id: string }[] = [];
        if (postIds.length > 0) {
          const { data: likes, error: likeErr } = await supabase
            .from("post_likes")
            .select("post_id, user_id")
            .in("post_id", postIds);

          if (!likeErr && likes) {
            likeRows = likes as { post_id: string; user_id: string }[];
          }
        }

        let commentRows: CommentRow[] = [];
        if (postIds.length > 0) {
          const { data: comments, error: commentErr } = await supabase
            .from("post_comments")
            .select("id, post_id, user_id, body, created_at")
            .in("post_id", postIds);

          if (!commentErr && comments) {
            commentRows = comments as CommentRow[];
          }
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
        await loadSavedPosts(postIds);
      } catch (e: any) {
        console.error("FeedList load error:", e);
        setError(e?.message || "Could not load feed.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [filterOrgId, filterUserId, limit, loadSavedPosts]
  );

  useEffect(() => {
    if (userLoading) return;
    void loadFeed(user?.id ?? null);
  }, [userLoading, user?.id, loadFeed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFeedChanged = () => {
      void loadFeed(user?.id ?? null);
    };
    window.addEventListener("q5:feed-changed", onFeedChanged);
    return () => window.removeEventListener("q5:feed-changed", onFeedChanged);
  }, [user?.id, loadFeed]);

  useEffect(() => {
    if (!postParam) return;
    const exists = items.some((x) => x.post.id === postParam);
    if (!exists) return;

    setOpenComments((prev) => ({ ...prev, [postParam]: true }));

    const node = postRefs.current[postParam];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (!commentsByPost[postParam]) {
      void loadComments(postParam);
    }
  }, [postParam, items, commentsByPost, loadComments]);

  const toggleLike = async (postId: string) => {
    if (!user) {
      window.location.href = "/auth?redirect=/";
      return;
    }

    const current = items.find((x) => x.post.id === postId);
    if (!current) return;

    const nextLiked = !current.likedByMe;

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
      setItems((prev) => prev.map((x) => (x.post.id === postId ? current : x)));
    }
  };

  const submitComment = async (postId: string) => {
    if (!user) {
      window.location.href = "/auth?redirect=/";
      return;
    }

    const body = (commentDraft[postId] || "").trim();
    if (!body) return;

    setCommentSaving((prev) => ({ ...prev, [postId]: true }));

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

      setCommentDraft((prev) => ({ ...prev, [postId]: "" }));
      setOpenComments((prev) => ({ ...prev, [postId]: true }));

      if (data) {
        setCommentsByPost((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data as CommentRow],
        }));

        setItems((prev) =>
          prev.map((x) =>
            x.post.id === postId
              ? { ...x, commentCount: x.commentCount + 1 }
              : x
          )
        );
      }

      await loadProfilesForUserIds([user.id]);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:notifications-changed"));
      }
    } catch (e) {
      console.warn("submitComment error", e);
    } finally {
      setCommentSaving((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleSharePost = async (postId: string) => {
    if (typeof window === "undefined") return;
    const shareUrl = `${window.location.origin}/posts/${postId}`;

    if (navigator.share) {
      await navigator.share({ url: shareUrl });
      return;
    }

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  const handleSavePost = async (postId: string) => {
    if (!user) {
      window.location.href = "/auth?redirect=/";
      return;
    }

    const alreadySaved = !!savedPostIds[postId];
    setSavingPostId(postId);

    try {
      if (alreadySaved) {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);

        if (error) throw error;

        setSavedPostIds((prev) => {
          const next = { ...prev };
          delete next[postId];
          return next;
        });
      } else {
        const { error } = await supabase.from("saved_posts").insert({
          post_id: postId,
          user_id: user.id,
        });

        if (error) throw error;

        setSavedPostIds((prev) => ({ ...prev, [postId]: true }));
      }
    } catch (e) {
      console.warn("handleSavePost error", e);
    } finally {
      setSavingPostId(null);
    }
  };

  const handleEditPost = async (postId: string) => {
    setEditingPostId(postId);
    try {
      await router.push(`/posts/${postId}/edit`);
    } finally {
      setEditingPostId(null);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user) return;
    const ok = window.confirm("Delete this post?");
    if (!ok) return;

    const current = items.find((x) => x.post.id === postId);
    if (!current) return;

    setDeletingPostId(postId);

    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId);
      if (error) throw error;

      setItems((prev) => prev.filter((x) => x.post.id !== postId));

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:feed-changed"));
      }
    } catch (e) {
      console.warn("handleDeletePost error", e);
      setItems((prev) => {
        const without = prev.filter((x) => x.post.id !== postId);
        return [current, ...without].sort((a, b) => {
          const ta = Date.parse(a.post.created_at || "");
          const tb = Date.parse(b.post.created_at || "");
          return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
        });
      });
    } finally {
      setDeletingPostId(null);
    }
  };

  const isPostSaved = (postId: string) => !!savedPostIds[postId];

  if (loading) {
    return <div className="products-status">Loading feed…</div>;
  }

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
    <FeedCards
      items={items}
      user={user ? { id: user.id } : null}
      openComments={openComments}
      setOpenComments={setOpenComments}
      commentsByPost={commentsByPost}
      commenterProfiles={commenterProfiles}
      commentDraft={commentDraft}
      setCommentDraft={setCommentDraft}
      commentSaving={commentSaving}
      onToggleLike={toggleLike}
      onLoadComments={loadComments}
      onSubmitComment={submitComment}
      formatRelativeTime={formatRelativeTime}
      formatSubtitle={formatSubtitle}
      initialsOf={initialsOf}
      avatarStyle={avatarStyle}
      LinkifyText={LinkifyText}
      postRefs={postRefs}
      onEditPost={handleEditPost}
      onSharePost={handleSharePost}
      onSavePost={handleSavePost}
      onDeletePost={handleDeletePost}
      isPostSaved={isPostSaved}
      savingPostId={savingPostId}
      editingPostId={editingPostId}
      deletingPostId={deletingPostId}
      enablePreviewCollapse
    />
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
