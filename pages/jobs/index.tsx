// pages/jobs/index.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
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

const EMPLOYMENT_FILTERS = ["All", "Full-time", "Part-time", "Internship", "PhD", "Postdoc", "Contract", "Fellowship", "Other"];
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
                Browse internships, MSc/PhD positions, postdocs, and industry roles across labs and companies.
              </div>
            </div>

            <button
              type="button"
              className="nav-ghost-btn"
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
                  className="products-filters-search"
                  placeholder="Title, company, keywords…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="products-filters-section">
                <div className="products-filters-title">Employment type</div>
                <select
                  className="products-filters-search"
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
                  className="products-filters-search"
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
                    : `${filteredJobs.length} job${filteredJobs.length === 1 ? "" : "s"}`}
                </div>
              </div>

              {!loading && !error && filteredJobs.length === 0 && (
                <p className="products-empty">
                  No roles match your filters yet. Try broadening your search.
                </p>
              )}

              <div className="products-grid">
                {filteredJobs.map((job) => (
                  <div key={job.id} className="product-card">
                    {/* heart button */}
                    <button
                      className="product-save-btn"
                      type="button"
                      disabled={savingId === job.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleToggleSave(job.id);
                      }}
                    >
                      {isSaved(job.id) ? "❤" : "♡"}
                    </button>

                    {/* clickable content */}
                    <Link href={`/jobs/${job.id}`} className="product-card-body">
                      <div className="product-card-title">{job.title}</div>

                      <div className="product-card-company">
                        {[job.company_name, job.location, job.remote_type]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>

                      {job.short_description && (
                        <div className="products-card-description" style={{ marginTop: 6 }}>
                          {job.short_description}
                        </div>
                      )}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: 8,
                          fontSize: 11,
                          color: "#9ca3af",
                        }}
                      >
                        {job.employment_type && (
                          <span
                            style={{
                              padding: "3px 9px",
                              borderRadius: 999,
                              border: "1px solid rgba(148,163,184,0.5)",
                            }}
                          >
                            {job.employment_type}
                          </span>
                        )}

                        {job.salary_display && (
                          <span style={{ color: "#7dd3fc", fontWeight: 500 }}>
                            {job.salary_display}
                          </span>
                        )}
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
