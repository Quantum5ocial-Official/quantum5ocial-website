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
  additional_description: string | null;
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
  isAiRecommended: boolean;
  remainingJobs: Job[];
  missingSkills: boolean;
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

  const [recommendedJobIds, setRecommendedJobIds] = useState<string[]>([]);
  const [isAiRecommended, setIsAiRecommended] = useState(false);
  const [missingSkills, setMissingSkills] = useState(false);

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

  // Load AI Recommendations + Check Missing Skills
  useEffect(() => {
    const fetchRecommendationsAndProfile = async () => {
      if (!user) {
        setRecommendedJobIds([]);
        setIsAiRecommended(false);
        setMissingSkills(false);
        return;
      }

      // Check profile skills
      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("skills")
          .eq("id", user.id)
          .single();

        if (profile) {
          if (!profile.skills || profile.skills.trim().length === 0) {
            setMissingSkills(true);
          } else {
            setMissingSkills(false);
          }
        }
      } catch (e) {
        // ignore profile fetch error
      }

      // Fetch recs
      try {
        const res = await fetch("/api/jobs/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await res.json();
        if (data.jobIds && Array.isArray(data.jobIds)) {
          setRecommendedJobIds(data.jobIds);
          setIsAiRecommended(data.jobIds.length > 0);
        }
      } catch (err) {
        console.error("Failed to fetch recommendations", err);
      }
    };

    fetchRecommendationsAndProfile();
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
      if (employmentFilter !== "All" && job.employment_type !== employmentFilter) return false;
      if (remoteFilter !== "All" && job.remote_type !== remoteFilter) return false;

      if (!matchesCategory(technologyFilter, job.technology_type)) return false;
      if (!matchesCategory(orgTypeFilter, job.organisation_type)) return false;
      if (!matchesCategory(domainFilter, job.quantum_domain)) return false;
      if (!matchesCategory(roleTrackFilter, job.role_track)) return false;
      if (!matchesCategory(seniorityFilter, job.seniority_level)) return false;

      if (!q) return true;

      const haystack = (
        `${job.title || ""} ${job.company_name || ""} ${job.location || ""} ${job.short_description || ""
        } ${job.keywords || ""} ${job.technology_type || ""} ${job.quantum_domain || ""} ${job.role_track || ""
        } ${job.seniority_level || ""}`
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



  const recommendedJobs = useMemo(() => {
    if (recommendedJobIds.length > 0) {
      // If we have AI recommendations, prioritize them
      // But only if they match current filters? 
      // Strategy: Show them if they are in the filtered list.
      // If none of the recommended jobs are in the filtered list, fallback to generic.

      const aiJobs = filteredJobs.filter(j => recommendedJobIds.includes(j.id));
      // Sort them by order in recommendedJobIds to keep relevance?
      // Since filter doesn't guarantee order, let's just stick to what we found.

      if (aiJobs.length > 0) return aiJobs;
    }
    // Fallback
    return filteredJobs.slice(0, 2);
  }, [filteredJobs, recommendedJobIds]);

  const remainingJobs = filteredJobs.filter(j => !recommendedJobs.includes(j));

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
    isAiRecommended: recommendedJobs.length > 0 && isAiRecommended,
    remainingJobs,
    missingSkills,
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

/** ✅ Mobile detector (same pattern as products) */
function useIsMobile(maxWidth = 820) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const set = () => setIsMobile(mq.matches);

    set();

    const anyMq = mq as any;
    if (mq.addEventListener) {
      mq.addEventListener("change", set);
      return () => mq.removeEventListener("change", set);
    }
    if (anyMq.addListener) {
      anyMq.addListener(set);
      return () => anyMq.removeListener(set);
    }
    return;
  }, [maxWidth]);

  return isMobile;
}

/** ✅ Drawer ONLY on mobile (returns null on desktop) */
function JobsFiltersDrawer() {
  const isMobile = useIsMobile(820);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!isMobile) return null;

  return (
    <>
      {/* right-edge tab */}
      <button
        type="button"
        aria-label={open ? "Close filters" : "Open filters"}
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          right: 0,
          top: "80%",
          transform: "translateY(-50%)",
          zIndex: 60,
          width: 30,
          height: 80,
          border: "1px solid rgba(148,163,184,0.35)",
          borderRight: "none",
          borderTopLeftRadius: 16,
          borderBottomLeftRadius: 16,
          background: "rgba(2,6,23,0.72)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: 22,
            lineHeight: 1,
            color: "rgba(226,232,240,0.95)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 160ms ease",
            userSelect: "none",
          }}
        >
          ❮
        </span>
      </button>

      {/* overlay */}
      {open && (
        <div
          aria-hidden="true"
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 55,
            background: "rgba(0,0,0,0.45)",
          }}
        />
      )}

      {/* drawer */}
      <aside
        aria-label="Job filters drawer"
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 280,
          zIndex: 56,
          transform: open ? "translateX(0)" : "translateX(105%)",
          transition: "transform 200ms ease",
          background: "rgba(2,6,23,0.92)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderLeft: "1px solid rgba(148,163,184,0.35)",
          overflowY: "auto",
          padding: 12,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 13, color: "rgba(226,232,240,0.95)" }}>
            Filters
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="nav-ghost-btn"
            style={{ padding: "7px 10px", borderRadius: 999, fontSize: 12, fontWeight: 900 }}
          >
            Close
          </button>
        </div>

        <JobsRightSidebar />
      </aside>
    </>
  );
}

