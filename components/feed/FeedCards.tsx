// components/feed/FeedCards.tsx
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type FeedProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  affiliation?: string | null;
};

export type FeedOrg = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export type PostRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string | null;
  image_url: string | null;
  video_url?: string | null;
  org_id?: string | null;
};

export type CommentRow = {
  id: string;
  post_id: string;
  user_id: string;
  body: string;
  created_at: string | null;
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

  onToggleLike: (postId: string) => void;
  onLoadComments: (postId: string) => Promise<void> | void;
  onSubmitComment: (postId: string) => Promise<void> | void;

  formatRelativeTime: (created_at: string | null) => string;
  formatSubtitle: (p?: FeedProfile | null) => string;
  initialsOf: (name: string | null | undefined) => string;
  avatarStyle: (size?: number) => React.CSSProperties;

  LinkifyText: React.ComponentType<{ text: string }>;

  postRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;

  onEditPost?: (postId: string) => Promise<void> | void;
  onSharePost?: (postId: string) => Promise<void> | void;
  onSavePost?: (postId: string) => Promise<void> | void;
  isPostSaved?: (postId: string) => boolean;

  // optional loading flags coming from parent
  savingPostId?: string | null;
  editingPostId?: string | null;
};

function AutoPlayVideo({
  src,
  style,
}: {
  src: string;
  style?: React.CSSProperties;
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
            const p = node.play();
            if (p && typeof p.catch === "function") p.catch(() => {});
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
      style={style}
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
  onToggleLike,
  onLoadComments,
  onSubmitComment,
  formatRelativeTime,
  formatSubtitle,
  initialsOf,
  avatarStyle,
  LinkifyText,
  postRefs,
  onEditPost,
  onSharePost,
  onSavePost,
  isPostSaved,
  savingPostId,
  editingPostId,
}: Props) {
  const [openMenuPostId, setOpenMenuPostId] = useState<string | null>(null);
  const [sharingPostId, setSharingPostId] = useState<string | null>(null);
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
      const shareUrl = `${window.location.origin}/?post=${postId}`;

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

  const cardStyle: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.18)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.86), rgba(15,23,42,0.94))",
    boxShadow: "0 18px 40px rgba(15,23,42,0.35)",
    padding: 14,
    marginBottom: 12,
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

  return (
    <div>
      {items.map((vm) => {
        const p = vm.post;
        const author = vm.author;
        const org = vm.org ?? null;
        const isOpen = !!openComments[p.id];
        const comments = commentsByPost[p.id] || [];
        const isOwnPost = !!user && user.id === p.user_id;
        const postSaved = isPostSaved ? !!isPostSaved(p.id) : false;

        const isSavingThisPost = savingPostId === p.id;
        const isEditingThisPost = editingPostId === p.id;
        const isSharingThisPost = sharingPostId === p.id;

        const hasVideo = !!p.video_url;
        const hasImage = !!p.image_url && !hasVideo;

        const actorName = org?.name || author?.full_name || "Quantum member";
        const actorHref = org
          ? `/orgs/${org.slug}`
          : author?.id
          ? `/profile/${author.id}`
          : undefined;

        const avatarSrc = org != null ? org.logo_url : author?.avatar_url || null;

        const subtitle = org
          ? [
              author?.full_name ? `Posted by ${author.full_name}` : "Posted by member",
              formatSubtitle(author),
            ]
              .filter(Boolean)
              .join(" · ")
          : formatSubtitle(author);

        const initials = initialsOf(actorName);

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

            <div
              style={{
                marginTop: 10,
                fontSize: 14,
                lineHeight: 1.45,
                color: "rgba(226,232,240,0.92)",
              }}
            >
              <LinkifyText text={p.body || ""} />
            </div>

            {hasVideo && (
              <div
                style={{
                  marginTop: 10,
                  width: "100%",
                  height: 520,
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid rgba(148,163,184,0.16)",
                  background: "rgba(2,6,23,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AutoPlayVideo
                  src={p.video_url as string}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                    background: "rgba(15,23,42,0.95)",
                  }}
                />
              </div>
            )}

            {hasImage && (
              <div
                style={{
                  marginTop: 10,
                  width: "100%",
                  height: 520,
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid rgba(148,163,184,0.16)",
                  background: "rgba(2,6,23,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <img
                  src={p.image_url as string}
                  alt="Post media"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    display: "block",
                  }}
                  loading="lazy"
                />
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
                    ? "rgba(34,211,238,0.55)"
                    : "rgba(148,163,184,0.28)",
                  background: vm.likedByMe
                    ? "rgba(34,211,238,0.12)"
                    : "rgba(2,6,23,0.22)",
                }}
                onClick={() => onToggleLike(p.id)}
              >
                {vm.likedByMe ? "♥" : "♡"} {vm.likeCount}
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
                  <div style={avatarStyle(32)}>{user ? "🙂" : "?"}</div>

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
                      disabled={!user || !!commentSaving[p.id]}
                      style={{
                        width: "100%",
                        minHeight: 46,
                        borderRadius: 14,
                        border: "1px solid rgba(148,163,184,0.2)",
                        background: "rgba(2,6,23,0.22)",
                        color: "rgba(226,232,240,0.92)",
                        padding: "10px 12px",
                        fontSize: 13,
                        outline: "none",
                        resize: "vertical",
                      }}
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
                    gap: 10,
                  }}
                >
                  {comments.length === 0 ? (
                    <div style={{ opacity: 0.7, fontSize: 12 }}>
                      No comments yet.
                    </div>
                  ) : (
                    comments.map((c) => {
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
                                {name}
                              </div>
                              <div style={{ opacity: 0.7, fontSize: 12 }}>
                                {formatRelativeTime(c.created_at)}
                              </div>
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 13,
                                lineHeight: 1.4,
                                opacity: 0.92,
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
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
