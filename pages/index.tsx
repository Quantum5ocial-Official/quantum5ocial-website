// pages/index.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

// ✅ homepage keeps header + loading/error/empty,
// and ONLY the feed cards list is extracted into a reusable component.
import FeedCards from "../components/feed/FeedCards";

const POSTS_BUCKET = "post-images"; // ✅ must exist in Supabase Storage

type Job = {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
};

type Product = {
  id: string;
  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;
  price_type: "fixed" | "contact" | null;
  price_value: string | null;
  in_stock: boolean | null;
  image1_url: string | null;
};

type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  role?: string | null;
  affiliation?: string | null;
  short_bio?: string | null;
};

type MyProfileMini = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

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
  video_url: string | null; // ✅ new
  org_id: string | null; // 👈 post can belong to an org
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
  org?: FeedOrg | null; // 👈 matches FeedCards
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

/* =========================
   MOBILE RIGHT DRAWER (for HomeRightSidebar) — MOBILE ONLY
   ========================= */

function RightDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;
  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(2,6,23,0.62)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(420px, 92vw)",
          height: "100%",
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.985))",
          borderLeft: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "-24px 0 80px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "14px 14px",
            borderBottom: "1px solid rgba(148,163,184,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 14,
              color: "rgba(226,232,240,0.92)",
            }}
          >
            {title || "Panel"}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(2,6,23,0.22)",
              color: "rgba(226,232,240,0.92)",
              cursor: "pointer",
              fontWeight: 900,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 12, overflowY: "auto" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

/** ✅ One mobile hook (used everywhere on this page) */
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

export default function Home() {
  const isMobile = useIsMobile(820);
  const [rightOpen, setRightOpen] = useState(false);

  return (
    <>
      {/* ✅ Mobile-only floating right-edge tab to open drawer. */}
      {isMobile && (
        <button
          type="button"
          aria-label={
            rightOpen ? "Close explore drawer" : "Open explore drawer"
          }
          onClick={() => setRightOpen((v) => !v)}
          style={{
            position: "fixed",
            right: 0,
            top: "80%",
            transform: "translateY(-50%)",
            zIndex: 60,
            width: 30,
            height: 80,
            border: "1px solid rgba(148,163,184,0.35)",
            borderRight: "none",
            borderTopLeftRadius: 16,
            borderBottomLeftRadius: 16,
            background: "rgba(2,6,23,0.72)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              fontSize: 22,
              lineHeight: 1,
              color: "rgba(226,232,240,0.95)",
              transform: rightOpen ? "rotate(180deg)" : "none",
              transition: "transform 160ms ease",
              userSelect: "none",
            }}
          >
            ❮
          </span>
        </button>
      )}

      {/* POST + ASK PLACEHOLDERS */}
      <section className="section" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <HomeComposerStrip />
      </section>

      {/* ✅ divider after composer */}
      <div
        style={{
          height: 1,
          background: "rgba(148,163,184,0.18)",
          marginTop: -12,
          marginBottom: 10,
        }}
      />

      {/* ✅ GLOBAL FEED */}
      <section className="section" style={{ paddingTop: 0 }}>
        <HomeGlobalFeed />
      </section>

      {/* FOR WHOM */}
      <section className="section">
        <div className="section-header">
          <div>
            <div className="section-title">
              Built for the entire quantum community
            </div>
            <div className="section-sub">Different paths, one shared platform.</div>
          </div>
        </div>

        <div className="who-grid">
          <div className="who-card">
            <div className="who-title-row">
              <span className="who-emoji">👨‍🎓</span>
              <span className="who-title">Students &amp; early-career</span>
            </div>
            <p className="who-text">
              Explore internships, MSc/PhD projects, and your first postdoc or
              industry role. Build your profile as you grow into the field.
            </p>
          </div>

          <div className="who-card">
            <div className="who-title-row">
              <span className="who-emoji">🧑‍🔬</span>
              <span className="who-title">Researchers &amp; labs</span>
            </div>
            <p className="who-text">
              Showcase your group, attract collaborators, and make it easier to
              find the right candidates for your quantum projects.
            </p>
          </div>

          <div className="who-card">
            <div className="who-title-row">
              <span className="who-emoji">🏢</span>
              <span className="who-title">Companies &amp; startups</span>
            </div>
            <p className="who-text">
              Post jobs, list your hero products, and reach a focused audience
              that already cares about quantum technologies.
            </p>
          </div>
        </div>
      </section>

      {/* ✅ MOBILE RIGHT DRAWER ONLY */}
      {isMobile && (
        <RightDrawer
          open={rightOpen}
          onClose={() => setRightOpen(false)}
          title="Explore"
        >
          <HomeRightSidebar />
        </RightDrawer>
      )}
    </>
  );
}

