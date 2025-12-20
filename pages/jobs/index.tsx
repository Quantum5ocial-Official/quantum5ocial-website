// pages/jobs/index.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

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

  technology_type: string | null;
  organisation_type: string | null;
  quantum_domain: string | null;
  role_track: string | null;
  seniority_level: string | null;
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

type JobsCtx = {
  jobs: Job[];
  loading: boolean;
  error: string | null;

  savedJobIds: string[];
  savingId: string | null;
  isSaved: (id: string) => boolean;
  handleToggleSave: (jobId: string) => Promise<void>;

  search: string;
  setSearch: (v: string) => void;

  employmentFilter: string;
  setEmploymentFilter: (v: string) => void;

  remoteFilter: string;
  setRemoteFilter: (v: string) => void;

  technologyFilter: string;
  setTechnologyFilter: (v: string) => void;

  orgTypeFilter: string;
  setOrgTypeFilter: (v: string) => void;

  domainFilter: string;
  setDomainFilter: (v: string) => void;

  roleTrackFilter: string;
  setRoleTrackFilter: (v: string) => void;

  seniorityFilter: string;
  setSeniorityFilter: (v: string) => void;

  resetFilters: () => void;

  filteredJobs: Job[];
  recommendedJobs: Job[];
  remainingJobs: Job[];
};

const JobsContext = createContext<JobsCtx | null>(null);

function useJobsCtx() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error("useJobsCtx must be used inside <JobsProvider />");
  return ctx;
}

