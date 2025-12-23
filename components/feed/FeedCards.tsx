// components/feed/FeedCards.tsx
import React from "react";
import Link from "next/link";

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
  image_url: string | null;
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
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

type SupaUser = { id: string } | null;

type Props = {
  items: PostVM[];
  user: SupaUser;

  openComments: Record<string, boolean>;
  setOpenComments: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;

  commentsByPost: Record<string, CommentRow[]>;
  commenterProfiles: Record<string, FeedProfile>;

  commentDraft: Record<string, string>;
  setCommentDraft: React.Dispatch<React.SetStateAction<Record<string, string>>>;

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
}: Props) {
  const cardStyle: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "linear-gradient(135deg, rgba(15,23,42,0.86), rgba(15,23,42,0.94))",
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

  return (
    <div>
      {items.map((vm) => {
        const p = vm.post;
        const author = vm.author;
        const isOpen = !!openComments[p.id];
        const comments = commentsByPost[p.id] || [];

        const profileHref = author?.id ? `/profile/${author.id}` : undefined;

        return (
          <div
            key={p.id}
            ref={(el) => {
              postRefs.current[p.id] = el;
            }}
            style={cardStyle}
          >
            {/* Header */}
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {profileHref ? (
                <Link
                  href={profileHref}
                  style={{ textDecoration: "none", cursor: "pointer" }}
                >
                  <div style={avatarStyle(38)}>
                    {author?.avatar_url ? (
                      <img
                        src={author.avatar_url}
                        alt={author?.full_name || "User"}
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      />
                    ) : (
                      initialsOf(author?.full_name)
                    )}
                  </div>
                </Link>
              ) : (
                <div style={avatarStyle(38)}>
                  {initialsOf(author?.full_name)}
                </div>
              )}

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>
                    {profileHref ? (
                      <Link
                        href={profileHref}
                        style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
                      >
                        {author?.full_name || "Quantum member"}
                      </Link>
                    ) : (
                      author?.full_name || "Quantum member"
                    )}
                  </div>
                  <div style={subtle}>{formatRelativeTime(p.created_at)}</div>
                </div>
                <div style={{ ...subtle, marginTop: 2 }}>{formatSubtitle(author)}</div>
              </div>
            </div>

            {/* Body */}
            <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45, color: "rgba(226,232,240,0.92)" }}>
              <LinkifyText text={p.body || ""} />
            </div>

            {/* Image */}
            {p.image_url && (
              <div
                style={{
                  marginTop: 10,
                  borderRadius: 14,
                  overflow: "hidden",
                  border: "1px solid rgba(148,163,184,0.16)",
                  background: "rgba(2,6,23,0.22)",
                }}
              >
                <img
                  src={p.image_url}
                  alt="Post media"
                  style={{ width: "100%", maxHeight: 520, objectFit: "cover", display: "block" }}
                />
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                style={{
                  ...pillBtn,
                  borderColor: vm.likedByMe ? "rgba(34,211,238,0.55)" : "rgba(148,163,184,0.28)",
                  background: vm.likedByMe ? "rgba(34,211,238,0.12)" : "rgba(2,6,23,0.22)",
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

            {/* Comments unchanged */}
            {isOpen && (
  <div
    style={{
      marginTop: 12,
      paddingTop: 12,
      borderTop: "1px solid rgba(148,163,184,0.14)",
    }}
  >
    {/* Comment input */}
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <div style={avatarStyle(32)}>
        {user ? "🙂" : "?"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <textarea
          value={commentDraft[p.id] || ""}
          onChange={(e) =>
            setCommentDraft((prev) => ({ ...prev, [p.id]: e.target.value }))
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

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button
            type="button"
            onClick={() => onSubmitComment(p.id)}
            disabled={!user || !!commentSaving[p.id] || !(commentDraft[p.id] || "").trim()}
            style={{
              fontSize: 13,
              padding: "7px 12px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.28)",
              background: "rgba(2,6,23,0.22)",
              color: "rgba(226,232,240,0.92)",
              cursor: "pointer",
              opacity:
                !user || !!commentSaving[p.id] || !(commentDraft[p.id] || "").trim()
                  ? 0.5
                  : 1,
            }}
          >
            {commentSaving[p.id] ? "Posting…" : "Comment"}
          </button>
        </div>
      </div>
    </div>

    {/* Comments list */}
    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {comments.length === 0 ? (
        <div style={{ opacity: 0.7, fontSize: 12 }}>No comments yet.</div>
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
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  initialsOf(name)
                )}
              </div>

              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 800, fontSize: 13 }}>{name}</div>
                  <div style={{ opacity: 0.7, fontSize: 12 }}>
                    {formatRelativeTime(c.created_at)}
                  </div>
                </div>
                <div style={{ marginTop: 4, fontSize: 13, lineHeight: 1.4, opacity: 0.92 }}>
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
