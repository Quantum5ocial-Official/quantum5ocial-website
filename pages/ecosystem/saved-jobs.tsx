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
        setStatus("");
        return;
      }

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

  const total = jobs.length;
  const showList = !status && !error && total > 0;

  return (
    <section className="section">
      {/* Header card — matches /ecosystem/following */}
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.16), rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className="section-title"
              style={{ display: "flex", gap: 10, alignItems: "center" }}
            >
              💼 Saved jobs
              {!status && !error && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(56,189,248,0.45)",
                    color: "#7dd3fc",
                    whiteSpace: "nowrap",
                  }}
                >
                  {total} total
                </span>
              )}
            </div>

            <div className="section-sub" style={{ maxWidth: 560 }}>
              Jobs you&apos;ve liked. Search and manage them here.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
            }}
          >
            <Link
              href="/ecosystem"
              className="section-link"
              style={{ fontSize: 13 }}
            >
              ← Back to ecosystem
            </Link>
            <Link
              href="/jobs"
              className="section-link"
              style={{ fontSize: 13 }}
            >
              Discover jobs →
            </Link>
          </div>
        </div>

        {/* Search (inside header card) */}
        {showList && (
          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 10,
              maxWidth: 720,
            }}
          >
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved jobs… (title, company, location, keywords)"
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.5)",
                background: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                fontSize: 14,
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => setSearch((s) => s.trim())}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Search
            </button>
          </div>
        )}

        {showList && search.trim() && (
          <div
            style={{
              marginTop: 10,
              fontSize: 12,
              color: "rgba(148,163,184,0.95)",
            }}
          >
            Showing {filteredJobs.length} result
            {filteredJobs.length === 1 ? "" : "s"} for{" "}
            <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
              &quot;{search.trim()}&quot;
            </span>
          </div>
        )}
      </div>

      {/* States */}
      {status && (
        <div className={error ? "dashboard-status error" : "dashboard-status"}>
          {status}
        </div>
      )}

      {!status && error && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {error}
        </div>
      )}

      {!status && !error && total === 0 && (
        <div className="products-empty">
          You haven&apos;t saved any roles yet. Explore jobs and tap the heart
          to keep them here.
        </div>
      )}

      {!status && !error && total > 0 && filteredJobs.length === 0 && (
        <div className="products-empty">
          No saved jobs matched{" "}
          <span style={{ fontWeight: 600 }}>&quot;{search.trim()}&quot;</span>.
        </div>
      )}

      {/* Cards */}
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
