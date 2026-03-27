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

const COUNTRY_FILTERS = [
  "All",
  "Switzerland",
  "Germany",
  "France",
  "UK",
  "USA",
  "Canada",
  "Netherlands",
  "Finland",
  "Australia",
  "Other",
];

const JOB_CATEGORY_CHIPS = [
  "All",
  "Quantum Hardware",
  "Quantum Software",
  "Quantum AI & ML",
  "Quantum Algorithms & Theory",
  "Quantum Communication",
  "Quantum Cryptography",
  "Quantum Sensing",
  "Quantum Materials",
  "Quantum Finance & Optimization",
  "Business & Strategy",
  "Consulting & Policy",
] as const;

type JobCategoryChip = (typeof JOB_CATEGORY_CHIPS)[number];

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

  countryFilter: string;
  setCountryFilter: (v: string) => void;

  categoryChip: JobCategoryChip;
  setCategoryChip: (v: JobCategoryChip) => void;

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

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(v: string | null | undefined) {
  return (v || "").toLowerCase().trim();
}

function detectCountry(location: string | null): string {
  const loc = normalize(location);

  if (!loc) return "Other";
  if (loc.includes("switzerland")) return "Switzerland";
  if (loc.includes("germany")) return "Germany";
  if (loc.includes("france")) return "France";
  if (
    loc.includes("united kingdom") ||
    loc.includes(" uk") ||
    loc.endsWith("uk") ||
    loc.includes("england") ||
    loc.includes("scotland")
  ) {
    return "UK";
  }
  if (
    loc.includes("united states") ||
    loc.includes("usa") ||
    loc.includes("u.s.") ||
    loc.includes("california") ||
    loc.includes("massachusetts") ||
    loc.includes("washington") ||
    loc.includes("new york")
  ) {
    return "USA";
  }
  if (loc.includes("canada")) return "Canada";
  if (loc.includes("netherlands")) return "Netherlands";
  if (loc.includes("finland")) return "Finland";
  if (loc.includes("australia")) return "Australia";

  return "Other";
}

function matchesChip(job: Job, chip: JobCategoryChip) {
  if (chip === "All") return true;

  const title = normalize(job.title);
  const desc = normalize(job.short_description);
  const keywords = normalize(job.keywords);
  const tech = normalize(job.technology_type);
  const domain = normalize(job.quantum_domain);
  const role = normalize(job.role_track);

  const hay = `${title} ${desc} ${keywords} ${tech} ${domain} ${role}`;

  switch (chip) {
    case "Quantum Hardware":
      return (
        hay.includes("hardware") ||
        hay.includes("cryogenic") ||
        hay.includes("electronics") ||
        hay.includes("device") ||
        hay.includes("fabrication")
      );

    case "Quantum Software":
      return (
        hay.includes("software") ||
        hay.includes("developer") ||
        hay.includes("backend") ||
        hay.includes("frontend") ||
        hay.includes("full stack") ||
        hay.includes("platform")
      );

    case "Quantum AI & ML":
      return (
        hay.includes("machine learning") ||
        hay.includes("ml") ||
        hay.includes("ai") ||
        hay.includes("artificial intelligence")
      );

    case "Quantum Algorithms & Theory":
      return (
        hay.includes("algorithm") ||
        hay.includes("theory") ||
        hay.includes("theoretical") ||
        hay.includes("simulation") ||
        hay.includes("research")
      );

    case "Quantum Communication":
      return hay.includes("communication") || hay.includes("network");

    case "Quantum Cryptography":
      return (
        hay.includes("cryptography") ||
        hay.includes("security") ||
        hay.includes("qkd")
      );

    case "Quantum Sensing":
      return (
        hay.includes("sensing") ||
        hay.includes("sensor") ||
        hay.includes("metrology")
      );

    case "Quantum Materials":
      return (
        hay.includes("material") ||
        hay.includes("chemistry") ||
        hay.includes("superconduct") ||
        hay.includes("fabrication")
      );

    case "Quantum Finance & Optimization":
      return (
        hay.includes("finance") ||
        hay.includes("optimization") ||
        hay.includes("optimisation")
      );

    case "Business & Strategy":
      return (
        hay.includes("business") ||
        hay.includes("strategy") ||
        hay.includes("product") ||
        hay.includes("marketing") ||
        hay.includes("sales")
      );

    case "Consulting & Policy":
      return (
        hay.includes("consulting") ||
        hay.includes("policy") ||
        hay.includes("government") ||
        hay.includes("public affairs")
      );

    default:
      return true;
  }
}

