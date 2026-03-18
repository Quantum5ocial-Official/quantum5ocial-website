// pages/posts/[id].tsx
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import FeedCards from "../../components/feed/FeedCards";
import LinkifyText from "../../components/LinkifyText";

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
  body: string;
  created_at: string | null;
  image_url: string | null;
  video_url: string | null;
  org_id: string | null;
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
  org?: FeedOrg | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export default function PostDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const postId = typeof id === "string" ? id : null;

  const { user, loading: userLoading } = useSupabaseUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<PostVM | null>(null);

  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, CommentRow[]>
  >({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [commentSaving, setCommentSaving] = useState<
    Record<string, boolean>
  >({});
  const [commenterProfiles, setCommenterProfiles] = useState<
    Record<string, FeedProfile>
  >({});

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const formatRelativeTime = (created_at: string | null) => {
    if (!created_at) return "";
    const t = Date.parse(created_at);
    if (Number.isNaN(t)) return "";
    const diffMs = Date.now() - t;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 5) return "just now";
    if (diffSec < 60) return `${diffSec} seconds ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60)
      return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

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

  const loadProfilesForUserIds = async (userIds: string[]) => {
    const uniq = Array.from(new Set(userIds)).filter(Boolean);
    const missing = uniq.filter((uid) => !commenterProfiles[uid]);
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

  const loadComments = async (pid: string) => {
    try {
      const { data: rows, error } = await supabase
        .from("post_comments")
        .select("id, post_id, user_id, body, created_at")
        .eq("post_id", pid)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (rows || []) as CommentRow[];
      setCommentsByPost((prev) => ({ ...prev, [pid]: list }));
      await loadProfilesForUserIds(list.map((c) => c.user_id));
    } catch (e) {
      console.warn("loadComments error", e);
    }
  };

  const loadPost = async () => {
    if (!postId) return;

    setLoading(true);
    setError(null);

    try {
      const { data: postRow, error: postErr } = await supabase
        .from("posts")
        .select("id, user_id, body, created_at, image_url, video_url, org_id")
        .eq("id", postId)
        .maybeSingle();

      if (postErr) throw postErr;
      if (!postRow) {
        setItem(null);
        setError("Post not found.");
        return;
      }

      const post = postRow as PostRow;

      let author: FeedProfile | null = null;
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, highest_education, affiliation")
        .eq("id", post.user_id)
        .maybeSingle();

      if (prof) author = prof as FeedProfile;

      let org: FeedOrg | null = null;
      if (post.org_id) {
        const { data: orgRow } = await supabase
          .from("organizations")
          .select("id, name, slug, logo_url")
          .eq("id", post.org_id)
          .maybeSingle();

        if (orgRow) org = orgRow as FeedOrg;
      }

      const { data: likes } = await supabase
        .from("post_likes")
        .select("post_id, user_id")
        .eq("post_id", postId);

      const { data: comments } = await supabase
        .from("post_comments")
        .select("id, post_id, user_id, body, created_at")
        .eq("post_id", postId);

      const likeRows = (likes || []) as LikeRow[];
      const commentRows = (comments || []) as CommentRow[];

      const likedByMe = !!user && likeRows.some((r) => r.user_id === user.id);

      setItem({
        post,
        author,
        org,
        likeCount: likeRows.length,
        commentCount: commentRows.length,
        likedByMe,
      });

      setOpenComments((prev) => ({ ...prev, [postId]: true }));
      setCommentsByPost((prev) => ({ ...prev, [postId]: commentRows }));
      await loadProfilesForUserIds(commentRows.map((c) => c.user_id));
    } catch (e: any) {
      console.error("loadPost error", e);
      setError(e?.message || "Could not load post.");
      setItem(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!postId) return;
    loadPost();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId, user?.id]);

  useEffect(() => {
    const loadSavedPosts = async () => {
      if (!user) {
        setSavedPostIds([]);
        return;
      }

      const { data, error } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to load saved posts", error);
        setSavedPostIds([]);
        return;
      }

      setSavedPostIds((data || []).map((row: any) => row.post_id as string));
    };

    if (!userLoading) {
      loadSavedPosts();
    }
  }, [user, userLoading]);

  const toggleLike = async (pid: string) => {
    if (!user || !item) {
      router.push(`/auth?redirect=/posts/${pid}`);
      return;
    }

    const cur = item;
    const nextLiked = !cur.likedByMe;

    setItem({
      ...cur,
      likedByMe: nextLiked,
      likeCount: Math.max(0, cur.likeCount + (nextLiked ? 1 : -1)),
    });

    try {
      if (nextLiked) {
        const { error } = await supabase.from("post_likes").insert({
          post_id: pid,
          user_id: user.id,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("post_likes")
          .delete()
          .eq("post_id", pid)
          .eq("user_id", user.id);
        if (error) throw error;
      }
    } catch (e) {
      console.warn("toggleLike error", e);
      setItem(cur);
    }
  };

  const submitComment = async (pid: string) => {
    if (!user) {
      router.push(`/auth?redirect=/posts/${pid}`);
      return;
    }

    const body = commentDraft[pid] || "";
    if (!body.trim() || !item) return;

    setCommentSaving((p) => ({ ...p, [pid]: true }));

    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: pid,
          user_id: user.id,
          body,
        })
        .select("id, post_id, user_id, body, created_at")
        .maybeSingle();

      if (error) throw error;

      setCommentDraft((p) => ({ ...p, [pid]: "" }));
      setOpenComments((p) => ({ ...p, [pid]: true }));

      setCommentsByPost((prev) => {
        const cur = prev[pid] || [];
        return { ...prev, [pid]: data ? [...cur, data as CommentRow] : cur };
      });

      await loadProfilesForUserIds([user.id]);

      setItem((prev) =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev
      );
    } catch (e) {
      console.warn("submitComment error", e);
    } finally {
      setCommentSaving((p) => ({ ...p, [pid]: false }));
    }
  };

  const handleEditPost = (pid: string) => {
    if (!item || item.post.id !== pid) return;
    setEditingPostId(pid);
    setEditingBody(item.post.body || "");
    setEditError(null);
  };

  const handleSavePost = async (pid: string) => {
    if (!user) {
      router.push(`/auth?redirect=/posts/${pid}`);
      return;
    }

    if (savingPostId) return;
    setSavingPostId(pid);

    const alreadySaved = savedPostIds.includes(pid);

    try {
      if (alreadySaved) {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", pid);

        if (error) throw error;
        setSavedPostIds((prev) => prev.filter((id) => id !== pid));
      } else {
        const { error } = await supabase.from("saved_posts").insert({
          user_id: user.id,
          post_id: pid,
        });

        if (error) throw error;
        setSavedPostIds((prev) => [...prev, pid]);
      }
    } catch (e) {
      console.error("Failed to toggle saved post", e);
    } finally {
      setSavingPostId(null);
    }
  };

  const handleDeletePost = async (pid: string) => {
    if (!user || !item || item.post.id !== pid) return;

    const confirmed = window.confirm(
      "Delete this post? This action cannot be undone."
    );
    if (!confirmed) return;

    setDeletingPostId(pid);

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", pid)
        .eq("user_id", user.id);

      if (error) throw error;

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:feed-changed"));
      }

      router.push("/");
    } catch (e: any) {
      console.error("Failed to delete post", e);
      alert(e?.message || "Could not delete post.");
    } finally {
      setDeletingPostId(null);
    }
  };

  const handleSaveEditedPost = async () => {
    if (!user || !editingPostId || !item) return;

    const body = editingBody;
    if (!body.trim()) {
      setEditError("Post body cannot be empty.");
      return;
    }

    setEditSaving(true);
    setEditError(null);

    try {
      const { error } = await supabase
        .from("posts")
        .update({ body })
        .eq("id", editingPostId)
        .eq("user_id", user.id);

      if (error) throw error;

      setItem({
        ...item,
        post: {
          ...item.post,
          body,
        },
      });

      setEditingPostId(null);
      setEditingBody("");

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:feed-changed"));
      }
    } catch (e: any) {
      console.error("Failed to update post", e);
      setEditError(e?.message || "Could not save changes.");
    } finally {
      setEditSaving(false);
    }
  };

  const isPostSaved = (pid: string) => savedPostIds.includes(pid);

  const editingPost =
    editingPostId && item?.post.id === editingPostId ? item.post : null;

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Post</div>
          <div className="section-sub">Post details and discussion.</div>
        </div>
        <Link href="/" className="section-link">
          ← Back to feed
        </Link>
      </div>

      {loading && <div className="products-status">Loading post…</div>}

      {error && !loading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {error}
        </div>
      )}

      {!loading && !error && item && (
        <FeedCards
          items={[item]}
          user={user}
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
          onSharePost={async () => {
            if (typeof window === "undefined") return;
            const shareUrl = `${window.location.origin}/posts/${postId}`;
            try {
              if (navigator.share) {
                await navigator.share({ url: shareUrl });
              } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
              }
            } catch {}
          }}
          onSavePost={handleSavePost}
          onDeletePost={handleDeletePost}
          isPostSaved={isPostSaved}
          savingPostId={savingPostId}
          editingPostId={editingPostId}
          deletingPostId={deletingPostId}
          enablePreviewCollapse={false}
        />
      )}

      {editingPost && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(2,6,23,0.62)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !editSaving) {
              setEditingPostId(null);
              setEditingBody("");
              setEditError(null);
            }
          }}
        >
          <div
            style={{
              width: "min(640px, 100%)",
              borderRadius: 18,
              border: "1px solid rgba(148,163,184,0.22)",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,23,42,0.98))",
              boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "1px solid rgba(148,163,184,0.14)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 15 }}>Edit post</div>
              <button
                type="button"
                disabled={editSaving}
                onClick={() => {
                  setEditingPostId(null);
                  setEditingBody("");
                  setEditError(null);
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(2,6,23,0.2)",
                  color: "rgba(226,232,240,0.92)",
                  cursor: editSaving ? "default" : "pointer",
                  opacity: editSaving ? 0.6 : 1,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 16 }}>
              <textarea
                value={editingBody}
                onChange={(e) => setEditingBody(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: 160,
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.2)",
                  background: "rgba(2,6,23,0.26)",
                  color: "rgba(226,232,240,0.94)",
                  padding: 14,
                  fontSize: 15,
                  lineHeight: 1.45,
                  outline: "none",
                  resize: "vertical",
                  whiteSpace: "pre-wrap",
                }}
              />

              {editError && (
                <div
                  style={{
                    marginTop: 10,
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(248,113,113,0.35)",
                    background: "rgba(248,113,113,0.10)",
                    color: "rgba(254,226,226,0.95)",
                    fontSize: 13,
                  }}
                >
                  {editError}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                <button
                  type="button"
                  disabled={editSaving}
                  onClick={() => {
                    setEditingPostId(null);
                    setEditingBody("");
                    setEditError(null);
                  }}
                  style={{
                    fontSize: 13,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.45)",
                    background: "rgba(15,23,42,0.65)",
                    color: "rgba(226,232,240,0.95)",
                    cursor: editSaving ? "default" : "pointer",
                    opacity: editSaving ? 0.6 : 1,
                  }}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={editSaving || !editingBody.trim()}
                  onClick={handleSaveEditedPost}
                  style={{
                    fontSize: 13,
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "none",
                    background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                    color: "#0f172a",
                    fontWeight: 800,
                    cursor:
                      editSaving || !editingBody.trim() ? "default" : "pointer",
                    opacity: editSaving || !editingBody.trim() ? 0.6 : 1,
                  }}
                >
                  {editSaving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

(PostDetailPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
