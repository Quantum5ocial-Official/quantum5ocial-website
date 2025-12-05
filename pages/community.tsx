// pages/community.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

// What we need for the left sidebar
type ProfileSummary = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  highest_education: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

// What we need for each community card
type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  short_bio: string | null;
  highest_education: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

export default function CommunityPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- Load current user profile for left sidebar ----
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfileSummary(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            avatar_url,
            role,
            highest_education,
            affiliation,
            country,
            city
          `
        )
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfileSummary(data as ProfileSummary);
      } else {
        setProfileSummary(null);
      }
    };

    loadProfile();
  }, [user]);

  // ---- Load community profiles for middle column ----
  useEffect(() => {
    if (authLoading) return;

    const loadProfiles = async () => {
      setLoadingProfiles(true);
      setError(null);

      try {
        let query = supabase
          .from("profiles")
          .select(
            `
              id,
              full_name,
              avatar_url,
              role,
              short_bio,
              highest_education,
              affiliation,
              country,
              city
            `
          )
          .order("full_name", { ascending: true });

        // exclude current user from list (they are in sidebar)
        if (user?.id) {
          query = query.neq("id", user.id);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error loading profiles:", error);
          setError("Could not load community members.");
          setProfiles([]);
        } else {
          setProfiles((data || []) as CommunityProfile[]);
        }
      } catch (e: any) {
        console.error("Community load crashed:", e);
        setError("Something went wrong while loading the community.");
        setProfiles([]);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadProfiles();
  }, [authLoading, user?.id]);

  // ==== helpers for sidebar ====
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarFullName =
    profileSummary?.full_name || fallbackName || "Your profile";

  const avatarUrl = profileSummary?.avatar_url || null;
  const educationLevel = profileSummary?.highest_education || "";
  const describesYou = profileSummary?.role || "";
  const affiliation =
    profileSummary?.affiliation ||
    [profileSummary?.city, profileSummary?.country]
      .filter(Boolean)
      .join(", ") ||
    "";

  const hasProfileExtraInfo =
    Boolean(educationLevel) || Boolean(describesYou) || Boolean(affiliation);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* ========== LEFT SIDEBAR ========== */}
          <aside
            className="layout-left sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {/* Profile card – clickable, goes to My profile */}
            <Link
              href="/profile"
              className="sidebar-card profile-sidebar-card"
              style={{
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <div className="profile-sidebar-header">
                <div className="profile-sidebar-avatar-wrapper">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={sidebarFullName}
                      className="profile-sidebar-avatar"
                    />
                  ) : (
                    <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                      {sidebarFullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-sidebar-name">{sidebarFullName}</div>
              </div>

              {hasProfileExtraInfo && (
                <div className="profile-sidebar-info-block">
                  {educationLevel && (
                    <div className="profile-sidebar-info-value">
                      {educationLevel}
                    </div>
                  )}
                  {describesYou && (
                    <div
                      className="profile-sidebar-info-value"
                      style={{ marginTop: 4 }}
                    >
                      {describesYou}
                    </div>
                  )}
                  {affiliation && (
                    <div
                      className="profile-sidebar-info-value"
                      style={{ marginTop: 4 }}
                    >
                      {affiliation}
                    </div>
                  )}
                </div>
              )}
            </Link>

            {/* Quick dashboard card */}
            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>
              <div className="dashboard-sidebar-links">
                <Link
                  href="/dashboard/entangled-states"
                  className="dashboard-sidebar-link"
                >
                  Entangled states
                </Link>
                <Link
                  href="/dashboard/saved-jobs"
                  className="dashboard-sidebar-link"
                >
                  Saved jobs
                </Link>
                <Link
                  href="/dashboard/saved-products"
                  className="dashboard-sidebar-link"
                >
                  Saved products
                </Link>
              </div>
            </div>

            {/* Social icons + brand logo/name */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 16,
                borderTop: "1px solid rgba(148,163,184,0.18)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* Icons row */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  fontSize: 18,
                  alignItems: "center",
                }}
              >
                {/* Email */}
                <a
                  href="mailto:info@quantum5ocial.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Email Quantum5ocial"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
                    <polyline points="3 7 12 13 21 7" />
                  </svg>
                </a>

                {/* X */}
                <a
                  href="#" // TODO: add real link
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Quantum5ocial on X"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4l8 9.5L20 4" />
                    <path d="M4 20l6.5-7.5L20 20" />
                  </svg>
                </a>

                {/* GitHub */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Quantum5ocial on GitHub"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.84 9.68.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.49.55-3.01-1.09-3.01-1.09-.45-1.17-1.11-1.48-1.11-1.48-.9-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.35-1.99-.23-4.09-1.03-4.09-4.6 0-1.02.35-1.85.93-2.5-.09-.23-.4-1.16.09-2.42 0 0 .75-.25 2.46.95A8.23 8.23 0 0 1 12 6.84c.76 0 1.53.1 2.25.29 1.7-1.2 2.45-.95 2.45-.95.5 1.26.19 2.19.09 2.42.58.65.93 1.48.93 2.5 0 3.58-2.11 4.37-4.12 4.6.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.04 10.04 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
                  </svg>
                </a>
              </div>

              {/* Brand row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <img
                  src="/Q5_white_bg.png"
                  alt="Quantum5ocial logo"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    objectFit: "contain",
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Quantum5ocial
                </span>
              </div>
            </div>
          </aside>

          {/* ========== MIDDLE COLUMN – COMMUNITY LIST ========== */}
          <section className="layout-main">
            <section className="section">
              <div className="section-header">
                <div>
                  <div className="section-title">Quantum5ocial community</div>
                  <div className="section-sub">
                    Discover members of the quantum ecosystem and{" "}
                    <span style={{ color: "#7dd3fc" }}>entangle</span> with
                    them.
                  </div>
                </div>
                {!loadingProfiles && !error && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {profiles.length} member
                    {profiles.length === 1 ? "" : "s"} listed
                  </div>
                )}
              </div>

              {loadingProfiles && (
                <div className="products-status">
                  Loading community members…
                </div>
              )}

              {error && !loadingProfiles && (
                <div
                  className="products-status"
                  style={{ color: "#f87171" }}
                >
                  {error}
                </div>
              )}

              {!loadingProfiles && !error && profiles.length === 0 && (
                <div className="products-empty">
                  No members visible yet. As more users join Quantum5ocial,
                  they will appear here.
                </div>
              )}

              {!loadingProfiles && !error && profiles.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                    gap: 16,
                  }}
                >
                  {profiles.map((p) => {
                    const name = p.full_name || "Quantum5ocial member";
                    const initial = name.charAt(0).toUpperCase();

                    const highestEducation =
                      p.highest_education || "—";

                    const role =
                      p.role || "Quantum5ocial member";

                    const location = [p.city, p.country]
                      .filter(Boolean)
                      .join(", ");

                    const affiliationLine =
                      p.affiliation || location || "—";

                    const shortBio =
                      p.short_bio ||
                      (p.affiliation
                        ? `Member of the quantum ecosystem at ${p.affiliation}.`
                        : "Quantum5ocial community member exploring the quantum ecosystem.");

                    return (
                      <div
                        key={p.id}
                        className="card"
                        style={{
                          textDecoration: "none",
                          padding: 14,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          minHeight: 230,
                        }}
                      >
                        <div className="card-inner">
                          {/* Top row: avatar + name */}
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 52,
                                height: 52,
                                borderRadius: "999px",
                                overflow: "hidden",
                                flexShrink: 0,
                                border:
                                  "1px solid rgba(148,163,184,0.4)",
                                background: "rgba(15,23,42,0.9)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 18,
                                fontWeight: 600,
                                color: "#e5e7eb",
                              }}
                            >
                              {p.avatar_url ? (
                                <img
                                  src={p.avatar_url}
                                  alt={name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              ) : (
                                <span>{initial}</span>
                              )}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div
                                className="card-title"
                                style={{
                                  marginBottom: 2,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {name}
                              </div>
                              <div
                                className="card-meta"
                                style={{ fontSize: 12, lineHeight: 1.4 }}
                              >
                                {role}
                              </div>
                            </div>
                          </div>

                          {/* Middle info block */}
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              marginTop: 6,
                            }}
                          >
                            <div>
                              <span style={{ opacity: 0.7 }}>
                                Education:{" "}
                              </span>
                              <span>{highestEducation}</span>
                            </div>
                            <div>
                              <span style={{ opacity: 0.7 }}>
                                Affiliation:{" "}
                              </span>
                              <span>{affiliationLine}</span>
                            </div>
                            <div>
                              <span style={{ opacity: 0.7 }}>Role: </span>
                              <span>{role}</span>
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                lineHeight: 1.4,
                                maxHeight: 60,
                                overflow: "hidden",
                              }}
                            >
                              {shortBio}
                            </div>
                          </div>
                        </div>

                        {/* Bottom: Entangle button */}
                        <div style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            style={{
                              width: "100%",
                              padding: "7px 0",
                              borderRadius: 10,
                              border:
                                "1px solid rgba(59,130,246,0.6)",
                              background: "rgba(59,130,246,0.16)",
                              color: "#bfdbfe",
                              fontSize: 12,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                            }}
                            onClick={() => {
                              console.log("Entangle with", p.id);
                            }}
                          >
                            <span>Entangle</span>
                            <span style={{ fontSize: 14 }}>+</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </section>

          {/* ========== RIGHT SIDEBAR – HIGHLIGHTED TILES ========== */}
          <aside
            className="layout-right sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div className="hero-tiles hero-tiles-vertical">
              {/* Highlighted jobs */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">
                      Quantum roles spotlight
                    </div>
                    <div className="tile-icon-orbit">🧪</div>
                  </div>
                  <p className="tile-text">
                    This tile will later showcase a curated quantum job or
                    role from the marketplace – ideal to show during demos.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Example: PhD position</span>
                    <span className="tile-pill">Location</span>
                    <span className="tile-pill">Lab / company</span>
                  </div>
                  <div className="tile-cta">
                    Jobs spotlight <span>›</span>
                  </div>
                </div>
              </div>

              {/* Highlighted products */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">
                      Quantum product of the week
                    </div>
                    <div className="tile-icon-orbit">🔧</div>
                  </div>
                  <p className="tile-text">
                    This tile will highlight one selected hardware, software,
                    or service from the Quantum Products Lab.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Example: Cryo system</span>
                    <span className="tile-pill">Control electronics</span>
                    <span className="tile-pill">Software suite</span>
                  </div>
                  <div className="tile-cta">
                    Product spotlight <span>›</span>
                  </div>
                </div>
              </div>

              {/* Highlighted talent */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">
                      Featured quantum talent
                    </div>
                    <div className="tile-icon-orbit">🤝</div>
                  </div>
                  <p className="tile-text">
                    Later this tile can feature a standout community member –
                    for example a PI, postdoc, or startup founder.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Example: Role</span>
                    <span className="tile-pill">Field</span>
                    <span className="tile-pill">Affiliation</span>
                  </div>
                  <div className="tile-cta">
                    Talent spotlight <span>›</span>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: "auto",
                paddingTop: 12,
                borderTop: "1px solid rgba(148,163,184,0.18)",
                fontSize: 12,
                color: "rgba(148,163,184,0.9)",
                textAlign: "right",
              }}
            >
              © 2025 Quantum5ocial
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
