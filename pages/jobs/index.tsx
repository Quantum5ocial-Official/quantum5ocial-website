// pages/jobs/index.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

type Job = {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
  description: string | null;
  keywords: string | null;
  salary_display: string | null;
  created_at: string | null;
  owner_id: string | null;

  // extra optional metadata for richer filters
  technology_type: string | null;   // "Hardware" | "Software" | "Consulting" | ...
  organisation_type: string | null; // "University / Lab" | "Startup" | "Company" | ...
  quantum_domain: string | null;    // "Computing" | "Communication" | ...
  role_track: string | null;        // "Research" | "Engineering" | ...
  seniority_level: string | null;   // "Student / Intern" | "Early-career" | ...
};

const EMPLOYMENT_FILTERS = [
  "All",
  "Full-time",
  "Part-time",
  "Internship",
  "PhD",
  "Postdoc",
  "Contract",
  "Fellowship",
  "Other",
];

const REMOTE_FILTERS = ["All", "On-site", "Hybrid", "Remote"];

const TECHNOLOGY_FILTERS = [
  "All",
  "Hardware",
  "Software",
  "Consulting",
  "Cryogenics / Electronics",
  "Other",
];

const ORG_TYPE_FILTERS = [
  "All",
  "University / Lab",
  "Startup",
  "Company",
  "Consortium / Institute",
  "Other",
];

const DOMAIN_FILTERS = [
  "All",
  "Quantum computing",
  "Quantum communication",
  "Quantum sensing / metrology",
  "Quantum materials / fabrication",
  "Quantum control / electronics",
  "Other",
];

const ROLE_TRACK_FILTERS = [
  "All",
  "Research",
  "Engineering",
  "Theory / algorithms",
  "Product / business",
  "Other",
];

const SENIORITY_FILTERS = [
  "All",
  "Student / Intern",
  "Early-career",
  "Mid-level",
  "Senior / Lead",
  "PI / Professor",
];

