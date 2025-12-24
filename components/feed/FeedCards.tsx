// components/feed/FeedCards.tsx
import React, {
  CSSProperties,
  MutableRefObject,
  Dispatch,
  SetStateAction,
} from "react";
import Link from "next/link";

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
  org_id: string | null;
};

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

type FeedCardsProps = {
  items: PostVM[];
  user: any;

  openComments: Record<string, boolean>;
  setOpenComments: Dispatch<SetStateAction<Record<string, boolean>>>;

  commentsByPost: Record<string, CommentRow[]>;
  commenterProfiles: Record<string, FeedProfile>;

  commentDraft: Record<string, string>;
  setCommentDraft: Dispatch<SetStateAction<Record<string, string>>>;

  commentSaving: Record<string, boolean>;

  onToggleLike: (postId: string) => void;
  onLoadComments: (postId: string) => Promise<void>;
  onSubmitComment: (postId: string) => Promise<void>;

  formatRelativeTime: (created_at: string | null) => string;
  formatSubtitle: (p?: FeedProfile | null) => string;
  initialsOf: (name: string | null | undefined) => string;
  avatarStyle: (size?: number) => CSSProperties;
  LinkifyText: React.ComponentType<{ text: string }>;

  postRefs: MutableRefObject<Record<string, HTMLDivElement | null>>;
};

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
}: FeedCardsProps) {
  const handleToggleComments = async (postId: string) => {
    const isOpen = !!openComments[postId];
    if (!isOpen && !commentsByPost[postId]) {
      // opening for the first time, load comments
      await onLoadComments(postId);
    }
    setOpenComments((prev) => ({ ...prev, [postId]: !isOpen }));
  };

  const likeBtnStyle: CSSProperties = {
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(15,23,42,0.75)",
    color: "rgba(226,232,240,0.95)",
    fontSize: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    cursor: "pointer",
  };

  const countBubbleStyle: CSSProperties = {
    minWidth: 18,
    height: 18,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.45)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    padding: "0 5px",
  };

  const cardStyle: CSSProperties = {
    borderRadius: 22,
    border: "1px solid rgba(148,163,184,0.18)",
    background:
      "radial-gradient(circle at top left, rgba(56,189,248,0.08), transparent 55%), rgba(15,23,42,0.96)",
    padding: 14,
    marginBottom: 10,
  };

  const commentAvatarSize = 26;

  return (
    <div>
      {items.map((item) => {
        const { post, author, org, likeCount, commentCount, likedByMe } = item;

        // === DISPLAY CONTEXT (org vs user) ===
        const displayName =
          (org && org.name) || author?.full_name || "Quantum member";

        const avatarSrc = org?.logo_url || author?.avatar_url || null;

        const avatarInitials = initialsOf(
          org?.name || author?.full_name || null
        );

        const headerHref =
          org && org.slug
            ? `/orgs/${org.slug}`
            : author
            ? `/profile/${author.id}`
            : "/community";

        // subtitle line under title
        const subtitle = org
          ? author
            ? (() => {
                const base =
                  author.full_name && author.full_name.length > 0
                    ? author.full_name
                    : "Member";
                const meta = formatSubtitle(author);
                return meta ? `Posted by ${base} · ${meta}` : `Posted by ${base}`;
              })()
            : ""
          : formatSubtitle(author);

        const commentsOpen = !!openComments[post.id];
        const comments = commentsByPost[post.id] || [];
        const draft = commentDraft[post.id] || "";
        const saving = !!commentSaving[post.id];

        return (
          <div
            key={post.id}
            style={cardStyle}
            ref={(el) => {
              postRefs.current[post.id] = el;
            }}
          >
            {/* HEADER ROW */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                marginBottom: 6,
              }}
            >
              <Link href={headerHref} style={{ textDecoration: "none" }}>
                <div style={avatarStyle(40)}>
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    avatarInitials
                  )}
                </div>
              </Link>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 6,
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    href={headerHref}
                    style={{
                      textDecoration: "none",
                      color: "rgba(241,245,249,0.98)",
                      fontWeight: 800,
                      fontSize: 14,
                    }}
                  >
                    {displayName}
                  </Link>
                  <span
                    style={{
                      fontSize: 12,
                      opacity: 0.7,
                    }}
                  >
                    {formatRelativeTime(post.created_at)}
                  </span>
                </div>

                {subtitle && (
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12,
                      opacity: 0.78,
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      overflow: "hidden",
                    }}
                  >
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {/* BODY */}
            {post.body && (
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.5,
                  color: "rgba(226,232,240,0.96)",
                  marginTop: 4,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                <LinkifyText text={post.body} />
              </div>
            )}

            {post.image_url && (
              <div style={{ marginTop: 10 }}>
                <img
                  src={post.image_url}
                  alt="Post media"
                  style={{
                    width: "100%",
                    borderRadius: 16,
                    maxHeight: 420,
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              </div>
            )}

            {/* ACTIONS */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                marginTop: 10,
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => onToggleLike(post.id)}
                  style={{
                    ...likeBtnStyle,
                    borderColor: likedByMe
                      ? "rgba(56,189,248,0.9)"
                      : likeBtnStyle.border,
                    background: likedByMe
                      ? "rgba(56,189,248,0.12)"
                      : likeBtnStyle.background,
                  }}
                >
                  <span aria-hidden="true">♡</span>
                  <span style={countBubbleStyle}>{likeCount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggleComments(post.id)}
                  style={likeBtnStyle}
                >
                  <span aria-hidden="true">💬</span>
                  <span style={countBubbleStyle}>{commentCount}</span>
                </button>
              </div>
            </div>

            {/* COMMENTS */}
            {commentsOpen && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(148,163,184,0.25)",
                }}
              >
                {comments.length === 0 && (
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.7,
                      marginBottom: 6,
                    }}
                  >
                    No comments yet. Start the discussion.
                  </div>
                )}

                {comments.map((c) => {
                  const prof = commenterProfiles[c.user_id];
                  const commenterName =
                    prof?.full_name || "Member";
                  const commenterHref = prof
                    ? `/profile/${prof.id}`
                    : "/community";
                  const cAvatarSrc = prof?.avatar_url || null;
                  const cInitials = initialsOf(commenterName);

                  return (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 6,
                      }}
                    >
                      <Link
                        href={commenterHref}
                        style={{ textDecoration: "none" }}
                      >
                        <div style={avatarStyle(commentAvatarSize)}>
                          {cAvatarSrc ? (
                            <img
                              src={cAvatarSrc}
                              alt={commenterName}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          ) : (
                            cInitials
                          )}
                        </div>
                      </Link>

                      <div
                        style={{
                          flex: 1,
                          minWidth: 0,
                          fontSize: 13,
                          lineHeight: 1.4,
                          color: "rgba(226,232,240,0.96)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "baseline",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          <Link
                            href={commenterHref}
                            style={{
                              textDecoration: "none",
                              color: "rgba(241,245,249,0.98)",
                              fontWeight: 700,
                              fontSize: 12,
                            }}
                          >
                            {commenterName}
                          </Link>
                          <span
                            style={{
                              fontSize: 11,
                              opacity: 0.65,
                            }}
                          >
                            {formatRelativeTime(c.created_at)}
                          </span>
                        </div>

                        <div style={{ marginTop: 2 }}>
                          <LinkifyText text={c.body} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* COMMENT INPUT */}
                {user && (
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 10,
                      alignItems: "flex-start",
                    }}
                  >
                    <div style={avatarStyle(commentAvatarSize)}>
                      {user.user_metadata?.avatar_url ? (
                        <img
                          src={user.user_metadata.avatar_url}
                          alt="You"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        initialsOf(
                          user.user_metadata?.full_name ||
                            user.email ||
                            "You"
                        )
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <textarea
                        value={draft}
                        onChange={(e) =>
                          setCommentDraft((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Write a comment…"
                        style={{
                          width: "100%",
                          minHeight: 60,
                          borderRadius: 14,
                          border: "1px solid rgba(148,163,184,0.3)",
                          background: "rgba(15,23,42,0.9)",
                          color: "rgba(226,232,240,0.96)",
                          padding: 8,
                          fontSize: 13,
                          resize: "vertical",
                          outline: "none",
                        }}
                      />

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "flex-end",
                          marginTop: 6,
                        }}
                      >
                        <button
                          type="button"
                          disabled={saving || !draft.trim()}
                          onClick={() => onSubmitComment(post.id)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            border: "none",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor:
                              saving || !draft.trim()
                                ? "default"
                                : "pointer",
                            opacity:
                              saving || !draft.trim() ? 0.55 : 1,
                            background:
                              "linear-gradient(135deg,#3bc7f3,#8468ff)",
                            color: "#0f172a",
                          }}
                        >
                          {saving ? "Posting…" : "Comment"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
