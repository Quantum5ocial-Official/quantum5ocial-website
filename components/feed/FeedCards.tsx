// components/feed/FeedCards.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export type FeedProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  affiliation?: string | null;
  role?: string | null;
  current_title?: string | null;
};

export type FeedOrg = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export type PostMediaItem = {
  url: string;
  type: "image" | "video" | "pdf";
};

export type PostRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string | null;
  image_url: string | null;
  video_url?: string | null;
  org_id?: string | null;
  media?: PostMediaItem[] | null;
};

export type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string | null;
  parent_comment_id?: string | null;
};

export type LikerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type CommentLikeRow = {
  comment_id: string;
  user_id: string;
};

export type CommentVM = {
  comment: CommentRow;
  author: FeedProfile | null;
  likeCount: number;
  likedByMe: boolean;
  replies: CommentVM[];
};

export type PostVM = {
  post: PostRow;
  author: FeedProfile | null;
  org?: FeedOrg | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

type SupaUser = { id: string } | null;

type Props = {
  items: PostVM[];
  user: SupaUser;

  openComments: Record<string, boolean>;
  setOpenComments: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;

  commentsByPost: Record<string, CommentRow[]>;
  commenterProfiles: Record<string, FeedProfile>;

  commentDraft: Record<string, string>;
  setCommentDraft: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;

  commentSaving: Record<string, boolean>;

  replyDraft: Record<string, string>;
  setReplyDraft: React.Dispatch<
    React.SetStateAction<Record<string, string>>
  >;
  replyOpen: Record<string, boolean>;
  setReplyOpen: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  replySaving: Record<string, boolean>;
  repliesOpen: Record<string, boolean>;
  setRepliesOpen: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;

  commentLikesById: Record<string, number>;
  commentLikedByMe: Record<string, boolean>;

  likerProfilesByPost: Record<string, LikerProfile[]>;

  onToggleLike: (postId: string) => void;
  onLoadComments: (postId: string) => Promise<void> | void;
  onSubmitComment: (postId: string) => Promise<void> | void;
  onSubmitReply: (parentCommentId: string, postId: string) => Promise<void> | void;
  onToggleCommentLike: (commentId: string, postId: string) => Promise<void> | void;

  formatRelativeTime: (created_at: string | null) => string;
  formatSubtitle: (p?: FeedProfile | null) => string;
  initialsOf: (name: string | null | undefined) => string;
  avatarStyle: (size?: number) => React.CSSProperties;

  LinkifyText: React.ComponentType<{ text: string }>;

  postRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;

  onEditPost?: (postId: string) => Promise<void> | void;
  onSharePost?: (postId: string) => Promise<void> | void;
  onSavePost?: (postId: string) => Promise<void> | void;
  onDeletePost?: (postId: string) => Promise<void> | void;
  isPostSaved?: (postId: string) => boolean;

  savingPostId?: string | null;
  editingPostId?: string | null;
  deletingPostId?: string | null;

  enablePreviewCollapse?: boolean;
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

  roots.sort(
    (a, b) =>
      Date.parse(b.comment.created_at || "") - Date.parse(a.comment.created_at || "")
  );

  Object.values(byId).forEach((vm) => {
    vm.replies.sort(
      (a, b) =>
        Date.parse(a.comment.created_at || "") - Date.parse(b.comment.created_at || "")
    );
  });

  return roots;
}

function AutoPlayVideo({
  src,
  style,
  onLoadedMetadata,
}: {
  src: string;
  style?: React.CSSProperties;
  onLoadedMetadata?: (el: HTMLVideoElement) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = videoRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const node = videoRef.current;
          if (!node) return;

          if (entry.isIntersecting) {
            const playPromise = node.play();
            if (playPromise && typeof playPromise.catch === "function") {
              playPromise.catch(() => {});
            }
          } else {
            node.pause();
          }
        });
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      muted
      playsInline
      loop
      controls
      preload="metadata"
      onLoadedMetadata={(e) => onLoadedMetadata?.(e.currentTarget)}
      style={style}
    />
  );
}

function AdaptiveImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const isMobile = useIsMobile();
  const [ratio, setRatio] = useState<number>(16 / 9);

  const frameMaxHeight = isMobile ? "min(52vh, 380px)" : "min(68vh, 560px)";

  return (
    <div
      style={{
        marginTop: 10,
        width: "100%",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(148,163,184,0.16)",
        background: "rgba(2,6,23,0.35)",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: String(ratio),
          maxHeight: frameMaxHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(15,23,42,0.92)",
        }}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={(e) => {
            const img = e.currentTarget;
            if (img.naturalWidth > 0 && img.naturalHeight > 0) {
              setRatio(img.naturalWidth / img.naturalHeight);
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
          }}
        />
      </div>
    </div>
  );
}