function LinkifyText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);

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
          >
            {part}
          </a>
        );
      })}
    </>
  );
}

/* =========================
   GLOBAL FEED
   ========================= */

function HomeGlobalFeed() {
  const { user, loading: userLoading } = useSupabaseUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<PostVM[]>([]);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>(
    {}
  );
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

  const postRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const postParam = useMemo(() => {
    const raw = router.query?.post;
    if (!raw) return null;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return typeof v === "string" && v.length > 0 ? v : null;
  }, [router.query]);

  const formatRelativeTime = (created_at: string | null) => {
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
  };

  const formatSubtitle = (p?: FeedProfile | null) => {
    const parts = [p?.highest_education, p?.affiliation].filter(Boolean);
    return parts.join(" · ");
  };

  const loadFeed = async (uid: string | null) => {
    setLoading(true);
    setError(null);

    try {
      const { data: postRows, error: postErr } = await supabase
        .from("posts")
        .select("id, user_id, body, created_at, image_url, video_url, org_id")
        .order("created_at", { ascending: false })
        .limit(30);

      if (postErr) throw postErr;

      const posts = (postRows || []) as PostRow[];
      const postIds = posts.map((p) => p.id);
      const userIds = Array.from(new Set(posts.map((p) => p.user_id)));

      // --- load author profiles ---
      const profileMap = new Map<string, FeedProfile>();
      if (userIds.length > 0) {
        const { data: profRows, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, highest_education, affiliation"
          )
          .in("id", userIds);

        if (!profErr && profRows) {
          (profRows as FeedProfile[]).forEach((p) => profileMap.set(p.id, p));
        }
      }

      // --- load orgs for posts that have org_id ---
      const orgIds = Array.from(
        new Set(posts.map((p) => p.org_id).filter(Boolean) as string[])
      );

      const orgMap = new Map<string, FeedOrg>();
      if (orgIds.length > 0) {
        const { data: orgRows, error: orgErr } = await supabase
          .from("organizations")
          .select("id, name, slug, logo_url")
          .in("id", orgIds);

        if (!orgErr && orgRows) {
          (orgRows as FeedOrg[]).forEach((o) => orgMap.set(o.id, o));
        }
      }

      // --- likes ---
      let likeRows: LikeRow[] = [];
      if (postIds.length > 0) {
        const { data: likes, error: likeErr } = await supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds);

        if (!likeErr && likes) likeRows = likes as LikeRow[];
      }

      // --- comments (for counts only) ---
      let commentRows: CommentRow[] = [];
      if (postIds.length > 0) {
        const { data: comments, error: cErr } = await supabase
          .from("post_comments")
          .select("id, post_id, user_id, body, created_at")
          .in("post_id", postIds);

        if (!cErr && comments) commentRows = comments as CommentRow[];
      }

      const likeCountByPost: Record<string, number> = {};
      const likedByMeSet = new Set<string>();
      likeRows.forEach((r) => {
        likeCountByPost[r.post_id] = (likeCountByPost[r.post_id] || 0) + 1;
        if (uid && r.user_id === uid) likedByMeSet.add(r.post_id);
      });

      const commentCountByPost: Record<string, number> = {};
      commentRows.forEach((r) => {
        commentCountByPost[r.post_id] =
          (commentCountByPost[r.post_id] || 0) + 1;
      });

      const vms: PostVM[] = posts.map((p) => ({
        post: p,
        author: profileMap.get(p.user_id) || null,
        org: p.org_id ? orgMap.get(p.org_id) || null : null,
        likeCount: likeCountByPost[p.id] || 0,
        commentCount: commentCountByPost[p.id] || 0,
        likedByMe: likedByMeSet.has(p.id),
      }));

      setItems(vms);
    } catch (e: any) {
      console.error("HomeGlobalFeed load error:", e);
      setError(e?.message || "Could not load feed.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    loadFeed(user?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFeedChanged = () => loadFeed(user?.id ?? null);
    window.addEventListener("q5:feed-changed", onFeedChanged);
    return () => window.removeEventListener("q5:feed-changed", onFeedChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!postParam) return;
    const exists = items.some((x) => x.post.id === postParam);
    if (!exists) return;

    setOpenComments((prev) => ({ ...prev, [postParam]: true }));

    const node = postRefs.current[postParam];
    if (node) node.scrollIntoView({ behavior: "smooth", block: "start" });

    if (!commentsByPost[postParam]) void loadComments(postParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postParam, items]);

  const loadProfilesForUserIds = async (userIds: string[]) => {
    const uniq = Array.from(new Set(userIds)).filter(Boolean);
    const missing = uniq.filter((id) => !commenterProfiles[id]);
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

  const loadComments = async (postId: string) => {
    try {
      const { data: rows, error } = await supabase
        .from("post_comments")
        .select("id, post_id, user_id, body, created_at")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = (rows || []) as CommentRow[];
      setCommentsByPost((prev) => ({ ...prev, [postId]: list }));

      await loadProfilesForUserIds(list.map((c) => c.user_id));
    } catch (e) {
      console.warn("loadComments error", e);
      setCommentsByPost((prev) => ({ ...prev, [postId]: prev[postId] || [] }));
    }
  };

  const toggleLike = async (postId: string) => {
    if (!user) {
      window.location.href = "/auth?redirect=/";
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

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:notifications-changed"));
      }
    } catch (e) {
      console.warn("toggleLike error", e);
      setItems((prev) => prev.map((x) => (x.post.id !== postId ? x : cur)));
    }
  };

  const submitComment = async (postId: string) => {
    if (!user) {
      window.location.href = "/auth?redirect=/";
      return;
    }

    const body = (commentDraft[postId] || "").trim();
    if (!body) return;

    setCommentSaving((p) => ({ ...p, [postId]: true }));

    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({
          post_id: postId,
          user_id: user.id,
          body,
        })
        .select("id, post_id, user_id, body, created_at")
        .maybeSingle();

      if (error) throw error;

      setCommentDraft((p) => ({ ...p, [postId]: "" }));
      setOpenComments((p) => ({ ...p, [postId]: true }));

      setCommentsByPost((prev) => {
        const cur = prev[postId] || [];
        const next = data ? [...cur, data as CommentRow] : cur;
        return { ...prev, [postId]: next };
      });

      await loadProfilesForUserIds([user.id]);

      setItems((prev) =>
        prev.map((x) =>
          x.post.id === postId ? { ...x, commentCount: x.commentCount + 1 } : x
        )
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("q5:notifications-changed"));
      }
    } catch (e) {
      console.warn("submitComment error", e);
    } finally {
      setCommentSaving((p) => ({ ...p, [postId]: false }));
    }
  };

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

  const initialsOf = (name: string | null | undefined) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "Q";

  return (
    <div>
      <div className="section-header" style={{ marginTop: 0 }}>
        <div>
          <div className="section-title">My Q5-feed</div>
        </div>

        <button
          type="button"
          style={pillBtnStyle}
          onClick={() => loadFeed(user?.id ?? null)}
          disabled={loading}
        >
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {loading && <div className="products-status">Loading feed…</div>}

      {error && !loading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="products-empty">
          No posts yet. Be the first to post something for the community.
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <FeedCards
          items={items}
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
        />
      )}
    </div>
  );
}

