// pages/ecosystem/saved-posts.tsx
import { useEffect, useMemo, useRef, useState } from "react";
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
  role?: string | null;
  current_title?: string | null;
};

type FeedOrg = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type PostMediaItem = {
  url: string;
  type: "image" | "video" | "pdf";
};

type PostRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string | null;
  image_url: string | null;
  video_url: string | null;
  org_id: string | null;
  media?: PostMediaItem[] | null;
};

type LikeRow = {
  post_id: string;
  user_id: string;
};

type LikerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type CommentLikeRow = {
  comment_id: string;
  user_id: string;
};

type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string | null;
  parent_comment_id?: string | null;
};

type PostVM = {
  post: PostRow;
  author: FeedProfile | null;
  org?: FeedOrg | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

export default function EcosystemSavedPostsPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const router = useRouter();

  const [items, setItems] = useState<PostVM[]>([]);
  const [status, setStatus] = useState("Loading saved posts…");
  const [error, setError] = useState<string | null>(null);

  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);

  const [search, setSearch] = useState("");

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

  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replyOpen, setReplyOpen] = useState<Record<string, boolean>>({});
  const [replySaving, setReplySaving] = useState<Record<string, boolean>>({});
  const [repliesOpen, setRepliesOpen] = useState<Record<string, boolean>>({});

  const [commentLikesById, setCommentLikesById] = useState<
    Record<string, number>
  >({});
  const [commentLikedByMe, setCommentLikedByMe] = useState<
    Record<string, boolean>
  >({});

  const [likerProfilesByPost, setLikerProfilesByPost] = useState<
    Record<string, LikerProfile[]>
  >({});

  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/auth?redirect=/ecosystem/saved-posts");
    }
  }, [userLoading, user, router]);

  const formatRelativeTime = (created_at: string | null) => {
    if (!created_at) return "";
    const t = Date.parse(created_at);
    if (Number.isNaN(t)) return "";
    const diffMs = Date.now() - t;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 5) return "just now";
    if (diffSec < 60) return `${diffSec} seconds ago`;

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
      return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    }

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) {
      return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
    }

    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) {
      return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
    }

    const diffWk = Math.floor(diffDay / 7);
    if (diffWk < 5) {
      return `${diffWk} week${diffWk === 1 ? "" : "s"} ago`;
    }

    const diffMo = Math.floor(diffDay / 30);
    return `${diffMo} month${diffMo === 1 ? "" : "s"} ago`;
  };

  const formatSubtitle = (p?: FeedProfile | null) => {
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

  const avatarStyle = (size = 34): CSSProperties => ({
    width: size,
    height: size,
    borderRadius: 999,
    overflow: "hidden",
    border: "1px solid rgba(148,163,184,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg,#ec4899,#a855f7)",
    color: "#fff",
    fontWeight: 800,
    flexShrink: 0,
  });

  const loadProfilesForUserIds = async (userIds: string[]) => {
    const uniq = Array.from(new Set(userIds)).filter(Boolean);
    const missing = uniq.filter((id) => !commenterProfiles[id]);
    if (missing.length === 0) return;

    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, avatar_url, highest_education, affiliation, role, current_title"
      )
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
        .select("id, post_id, user_id, body, created_at, parent_comment_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const list = (rows || []) as CommentRow[];
      setCommentsByPost((prev) => ({ ...prev, [postId]: list }));

      await loadProfilesForUserIds(list.map((c) => c.user_id));

      const commentIds = list.map((c) => c.id);
      if (commentIds.length === 0) return;

      const { data: likeRows, error: likeErr } = await supabase
        .from("post_comment_likes")
        .select("comment_id, user_id")
        .in("comment_id", commentIds);

      if (likeErr) throw likeErr;

      const likes = (likeRows || []) as CommentLikeRow[];

      const counts: Record<string, number> = {};
      const likedMap: Record<string, boolean> = {};

      likes.forEach((row) => {
        counts[row.comment_id] = (counts[row.comment_id] || 0) + 1;
        if (user && row.user_id === user.id) {
          likedMap[row.comment_id] = true;
        }
      });

      setCommentLikesById((prev) => ({ ...prev, ...counts }));
      setCommentLikedByMe((prev) => ({ ...prev, ...likedMap }));
    } catch (e) {
      console.warn("loadComments error", e);
      setCommentsByPost((prev) => ({ ...prev, [postId]: prev[postId] || [] }));
    }
  };

  const loadSavedPosts = async () => {
    if (!user) return;

    setStatus("Loading saved posts…");
    setError(null);

    try {
      const { data: savedRows, error: savedErr } = await supabase
        .from("saved_posts")
        .select("post_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (savedErr) throw savedErr;

      const ids = (savedRows || []).map((r: any) => r.post_id as string);
      setSavedPostIds(ids);

      if (ids.length === 0) {
        setItems([]);
        setStatus("");
        return;
      }

      const { data: postRows, error: postErr } = await supabase
        .from("posts")
        .select(
          "id, user_id, body, created_at, image_url, video_url, org_id, media"
        )
        .in("id", ids);

      if (postErr) throw postErr;

      const posts = ((postRows || []) as PostRow[]).sort(
        (a, b) => ids.indexOf(a.id) - ids.indexOf(b.id)
      );

      const userIds = Array.from(new Set(posts.map((p) => p.user_id)));
      const orgIds = Array.from(
        new Set(posts.map((p) => p.org_id).filter(Boolean) as string[])
      );
      const postIds = posts.map((p) => p.id);

      const profileMap = new Map<string, FeedProfile>();
      if (userIds.length > 0) {
        const { data: profRows } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, highest_education, affiliation, role, current_title"
          )
          .in("id", userIds);

        (profRows || []).forEach((p: any) => profileMap.set(p.id, p));
      }

      const orgMap = new Map<string, FeedOrg>();
      if (orgIds.length > 0) {
        const { data: orgRows } = await supabase
          .from("organizations")
          .select("id, name, slug, logo_url")
          .in("id", orgIds);

        (orgRows || []).forEach((o: any) => orgMap.set(o.id, o));
      }

      let likeRows: LikeRow[] = [];
      let commentRows: CommentRow[] = [];

      if (postIds.length > 0) {
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds);
        likeRows = (likes || []) as LikeRow[];

        const { data: comments } = await supabase
          .from("post_comments")
          .select("id, post_id, user_id, body, created_at, parent_comment_id")
          .in("post_id", postIds);
        commentRows = (comments || []) as CommentRow[];
      }

      const likerIds = Array.from(new Set(likeRows.map((r) => r.user_id)));
      const likerProfileMap = new Map<string, LikerProfile>();

      if (likerIds.length > 0) {
        const { data: likerRows } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", likerIds);

        (likerRows || []).forEach((p: any) => {
          likerProfileMap.set(p.id, p as LikerProfile);
        });
      }

      const likeCountByPost: Record<string, number> = {};
      const likedByMeSet = new Set<string>();
      likeRows.forEach((r) => {
        likeCountByPost[r.post_id] = (likeCountByPost[r.post_id] || 0) + 1;
        if (r.user_id === user.id) likedByMeSet.add(r.post_id);
      });

      const commentCountByPost: Record<string, number> = {};
      commentRows.forEach((r) => {
        commentCountByPost[r.post_id] =
          (commentCountByPost[r.post_id] || 0) + 1;
      });

      const likerProfilesGrouped: Record<string, LikerProfile[]> = {};

      likeRows.forEach((row) => {
        const profile = likerProfileMap.get(row.user_id);
        if (!profile) return;
        if (!likerProfilesGrouped[row.post_id]) {
          likerProfilesGrouped[row.post_id] = [];
        }
        likerProfilesGrouped[row.post_id].push(profile);
      });

      setLikerProfilesByPost((prev) => ({
        ...prev,
        ...likerProfilesGrouped,
      }));

      const vms: PostVM[] = posts.map((p) => ({
        post: p,
        author: profileMap.get(p.user_id) || null,
        org: p.org_id ? orgMap.get(p.org_id) || null : null,
        likeCount: likeCountByPost[p.id] || 0,
        commentCount: commentCountByPost[p.id] || 0,
        likedByMe: likedByMeSet.has(p.id),
      }));

      setItems(vms);
      setStatus("");
    } catch (e: any) {
      console.error("Error loading saved posts", e);
      setError("Could not load saved posts.");
      setStatus("");
    }
  };

  useEffect(() => {
    if (user) {
      void loadSavedPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const isSaved = (id: string) => savedPostIds.includes(id);

  const handleToggleSave = async (postId: string) => {
    if (!user) {
      router.push("/auth?redirect=/ecosystem/saved-posts");
      return;
    }

    const alreadySaved = isSaved(postId);
    setSavingPostId(postId);

    try {
      if (alreadySaved) {
        const { error } = await supabase
          .from("saved_posts")
          .delete()
          .eq("user_id", user.id)
          .eq("post_id", postId);

        if (error) {
          console.error("Error unsaving post", error);
        } else {
          setSavedPostIds((prev) => prev.filter((id) => id !== postId));
          setItems((prev) => prev.filter((x) => x.post.id !== postId));
          setLikerProfilesByPost((prev) => {
            const next = { ...prev };
            delete next[postId];
            return next;
          });
        }
      } else {
        const { error } = await supabase.from("saved_posts").insert({
          user_id: user.id,
          post_id: postId,
        });

        if (error) {
          console.error("Error saving post", error);
        } else {
          setSavedPostIds((prev) => [...prev, postId]);
        }
      }
    } finally {
      setSavingPostId(null);
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      router.push("/auth?redirect=/ecosystem/saved-posts");
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
    } catch (e) {
      console.warn("toggleLike error", e);
      setItems((prev) => prev.map((x) => (x.post.id !== postId ? x : cur)));
    }
  };

  const submitComment = async (postId: string) => {
    if (!user) {
      router.push("/auth?redirect=/ecosystem/saved-posts");
      return;
    }

    const body = (commentDraft[postId] || "").trim();
    if (!body) return;

    setCommentSaving((p) => ({ ...p, [postId]: true }));

    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: user.id,
        body,
        parent_comment_id: null,
      });

      if (error) throw error;

      setCommentDraft((p) => ({ ...p, [postId]: "" }));
      setOpenComments((p) => ({ ...p, [postId]: true }));

      await loadComments(postId);

      setItems((prev) =>
        prev.map((x) =>
          x.post.id === postId ? { ...x, commentCount: x.commentCount + 1 } : x
        )
      );
    } catch (e) {
      console.warn("submitComment error", e);
    } finally {
      setCommentSaving((p) => ({ ...p, [postId]: false }));
    }
  };

  const submitReply = async (parentCommentId: string, postId: string) => {
    if (!user) {
      router.push("/auth?redirect=/ecosystem/saved-posts");
      return;
    }

    const body = (replyDraft[parentCommentId] || "").trim();
    if (!body) return;

    setReplySaving((prev) => ({ ...prev, [parentCommentId]: true }));

    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: postId,
        user_id: user.id,
        body,
        parent_comment_id: parentCommentId,
      });

      if (error) throw error;

      setReplyDraft((prev) => ({ ...prev, [parentCommentId]: "" }));
      setReplyOpen((prev) => ({ ...prev, [parentCommentId]: false }));
      setRepliesOpen((prev) => ({ ...prev, [parentCommentId]: true }));

      await loadComments(postId);

      setItems((prev) =>
        prev.map((x) =>
          x.post.id === postId ? { ...x, commentCount: x.commentCount + 1 } : x
        )
      );
    } catch (e) {
      console.warn("submitReply error", e);
    } finally {
      setReplySaving((prev) => ({ ...prev, [parentCommentId]: false }));
    }
  };

  const toggleCommentLike = async (commentId: string, postId: string) => {
    if (!user) {
      router.push("/auth?redirect=/ecosystem/saved-posts");
      return;
    }

    const alreadyLiked = !!commentLikedByMe[commentId];

    setCommentLikedByMe((prev) => ({ ...prev, [commentId]: !alreadyLiked }));
    setCommentLikesById((prev) => ({
      ...prev,
      [commentId]: Math.max(
        0,
        (prev[commentId] || 0) + (alreadyLiked ? -1 : 1)
      ),
    }));

    try {
      if (alreadyLiked) {
        const { error } = await supabase
          .from("post_comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("post_comment_likes").insert({
          comment_id: commentId,
          user_id: user.id,
        });

        if (error) throw error;
      }
    } catch (e) {
      console.warn("toggleCommentLike error", e);

      setCommentLikedByMe((prev) => ({ ...prev, [commentId]: alreadyLiked }));
      setCommentLikesById((prev) => ({
        ...prev,
        [commentId]: Math.max(
          0,
          (prev[commentId] || 0) + (alreadyLiked ? 1 : -1)
        ),
      }));
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;

    return items.filter((vm) => {
      const p = vm.post;
      const author = vm.author;
      const org = vm.org;

      const haystack = [
        p.body,
        author?.full_name,
        author?.affiliation,
        author?.highest_education,
        author?.role,
        author?.current_title,
        org?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [items, search]);

  if (!user && !userLoading) return null;

  const total = items.length;
  const showList = !status && !error && total > 0;

  return (
    <section className="section">
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(236,72,153,0.16), rgba(15,23,42,0.96))",
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
              📝 Saved posts
              {!status && !error && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(236,72,153,0.45)",
                    color: "#f9a8d4",
                    whiteSpace: "nowrap",
                  }}
                >
                  {total} total
                </span>
              )}
            </div>

            <div className="section-sub" style={{ maxWidth: 560 }}>
              Posts you&apos;ve bookmarked for later reading and reference.
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
            <Link
              href="/ecosystem"
              className="section-link"
              style={{ fontSize: 13 }}
            >
              ← Back to ecosystem
            </Link>
            <Link href="/" className="section-link" style={{ fontSize: 13 }}>
              Explore feed →
            </Link>
          </div>
        </div>

        {showList && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 10,
              maxWidth: 720,
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved posts…"
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
                background: "linear-gradient(135deg,#ec4899,#f9a8d4)",
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
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "rgba(148,163,184,0.95)",
            }}
          >
            Showing {filteredItems.length} result
            {filteredItems.length === 1 ? "" : "s"} for{" "}
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
          You haven&apos;t saved any posts yet. Save posts from the feed to keep
          them here.
        </div>
      )}

      {!status && !error && total > 0 && filteredItems.length === 0 && (
        <div className="products-empty">
          No saved posts matched{" "}
          <span style={{ fontWeight: 600 }}>&quot;{search.trim()}&quot;</span>.
        </div>
      )}

      {filteredItems.length > 0 && (
        <FeedCards
          items={filteredItems}
          user={user ? { id: user.id } : null}
          openComments={openComments}
          setOpenComments={setOpenComments}
          commentsByPost={commentsByPost}
          commenterProfiles={commenterProfiles}
          commentDraft={commentDraft}
          setCommentDraft={setCommentDraft}
          commentSaving={commentSaving}
          replyDraft={replyDraft}
          setReplyDraft={setReplyDraft}
          replyOpen={replyOpen}
          setReplyOpen={setReplyOpen}
          replySaving={replySaving}
          repliesOpen={repliesOpen}
          setRepliesOpen={setRepliesOpen}
          commentLikesById={commentLikesById}
          commentLikedByMe={commentLikedByMe}
          likerProfilesByPost={likerProfilesByPost}
          onToggleLike={toggleLike}
          onLoadComments={loadComments}
          onSubmitComment={submitComment}
          onSubmitReply={submitReply}
          onToggleCommentLike={toggleCommentLike}
          formatRelativeTime={formatRelativeTime}
          formatSubtitle={formatSubtitle}
          initialsOf={initialsOf}
          avatarStyle={avatarStyle}
          LinkifyText={LinkifyText}
          postRefs={postRefs}
          onSharePost={async (postId) => {
            if (typeof window === "undefined") return;
            const shareUrl = `${window.location.origin}/?post=${postId}`;
            try {
              if (navigator.share) {
                await navigator.share({ url: shareUrl });
              } else if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareUrl);
              }
            } catch {
              // ignore
            }
          }}
          onSavePost={handleToggleSave}
          isPostSaved={isSaved}
          savingPostId={savingPostId}
          onEditPost={(postId) => {
            router.push(`/?editPost=${postId}`);
          }}
          enablePreviewCollapse
        />
      )}
    </section>
  );
}

(EcosystemSavedPostsPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
