// pages/community.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
};

type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  role?: string | null;
  affiliation?: string | null;
  short_bio?: string | null;
  describes_you?: string | null;
  current_org?: string | null;
  education_level?: string | null;
};

export default function CommunityPage() {
  const { user } = useSupabaseUser();

  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [members, setMembers] = useState<CommunityProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // === LOAD CURRENT USER PROFILE FOR LEFT SIDEBAR ===
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfileSummary(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
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

  // === LOAD COMMUNITY MEMBERS ===
  useEffect(() => {
    const loadMembers = async () => {
      setLoadingMembers(true);

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, highest_education, role, affiliation, short_bio, describes_you, current_org, education_level"
        )
        .order("created_at", { ascending: false })
        .limit(60); // adjust if you want more

      if (!error && data) {
        setMembers(data as CommunityProfile[]);
      } else {
        setMembers([]);
      }
      setLoadingMembers(false);
    };

    loadMembers();
  }, []);

  // === HELPERS ===
  const formatMemberMeta = (m: CommunityProfile) => {
    const highestEdu =
      m.highest_education || m.education_level || undefined;
    const role = m.role || m.describes_you || undefined;
    const aff = m.affiliation || m.current_org || undefined;
    return [highestEdu, role, aff].filter(Boolean).join(" · ");
  };

  // Fallback / sidebar name
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarFullName =
    profileSummary?.full_name || fallbackName || "Your profile";

  const avatarUrl = profileSummary?.avatar_url || null;
  const educationLevel =
    (profileSummary as any)?.education_level ||
    (profileSummary as any)?.highest_education ||
    "";
  const describesYou =
    (profileSummary as any)?.describes_you ||
    (profileSummary as any)?.role ||
    "";
  const affiliation =
    (profileSummary as any)?.affiliation ||
    (profileSummary as any)?.current_org ||
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
          {/* LEFT SIDEBAR – same pattern as homepage */}
          <aside
            className="layout-left sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {/* Profile card */}
            <div className="sidebar-card profile-sidebar-card">
              {/* (no "Your profile" label to keep it clean) */}
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

              {/* Only show lines if user actually filled them */}
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

            {/* Quick dashboard links */}
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

            {/* Left footer with socials + brand, same vibe as home */}
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

          {/* MIDDLE COLUMN – community profiles */}
          <section className="layout-main">
            <section className="hero" id="community-hero">
              <div>
                <div className="eyebrow">Quantum community</div>
                <h1 className="hero-title">
                  Discover{" "}
                  <span className="hero-highlight">people in quantum</span>{" "}
                  across labs, startups, and industry.
                </h1>
                <p className="hero-sub">
                  Browse profiles of students, researchers, and professionals,
                  and grow your network of entangled states.
                </p>
              </div>
            </section>

            <section className="section">
              <div className="section-header">
                <div>
                  <div className="section-title">Community directory</div>
                  <div className="section-sub">
                    Recently active and newly joined members.
                  </div>
                </div>
              </div>

              {loadingMembers ? (
                <div className="products-status">Loading community…</div>
              ) : members.length === 0 ? (
                <div className="products-empty">
                  No community members visible yet.
                </div>
              ) : (
                <div
                  className="card-row"
                  style={{
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(260px, 1fr))", // usually 2 columns on desktop
                  }}
                >
                  {members.map((m) => {
                    const name = m.full_name || "Quantum member";
                    const firstName =
                      typeof name === "string"
                        ? name.split(" ")[0] || name
                        : "Member";
                    const meta = formatMemberMeta(m);
                    const bio =
                      m.short_bio || (m as any).short_description || "";

                    return (
                      <div key={m.id} className="card">
                        <div
                          className="card-inner"
                          style={{
                            display: "flex",
                            gap: 14,
                            alignItems: "flex-start",
                          }}
                        >
                          {/* avatar */}
                          <div
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: "999px",
                              overflow: "hidden",
                              border: "1px solid rgba(148,163,184,0.5)",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background:
                                "linear-gradient(135deg,#3bc7f3,#8468ff)",
                              color: "#fff",
                              fontWeight: 600,
                            }}
                          >
                            {m.avatar_url ? (
                              <img
                                src={m.avatar_url}
                                alt={firstName}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              firstName.charAt(0).toUpperCase()
                            )}
                          </div>

                          {/* text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="card-title">{name}</div>
                            {meta && (
                              <div
                                className="card-meta"
                                style={{ marginTop: 2 }}
                              >
                                {meta}
                              </div>
                            )}
                            {bio && (
                              <div
                                className="card-footer-text"
                                style={{ marginTop: 6 }}
                              >
                                {bio.length > 90
                                  ? bio.slice(0, 87) + "..."
                                  : bio}
                              </div>
                            )}
                            <button
                              type="button"
                              style={{
                                marginTop: 10,
                                padding: "5px 10px",
                                borderRadius: 999,
                                border:
                                  "1px solid rgba(148,163,184,0.7)",
                                background: "transparent",
                                color: "#7dd3fc",
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              + Entangle
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </section>

          {/* RIGHT SIDEBAR – featured tiles / ads */}
          <aside
            className="layout-right sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div className="hero-tiles hero-tiles-vertical">
              {/* Tile 1: Featured labs */}
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

              {/* Tile 2: Hire talent */}
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

              {/* Tile 3: Products / ads */}
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

            {/* Right footer */}
            <div className="home-right-footer">
              © {new Date().getFullYear()} Quantum5ocial · All rights
              reserved
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
