// pages/dashboard/saved-jobs.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import { useRouter } from "next/router";

// Reuse Navbar
const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

// Sidebar profile fields
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

// Saved job row (with nested job)
type SavedJob = {
  id: string;
  job: {
    id: string;
    title: string;
    organisation_name: string | null;
    location_text: string | null;
    job_type: string | null;
    salary_text: string | null;
    short_description: string | null;
  } | null;
};

export default function SavedJobsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  // Sidebar
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [savedProductsCount, setSavedProductsCount] = useState(0);
  const [entangledCount, setEntangledCount] = useState(0);

  // Saved jobs list
  const [saved, setSaved] = useState<SavedJob[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // --------------------------
  // Redirect non-logged users
  // --------------------------
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard/saved-jobs");
    }
  }, [loading, user, router]);

  // --------------------------
  // Load sidebar profile
  // --------------------------
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select(
          `
          id, full_name, avatar_url, role,
          highest_education, affiliation, country, city
        `
        )
        .eq("id", user.id)
        .maybeSingle();

      setProfileSummary(data || null);
    };

    loadProfile();
  }, [user]);

  // --------------------------
  // Load sidebar counters
  // --------------------------
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

  // --------------------------
  // Load saved jobs
  // --------------------------
  useEffect(() => {
    if (!user) return;

    const loadSaved = async () => {
      setLoadingSaved(true);

      const { data } = await supabase
        .from("saved_jobs")
        .select("id, job:jobs(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setSaved((data as SavedJob[]) || []);
      setLoadingSaved(false);
    };

    loadSaved();
  }, [user]);

  // ==========================
  // Render
  // ==========================

  const sidebarName =
    profileSummary?.full_name ||
    user?.email?.split("@")[0] ||
    "Your profile";

  const avatarUrl = profileSummary?.avatar_url || null;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* -------------------------------------- */}
          {/* LEFT SIDEBAR (same as community) */}
          {/* -------------------------------------- */}
          <aside className="layout-left sticky-col" style={{ display: "flex", flexDirection: "column" }}>
            {/* Profile card */}
            <Link href="/profile" className="sidebar-card profile-sidebar-card">
              <div className="profile-sidebar-header">
                <div className="profile-sidebar-avatar-wrapper">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={sidebarName} className="profile-sidebar-avatar" />
                  ) : (
                    <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                      {sidebarName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-sidebar-name">{sidebarName}</div>
              </div>

              <div className="profile-sidebar-info-block">
                {profileSummary?.role && (
                  <div className="profile-sidebar-info-value">{profileSummary.role}</div>
                )}
                {profileSummary?.affiliation && (
                  <div className="profile-sidebar-info-value">{profileSummary.affiliation}</div>
                )}
              </div>
            </Link>

            {/* Dashboard quick links */}
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

            {/* Footer social */}
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
              <div style={{ display: "flex", gap: 12, fontSize: 18 }}>
                <a style={{ color: "rgba(148,163,184,0.9)" }} href="mailto:info@quantum5ocial.com">
                  ✉️
                </a>
                <a style={{ color: "rgba(148,163,184,0.9)" }} href="#">
                  𝕏
                </a>
                <a style={{ color: "rgba(148,163,184,0.9)" }} href="#">
                  🐱
                </a>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img src="/Q5_white_bg.png" style={{ width: 32, height: 32 }} />
                <span
                  style={{
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

          {/* -------------------------------------- */}
          {/* MIDDLE COLUMN — SAVED JOB CARDS */}
          {/* -------------------------------------- */}
          <section className="layout-main">
            <section className="section">
              <div className="section-header">
                <div>
                  <div className="section-title">Saved jobs</div>
                  <div className="section-sub">
                    Jobs you've liked from the Quantum Jobs Universe.
                  </div>
                </div>

                <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
                  {saved.length} job{saved.length === 1 ? "" : "s"} saved
                </div>
              </div>

              {loadingSaved && <p className="profile-muted">Loading saved jobs…</p>}

              {!loadingSaved && saved.length === 0 && (
                <p className="profile-muted">
                  You haven't saved any jobs yet. Tap the heart on a job to add it here.
                </p>
              )}

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 18,
                }}
              >
                {saved.map((row) => {
                  const job = row.job;
                  if (!job) return null;

                  return (
                    <div
                      key={job.id}
                      className="job-tile"
                      style={{
                        padding: "16px 18px",
                        borderRadius: 16,
                        border: "1px solid rgba(148,163,184,0.18)",
                        background:
                          "radial-gradient(circle at top left, rgba(34,211,238,0.10), transparent 55%), rgba(2,6,23,0.6)",
                      }}
                    >
                      <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 15 }}>
                        {job.title}
                      </div>

                      <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4 }}>
                        {job.organisation_name || "Unknown org"} · {job.location_text || "Location TBA"}
                      </div>

                      <div style={{ fontSize: 13, marginBottom: 6 }}>
                        {job.short_description || ""}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>
                          {job.salary_text || ""}
                        </div>
                        <div style={{ fontSize: 13, opacity: 0.7 }}>
                          {job.job_type || "Full-time"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </section>

          {/* -------------------------------------- */}
          {/* RIGHT SIDEBAR — HIGHLIGHTED TILES */}
          {/* -------------------------------------- */}
          <aside className="layout-right sticky-col">
            <div className="hero-tiles hero-tiles-vertical">
              {/* spotlight tiles reused exactly */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum roles spotlight</div>
                    <div className="tile-icon-orbit">🧪</div>
                  </div>
                  <p className="tile-text">
                    A curated spotlight job from the Quantum Jobs Universe.
                  </p>
                  <div className="tile-cta">Jobs spotlight ›</div>
                </div>
              </div>

              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum product of the week</div>
                    <div className="tile-icon-orbit">🔧</div>
                  </div>
                  <p className="tile-text">
                    Highlighting a selected product from the Quantum Products Lab.
                  </p>
                  <div className="tile-cta">Product spotlight ›</div>
                </div>
              </div>

              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Featured quantum talent</div>
                    <div className="tile-icon-orbit">🤝</div>
                  </div>
                  <p className="tile-text">
                    A standout researcher, founder, or engineer.
                  </p>
                  <div className="tile-cta">Talent spotlight ›</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: "auto", paddingTop: 12, textAlign: "right", fontSize: 12 }}>
              © 2025 Quantum5ocial
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
