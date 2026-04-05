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
    const el = ref.current;
    if (!el) return;

    el.style.height = "0px";
    const next = Math.min(el.scrollHeight, 150);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 150 ? "auto" : "hidden";
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
        minHeight: 52,
        maxHeight: 150,
        borderRadius: 14,
        border: "1px solid rgba(148,163,184,0.2)",
        background: "rgba(2,6,23,0.22)",
        color: "rgba(226,232,240,0.92)",
        padding: "10px 12px",
        fontSize: 15,
        lineHeight: 1.45,
        outline: "none",
        resize: "none",
      }}
    />
  );
}


function PdfInlineViewer({
  url,
  isMobile,
}: {
  url: string;
  isMobile: boolean;
}) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNaturalWidth, setPageNaturalWidth] = useState(595);
  const [pageNaturalHeight, setPageNaturalHeight] = useState(842);
  const [renderWidth, setRenderWidth] = useState(720);

  const stageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    const loadPdf = async () => {
      try {
        setLoadingPdf(true);
        setPdfError(null);
        setPdfBlobUrl(null);
        setPdfDoc(null);
        setPageNumber(1);
        setNumPages(0);

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const blob = await res.blob();

        if (blob.size === 0) {
          throw new Error("Fetched PDF is empty.");
        }

        objectUrl = URL.createObjectURL(blob);

        if (!cancelled) {
          setPdfBlobUrl(objectUrl);
        }
      } catch (err: any) {
        console.error("PDF fetch error", err);
        if (!cancelled) {
          setPdfError(err?.message || "Could not fetch PDF.");
        }
      } finally {
        if (!cancelled) {
          setLoadingPdf(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  useEffect(() => {
    let cancelled = false;

    const updatePageDimensions = async () => {
      if (!pdfDoc) return;

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 1 });

        if (!cancelled) {
          setPageNaturalWidth(viewport.width);
          setPageNaturalHeight(viewport.height);
        }
      } catch (err) {
        console.error("Failed to read page dimensions", err);
      }
    };

    updatePageDimensions();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber]);

  useEffect(() => {
    const updateSize = () => {
      const stage = stageRef.current;
      if (!stage) return;

      const stageWidth = stage.clientWidth;
      const stageHeight = stage.clientHeight;

      const horizontalPadding = isMobile ? 28 : 96;
      const verticalPadding = 28;

      const maxWidth = Math.max(220, stageWidth - horizontalPadding);
      const maxHeight = Math.max(220, stageHeight - verticalPadding);

      const widthScale = maxWidth / pageNaturalWidth;
      const heightScale = maxHeight / pageNaturalHeight;

      // keep smaller pages natural, shrink larger pages to fit
      const scale = Math.min(widthScale, heightScale, 1);

      setRenderWidth(Math.floor(pageNaturalWidth * scale));
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isMobile, pageNaturalWidth, pageNaturalHeight, pdfBlobUrl, pageNumber]);

  return (
    <div
      style={{
        width: "100%",
        background: "rgba(15,23,42,0.95)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      {loadingPdf && (
        <div style={{ color: "rgba(226,232,240,0.9)" }}>
          Loading PDF...
        </div>
      )}

      {pdfError && (
        <div
          style={{
            color: "rgba(248,113,113,0.95)",
            fontSize: 14,
            textAlign: "center",
            maxWidth: 500,
          }}
        >
          Failed to load PDF file: {pdfError}
        </div>
      )}

      {!loadingPdf && !pdfError && pdfBlobUrl && (
        <div
          ref={stageRef}
          style={{
            position: "relative",
            width: "100%",
            height: isMobile ? 520 : 820,
            maxHeight: "80vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: 14,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          <div
            style={{
              lineHeight: 0,
              borderRadius: 8,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
            }}
          >
            <Document
              file={pdfBlobUrl}
              onLoadSuccess={(loadedPdf) => {
                setPdfDoc(loadedPdf);
                setNumPages(loadedPdf.numPages);
                setPageNumber(1);
              }}
              onLoadError={(err) => {
                console.error("PDF render error", err);
                setPdfError(
                  err instanceof Error ? err.message : "Could not render PDF."
                );
              }}
              loading={
                <div style={{ color: "rgba(226,232,240,0.9)" }}>
                  Rendering PDF...
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={renderWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>

          {numPages > 0 && (
            <>
              <button
                type="button"
                onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                disabled={pageNumber <= 1}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.22)",
                  background: "rgba(2,6,23,0.72)",
                  color: "rgba(226,232,240,0.96)",
                  cursor: pageNumber <= 1 ? "default" : "pointer",
                  opacity: pageNumber <= 1 ? 0.45 : 1,
                  fontSize: 22,
                  zIndex: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ‹
              </button>

              <button
                type="button"
                onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
                disabled={pageNumber >= numPages}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 42,
                  height: 42,
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.22)",
                  background: "rgba(2,6,23,0.72)",
                  color: "rgba(226,232,240,0.96)",
                  cursor: pageNumber >= numPages ? "default" : "pointer",
                  opacity: pageNumber >= numPages ? 0.45 : 1,
                  fontSize: 22,
                  zIndex: 3,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ›
              </button>

              <div
                style={{
                  position: "absolute",
                  bottom: 14,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 13,
                  color: "rgba(226,232,240,0.92)",
                  background: "rgba(2,6,23,0.62)",
                  border: "1px solid rgba(148,163,184,0.18)",
                  borderRadius: 999,
                  padding: "6px 12px",
                  zIndex: 3,
                }}
              >
                Page {pageNumber} of {numPages}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function PostDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const postId = typeof id === "string" ? id : null;
  const [likerProfiles, setLikerProfiles] = useState<LikerProfile[]>([]);

  const { user, loading: userLoading } = useSupabaseUser();
  const isMobile = useIsMobile();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<PostVM | null>(null);

  const [savedPostIds, setSavedPostIds] = useState<string[]>([]);
  const [savingPostId, setSavingPostId] = useState<string | null>(null);

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommentRow[]>>({});
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [commentSaving, setCommentSaving] = useState<Record<string, boolean>>({});
  const [commenterProfiles, setCommenterProfiles] = useState<Record<string, FeedProfile>>({});

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
      .select("id, full_name, avatar_url, highest_education, role, current_title, affiliation")
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
        .select("id, full_name, avatar_url, highest_education, role, current_title, affiliation")
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
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      const likeRows = (likes || []) as LikeRow[];
const commentRows = (comments || []) as CommentRow[];

let likers: LikerProfile[] = [];

if (likeRows.length > 0) {
  const likerIds = Array.from(new Set(likeRows.map((r) => r.user_id))).slice(0, 8);

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

    if (!userLoading) {
      void loadSavedPosts();
    }
  }, [user, userLoading]);

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
      setLikerProfiles((prev) => [
        {
          id: user.id,
          full_name: item.author?.id === user.id ? item.author.full_name : "You",
          avatar_url: item.author?.id === user.id ? item.author.avatar_url : null,
        },
        ...prev,
      ].slice(0, 8));
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
          body: body.trim(),
        })
        .select("id, post_id, user_id, body, created_at")
        .maybeSingle();

      if (error) throw error;

      setCommentDraft((p) => ({ ...p, [pid]: "" }));
      setOpenComments((p) => ({ ...p, [pid]: true }));

      setCommentsByPost((prev) => {
        const cur = prev[pid] || [];
        return { ...prev, [pid]: data ? [data as CommentRow, ...cur] : cur };
      });

      await loadProfilesForUserIds([user.id]);

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

    const confirmed = window.confirm("Delete this post? This action cannot be undone.");
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

  const mediaItems = useMemo(() => normalizePostMedia(item?.post || null), [item]);

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
                    gap: 12,
                  }}
                >
                  {(commentsByPost[item.post.id] || []).length === 0 ? (
                    <div style={{ opacity: 0.7, fontSize: 12 }}>No comments yet.</div>
                  ) : (
                    (commentsByPost[item.post.id] || []).map((c) => {
                      const cp = commenterProfiles[c.user_id];
                      const name = cp?.full_name || "Member";

                      return (
                        <div key={c.id} style={{ display: "flex", gap: 10 }}>
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
