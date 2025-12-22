// pages/profile/[id].tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import { useEntanglements } from "../../lib/useEntanglements";
import Q5BadgeChips from "../../components/Q5BadgeChips"; // ✅ NEW

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

  // ✅ badge fields (optional)
  q5_badge_level?: number | null;
  q5_badge_label?: string | null;
  q5_badge_review_status?: string | null; // "pending" | "approved" | "rejected"
  q5_badge_claimed_at?: string | null;
};

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

type PostVM = {
  post: PostRow;
  author: FeedProfile | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
};

function useIsMobile(maxWidth = 720) {
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

export default function MemberProfilePage() {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const { id } = router.query;

  const profileId = typeof id === "string" ? id : null;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const isMobile = useIsMobile(720);

  const isSelf = useMemo(
    () => !!user && !!profileId && user.id === profileId,
    [user, profileId]
  );

  const {
    getConnectionStatus,
    isEntangleLoading,
    handleEntangle,
    handleDeclineEntangle,
  } = useEntanglements({
    user,
    redirectPath: router.asPath || "/community",
  });

  // -------- Load profile --------
  useEffect(() => {
    const loadProfile = async () => {
      if (!profileId) return;

      setProfileLoading(true);
      setProfileError(null);

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
            q5_badge_level,
            q5_badge_label,
            q5_badge_review_status,
            q5_badge_claimed_at
          `
        )
        .eq("id", profileId)
        .maybeSingle();

      if (error) {
        console.error("Error loading member profile", error);
        setProfile(null);
        setProfileError("Could not load this profile.");
      } else if (data) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
        setProfileError("Profile not found.");
      }

      setProfileLoading(false);
    };

    loadProfile();
  }, [profileId]);

  // ✅ Realtime: reflect backend badge edits instantly for THIS viewed profile
  useEffect(() => {
    if (!profileId) return;

    const channel = supabase
      .channel(`profiles-badge-view:${profileId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${profileId}`,
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
  }, [profileId]);

  // (Optional) refresh badge on focus in case realtime isn't enabled
  useEffect(() => {
    if (!profileId) return;

    const onFocus = async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          `
            q5_badge_level,
            q5_badge_label,
            q5_badge_review_status,
            q5_badge_claimed_at
          `
        )
        .eq("id", profileId)
        .maybeSingle();

      if (data) {
        setProfile((p) => (p ? { ...p, ...(data as any) } : (data as any)));
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [profileId]);

  // -------- Rendering helpers --------
  const displayName = profile?.full_name || "Quantum5ocial member";

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

  const headline = profile?.current_title?.trim()
    ? profile.current_title
    : profile?.role?.trim()
    ? profile.role
    : null;

  const links = [
    { label: "ORCID", value: profile?.orcid },
    { label: "Google Scholar", value: profile?.google_scholar },
    { label: "LinkedIn", value: profile?.linkedin_url },
    { label: "GitHub", value: profile?.github_url },
    { label: "Personal website", value: profile?.personal_website },
    { label: "Lab/Company website", value: profile?.lab_website },
  ].filter((x) => x.value);

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
      profile.key_experience);

  // ✅ badge display logic
  const hasBadge = !!(profile?.q5_badge_label || profile?.q5_badge_level != null);
  const badgeLabel =
    (profile?.q5_badge_label && profile.q5_badge_label.trim()) ||
    (profile?.q5_badge_level != null ? `Q5-Level ${profile.q5_badge_level}` : "");

  // ✅ get-or-create thread then route to /messages/[threadId]
  const openOrCreateThread = async (otherUserId: string) => {
    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    try {
      const { data: existing, error: findErr } = await supabase
        .from("dm_threads")
        .select("id, user1, user2, created_at")
        .or(
          `and(user1.eq.${user.id},user2.eq.${otherUserId}),and(user1.eq.${otherUserId},user2.eq.${user.id})`
        )
        .limit(1)
        .maybeSingle();

      if (findErr) throw findErr;

      if (existing?.id) {
        router.push(`/messages/${existing.id}`);
        return;
      }

      const { data: created, error: createErr } = await supabase
        .from("dm_threads")
        .insert({ user1: user.id, user2: otherUserId })
        .select("id")
        .maybeSingle();

      if (createErr) throw createErr;

      if (created?.id) {
        router.push(`/messages/${created.id}`);
        return;
      }

      throw new Error("Could not create thread.");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Could not open messages.");
    }
  };

  const renderEntangleHeaderCTA = () => {
    if (!profile || profileLoading) return null;

    const pillBase: React.CSSProperties = {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 800,
      whiteSpace: "nowrap",
      lineHeight: "16px",
      textDecoration: "none",
      width: "fit-content",
    };

    if (isSelf) {
      return (
        <Link
          href="/profile"
          className="nav-ghost-btn"
          style={{
            ...pillBase,
            border: "1px solid rgba(148,163,184,0.6)",
            color: "#e5e7eb",
            fontWeight: 700,
            padding: "6px 14px",
          }}
        >
          View / edit my profile
        </Link>
      );
    }

    if (!user) {
      return (
        <button
          type="button"
          className="nav-ghost-btn"
          onClick={() =>
            router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`)
          }
          style={{
            ...pillBase,
            padding: "6px 14px",
            border: "1px solid rgba(148,163,184,0.6)",
            color: "rgba(226,232,240,0.95)",
            cursor: "pointer",
          }}
        >
          Sign in to entangle
        </button>
      );
    }

    if (!profileId) return null;

    const status = getConnectionStatus(profileId);
    const loadingBtn = isEntangleLoading(profileId);

    if (status === "pending_incoming") {
      return (
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={() => handleEntangle(profileId)}
            disabled={loadingBtn}
            style={{
              ...pillBase,
              padding: "6px 14px",
              border: "none",
              background: "linear-gradient(90deg,#22c55e,#16a34a)",
              color: "#0f172a",
              cursor: loadingBtn ? "default" : "pointer",
              opacity: loadingBtn ? 0.7 : 1,
            }}
          >
            {loadingBtn ? "…" : "Accept request"}
          </button>

          <button
            type="button"
            onClick={() => handleDeclineEntangle(profileId)}
            disabled={loadingBtn}
            style={{
              ...pillBase,
              padding: "6px 14px",
              border: "1px solid rgba(148,163,184,0.7)",
              background: "transparent",
              color: "rgba(248,250,252,0.9)",
              cursor: loadingBtn ? "default" : "pointer",
              opacity: loadingBtn ? 0.7 : 1,
            }}
          >
            Decline
          </button>
        </div>
      );
    }

    if (status === "accepted") {
      return (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            type="button"
            onClick={() => openOrCreateThread(profileId)}
            style={{
              ...pillBase,
              padding: "6px 14px",
              border: "none",
              background: "linear-gradient(90deg,#22d3ee,#6366f1)",
              color: "#0f172a",
              cursor: "pointer",
            }}
          >
            Message
          </button>

          <span
            style={{
              ...pillBase,
              padding: "6px 12px",
              border: "1px solid rgba(74,222,128,0.65)",
              background: "rgba(34,197,94,0.10)",
              color: "rgba(187,247,208,0.95)",
            }}
            title="You are entangled"
          >
            Entangled ✓
          </span>
        </div>
      );
    }

    let label = "Entangle +";
    let border = "none";
    let bg = "linear-gradient(90deg,#22d3ee,#6366f1)";
    let color = "#0f172a";
    let disabled = false;

    if (status === "pending_outgoing") {
      label = "Request sent";
      border = "1px solid rgba(148,163,184,0.7)";
      bg = "transparent";
      color = "rgba(148,163,184,0.95)";
      disabled = true;
    }

    return (
      <button
        type="button"
        onClick={() => handleEntangle(profileId)}
        disabled={loadingBtn || disabled}
        style={{
          ...pillBase,
          padding: "6px 14px",
          border,
          background: bg,
          color,
          cursor: loadingBtn || disabled ? "default" : "pointer",
          opacity: loadingBtn ? 0.7 : 1,
        }}
      >
        {loadingBtn ? "…" : label}
      </button>
    );
  };

  const editLinkStyle: React.CSSProperties = {
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
  };

  return (
    <section className="section">
      {/* Header card */}
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.16), rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className="section-title"
              style={{ display: "flex", gap: 10, alignItems: "center" }}
            >
              Profile
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/community" className="section-link" style={{ fontSize: 13 }}>
              ← Back to community
            </Link>
            {renderEntangleHeaderCTA()}
          </div>
        </div>
      </div>

      {/* Main profile card */}
      <div className="profile-summary-card">
        {profileLoading ? (
          <p className="profile-muted">Loading profile…</p>
        ) : profileError ? (
          <p className="profile-muted" style={{ color: "#f87171" }}>
            {profileError}
          </p>
        ) : !hasAnyProfileInfo ? (
          <div>
            <p className="profile-muted" style={{ marginBottom: 12 }}>
              This member hasn&apos;t filled in their profile yet.
            </p>
            {isSelf && (
              <Link href="/profile/edit" className="nav-cta">
                Complete your profile
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Top identity */}
            <div className="profile-header">
              <div className="profile-avatar">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={displayName}
                    className="profile-avatar-img"
                  />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <div className="profile-header-text">
                {/* ✅ Name + badge row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div className="profile-name">{displayName}</div>

                  {hasBadge && (
                    <Q5BadgeChips
                      label={badgeLabel}
                      reviewStatus={profile?.q5_badge_review_status ?? null}
                      size="md"
                    />
                  )}
                </div>

                {(headline || profile?.affiliation) && (
                  <div className="profile-role">
                    {[headline, profile?.affiliation].filter(Boolean).join(" · ")}
                  </div>
                )}

                {(profile?.city || profile?.country) && (
                  <div className="profile-location">
                    {[profile?.city, profile?.country].filter(Boolean).join(", ")}
                  </div>
                )}

                {isSelf && (
                  <div style={{ marginTop: 12 }}>
                    <Link
                      href="/profile/edit"
                      className="nav-ghost-btn"
                      style={editLinkStyle}
                    >
                      Edit / complete your profile
                    </Link>
                  </div>
                )}
              </div>
            </div>

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
                    <div className="profile-summary-text">
                      {profile.highest_education}
                    </div>
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

      {/* ✅ POSTS STRIP (same sideways scroller as /profile) */}
      {profileId && (
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
                <div
                  className="section-title"
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  Posts
                </div>
                <div className="section-sub" style={{ maxWidth: 620 }}>
                  Public posts by this member (click a card to open the post on the global feed).
                </div>
              </div>
            </div>
          </div>

          <ProfilePostsStrip filterUserId={profileId} />
        </div>
      )}
    </section>
  );
}

/* =========================
   POSTS STRIP — 1 row total, horizontal scroll
   Image (top) + text (below) inside the card
   ========================= */

function ProfilePostsStrip({ filterUserId }: { filterUserId: string }) {
  const router = useRouter();
  const { user } = useSupabaseUser();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PostVM[]>([]);
  const [error, setError] = useState<string | null>(null);

  const scrollerRef = useRef<HTMLDivElement | null>(null);

  const initialsOf = (name: string | null | undefined) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "Q";

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

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: postRows, error: postErr } = await supabase
        .from("posts")
        .select("id, user_id, body, created_at, image_url")
        .eq("user_id", filterUserId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (postErr) throw postErr;

      const posts = (postRows || []) as PostRow[];
      const postIds = posts.map((p) => p.id);
      const userIds = Array.from(new Set(posts.map((p) => p.user_id)));

      // author profile map (mostly 1 user, but keep generic)
      let profileMap = new Map<string, FeedProfile>();
      if (userIds.length > 0) {
        const { data: profRows, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, highest_education, affiliation")
          .in("id", userIds);

        if (!profErr && profRows) {
          (profRows as FeedProfile[]).forEach((p) => profileMap.set(p.id, p));
        }
      }

      // likes (optional)
      let likeRows: { post_id: string; user_id: string }[] = [];
      if (postIds.length > 0) {
        const { data: likes, error: likeErr } = await supabase
          .from("post_likes")
          .select("post_id, user_id")
          .in("post_id", postIds);

        if (!likeErr && likes) likeRows = likes as any;
      }

      // comments count (optional)
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
        author: profileMap.get(p.user_id) || null,
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUserId]);

  const scrollByCard = (dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(260, Math.floor(el.clientWidth * 0.85));
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  const openPost = (postId: string) => {
    // homepage feed opens expanded by post param
    router.push(`/?post=${encodeURIComponent(postId)}`);
  };

  if (loading) return <div className="products-status">Loading posts…</div>;
  if (error)
    return (
      <div className="products-status" style={{ color: "#f87171" }}>
        {error}
      </div>
    );
  if (items.length === 0) {
    return <div className="products-empty">No posts yet.</div>;
  }

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
  };

  return (
    <div style={{ position: "relative" }}>
      {/* arrows */}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => scrollByCard(-1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(2,6,23,0.22)",
            color: "rgba(226,232,240,0.92)",
            cursor: "pointer",
            fontWeight: 900,
          }}
          aria-label="Scroll left"
          title="Scroll left"
        >
          ‹
        </button>

        <button
          type="button"
          onClick={() => scrollByCard(1)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(2,6,23,0.22)",
            color: "rgba(226,232,240,0.92)",
            cursor: "pointer",
            fontWeight: 900,
          }}
          aria-label="Scroll right"
          title="Scroll right"
        >
          ›
        </button>
      </div>

      {/* scroller */}
      <div
        ref={scrollerRef}
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 8,
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((it) => {
          const p = it.post;
          const a = it.author;

          const name = a?.full_name || "Quantum member";
          const initials = initialsOf(a?.full_name);

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
                width: "min(620px, 92vw)",
                cursor: "pointer",
              }}
            >
              <div
                className="card"
                style={{
                  padding: 14,
                  borderRadius: 16,
                  border: "1px solid rgba(148,163,184,0.18)",
                  background: "rgba(15,23,42,0.92)",
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
                    {a?.avatar_url ? (
                      <img
                        src={a.avatar_url}
                        alt={name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      initials
                    )}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 900, fontSize: 13, lineHeight: 1.1 }}>
                      {name}
                    </div>
                    <div style={{ fontSize: 11, opacity: 0.72, marginTop: 2 }}>
                      {formatRelativeTime(p.created_at)}
                    </div>
                  </div>

                  <span style={chipStyle} title="Likes / comments">
                    ❤ {it.likeCount} · 💬 {it.commentCount}
                  </span>
                </div>

                {/* ✅ CONTENT — image TOP, text BELOW (like your screenshot) */}
                <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                  {hasImage && (
                    <div
                      style={{
                        borderRadius: 14,
                        overflow: "hidden",
                        border: "1px solid rgba(148,163,184,0.14)",
                        background: "rgba(2,6,23,0.22)",
                        height: 220,
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
                      borderRadius: 14,
                      border: "1px solid rgba(148,163,184,0.14)",
                      background: "rgba(2,6,23,0.18)",
                      padding: 12,
                      minHeight: hasImage ? 92 : 180,
                      display: "flex",
                      alignItems: hasImage ? "flex-start" : "center",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        fontSize: 14,
                        lineHeight: 1.45,
                        color: "rgba(226,232,240,0.92)",
                        whiteSpace: "pre-wrap",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: hasImage ? 4 : 9,
                        WebkitBoxOrient: "vertical",
                      }}
                      title={body}
                    >
                      {body || "—"}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
                  Click to open post →
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

(MemberProfilePage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