/* =========================
   POST / ASK (merged, expand modal)
   ========================= */

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
      <span style={{ display: "inline-flex", alignItems: "center" }}>
        {icon}
      </span>
      <span style={{ opacity: 0.95 }}>{label}</span>
    </button>
  );
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

function HomeComposerStrip() {
  const router = useRouter();
  const { user, loading } = useSupabaseUser();
  const [me, setMe] = useState<MyProfileMini | null>(null);

  const [mode, setMode] = useState<"post" | "ask">("post");
  const [open, setOpen] = useState(false);

  const [postText, setPostText] = useState("");
  const [postSaving, setPostSaving] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

// ✅ Image OR video
const [postMediaFile, setPostMediaFile] = useState<File | null>(null);
const [postMediaPreview, setPostMediaPreview] = useState<string | null>(null);

  const [askTitle, setAskTitle] = useState("");
  const [askBody, setAskBody] = useState("");
  const [askType, setAskType] =
    useState<"concept" | "experiment" | "career">("concept");

  const [askSaving, setAskSaving] = useState(false);
  const [askError, setAskError] = useState<string | null>(null);

  const isMobile = useIsMobile(520);

  const MAX_MEDIA_SIZE = 25 * 1024 * 1024; // 25 MB
  const [mediaError, setMediaError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      if (!user) {
        setMe(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle<MyProfileMini>();

      if (cancelled) return;
      if (!error && data) setMe(data);
      else setMe({ id: user.id, full_name: null, avatar_url: null });
    };

    if (!loading) loadMe();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  useEffect(() => {
  return () => {
    if (postMediaPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(postMediaPreview);
    }
  };
}, [postMediaPreview]);
  
  const isAuthed = !!user;
  const displayName = me?.full_name || "Member";
  const firstName =
    (displayName.split(" ")[0] || displayName).trim() || "Member";

  const initials =
    (me?.full_name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "U";

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
        color: "#fff",
        fontWeight: 800,
        letterSpacing: 0.5,
      }}
      aria-label="Your avatar"
      title={displayName}
    >
      {me?.avatar_url ? (
        <img
          src={me.avatar_url}
          alt={displayName}
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
  );

  const shellStyle: CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.18)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.86), rgba(15,23,42,0.94))",
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

  const toggleBtn = (active: boolean): CSSProperties => ({
    padding: isMobile ? "7px 10px" : "7px 11px",
    borderRadius: 999,
    border: "none",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    background: active
      ? "linear-gradient(135deg,#3bc7f3,#8468ff)"
      : "transparent",
    color: active ? "#0f172a" : "rgba(226,232,240,0.85)",
    whiteSpace: "nowrap",
  });

  const modalCard: CSSProperties = {
    width: "min(740px, 100%)",
    borderRadius: isMobile ? "18px 18px 0 0" : 18,
    border: "1px solid rgba(148,163,184,0.22)",
    background:
      "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,23,42,0.98))",
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

  const smallInput: CSSProperties = {
    width: "100%",
    height: 42,
    borderRadius: 12,
    border: "1px solid rgba(148,163,184,0.2)",
    background: "rgba(2,6,23,0.26)",
    color: "rgba(226,232,240,0.94)",
    padding: "0 12px",
    fontSize: 14,
    outline: "none",
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
    background:
      mode === "ask"
        ? "linear-gradient(135deg,#a78bfa,#3bc7f3)"
        : "linear-gradient(135deg,#3bc7f3,#8468ff)",
    color: "#0f172a",
  });

  const typeChip = (active: boolean): CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 10px",
    borderRadius: 999,
    border: active
      ? "1px solid rgba(59,199,243,0.55)"
      : "1px solid rgba(148,163,184,0.18)",
    background: active ? "rgba(59,199,243,0.12)" : "rgba(2,6,23,0.2)",
    color: "rgba(226,232,240,0.92)",
    fontSize: 13,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  });

  const openComposer = () => {
    if (!isAuthed) {
      window.location.href = "/auth?redirect=/";
      return;
    }
    setAskError(null);
    setPostError(null);
    setMediaError(null);
    setOpen(true);
  };

  const closeComposer = () => {
    setMediaError(null);
    setOpen(false);
  };

  const collapsedPlaceholder =
    mode === "post"
      ? isMobile
        ? "What’s on your mind?"
        : `What’s on your mind, ${firstName}?`
      : isMobile
      ? "Ask the community…"
      : "Ask the quantum community…";

  const canSubmit =
    mode === "post"
      ? !!postText.trim() && !postSaving
      : !!askTitle.trim() && !!askBody.trim() && !askSaving;

  const pickMedia = () => {
  if (!isAuthed) {
    window.location.href = "/auth?redirect=/";
    return;
  }
  fileInputRef.current?.click();
};

  const onMediaSelected = (file: File | null) => {
  setMediaError(null);

  if (postMediaPreview?.startsWith("blob:")) {
    URL.revokeObjectURL(postMediaPreview);
  }

  if (!file) {
    setPostMediaFile(null);
    setPostMediaPreview(null);
    return;
  }

  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");

  if (!isImage && !isVideo) {
    setMediaError("Only image or video files are allowed.");
    return;
  }

  if (file.size > MAX_MEDIA_SIZE) {
    setMediaError("Media must be smaller than 25 MB.");
    return;
  }

  setPostMediaFile(file);
  setPostMediaPreview(URL.createObjectURL(file));
};

  const clearMedia = () => {
  setMediaError(null);
  onMediaSelected(null);
};

