// pages/community.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

// Types
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

  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sidebar counters
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [savedProductsCount, setSavedProductsCount] = useState(0);
  const [entangledCount, setEntangledCount] = useState(0);

  // Search
  const [searchText, setSearchText] = useState("");

  // ----- Load current user summary -----
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return setProfileSummary(null);

      const { data } = await supabase
        .from("profiles")
        .select(`
          id, full_name, avatar_url, role,
          highest_education, affiliation, country, city
        `)
        .eq("id", user.id)
        .maybeSingle();

      setProfileSummary((data as ProfileSummary) || null);
    };
    loadProfile();
  }, [user]);

  // ----- Load sidebar counters -----
  useEffect(() => {
    if (!user) return;

    const loadCounts = async () => {
      const { count: jobsCount } = await supabase
        .from("saved_jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: productsCount } = await supabase
        .from("saved_products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: entCount } = await supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

      setSavedJobsCount(jobsCount || 0);
      setSavedProductsCount(productsCount || 0);
      setEntangledCount(entCount || 0);
    };

    loadCounts();
  }, [user]);

  // ----- Load all community profiles -----
  useEffect(() => {
    if (authLoading) return;

    const loadProfiles = async () => {
      setLoadingProfiles(true);

      let q = supabase
        .from("profiles")
        .select(`
          id, full_name, avatar_url, role, short_bio,
          highest_education, affiliation, country, city
        `)
        .order("full_name", { ascending: true });

      if (user?.id) q = q.neq("id", user.id);

      const { data, error } = await q;

      if (error) setError("Could not load community members.");
      else setProfiles((data || []) as CommunityProfile[]);

      setLoadingProfiles(false);
    };

    loadProfiles();
  }, [authLoading, user?.id]);

  // ---- Sidebar helper values ----
  const sidebarName =
    profileSummary?.full_name ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "User";

  const filteredProfiles = profiles.filter((p) => {
    const q = searchText.toLowerCase().trim();
    if (!q) return true;
    return (
      (
        `${p.full_name} ${p.role} ${p.affiliation} ${p.city} ${p.country} ${p.short_bio}`
      )
        .toLowerCase()
        .includes(q)
    );
  });

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* ========== LEFT SIDEBAR ========== */}
          <aside className="layout-left sticky-col" style={{ display: "flex", flexDirection: "column" }}>
            
            {/* PROFILE CARD */}
            <Link href="/profile" className="sidebar-card profile-sidebar-card">
              <div className="profile-sidebar-header">
                <div className="profile-sidebar-avatar-wrapper">
                  {profileSummary?.avatar_url ? (
                    <img
                      src={profileSummary.avatar_url}
                      alt="avatar"
                      className="profile-sidebar-avatar"
                    />
                  ) : (
                    <div className="profile-sidebar-avatar-placeholder">
                      {sidebarName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="profile-sidebar-name">{sidebarName}</div>
              </div>

              {/* optional details */}
              {(profileSummary?.role ||
                profileSummary?.highest_education ||
                profileSummary?.affiliation) && (
                <div className="profile-sidebar-info-block">
                  {profileSummary?.highest_education && (
                    <div className="profile-sidebar-info-value">
                      {profileSummary.highest_education}
                    </div>
                  )}
                  {profileSummary?.role && (
                    <div className="profile-sidebar-info-value">
                      {profileSummary.role}
                    </div>
                  )}
                  {profileSummary?.affiliation && (
                    <div className="profile-sidebar-info-value">
                      {profileSummary.affiliation}
                    </div>
                  )}
                </div>
              )}
            </Link>

            {/* QUICK DASHBOARD */}
            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>

              <div className="dashboard-sidebar-links">
                <Link href="/dashboard/entangled-states" className="dashboard-sidebar-link">
                  Entangled states ({entangledCount})
                </Link>

                <Link href="/dashboard/saved-jobs" className="dashboard-sidebar-link">
                  Saved jobs ({savedJobsCount})
                </Link>

                <Link href="/dashboard/saved-products" className="dashboard-sidebar-link">
                  Saved products ({savedProductsCount})
                </Link>
              </div>
            </div>

            {/* BRAND + SOCIAL ICONS */}
            <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(148,163,184,0.18)" }}>
              <div style={{ display: "flex", gap: 12 }}>
                <a href="mailto:info@quantum5ocial.com" style={{ color: "rgba(148,163,184,0.9)" }}>✉️</a>
                <a href="#" style={{ color: "rgba(148,163,184,0.9)" }}>𝕏</a>
                <a href="#" style={{ color: "rgba(148,163,184,0.9)" }}>🐙</a>
              </div>

              <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <img src="/Q5_white_bg.png" width={32} height={32} />
                <span
                  style={{
                    fontSize: 14,
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

          {/* ========== MIDDLE COLUMN (PARTIAL) ========== */}
          <section className="layout-main">
            <section className="section">

              {/* HEADER + SEARCH BAR */}
              <div className="community-main-header">
                <div className="section-header">
                  <div>
                    <div className="section-title">Quantum5ocial community</div>
                    <div className="section-sub">
                      Discover the quantum ecosystem and{" "}
                      <span style={{ color: "#7dd3fc" }}>entangle</span> with members.
                    </div>
                  </div>

                  {!loadingProfiles && !error && (
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                      {filteredProfiles.length} members
                    </div>
                  )}
                </div>

                {/* SEARCH BAR */}
                <div style={{ marginTop: 18 }}>
                  <div
                    style={{
                      width: "100%",
                      borderRadius: 999,
                      padding: 2,
                      background:
                        "linear-gradient(90deg,rgba(56,189,248,0.5),rgba(129,140,248,0.5))",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 999,
                        background: "rgba(15,23,42,0.97)",
                        padding: "6px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 14 }}>🔍</span>
                      <input
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        placeholder="Search by name, affiliation, country, role…"
                        style={{
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          color: "#e5e7eb",
                          width: "100%",
                          fontSize: 14,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* FEATURED MEMBER OF THE WEEK */}
              {!loadingProfiles &&
                !error &&
                filteredProfiles.length > 0 && (
                  <div
                    style={{
                      marginTop: 22,
                      marginBottom: 32,
                      padding: 18,
                      borderRadius: 16,
                      border: "1px solid rgba(168,85,247,0.35)",
                      background:
                        "radial-gradient(circle at top left,rgba(147,51,234,0.18),rgba(15,23,42,1))",
                    }}
                  >
                    <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div
                          style={{
                            fontSize: 11,
                            letterSpacing: "0.08em",
                            color: "#c084fc",
                            marginBottom: 4,
                          }}
                        >
                          Featured member
                        </div>
                        <div
                          style={{
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            background: "linear-gradient(90deg,#a855f7,#22d3ee)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                          }}
                        >
                          Profile of the week
                        </div>
                      </div>
                      <div style={{ fontSize: 24 }}>✨</div>
                    </div>

                    {/* FIRST PROFILE */}
                    {filteredProfiles[0] && (
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div
                          style={{
                            width: 56,
                            height: 56,
                            borderRadius: "999px",
                            overflow: "hidden",
                            border: "1px solid rgba(148,163,184,0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {filteredProfiles[0].avatar_url ? (
                            <img
                              src={filteredProfiles[0].avatar_url}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span style={{ fontSize: 18, color: "#e5e7eb" }}>
                              {filteredProfiles[0].full_name?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>

                        <div>
                          <div style={{ fontSize: "1rem", fontWeight: 600 }}>
                            {filteredProfiles[0].full_name}
                          </div>
                          <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                            {filteredProfiles[0].affiliation ||
                              [filteredProfiles[0].city, filteredProfiles[0].country]
                                .filter(Boolean)
                                .join(", ")}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                            {/* MAIN COMMUNITY LIST */}
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

              {!loadingProfiles && !error && filteredProfiles.length === 0 && (
                <div className="products-empty">
                  No members visible yet. As more users join Quantum5ocial,
                  they will appear here.
                </div>
              )}

              {!loadingProfiles && !error && filteredProfiles.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                    gap: 16,
                  }}
                >
                  {filteredProfiles.map((p) => {
                    const name = p.full_name || "Quantum5ocial member";
                    const initial = name.charAt(0).toUpperCase();
                    const highestEducation = p.highest_education || "—";
                    const role = p.role || "Quantum5ocial member";
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

          {/* ========== RIGHT SIDEBAR ========== */}
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