export default function JobsIndexPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("All");
  const [remoteFilter, setRemoteFilter] = useState("All");

  const [technologyFilter, setTechnologyFilter] = useState("All");
  const [orgTypeFilter, setOrgTypeFilter] = useState("All");
  const [domainFilter, setDomainFilter] = useState("All");
  const [roleTrackFilter, setRoleTrackFilter] = useState("All");
  const [seniorityFilter, setSeniorityFilter] = useState("All");

  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Load jobs
  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading jobs", error);
        setError("Could not load jobs. Please try again.");
        setJobs([]);
      } else {
        setJobs((data || []) as Job[]);
      }

      setLoading(false);
    };

    loadJobs();
  }, []);

  // Load saved jobs for current user
  useEffect(() => {
    const loadSaved = async () => {
      if (!user) {
        setSavedJobIds([]);
        return;
      }

      const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error loading saved jobs", error);
        return;
      }

      setSavedJobIds((data || []).map((row: any) => row.job_id as string));
    };

    loadSaved();
  }, [user]);

  const isSaved = (id: string) => savedJobIds.includes(id);

  const handleToggleSave = async (jobId: string) => {
    if (!user) {
      router.push("/auth?redirect=/jobs");
      return;
    }

    setSavingId(jobId);
    const alreadySaved = isSaved(jobId);

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
        }
      }
    } finally {
      setSavingId(null);
    }
  };

  const filteredJobs = useMemo(() => {
    const q = search.toLowerCase().trim();

    const normalize = (v: string | null) => (v || "").toLowerCase();

    const matchesCategory = (filterValue: string, fieldValue: string | null) => {
      if (filterValue === "All") return true;
      return normalize(fieldValue) === filterValue.toLowerCase();
    };

    return jobs.filter((job) => {
      // Employment & remote filters (existing)
      if (employmentFilter !== "All" && job.employment_type !== employmentFilter) {
        return false;
      }
      if (remoteFilter !== "All" && job.remote_type !== remoteFilter) {
        return false;
      }

      // New filters
      if (!matchesCategory(technologyFilter, job.technology_type)) {
        return false;
      }
      if (!matchesCategory(orgTypeFilter, job.organisation_type)) {
        return false;
      }
      if (!matchesCategory(domainFilter, job.quantum_domain)) {
        return false;
      }
      if (!matchesCategory(roleTrackFilter, job.role_track)) {
        return false;
      }
      if (!matchesCategory(seniorityFilter, job.seniority_level)) {
        return false;
      }

      // Search text
      if (!q) return true;

      const haystack = (
        `${job.title || ""} ${job.company_name || ""} ${job.location || ""} ${
          job.short_description || ""
        } ${job.keywords || ""} ${job.technology_type || ""} ${
          job.quantum_domain || ""
        } ${job.role_track || ""} ${job.seniority_level || ""}`
      ).toLowerCase();

      return haystack.includes(q);
    });
  }, [
    jobs,
    search,
    employmentFilter,
    remoteFilter,
    technologyFilter,
    orgTypeFilter,
    domainFilter,
    roleTrackFilter,
    seniorityFilter,
  ]);

  // Split into: recommended (first 2) + remaining
  const recommendedJobs = filteredJobs.slice(0, 2);
  const remainingJobs = filteredJobs.slice(recommendedJobs.length);

  const resetFilters = () => {
    setSearch("");
    setEmploymentFilter("All");
    setRemoteFilter("All");
    setTechnologyFilter("All");
    setOrgTypeFilter("All");
    setDomainFilter("All");
    setRoleTrackFilter("All");
    setSeniorityFilter("All");
  };

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        {/* Same shell as community.tsx */}
        <main className="layout-3col">
          {/* ========== LEFT COLUMN – FILTER CARD ========== */}
          <aside className="layout-left sticky-col">
            <div className="sidebar-card">

              {/* Employment type */}
              <div className="products-filters-section">
                <div className="products-filters-title">Employment type</div>
                <select
                  className="products-filters-input"
                  value={employmentFilter}
                  onChange={(e) => setEmploymentFilter(e.target.value)}
                >
                  {EMPLOYMENT_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work mode */}
              <div className="products-filters-section">
                <div className="products-filters-title">Work mode</div>
                <select
                  className="products-filters-input"
                  value={remoteFilter}
                  onChange={(e) => setRemoteFilter(e.target.value)}
                >
                  {REMOTE_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Technology type */}
              <div className="products-filters-section">
                <div className="products-filters-title">Technology type</div>
                <select
                  className="products-filters-input"
                  value={technologyFilter}
                  onChange={(e) => setTechnologyFilter(e.target.value)}
                >
                  {TECHNOLOGY_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Organisation type */}
              <div className="products-filters-section">
                <div className="products-filters-title">Organisation</div>
                <select
                  className="products-filters-input"
                  value={orgTypeFilter}
                  onChange={(e) => setOrgTypeFilter(e.target.value)}
                >
                  {ORG_TYPE_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantum domain */}
              <div className="products-filters-section">
                <div className="products-filters-title">Quantum domain</div>
                <select
                  className="products-filters-input"
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                >
                  {DOMAIN_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role track */}
              <div className="products-filters-section">
                <div className="products-filters-title">Role focus</div>
                <select
                  className="products-filters-input"
                  value={roleTrackFilter}
                  onChange={(e) => setRoleTrackFilter(e.target.value)}
                >
                  {ROLE_TRACK_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seniority */}
              <div className="products-filters-section">
                <div className="products-filters-title">Seniority</div>
                <select
                  className="products-filters-input"
                  value={seniorityFilter}
                  onChange={(e) => setSeniorityFilter(e.target.value)}
                >
                  {SENIORITY_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="nav-ghost-btn"
                style={{ width: "100%", marginTop: 8 }}
                onClick={resetFilters}
              >
                Reset filters
              </button>
            </div>
          </aside>

          {/* ========== MIDDLE COLUMN – JOBS LIST ========== */}
          <section className="layout-main">
            <section className="section">
              <div className="section-header">
                <div>
                  <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
  Quantum Jobs Universe
  {!loading && !error && (
    <span
      style={{
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 999,
        background: "rgba(56,189,248,0.15)",
        border: "1px solid rgba(56,189,248,0.35)",
        color: "#7dd3fc",
      }}
    >
      {filteredJobs.length} roles
    </span>
  )}
</div>
                  <div
                    className="section-sub"
                    style={{ maxWidth: "480px", lineHeight: "1.45" }}
                  >
                    Browse internships, MSc/PhD positions, postdocs, and
                    industry roles across labs and companies.
                  </div>
                </div>

                <button
                  className="nav-cta"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push("/jobs/new")}
                >
                  Post a job
                </button>
              </div>

              {/* Center-column search bar */}
<div
  style={{
    marginTop: 16,
    marginBottom: 18,
  }}
