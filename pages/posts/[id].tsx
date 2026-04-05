// pages/posts/[id].tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import LinkifyText from "../../components/LinkifyText";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/* =========================
   TYPES
========================= */

type FeedProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  affiliation?: string | null;
  role?: string | null;
  current_title?: string | null;
};

type LikerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
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
  media?: PostMediaItem[] | null;
  org_id: string | null;
};

type LikeRow = {
  post_id: string;
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

type CommentLikeRow = {
  comment_id: string;
  user_id: string;
};

type CommentVM = {
  comment: CommentRow;
  author: FeedProfile | null;
  likeCount: number;
  likedByMe: boolean;
  replies: CommentVM[];
};

type PostVM = {
  post: PostRow;
  author: FeedProfile | null;
  org?: FeedOrg | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

/* =========================
   HELPERS
========================= */

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setIsMobile(window.innerWidth < breakpoint);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [breakpoint]);

  return isMobile;
}

function normalizePostMedia(post: PostRow | null): PostMediaItem[] {
  if (!post) return [];
  if (Array.isArray(post.media) && post.media.length > 0) return post.media;

  const legacy: PostMediaItem[] = [];
  if (post.video_url) legacy.push({ url: post.video_url, type: "video" });
  if (post.image_url) legacy.push({ url: post.image_url, type: "image" });
  return legacy;
}

function buildCommentTree(
  comments: CommentRow[],
  profiles: Record<string, FeedProfile>,
  likeRows: CommentLikeRow[],
  currentUserId?: string
): CommentVM[] {
  const likesMap: Record<string, CommentLikeRow[]> = {};

  likeRows.forEach((row) => {
    if (!likesMap[row.comment_id]) likesMap[row.comment_id] = [];
    likesMap[row.comment_id].push(row);
  });

  const byId: Record<string, CommentVM> = {};
  const roots: CommentVM[] = [];

  comments.forEach((comment) => {
    const likes = likesMap[comment.id] || [];
    byId[comment.id] = {
      comment,
      author: profiles[comment.user_id] || null,
      likeCount: likes.length,
      likedByMe:
        !!currentUserId && likes.some((l) => l.user_id === currentUserId),
      replies: [],
    };
  });

  comments.forEach((comment) => {
    const vm = byId[comment.id];
    if (comment.parent_comment_id && byId[comment.parent_comment_id]) {
      byId[comment.parent_comment_id].replies.push(vm);
    } else {
      roots.push(vm);
    }
  });

  return roots;
}

const pillBtnStyle: CSSProperties = {
  fontSize: 13,
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(148,163,184,0.45)",
  background: "rgba(15,23,42,0.65)",
  color: "rgba(226,232,240,0.95)",
  cursor: "pointer",
};

/* =========================
   PDF VIEWER (SMART RESIZE)
========================= */

function PdfInlineViewer({
  url,
  isMobile,
}: {
  url: string;
  isMobile: boolean;
}) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);

  const [naturalWidth, setNaturalWidth] = useState(595);
  const [naturalHeight, setNaturalHeight] = useState(842);
  const [renderWidth, setRenderWidth] = useState(700);

  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let objUrl: string | null = null;

    (async () => {
      const res = await fetch(url);
      const blob = await res.blob();
      objUrl = URL.createObjectURL(blob);
      setPdfBlobUrl(objUrl);
    })();

    return () => {
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [url]);

  return (
    <div
      ref={stageRef}
      style={{
        width: "100%",
        height: isMobile ? 520 : 800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.02)",
        borderRadius: 12,
      }}
    >
      {pdfBlobUrl && (
        <Document
          file={pdfBlobUrl}
          onLoadSuccess={(pdf) => {
            setNumPages(pdf.numPages);
          }}
        >
          <Page pageNumber={pageNumber} width={renderWidth} />
        </Document>
      )}
    </div>
  );
}

/* =========================
   MAIN COMPONENT
========================= */

