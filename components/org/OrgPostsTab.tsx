// components/org/OrgPostsTab.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type Org = {
  id: string;
  name: string;
  logo_url: string | null;
};

const POSTS_BUCKET = "post-images";

/* ===========
   POSTS TYPES
   =========== */

type PostRow = {
  id: string;
  user_id: string;
  body: string;
  created_at: string | null;
  image_url: string | null;
};

type PostVM = {
  post: PostRow;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

/* =========================
   SHARED MINI COMPONENTS
   ========================= */

function useIsMobile(maxWidth = 820) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const set = () => setIsMobile(mq.matches);
    set();

    const anyMq = mq as any;
    if (mq.addEventListener) {
      mq.addEventListener("change", set);
      return () => mq.removeEventListener("change", set);
    }
    if (anyMq.addListener) {
      anyMq.addListener(set);
      return () => anyMq.removeListener(set);
    }
  }, [maxWidth]);

  return isMobile;
}

function MiniIcon({ path }: { path: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
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

function ActionButton({
  icon,
  label,
  title,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  title?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={title || label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        borderRadius: 999,
        border: "1px solid rgba(148,163,184,0.18)",
        background: "rgba(2,6,23,0.22)",
        color: "rgba(226,232,240,0.92)",
        fontSize: 13,
        cursor: "pointer",
      }}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
      <span style={{ opacity: 0.95 }}>{label}</span>
    </button>
  );
}

/* =========================
   TEXT HELPERS FOR POSTS
   ========================= */

function LinkifyText({ text }: { text: string }) {
  const parts = (text || "").split(/(https?:\/\/[^\s]+)/g);

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
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

function formatRelativeTime(created_at: string | null) {
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
}

/* =========================
   ORG COMPOSER (POST ONLY)
   ========================= */

function OrgComposerStrip({
  org,
  canPostAsOrg,
  onPosted,
}: {
  org: Org;
  canPostAsOrg: boolean;
  onPosted?: () => void;
}) {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const isMobile = useIsMobile(520);

  const [open, setOpen] = useState(false);
  const [postText, setPostText] = useState("");
  const [postSaving, setPostSaving] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [postPhotoFile, setPostPhotoFile] = useState<File | null>(null);
  const [postPhotoPreview, setPostPhotoPreview] = useState<string | null>(null);

  const MAX_MEDIA_SIZE = 5 * 1024 * 1024;
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (postPhotoPreview?.startsWith("blob:")) URL.revokeObjectURL(postPhotoPreview);
    };
  }, [postPhotoPreview]);

  const isAuthed = !!user;

  const safeRedirect = () => {
    if (typeof window === "undefined") return "/";
    return `${window.location.pathname}${window.location.search}${window.location.hash || ""}`;
  };

  const goAuth = () => {
    const r = safeRedirect();
    router.push(`/auth?redirect=${encodeURIComponent(r)}`);
  };

  const orgName = org.name || "Organization";
  const orgShortName = (orgName.split(" ")[0] || orgName).trim();
  const initials =
    orgName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "Q";

  const avatarNode = (
    <div
      style={{
        width: isMobile ? 36 : 40,
        height: isMobile ? 36 : 40,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        border: "1px solid rgba(148,163,184,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
        color: "#0f172a",
        fontWeight: 800,
        letterSpacing: 0.5,
      }}
      aria-label={orgName}
      title={orgName}
    >
      {org.logo_url ? (
        <img
          src={org.logo_url}
          alt={orgName}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        initials
      )}
    </div>
  );

  const shellStyle: CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "linear-gradient(135deg, rgba(15,23,42,0.86), rgba(15,23,42,0.94))",
    boxShadow: "0 18px 40px rgba(15,23,42,0.45)",
    padding: isMobile ? 12 : 14,
  };

  const collapsedInputStyle: CSSProperties = {
    height: isMobile ? 40 : 42,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.35)",
    color: "rgba(226,232,240,0.92)",
    padding: "0 14px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    userSelect: "none",
    minWidth: 0,
  };

  const modalCard: CSSProperties = {
    width: "min(740px, 100%)",
    borderRadius: isMobile ? "18px 18px 0 0" : 18,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,23,42,0.98))",
    boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
    overflow: "hidden",
    maxHeight: isMobile ? "86vh" : undefined,
  };

  const modalHeader: CSSProperties = {
    padding: "14px 16px",
    borderBottom: "1px solid rgba(148,163,184,0.14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  const closeBtn: CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.2)",
    color: "rgba(226,232,240,0.92)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  const modalBody: CSSProperties = {
    padding: 16,
    overflowY: isMobile ? "auto" : undefined,
  };

  const bigTextarea: CSSProperties = {
    width: "100%",
    minHeight: isMobile ? 140 : 160,
    borderRadius: 14,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "rgba(2,6,23,0.26)",
    color: "rgba(226,232,240,0.94)",
    padding: 14,
    fontSize: 15,
    lineHeight: 1.45,
    outline: "none",
    resize: "vertical",
  };

  const footerBar: CSSProperties = {
    padding: "12px 16px",
    borderTop: "1px solid rgba(148,163,184,0.14)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  };

  const primaryBtn = (disabled?: boolean): CSSProperties => ({
    padding: "9px 16px",
    borderRadius: 999,
    border: "none",
    fontSize: 13,
    fontWeight: 800,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.55 : 1,
    background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
    color: "#0f172a",
  });

  const openComposer = () => {
    if (!router.isReady) return;
    if (!isAuthed) {
      goAuth();
      return;
    }
    setPostError(null);
    setMediaError(null);
    setOpen(true);
  };

  const closeComposer = () => {
    setMediaError(null);
    setOpen(false);
  };

  const canSubmit = !!postText.trim() && !postSaving;

  const pickPhoto = () => {
    if (!router.isReady) return;
    if (!isAuthed) {
      goAuth();
      return;
    }
    fileInputRef.current?.click();
  };

  const onPhotoSelected = (file: File | null) => {
    setMediaError(null);

    if (postPhotoPreview?.startsWith("blob:")) URL.revokeObjectURL(postPhotoPreview);

    if (!file) {
      setPostPhotoFile(null);
      setPostPhotoPreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMediaError("Only image files are allowed (video coming later).");
      setPostPhotoFile(null);
      setPostPhotoPreview(null);
      return;
    }

    if (file.size > MAX_MEDIA_SIZE) {
      setMediaError("Media must be smaller than 5 MB.");
      setPostPhotoFile(null);
      setPostPhotoPreview(null);
      return;
    }

    setPostPhotoFile(file);
    setPostPhotoPreview(URL.createObjectURL(file));
  };

  const clearPhoto = () => {
    setMediaError(null);
    onPhotoSelected(null);
  };

  const uploadPostPhotoIfAny = async (): Promise<string | null> => {
    if (!user) return null;
    if (!postPhotoFile) return null;

    const ext = (postPhotoFile.name.split(".").pop() || "jpg").toLowerCase();
    const path = `posts/${user.id}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(POSTS_BUCKET)
      .upload(path, postPhotoFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: postPhotoFile.type,
      });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from(POSTS_BUCKET).getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const submitPost = async () => {
    if (!router.isReady) return;

    if (!user) {
      goAuth();
      return;
    }

    const body = postText.trim();
    if (!body) return;

    setPostSaving(true);
    setPostError(null);

    try {
      const image_url = await uploadPostPhotoIfAny();

      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        org_id: org.id,
        body,
        image_url: image_url ?? null,
      });

      if (error) throw error;

      setPostText("");
      clearPhoto();
      closeComposer();

      onPosted?.();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:feed-changed"));
      }
    } catch (e: any) {
      console.error("submitPost (org) error:", e);
      setPostError(e?.message || "Could not create post.");
    } finally {
      setPostSaving(false);
    }
  };

  if (!canPostAsOrg) return null;

  return (
    <>
      <div style={shellStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {avatarNode}

          <div
            style={{ ...collapsedInputStyle, flex: "1 1 260px" }}
            onClick={openComposer}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") openComposer();
            }}
          >
            <span
              style={{
                opacity: 0.88,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {isMobile ? `Share an update as ${orgShortName}…` : `Share an update as ${orgName}…`}
            </span>
            <span style={{ marginLeft: "auto", opacity: 0.7, fontSize: 12, flexShrink: 0 }}>
              ✨
            </span>
          </div>
        </div>
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.62)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
            display: "flex",
            alignItems: isMobile ? "flex-end" : "center",
            justifyContent: "center",
            padding: isMobile ? 10 : 18,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeComposer();
          }}
        >
          <div style={modalCard}>
            <div style={modalHeader}>
              <div style={{ fontWeight: 800, fontSize: 15 }}>Create post as organization</div>

              <button type="button" style={closeBtn} onClick={closeComposer} aria-label="Close">
                ✕
              </button>
            </div>

            <div style={modalBody}>
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder={`Share an update as ${orgName}…`}
                style={bigTextarea}
              />

              {postPhotoPreview && (
                <div
                  style={{
                    marginTop: 10,
                    borderRadius: 14,
                    border: "1px solid rgba(148,163,184,0.18)",
                    background: "rgba(2,6,23,0.22)",
                    padding: 10,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 800 }}>
                      Photo attached
                    </div>
                    <button
                      type="button"
                      onClick={clearPhoto}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(248,113,113,0.35)",
                        background: "rgba(248,113,113,0.10)",
                        color: "rgba(254,226,226,0.95)",
                        fontSize: 12,
                        cursor: "pointer",
                        fontWeight: 800,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <img
                      src={postPhotoPreview}
                      alt="Preview"
                      style={{
                        width: "100%",
                        maxHeight: 360,
                        objectFit: "cover",
                        borderRadius: 12,
                        display: "block",
                      }}
                    />
                  </div>
                </div>
              )}

              {mediaError && (
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
                  {mediaError}
                </div>
              )}

              {postError && (
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
                  {postError}
                </div>
              )}
            </div>

            <div style={footerBar}>
              <ActionButton
                icon={
                  <MiniIcon path="M4 7h3l2-2h6l2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                }
                label="Media"
                onClick={pickPhoto}
              />

              <button
                type="button"
                style={primaryBtn(!canSubmit)}
                disabled={!canSubmit}
                onClick={submitPost}
              >
                {postSaving ? "Posting…" : "Post"}
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0] || null;
                onPhotoSelected(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

/* =========================
   ORG POSTS STRIP
   ========================= */

function OrgPostsStrip({
  orgId,
  orgName,
  logoUrl,
  initials,
}: {
  orgId: string;
  orgName: string;
  logoUrl: string | null;
  initials: string;
}) {
  const router = useRouter();
  const { user } = useSupabaseUser();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PostVM[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: postRows, error: postErr } = await supabase
        .from("posts")
        .select("id, user_id, body, created_at, image_url")
        .eq("org_id", orgId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (postErr) throw postErr;

      const posts = (postRows || []) as PostRow[];
      const postIds = posts.map((p) => p.id);

      let likeRows: { post_id: string; user_id: string }[] = [];
      if (postIds.length > 0) {
        const { data: likes } = await supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds);
        if (likes) likeRows = likes as any;
      }

      let commentRows: { post_id: string }[] = [];
      if (postIds.length > 0) {
        const { data: comments } = await supabase
          .from("post_comments")
          .select("post_id")
          .in("post_id", postIds);
        if (comments) commentRows = comments as any;
      }

      const likeCountByPost: Record<string, number> = {};
      const likedByMeSet = new Set<string>();
      likeRows.forEach((r) => {
        likeCountByPost[r.post_id] = (likeCountByPost[r.post_id] || 0) + 1;
        if (user?.id && r.user_id === user.id) likedByMeSet.add(r.post_id);
      });

      const commentCountByPost: Record<string, number> = {};
      commentRows.forEach((r) => {
        commentCountByPost[r.post_id] = (commentCountByPost[r.post_id] || 0) + 1;
      });

      setItems(
        posts.map((p) => ({
          post: p,
          likeCount: likeCountByPost[p.id] || 0,
          commentCount: commentCountByPost[p.id] || 0,
          likedByMe: likedByMeSet.has(p.id),
        }))
      );
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Could not load posts.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await load();
    };

    if (orgId) run();

    const channel = supabase
      .channel(`org-posts:${orgId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `org_id=eq.${orgId}` },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(260, Math.floor(el.clientWidth * 0.9));
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const openPost = (postId: string) => {
    router.push(`/?post=${encodeURIComponent(postId)}`);
  };

  if (loading) return <div className="products-status">Loading posts…</div>;
  if (error) return <div className="products-status" style={{ color: "#f87171" }}>{error}</div>;
  if (items.length === 0) return <div className="products-empty">No posts from this organization yet.</div>;

  const chipStyle: CSSProperties = {
    fontSize: 12,
    padding: "5px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.30)",
    background: "rgba(2,6,23,0.22)",
    color: "rgba(226,232,240,0.92)",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 800,
    userSelect: "none",
    whiteSpace: "nowrap",
  };

  const edgeBtn: CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 40,
    height: 40,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.28)",
    background: "rgba(2,6,23,0.65)",
    color: "rgba(226,232,240,0.95)",
    cursor: "pointer",
    fontWeight: 900,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
    zIndex: 5,
    backdropFilter: "blur(8px)",
  };

  return (
    <div
      className="card"
      style={{
        position: "relative",
        padding: 14,
        borderRadius: 16,
        border: "1px solid rgba(148,163,184,0.22)",
        background: "rgba(15,23,42,0.72)",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 44,
          background: "linear-gradient(90deg, rgba(15,23,42,0.95), rgba(15,23,42,0))",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          width: 44,
          background: "linear-gradient(270deg, rgba(15,23,42,0.95), rgba(15,23,42,0))",
          pointerEvents: "none",
          zIndex: 2,
        }}
      />

      <button
        type="button"
        onClick={() => scrollByCard(-1)}
        style={{ ...edgeBtn, left: 10 }}
        aria-label="Scroll left"
        title="Scroll left"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => scrollByCard(1)}
        style={{ ...edgeBtn, right: 10 }}
        aria-label="Scroll right"
        title="Scroll right"
      >
        ›
      </button>

      <div
        ref={scrollerRef}
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          padding: "4px 44px 10px 44px",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((it) => {
          const p = it.post;
          const hasImage = !!p.image_url;
          const body = (p.body || "").trim();

          return (
            <div
              key={p.id}
              onClick={() => openPost(p.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter") openPost(p.id);
              }}
              style={{
                scrollSnapAlign: "start",
                flex: "0 0 auto",
                width: "clamp(260px, calc((100% - 24px) / 3), 420px)",
                cursor: "pointer",
              }}
            >
              <div
                className="card"
                style={{
                  padding: 12,
                  borderRadius: 16,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(2,6,23,0.42)",
                  height: "100%",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      overflow: "hidden",
                      border: "1px solid rgba(148,163,184,0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                      color: "#fff",
                      fontWeight: 900,
                      flexShrink: 0,
                    }}
                  >
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt={orgName}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        fontSize: 13,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={orgName}
                    >
                      {orgName || "Organization"}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.72, marginTop: 2 }}>
                      {formatRelativeTime(p.created_at)}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid rgba(148,163,184,0.14)",
                    background: "rgba(15,23,42,0.55)",
                    minHeight: 210,
                    display: "grid",
                    gridTemplateRows: hasImage ? "190px auto" : "1fr",
                    gap: 10,
                    padding: 10,
                  }}
                >
                  {hasImage && (
                    <div
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid rgba(148,163,184,0.14)",
                        height: 190,
                      }}
                    >
                      <img
                        src={p.image_url as string}
                        alt="Post image"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        loading="lazy"
                      />
                    </div>
                  )}

                  <div
                    style={{
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.14)",
                      background: "rgba(2,6,23,0.18)",
                      padding: 10,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        fontSize: 13,
                        lineHeight: 1.45,
                        color: "rgba(226,232,240,0.92)",
                        whiteSpace: "pre-wrap",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: hasImage ? 4 : 9,
                        WebkitBoxOrient: "vertical",
                        wordBreak: "break-word",
                      }}
                      title={body}
                    >
                      <LinkifyText text={p.body || "—"} />
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "flex" }}>
                  <span style={chipStyle} title="Likes / comments">
                    ❤ {it.likeCount} · 💬 {it.commentCount}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* =========================
   PUBLIC EXPORT
   ========================= */

export default function OrgPostsTab({
  org,
  canPostAsOrg,
}: {
  org: Org;
  canPostAsOrg: boolean;
}) {
  const orgInitials = useMemo(() => {
    const name = org?.name || "Q5";
    return (
      name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0]?.toUpperCase())
        .join("") || "Q5"
    );
  }, [org]);

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ marginBottom: 14 }}>
        <OrgComposerStrip org={org} canPostAsOrg={canPostAsOrg} />
      </div>

      <div
        className="card"
        style={{
          padding: 16,
          marginBottom: 12,
          background:
            "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.16), rgba(15,23,42,0.98))",
          border: "1px solid rgba(148,163,184,0.35)",
          boxShadow: "0 18px 45px rgba(15,23,42,0.75)",
          borderRadius: 16,
        }}
      >
        <div className="section-title">Posts</div>
        <div className="section-sub" style={{ maxWidth: 620 }}>
          Public posts from this organization. Click a card to open it expanded.
        </div>
      </div>

      <OrgPostsStrip orgId={org.id} orgName={org.name} logoUrl={org.logo_url} initials={orgInitials} />
    </div>
  );
}
