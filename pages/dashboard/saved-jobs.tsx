// pages/dashboard/saved-jobs.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import JobCard from "../../components/JobCard";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

// Job fields as used by JobCard
type Job = {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
  salary_display: string | null;
  keywords: string | null;
};

// Sidebar profile summary
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

export default function SavedJobsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<string>("Loading saved jobs…");
  const [error, setError] = useState<string | null>(null);

  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // ----- sidebar state -----
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [savedProductsCount, setSavedProductsCount] = useState(0);
  const [entangledCount, setEntangledCount] = useState(0);

  // redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard/saved-jobs");
    }
  }, [loading, user, router]);

  // ---- load sidebar profile ----
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

    if (user) loadProfile();
  }, [user]);

  // ---- load sidebar counters ----
  useEffect(() => {
    if (!user) {
      setSavedJobsCount(0);
      setSavedProductsCount(0);
      setEntangledCount(0);
      return;
    }

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

  // ---- load saved jobs list ----
  useEffect(() => {
    const loadSavedJobs = async () => {
      if (!user) return;

      setStatus("Loading saved jobs…");
      setError(null);

      // 1) fetch ids from saved_jobs
      const { data: savedRows, error: savedErr } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", user.id);

      if (savedErr) {
        console.error("Error loading saved jobs", savedErr);
        setError("Could not load saved jobs.");
        setStatus("");
        return;
      }

      const ids = (savedRows || []).map((r: any) => r.job_id as string);

      if (ids.length === 0) {
        setJobs([]);
        setSavedJobIds([]);
        setSavedJobsCount(0);
        setStatus("You have not saved any jobs yet.");
        return;
      }

      // 2) fetch job records
      const { data: jobsData, error: jobsErr } = await supabase
        .from("jobs")
        .select("*")
        .in("id", ids);

      if (jobsErr) {
        console.error("Error loading jobs", jobsErr);
        setError("Could not load jobs.");
        setStatus("");
        return;
      }

      setJobs((jobsData || []) as Job[]);
      setSavedJobIds(ids);
      setSavedJobsCount(ids.length);
      setStatus("");
    };

    if (user) loadSavedJobs();
  }, [user]);

  const isSaved = (id: string) => savedJobIds.includes(id);

  const handleToggleSave = async (jobId: string) => {
    if (!user) {
      router.push("/auth?redirect=/dashboard/saved-jobs");
      return;
    }

    const alreadySaved = isSaved(jobId);
    setSavingId(jobId);

    try {
      if (alreadySaved) {
        const { error } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", user.id)
          .eq("job_id", jobId);

        if (error) {
          console.error("Error unsaving job", error);
        } else {
          setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
          setJobs((prev) => prev.filter((job) => job.id !== jobId));
          setSavedJobsCount((c) => Math.max(0, c - 1));
        }
      } else {
        const { error } = await supabase.from("saved_jobs").insert({
          user_id: user.id,
          job_id: jobId,
        });

        if (error) {
          console.error("Error saving job", error);
        } else {
          setSavedJobIds((prev) => [...prev, jobId]);
          setSavedJobsCount((c) => c + 1);
        }
      }
    } finally {
      setSavingId(null);
    }
  };

  if (!user && !loading) return null;

  // ---- sidebar helpers ----
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
          {/* ========== LEFT SIDEBAR (same as community / saved-products) ========== */}
          <aside
            className="layout-left sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {/* Profile card – clickable, goes to My profile */}
            <Link
              href="/profile"
              className="sidebar-card profile-sidebar-card"
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
                <div className="profile-sidebar-name">
                  {sidebarFullName}
                </div>
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

            {/* Quick dashboard card with counters */}
            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>
              <div className="dashboard-sidebar-links">
                <Link
                  href="/dashboard/entangled-states"
                  className="dashboard-sidebar-link"
                >
                  Entangled states ({entangledCount})
                </Link>
                <Link
                  href="/dashboard/saved-jobs"
                  className="dashboard-sidebar-link"
                >
                  Saved jobs ({savedJobsCount})
                </Link>
                <Link
                  href="/dashboard/saved-products"
                  className="dashboard-sidebar-link"
                >
                  Saved products ({savedProductsCount})
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
                  ✉️
                </a>

                {/* X */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Quantum5ocial on X"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  𝕏
                </a>

                {/* GitHub */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Quantum5ocial on GitHub"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  🐱
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

          {/* ========== MIDDLE COLUMN – SAVED JOB CARDS ========== */}
          <section className="layout-main">
            <section className="section">
              <div className="section-header">
                <div>
                  <div className="section-title">Saved jobs</div>
                  <div className="section-sub">
                    Jobs you&apos;ve liked from the Quantum Jobs Universe.
                  </div>
                </div>
                {!status && (
                  <div
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                    }}
                  >
                    {jobs.length} job{jobs.length === 1 ? "" : "s"} saved
                  </div>
                )}
              </div>

              {status && (
                <p
                  className={
                    error ? "dashboard-status error" : "dashboard-status"
                  }
                >
                  {status}
                </p>
              )}

              {!status && jobs.length === 0 && !error && (
                <p className="dashboard-status">
                  You haven&apos;t saved any roles yet. Explore jobs and tap the
                  heart to keep them here.
                </p>
              )}

              {jobs.length > 0 && (
                <div className="jobs-grid">
                  {jobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job as any}
                      isSaved={isSaved(job.id)}
                      onToggleSave={() => {
                        if (!savingId) handleToggleSave(job.id);
                      }}
                    />
                  ))}
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
                    A curated spotlight job from the Quantum Jobs Universe.
                  </p>
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
                    Highlighting a selected hardware, software, or service from
                    the Quantum Products Lab.
                  </p>
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
                    A standout community member – for example a PI, postdoc, or
                    startup founder.
                  </p>
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
