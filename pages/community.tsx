// pages/community.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type SidebarProfile = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
};

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education: string | null;
  affiliation: string | null;
  role: string | null;
  short_bio: string | null;
};

export default function CommunityPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  // LEFT SIDEBAR PROFILE
  const [sidebarProfile, setSidebarProfile] = useState<SidebarProfile | null>(
    null
  );

  // COMMUNITY MEMBERS (MIDDLE COLUMN)
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // === LOAD SIDEBAR PROFILE ===
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setSidebarProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setSidebarProfile(data as SidebarProfile);
      } else {
        setSidebarProfile(null);
      }
    };

    loadProfile();
  }, [user]);

  // === LOAD COMMUNITY MEMBERS (OLD LOGIC) ===
  useEffect(() => {
    if (authLoading) return;

    const loadProfiles = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, highest_education, affiliation, role, short_bio"
          )
          .order("full_name", { ascending: true });

        if (user?.id) {
          query = query.neq("id", user.id); // hide current user
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error loading profiles:", error);
          setError("Could not load community members.");
          setProfiles([]);
        } else {
          setProfiles((data || []) as Profile[]);
        }
      } catch (e: any) {
        console.error("Community load crashed:", e);
        setError("Something went wrong while loading the community.");
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [authLoading, user?.id]);

  // === SIDEBAR HELPERS ===
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarFullName =
    sidebarProfile?.full_name || fallbackName || "Your profile";

  const avatarUrl = sidebarProfile?.avatar_url || null;
  const educationLevel =
    (sidebarProfile as any)?.education_level ||
    (sidebarProfile as any)?.highest_education ||
    "";
  const describesYou =
    (sidebarProfile as any)?.describes_you ||
    (sidebarProfile as any)?.role ||
    "";
  const affiliation =
    (sidebarProfile as any)?.affiliation ||
    (sidebarProfile as any)?.current_org ||
    "";

  const hasSidebarInfo =
    Boolean(educationLevel) ||
    Boolean(describesYou) ||
    Boolean(affiliation);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* ========== LEFT COLUMN (same as before, no placeholders) ========== */}
          <aside
            className="layout-left sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {/* Profile card */}
            <div className="sidebar-card profile-sidebar-card">
              {/* no "Your profile" label */}
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

              {/* only show if user has actually filled something */}
              {hasSidebarInfo && (
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

              <Link href="/profile" className="sidebar-btn">
                View / edit profile
              </Link>
            </div>

            {/* Quick dashboard */}
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

            {/* Footer: icons + brand */}
            <div className="home-left-footer">
              <div className="footer-social-row">
                <a
                  href="mailto:info@quantum5ocial.com"
                  aria-label="Email Quantum5ocial"
                >
                  ✉️
                </a>
                <a href="#" aria-label="Quantum5ocial on X">
                  𝕏
                </a>
                <a href="#" aria-label="Quantum5ocial on GitHub">
                  GH
                </a>
              </div>
              <div className="footer-brand-row">
                <img
                  src="/Q5_white_bg.png"
                  alt="Quantum5ocial logo"
                  className="footer-brand-logo"
                />
                <span className="footer-brand-name">Quantum5ocial</span>
              </div>
            </div>
          </aside>

          {/* ========== MIDDLE COLUMN (OLD COMMUNITY CARDS, 2-COL GRID) ========== */}
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
                {!loading && !error && (
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

              {loading && (
                <div className="products-status">
                  Loading community members…
                </div>
              )}

              {error && !loading && (
                <div className="products-status" style={{ color: "#f87171" }}>
                  {error}
                </div>
              )}

              {!loading && !error && profiles.length === 0 && (
                <div className="products-empty">
                  No members visible yet. As more users join Quantum5ocial, they
                  will appear here.
                </div>
              )}

              {!loading && !error && profiles.length > 0 && (
                <div
                  className="card-row"
                  // force 2 columns instead of the default 3
                  style={{
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  }}
                >
                  {profiles.map((p) => {
                    const name = p.full_name || "Quantum5ocial member";
                    const initial = name.charAt(0).toUpperCase();

                    const highestEducation = p.highest_education || "—";
                    const affiliation = p.affiliation || "—";
                    const role = p.role || "—";
                    const shortBio =
                      p.short_bio ||
                      "Quantum5ocial community member exploring the quantum ecosystem.";

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
                                {role !== "—"
                                  ? role
                                  : "Quantum5ocial member"}
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
                              <span>{affiliation}</span>
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
                              // placeholder – real entangle logic later
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

          {/* ========== RIGHT COLUMN (tiles + footer, same style as before) ========== */}
          <aside
            className="layout-right sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div className="hero-tiles hero-tiles-vertical">
              {/* featured labs */}
              <Link href="/products" className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Featured</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Highlighted labs & groups</div>
                    <div className="tile-icon-orbit">🔬</div>
                  </div>
                  <p className="tile-text">
                    Discover selected academic groups and research institutes
                    actively hiring or collaborating.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Superconducting</span>
                    <span className="tile-pill">Trapped ions</span>
                    <span className="tile-pill">Photonic</span>
                  </div>
                  <div className="tile-cta">
                    View featured labs <span>›</span>
                  </div>
                </div>
              </Link>

              {/* hire talent */}
              <Link href="/jobs" className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">For hiring PIs & teams</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Hire quantum talent</div>
                    <div className="tile-icon-orbit">🧠</div>
                  </div>
                  <p className="tile-text">
                    Post roles and reach a focused pool of candidates already
                    immersed in quantum technologies.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Post a role</span>
                    <span className="tile-pill">Targeted audience</span>
                    <span className="tile-pill">Global reach</span>
                  </div>
                  <div className="tile-cta">
                    Go to jobs <span>›</span>
                  </div>
                </div>
              </Link>

              {/* products / ads */}
              <Link href="/products" className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Vendors & tools</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum Products Lab</div>
                    <div className="tile-icon-orbit">🧰</div>
                  </div>
                  <p className="tile-text">
                    Promote your hero products – from cryo hardware and control
                    electronics to software and services.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Hardware</span>
                    <span className="tile-pill">Control &amp; readout</span>
                    <span className="tile-pill">Software</span>
                  </div>
                  <div className="tile-cta">
                    Browse products <span>›</span>
                  </div>
                </div>
              </Link>
            </div>

            <div className="home-right-footer">
              © {new Date().getFullYear()} Quantum5ocial · All rights reserved
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
