// pages/jobs/index.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

type Job = {
  id: string;
  owner_id: string | null;
  title: string | null;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
  description: string | null;
  keywords: string | null;
  salary_display: string | null;
  apply_url: string | null;
  created_at: string | null;
};

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Internship",
  "PhD",
  "Postdoc",
  "Contract",
  "Fellowship",
  "Other",
];

const REMOTE_TYPES = ["On-site", "Hybrid", "Remote"];

export default function JobsPage() {
  const { user } = useSupabaseUser();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savedJobIds, setSavedJobIds] = useState<Set<string>>(new Set());

  // Filters
  const [search, setSearch] = useState("");
  const [selectedEmployment, setSelectedEmployment] = useState<string | null>(
    null
  );
  const [selectedRemoteType, setSelectedRemoteType] = useState<string | null>(
    null
  );

  // Load all jobs
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
        setSavedJobIds(new Set());
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

      const ids = new Set<string>();
      (data || []).forEach((row: any) => {
        if (row.job_id) ids.add(row.job_id);
      });
      setSavedJobIds(ids);
    };

    loadSaved();
  }, [user]);

  const toggleSaved = async (jobId: string, isCurrentlySaved: boolean) => {
    if (!user) {
      alert("Please log in to save jobs.");
      return;
    }

    if (isCurrentlySaved) {
      const { error } = await supabase
        .from("saved_jobs")
        .delete()
        .eq("user_id", user.id)
        .eq("job_id", jobId);

      if (error) {
        console.error("Error removing saved job", error);
        return;
      }

      setSavedJobIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    } else {
      const { error } = await supabase.from("saved_jobs").insert({
        user_id: user.id,
        job_id: jobId,
      });

      if (error) {
        console.error("Error saving job", error);
        return;
      }

      setSavedJobIds((prev) => {
        const next = new Set(prev);
        next.add(jobId);
        return next;
      });
    }
  };

  // Apply filters
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const text = (
        `${job.title || ""} ${job.company_name || ""} ${
          job.location || ""
        } ${job.short_description || ""} ${job.keywords || ""}`
      )
        .toLowerCase()
        .trim();

      const matchesSearch = !search.trim()
        ? true
        : text.includes(search.toLowerCase().trim());

      const matchesEmployment = selectedEmployment
        ? (job.employment_type || "").toLowerCase() ===
          selectedEmployment.toLowerCase()
        : true;

      const matchesRemote = selectedRemoteType
        ? (job.remote_type || "").toLowerCase() ===
          selectedRemoteType.toLowerCase()
        : true;

      return matchesSearch && matchesEmployment && matchesRemote;
    });
  }, [jobs, search, selectedEmployment, selectedRemoteType]);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header" style={{ marginBottom: 18 }}>
            <div>
              <div className="section-title">Quantum jobs marketplace</div>
              <div className="section-sub">
                Discover roles across labs, universities, and companies in the
                quantum ecosystem.
              </div>
            </div>

            {user && (
              <Link href="/jobs/new" className="nav-ghost-btn">
                Post a job
              </Link>
            )}
          </div>

          <div className="products-layout">
            {/* Left filter sidebar */}
            <aside className="products-filters">
              <div className="products-filters-section">
                <div className="products-filters-title">Search</div>
                <input
                  className="products-filters-search"
                  type="text"
                  placeholder="Search by title, company, keywords…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="products-filters-section">
                <div className="products-filters-title">
                  Employment type
                </div>
                <div className="products-filters-chips">
                  {EMPLOYMENT_TYPES.map((type) => {
                    const active =
                      selectedEmployment?.toLowerCase() ===
                      type.toLowerCase();
                    return (
                      <button
                        key={type}
                        type="button"
                        className={
                          "products-filter-chip" + (active ? " active" : "")
                        }
                        onClick={() =>
                          setSelectedEmployment((prev) =>
                            prev?.toLowerCase() === type.toLowerCase()
                              ? null
                              : type
                          )
                        }
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="products-filters-section">
                <div className="products-filters-title">Work mode</div>
                <div className="products-filters-chips">
                  {REMOTE_TYPES.map((type) => {
                    const active =
                      selectedRemoteType?.toLowerCase() ===
                      type.toLowerCase();
                    return (
                      <button
                        key={type}
                        type="button"
                        className={
                          "products-filter-chip" + (active ? " active" : "")
                        }
                        onClick={() =>
                          setSelectedRemoteType((prev) =>
                            prev?.toLowerCase() === type.toLowerCase()
                              ? null
                              : type
                          )
                        }
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* Right: jobs grid using the same card style as homepage */}
            <div className="products-results">
              <div className="products-results-header">
                <div className="products-status">
                  {loading
                    ? "Loading jobs…"
                    : `${filteredJobs.length} job${
                        filteredJobs.length === 1 ? "" : "s"
                      }`}
                </div>
              </div>

              {error && (
                <div className="products-status error" style={{ marginTop: 8 }}>
                  {error}
                </div>
              )}

              {!loading && !error && filteredJobs.length === 0 && (
                <div className="products-empty" style={{ marginTop: 8 }}>
                  No jobs match your filters yet.
                </div>
              )}

              {/* 3-column grid of cards, same layout as Featured roles */}
              <div className="card-row">
                {filteredJobs.map((job) => {
                  const isSaved = savedJobIds.has(job.id);

                  const allKeywords =
                    job.keywords
                      ?.split(",")
                      .map((k) => k.trim())
                      .filter(Boolean) || [];
                  const topTags = allKeywords.slice(0, 3);

                  const metaParts = [
                    job.company_name || undefined,
                    job.location || undefined,
                    job.remote_type || undefined,
                  ].filter(Boolean);

                  const bottomLine =
                    job.short_description ||
                    job.salary_display ||
                    "Hiring soon via Quantum5ocial.";

                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="card"
                    >
                      <div className="card-inner">
                        {/* Heart save button in top-right */}
                        <button
                          className="product-save-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSaved(job.id, isSaved);
                          }}
                          aria-label={
                            isSaved ? "Unsave job" : "Save job to favourites"
                          }
                        >
                          {isSaved ? "♥" : "♡"}
                        </button>

                        <div className="card-top-row">
                          <div className="card-title">
                            {job.title || "Untitled role"}
                          </div>
                          {job.employment_type && (
  <div className="job-pill-center">
    <span className="card-pill">{job.employment_type}</span>
  </div>
)}
                        </div>

                        {metaParts.length > 0 && (
                          <div className="card-meta">
                            {metaParts.join(" · ")}
                          </div>
                        )}

                        {topTags.length > 0 && (
                          <div className="card-tags">
                            {topTags.map((t) => (
                              <span key={t} className="card-tag">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="card-footer-text">{bottomLine}</div>
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