function AdaptiveVideo({
  src,
}: {
  src: string;
}) {
  const isMobile = useIsMobile();
  const [ratio, setRatio] = useState<number>(16 / 9);

  const frameMaxHeight = isMobile ? "min(52vh, 380px)" : "min(68vh, 560px)";

  return (
    <div
      style={{
        marginTop: 10,
        width: "100%",
        borderRadius: 14,
        overflow: "hidden",
        border: "1px solid rgba(148,163,184,0.16)",
        background: "rgba(2,6,23,0.35)",
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: String(ratio),
          maxHeight: frameMaxHeight,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(15,23,42,0.95)",
        }}
      >
        <AutoPlayVideo
          src={src}
          onLoadedMetadata={(video) => {
            if (video.videoWidth > 0 && video.videoHeight > 0) {
              setRatio(video.videoWidth / video.videoHeight);
            }
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            display: "block",
            background: "rgba(15,23,42,0.95)",
          }}
        />
      </div>
    </div>
  );
}
function InlinePdfCard({
  url,
  postHref,
}: {
  url: string;
  postHref: string;
}) {
  const isMobile = useIsMobile();

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pageNaturalWidth, setPageNaturalWidth] = useState(595);
  const [pageNaturalHeight, setPageNaturalHeight] = useState(842);
  const [renderWidth, setRenderWidth] = useState(520);

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
      const verticalPadding = 24;

      const maxWidth = Math.max(220, stageWidth - horizontalPadding);
      const maxHeight = Math.max(220, stageHeight - verticalPadding);

      const widthScale = maxWidth / pageNaturalWidth;
      const heightScale = maxHeight / pageNaturalHeight;
      const scale = Math.min(widthScale, heightScale, 1);

      setRenderWidth(Math.floor(pageNaturalWidth * scale));
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isMobile, pageNaturalWidth, pageNaturalHeight, pageNumber, pdfBlobUrl]);

  return (
    <div
      style={{
        marginTop: 10,
        width: "100%",
        borderRadius: 14,
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
          <Link
            href={postHref}
            style={{
              textDecoration: "none",
              color: "inherit",
              width: "100%",
            }}
          >
            <div
              style={{
                minHeight: 220,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                padding: 20,
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 42, lineHeight: 1 }}>📄</div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: "rgba(226,232,240,0.96)",
                }}
              >
                PDF document
              </div>
              <div
                style={{
                  fontSize: 13,
                  lineHeight: 1.4,
                  color: "rgba(248,113,113,0.95)",
                  maxWidth: 320,
                }}
              >
                Preview unavailable. Open post to browse page by page.
              </div>
            </div>
          </Link>
        )}

        {!loadingPdf && !pdfError && pdfBlobUrl && (
          <div
            ref={stageRef}
            style={{
              position: "relative",
              width: "100%",
              height: isMobile ? 420 : 760,
              maxHeight: "78vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div
              style={{
                position: "relative",
                zIndex: 0,
                boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
                borderRadius: 8,
                overflow: "hidden",
                lineHeight: 0,
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

            <Link
              href={postHref}
              aria-label="Open post"
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
              }}
            />

            {numPages > 0 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPageNumber((p) => Math.max(1, p - 1));
                  }}
                  disabled={pageNumber <= 1}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 40,
                    height: 40,
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
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPageNumber((p) => Math.min(numPages, p + 1));
                  }}
                  disabled={pageNumber >= numPages}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 40,
                    height: 40,
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
                    bottom: 12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: 12,
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
    </div>
  );
}

function GridMediaImage({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

function GridMediaVideo({
  src,
}: {
  src: string;
}) {
  return (
    <AutoPlayVideo
      src={src}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        display: "block",
        background: "rgba(15,23,42,0.95)",
      }}
    />
  );
}

