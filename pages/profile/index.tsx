// pages/profile.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import { useEntanglements } from "../../lib/useEntanglements";
import ClaimQ5BadgeModal from "../../components/ClaimQ5BadgeModal";

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

  // ✅ badge fields
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

  // ✅ detect mobile (only for layout tweaks)
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

  // (Optional) refresh badge on focus
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

  // ✅ badge logic
  const hasBadge = !!(profile?.q5_badge_label || profile?.q5_badge_level != null);
  const badgeLabel =
    (profile?.q5_badge_label && profile.q5_badge_label.trim()) ||
    (profile?.q5_badge_level != null ? `Q5-Level ${profile.q5_badge_level}` : "");

  const status = (profile?.q5_badge_review_status || "").toLowerCase();
  const statusLabel =
    status === "pending"
      ? "Pending verification"
      : status === "approved"
      ? "Verified"
      : status === "rejected"
      ? "Needs update"
      : null;

  const statusPillStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 900,
    whiteSpace: "nowrap",
    border: "1px solid rgba(148,163,184,0.35)",
    background: "rgba(2,6,23,0.35)",
    color: "rgba(226,232,240,0.92)",
  };

  // ✅ desktop stays EXACTLY as-is; only mobile tweaks via wrapper styles
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
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "nowrap",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#e5e7eb" }}>
                    Profile completeness: {completeness.pct}%
                  </div>

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

                <div className="profile-header-text" style={{ width: "100%" }}>
                  {/* ✅ desktop unchanged: badge + claim pill on same row
                      ✅ mobile: keep same DOM, but wrap and center so it doesn't overflow */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      minWidth: 0,
                      flexWrap: isMobile ? "wrap" : "nowrap",
                      justifyContent: isMobile ? "center" : "flex-start",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        minWidth: 0,
                        flex: isMobile ? "0 1 100%" : 1,
                        flexWrap: "wrap",
                        justifyContent: isMobile ? "center" : "flex-start",
                      }}
                    >
                      <div
                        className="profile-name"
                        style={{
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          textAlign: isMobile ? "center" : "left",
                          maxWidth: isMobile ? "100%" : undefined,
                        }}
                        title={displayName}
                      >
                        {displayName}
                      </div>

                      {hasBadge && (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            padding: "4px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(34,211,238,0.35)",
                            background: "rgba(34,211,238,0.08)",
                            color: "rgba(226,232,240,0.95)",
                            fontSize: 12,
                            fontWeight: 900,
                            whiteSpace: "nowrap",
                          }}
                          title={badgeLabel}
                        >
                          {badgeLabel}
                        </span>
                      )}

                      {hasBadge && statusLabel && (
                        <span
                          style={{
                            ...statusPillStyle,
                            border:
                              status === "approved"
                                ? "1px solid rgba(74,222,128,0.45)"
                                : status === "rejected"
                                ? "1px solid rgba(248,113,113,0.45)"
                                : "1px solid rgba(148,163,184,0.35)",
                            color:
                              status === "approved"
                                ? "rgba(187,247,208,0.95)"
                                : status === "rejected"
                                ? "rgba(254,202,202,0.95)"
                                : "rgba(226,232,240,0.92)",
                          }}
                          title={statusLabel}
                        >
                          {statusLabel}
                        </span>
                      )}
                    </div>

                    {/* Claim pill: unchanged; only wrapper behavior changes on mobile */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: isMobile ? "center" : "flex-end",
                        width: isMobile ? "100%" : "auto",
                      }}
                    >
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
                    <div className="profile-role" style={{ textAlign: isMobile ? "center" : "left" }}>
                      {[headline, profile?.affiliation].filter(Boolean).join(" · ")}
                    </div>
                  )}

                  {(profile?.city || profile?.country) && (
                    <div
                      className="profile-location"
                      style={{ textAlign: isMobile ? "center" : "left" }}
                    >
                      {[profile?.city, profile?.country].filter(Boolean).join(", ")}
                    </div>
                  )}
                </div>
              </div>

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
                        <span style={{ color: "rgba(148,163,184,0.9)" }}>
                          Institutional email:
                        </span>{" "}
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
      </div>

      {/* ✅ Claim/Update badge modal */}
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

(ProfileViewPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