function JobsProvider({ children }: { children: ReactNode }) {
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("All");
  const [categoryChip, setCategoryChip] = useState<JobCategoryChip>("All");

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
        setJobs(shuffle((data || []) as Job[]));
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

  useEffect(() => {
    const fetchRecommendationsAndProfile = async () => {
      if (!user) {
        setRecommendedJobIds([]);
        setIsAiRecommended(false);
        setMissingSkills(false);
        return;
      }

      try {
        const { data: profile } = await supabase
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
      } catch {
        // ignore
      }

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

    return jobs.filter((job) => {
      if (countryFilter !== "All" && detectCountry(job.location) !== countryFilter) {
        return false;
      }

      if (!matchesChip(job, categoryChip)) {
        return false;
      }

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
  }, [jobs, search, countryFilter, categoryChip]);

  const recommendedJobs = useMemo(() => {
    if (recommendedJobIds.length > 0) {
      const aiJobs = filteredJobs.filter((j) => recommendedJobIds.includes(j.id));
      if (aiJobs.length > 0) return aiJobs;
    }
    return filteredJobs.slice(0, 2);
  }, [filteredJobs, recommendedJobIds]);

  const remainingJobs = filteredJobs.filter((j) => !recommendedJobs.includes(j));

  const resetFilters = () => {
    setSearch("");
    setCountryFilter("All");
    setCategoryChip("All");
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

    countryFilter,
    setCountryFilter,

    categoryChip,
    setCategoryChip,

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
  return (
    <div className="sidebar-card">
      <div
        style={{
          fontWeight: 800,
          fontSize: 15,
          marginBottom: 10,
          color: "rgba(226,232,240,0.96)",
        }}
      >
        Featured space
      </div>

      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(15,23,42,0.55)",
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#7dd3fc",
            marginBottom: 8,
          }}
        >
          Coming soon
        </div>

        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            lineHeight: 1.35,
            marginBottom: 8,
          }}
        >
          Spotlight for companies and hiring campaigns
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: "rgba(226,232,240,0.78)",
          }}
        >
          This area can later highlight featured employers, sponsored roles,
          startup hiring campaigns, or important announcements from the quantum ecosystem.
        </div>
      </div>
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
          </div>

          <button
            className="nav-cta"
            style={{ cursor: "pointer" }}
            onClick={() => router.push("/jobs/new")}
          >
            Post a job
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 260px",
            gap: 14,
            alignItems: "center",
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
                placeholder="Role, company, or keywords"
                value={ctx.search}
                onChange={(e) => ctx.setSearch(e.target.value)}
              />
            </div>
          </div>

          <select
            className="products-filters-input"
            value={ctx.countryFilter}
            onChange={(e) => ctx.setCountryFilter(e.target.value)}
            style={{
              height: 44,
              borderRadius: 12,
            }}
          >
            {COUNTRY_FILTERS.map((country) => (
              <option key={country} value={country}>
                {country === "All" ? "Where?" : country}
              </option>
            ))}
          </select>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            marginTop: 16,
          }}
        >
          {JOB_CATEGORY_CHIPS.map((chip) => {
            const active = ctx.categoryChip === chip;
            return (
              <button
                key={chip}
                type="button"
                onClick={() => ctx.setCategoryChip(chip)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: active
                    ? "1px solid rgba(56,189,248,0.55)"
                    : "1px solid rgba(148,163,184,0.20)",
                  background: active
                    ? "rgba(56,189,248,0.14)"
                    : "rgba(15,23,42,0.45)",
                  color: active
                    ? "rgba(186,230,253,0.98)"
                    : "rgba(226,232,240,0.92)",
                  fontSize: 14,
                  lineHeight: 1.25,
                  cursor: "pointer",
                }}
              >
                {chip}
              </button>
            );
          })}

          <button
            type="button"
            className="nav-ghost-btn"
            style={{ borderRadius: 12, padding: "10px 14px" }}
            onClick={ctx.resetFilters}
          >
            Reset
          </button>
        </div>
      </div>

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
            <div
              style={{
                fontWeight: 700,
                fontSize: 15,
                marginBottom: 2,
                color: "#fef08a",
              }}
            >
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
        <p className="products-empty">
          No roles match your filters yet. Try broadening your search.
        </p>
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
                    {ctx.isAiRecommended
                      ? "Curated matches based on your profile"
                      : "Top recommendations based on your filters"}
                  </div>
                </div>

                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    textAlign: "right",
                  }}
                >
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
                  <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                    All roles
                  </div>
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

function JobsTwoColumnShell() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 1px 280px",
        alignItems: "stretch",
      }}
    >
      <div style={{ paddingRight: 16 }}>
        <JobsMiddle />
      </div>

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
