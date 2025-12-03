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

export default function JobsIndexPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("All");
  const [remoteFilter, setRemoteFilter] = useState("All");

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

    return jobs.filter((job) => {
      if (employmentFilter !== "All" && job.employment_type !== employmentFilter) {
        return false;
      }
      if (remoteFilter !== "All" && job.remote_type !== remoteFilter) {
        return false;
      }

      if (!q) return true;

      const haystack =
        `${job.title || ""} ${job.company_name || ""} ${job.location || ""} ${
          job.short_description || ""
        } ${job.keywords || ""}`.toLowerCase();

      return haystack.includes(q);
    });
  }, [jobs, search, employmentFilter, remoteFilter]);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header" style={{ marginBottom: 18 }}>
            <div>
              <div className="section-title">Quantum Jobs Universe</div>
              <div className="section-sub">
                Browse internships, MSc/PhD positions, postdocs, and industry
                roles across labs and companies.
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

          <div className="products-layout">
            {/* Filters on the left */}
            <aside className="products-filters">
              <div className="products-filters-section">
                <div className="products-filters-title">Search</div>
                <input
                  className="products-filters-input"
                  placeholder="Title, company, keywords…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

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

              <button
                type="button"
                className="nav-ghost-btn"
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => {
                  setSearch("");
                  setEmploymentFilter("All");
                  setRemoteFilter("All");
                }}
              >
                Reset filters
              </button>
            </aside>

            {/* Results */}
            <div className="products-results">
              <div className="products-results-header">
                <div className="products-status">
                  {loading
                    ? "Loading jobs…"
                    : error
                    ? error
                    : `${filteredJobs.length} job${
                        filteredJobs.length === 1 ? "" : "s"
                      }`}
                  {savingId && " · updating saved…"}
                </div>
              </div>

              {!loading && !error && filteredJobs.length === 0 && (
                <p className="products-empty">
                  No roles match your filters yet. Try broadening your search.
                </p>
              )}

              <div className="jobs-grid">
                {filteredJobs.map((job) => {
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
          </div>
        </section>
      </div>
    </>
  );
}
