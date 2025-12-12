// pages/dashboard/saved-jobs.tsx
import { useEffect, useState } from "react";
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

function SavedJobsRightSidebar() {
  return (
    <aside
      className="sticky-col"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div className="hero-tiles hero-tiles-vertical">
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
            <div className="tile-cta">
              Jobs spotlight <span>›</span>
            </div>
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
              Highlighting a selected hardware, software, or service from the
              Quantum Products Lab.
            </p>
            <div className="tile-cta">
              Product spotlight <span>›</span>
            </div>
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
              A standout community member – for example a PI, postdoc, or startup
              founder.
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
  );
}

export default function SavedJobsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<string>("Loading saved jobs…");
  const [error, setError] = useState<string | null>(null);

  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard/saved-jobs");
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

  if (!user && !loading) return null;

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div className="section-title">Saved jobs</div>
          <div className="section-sub">
            Jobs you&apos;ve liked from the Quantum Jobs Universe.
          </div>
        </div>

        {!status && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {jobs.length} job{jobs.length === 1 ? "" : "s"} saved
          </div>
        )}
      </div>

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

      {jobs.length > 0 && (
        <div className="jobs-grid">
          {jobs.map((job) => {
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

// ✅ AppLayout config: 3 columns with right sidebar tiles
(SavedJobsPage as any).layoutProps = {
  variant: "three",
  right: <SavedJobsRightSidebar />,
};