export default function PostDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const postId = typeof id === "string" ? id : null;

  const { user } = useSupabaseUser();
  const isMobile = useIsMobile();

  const [item, setItem] = useState<PostVM | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [likerProfiles, setLikerProfiles] = useState<LikerProfile[]>([]);

  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<
    Record<string, CommentRow[]>
  >({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [commentSaving, setCommentSaving] = useState<Record<string, boolean>>(
    {}
  );
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

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

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
  };

  const loadComments = async (pid: string) => {
    try {
      const { data: rows, error } = await supabase
        .from("post_comments")
        .select("id, post_id, user_id, body, created_at, parent_comment_id")
        .eq("post_id", pid)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const list = (rows || []) as CommentRow[];
      setCommentsByPost((prev) => ({ ...prev, [pid]: list }));

      await loadProfilesForUserIds(list.map((c) => c.user_id));

      const commentIds = list.map((c) => c.id);
      if (commentIds.length === 0) {
        setCommentLikesById({});
        setCommentLikedByMe({});
        return;
      }

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

      setCommentLikesById(counts);
      setCommentLikedByMe(likedMap);
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
        .select("id, user_id, body, created_at, image_url, video_url, media, org_id")
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
        .select(
          "id, full_name, avatar_url, highest_education, role, current_title, affiliation"
        )
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
        .select("id, post_id, user_id, body, created_at, parent_comment_id")
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      const likeRows = (likes || []) as LikeRow[];
      const commentRows = (comments || []) as CommentRow[];

      let likers: LikerProfile[] = [];
      if (likeRows.length > 0) {
        const likerIds = Array.from(
          new Set(likeRows.map((r) => r.user_id))
        ).slice(0, 8);

        const { data: likerData } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", likerIds);

        likers = (likerData || []) as LikerProfile[];
      }

      setLikerProfiles(likers);

      const likedByMe = !!user && likeRows.some((r) => r.user_id === user.id);

      setItem({
        post,
        author,
        org: org || undefined,
        likeCount: likeRows.length,
        commentCount: commentRows.length,
        likedByMe,
      });

      setOpenComments((prev) => ({ ...prev, [postId]: true }));
      await loadComments(postId);
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
    void loadPost();
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

    void loadSavedPosts();
  }, [user]);

  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [postId]);

  const toggleLike = async (pid: string) => {
    if (!user || !item) {
      router.push(`/auth?redirect=/posts/${pid}`);
      return;
    }

    const cur = item;
    const prevLikers = likerProfiles;
    const nextLiked = !cur.likedByMe;

    setItem({
      ...cur,
      likedByMe: nextLiked,
      likeCount: Math.max(0, cur.likeCount + (nextLiked ? 1 : -1)),
    });

    if (nextLiked) {
      const alreadyPresent = prevLikers.some((p) => p.id === user.id);
      if (!alreadyPresent) {
        setLikerProfiles((prev) =>
          [
            {
              id: user.id,
              full_name: "You",
              avatar_url: null,
            },
            ...prev,
          ].slice(0, 8)
        );
      }
    } else {
      setLikerProfiles((prev) => prev.filter((p) => p.id !== user.id));
    }

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
      setLikerProfiles(prevLikers);
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!user) {
      if (postId) router.push(`/auth?redirect=/posts/${postId}`);
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

  const submitComment = async (pid: string) => {
    if (!user) {
      router.push(`/auth?redirect=/posts/${pid}`);
      return;
    }

    const body = commentDraft[pid] || "";
    if (!body.trim() || !item) return;

    setCommentSaving((p) => ({ ...p, [pid]: true }));

    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: pid,
        user_id: user.id,
        body: body.trim(),
        parent_comment_id: null,
      });

      if (error) throw error;

      setCommentDraft((p) => ({ ...p, [pid]: "" }));
      setOpenComments((p) => ({ ...p, [pid]: true }));

      await loadComments(pid);

      setItem((prev) =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:feed-changed"));
      }
    } catch (e) {
      console.warn("submitComment error", e);
    } finally {
      setCommentSaving((p) => ({ ...p, [pid]: false }));
    }
  };

  const submitReply = async (parentCommentId: string, pid: string) => {
    if (!user) {
      router.push(`/auth?redirect=/posts/${pid}`);
      return;
    }

    const body = (replyDraft[parentCommentId] || "").trim();
    if (!body) return;

    setReplySaving((prev) => ({ ...prev, [parentCommentId]: true }));

    try {
      const { error } = await supabase.from("post_comments").insert({
        post_id: pid,
        user_id: user.id,
        body,
        parent_comment_id: parentCommentId,
      });

      if (error) throw error;

      setReplyDraft((prev) => ({ ...prev, [parentCommentId]: "" }));
      setReplyOpen((prev) => ({ ...prev, [parentCommentId]: false }));
      setRepliesOpen((prev) => ({ ...prev, [parentCommentId]: true }));

      await loadComments(pid);

      setItem((prev) =>
        prev ? { ...prev, commentCount: prev.commentCount + 1 } : prev
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:feed-changed"));
      }
    } catch (e) {
      console.warn("submitReply error", e);
    } finally {
      setReplySaving((prev) => ({ ...prev, [parentCommentId]: false }));
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

    const body = editingBody.trim();
    if (!body) {
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

  const mediaItems = useMemo(
    () => normalizePostMedia(item?.post || null),
    [item]
  );

  const threadedComments = useMemo(() => {
    const flat = commentsByPost[item?.post.id || ""] || [];

    const actualLikeRows: CommentLikeRow[] = flat.flatMap((comment) => {
      const liked = commentLikedByMe[comment.id];
      const count = commentLikesById[comment.id] || 0;

      const rows: CommentLikeRow[] = [];
      if (liked && user) {
        rows.push({ comment_id: comment.id, user_id: user.id });
      }
      for (let i = rows.length; i < count; i++) {
        rows.push({
          comment_id: comment.id,
          user_id: `placeholder-${comment.id}-${i}`,
        });
      }
      return rows;
    });

    return buildCommentTree(
      flat,
      commenterProfiles,
      actualLikeRows,
      user?.id
    );
  }, [
    commentsByPost,
    commentLikesById,
    commentLikedByMe,
    commenterProfiles,
    item?.post.id,
    user,
  ]);

  const actorName =
    item?.org?.name || item?.author?.full_name || "Quantum member";

  const actorHref = item?.org
    ? `/orgs/${item.org.slug}`
    : item?.author?.id
    ? `/profile/${item.author.id}`
    : undefined;

  const avatarSrc =
    item?.org != null ? item.org.logo_url : item?.author?.avatar_url || null;

  const subtitle = item?.org
    ? [
        item?.author?.full_name
          ? `Posted by ${item.author.full_name}`
          : "Posted by member",
        formatSubtitle(item?.author),
      ]
        .filter(Boolean)
        .join(" · ")
    : formatSubtitle(item?.author);

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
        <div
          style={{
            width: "100%",
            maxWidth: 900,
            margin: "0 auto",
          }}
        >
          <div
            style={{
              borderRadius: 22,
              border: "1px solid rgba(56,189,248,0.22)",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))",
              boxShadow:
                "0 18px 40px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.04)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 16, paddingBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                {actorHref ? (
                  <Link
                    href={actorHref}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <div style={avatarStyle(42)}>
                      {avatarSrc ? (
                        <img
                          src={avatarSrc}
                          alt={actorName}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        initialsOf(actorName)
                      )}
                    </div>
                  </Link>
                ) : (
                  <div style={avatarStyle(42)}>
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt={actorName}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      initialsOf(actorName)
                    )}
                  </div>
                )}

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      alignItems: "baseline",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 800,
                        fontSize: 15,
                        lineHeight: 1.2,
                      }}
                    >
                      {actorHref ? (
                        <Link
                          href={actorHref}
                          style={{
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          {actorName}
                        </Link>
                      ) : (
                        actorName
                      )}
                    </div>

                    <div style={{ opacity: 0.72, fontSize: 12 }}>
                      {formatRelativeTime(item.post.created_at)}
                    </div>
                  </div>

                  {!!subtitle && (
                    <div style={{ opacity: 0.78, fontSize: 12, marginTop: 2 }}>
                      {subtitle}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    flexWrap: "wrap",
                    justifyContent: "flex-end",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => toggleLike(item.post.id)}
                    style={{
                      ...pillBtnStyle,
                      borderColor: item.likedByMe
                        ? "rgba(248,113,113,0.55)"
                        : "rgba(148,163,184,0.28)",
                      background: item.likedByMe
                        ? "rgba(248,113,113,0.12)"
                        : "rgba(2,6,23,0.22)",
                      color: item.likedByMe
                        ? "rgba(254,226,226,0.98)"
                        : "rgba(226,232,240,0.92)",
                    }}
                  >
                    <span style={{ color: item.likedByMe ? "#f87171" : "inherit" }}>
                      {item.likedByMe ? "♥" : "♡"}
                    </span>{" "}
                    {item.likeCount}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setOpenComments((prev) => ({
                        ...prev,
                        [item.post.id]: !prev[item.post.id],
                      }))
                    }
                    style={pillBtnStyle}
                  >
                    💬 {item.commentCount}
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
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
                    style={pillBtnStyle}
                  >
                    🔗 Share
                  </button>

                  <button
                    type="button"
                    disabled={savingPostId === item.post.id}
                    onClick={() => handleSavePost(item.post.id)}
                    style={{
                      ...pillBtnStyle,
                      opacity: savingPostId === item.post.id ? 0.6 : 1,
                      cursor: savingPostId === item.post.id ? "default" : "pointer",
                    }}
                  >
                    {savingPostId === item.post.id
                      ? "Saving..."
                      : isPostSaved(item.post.id)
                      ? "💾 Saved"
                      : "📌 Save"}
                  </button>

                  {!!user && user.id === item.post.user_id && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEditPost(item.post.id)}
                        style={pillBtnStyle}
                      >
                        ✏️ Edit
                      </button>

                      <button
                        type="button"
                        disabled={deletingPostId === item.post.id}
                        onClick={() => handleDeletePost(item.post.id)}
                        style={{
                          ...pillBtnStyle,
                          border: "1px solid rgba(248,113,113,0.28)",
                          background: "rgba(127,29,29,0.18)",
                          color: "rgba(254,202,202,0.95)",
                          opacity: deletingPostId === item.post.id ? 0.6 : 1,
                          cursor:
                            deletingPostId === item.post.id ? "default" : "pointer",
                        }}
                      >
                        {deletingPostId === item.post.id ? "Deleting..." : "🗑 Delete"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: "0 16px 16px 16px" }}>
              <div
                style={{
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "rgba(226,232,240,0.94)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <LinkifyText text={item.post.body || ""} />
              </div>
            </div>

            {mediaItems.length > 0 && (
              <div style={{ padding: "0 16px 16px 16px" }}>
                <div
                  style={{
                    position: "relative",
                    borderRadius: 18,
                    overflow: "hidden",
                    border: "1px solid rgba(148,163,184,0.16)",
                    background: "rgba(2,6,23,0.35)",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      background: "rgba(15,23,42,0.95)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {mediaItems[currentMediaIndex]?.type === "video" ? (
                      <video
                        src={mediaItems[currentMediaIndex].url}
                        controls
                        playsInline
                        style={{
                          width: "100%",
                          maxHeight: isMobile ? "70vh" : "72vh",
                          objectFit: "contain",
                          display: "block",
                          background: "rgba(15,23,42,0.95)",
                        }}
                      />
                    ) : mediaItems[currentMediaIndex]?.type === "pdf" ? (
                      <PdfInlineViewer
                        url={mediaItems[currentMediaIndex].url}
                        isMobile={isMobile}
                      />
                    ) : (
                      <img
                        src={mediaItems[currentMediaIndex].url}
                        alt={`Post media ${currentMediaIndex + 1}`}
                        style={{
                          width: "100%",
                          maxHeight: isMobile ? "70vh" : "72vh",
                          objectFit: "contain",
                          display: "block",
                          background: "rgba(15,23,42,0.95)",
                        }}
                      />
                    )}
                  </div>

                  {mediaItems.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMediaIndex((prev) =>
                            prev === 0 ? mediaItems.length - 1 : prev - 1
                          )
                        }
                        style={{
                          position: "absolute",
                          left: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 38,
                          height: 38,
                          borderRadius: 999,
                          border: "1px solid rgba(148,163,184,0.22)",
                          background: "rgba(2,6,23,0.72)",
                          color: "rgba(226,232,240,0.96)",
                          cursor: "pointer",
                          fontSize: 20,
                          zIndex: 2,
                        }}
                      >
                        ‹
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCurrentMediaIndex((prev) =>
                            prev === mediaItems.length - 1 ? 0 : prev + 1
                          )
                        }
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: "translateY(-50%)",
                          width: 38,
                          height: 38,
                          borderRadius: 999,
                          border: "1px solid rgba(148,163,184,0.22)",
                          background: "rgba(2,6,23,0.72)",
                          color: "rgba(226,232,240,0.96)",
                          cursor: "pointer",
                          fontSize: 20,
                          zIndex: 2,
                        }}
                      >
                        ›
                      </button>
                    </>
                  )}
                </div>

                {mediaItems.length > 1 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 8,
                      marginTop: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    {mediaItems.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentMediaIndex(idx)}
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 999,
                          border: "none",
                          cursor: "pointer",
                          background:
                            idx === currentMediaIndex
                              ? "rgba(56,189,248,0.95)"
                              : "rgba(148,163,184,0.35)",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {likerProfiles.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "0 16px 12px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  {likerProfiles.slice(0, 6).map((liker, idx) => (
                    <Link
                      key={liker.id}
                      href={`/profile/${liker.id}`}
                      style={{
                        display: "block",
                        marginLeft: idx === 0 ? 0 : -8,
                        position: "relative",
                        zIndex: 20 - idx,
                      }}
                      title={liker.full_name || "Member"}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 999,
                          overflow: "hidden",
                          border: "2px solid rgba(15,23,42,0.95)",
                          background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 800,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.24)",
                        }}
                      >
                        {liker.avatar_url ? (
                          <img
                            src={liker.avatar_url}
                            alt={liker.full_name || "Member"}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          initialsOf(liker.full_name)
                        )}
                      </div>
                    </Link>
                  ))}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "rgba(226,232,240,0.72)",
                  }}
                >
                  Liked by {item.likeCount} {item.likeCount === 1 ? "person" : "people"}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
                padding: "0 16px 16px 16px",
                borderTop:
                  mediaItems.length > 0
                    ? "1px solid rgba(148,163,184,0.14)"
                    : undefined,
              }}
            >
              <button
                type="button"
                onClick={() => toggleLike(item.post.id)}
                style={{
                  ...pillBtnStyle,
                  borderColor: item.likedByMe
                    ? "rgba(248,113,113,0.55)"
                    : "rgba(148,163,184,0.28)",
                  background: item.likedByMe
                    ? "rgba(248,113,113,0.12)"
                    : "rgba(2,6,23,0.22)",
                  color: item.likedByMe
                    ? "rgba(254,226,226,0.98)"
                    : "rgba(226,232,240,0.92)",
                }}
              >
                <span style={{ color: item.likedByMe ? "#f87171" : "inherit" }}>
                  {item.likedByMe ? "♥" : "♡"}
                </span>{" "}
                {item.likeCount}
              </button>

              <button
                type="button"
                onClick={() =>
                  setOpenComments((prev) => ({
                    ...prev,
                    [item.post.id]: !prev[item.post.id],
                  }))
                }
                style={pillBtnStyle}
              >
                💬 {item.commentCount}
              </button>

              <button
                type="button"
                onClick={async () => {
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
                style={pillBtnStyle}
              >
                🔗 Share
              </button>

              <button
                type="button"
                disabled={savingPostId === item.post.id}
                onClick={() => handleSavePost(item.post.id)}
                style={{
                  ...pillBtnStyle,
                  opacity: savingPostId === item.post.id ? 0.6 : 1,
                  cursor: savingPostId === item.post.id ? "default" : "pointer",
                }}
              >
                {savingPostId === item.post.id
                  ? "Saving..."
                  : isPostSaved(item.post.id)
                  ? "💾 Saved"
                  : "📌 Save"}
              </button>

              {!!user && user.id === item.post.user_id && (
                <>
                  <button
                    type="button"
                    onClick={() => handleEditPost(item.post.id)}
                    style={pillBtnStyle}
                  >
                    ✏️ Edit
                  </button>

                  <button
                    type="button"
                    disabled={deletingPostId === item.post.id}
                    onClick={() => handleDeletePost(item.post.id)}
                    style={{
                      ...pillBtnStyle,
                      border: "1px solid rgba(248,113,113,0.28)",
                      background: "rgba(127,29,29,0.18)",
                      color: "rgba(254,202,202,0.95)",
                      opacity: deletingPostId === item.post.id ? 0.6 : 1,
                      cursor:
                        deletingPostId === item.post.id ? "default" : "pointer",
                    }}
                  >
                    {deletingPostId === item.post.id ? "Deleting..." : "🗑 Delete"}
                  </button>
                </>
              )}
            </div>

            <div
              style={{
                borderTop: "1px solid rgba(148,163,184,0.14)",
                padding: 16,
              }}
            >
              <div
                style={{
                  fontWeight: 800,
                  fontSize: 14,
                  marginBottom: 10,
                  color: "rgba(226,232,240,0.95)",
                }}
              >
                Comments
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <AutoResizeTextarea
                    value={commentDraft[item.post.id] || ""}
                    onChange={(e) =>
                      setCommentDraft((prev) => ({
                        ...prev,
                        [item.post.id]: e.target.value,
                      }))
                    }
                    placeholder={user ? "Write a comment…" : "Login to comment…"}
                    disabled={!user || !!commentSaving[item.post.id]}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      marginTop: 8,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => submitComment(item.post.id)}
                      disabled={
                        !user ||
                        !!commentSaving[item.post.id] ||
                        !(commentDraft[item.post.id] || "").trim()
                      }
                      style={{
                        ...pillBtnStyle,
                        opacity:
                          !user ||
                          !!commentSaving[item.post.id] ||
                          !(commentDraft[item.post.id] || "").trim()
                            ? 0.5
                            : 1,
                        cursor:
                          !user ||
                          !!commentSaving[item.post.id] ||
                          !(commentDraft[item.post.id] || "").trim()
                            ? "default"
                            : "pointer",
                      }}
                    >
                      {commentSaving[item.post.id] ? "Posting…" : "Comment"}
                    </button>
                  </div>
                </div>
              </div>

                            {openComments[item.post.id] !== false && (
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                >
                  {threadedComments.length === 0 ? (
                    <div style={{ opacity: 0.7, fontSize: 12 }}>No comments yet.</div>
                  ) : (
                    threadedComments.map((commentVm) => {
                      const c = commentVm.comment;
                      const cp = commentVm.author;
                      const name = cp?.full_name || "Member";
                      const repliesAreOpen = !!repliesOpen[c.id];
                      const replyBoxOpen = !!replyOpen[c.id];
                      const replyCount = commentVm.replies.length;

                      return (
                        <div
                          key={c.id}
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
                                alt={name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              initialsOf(name)
                            )}
                          </div>

                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                alignItems: "baseline",
                                flexWrap: "wrap",
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: 13,
                                }}
                              >
                                {cp?.id ? (
                                  <Link
                                    href={`/profile/${cp.id}`}
                                    style={{
                                      textDecoration: "none",
                                      color: "inherit",
                                    }}
                                  >
                                    {name}
                                  </Link>
                                ) : (
                                  name
                                )}
                              </div>

                              <div style={{ opacity: 0.7, fontSize: 12 }}>
                                {formatRelativeTime(c.created_at)}
                              </div>
                            </div>

                            {!!formatSubtitle(cp) && (
                              <div
                                style={{
                                  opacity: 0.7,
                                  fontSize: 12,
                                  marginTop: 1,
                                }}
                              >
                                {formatSubtitle(cp)}
                              </div>
                            )}

                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 13,
                                lineHeight: 1.45,
                                opacity: 0.92,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              <LinkifyText text={c.body || ""} />
                            </div>

                            <div
                              style={{
                                display: "flex",
                                gap: 14,
                                alignItems: "center",
                                flexWrap: "wrap",
                                marginTop: 8,
                                fontSize: 12,
                              }}
                            >
                              <button
                                type="button"
                                onClick={() => toggleCommentLike(c.id)}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  padding: 0,
                                  cursor: "pointer",
                                  color: commentLikedByMe[c.id]
                                    ? "#f87171"
                                    : "rgba(226,232,240,0.78)",
                                  fontWeight: commentLikedByMe[c.id] ? 700 : 500,
                                }}
                              >
                                {commentLikedByMe[c.id] ? "♥" : "Like"}
                                {(commentLikesById[c.id] || 0) > 0
                                  ? ` ${commentLikesById[c.id]}`
                                  : ""}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  setReplyOpen((prev) => ({
                                    ...prev,
                                    [c.id]: !prev[c.id],
                                  }))
                                }
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  padding: 0,
                                  cursor: "pointer",
                                  color: "rgba(226,232,240,0.78)",
                                  fontWeight: 500,
                                }}
                              >
                                Reply
                              </button>

                              {replyCount > 0 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRepliesOpen((prev) => ({
                                      ...prev,
                                      [c.id]: !prev[c.id],
                                    }))
                                  }
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    padding: 0,
                                    cursor: "pointer",
                                    color: "rgba(56,189,248,0.9)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {repliesAreOpen
                                    ? "Hide replies"
                                    : `View replies (${replyCount})`}
                                </button>
                              )}
                            </div>

                            {replyBoxOpen && (
                              <div
                                style={{
                                  marginTop: 10,
                                  paddingLeft: 0,
                                }}
                              >
                                <AutoResizeTextarea
                                  value={replyDraft[c.id] || ""}
                                  onChange={(e) =>
                                    setReplyDraft((prev) => ({
                                      ...prev,
                                      [c.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={user ? "Write a reply…" : "Login to reply…"}
                                  disabled={!user || !!replySaving[c.id]}
                                />

                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "flex-end",
                                    gap: 8,
                                    marginTop: 8,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setReplyOpen((prev) => ({
                                        ...prev,
                                        [c.id]: false,
                                      }))
                                    }
                                    style={{
                                      ...pillBtnStyle,
                                      background: "rgba(2,6,23,0.22)",
                                    }}
                                  >
                                    Cancel
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => submitReply(c.id, item.post.id)}
                                    disabled={
                                      !user ||
                                      !!replySaving[c.id] ||
                                      !(replyDraft[c.id] || "").trim()
                                    }
                                    style={{
                                      ...pillBtnStyle,
                                      opacity:
                                        !user ||
                                        !!replySaving[c.id] ||
                                        !(replyDraft[c.id] || "").trim()
                                          ? 0.5
                                          : 1,
                                      cursor:
                                        !user ||
                                        !!replySaving[c.id] ||
                                        !(replyDraft[c.id] || "").trim()
                                          ? "default"
                                          : "pointer",
                                    }}
                                  >
                                    {replySaving[c.id] ? "Replying…" : "Reply"}
                                  </button>
                                </div>
                              </div>
                            )}

                            {repliesAreOpen && replyCount > 0 && (
                              <div
                                style={{
                                  marginTop: 12,
                                  marginLeft: 10,
                                  paddingLeft: 14,
                                  borderLeft: "1px solid rgba(148,163,184,0.18)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 12,
                                }}
                              >
                                {commentVm.replies.map((replyVm) => {
                                  const rc = replyVm.comment;
                                  const rp = replyVm.author;
                                  const replyName = rp?.full_name || "Member";

                                  return (
                                    <div
                                      key={rc.id}
                                      style={{
                                        display: "flex",
                                        gap: 10,
                                        alignItems: "flex-start",
                                      }}
                                    >
                                      <div style={avatarStyle(26)}>
                                        {rp?.avatar_url ? (
                                          <img
                                            src={rp.avatar_url}
                                            alt={replyName}
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "cover",
                                              display: "block",
                                            }}
                                          />
                                        ) : (
                                          initialsOf(replyName)
                                        )}
                                      </div>

                                      <div style={{ minWidth: 0, flex: 1 }}>
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: 10,
                                            alignItems: "baseline",
                                            flexWrap: "wrap",
                                          }}
                                        >
                                          <div
                                            style={{
                                              fontWeight: 800,
                                              fontSize: 12,
                                            }}
                                          >
                                            {rp?.id ? (
                                              <Link
                                                href={`/profile/${rp.id}`}
                                                style={{
                                                  textDecoration: "none",
                                                  color: "inherit",
                                                }}
                                              >
                                                {replyName}
                                              </Link>
                                            ) : (
                                              replyName
                                            )}
                                          </div>

                                          <div style={{ opacity: 0.7, fontSize: 11 }}>
                                            {formatRelativeTime(rc.created_at)}
                                          </div>
                                        </div>

                                        <div
                                          style={{
                                            marginTop: 4,
                                            fontSize: 12,
                                            lineHeight: 1.45,
                                            opacity: 0.92,
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                          }}
                                        >
                                          <LinkifyText text={rc.body || ""} />
                                        </div>

                                        <div
                                          style={{
                                            display: "flex",
                                            gap: 14,
                                            alignItems: "center",
                                            flexWrap: "wrap",
                                            marginTop: 6,
                                            fontSize: 11,
                                          }}
                                        >
                                          <button
                                            type="button"
                                            onClick={() => toggleCommentLike(rc.id)}
                                            style={{
                                              border: "none",
                                              background: "transparent",
                                              padding: 0,
                                              cursor: "pointer",
                                              color: commentLikedByMe[rc.id]
                                                ? "#f87171"
                                                : "rgba(226,232,240,0.78)",
                                              fontWeight: commentLikedByMe[rc.id]
                                                ? 700
                                                : 500,
                                            }}
                                          >
                                            {commentLikedByMe[rc.id] ? "♥" : "Like"}
                                            {(commentLikesById[rc.id] || 0) > 0
                                              ? ` ${commentLikesById[rc.id]}`
                                              : ""}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
                        </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* =========================
   AUTO RESIZE TEXTAREA
========================= */

function AutoResizeTextarea({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.style.height = "0px";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      style={{
        width: "100%",
        resize: "none",
        overflow: "hidden",
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,0.25)",
        background: "rgba(2,6,23,0.35)",
        color: "rgba(226,232,240,0.95)",
        fontSize: 13,
        lineHeight: 1.5,
        padding: "10px 12px",
        outline: "none",
      }}
    />
  );
}

(PostDetailPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
