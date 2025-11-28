// pages/dashboard/saved-jobs.tsx
import { useEffect, useState } from "react";
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
  salary_display: string | null;
};

export default function SavedJobsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [status, setStatus] = useState<string>("Loading saved jobs…");
  const [error, setError] = useState<string | null>(null);

  // redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard/saved-jobs");
    }
  }, [loading, user, router]);

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
      setStatus("");
    };

    if (user) loadSavedJobs();
  }, [user]);

  if (!user && !loading) return null;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Saved jobs</div>
              <div className="section-sub">
                Jobs you&apos;ve liked from the Quantum Jobs Universe.
              </div>
            </div>
          </div>

          {status && (
            <p className={error ? "dashboard-status error" : "dashboard-status"}>
              {status}
            </p>
          )}

          {!status && jobs.length === 0 && !error && (
            <p className="dashboard-status">
              You haven&apos;t saved any roles yet. Explore jobs and tap the heart to
              keep them here.
            </p>
          )}

          <div className="dashboard-list">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="dashboard-card"
              >
                <div className="dashboard-card-main">
                  <div className="dashboard-card-title">{job.title}</div>
                  <div className="dashboard-card-sub">
                    {[job.company_name, job.location, job.remote_type]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                  {job.short_description && (
                    <div
                      style={{
                        fontSize: 12,
                        color: "#d1d5db",
                        marginTop: 4,
                      }}
                    >
                      {job.short_description}
                    </div>
                  )}
                </div>

                <div className="dashboard-card-meta">
                  {job.employment_type && (
                    <span className="dashboard-pill">{job.employment_type}</span>
                  )}
                  {job.salary_display && (
                    <span className="dashboard-pill">{job.salary_display}</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
