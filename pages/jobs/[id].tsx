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

export default function JobDetailPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();
  const { id } = router.query;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadJob = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) {
        console.error("Error loading job", error);
        setError("Could not load job.");
        setJob(null);
      } else if (!data) {
        setError("Job not found.");
        setJob(null);
      } else {
        setJob(data as Job);
      }

      setLoading(false);
    };

    loadJob();
  }, [id]);

  const isOwner = user && job && job.owner_id === user.id;

  const handleDelete = async () => {
    if (!job || !user) return;
    if (!isOwner) return;

    const ok = confirm(
      "Are you sure you want to delete this job listing permanently?"
    );
    if (!ok) return;

    setDeleting(true);

    const { error } = await supabase
      .from("jobs")
      .delete()
      .eq("id", job.id)
      .eq("owner_id", user.id);

    if (error) {
      console.error("Error deleting job", error);
      alert("Could not delete job. Please try again.");
      setDeleting(false);
      return;
    }

    router.push("/jobs");
  };

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <button
            type="button"
            className="nav-ghost-btn"
            onClick={() => router.push("/jobs")}
            style={{ marginBottom: 14 }}
          >
            ← Back to jobs
          </button>

          {loading && (
            <p className="products-status" style={{ marginTop: 10 }}>
              Loading job…
            </p>
          )}

          {error && (
            <p className="products-status error" style={{ marginTop: 10 }}>
              {error}
            </p>
          )}

          {job && (
            <div className="product-detail-card">
              <div className="product-detail-top">
                <div className="product-detail-main">
                  <h1 className="product-detail-title">
                    {job.title || "Untitled role"}
                  </h1>
                  {job.company_name && (
                    <div className="product-detail-company">
                      {job.company_name}
                      {job.location ? ` · ${job.location}` : ""}
                    </div>
                  )}

                  {(job.employment_type || job.remote_type) && (
                    <div className="profile-summary-columns" style={{ marginTop: 10 }}>
                      {job.employment_type && (
                        <div className="profile-summary-item">
                          <div className="profile-summary-label">
                            Employment type
                          </div>
                          <div className="profile-summary-text">
                            {job.employment_type}
                          </div>
                        </div>
                      )}

                      {job.remote_type && (
                        <div className="profile-summary-item">
                          <div className="profile-summary-label">
                            Work mode
                          </div>
                          <div className="profile-summary-text">
                            {job.remote_type}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {job.salary_display && (
                    <div style={{ marginTop: 12 }}>
                      <div className="profile-summary-label">Salary</div>
                      <div className="product-detail-price">
                        {job.salary_display}
                      </div>
                    </div>
                  )}

                  {job.apply_url && (
                    <div style={{ marginTop: 18 }}>
                      <a
                        href={job.apply_url}
                        target="_blank"
                        rel="noreferrer"
                        className="nav-cta"
                      >
                        Apply / more info
                      </a>
                    </div>
                  )}

                  {isOwner && (
                    <div
                      style={{
                        marginTop: 18,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <button
                        type="button"
                        className="nav-ghost-btn"
                        onClick={() =>
                          router.push(`/jobs/new?id=${encodeURIComponent(job.id)}`)
                        }
                      >
                        Edit job
                      </button>
                      <button
                        type="button"
                        className="nav-ghost-btn"
                        style={{ borderColor: "#fca5a5", color: "#fecaca" }}
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? "Deleting…" : "Delete job"}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="product-detail-body">
                {job.short_description && (
                  <div className="product-detail-section">
                    <div className="profile-section-label">Summary</div>
                    <p className="profile-summary-text">
                      {job.short_description}
                    </p>
                  </div>
                )}

                {job.description && (
                  <div className="product-detail-section">
                    <div className="profile-section-label">Description</div>
                    <p className="profile-summary-text">
                      {job.description}
                    </p>
                  </div>
                )}

                {job.keywords && (
                  <div className="product-detail-section">
                    <div className="profile-tags-label">Keywords</div>
                    <div className="profile-tags">
                      {job.keywords
                        .split(",")
                        .map((k) => k.trim())
                        .filter(Boolean)
                        .map((k) => (
                          <span key={k} className="profile-tag-chip">
                            {k}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
