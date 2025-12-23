// pages/profile/index.tsx
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import { useEntanglements } from "../../lib/useEntanglements";
import ClaimQ5BadgeModal from "../../components/ClaimQ5BadgeModal";
import Q5BadgeChips from "../../components/Q5BadgeChips";

type Profile = {
  id: string;
  full_name: string | null;
  short_bio: string | null;

  role: string | null;
  current_title?: string | null;

  affiliation: string | null;
  country: string | null;
  city: string | null;
  focus_areas: string | null;
  skills: string | null;
  highest_education: string | null;
  key_experience: string | null;
  avatar_url: string | null;

  orcid: string | null;
  google_scholar: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  personal_website: string | null;
  lab_website: string | null;

  institutional_email_verified?: boolean | null;
  email?: string | null;
  provider?: string | null;
  raw_metadata?: any;

  q5_badge_level?: number | null;
  q5_badge_label?: string | null;
  q5_badge_review_status?: string | null;
  q5_badge_claimed_at?: string | null;
};

type ProfilePrivate = {
  id: string;
  phone: string | null;
  institutional_email: string | null;
};

type CompletenessItem = {
  key: string;
  label: string;
  w: number;
  ok: boolean;
};

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

function computeCompleteness(p: Profile | null, priv: ProfilePrivate | null) {
  const has = (v: any) => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    return true;
  };

  const headlineOk = has(p?.current_title) || has(p?.role);

  const items: CompletenessItem[] = [
    { key: "full_name", label: "Add your full name", w: 10, ok: has(p?.full_name) },
    { key: "short_bio", label: "Write a short bio", w: 10, ok: has(p?.short_bio) },
    { key: "headline", label: "Add a current title or primary role", w: 10, ok: headlineOk },

    { key: "affiliation", label: "Add your affiliation", w: 7, ok: has(p?.affiliation) },
    { key: "country", label: "Add your country", w: 4, ok: has(p?.country) },
    { key: "city", label: "Add your city", w: 4, ok: has(p?.city) },

    { key: "focus_areas", label: "Add focus areas", w: 10, ok: has(p?.focus_areas) },
    { key: "skills", label: "Add skills", w: 10, ok: has(p?.skills) },

    { key: "highest_education", label: "Select your highest education", w: 5, ok: has(p?.highest_education) },
    { key: "key_experience", label: "Add key experience", w: 5, ok: has(p?.key_experience) },

    { key: "orcid", label: "Add your ORCID", w: 5, ok: has(p?.orcid) },
    { key: "google_scholar", label: "Add Google Scholar", w: 5, ok: has(p?.google_scholar) },
    { key: "linkedin_url", label: "Add LinkedIn", w: 5, ok: has(p?.linkedin_url) },

    { key: "institutional_email", label: "Add an institutional email", w: 6, ok: has(priv?.institutional_email) },
    { key: "phone", label: "Add a phone number (optional)", w: 4, ok: has(priv?.phone) },
  ];

  const total = items.reduce((s, x) => s + x.w, 0);
  const score = items.reduce((s, x) => s + (x.ok ? x.w : 0), 0);
  const pct = total ? Math.round((score / total) * 100) : 0;

  const missing = items.filter((x) => !x.ok).sort((a, b) => b.w - a.w);
  return { pct, missing };
}

// hover effect without touching global CSS
function ClaimPill({
  onClick,
  base,
  hover,
  label,
  title,
}: {
  onClick: () => void;
  base: React.CSSProperties;
  hover: React.CSSProperties;
  label: string;
  title: string;
}) {
  const [h, setH] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{ ...base, ...(h ? hover : {}) }}
      title={title}
    >
      {label}
    </button>
  );
}

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
   POSTS STRIP — SAME VISUAL AS /profile/[id].tsx
   ========================= */