function JobsProvider({ children }: { children: ReactNode }) {
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

      const ids = (data || []).map((row: any) => row.job_id as string);
      setSavedJobIds(ids);
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

        if (error) console.error("Error unsaving job", error);
        else setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
      } else {
        const { error } = await supabase.from("saved_jobs").insert({
          user_id: user.id,
          job_id: jobId,
        });

        if (error) console.error("Error saving job", error);
        else setSavedJobIds((prev) => [...prev, jobId]);
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
      if (employmentFilter !== "All" && job.employment_type !== employmentFilter)
        return false;
      if (remoteFilter !== "All" && job.remote_type !== remoteFilter) return false;

      if (!matchesCategory(technologyFilter, job.technology_type)) return false;
      if (!matchesCategory(orgTypeFilter, job.organisation_type)) return false;
      if (!matchesCategory(domainFilter, job.quantum_domain)) return false;
      if (!matchesCategory(roleTrackFilter, job.role_track)) return false;
      if (!matchesCategory(seniorityFilter, job.seniority_level)) return false;

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

  const value: JobsCtx = {
    jobs,
    loading,
    error,

    savedJobIds,
    savingId,
    isSaved,
    handleToggleSave,

    search,
    setSearch,

    employmentFilter,
    setEmploymentFilter,

    remoteFilter,
    setRemoteFilter,

    technologyFilter,
    setTechnologyFilter,

    orgTypeFilter,
    setOrgTypeFilter,

    domainFilter,
    setDomainFilter,

    roleTrackFilter,
    setRoleTrackFilter,

    seniorityFilter,
    setSeniorityFilter,

    resetFilters,

    filteredJobs,
    recommendedJobs,
    remainingJobs,
  };

  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

function JobsRightSidebar() {
  const ctx = useJobsCtx();

  return (
    <div className="sidebar-card">
      <div className="products-filters-section">
        <div className="products-filters-title">Employment type</div>
        <select
          className="products-filters-input"
          value={ctx.employmentFilter}
          onChange={(e) => ctx.setEmploymentFilter(e.target.value)}
        >
          {EMPLOYMENT_FILTERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="products-filters-section">
        <div className="products-filters-title">Work mode</div>
        <select
          className="products-filters-input"
          value={ctx.remoteFilter}
          onChange={(e) => ctx.setRemoteFilter(e.target.value)}
        >
          {REMOTE_FILTERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="products-filters-section">
        <div className="products-filters-title">Technology type</div>
        <select
          className="products-filters-input"
          value={ctx.technologyFilter}
          onChange={(e) => ctx.setTechnologyFilter(e.target.value)}
        >
          {TECHNOLOGY_FILTERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="products-filters-section">
        <div className="products-filters-title">Organisation</div>
        <select
          className="products-filters-input"
          value={ctx.orgTypeFilter}
          onChange={(e) => ctx.setOrgTypeFilter(e.target.value)}
        >
          {ORG_TYPE_FILTERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="products-filters-section">
        <div className="products-filters-title">Quantum domain</div>
        <select
          className="products-filters-input"
          value={ctx.domainFilter}
          onChange={(e) => ctx.setDomainFilter(e.target.value)}
        >
          {DOMAIN_FILTERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="products-filters-section">
        <div className="products-filters-title">Role focus</div>
        <select
          className="products-filters-input"
          value={ctx.roleTrackFilter}
          onChange={(e) => ctx.setRoleTrackFilter(e.target.value)}
        >
          {ROLE_TRACK_FILTERS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="products-filters-section">
        <div className="products-filters-title">Seniority</div>
        <select
          className="products-filters-input"
          value={ctx.seniorityFilter}
          onChange={(e) => ctx.setSeniorityFilter(e.target.value)}
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
        onClick={ctx.resetFilters}
      >
        Reset filters
      </button>
    </div>
  );
}

function JobsMiddle() {
  const router = useRouter();
  const ctx = useJobsCtx();

  return (
    <section className="section">
      <div className="jobs-main-header">
        <div className="section-header">
          <div>
            <div
              className="section-title"
              style={{ display: "flex", alignItems: "center", gap: 10 }}
            >
              Quantum Jobs Universe
              {!ctx.loading && !ctx.error && (
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
                  {ctx.filteredJobs.length} roles
                </span>
              )}
            </div>
            <div className="section-sub" style={{ maxWidth: 480, lineHeight: 1.45 }}>
              Browse internships, PhD positions, postdocs, and industry roles across
              labs and companies.
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

        <div className="jobs-main-search">
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
              <span style={{ fontSize: 14, opacity: 0.85 }}>🔍</span>
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
                value={ctx.search}
                onChange={(e) => ctx.setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {ctx.loading && <p className="products-status">Loading jobs…</p>}
      {!ctx.loading && ctx.error && <p className="products-empty">{ctx.error}</p>}

      {!ctx.loading && !ctx.error && ctx.filteredJobs.length === 0 && (
        <p className="products-empty">
          No roles match your filters yet. Try broadening your search.
        </p>
      )}

      {!ctx.loading && !ctx.error && ctx.filteredJobs.length > 0 && (
        <>
          {ctx.recommendedJobs.length > 0 && (
            <div
              style={{
                marginBottom: 32,
                padding: 16,
                borderRadius: 16,
                border: "1px solid rgba(56,189,248,0.35)",
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
                {ctx.recommendedJobs.map((job) => {
                  const saved = ctx.isSaved(job.id);
                  return (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="job-card">
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
                            if (!ctx.savingId) ctx.handleToggleSave(job.id);
                          }}
                          aria-label={saved ? "Remove from saved jobs" : "Save job"}
                        >
                          {saved ? "❤️" : "🤍"}
                        </button>
                      </div>

                      {job.short_description && (
                        <div className="job-card-description">{job.short_description}</div>
                      )}

                      <div className="job-card-footer">
                        <span className="job-salary">{job.salary_display || ""}</span>
                        {job.employment_type && (
                          <span className="job-type">{job.employment_type}</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {ctx.remainingJobs.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {ctx.recommendedJobs.length > 0 && (
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
                  <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>All roles</div>
                </div>
              </div>

              <div className="jobs-grid">
                {ctx.remainingJobs.map((job) => {
                  const saved = ctx.isSaved(job.id);
                  return (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="job-card">
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
                            if (!ctx.savingId) ctx.handleToggleSave(job.id);
                          }}
                          aria-label={saved ? "Remove from saved jobs" : "Save job"}
                        >
                          {saved ? "❤️" : "🤍"}
                        </button>
                      </div>

                      {job.short_description && (
                        <div className="job-card-description">{job.short_description}</div>
                      )}

                      <div className="job-card-footer">
                        <span className="job-salary">{job.salary_display || ""}</span>
                        {job.employment_type && (
                          <span className="job-type">{job.employment_type}</span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function JobsIndexPage() {
  return <JobsMiddle />;
}

// ✅ Use REAL 3-col layout on desktop: LeftSidebar + Middle + Right Filters.
// ✅ On mobile (middle-only), your AppLayout right drawer will show these filters.
(JobsIndexPage as any).layoutProps = {
  variant: "three",
  right: <JobsRightSidebar />,
  wrap: (children: React.ReactNode) => <JobsProvider>{children}</JobsProvider>,
};
