// pages/jobs/[id].tsx
import { useEffect, useState } from "react";
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
  apply_url: string | null;
  owner_id: string | null;
  created_at?: string | null;
};

export default function JobDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useSupabaseUser();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Load job
  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Error loading job", error);
        setLoadError("Could not load this job.");
        setJob(null);
      } else {
        setJob(data as Job);
      }

      setLoading(false);
    };

    fetchJob();
  }, [id]);

  const isOwner = !!user && job?.owner_id === user.id;

  const handleDelete = async () => {
    if (!job || !user) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this job? This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", job.id)
      .eq("owner_id", user.id);

    setDeleting(false);

    if (error) {
      console.error("Error deleting job", error);
      alert("Could not delete job. Please try again.");
      return;
    }

    router.push("/jobs");
  };

  const formattedDate = job?.created_at
    ? new Date(job.created_at).toLocaleDateString()
    : null;

  const keywordList =
    job?.keywords
      ?.split(",")
      .map((k) => k.trim())
      .filter(Boolean) || [];

  return (
    <>
      <div className="bg-layer" />
      <Navbar />
      <div className="page">
        <section className="section">
          <div className="job-detail-shell">
            {/* Header row (same width as card) */}
            <div className="section-header job-detail-header">
              <div>
                <div className="section-title">Job details</div>
                <div className="section-sub">
                  A role inside the quantum ecosystem listed on Quantum5ocial.
                </div>
              </div>

              <Link href="/jobs" className="nav-ghost-btn">
                ← Back to jobs
              </Link>
            </div>

            {loading && <p className="products-status">Loading job…</p>}
            {loadError && (
              <p className="products-status error" style={{ marginTop: 8 }}>
                {loadError}
              </p>
            )}

            {!loading && !loadError && job && (
              <div className="product-detail-card">
                {/* Top area */}
                <div className="product-detail-top">
                  <div className="product-detail-main">
                    <h1 className="product-detail-title">
                      {job.title || "Untitled job"}
                    </h1>

                    {job.company_name && (
                      <div className="product-detail-company">
                        {job.company_name}
                      </div>
                    )}

                    {(job.location ||
                      job.employment_type ||
                      job.remote_type) && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 13,
                          color: "rgba(148,163,184,0.95)",
                        }}
                      >
                        {[job.location, job.employment_type, job.remote_type]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}

                    {formattedDate && (
                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: "rgba(148,163,184,0.75)",
                        }}
                      >
                        Posted on {formattedDate}
                      </div>
                    )}

                    {job.salary_display && (
                      <div className="product-detail-price">
                        {job.salary_display}
                      </div>
                    )}

                    {job.apply_url && (
                      <div style={{ marginTop: 14 }}>
                        <a
                          href={job.apply_url}
                          target="_blank"
                          rel="noreferrer"
                          className="nav-cta"
                        >
                          Apply / learn more
                        </a>
                      </div>
                    )}

                    {isOwner && (
                      <div
                        style={{
                          marginTop: 18,
                          display: "flex",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          className="nav-ghost-btn"
                          onClick={() =>
                            router.push(`/jobs/new?id=${job.id}`)
                          }
                        >
                          Edit job
                        </button>
                        <button
                          type="button"
                          className="nav-cta"
                          style={{
                            borderColor: "rgba(248,113,113,0.7)",
                            color: "#fecaca",
                          }}
                          onClick={handleDelete}
                          disabled={deleting}
                        >
                          {deleting ? "Deleting…" : "Delete job"}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Short description / summary box */}
                  <div className="product-detail-body">
                    {job.short_description && (
                      <div className="product-detail-section">
                        <div className="profile-section-label">Summary</div>
                        <div className="profile-summary-text">
                          {job.short_description}
                        </div>
                      </div>
                    )}

                    {keywordList.length > 0 && (
                      <div className="product-detail-section">
                        <div className="profile-section-label">Keywords</div>
                        <div className="profile-tags">
                          {keywordList.map((k) => (
                            <span key={k} className="profile-tag-chip">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Full description below */}
                {job.description && (
                  <div style={{ marginTop: 24 }}>
                    <div className="profile-section-label">
                      Full description
                    </div>
                    <p
                      className="profile-summary-text"
                      style={{ whiteSpace: "pre-wrap", fontSize: 13 }}
                    >
                      {job.description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        /* Match homepage & product detail max width */
        .job-detail-shell {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
        }

        .job-detail-header {
          margin-bottom: 18px;
        }
      `}</style>
    </>
  );
}