function MyProfilePostsStrip({
  userId,
  displayName,
  avatarUrl,
  initials,
}: {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
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
        .eq("user_id", userId)
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

    if (userId) run();

    const channel = supabase
      .channel(`my-profile-posts:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${userId}` },
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
  }, [userId]);

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
  if (items.length === 0) return <div className="products-empty">No posts yet.</div>;

  const chipStyle: React.CSSProperties = {
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

  const edgeBtn: React.CSSProperties = {
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
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
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
                      title={displayName}
                    >
                      {displayName || "Quantum member"}
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

export default function ProfileViewPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [privateProfile, setPrivateProfile] = useState<ProfilePrivate | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [badgeOpen, setBadgeOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEntanglements({ user, redirectPath: "/profile" });

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/profile");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 720);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // -------- Load profile --------
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setProfileLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            short_bio,
            role,
            current_title,
            affiliation,
            country,
            city,
            focus_areas,
            skills,
            highest_education,
            key_experience,
            avatar_url,
            orcid,
            google_scholar,
            linkedin_url,
            github_url,
            personal_website,
            lab_website,
            institutional_email_verified,
            email,
            provider,
            raw_metadata,
            q5_badge_level,
            q5_badge_label,
            q5_badge_review_status,
            q5_badge_claimed_at
          `
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile", error);
        setProfile(null);
      } else {
        setProfile((data as Profile) || null);
      }

      const { data: priv, error: privErr } = await supabase
        .from("profile_private")
        .select(`id, phone, institutional_email`)
        .eq("id", user.id)
        .maybeSingle();

      if (privErr) {
        console.error("Error loading profile_private", privErr);
        setPrivateProfile(null);
      } else {
        setPrivateProfile((priv as ProfilePrivate) || null);
      }

      setProfileLoading(false);
    };

    if (user) loadProfile();
  }, [user]);

  // ✅ Realtime: reflect backend edits instantly
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profiles-badge:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as any;
          setProfile((prev) => (prev ? { ...prev, ...row } : (row as any)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // refresh badge on focus
  useEffect(() => {
    if (!user?.id) return;

    const onFocus = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("q5_badge_level, q5_badge_label, q5_badge_review_status, q5_badge_claimed_at")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile((p) => (p ? { ...p, ...(data as any) } : (data as any)));
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user?.id]);

  if (!user && !loading) return null;

  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const displayName = profile?.full_name || fallbackName;

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "Q5";

  const focusTags =
    profile?.focus_areas
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) || [];

  const skillTags =
    profile?.skills
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) || [];

  const links = [
    { label: "ORCID", value: profile?.orcid },
    { label: "Google Scholar", value: profile?.google_scholar },
    { label: "LinkedIn", value: profile?.linkedin_url },
    { label: "GitHub", value: profile?.github_url },
    { label: "Personal website", value: profile?.personal_website },
    { label: "Lab/Company website", value: profile?.lab_website },
  ].filter((x) => x.value);

  const accountEmail = user?.email || "";
  const headline = profile?.current_title?.trim()
    ? profile.current_title
    : profile?.role?.trim()
    ? profile.role
    : null;

  const showContactTile =
    !!accountEmail || !!privateProfile?.institutional_email || !!privateProfile?.phone;

  const hasAnyProfileInfo =
    profile &&
    (profile.full_name ||
      profile.short_bio ||
      profile.role ||
      profile.current_title ||
      profile.affiliation ||
      profile.city ||
      profile.country ||
      profile.focus_areas ||
      profile.skills ||
      profile.highest_education ||
      profile.key_experience ||
      privateProfile?.institutional_email ||
      privateProfile?.phone);

  const completeness = computeCompleteness(profile, privateProfile);
  const topAddInline = completeness.missing
    .slice(0, 3)
    .map((m) => m.label)
    .join(" · ");

  const editBtnStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 16px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.6)",
    textDecoration: "none",
    color: "#e5e7eb",
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    width: "fit-content",
  };

  const smallPillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.55)",
    color: "rgba(226,232,240,0.95)",
    fontSize: 12,
    textDecoration: "none",
    whiteSpace: "nowrap",
    width: "fit-content",
    lineHeight: "16px",
  };

  const hasBadge = !!(profile?.q5_badge_label || profile?.q5_badge_level != null);
  const badgeLabel =
    (profile?.q5_badge_label && profile.q5_badge_label.trim()) ||
    (profile?.q5_badge_level != null ? `Q5-Level ${profile.q5_badge_level}` : "");

  const claimPillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "6px 12px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.45)",
    background: "rgba(2,6,23,0.25)",
    color: "rgba(226,232,240,0.95)",
    fontSize: 12,
    fontWeight: 800,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease",
    boxShadow: "0 0 0 rgba(0,0,0,0)",
  };

  const claimPillHoverStyle: React.CSSProperties = {
    transform: "translateY(-1px)",
    borderColor: "rgba(34,211,238,0.55)",
    boxShadow: "0 10px 26px rgba(34,211,238,0.12)",
  };

  return (
    <section className="section" style={{ paddingTop: 0, marginTop: -18 }}>
      <div className="profile-container" style={{ marginTop: 0 }}>
        {/* Header */}
        <div className="section-header" style={{ marginBottom: 10, paddingTop: 0 }}>
          <div>
            <div className="section-title">My profile</div>
            <div className="section-sub">This is how you appear inside Quantum5ocial.</div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", flex: 1 }}>
            <Link href="/profile/edit" className="nav-ghost-btn" style={editBtnStyle}>
              Edit
            </Link>
          </div>
        </div>

        <div className="profile-summary-card">
          {profileLoading ? (
            <p className="profile-muted">Loading your profile…</p>
          ) : !hasAnyProfileInfo ? (
            <div>
              <p className="profile-muted" style={{ marginBottom: 12 }}>
                You haven&apos;t filled in your profile yet. A complete profile helps labs,
                companies, and collaborators know who you are in the quantum ecosystem.
              </p>
              <Link href="/profile/edit" className="nav-cta">
                Complete your profile
              </Link>
            </div>
          ) : (
            <>
              {/* Completeness */}
              <div
                className="card"
                style={{
                  padding: 12,
                  marginBottom: 12,
                  border: "1px solid rgba(148,163,184,0.35)",
                  borderRadius: 16,
                  background: "rgba(2,6,23,0.55)",
                }}
              >
                <div
  style={{
    display: "flex",
    alignItems: isMobile ? "stretch" : "center",
    justifyContent: isMobile ? "flex-start" : "space-between",
    gap: 10,
    flexWrap: isMobile ? "wrap" : "nowrap",
  }}
>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e7eb" }}>
                    Profile completeness: {completeness.pct}%
                  </div>

                  <div
  style={{
    display: "flex",
    justifyContent: isMobile ? "flex-start" : "flex-end",
    width: isMobile ? "100%" : "auto",
  }}
>
  {completeness.pct >= 100 ? (
    <span
      style={{
        ...smallPillStyle,
        border: "1px solid rgba(74,222,128,0.6)",
        color: "rgba(187,247,208,0.95)",
        cursor: "default",
      }}
      title="Nice — your profile is complete!"
    >
      Profile completed 🎉
    </span>
  ) : (
    <Link href="/profile/edit" style={smallPillStyle}>
      Complete your profile →
    </Link>
  )}
</div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div
                    style={{
                      height: 10,
                      borderRadius: 999,
                      background: "rgba(148,163,184,0.25)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${completeness.pct}%`,
                        borderRadius: 999,
                        background: "linear-gradient(90deg,#22d3ee,#6366f1)",
                      }}
                    />
                  </div>
                </div>

                {!!topAddInline && (
                  <div
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      color: "rgba(226,232,240,0.9)",
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span style={{ color: "rgba(148,163,184,0.95)" }}>Top things to add:</span>
                    <span
                      style={{
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: 760,
                      }}
                      title={topAddInline}
                    >
                      {topAddInline}
                    </span>
                  </div>
                )}
              </div>

              {/* Identity */}
{isMobile ? (
  <div
    className="profile-header"
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      textAlign: "center",
      gap: 10,
    }}
  >
    {/* badge + claim (above avatar) */}
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
      {hasBadge && (
        <Q5BadgeChips
          label={badgeLabel}
          reviewStatus={profile?.q5_badge_review_status ?? null}
          size="md"
        />
      )}

      <ClaimPill
        onClick={() => setBadgeOpen(true)}
        base={claimPillStyle}
        hover={claimPillHoverStyle}
        label={hasBadge ? "Update your badge ✦" : "Claim your Q5 badge ✦"}
        title={hasBadge ? "Update your Q5 badge" : "Claim your Q5 badge"}
      />
    </div>

    {/* avatar centered */}
    <div className="profile-avatar" style={{ margin: "0 auto" }}>
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={displayName} className="profile-avatar-img" />
      ) : (
        <span>{initials}</span>
      )}
    </div>

    {/* name */}
    <div
      className="profile-name"
      style={{
        width: "100%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={displayName}
    >
      {displayName}
    </div>

    {/* headline + affiliation */}
    {(headline || profile?.affiliation) && (
      <div className="profile-role" style={{ textAlign: "center" }}>
        {[headline, profile?.affiliation].filter(Boolean).join(" · ")}
      </div>
    )}

    {/* location */}
    {(profile?.city || profile?.country) && (
      <div className="profile-location" style={{ textAlign: "center" }}>
        {[profile?.city, profile?.country].filter(Boolean).join(", ")}
      </div>
    )}
  </div>
) : (
  /* ✅ DESKTOP — original Identity block restored */
  <div className="profile-header">
    <div className="profile-avatar">
      {profile?.avatar_url ? (
        <img src={profile.avatar_url} alt={displayName} className="profile-avatar-img" />
      ) : (
        <span>{initials}</span>
      )}
    </div>

    <div className="profile-header-text" style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          width: "100%",
          minWidth: 0,
          flexWrap: "nowrap",
          justifyContent: "flex-start",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            minWidth: 0,
            flex: 1,
            flexWrap: "wrap",
            justifyContent: "flex-start",
          }}
        >
          <div
            className="profile-name"
            style={{
              minWidth: 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "left",
            }}
            title={displayName}
          >
            {displayName}
          </div>

          {hasBadge && (
            <Q5BadgeChips
              label={badgeLabel}
              reviewStatus={profile?.q5_badge_review_status ?? null}
              size="md"
            />
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <ClaimPill
            onClick={() => setBadgeOpen(true)}
            base={claimPillStyle}
            hover={claimPillHoverStyle}
            label={hasBadge ? "Update your badge ✦" : "Claim your Q5 badge ✦"}
            title={hasBadge ? "Update your Q5 badge" : "Claim your Q5 badge"}
          />
        </div>
      </div>

      {(headline || profile?.affiliation) && (
        <div className="profile-role" style={{ textAlign: "left" }}>
          {[headline, profile?.affiliation].filter(Boolean).join(" · ")}
        </div>
      )}

      {(profile?.city || profile?.country) && (
        <div className="profile-location" style={{ textAlign: "left" }}>
          {[profile?.city, profile?.country].filter(Boolean).join(", ")}
        </div>
      )}
    </div>
  </div>
)}

              {/* Contact tile (private) */}
              {showContactTile && (
                <div
                  className="profile-summary-item"
                  style={{
                    marginTop: 14,
                    border: "1px solid rgba(148,163,184,0.25)",
                    borderRadius: 14,
                    padding: 12,
                    background: "rgba(2,6,23,0.35)",
                  }}
                >
                  <div className="profile-section-label" style={{ marginBottom: 6 }}>
                    Contact info (private)
                  </div>

                  <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#e5e7eb" }}>
                    {accountEmail && (
                      <div>
                        <span style={{ color: "rgba(148,163,184,0.9)" }}>Account email:</span>{" "}
                        {accountEmail}
                      </div>
                    )}

                    {privateProfile?.institutional_email && (
                      <div>
                        <span style={{ color: "rgba(148,163,184,0.9)" }}>Institutional email:</span>{" "}
                        {privateProfile.institutional_email}
                      </div>
                    )}

                    {privateProfile?.phone && (
                      <div>
                        <span style={{ color: "rgba(148,163,184,0.9)" }}>Phone:</span>{" "}
                        {privateProfile.phone}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bio */}
              {profile?.short_bio && <p className="profile-bio">{profile.short_bio}</p>}

              {profile?.key_experience && (
                <p className="profile-bio">
                  <span className="profile-section-label-inline">Experience:</span>{" "}
                  {profile.key_experience}
                </p>
              )}

              <div className="profile-two-columns">
                <div className="profile-col">
                  {profile?.affiliation && (
                    <div className="profile-summary-item">
                      <div className="profile-section-label">Affiliation</div>
                      <div className="profile-summary-text">{profile.affiliation}</div>
                    </div>
                  )}

                  {focusTags.length > 0 && (
                    <div className="profile-summary-item">
                      <div className="profile-section-label">Focus areas</div>
                      <div className="profile-tags">
                        {focusTags.map((tag) => (
                          <span key={tag} className="profile-tag-chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {links.length > 0 && (
                    <div className="profile-summary-item" style={{ marginTop: 18 }}>
                      <div className="profile-section-label">Links</div>
                      <ul style={{ paddingLeft: 16, fontSize: 13, marginTop: 4 }}>
                        {links.map((l) => (
                          <li key={l.label}>
                            <a
                              href={l.value as string}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "#7dd3fc" }}
                            >
                              {l.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="profile-col">
                  {profile?.highest_education && (
                    <div className="profile-summary-item">
                      <div className="profile-section-label">Highest education</div>
                      <div className="profile-summary-text">{profile.highest_education}</div>
                    </div>
                  )}

                  {skillTags.length > 0 && (
                    <div className="profile-summary-item">
                      <div className="profile-section-label">Skills</div>
                      <div className="profile-tags">
                        {skillTags.map((tag) => (
                          <span key={tag} className="profile-tag-chip">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ✅ POSTS SECTION — same strip UI */}
        <div style={{ marginTop: 14 }}>
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
                  Your public posts. Click a card to open it expanded.
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <Link href="/ecosystem/my-posts" className="section-link" style={{ fontSize: 13 }}>
                  View all →
                </Link>
              </div>
            </div>
          </div>

          {!!user?.id && (
            <MyProfilePostsStrip
              userId={user.id}
              displayName={displayName}
              avatarUrl={profile?.avatar_url || null}
              initials={initials}
            />
          )}
        </div>
      </div>

      {/* Claim/Update badge modal */}
      {user?.id && (
        <ClaimQ5BadgeModal
          open={badgeOpen}
          onClose={() => setBadgeOpen(false)}
          userId={user.id}
          onClaimed={(r) => {
            setProfile((p) =>
              p
                ? {
                    ...p,
                    q5_badge_level: r.level,
                    q5_badge_label: r.label,
                    q5_badge_review_status: r.review_status,
                    q5_badge_claimed_at: new Date().toISOString(),
                  }
                : p
            );
          }}
        />
      )}
    </section>
  );
}

(ProfileViewPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
