// pages/orgs/[slug].tsx
import { useEffect, useState, useMemo, useRef } from "react";
import type React from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import { createPortal } from "react-dom";

type Org = {
  id: string;
  created_by: string | null;
  kind: "company" | "research_group";
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  country: string | null;
  city: string | null;
  industry: string | null;
  focus_areas: string | null;
  size_label: string | null;
  company_type: string | null;
  group_type: string | null;
  institution: string | null;
  department: string | null;
  hiring_status: "" | "not_hiring" | "hiring_selectively" | "actively_hiring" | null;
};

type FollowerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  highest_education: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

// membership roles for org_members
type OrgMemberRole = "owner" | "co_owner" | "admin" | "member";

type OrgMemberRow = {
  user_id: string;
  role: OrgMemberRole;
  is_affiliated: boolean;
};

type OrgMemberWithProfile = {
  user_id: string;
  role: OrgMemberRole;
  is_affiliated: boolean;
  profile: FollowerProfile | null;
};

// search results for invite panel – now only from followers
type SearchProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

type MenuPosition = { top: number; left: number } | null;

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
    return;
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
}: {
  org: Org;
  canPostAsOrg: boolean;
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

  const MAX_MEDIA_SIZE = 5 * 1024 * 1024; // 5 MB
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (postPhotoPreview?.startsWith("blob:")) URL.revokeObjectURL(postPhotoPreview);
    };
  }, [postPhotoPreview]);

  const isAuthed = !!user;

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
    if (!isAuthed) {
      window.location.href = `/auth?redirect=${encodeURIComponent(router.asPath)}`;
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

  const collapsedPlaceholder = isMobile
    ? `Share an update as ${orgShortName}…`
    : `Share an update as ${orgName}…`;

  const canSubmit = !!postText.trim() && !postSaving;

  const pickPhoto = () => {
    if (!isAuthed) {
      window.location.href = `/auth?redirect=${encodeURIComponent(router.asPath)}`;
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

    if (!postPhotoFile.type.startsWith("image/")) {
      throw new Error("Please choose an image file.");
    }

    if (postPhotoFile.size > MAX_MEDIA_SIZE) {
      throw new Error("Media must be smaller than 5 MB.");
    }

    const ext = (postPhotoFile.name.split(".").pop() || "jpg").toLowerCase();
    const path = `posts/${user.id}/${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}.${ext}`;

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
    if (!user) {
      window.location.href = `/auth?redirect=${encodeURIComponent(router.asPath)}`;
      return;
    }

    const body = postText.trim();
    if (!body) return;

    setPostSaving(true);
    setPostError(null);

    try {
      const image_url = await uploadPostPhotoIfAny();

      // ✅ attach org_id
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

  // Only render for people allowed to act as org
  if (!canPostAsOrg) {
    return null;
  }

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
              {collapsedPlaceholder}
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

              <button
                type="button"
                style={closeBtn}
                onClick={closeComposer}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div style={modalBody}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                {avatarNode}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}>
                    {orgName}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                    Public · Posting as organization
                  </div>
                </div>
              </div>

              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder={
                  isMobile ? `Share an update as ${orgShortName}…` : `Share an update as ${orgName}…`
                }
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
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
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
                    lineHeight: 1.35,
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
                    lineHeight: 1.35,
                  }}
                >
                  {postError}
                </div>
              )}
            </div>

            <div style={footerBar}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <ActionButton
                  icon={
                    <MiniIcon path="M4 7h3l2-2h6l2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                  }
                  label="Media"
                  onClick={pickPhoto}
                />
              </div>

              <button
                type="button"
                style={primaryBtn(!canSubmit)}
                disabled={!canSubmit}
                onClick={() => submitPost()}
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
        const { data: likes, error: likeErr } = await supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds);

        if (!likeErr && likes) likeRows = likes as any;
      }

      let commentRows: { post_id: string }[] = [];
      if (postIds.length > 0) {
        const { data: comments, error: cErr } = await supabase
          .from("post_comments")
          .select("post_id")
          .in("post_id", postIds);

        if (!cErr && comments) commentRows = comments as any;
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

      const vms: PostVM[] = posts.map((p) => ({
        post: p,
        likeCount: likeCountByPost[p.id] || 0,
        commentCount: commentCountByPost[p.id] || 0,
        likedByMe: likedByMeSet.has(p.id),
      }));

      setItems(vms);
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
  if (error)
    return (
      <div className="products-status" style={{ color: "#f87171" }}>
        {error}
      </div>
    );
  if (items.length === 0)
    return <div className="products-empty">No posts from this organization yet.</div>;

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
      {/* edge fades */}
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

      {/* arrows */}
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
                {/* header */}
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
                        lineHeight: 1.1,
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

                {/* content */}
                <div
                  style={{
                    marginTop: 10,
                    borderRadius: 14,
                    overflow: "hidden",
                    border: "1px solid rgba(148,163,184,0.14)",
                    background: "rgba(15,23,42,0.55)",
                    minHeight: 210,
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    gridTemplateRows: hasImage ? "190px auto" : "1fr",
                    gap: 10,
                    padding: 10,
                    alignItems: "stretch",
                  }}
                >
                  {hasImage && (
                    <div
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        border: "1px solid rgba(148,163,184,0.14)",
                        background: "rgba(2,6,23,0.22)",
                        height: 190,
                      }}
                    >
                      <img
                        src={p.image_url as string}
                        alt="Post image"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
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
                      display: "flex",
                      alignItems: hasImage ? "flex-start" : "center",
                      minHeight: hasImage ? 0 : 190,
                      minWidth: 0,
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

                <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-start" }}>
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
   MAIN ORG PAGE
   ========================= */

const OrganizationDetailPage = () => {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const { slug } = router.query;

  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Followers state
  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [loadingFollowers, setLoadingFollowers] = useState<boolean>(true);
  const [followersError, setFollowersError] = useState<string | null>(null);

  // Follow state (current user ↔ this org)
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);

  // Membership state for current user
  const [memberRole, setMemberRole] = useState<OrgMemberRole | null>(null);
  const [isAffiliated, setIsAffiliated] = useState<boolean>(false);

  // Team / members list state
  const [members, setMembers] = useState<OrgMemberWithProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Invite / add-member panel state
  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<OrgMemberRole>("member");
  const [selectedAffiliated, setSelectedAffiliated] = useState<boolean>(true);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  // Member management (role changes / remove / self-affiliation)
  const [memberMenuOpenId, setMemberMenuOpenId] = useState<string | null>(null);
  const [memberActionLoadingId, setMemberActionLoadingId] =
    useState<string | null>(null);
  const [selfAffLoadingId, setSelfAffLoadingId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>(null);

  // Followers collapse/expand UI
  const [followersExpanded, setFollowersExpanded] = useState<boolean>(false);

  // Team scroller
  const teamScrollerRef = useRef<HTMLDivElement | null>(null);

  // === LOAD CURRENT ORG BY SLUG ===
  useEffect(() => {
    if (!slug) return;

    const loadOrg = async () => {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        setOrg(data as Org);
      } else {
        setOrg(null);
        setNotFound(true);
      }

      setLoading(false);
    };

    loadOrg();
  }, [slug]);

  const kindLabel = org?.kind === "company" ? "Company" : "Research group";

  const metaLine = useMemo(() => {
    if (!org) return "";
    const bits: string[] = [];

    if (org.kind === "company") {
      if (org.industry) bits.push(org.industry);
      if (org.company_type) bits.push(org.company_type);
    } else {
      if (org.institution) bits.push(org.institution);
      if (org.department) bits.push(org.department);
    }

    if (org.size_label) bits.push(org.size_label);

    if (org.city && org.country) bits.push(`${org.city}, ${org.country}`);
    else if (org.country) bits.push(org.country);

    return bits.join(" · ");
  }, [org]);

  const firstLetter = org?.name?.charAt(0).toUpperCase() || "Q";

  const orgInitials = useMemo(() => {
    if (!org?.name) return "Q5";
    const res =
      org.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((x) => x[0]?.toUpperCase())
        .join("") || "Q5";
    return res;
  }, [org]);

  const editHref = useMemo(() => {
    if (!org) return "#";
    return org.kind === "company"
      ? `/orgs/edit/company/${org.slug}`
      : `/orgs/edit/research-group/${org.slug}`;
  }, [org]);

  // ✅ Hiring badge: driven by explicit DB field `hiring_status`
const hiringBadge = useMemo(() => {
  if (!org) return null;
  if (org.kind !== "company") return null;

  const hs = org.hiring_status || "";

  if (hs === "actively_hiring") {
    return {
      text: "Actively hiring",
      title: "This company is actively hiring",
      border: "1px solid rgba(34,197,94,0.95)",
      background: "rgba(22,163,74,0.18)",
      color: "rgba(187,247,208,0.98)",
      icon: "⚡",
    };
  }

  if (hs === "hiring_selectively") {
    return {
      text: "Hiring selectively",
      title: "This company is hiring selectively",
      border: "1px solid rgba(250,204,21,0.9)",
      background: "rgba(234,179,8,0.14)",
      color: "rgba(254,249,195,0.95)",
      icon: "✨",
    };
  }

  // not_hiring or empty => no badge
  return null;
}, [org]);

  // === LOAD FOLLOWERS FOR THIS ORG ===
  useEffect(() => {
    const loadFollowers = async () => {
      if (!org) {
        setFollowers([]);
        setFollowersCount(null);
        setFollowersError(null);
        setLoadingFollowers(false);
        setIsFollowing(false);
        return;
      }

      setLoadingFollowers(true);
      setFollowersError(null);

      try {
        const { data: followRows, error: followErr } = await supabase
          .from("org_follows")
          .select("user_id")
          .eq("org_id", org.id);

        if (followErr) {
          console.error("Error loading org followers", followErr);
          setFollowers([]);
          setFollowersCount(0);
          setFollowersError("Could not load followers.");
          setIsFollowing(false);
          return;
        }

        const userIds = (followRows || []).map((r: any) => r.user_id);
        setFollowersCount(userIds.length);

        // derive following state without extra roundtrip
        if (user) setIsFollowing(userIds.includes(user.id));
        else setIsFollowing(false);

        if (userIds.length === 0) {
          setFollowers([]);
          return;
        }

        const { data: profileRows, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, highest_education, affiliation, country, city"
          )
          .in("id", userIds);

        if (profErr) {
          console.error("Error loading follower profiles", profErr);
          setFollowersError("Could not load follower profiles.");
          setFollowers([]);
          return;
        }

        setFollowers((profileRows || []) as FollowerProfile[]);
      } catch (e) {
        console.error("Unexpected error loading followers", e);
        setFollowersError("Could not load followers.");
        setFollowers([]);
        setFollowersCount(0);
        setIsFollowing(false);
      } finally {
        setLoadingFollowers(false);
      }
    };

    loadFollowers();
  }, [org, user]);

  // === LOAD MEMBERSHIP FOR CURRENT USER ===
  useEffect(() => {
    const loadMembership = async () => {
      if (!user || !org) {
        setMemberRole(null);
        setIsAffiliated(false);
        return;
      }
          // ✅ CREATOR FALLBACK: if you're the org creator, you're always affiliated/owner
    if (org.created_by === user.id) {
      setMemberRole("owner");
      setIsAffiliated(true);
      return;
    }

      const { data, error } = await supabase
        .from("org_members")
        .select("role, is_affiliated")
        .eq("org_id", org.id)
        .eq("user_id", user.id)
        .maybeSingle<OrgMemberRow>();

      if (error) {
        console.error("Error loading org membership", error);
        setMemberRole(null);
        setIsAffiliated(false);
        return;
      }

      if (data) {
        setMemberRole(data.role);
        setIsAffiliated(!!data.is_affiliated);
      } else {
        setMemberRole(null);
        setIsAffiliated(false);
      }
    };

    loadMembership();
  }, [user, org]);

  // === PERMISSIONS ===
  const { canEditOrg, canManageMembers, canRemoveOthers } = useMemo(() => {
    if (!user || !org) {
      return {
        canEditOrg: false,
        canManageMembers: false,
        canRemoveOthers: false,
      };
    }

    const isCreator = org.created_by === user.id;
    const isOwnerLike = memberRole === "owner" || memberRole === "co_owner";
    const isAdmin = memberRole === "admin";

    // Org-page editing: only owner / co-owner / creator (fallback)
    const canEditOrgPage = isOwnerLike || isCreator;

    // Team management: owner / co-owner / admin / creator (fallback)
    const canManage = isOwnerLike || isAdmin || isCreator;

    // Removing others: owner / co-owner / admin / creator (fallback)
    const canRemove =
      memberRole === "owner" ||
      memberRole === "co_owner" ||
      memberRole === "admin" ||
      isCreator;

    return {
      canEditOrg: canEditOrgPage,
      canManageMembers: canManage,
      canRemoveOthers: canRemove,
    };
  }, [user, org, memberRole]);

  // Who is allowed to post as the org:
  // - creator
  // - owner / co-owner / admin (from org_members)
  const canPostAsOrg =
    !!user &&
    !!org &&
    (org.created_by === user.id ||
      memberRole === "owner" ||
      memberRole === "co_owner" ||
      memberRole === "admin");

  // === LOAD FULL TEAM / MEMBERS LIST ===
  useEffect(() => {
    const loadMembers = async () => {
      if (!org) {
        setMembers([]);
        setMembersError(null);
        setMembersLoading(false);
        return;
      }

      setMembersLoading(true);
      setMembersError(null);

      try {
        const { data: memberRows, error: membersErr } = await supabase
          .from("org_members")
          .select("user_id, role, is_affiliated")
          .eq("org_id", org.id);

        if (membersErr) {
          console.error("Error loading org members", membersErr);
          setMembers([]);
          setMembersError("Could not load team members.");
          return;
        }

        let rows = (memberRows || []) as OrgMemberRow[];

        // Ensure creator is always present as Owner
        if (org.created_by) {
          const hasCreator = rows.some((r) => r.user_id === org.created_by);
          if (!hasCreator) {
            rows = [
              ...rows,
              {
                user_id: org.created_by,
                role: "owner",
                is_affiliated: true,
              },
            ];
          }
        }

        if (rows.length === 0) {
          setMembers([]);
          return;
        }

        const userIds = rows.map((m) => m.user_id);

        const { data: profileRows, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, highest_education, affiliation, country, city"
          )
          .in("id", userIds);

        if (profErr) {
          console.error("Error loading member profiles", profErr);
          setMembersError("Could not load member profiles.");
          setMembers([]);
          return;
        }

        const profileMap = new Map(
          (profileRows || []).map((p: any) => [p.id, p as FollowerProfile])
        );

        const merged: OrgMemberWithProfile[] = rows.map((m) => ({
          user_id: m.user_id,
          role: m.role,
          is_affiliated: !!m.is_affiliated,
          profile: profileMap.get(m.user_id) || null,
        }));

        // sort: owner → co-owner → admin → member, then name
        merged.sort((a, b) => {
          const order: Record<OrgMemberRole, number> = {
            owner: 0,
            co_owner: 1,
            admin: 2,
            member: 3,
          };
          const da = order[a.role] - order[b.role];
          if (da !== 0) return da;

          const nameA = a.profile?.full_name || "";
          const nameB = b.profile?.full_name || "";
          return nameA.localeCompare(nameB);
        });

        setMembers(merged);
      } catch (err) {
        console.error("Unexpected error loading org members", err);
        setMembers([]);
        setMembersError("Could not load team members.");
      } finally {
        setMembersLoading(false);
      }
    };

    loadMembers();
  }, [org]);

  const handleFollowClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!org) return;

    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    if (followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("org_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("org_id", org.id);

        if (error) {
          console.error("Error unfollowing organization", error);
        } else {
          setIsFollowing(false);
          setFollowersCount((prev) => (prev === null ? prev : Math.max(prev - 1, 0)));
        }
      } else {
        const { error } = await supabase.from("org_follows").insert({
          user_id: user.id,
          org_id: org.id,
        });

        if (error) {
          console.error("Error following organization", error);
        } else {
          setIsFollowing(true);
          setFollowersCount((prev) => (prev === null ? 1 : prev + 1));
        }
      }
    } catch (err) {
      console.error("Unexpected follow/unfollow error", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const goToProfile = (profileId: string) => {
    router.push(`/profile/${profileId}`);
  };

  const roleLabel = (role: OrgMemberRole) => {
    if (role === "owner") return "Owner";
    if (role === "co_owner") return "Co-owner";
    if (role === "admin") return "Admin";
    return "Member";
  };

  // === INVITE / ADD MEMBER – ONLY FROM FOLLOWERS, LIVE SEARCH ===

  const handleSearchProfiles = (e: React.FormEvent) => {
    e.preventDefault();
  };

  useEffect(() => {
    if (!showAddMember) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const lower = searchTerm.trim().toLowerCase();

    // filter only among followers
    const filtered = followers.filter((f) => (f.full_name || "").toLowerCase().includes(lower));

    setSearchResults(filtered.slice(0, 20));
    setSearchError(null);
  }, [searchTerm, followers, showAddMember]);

  const handleAddMember = async (profileId: string) => {
    if (!org || !canManageMembers) return;

    setSavingMemberId(profileId);
    try {
      const { error } = await supabase
        .from("org_members")
        .upsert(
          {
            org_id: org.id,
            user_id: profileId,
            role: selectedRole,
            is_affiliated: selectedAffiliated,
          },
          { onConflict: "org_id,user_id" }
        );

      if (error) {
        console.error("Error adding org member", error);
        return;
      }

      const profile =
        (searchResults.find((p) => p.id === profileId) as FollowerProfile) || null;

      setMembers((prev) => {
        const existingIndex = prev.findIndex((m) => m.user_id === profileId);
        const updatedEntry: OrgMemberWithProfile = {
          user_id: profileId,
          role: selectedRole,
          is_affiliated: selectedAffiliated,
          profile: profile,
        };

        if (existingIndex >= 0) {
          const copy = [...prev];
          copy[existingIndex] = updatedEntry;
          return copy;
        }
        return [...prev, updatedEntry];
      });

      if (user && user.id === profileId) {
        setMemberRole(selectedRole);
        setIsAffiliated(selectedAffiliated);
      }
    } catch (err) {
      console.error("Unexpected error adding org member", err);
    } finally {
      setSavingMemberId(null);
    }
  };

  // === SELF AFFILIATION TOGGLE ===
  const handleToggleSelfAffiliation = (
    member: OrgMemberWithProfile,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!org || !user) return;
    if (member.user_id !== user.id) return;

    const update = async () => {
      const newValue = !member.is_affiliated;
      setSelfAffLoadingId(member.user_id);

      try {
        const { error } = await supabase
  .from("org_members")
  .upsert(
    {
      org_id: org.id,
      user_id: user.id,
      role: memberRole ?? "member",
      is_affiliated: newValue,
    },
    { onConflict: "org_id,user_id" }
  );

        if (error) {
          console.error("Error updating self affiliation", error);
          return;
        }

        setMembers((prev) =>
          prev.map((m) => (m.user_id === member.user_id ? { ...m, is_affiliated: newValue } : m))
        );

        setIsAffiliated(newValue);
      } catch (err) {
        console.error("Unexpected error updating self affiliation", err);
      } finally {
        setSelfAffLoadingId(null);
      }
    };

    void update();
  };

  // === OWNER / CO-OWNER / ADMIN: CHANGE ROLE (team management) ===
  const handleChangeMemberRole = async (
    memberUserId: string,
    newRole: OrgMemberRole,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!org || !canManageMembers) return;

    setMemberActionLoadingId(memberUserId);
    try {
      const { error } = await supabase
        .from("org_members")
        .update({ role: newRole })
        .eq("org_id", org.id)
        .eq("user_id", memberUserId);

      if (error) {
        console.error("Error changing member role", error);
        return;
      }

      setMembers((prev) => prev.map((m) => (m.user_id === memberUserId ? { ...m, role: newRole } : m)));

      if (user && user.id === memberUserId) {
        setMemberRole(newRole);
      }

      setMemberMenuOpenId(null);
      setMenuPosition(null);
    } catch (err) {
      console.error("Unexpected error changing member role", err);
    } finally {
      setMemberActionLoadingId(null);
    }
  };

  // === OWNER / CO-OWNER / ADMIN: REMOVE MEMBER ===
  const handleRemoveMember = async (memberUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!org || !canRemoveOthers) return;

    setMemberActionLoadingId(memberUserId);
    try {
      const { error } = await supabase
        .from("org_members")
        .delete()
        .eq("org_id", org.id)
        .eq("user_id", memberUserId);

      if (error) {
        console.error("Error removing member from org", error);
        return;
      }

      setMembers((prev) => prev.filter((m) => m.user_id !== memberUserId));

      if (user && user.id === memberUserId) {
        setMemberRole(null);
        setIsAffiliated(false);
      }

      setMemberMenuOpenId(null);
      setMenuPosition(null);
    } catch (err) {
      console.error("Unexpected error removing member", err);
    } finally {
      setMemberActionLoadingId(null);
    }
  };

  const openMember = useMemo(
    () => members.find((m) => m.user_id === memberMenuOpenId) || null,
    [members, memberMenuOpenId]
  );

  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

  // Team scroll helper
  const scrollTeamByCard = (dir: -1 | 1) => {
    const el = teamScrollerRef.current;
    if (!el) return;
    const amount = Math.max(260, Math.floor(el.clientWidth * 0.9));
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  // === RENDER ===
  return (
    <section className="section" style={{ paddingTop: 24, paddingBottom: 48 }}>
      {loading ? (
        <div style={{ fontSize: 14, color: "rgba(209,213,219,0.9)" }}>Loading organization…</div>
      ) : notFound || !org ? (
        <div style={{ fontSize: 14, color: "rgba(209,213,219,0.9)" }}>
          Organization not found or no longer active.
        </div>
      ) : (
        <>
          {/* ✅ removed "Back to organizations" link */}

          {/* Header */}
          <section
            style={{
              borderRadius: 24,
              padding: 24,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,1))",
              boxShadow: "0 22px 50px rgba(15,23,42,0.75)",
              marginBottom: 24,
              display: "flex",
              gap: 20,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                overflow: "hidden",
                flexShrink: 0,
                border: "1px solid rgba(148,163,184,0.45)",
                background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: 30,
              }}
            >
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                firstLetter
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 6,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h1
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      margin: 0,
                      marginBottom: 6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {org.name}
                  </h1>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 12,
                        borderRadius: 999,
                        padding: "3px 9px",
                        border: "1px solid rgba(148,163,184,0.7)",
                        color: "rgba(226,232,240,0.95)",
                      }}
                    >
                      {kindLabel}
                    </span>

                    {org.size_label && (
                      <span
                        style={{
                          fontSize: 12,
                          borderRadius: 999,
                          padding: "3px 9px",
                          border: "1px solid rgba(148,163,184,0.5)",
                          color: "rgba(226,232,240,0.9)",
                        }}
                      >
                        {org.size_label}
                      </span>
                    )}

                    {followersCount !== null && (
                      <span
                        style={{
                          fontSize: 12,
                          borderRadius: 999,
                          padding: "3px 9px",
                          border: "1px solid rgba(148,163,184,0.5)",
                          color: "rgba(226,232,240,0.9)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Followers: {followersCount}
                      </span>
                    )}

                    {isAffiliated && (
                      <span
                        style={{
                          fontSize: 12,
                          borderRadius: 999,
                          padding: "3px 9px",
                          border: "1px solid rgba(34,197,94,0.7)",
                          color: "rgba(187,247,208,0.95)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        You&apos;re affiliated
                      </span>
                    )}

                    {/* ✅ Hiring badge */}
{hiringBadge && (
  <span
    title={hiringBadge.title}
    style={{
      fontSize: 12,
      borderRadius: 999,
      padding: "3px 10px",
      border: hiringBadge.border,
      background: hiringBadge.background,
      color: hiringBadge.color,
      fontWeight: 800,
      whiteSpace: "nowrap",
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
    }}
  >
    <span style={{ fontSize: 12, lineHeight: 1 }}>{hiringBadge.icon}</span>
    {hiringBadge.text}
  </span>
)}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "row", gap: 8, flexShrink: 0 }}>
                  {canEditOrg ? (
                    <Link
                      href={editHref}
                      style={{
                        padding: "9px 16px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 500,
                        textDecoration: "none",
                        background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Edit organization
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFollowClick}
                      disabled={followLoading}
                      style={{
                        padding: "9px 16px",
                        borderRadius: 999,
                        fontSize: 13,
                        border: isFollowing
                          ? "1px solid rgba(148,163,184,0.7)"
                          : "1px solid rgba(59,130,246,0.6)",
                        background: isFollowing ? "transparent" : "rgba(59,130,246,0.16)",
                        color: isFollowing ? "rgba(148,163,184,0.95)" : "#bfdbfe",
                        cursor: followLoading ? "default" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              </div>

              {metaLine && (
                <div style={{ fontSize: 13, color: "rgba(148,163,184,0.95)", marginBottom: 6 }}>
                  {metaLine}
                </div>
              )}

              {org.tagline && (
                <div style={{ fontSize: 14, color: "rgba(209,213,219,0.95)" }}>
                  {org.tagline}
                </div>
              )}

              {org.website && (
                <div style={{ marginTop: 10, fontSize: 13 }}>
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#7dd3fc", textDecoration: "none" }}
                  >
                    {org.website.replace(/^https?:\/\//, "")} ↗
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Body */}
          <section>
            {org.description ? (
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "rgba(226,232,240,0.95)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {org.description}
              </div>
            ) : (
              <div style={{ fontSize: 14, color: "rgba(156,163,175,0.95)" }}>
                No detailed description added yet.
              </div>
            )}

            {org.focus_areas && (
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: 0.08,
                    color: "rgba(148,163,184,0.9)",
                    marginBottom: 6,
                  }}
                >
                  Focus areas
                </div>
                <div style={{ fontSize: 14, color: "rgba(226,232,240,0.95)" }}>
                  {org.focus_areas}
                </div>
              </div>
            )}

            {/* Team / Members */}
            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: 0.08,
                    color: "rgba(148,163,184,0.9)",
                  }}
                >
                  Team &amp; members
                </div>

                {canManageMembers && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddMember((prev) => !prev);
                      setSearchTerm("");
                      setSearchResults([]);
                      setSearchError(null);
                    }}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 12,
                      border: "1px solid rgba(148,163,184,0.6)",
                      background: showAddMember ? "rgba(15,23,42,0.9)" : "rgba(15,23,42,0.6)",
                      color: "rgba(226,232,240,0.95)",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        width: 14,
                        height: 14,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(148,163,184,0.8)",
                        fontSize: 10,
                      }}
                    >
                      {showAddMember ? "−" : "+"}
                    </span>
                    {showAddMember ? "Close" : "Add member"}
                  </button>
                )}
              </div>

              {showAddMember && canManageMembers && (
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.4)",
                    padding: 12,
                    marginBottom: 12,
                    background: "rgba(15,23,42,0.85)",
                  }}
                >
                  <form
                    onSubmit={handleSearchProfiles}
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search followers by name…"
                      style={{
                        flex: "1 1 220px",
                        minWidth: 0,
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(51,65,85,0.9)",
                        background: "rgba(15,23,42,0.95)",
                        color: "#e5e7eb",
                        fontSize: 13,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm("");
                        setSearchResults([]);
                        setSearchError(null);
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.6)",
                        background: "transparent",
                        color: "rgba(148,163,184,0.95)",
                        fontSize: 12,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Clear
                    </button>
                  </form>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 12,
                      alignItems: "center",
                      marginBottom: 10,
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: "rgba(209,213,219,0.95)",
                      }}
                    >
                      Member role:
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as OrgMemberRole)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 999,
                          border: "1px solid rgba(148,163,184,0.7)",
                          background: "rgba(15,23,42,0.9)",
                          color: "#e5e7eb",
                          fontSize: 12,
                          outline: "none",
                        }}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                        <option value="co_owner">Co-owner</option>
                      </select>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 12,
                        color: "rgba(209,213,219,0.95)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAffiliated}
                        onChange={(e) => setSelectedAffiliated(e.target.checked)}
                        style={{ margin: 0 }}
                      />
                      Mark as affiliated
                    </label>
                  </div>

                  {searchError && (
                    <div style={{ fontSize: 12, color: "#f97373", marginBottom: 8 }}>
                      {searchError}
                    </div>
                  )}

                  {searchResults.length > 0 ? (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                        gap: 10,
                        maxHeight: 260,
                        overflowY: "auto",
                        paddingRight: 4,
                      }}
                    >
                      {searchResults.map((p) => {
                        const name = p.full_name || "Quantum5ocial member";
                        const initials = name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();

                        const location = [p.city, p.country].filter(Boolean).join(", ");
                        const subtitle =
                          [p.role, p.affiliation, location].filter(Boolean).join(" · ") ||
                          "Quantum5ocial member";

                        const alreadyMember = members.some((m) => m.user_id === p.id);
                        const isMe = user && user.id === p.id;

                        return (
                          <div
                            key={p.id}
                            className="card"
                            style={{
                              borderRadius: 14,
                              padding: 10,
                              display: "flex",
                              flexDirection: "column",
                              gap: 8,
                              background: "rgba(2,6,23,0.7)",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 999,
                                  overflow: "hidden",
                                  flexShrink: 0,
                                  background: "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  border: "1px solid rgba(148,163,184,0.6)",
                                  color: "#e5e7eb",
                                  fontWeight: 700,
                                  fontSize: 12,
                                }}
                              >
                                {p.avatar_url ? (
                                  <img
                                    src={p.avatar_url}
                                    alt={name}
                                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                  />
                                ) : (
                                  initials
                                )}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "rgba(226,232,240,0.98)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {name}
                                  {isMe && (
                                    <span style={{ marginLeft: 6, fontSize: 11, color: "rgba(148,163,184,0.95)" }}>
                                      (you)
                                    </span>
                                  )}
                                </div>
                                <div
                                  style={{
                                    marginTop: 2,
                                    fontSize: 11,
                                    color: "rgba(148,163,184,0.95)",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {subtitle}
                                </div>
                              </div>
                            </div>

                            <div
                              style={{
                                marginTop: 4,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.9)" }}>
                                {alreadyMember ? "Already in team" : "Add to team"}
                              </div>
                              <button
                                type="button"
                                disabled={alreadyMember || savingMemberId === p.id}
                                onClick={() => handleAddMember(p.id)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: 999,
                                  border: alreadyMember
                                    ? "1px solid rgba(148,163,184,0.6)"
                                    : "1px solid rgba(34,197,94,0.7)",
                                  background: alreadyMember ? "transparent" : "rgba(22,163,74,0.18)",
                                  color: alreadyMember ? "rgba(148,163,184,0.9)" : "rgba(187,247,208,0.96)",
                                  fontSize: 11,
                                  cursor: alreadyMember || savingMemberId === p.id ? "default" : "pointer",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {alreadyMember ? "In team" : savingMemberId === p.id ? "Adding…" : "Add"}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    searchTerm.trim() &&
                    !searchError && (
                      <div style={{ fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
                        No matching followers found. Only followers can be added to the team.
                      </div>
                    )
                  )}

                  {!searchTerm.trim() && followers.length === 0 && (
                    <div style={{ fontSize: 12, color: "rgba(148,163,184,0.85)", marginTop: 6 }}>
                      This organization has no followers yet. Once people follow, you can add them here as team members.
                    </div>
                  )}
                </div>
              )}

              {membersLoading && <p className="profile-muted">Loading team members…</p>}

              {membersError && !membersLoading && (
                <p className="profile-muted" style={{ color: "#f97373", marginTop: 4 }}>
                  {membersError}
                </p>
              )}

              {!membersLoading && !membersError && members.length === 0 && (
                <div className="products-empty">No team members added yet.</div>
              )}

              {/* ✅ Team scroller (same vibe as posts strip) */}
              {!membersLoading && !membersError && members.length > 0 && (
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
                  {/* edge fades */}
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

                  {/* arrows */}
                  <button
                    type="button"
                    onClick={() => scrollTeamByCard(-1)}
                    style={{
                      position: "absolute",
                      top: "50%",
                      transform: "translateY(-50%)",
                      left: 10,
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
                    }}
                    aria-label="Scroll left"
                    title="Scroll left"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    onClick={() => scrollTeamByCard(1)}
                    style={{
                      position: "absolute",
                      top: "50%",
                      transform: "translateY(-50%)",
                      right: 10,
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
                    }}
                    aria-label="Scroll right"
                    title="Scroll right"
                  >
                    ›
                  </button>

                  <div
                    ref={teamScrollerRef}
                    style={{
                      display: "flex",
                      gap: 12,
                      overflowX: "auto",
                      padding: "4px 44px 10px 44px",
                      scrollSnapType: "x mandatory",
                      WebkitOverflowScrolling: "touch",
                    }}
                  >
                    {members.map((m) => {
                      const profile = m.profile;
                      const name = profile?.full_name || "Quantum5ocial member";
                      const initials = name
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();

                      const location = [profile?.city, profile?.country].filter(Boolean).join(", ");
                      const subtitle =
                        [profile?.role, profile?.affiliation, location].filter(Boolean).join(" · ") ||
                        "Quantum5ocial member";

                      const isCurrentUser = user && profile && profile.id === user.id;
                      const isRealOwner = org && m.user_id === org.created_by && m.role === "owner";

                      return (
                        <div
                          key={m.user_id}
                          style={{
                            scrollSnapAlign: "start",
                            flex: "0 0 auto",
                            width: "clamp(260px, calc((100% - 24px) / 3), 420px)",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => profile && goToProfile(profile.id)}
                            className="card"
                            style={{
                              width: "100%",
                              textAlign: "left",
                              padding: 12,
                              borderRadius: 14,
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                              cursor: profile ? "pointer" : "default",
                              background: "rgba(2,6,23,0.35)",
                              position: "relative",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    width: 38,
                                    height: 38,
                                    borderRadius: 999,
                                    overflow: "hidden",
                                    flexShrink: 0,
                                    background: "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    border: "1px solid rgba(148,163,184,0.6)",
                                    color: "#e5e7eb",
                                    fontWeight: 700,
                                    fontSize: 13,
                                  }}
                                >
                                  {profile?.avatar_url ? (
                                    <img
                                      src={profile.avatar_url}
                                      alt={name}
                                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                    />
                                  ) : (
                                    initials
                                  )}
                                </div>

                                <div style={{ minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontSize: 13,
                                      fontWeight: 600,
                                      color: "rgba(226,232,240,0.98)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {name}
                                    {isCurrentUser && (
                                      <span style={{ marginLeft: 6, fontSize: 11, color: "rgba(148,163,184,0.95)" }}>
                                        (you)
                                      </span>
                                    )}
                                  </div>
                                  <div
                                    style={{
                                      marginTop: 2,
                                      fontSize: 11,
                                      color: "rgba(148,163,184,0.95)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {subtitle}
                                  </div>
                                </div>
                              </div>

                              {canManageMembers && !isRealOwner && (
                                <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isBrowser) return;

                                      if (memberMenuOpenId === m.user_id) {
                                        setMemberMenuOpenId(null);
                                        setMenuPosition(null);
                                        return;
                                      }

                                      const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                      const scrollX = window.scrollX ?? window.pageXOffset ?? 0;
                                      const scrollY = window.scrollY ?? window.pageYOffset ?? 0;

                                      const dropdownWidth = 190;
                                      const top = rect.bottom + scrollY + 6;
                                      const left = rect.right + scrollX - dropdownWidth;

                                      setMemberMenuOpenId(m.user_id);
                                      setMenuPosition({ top, left });
                                    }}
                                    style={{
                                      width: 24,
                                      height: 24,
                                      borderRadius: 999,
                                      border: "1px solid rgba(71,85,105,0.9)",
                                      background: "rgba(15,23,42,0.95)",
                                      color: "rgba(148,163,184,0.95)",
                                      fontSize: 14,
                                      lineHeight: 1,
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      cursor: "pointer",
                                      padding: 0,
                                    }}
                                  >
                                    ⋯
                                  </button>
                                </div>
                              )}
                            </div>

                            <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  borderRadius: 999,
                                  padding: "2px 7px",
                                  border: "1px solid rgba(129,140,248,0.8)",
                                  color: "rgba(191,219,254,0.95)",
                                }}
                              >
                                {roleLabel(m.role)}
                              </span>

                              {m.is_affiliated && (
                                <span
                                  style={{
                                    fontSize: 11,
                                    borderRadius: 999,
                                    padding: "2px 7px",
                                    border: "1px solid rgba(34,197,94,0.7)",
                                    color: "rgba(187,247,208,0.95)",
                                  }}
                                >
                                  Affiliated
                                </span>
                              )}
                            </div>

                            {isCurrentUser && (
                              <div
                                style={{
                                  marginTop: 6,
                                  paddingTop: 6,
                                  borderTop: "1px dashed rgba(51,65,85,0.9)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 8,
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div style={{ fontSize: 11, color: "rgba(148,163,184,0.95)" }}>
                                  Affiliated with this organization
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => handleToggleSelfAffiliation(m, e)}
                                  disabled={selfAffLoadingId === m.user_id}
                                  style={{
                                    fontSize: 11,
                                    borderRadius: 999,
                                    padding: "2px 8px",
                                    border: m.is_affiliated
                                      ? "1px solid rgba(34,197,94,0.8)"
                                      : "1px solid rgba(148,163,184,0.7)",
                                    background: m.is_affiliated ? "rgba(22,163,74,0.2)" : "transparent",
                                    color: m.is_affiliated
                                      ? "rgba(187,247,208,0.96)"
                                      : "rgba(226,232,240,0.9)",
                                    cursor: selfAffLoadingId === m.user_id ? "default" : "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {selfAffLoadingId === m.user_id
                                    ? "Updating…"
                                    : m.is_affiliated
                                    ? "Set as not affiliated"
                                    : "Set as affiliated"}
                                </button>
                              </div>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ✅ ORG COMPOSER: after Team & before Posts */}
            <div style={{ marginTop: 24, marginBottom: 4 }}>
              <OrgComposerStrip org={org} canPostAsOrg={canPostAsOrg} />
            </div>

            <div style={{ marginTop: 18 }}>
              <div
                className="card"
                style={{
                  padding: 16,
                  marginBottom: 12,
                  background:
                    "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.16), rgba(15,23,42,0.98))",
                  border: "1px solid rgba(148,163,184,0.35)",
                  boxShadow: "0 18px 45px rgba(15,23,42,0.75)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      Posts
                    </div>
                    <div className="section-sub" style={{ maxWidth: 620 }}>
                      Public posts from this organization. Click a card to open it expanded.
                    </div>
                  </div>
                </div>
              </div>

              <OrgPostsStrip orgId={org.id} orgName={org.name} logoUrl={org.logo_url} initials={orgInitials} />
            </div>

            {/* Followers (✅ collapsible) */}
            <div style={{ marginTop: 24 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: 0.08,
                    color: "rgba(148,163,184,0.9)",
                  }}
                >
                  Followers
                </div>

                <button
                  type="button"
                  onClick={() => setFollowersExpanded((v) => !v)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    border: "1px solid rgba(148,163,184,0.6)",
                    background: followersExpanded ? "rgba(15,23,42,0.9)" : "rgba(15,23,42,0.6)",
                    color: "rgba(226,232,240,0.95)",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    whiteSpace: "nowrap",
                  }}
                >
                  {followersExpanded ? "Collapse" : "Expand"}
                  <span style={{ opacity: 0.85 }}>{followersExpanded ? "▴" : "▾"}</span>
                </button>
              </div>

              {loadingFollowers && <p className="profile-muted">Loading followers…</p>}

              {followersError && !loadingFollowers && (
                <p className="profile-muted" style={{ color: "#f97373", marginTop: 4 }}>
                  {followersError}
                </p>
              )}

              {!loadingFollowers && !followersError && followersCount === 0 && (
                <div className="products-empty">
                  No followers yet. Once people follow this organization, they will appear here.
                </div>
              )}

              {/* Collapsed hint */}
              {!loadingFollowers && !followersError && followers.length > 0 && !followersExpanded && (
                <div style={{ fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
                  {followersCount !== null ? `${followersCount} follower${followersCount === 1 ? "" : "s"}.` : "Followers."}{" "}
                  Click <span style={{ color: "#7dd3fc" }}>Expand</span> to view.
                </div>
              )}

              {/* Expanded list */}
              {!loadingFollowers && !followersError && followersExpanded && followers.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 12,
                    marginTop: 6,
                  }}
                >
                  {followers.map((f) => {
                    const name = f.full_name || "Quantum5ocial member";
                    const initials = name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    const location = [f.city, f.country].filter(Boolean).join(", ");
                    const subtitle =
                      [f.role, f.affiliation, location].filter(Boolean).join(" · ") ||
                      "Quantum5ocial member";

                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => goToProfile(f.id)}
                        className="card"
                        style={{
                          textAlign: "left",
                          padding: 12,
                          borderRadius: 14,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          cursor: "pointer",
                          background: "rgba(2,6,23,0.35)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 999,
                              overflow: "hidden",
                              flexShrink: 0,
                              background: "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid rgba(148,163,184,0.6)",
                              color: "#e5e7eb",
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            {f.avatar_url ? (
                              <img
                                src={f.avatar_url}
                                alt={name}
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              />
                            ) : (
                              initials
                            )}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "rgba(226,232,240,0.98)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {name}
                            </div>
                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 11,
                                color: "rgba(148,163,184,0.95)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {subtitle}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: "auto",
                            fontSize: 12,
                            color: "#7dd3fc",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          View profile <span style={{ opacity: 0.9 }}>›</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}

      {/* Global floating member dropdown via portal */}
      {isBrowser &&
        canManageMembers &&
        memberMenuOpenId &&
        openMember &&
        menuPosition &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 9999,
              borderRadius: 10,
              border: "1px solid rgba(30,64,175,0.9)",
              background: "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,1))",
              boxShadow: "0 18px 40px rgba(15,23,42,0.9)",
              minWidth: 190,
              padding: 4,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "4px 8px",
                fontSize: 11,
                color: "rgba(148,163,184,0.95)",
                borderBottom: "1px solid rgba(30,64,175,0.6)",
                marginBottom: 4,
              }}
            >
              Manage member
            </div>

            {(["co_owner", "admin", "member"] as OrgMemberRole[]).map((roleOption) => (
              <button
                key={roleOption}
                type="button"
                disabled={memberActionLoadingId === openMember.user_id}
                onClick={(e) => handleChangeMemberRole(openMember.user_id, roleOption, e)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: "none",
                  background: roleOption === openMember.role ? "rgba(37,99,235,0.2)" : "transparent",
                  color: roleOption === openMember.role ? "#bfdbfe" : "rgba(226,232,240,0.95)",
                  fontSize: 12,
                  cursor: memberActionLoadingId === openMember.user_id ? "default" : "pointer",
                }}
              >
                {roleOption === "co_owner"
                  ? "Make co-owner"
                  : roleOption === "admin"
                  ? "Make admin"
                  : "Make member"}
              </button>
            ))}

            {shouldShowRemoveMember(openMember, canRemoveOthers) && (
              <div
                style={{
                  borderTop: "1px solid rgba(30,64,175,0.6)",
                  marginTop: 4,
                  paddingTop: 4,
                }}
              >
                <button
                  type="button"
                  disabled={memberActionLoadingId === openMember.user_id}
                  onClick={(e) => handleRemoveMember(openMember.user_id, e)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "6px 8px",
                    borderRadius: 6,
                    border: "none",
                    background: "transparent",
                    color: "#fecaca",
                    fontSize: 12,
                    cursor: memberActionLoadingId === openMember.user_id ? "default" : "pointer",
                  }}
                >
                  {memberActionLoadingId === openMember.user_id ? "Removing…" : "Remove from team"}
                </button>
              </div>
            )}
          </div>,
          document.body
        )}
    </section>
  );
};

// Small helper for portal remove visibility
function shouldShowRemoveMember(openMember: OrgMemberWithProfile, canRemoveOthers: boolean) {
  // extra safety guard
  if (!openMember) return false;
  return canRemoveOthers && openMember.role !== "owner";
}

// AppLayout: left-only global sidebar, no right sidebar
(OrganizationDetailPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};

export default OrganizationDetailPage;
