// pages/ecosystem/saved-jobs.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

// Job shape – same fields we use on jobs/index.tsx
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

export default function EcosystemSavedJobsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<string>("Loading saved jobs…");
  const [error, setError] = useState<string | null>(null);

  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // NEW: local search
  const [search, setSearch] = useState("");

  // redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/ecosystem/saved-jobs");
    }
  }, [loading, user, router]);

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
      setStatus("");
    };

    if (user) loadSavedJobs();
  }, [user]);

  const isSaved = (id: string) => savedJobIds.includes(id);

  const handleToggleSave = async (jobId: string) => {
    if (!user) {
      router.push("/auth?redirect=/ecosystem/saved-jobs");
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
    const q = search.trim().toLowerCase();
    if (!q) return jobs;

    return jobs.filter((j) => {
      const hay = [
        j.title,
        j.company_name,
        j.location,
        j.employment_type,
        j.remote_type,
        j.short_description,
        j.salary_display,
        j.keywords,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [jobs, search]);

  if (!user && !loading) return null;

  return (
    <section className="section">
      <div className="section-header" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="section-title">Saved jobs</div>
          <div className="section-sub" style={{ maxWidth: 560 }}>
            Jobs you&apos;ve liked. Search and manage them here.
          </div>
        </div>

        {!status && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {jobs.length} job{jobs.length === 1 ? "" : "s"} saved
          </div>
        )}
      </div>

      {/* Search bar */}
      {!status && jobs.length > 0 && (
        <div style={{ marginTop: 12, marginBottom: 18, maxWidth: 640 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved jobs… (title, company, location, keywords)"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.5)",
              background: "rgba(15,23,42,0.95)",
              color: "#e5e7eb",
              fontSize: 14,
              outline: "none",
            }}
          />
          {search.trim() && (
            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(148,163,184,0.95)" }}>
              Showing {filteredJobs.length} result{filteredJobs.length === 1 ? "" : "s"} for{" "}
              <span style={{ color: "#e5e7eb", fontWeight: 600 }}>&quot;{search.trim()}&quot;</span>
            </div>
          )}
        </div>
      )}

      {status && (
        <p className={error ? "dashboard-status error" : "dashboard-status"}>
          {status}
        </p>
      )}

      {!status && jobs.length === 0 && !error && (
        <p className="dashboard-status">
          You haven&apos;t saved any roles yet. Explore jobs and tap the heart
          to keep them here.
        </p>
      )}

      {!status && jobs.length > 0 && filteredJobs.length === 0 && (
        <div className="products-empty">
          No saved jobs matched{" "}
          <span style={{ fontWeight: 600 }}>&quot;{search.trim()}&quot;</span>.
        </div>
      )}

      {filteredJobs.length > 0 && (
        <div className="jobs-grid">
          {filteredJobs.map((job) => {
            const saved = isSaved(job.id);

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
                      if (!savingId) handleToggleSave(job.id);
                    }}
                    aria-label={saved ? "Remove from saved jobs" : "Save job"}
                    title={saved ? "Unsave" : "Save"}
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
                  <span className="job-salary">{job.salary_display || ""}</span>
                  {job.employment_type && (
                    <span className="job-type">{job.employment_type}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

(EcosystemSavedJobsPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
