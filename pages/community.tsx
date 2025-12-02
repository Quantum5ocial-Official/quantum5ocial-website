// pages/community.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education: string | null;
  affiliation: string | null;
  role: string | null;
  short_bio: string | null;
};

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
  role?: string | null;          // 
};

export default function CommunityPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileSummary, setProfileSummary] =
    useState<ProfileSummary | null>(null);

  /** ===== LOAD COMMUNITY MEMBERS ===== */
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

        if (user?.id) query = query.neq("id", user.id);

        const { data, error } = await query;

        if (error) {
          console.error("Error loading profiles:", error);
          setError("Could not load community members.");
        } else {
          setProfiles((data || []) as Profile[]);
        }
      } catch (e) {
        console.error("Community load crashed:", e);
        setError("Something went wrong while loading the community.");
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [authLoading, user?.id]);

  /** ===== LOAD CURRENT USER FOR LEFT SIDEBAR ===== */
  useEffect(() => {
    const loadProfileSummary = async () => {
      if (!user) return setProfileSummary(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setProfileSummary(!error && data ? (data as ProfileSummary) : null);
    };

    loadProfileSummary();
  }, [user]);

  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarFullName = profileSummary?.full_name || fallbackName;
  const avatarUrl = profileSummary?.avatar_url || null;

  const educationLevel =
    profileSummary?.education_level ||
    profileSummary?.highest_education ||
    "";
  const describesYou = profileSummary?.describes_you || profileSummary?.role || "";
  const affiliationSidebar =
    profileSummary?.affiliation || profileSummary?.current_org || "";

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        {/* === 3 COLUMN LAYOUT === */}
        <main className="layout-3col">
          {/* LEFT SIDEBAR */}
          <aside className="layout-left sticky-col" style={{ display: "flex", flexDirection: "column" }}>
            {/* --- Profile card --- */}
            <div className="sidebar-card profile-sidebar-card">
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

              {/* Only show if filled */}
              <div className="profile-sidebar-info-block">
                {educationLevel && (
                  <div className="profile-sidebar-info-value">{educationLevel}</div>
                )}
                {describesYou && (
                  <div
                    className="profile-sidebar-info-value"
                    style={{ marginTop: 4 }}
                  >
                    {describesYou}
                  </div>
                )}
                {affiliationSidebar && (
                  <div
                    className="profile-sidebar-info-value"
                    style={{ marginTop: 4 }}
                  >
                    {affiliationSidebar}
                  </div>
                )}
              </div>

              <Link href="/profile" className="sidebar-btn">
                View / edit profile
              </Link>
            </div>

            {/* --- Quick dashboard card --- */}
            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>

              <div className="dashboard-sidebar-links">
                <Link href="/dashboard" className="dashboard-sidebar-link">
                  Overview
                </Link>
                <Link
                  href="/dashboard/entangled"
                  className="dashboard-sidebar-link"
                >
                  Entangled states
                </Link>
                <Link href="/dashboard/saved-jobs" className="dashboard-sidebar-link">
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

            {/* --- Social icons + Brand footer --- */}
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
              {/* Icons */}
              <div style={{ display: "flex", gap: 12, fontSize: 18 }}>
                <a
                  href="mailto:info@quantum5ocial.com"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  ✉️
                </a>
                <a href="#" style={{ color: "rgba(148,163,184,0.9)" }}>
                  ✖️
                </a>
                <a href="#" style={{ color: "rgba(148,163,184,0.9)" }}>
                  🐱
                </a>
              </div>

              {/* Brand row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img
                  src="/Q5_white_bg.png"
                  alt="Quantum5ocial"
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
                    {/* ===========================
              MIDDLE COLUMN (COMMUNITY LIST)
              =========================== */}
          <section className="layout-main">
            <div className="section-header" style={{ marginBottom: 20 }}>
              <div>
                <div className="section-title">Quantum5ocial community</div>
                <div className="section-sub">
                  Discover members of the quantum ecosystem and{" "}
                  <span style={{ color: "#7dd3fc" }}>entangle</span> with them.
                </div>
              </div>

              {!loading && !error && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "var(--text-muted)",
                  }}
                >
                  {profiles.length} member{profiles.length === 1 ? "" : "s"}
                </div>
              )}
            </div>

            {/* LOADING */}
            {loading && (
              <div className="products-status">Loading community members…</div>
            )}

            {/* ERROR */}
            {error && !loading && (
              <div className="products-status" style={{ color: "#f87171" }}>
                {error}
              </div>
            )}

            {/* EMPTY */}
            {!loading && !error && profiles.length === 0 && (
              <div className="products-empty">
                No members visible yet. As more users join Quantum5ocial, they will
                appear here.
              </div>
            )}

            {/* ===== Community Profiles in 2 Columns ===== */}
            {!loading && !error && profiles.length > 0 && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: "18px",
                }}
              >
                {profiles.map((p) => {
                  const name = p.full_name || "Quantum5ocial member";
                  const initial = name.charAt(0).toUpperCase();

                  const education = p.highest_education || null;
                  const affiliation = p.affiliation || null;
                  const role = p.role || null;
                  const shortBio =
                    p.short_bio ||
                    "Quantum5ocial community member exploring the quantum ecosystem.";

                  return (
                    <div
                      key={p.id}
                      className="card"
                      style={{
                        padding: 16,
                        minHeight: 240,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <div className="card-inner">
                        {/* --- Top row --- */}
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
                              width: 56,
                              height: 56,
                              borderRadius: "999px",
                              overflow: "hidden",
                              border: "1px solid rgba(148,163,184,0.4)",
                              background: "rgba(15,23,42,0.9)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                              fontSize: 18,
                              fontWeight: 600,
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
                            {role && (
                              <div
                                className="card-meta"
                                style={{ fontSize: 12, lineHeight: 1.4 }}
                              >
                                {role}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* --- Middle block --- */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 4,
                            fontSize: 12,
                            marginTop: 6,
                            color: "var(--text-muted)",
                          }}
                        >
                          {education && <div>{education}</div>}
                          {affiliation && <div>{affiliation}</div>}
                          {role && <div>{role}</div>}

                          <div
                            style={{
                              marginTop: 6,
                              lineHeight: 1.4,
                              maxHeight: 58,
                              overflow: "hidden",
                            }}
                          >
                            {shortBio}
                          </div>
                        </div>
                      </div>

                      {/* --- Entangle button --- */}
                      <div style={{ marginTop: 12 }}>
                        <button
                          type="button"
                          style={{
                            width: "100%",
                            padding: "7px 0",
                            borderRadius: 10,
                            border: "1px solid rgba(59,130,246,0.6)",
                            background: "rgba(59,130,246,0.16)",
                            color: "#c7e4ff",
                            fontSize: 12,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
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

          {/* ===========================
              RIGHT SIDEBAR (STATIC TILES)
              =========================== */}
          <aside
            className="layout-right sticky-col"
            style={{ display: "flex", flexDirection: "column", gap: 18 }}
          >
            <div className="hero-tiles-vertical">

              {/* ---- TILE 1: Highlighted Jobs ---- */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Featured</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Highlighted quantum jobs</div>
                    <div className="tile-icon-orbit">💼</div>
                  </div>
                  <div className="tile-text">
                    The most competitive & exciting roles curated globally.
                  </div>
                </div>
              </div>

              {/* ---- TILE 2: Highlighted Products ---- */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Featured</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Highlighted quantum products</div>
                    <div className="tile-icon-orbit">🔧</div>
                  </div>
                  <div className="tile-text">
                    State-of-the-art hardware powering quantum research.
                  </div>
                </div>
              </div>

              {/* ---- TILE 3: Highlighted Quantum Talent ---- */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Talent</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Highlighted quantum talent</div>
                    <div className="tile-icon-orbit">⭐</div>
                  </div>
                  <div className="tile-text">
                    Brilliant researchers & engineers worth discovering.
                  </div>
                </div>
              </div>
            </div>

            {/* ---- FOOTER RIGHT ---- */}
            <div className="home-right-footer">
              © 2025 Quantum5ocial · All rights reserved
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
