// pages/profile/[id].tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import { useEntanglements } from "../../lib/useEntanglements";

const Navbar = dynamic(() => import("../../components/Navbar"), {
  ssr: false,
});

type Profile = {
  id: string;
  full_name: string | null;
  short_bio: string | null;
  role: string | null;
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

  // ---- Shared entanglement hook ----
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
          lab_website
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

  const links = [
    { label: "ORCID", value: profile?.orcid },
    { label: "Google Scholar", value: profile?.google_scholar },
    { label: "LinkedIn", value: profile?.linkedin_url },
    { label: "GitHub", value: profile?.github_url },
    { label: "Personal website", value: profile?.personal_website },
    { label: "Lab website", value: profile?.lab_website },
  ].filter((x) => x.value);

  const hasAnyProfileInfo =
    profile &&
    (profile.full_name ||
      profile.short_bio ||
      profile.role ||
      profile.affiliation ||
      profile.city ||
      profile.country ||
      profile.focus_areas ||
      profile.skills ||
      profile.highest_education ||
      profile.key_experience);

  const renderEntangleHeaderCTA = () => {
    if (!profile || profileLoading) return null;

    // If this is your own profile id
    if (isSelf) {
      return (
        <Link
          href="/profile"
          className="nav-ghost-btn"
          style={{
            padding: "6px 16px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.6)",
            fontSize: 13,
            textDecoration: "none",
            color: "#e5e7eb",
            whiteSpace: "nowrap",
          }}
        >
          View / edit my profile
        </Link>
      );
    }

    // Not logged in → simple login CTA
    if (!user) {
      return (
        <button
          type="button"
          className="nav-ghost-btn"
          onClick={() =>
            router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`)
          }
          style={{
            padding: "6px 16px",
            borderRadius: 999,
            border: "1px solid rgba(148,163,184,0.6)",
            fontSize: 13,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Sign in to entangle
        </button>
      );
    }

    if (!profileId) return null;

    const status = getConnectionStatus(profileId);
    const loading = isEntangleLoading(profileId);

    // Incoming request → Accept + Decline
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
            disabled={loading}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              background:
                "linear-gradient(90deg,#22c55e,#16a34a)",
              color: "#0f172a",
              fontSize: 12,
              fontWeight: 600,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {loading ? "…" : "Accept request"}
          </button>

          <button
            type="button"
            onClick={() => handleDeclineEntangle(profileId)}
            disabled={loading}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.7)",
              background: "transparent",
              color: "rgba(248,250,252,0.9)",
              fontSize: 12,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            Decline
          </button>
        </div>
      );
    }

    // Other states → single button with label
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
    } else if (status === "accepted") {
      label = "Entangled ✓";
      border = "1px solid rgba(74,222,128,0.7)";
      bg = "transparent";
      color = "rgba(187,247,208,0.95)";
      disabled = true;
    } else if (status === "declined") {
      // Allow sending again (handled in hook)
      label = "Entangle +";
    }

    return (
      <button
        type="button"
        onClick={() => handleEntangle(profileId)}
        disabled={loading || disabled}
        style={{
          padding: "6px 16px",
          borderRadius: 999,
          border,
          background: bg,
          color,
          fontSize: 12,
          cursor: loading || disabled ? "default" : "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          whiteSpace: "nowrap",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "…" : label}
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
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="profile-container">
            {/* Header with entangle CTA on top */}
            <div className="section-header" style={{ marginBottom: 18 }}>
              <div>
                <div className="section-title">Member profile</div>
                <div className="section-sub">
                  This is how this member appears inside Quantum5ocial.
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  flex: 1,
                }}
              >
                {renderEntangleHeaderCTA()}
              </div>
            </div>

            <div className="profile-summary-card">
              {profileLoading ? (
                <p className="profile-muted">Loading profile…</p>
              ) : profileError ? (
                <p className="profile-muted" style={{ color: "#f87171" }}>
                  {profileError}
                </p>
              ) : !hasAnyProfileInfo ? (
                <div>
                  <p
                    className="profile-muted"
                    style={{ marginBottom: 12 }}
                  >
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
                  {/* Top identity card (reusing same styling as My profile) */}
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
                      <div className="profile-name">{displayName}</div>

                      {(profile?.role || profile?.affiliation) && (
                        <div className="profile-role">
                          {[profile?.role, profile?.affiliation]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      )}

                      {(profile?.city || profile?.country) && (
                        <div className="profile-location">
                          {[profile?.city, profile?.country]
                            .filter(Boolean)
                            .join(", ")}
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

                  {/* Short bio */}
                  {profile?.short_bio && (
                    <p className="profile-bio">{profile.short_bio}</p>
                  )}

                  {/* Experience inline */}
                  {profile?.key_experience && (
                    <p className="profile-bio">
                      <span className="profile-section-label-inline">
                        Experience:
                      </span>{" "}
                      {profile.key_experience}
                    </p>
                  )}

                  {/* Two columns like My profile */}
                  <div className="profile-two-columns">
                    {/* LEFT COLUMN */}
                    <div className="profile-col">
                      {/* Affiliation */}
                      {profile?.affiliation && (
                        <div className="profile-summary-item">
                          <div className="profile-section-label">
                            Affiliation
                          </div>
                          <div className="profile-summary-text">
                            {profile.affiliation}
                          </div>
                        </div>
                      )}

                      {/* Focus areas */}
                      {focusTags.length > 0 && (
                        <div className="profile-summary-item">
                          <div className="profile-section-label">
                            Focus areas
                          </div>
                          <div className="profile-tags">
                            {focusTags.map((tag) => (
                              <span
                                key={tag}
                                className="profile-tag-chip"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* External links */}
                      {links.length > 0 && (
                        <div
                          className="profile-summary-item"
                          style={{ marginTop: 18 }}
                        >
                          <div className="profile-section-label">
                            Links
                          </div>
                          <ul
                            style={{
                              paddingLeft: 16,
                              fontSize: 13,
                              marginTop: 4,
                            }}
                          >
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

                    {/* RIGHT COLUMN */}
                    <div className="profile-col">
                      {/* Highest education */}
                      {profile?.highest_education && (
                        <div className="profile-summary-item">
                          <div className="profile-section-label">
                            Highest education
                          </div>
                          <div className="profile-summary-text">
                            {profile.highest_education}
                          </div>
                        </div>
                      )}

                      {/* Skills */}
                      {skillTags.length > 0 && (
                        <div className="profile-summary-item">
                          <div className="profile-section-label">
                            Skills
                          </div>
                          <div className="profile-tags">
                            {skillTags.map((tag) => (
                              <span
                                key={tag}
                                className="profile-tag-chip"
                              >
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
        </section>
      </div>
    </>
  );
}