function PostMediaGrid({
  media,
  postHref,
}: {
  media: PostMediaItem[];
  postHref: string;
}) {
  const visible = media.slice(0, 3);
  if (visible.length === 0) return null;

  if (visible.length === 1) {
    const item = visible[0];

    if (item.type === "pdf") {
      return <InlinePdfCard url={item.url} postHref={postHref} />;
    }

    return item.type === "video" ? (
      <Link href={postHref} style={{ textDecoration: "none", color: "inherit" }}>
        <AdaptiveVideo src={item.url} />
      </Link>
    ) : (
      <Link href={postHref} style={{ textDecoration: "none", color: "inherit" }}>
        <AdaptiveImage src={item.url} alt="Post media" />
      </Link>
    );
  }

  if (visible.length === 2) {
    return (
      <Link
        href={postHref}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
          marginTop: 10,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 6,
            height: 260,
            borderRadius: 14,
            overflow: "hidden",
            border: "1px solid rgba(148,163,184,0.16)",
            background: "rgba(2,6,23,0.35)",
          }}
        >
          {visible.map((item, idx) => (
            <div
              key={idx}
              style={{
                minWidth: 0,
                minHeight: 0,
                background: "rgba(15,23,42,0.92)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {item.type === "video" ? (
                <GridMediaVideo src={item.url} />
              ) : item.type === "pdf" ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    color: "rgba(226,232,240,0.94)",
                    textAlign: "center",
                    padding: 12,
                  }}
                >
                  <div style={{ fontSize: 34 }}>📄</div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>PDF</div>
                </div>
              ) : (
                <GridMediaImage src={item.url} alt={`Post media ${idx + 1}`} />
              )}
            </div>
          ))}
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={postHref}
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "block",
        marginTop: 10,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.35fr 1fr",
          gap: 6,
          height: 280,
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(148,163,184,0.16)",
          background: "rgba(2,6,23,0.35)",
        }}
      >
        <div style={{ minWidth: 0, minHeight: 0 }}>
          {visible[0].type === "video" ? (
            <GridMediaVideo src={visible[0].url} />
          ) : visible[0].type === "pdf" ? (
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "rgba(15,23,42,0.92)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                color: "rgba(226,232,240,0.94)",
              }}
            >
              <div style={{ fontSize: 40 }}>📄</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>PDF</div>
            </div>
          ) : (
            <GridMediaImage src={visible[0].url} alt="Post media 1" />
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateRows: "1fr 1fr",
            gap: 6,
            minWidth: 0,
            minHeight: 0,
          }}
        >
          <div style={{ minWidth: 0, minHeight: 0 }}>
            {visible[1].type === "video" ? (
              <GridMediaVideo src={visible[1].url} />
            ) : visible[1].type === "pdf" ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "rgba(15,23,42,0.92)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "rgba(226,232,240,0.94)",
                }}
              >
                <div style={{ fontSize: 40 }}>📄</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>PDF</div>
              </div>
            ) : (
              <GridMediaImage src={visible[1].url} alt="Post media 2" />
            )}
          </div>

          <div style={{ minWidth: 0, minHeight: 0 }}>
            {visible[2].type === "video" ? (
              <GridMediaVideo src={visible[2].url} />
            ) : visible[2].type === "pdf" ? (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  background: "rgba(15,23,42,0.92)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  color: "rgba(226,232,240,0.94)",
                }}
              >
                <div style={{ fontSize: 40 }}>📄</div>
                <div style={{ fontSize: 12, fontWeight: 700 }}>PDF</div>
              </div>
            ) : (
              <GridMediaImage src={visible[2].url} alt="Post media 3" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

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
        minHeight: 46,
        maxHeight: 150,
        borderRadius: 14,
        border: "1px solid rgba(148,163,184,0.2)",
        background: "rgba(2,6,23,0.22)",
        color: "rgba(226,232,240,0.92)",
        padding: "10px 12px",
        fontSize: 16,
        lineHeight: 1.45,
        outline: "none",
        resize: "none",
      }}
    />
  );
}