function JobsMiddle() {
  const router = useRouter();
  const ctx = useJobsCtx();
  const isMobile = useIsMobile(820);

  return (
    <section className="section">
      {/* ✅ Drawer ONLY in mobile main */}
      {isMobile && <JobsFiltersDrawer />}

      <div className="jobs-main-header">
        <div className="section-header">
          <div>
            <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
              Browse internships, PhD positions, postdocs, and industry roles across labs and companies.
            </div>
          </div>

          <button className="nav-cta" style={{ cursor: "pointer" }} onClick={() => router.push("/jobs/new")}>
            Post a job
          </button>
        </div>

        <div className="jobs-main-search">
          <div
            style={{
              width: "100%",
              borderRadius: 999,
              padding: "2px",
              background: "linear-gradient(90deg, rgba(56,189,248,0.5), rgba(129,140,248,0.5))",
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

      {/* ✅ Missing Skills Warning */}
      {ctx.missingSkills && (
        <div
          style={{
            margin: "0 0 24px 0",
            padding: "14px 18px",
            borderRadius: 16,
            background: "rgba(234, 179, 8, 0.15)",
            border: "1px solid rgba(234, 179, 8, 0.4)",
            display: "flex",
            alignItems: "center",
            gap: 14,
            color: "rgba(255,255,255,0.92)",
          }}
        >
          <div style={{ fontSize: 24 }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, color: "#fef08a" }}>
              Complete your profile for AI recommendations
            </div>
            <div style={{ fontSize: 13.5, opacity: 0.9 }}>
              You haven't added any skills yet. Tattva AI needs your skills to find the best job matches for you.
            </div>
          </div>
          <Link href="/profile" style={{ textDecoration: "none" }}>
            <button
              style={{
                background: "#fef08a",
                color: "#422006",
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                padding: "8px 16px",
                borderRadius: 999,
                cursor: "pointer",
              }}
            >
              Add Skills
            </button>
          </Link>
        </div>
      )}

      {ctx.loading && <p className="products-status">Loading jobs…</p>}
      {!ctx.loading && ctx.error && <p className="products-empty">{ctx.error}</p>}

      {!ctx.loading && !ctx.error && ctx.filteredJobs.length === 0 && (
        <p className="products-empty">No roles match your filters yet. Try broadening your search.</p>
      )}

      {!ctx.loading && !ctx.error && ctx.filteredJobs.length > 0 && (
        <>
          {!ctx.missingSkills && ctx.recommendedJobs.length > 0 && (
            <div
              style={{
                marginBottom: 32,
                padding: 16,
                borderRadius: 16,
                border: "1px solid rgba(56,189,248,0.35)",
                background: "radial-gradient(circle at top left, rgba(34,211,238,0.12), rgba(15,23,42,1))",
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
                    {ctx.isAiRecommended
                      ? "Curated matches based on your profile"
                      : "Top recommendations based on your filters"}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
                  {ctx.isAiRecommended ? "AI-Powered Selection" : "Based on filters"}
                </div>
              </div>

              <div className="jobs-grid">
                {ctx.recommendedJobs.map((job) => {
                  const saved = ctx.isSaved(job.id);
                  return (
                    <Link key={job.id} href={`/jobs/${job.id}`} className="job-card">
                      <div className="job-card-header">
                        <div>
                          <div className="job-card-title">{job.title || "Untitled role"}</div>
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
                        {job.employment_type && <span className="job-type">{job.employment_type}</span>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {ctx.remainingJobs.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {!ctx.missingSkills && ctx.recommendedJobs.length > 0 && (
                <div
                  style={{
                    height: 1,
                    margin: "4px 0 20px",
                    background:
                      "linear-gradient(90deg, rgba(148,163,184,0), rgba(148,163,184,0.6), rgba(148,163,184,0))",
                  }}
                />
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
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
                          <div className="job-card-title">{job.title || "Untitled role"}</div>
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
                        {job.employment_type && <span className="job-type">{job.employment_type}</span>}
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

function JobsTwoColumnShell() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 1px 280px",
        alignItems: "stretch",
      }}
    >
      {/* MIDDLE */}
      <div style={{ paddingRight: 16 }}>
        <JobsMiddle />
      </div>

      {/* DIVIDER */}
      <div
        style={{
          width: 1,
          background: "rgba(148,163,184,0.35)",
          position: "sticky",
          top: 0,
          height: "100vh",
          alignSelf: "start",
        }}
      />

      {/* RIGHT (DESKTOP FILTERS) */}
      <div
        style={{
          paddingLeft: 16,
          position: "sticky",
          top: 16,
          alignSelf: "start",
        }}
      >
        <JobsRightSidebar />
      </div>
    </div>
  );
}

export default function JobsIndexPage() {
  return <JobsTwoColumnShell />;
}

(JobsIndexPage as any).layoutProps = {
  variant: "two-left",
  right: null,
  wrap: (children: React.ReactNode) => <JobsProvider>{children}</JobsProvider>,
  mobileMain: <JobsMiddle />,
};