>
  <div
    style={{
      width: "100%",
      borderRadius: 999,
      padding: "2px",
      background:
        "linear-gradient(90deg, rgba(56,189,248,0.5), rgba(129,140,248,0.5))",
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
      <span
        style={{
          fontSize: 14,
          opacity: 0.85,
        }}
      >
        🔍
      </span>
      <input
        style={{
          border: "none",
          outline: "none",
          background: "transparent",
          color: "#e5e7eb",
          fontSize: 14,
          width: "100%",
        }}
        placeholder="Search by title, company, location, keywords…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  </div>
</div>


              {!loading && !error && filteredJobs.length === 0 && (
                <p className="products-empty">
                  No roles match your filters yet. Try broadening your search.
                </p>
              )}

              {!loading && !error && filteredJobs.length > 0 && (
                <>
                  {/* Top recommendations */}
                  {recommendedJobs.length > 0 && (
  <div
    style={{
      marginBottom: 32,
      padding: 16,
      borderRadius: 16,
      border: "1px solid rgba(56,189,248,0.35)", // cyan-ish
      background:
        "radial-gradient(circle at top left, rgba(34,211,238,0.12), rgba(15,23,42,1))",
    }}
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 12,
        gap: 12,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#7dd3fc",
            marginBottom: 4,
          }}
        >
          Recommended for you
        </div>
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            background: "linear-gradient(90deg,#22d3ee,#a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Top recommendations based on your profile
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          color: "var(--text-muted)",
          textAlign: "right",
        }}
      >
        For now based on your filters. <br />
        Later: AI profile matching.
      </div>
    </div>

    <div className="jobs-grid">
      {recommendedJobs.map((job) => {
        const saved = isSaved(job.id);
        return (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="job-card"
          >
            {/* existing job card content stays the same */}
            <div className="job-card-header">
              <div>
                <div className="job-card-title">
                  {job.title || "Untitled role"}
                </div>
                <div className="job-card-meta">
                  {job.company_name && `${job.company_name} · `}
                  {job.location}
                  {job.remote_type ? ` · ${job.remote_type}` : ""}
                </div>
              </div>

              <button
                type="button"
                className="product-save-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!savingId) {
                    handleToggleSave(job.id);
                  }
                }}
                aria-label={
                  saved ? "Remove from saved jobs" : "Save job"
                }
              >
                {saved ? "❤️" : "🤍"}
              </button>
            </div>

            {job.short_description && (
              <div className="job-card-description">
                {job.short_description}
              </div>
            )}

            <div className="job-card-footer">
              <span className="job-salary">
                {job.salary_display || ""}
              </span>
              {job.employment_type && (
                <span className="job-type">
                  {job.employment_type}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  </div>
)}

                  {/* All roles (excluding the ones shown in recommendations) */}
                  {remainingJobs.length > 0 && (
  <div style={{ marginTop: 8 }}>
    {/* subtle divider when there are recommendations above */}
    {recommendedJobs.length > 0 && (
      <div
        style={{
          height: 1,
          margin: "4px 0 20px",
          background:
            "linear-gradient(90deg, rgba(148,163,184,0), rgba(148,163,184,0.6), rgba(148,163,184,0))",
        }}
      />
    )}

    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: 10,
      }}
    >
      <div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(148,163,184,0.9)",
            marginBottom: 3,
          }}
        >
          Browse everything
        </div>
        <div
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
          }}
        >
          All roles
        </div>
      </div>

      
    </div>

    <div className="jobs-grid">
      {remainingJobs.map((job) => {
        const saved = isSaved(job.id);

        return (
          <Link
            key={job.id}
            href={`/jobs/${job.id}`}
            className="job-card"
          >
            <div className="job-card-header">
              <div>
                <div className="job-card-title">
                  {job.title || "Untitled role"}
                </div>
                <div className="job-card-meta">
                  {job.company_name && `${job.company_name} · `}
                  {job.location}
                  {job.remote_type ? ` · ${job.remote_type}` : ""}
                </div>
              </div>

              <button
                type="button"
                className="product-save-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!savingId) {
                    handleToggleSave(job.id);
                  }
                }}
                aria-label={
                  saved ? "Remove from saved jobs" : "Save job"
                }
              >
                {saved ? "❤️" : "🤍"}
              </button>
            </div>

            {job.short_description && (
              <div className="job-card-description">
                {job.short_description}
              </div>
            )}

            <div className="job-card-footer">
              <span className="job-salary">
                {job.salary_display || ""}
              </span>
              {job.employment_type && (
                <span className="job-type">
                  {job.employment_type}
                </span>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  </div>
)}

                  {/* Edge case: only 1–2 jobs total => only recommendations section visible */}
                </>
              )}
            </section>
          </section>

          {/* ========== RIGHT COLUMN – HIGHLIGHTED TILES ========== */}
          <aside className="layout-right sticky-col">
            <div className="hero-tiles hero-tiles-vertical">
              {/* Quantum roles spotlight */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum roles spotlight</div>
                    <div className="tile-icon-orbit">🧪</div>
                  </div>
                  <p className="tile-text">
                    This tile will later showcase a curated quantum job or role
                    from the marketplace – ideal for demos.
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

              {/* Featured hiring partner */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Featured hiring partner</div>
                    <div className="tile-icon-orbit">🏢</div>
                  </div>
                  <p className="tile-text">
                    Later this can feature a lab, startup, or company actively
                    hiring across multiple roles.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Superconducting</span>
                    <span className="tile-pill">Spin qubits</span>
                    <span className="tile-pill">Cryo engineer</span>
                  </div>
                  <div className="tile-cta">
                    Partner spotlight <span>›</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