export default function FeedCards({
  items,
  user,
  openComments,
  setOpenComments,
  commentsByPost,
  commenterProfiles,
  commentDraft,
  setCommentDraft,
  commentSaving,
  replyDraft,
  setReplyDraft,
  replyOpen,
  setReplyOpen,
  replySaving,
  repliesOpen,
  setRepliesOpen,
  commentLikesById,
  commentLikedByMe,
  likerProfilesByPost,
  onToggleLike,
  onLoadComments,
  onSubmitComment,
  onSubmitReply,
  onToggleCommentLike,
  formatRelativeTime,
  formatSubtitle,
  initialsOf,
  avatarStyle,
  LinkifyText,
  postRefs,
  onEditPost,
  onSharePost,
  onSavePost,
  onDeletePost,
  isPostSaved,
  savingPostId,
  editingPostId,
  deletingPostId,
  enablePreviewCollapse = true,
}: Props) {
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>(
    {}
  );
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!openMenuPostId) return;
      const activeMenu = menuRefs.current[openMenuPostId];
      if (activeMenu && !activeMenu.contains(target)) {
        setOpenMenuPostId(null);
      }
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuPostId(null);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [openMenuPostId]);

  const handleShare = async (postId: string) => {
    if (sharingPostId) return;
    setSharingPostId(postId);

    try {
      if (onSharePost) {
        await onSharePost(postId);
        return;
      }

      if (typeof window === "undefined") return;
      const shareUrl = `${window.location.origin}/posts/${postId}`;

      if (navigator.share) {
        await navigator.share({ url: shareUrl });
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
    } catch {
      // ignore
    } finally {
      setSharingPostId(null);
    }
  };

  const toggleExpanded = (postId: string) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 20,
    border: "1px solid rgba(56,189,248,0.25)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,41,59,0.96))",
    boxShadow:
      "0 14px 34px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.04)",
    padding: 14,
    marginBottom: 16,
  };

  const pillBtn: React.CSSProperties = {
    fontSize: 13,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(2,6,23,0.22)",
    color: "rgba(226,232,240,0.92)",
    cursor: "pointer",
    userSelect: "none",
  };

  const subtle: React.CSSProperties = { opacity: 0.78, fontSize: 12 };

  const menuButtonStyle: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.24)",
    color: "rgba(226,232,240,0.92)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    fontSize: 18,
    lineHeight: 1,
  };

  const menuStyle: React.CSSProperties = {
    position: "absolute",
    top: 40,
    right: 0,
    minWidth: 180,
    padding: 8,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.96)",
    boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
    zIndex: 50,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  };

  const menuItemStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 10,
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(15,23,42,0.45)",
    color: "rgba(226,232,240,0.95)",
    textAlign: "left",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
  };

  const clickableStyle: React.CSSProperties = {
    textDecoration: "none",
    color: "inherit",
    display: "block",
    cursor: "pointer",
  };

  const threadedCommentsByPost = useMemo(() => {
    const result: Record<string, CommentVM[]> = {};

    items.forEach((vm) => {
      const postId = vm.post.id;
      const flat = commentsByPost[postId] || [];

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

      result[postId] = buildCommentTree(
        flat,
        commenterProfiles,
        actualLikeRows,
        user?.id
      );
    });

    return result;
  }, [
    items,
    commentsByPost,
    commenterProfiles,
    commentLikesById,
    commentLikedByMe,
    user,
  ]);

  return (
    <div>
      {items.map((vm) => {
        const p = vm.post;
        const author = vm.author;
        const org = vm.org ?? null;
        const isOpen = !!openComments[p.id];
        const comments = commentsByPost[p.id] || [];
        const threadedComments = threadedCommentsByPost[p.id] || [];
        const isOwnPost = !!user && user.id === p.user_id;
        const postSaved = isPostSaved ? !!isPostSaved(p.id) : false;
        const likerProfiles = likerProfilesByPost[p.id] || [];

        const isSavingThisPost = savingPostId === p.id;
        const isEditingThisPost = editingPostId === p.id;
        const isDeletingThisPost = deletingPostId === p.id;
        const isSharingThisPost = sharingPostId === p.id;

        const validMedia =
          Array.isArray(p.media) && p.media.length > 0
            ? p.media.filter(
                (item) =>
                  item &&
                  typeof item.url === "string" &&
                  (item.type === "image" ||
                    item.type === "video" ||
                    item.type === "pdf")
              )
            : [];

        const hasStructuredMedia = validMedia.length > 0;
        const hasVideo = !hasStructuredMedia && !!p.video_url;
        const hasImage = !hasStructuredMedia && !!p.image_url && !hasVideo;

        const actorName = org?.name || author?.full_name || "Quantum member";
        const actorHref = org
          ? `/orgs/${org.slug}`
          : author?.id
          ? `/profile/${author.id}`
          : undefined;

        const avatarSrc =
          org != null ? org.logo_url : author?.avatar_url || null;

        const subtitle = org
          ? [
              author?.full_name
                ? `Posted by ${author.full_name}`
                : "Posted by member",
              formatSubtitle(author),
            ]
              .filter(Boolean)
              .join(" · ")
          : formatSubtitle(author);

        const initials = initialsOf(actorName);
        const postHref = `/posts/${p.id}`;

        const isExpanded = !!expandedPosts[p.id];
        const shouldShowExpand =
          enablePreviewCollapse &&
          ((p.body || "").length > 220 || (p.body || "").split("\n").length > 3);
        const isCollapsed = shouldShowExpand && !isExpanded;

        return (
          <div
            key={p.id}
            ref={(el) => {
              postRefs.current[p.id] = el;
            }}
            style={cardStyle}
          >
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
                  style={{ textDecoration: "none", cursor: "pointer" }}
                >
                  <div style={avatarStyle(38)}>
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
                      initials
                    )}
                  </div>
                </Link>
              ) : (
                <div style={avatarStyle(38)}>
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
                    initials
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
                      fontSize: 14,
                      lineHeight: 1.2,
                    }}
                  >
                    {actorHref ? (
                      <Link
                        href={actorHref}
                        style={{
                          textDecoration: "none",
                          color: "inherit",
                          cursor: "pointer",
                        }}
                      >
                        {actorName}
                      </Link>
                    ) : (
                      actorName
                    )}
                  </div>
                  <div style={subtle}>{formatRelativeTime(p.created_at)}</div>
                </div>
                <div style={{ ...subtle, marginTop: 2 }}>{subtitle}</div>
              </div>

              <div
                ref={(el) => {
                  menuRefs.current[p.id] = el;
                }}
                style={{ position: "relative", flexShrink: 0 }}
              >
                <button
                  type="button"
                  aria-label="Post actions"
                  onClick={() =>
                    setOpenMenuPostId((prev) => (prev === p.id ? null : p.id))
                  }
                  style={menuButtonStyle}
                >
                  ⋯
                </button>

                {openMenuPostId === p.id && (
                  <div style={menuStyle}>
                    {isOwnPost && (
                      <button
                        type="button"
                        style={{
                          ...menuItemStyle,
                          opacity: isEditingThisPost ? 0.6 : 1,
                          cursor: isEditingThisPost ? "default" : "pointer",
                        }}
                        disabled={isEditingThisPost}
                        onClick={async () => {
                          if (!onEditPost || isEditingThisPost) return;
                          setOpenMenuPostId(null);
                          await onEditPost(p.id);
                        }}
                      >
                        {isEditingThisPost ? "⏳ Opening editor…" : "✏️ Edit"}
                      </button>
                    )}

                    {isOwnPost && (
                      <button
                        type="button"
                        style={{
                          ...menuItemStyle,
                          opacity: isDeletingThisPost ? 0.6 : 1,
                          cursor: isDeletingThisPost ? "default" : "pointer",
                          border: "1px solid rgba(248,113,113,0.22)",
                          background: "rgba(127,29,29,0.18)",
                          color: "rgba(254,202,202,0.95)",
                        }}
                        disabled={isDeletingThisPost}
                        onClick={async () => {
                          if (!onDeletePost || isDeletingThisPost) return;
                          setOpenMenuPostId(null);
                          await onDeletePost(p.id);
                        }}
                      >
                        {isDeletingThisPost ? "⏳ Deleting..." : "🗑 Delete"}
                      </button>
                    )}

                    <button
                      type="button"
                      style={{
                        ...menuItemStyle,
                        opacity: isSharingThisPost ? 0.6 : 1,
                        cursor: isSharingThisPost ? "default" : "pointer",
                      }}
                      disabled={isSharingThisPost}
                      onClick={async () => {
                        setOpenMenuPostId(null);
                        await handleShare(p.id);
                      }}
                    >
                      {isSharingThisPost ? "⏳ Sharing…" : "🔗 Share"}
                    </button>

                    <button
                      type="button"
                      style={{
                        ...menuItemStyle,
                        opacity: isSavingThisPost ? 0.6 : 1,
                        cursor: isSavingThisPost ? "default" : "pointer",
                      }}
                      disabled={isSavingThisPost}
                      onClick={async () => {
                        if (!onSavePost || isSavingThisPost) return;
                        setOpenMenuPostId(null);
                        await onSavePost(p.id);
                      }}
                    >
                      {isSavingThisPost
                        ? "⏳ Saving..."
                        : postSaved
                        ? "💾 Saved"
                        : "📌 Save post"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              <Link href={postHref} style={clickableStyle}>
                <div
                  style={{
                    position: "relative",
                    maxHeight: isCollapsed ? 135 : "none",
                    overflow: isCollapsed ? "hidden" : "visible",
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.45,
                      color: "rgba(226,232,240,0.92)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    <LinkifyText text={p.body || ""} />
                  </div>

                  {isCollapsed && (
                    <div
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 64,
                        background:
                          "linear-gradient(to bottom, rgba(15,23,42,0), rgba(15,23,42,0.82) 48%, rgba(15,23,42,0.98) 100%)",
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </div>
              </Link>
                            {shouldShowExpand && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    marginTop: 10,
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleExpanded(p.id);
                    }}
                    style={{
                      ...pillBtn,
                      borderColor: "rgba(56,189,248,0.3)",
                      background: "rgba(56,189,248,0.08)",
                      color: "rgba(226,232,240,0.96)",
                      fontWeight: 700,
                    }}
                  >
                    {isExpanded ? "See less" : "See more"}
                  </button>
                </div>
              )}

              {hasStructuredMedia && (
                <PostMediaGrid media={validMedia} postHref={postHref} />
              )}

              {hasVideo && (
                <Link href={postHref} style={clickableStyle}>
                  <AdaptiveVideo src={p.video_url as string} />
                </Link>
              )}

              {hasImage && (
                <Link href={postHref} style={clickableStyle}>
                  <AdaptiveImage
                    src={p.image_url as string}
                    alt="Post media"
                  />
                </Link>
              )}
            </div>

            {likerProfiles.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginTop: 12,
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
                  Liked by {vm.likeCount} {vm.likeCount === 1 ? "person" : "people"}
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                marginTop: 12,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                style={{
                  ...pillBtn,
                  borderColor: vm.likedByMe
                    ? "rgba(248,113,113,0.55)"
                    : "rgba(148,163,184,0.28)",
                  background: vm.likedByMe
                    ? "rgba(248,113,113,0.12)"
                    : "rgba(2,6,23,0.22)",
                  color: vm.likedByMe
                    ? "rgba(254,226,226,0.98)"
                    : "rgba(226,232,240,0.92)",
                }}
                onClick={() => onToggleLike(p.id)}
              >
                <span style={{ color: vm.likedByMe ? "#f87171" : "inherit" }}>
                  {vm.likedByMe ? "♥" : "♡"}
                </span>{" "}
                {vm.likeCount}
              </button>

              <button
                type="button"
                style={pillBtn}
                onClick={async () => {
                  const next = !isOpen;
                  setOpenComments((prev) => ({ ...prev, [p.id]: next }));
                  if (next && !commentsByPost[p.id]) {
                    await onLoadComments(p.id);
                  }
                }}
              >
                💬 {vm.commentCount}
              </button>
            </div>

            {isOpen && (
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid rgba(148,163,184,0.14)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <AutoResizeTextarea
                      value={commentDraft[p.id] || ""}
                      onChange={(e) =>
                        setCommentDraft((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                      placeholder={user ? "Write a comment…" : "Login to comment…"}
                      disabled={!user || !!commentSaving[p.id]}
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
                        onClick={() => onSubmitComment(p.id)}
                        disabled={
                          !user ||
                          !!commentSaving[p.id] ||
                          !(commentDraft[p.id] || "").trim()
                        }
                        style={{
                          fontSize: 13,
                          padding: "7px 12px",
                          borderRadius: 999,
                          border: "1px solid rgba(148,163,184,0.28)",
                          background: "rgba(2,6,23,0.22)",
                          color: "rgba(226,232,240,0.92)",
                          cursor: "pointer",
                          opacity:
                            !user ||
                            !!commentSaving[p.id] ||
                            !(commentDraft[p.id] || "").trim()
                              ? 0.5
                              : 1,
                        }}
                      >
                        {commentSaving[p.id] ? "Posting…" : "Comment"}
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                  }}
                >
                  {threadedComments.length === 0 ? (
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      No comments yet.
                    </div>
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
                                onClick={() => onToggleCommentLike(c.id, p.id)}
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
                                      ...pillBtn,
                                      background: "rgba(2,6,23,0.22)",
                                    }}
                                  >
                                    Cancel
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => onSubmitReply(c.id, p.id)}
                                    disabled={
                                      !user ||
                                      !!replySaving[c.id] ||
                                      !(replyDraft[c.id] || "").trim()
                                    }
                                    style={{
                                      ...pillBtn,
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

                                        {!!formatSubtitle(rp) && (
                                          <div
                                            style={{
                                              opacity: 0.68,
                                              fontSize: 11,
                                              marginTop: 1,
                                            }}
                                          >
                                            {formatSubtitle(rp)}
                                          </div>
                                        )}

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
                                            onClick={() =>
                                              onToggleCommentLike(rc.id, p.id)
                                            }
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
