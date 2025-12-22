// pages/profile/[id].tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import { useEntanglements } from "../../lib/useEntanglements";

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

export default function MemberProfilePage() {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const { id } = router.query;

  const profileId = typeof id === "string" ? id : null;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

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

  const status = (profile?.q5_badge_review_status || "").toLowerCase();
  const statusLabel =
    status === "pending"
      ? "Pending"
      : status === "approved"
      ? "Verified"
      : status === "rejected"
      ? "Needs update"
      : null;

  const badgeChipStyle: React.CSSProperties = {
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
  };

  const badgeStatusStyle: React.CSSProperties = {
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
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
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
            <div className="section-title" style={{ display: "flex", gap: 10, alignItems: "center" }}>
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
                  <img src={profile.avatar_url} alt={displayName} className="profile-avatar-img" />
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
                    <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                      <span style={badgeChipStyle} title={badgeLabel}>
                        {badgeLabel}
                      </span>

                      {statusLabel && (
                        <span
                          style={{
                            ...badgeStatusStyle,
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
                    <Link href="/profile/edit" className="nav-ghost-btn" style={editLinkStyle}>
                      Edit / complete your profile
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {profile?.short_bio && <p className="profile-bio">{profile.short_bio}</p>}

            {profile?.key_experience && (
              <p className="profile-bio">
                <span className="profile-section-label-inline">Experience:</span> {profile.key_experience}
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
                          <a href={l.value as string} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc" }}>
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
    </section>
  );
}

(MemberProfilePage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
