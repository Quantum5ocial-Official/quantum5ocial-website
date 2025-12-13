// pages/profile.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";
import { useEntanglements } from "../lib/useEntanglements";

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
  institutional_email: string | null;

  institutional_email_verified?: boolean | null;
  email?: string | null;
  provider?: string | null;
  raw_metadata?: any;
};

export default function ProfileViewPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Initialize shared entanglement logic (no UI here, just consistency / future use)
  useEntanglements({
    user,
    redirectPath: "/profile",
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/profile");
    }
  }, [loading, user, router]);

  // Load profile from Supabase
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
            institutional_email,
            institutional_email_verified,
            email,
            provider,
            raw_metadata
          `
        )
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile", error);
        setProfile(null);
      } else if (data) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
      }

      setProfileLoading(false);
    };

    if (user) loadProfile();
  }, [user]);

  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const displayName = profile?.full_name || fallbackName;

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

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
      profile.key_experience ||
      profile.institutional_email);

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

  if (!user && !loading) return null;

  return (
    <section className="section">
      <div className="profile-container">
        {/* Page header */}
        <div className="section-header" style={{ marginBottom: 18 }}>
          <div>
            <div className="section-title">My profile</div>
            <div className="section-sub">
              This is how you appear inside Quantum5ocial.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", flex: 1 }}>
            <Link
              href="/profile/edit"
              className="nav-ghost-btn"
              style={{
                ...editLinkStyle,
                maxWidth: "200px",
                width: "auto",
                textAlign: "center",
                padding: "8px 20px",
              }}
            >
              Edit / complete profile
            </Link>
          </div>
        </div>

        <div className="profile-summary-card">
          {profileLoading ? (
            <p className="profile-muted">Loading your profile…</p>
          ) : !hasAnyProfileInfo ? (
            <div>
              <p className="profile-muted" style={{ marginBottom: 12 }}>
                You haven&apos;t filled in your profile yet. A complete profile
                helps labs, companies, and collaborators know who you are in the
                quantum ecosystem.
              </p>
              <Link href="/profile/edit" className="nav-cta">
                Complete your profile
              </Link>
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
                    <span>{initials || "Q5"}</span>
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

                  {profile?.institutional_email && (
                    <div className="profile-location">
                      Verified email: {profile.institutional_email}
                    </div>
                  )}

                  <div style={{ marginTop: 12 }}>
                    <Link
                      href="/profile/edit"
                      className="nav-ghost-btn"
                      style={editLinkStyle}
                    >
                      Edit / complete your profile
                    </Link>
                  </div>
                </div>
              </div>

              {/* Short bio */}
              {profile?.short_bio && <p className="profile-bio">{profile.short_bio}</p>}

              {/* Experience inline */}
              {profile?.key_experience && (
                <p className="profile-bio">
                  <span className="profile-section-label-inline">Experience:</span>{" "}
                  {profile.key_experience}
                </p>
              )}

              {/* Two-column layout */}
              <div className="profile-two-columns">
                {/* LEFT COLUMN */}
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

                {/* RIGHT COLUMN */}
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
    </section>
  );
}

(ProfileViewPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