const uploadPostMediaIfAny = async (): Promise<{
  image_url: string | null;
  video_url: string | null;
}> => {
  if (!user || !postMediaFile) {
    return { image_url: null, video_url: null };
  }

  const isImage = postMediaFile.type.startsWith("image/");
  const isVideo = postMediaFile.type.startsWith("video/");

  const ext = (postMediaFile.name.split(".").pop() || "bin").toLowerCase();
  const path = `posts/${user.id}/${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}.${ext}`;

  const { error } = await supabase.storage
    .from(POSTS_BUCKET)
    .upload(path, postMediaFile, {
      cacheControl: "3600",
      upsert: false,
      contentType: postMediaFile.type,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(POSTS_BUCKET).getPublicUrl(path);
  const url = data?.publicUrl || null;

  return {
    image_url: isImage ? url : null,
    video_url: isVideo ? url : null,
  };
};

const submitPost = async () => {
  if (!user) {
    window.location.href = "/auth?redirect=/";
    return;
  }

  const body = postText.trim();
  if (!body) return;

  setPostSaving(true);
  setPostError(null);

  try {
    const { image_url, video_url } = await uploadPostMediaIfAny();

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      body,
      image_url,
      video_url,
    });

    if (error) throw error;

    setPostText("");
    clearMedia();
    closeComposer();

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("q5:feed-changed"));
    }
  } catch (e: any) {
    console.error("submitPost error:", e);
    setPostError(e?.message || "Could not create post.");
  } finally {
    setPostSaving(false);
  }
};

  const submitAskToQnA = async () => {
    if (!user) {
      window.location.href = "/auth?redirect=/";
      return;
    }

    const title = askTitle.trim();
    const body = askBody.trim();
    if (!title || !body) return;

    setAskSaving(true);
    setAskError(null);

    try {
      let insertedId: string | null = null;

      const attempt1 = await supabase
        .from("qna_questions")
        .insert({
          user_id: user.id,
          title,
          body,
          tags: [askType],
        })
        .select("id")
        .maybeSingle();

      if (!attempt1.error) {
        insertedId = (attempt1.data as any)?.id ?? null;
      } else {
        const attempt2 = await supabase
          .from("qna_questions")
          .insert({
            user_id: user.id,
            title,
            body,
          })
          .select("id")
          .maybeSingle();

        if (attempt2.error) {
          const msg =
            attempt2.error.message ||
            attempt2.error.details ||
            "Failed to post question";
          throw new Error(msg);
        }

        insertedId = (attempt2.data as any)?.id ?? null;
      }

      setAskTitle("");
      setAskBody("");
      setAskType("concept");
      closeComposer();

      if (insertedId) {
        router.push(`/qna?open=${insertedId}`);
      } else {
        router.push(`/qna`);
      }
    } catch (e: any) {
      console.error("submitAskToQnA error:", e);
      setAskError(
        e?.message ||
          "Could not post your question. Check Supabase RLS/policies for qna_questions."
      );
    } finally {
      setAskSaving(false);
    }
  };

  return (
    <>
      <div style={shellStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
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
            <span
              style={{
                marginLeft: "auto",
                opacity: 0.7,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              {mode === "post" ? "✨" : "❓"}
            </span>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: 4,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(2,6,23,0.22)",
              flex: "0 0 auto",
              marginLeft: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              style={toggleBtn(mode === "post")}
              onClick={() => setMode("post")}
            >
              Post
            </button>
            <button
              type="button"
              style={toggleBtn(mode === "ask")}
              onClick={() => setMode("ask")}
            >
              Ask
            </button>
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
              <div style={{ fontWeight: 800, fontSize: 15 }}>
                {mode === "post" ? "Create post" : "Ask a question"}
              </div>

              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: 4,
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(2,6,23,0.22)",
                }}
              >
                <button
                  type="button"
                  style={toggleBtn(mode === "post")}
                  onClick={() => setMode("post")}
                >
                  Post
                </button>
                <button
                  type="button"
                  style={toggleBtn(mode === "ask")}
                  onClick={() => setMode("ask")}
                >
                  Ask
                </button>
              </div>

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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                {avatarNode}
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.2 }}
                  >
                    {displayName}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.75,
                      marginTop: 2,
                    }}
                  >
                    {mode === "post"
                      ? "Public · Quantum5ocial"
                      : "Public · Q&A"}
                  </div>
                </div>
              </div>

              {mode === "post" ? (
                <>
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    placeholder={
                      isMobile
                        ? "What’s on your mind?"
                        : `What’s on your mind, ${firstName}?`
                    }
                    style={bigTextarea}
                  />

                  {postMediaPreview && (
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
      <div
        style={{
          fontSize: 12,
          opacity: 0.85,
          fontWeight: 800,
        }}
      >
        Media attached
      </div>
      <button
        type="button"
        onClick={clearMedia}
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
      <div
        style={{
          width: "100%",
          height: 360,
          borderRadius: 12,
          overflow: "hidden",
          background: "rgba(2,6,23,0.35)",
          border: "1px solid rgba(148,163,184,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {postMediaFile?.type.startsWith("video/") ? (
          <video
            src={postMediaPreview}
            controls
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <img
            src={postMediaPreview}
            alt="Preview"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
            }}
          />
        )}
      </div>
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
                </>
              ) : (
                <>
                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={typeChip(askType === "concept")}
                      onClick={() => setAskType("concept")}
                      role="button"
                      tabIndex={0}
                    >
                      <MiniIcon path="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12c.6.6 1 1.4 1 2v1h6v-1c0-.6.4-1.4 1-2A7 7 0 0 0 12 2Z" />
                      Concept
                    </div>
                    <div
                      style={typeChip(askType === "experiment")}
                      onClick={() => setAskType("experiment")}
                      role="button"
                      tabIndex={0}
                    >
                      <MiniIcon path="M10 2v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V2M8 8h8" />
                      Experiment
                    </div>
                    <div
                      style={typeChip(askType === "career")}
                      onClick={() => setAskType("career")}
                      role="button"
                      tabIndex={0}
                    >
                      <MiniIcon path="M10 6V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v1m-9 4h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Zm0 0V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2" />
                      Career
                    </div>
                  </div>

                  <input
                    value={askTitle}
                    onChange={(e) => setAskTitle(e.target.value)}
                    placeholder="Question title (be specific)"
                    style={smallInput}
                  />

                  <div style={{ height: 10 }} />

                  <textarea
                    value={askBody}
                    onChange={(e) => setAskBody(e.target.value)}
                    placeholder="Add context, details, constraints, what you already tried…"
                    style={{ ...bigTextarea, minHeight: isMobile ? 140 : 150 }}
                  />

                  {askError && (
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
                      {askError}
                    </div>
                  )}
                </>
              )}
            </div>

            <div style={footerBar}>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                {mode === "post" ? (
                  <ActionButton
                    icon={
                      <MiniIcon path="M4 7h3l2-2h6l2 2h1a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Zm8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                    }
                    label="Media"
                    onClick={pickMedia}
                  />
                ) : (
                  <>
                    <ActionButton
                      icon="❓"
                      label="Add details"
                      title="Add more context"
                    />
                    <ActionButton
                      icon="🔗"
                      label="Add link"
                      title="Link to paper/code"
                    />
                    <ActionButton
                      icon="🧪"
                      label="Add tags"
                      title="Tag it for discovery"
                    />
                  </>
                )}
              </div>

              <button
                type="button"
                style={primaryBtn(!canSubmit)}
                disabled={!canSubmit}
                onClick={() => {
                  if (mode === "post") submitPost();
                  else submitAskToQnA();
                }}
              >
                {mode === "post"
                  ? postSaving
                    ? "Posting…"
                    : "Post"
                  : askSaving
                  ? "Asking…"
                  : "Ask"}
              </button>
            </div>

            <input
  ref={fileInputRef}
  type="file"
  accept="image/*,video/*"
  style={{ display: "none" }}
  onChange={(e) => {
    onMediaSelected(e.target.files?.[0] || null);
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
   RIGHT SIDEBAR (dynamic tiles)
   ========================= */

function HomeHeroTile() {
  return (
    <div className="hero-tile" id="about">
      <div className="hero-tile-inner">
        <div className="tile-label">Quantum5ocial</div>

        <div
          style={{
            marginTop: 6,
            fontWeight: 900,
            fontSize: 16,
            lineHeight: 1.2,
          }}
        >
          Discover{" "}
          <span style={{ color: "#22d3ee" }}>
            jobs, products &amp; services
          </span>{" "}
          shaping the future of quantum technology.
        </div>

        <p className="tile-text" style={{ marginTop: 10 }}>
          Quantum5ocial connects students, researchers, and companies with
          curated opportunities, services and products across the global quantum
          ecosystem.
        </p>

        <div className="tile-pill-row" style={{ marginTop: 12 }}>
          <span className="tile-pill">
            Intern, PhD, Postdoc, and Industry roles
          </span>
          <span className="tile-pill">Startups, Vendors, and Labs</span>
          <span className="tile-pill">Hardware · Software · Services</span>
        </div>

        <div className="tile-cta" style={{ marginTop: 12 }}>
          Learn more <span>›</span>
        </div>
      </div>
    </div>
  );
}

function HomeRightSidebar() {
  const [latestJob, setLatestJob] = useState<Job | null>(null);
  const [latestProduct, setLatestProduct] = useState<Product | null>(null);
  const [latestMember, setLatestMember] = useState<CommunityProfile | null>(
    null
  );

  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadingMember, setLoadingMember] = useState(true);

  const ACCENT = {
    members: "#22d3ee",
    jobs: "#22c55e",
    products: "#fbbf24",
  };

  useEffect(() => {
    let cancelled = false;

    const pickOne = async <T,>(
      table: string,
      select: string,
      fallbackOrderCol: string
    ): Promise<T | null> => {
      const { data: featured, error: featErr } = await supabase
        .from(table)
        .select(select)
        .eq("is_featured", true)
        .order("featured_rank", { ascending: true, nullsFirst: false })
        .order("featured_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (!featErr && featured && featured.length > 0)
        return featured[0] as T;

      const { data: latest, error: latErr } = await supabase
        .from(table)
        .select(select)
        .order(fallbackOrderCol, { ascending: false })
        .limit(1);

      if (!latErr && latest && latest.length > 0) return latest[0] as T;

      return null;
    };

    const loadAll = async () => {
      setLoadingJob(true);
      setLoadingProduct(true);
      setLoadingMember(true);

      try {
        const [job, product, member] = await Promise.all([
          pickOne<Job>(
            "jobs",
            "id, title, company_name, location, employment_type, remote_type, short_description",
            "created_at"
          ),
          pickOne<Product>(
            "products",
            "id, name, company_name, category, short_description, price_type, price_value, in_stock, image1_url",
            "created_at"
          ),
          pickOne<CommunityProfile>(
            "profiles",
            "id, full_name, avatar_url, highest_education, affiliation, short_bio, role",
            "created_at"
          ),
        ]);

        if (cancelled) return;

        setLatestJob(job);
        setLatestProduct(product);
        setLatestMember(member);
      } catch (e) {
        console.error("HomeRightSidebar load error:", e);
        if (cancelled) return;
        setLatestJob(null);
        setLatestProduct(null);
        setLatestMember(null);
      } finally {
        if (cancelled) return;
        setLoadingJob(false);
        setLoadingProduct(false);
        setLoadingMember(false);
      }
    };

    loadAll();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatJobMeta = (job: Job) =>
    [job.company_name, job.location, job.remote_type]
      .filter(Boolean)
      .join(" · ");

  const formatPrice = (p: Product) => {
    if (p.price_type === "fixed" && p.price_value) return p.price_value;
    if (p.price_type === "contact") return "Contact for price";
    return "";
  };

  const memberName = latestMember?.full_name || "Quantum member";
  const memberFirstName =
    typeof memberName === "string"
      ? memberName.split(" ")[0] || memberName
      : "Member";

  const memberProfileHref = latestMember
    ? `/profile/${latestMember.id}`
    : "/community";

  return (
    <div className="hero-tiles hero-tiles-vertical">
      <HomeHeroTile />

      <Link href="/jobs" className="hero-tile">
        <div className="hero-tile-inner">
          <div className="tile-label">Featured role</div>

          <div className="tile-title-row">
            <div
              className="tile-title"
              style={{
                color: ACCENT.jobs,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              Hot opening
            </div>
            <div className="tile-icon-orbit">🧪</div>
          </div>

          {loadingJob ? (
            <p className="tile-text">Loading the newest job…</p>
          ) : !latestJob ? (
            <p className="tile-text">
              No jobs posted yet — be the first to add one.
            </p>
          ) : (
            <div style={{ marginTop: 8 }}>
              <Link
                href={`/jobs/${latestJob.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    lineHeight: 1.25,
                  }}
                >
                  {latestJob.title || "Untitled role"}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    marginTop: 4,
                    lineHeight: 1.35,
                  }}
                >
                  {formatJobMeta(latestJob) || "Quantum role"}
                </div>

                {latestJob.short_description && (
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.9,
                      marginTop: 6,
                      lineHeight: 1.35,
                    }}
                  >
                    {latestJob.short_description.length > 90
                      ? latestJob.short_description.slice(0, 87) + "..."
                      : latestJob.short_description}
                  </div>
                )}
              </Link>
            </div>
          )}

          <div className="tile-pill-row">
            <span className="tile-pill">MSc / PhD</span>
            <span className="tile-pill">Postdoc</span>
            <span className="tile-pill">Industry</span>
          </div>

          <div className="tile-cta">
            Browse jobs <span>›</span>
          </div>
        </div>
      </Link>

      <Link href="/products" className="hero-tile">
        <div className="hero-tile-inner">
          <div className="tile-label">Featured product</div>

          <div className="tile-title-row">
            <div
              className="tile-title"
              style={{
                color: ACCENT.products,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              Product of the week
            </div>
            <div className="tile-icon-orbit">🔧</div>
          </div>

          {loadingProduct ? (
            <p className="tile-text">Loading the newest product…</p>
          ) : !latestProduct ? (
            <p className="tile-text">
              No products listed yet — add your first product.
            </p>
          ) : (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(148,163,184,0.18)",
                }}
              >
                {latestProduct.image1_url ? (
                  <img
                    src={latestProduct.image1_url}
                    alt={latestProduct.name}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      opacity: 0.75,
                    }}
                  >
                    No image
                  </div>
                )}
              </div>

              <Link
                href={`/products/${latestProduct.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    lineHeight: 1.25,
                  }}
                >
                  {latestProduct.name}
                </div>

                <div
                  style={{
                    fontSize: 12,
                    opacity: 0.85,
                    marginTop: 4,
                    lineHeight: 1.35,
                  }}
                >
                  {[
                    latestProduct.company_name,
                    latestProduct.category,
                    formatPrice(latestProduct),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>

                {latestProduct.short_description && (
                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.9,
                      marginTop: 6,
                      lineHeight: 1.35,
                    }}
                  >
                    {latestProduct.short_description.length > 90
                      ? latestProduct.short_description.slice(0, 87) + "..."
                      : latestProduct.short_description}
                  </div>
                )}
              </Link>
            </div>
          )}

          <div className="tile-pill-row">
            <span className="tile-pill">Hardware</span>
            <span className="tile-pill">Control &amp; readout</span>
            <span className="tile-pill">Software &amp; services</span>
          </div>

          <div className="tile-cta">
            Browse products <span>›</span>
          </div>
        </div>
      </Link>

      <Link href="/community" className="hero-tile">
        <div className="hero-tile-inner">
          <div className="tile-label">Featured member</div>

          <div className="tile-title-row">
            <div
              className="tile-title"
              style={{
                color: ACCENT.members,
                fontWeight: 700,
                letterSpacing: 0.3,
              }}
            >
              Spotlight
            </div>
            <div className="tile-icon-orbit">🤝</div>
          </div>

          {loadingMember ? (
            <p className="tile-text">Loading the newest member…</p>
          ) : !latestMember ? (
            <p className="tile-text">No profiles found yet.</p>
          ) : (
            <div
              style={{
                marginTop: 8,
                display: "flex",
                gap: 10,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  overflow: "hidden",
                  flexShrink: 0,
                  border: "1px solid rgba(148,163,184,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {latestMember.avatar_url ? (
                  <img
                    src={latestMember.avatar_url}
                    alt={memberFirstName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  memberFirstName.charAt(0).toUpperCase()
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Link
                  href={memberProfileHref}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      lineHeight: 1.25,
                    }}
                  >
                    {memberName}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      opacity: 0.85,
                      marginTop: 4,
                      lineHeight: 1.35,
                    }}
                  >
                    {[
                      latestMember.highest_education,
                      latestMember.role,
                      latestMember.affiliation,
                    ]
                      .filter(Boolean)
                      .join(" · ") ||
                      "Quantum5ocial community member"}
                  </div>

                  {latestMember.short_bio && (
                    <div
                      style={{
                        fontSize: 12,
                        opacity: 0.9,
                        marginTop: 6,
                        lineHeight: 1.35,
                      }}
                    >
                      {latestMember.short_bio.length > 90
                        ? latestMember.short_bio.slice(0, 87) + "..."
                        : latestMember.short_bio}
                    </div>
                  )}
                </Link>
              </div>
            </div>
          )}

          <div className="tile-pill-row">
            <span className="tile-pill">Profiles</span>
            <span className="tile-pill">Labs &amp; companies</span>
            <span className="tile-pill">Entangle connections</span>
          </div>

          <div className="tile-cta">
            Browse community <span>›</span>
          </div>
        </div>
      </Link>
    </div>
  );
}

(Home as any).layoutProps = {
  variant: "three",
  right: <HomeRightSidebar />,
};
