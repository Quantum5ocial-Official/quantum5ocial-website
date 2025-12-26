// pages/jobs/[id].tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

function firstQueryValue(v: string | string[] | undefined) {
  if (!v) return "";
  return Array.isArray(v) ? v[0] : v;
}

type Job = {
  id: string;
  title: string | null;
  company_name: string | null;

  // org linkage
  org_id?: string | null;
  org_slug?: string | null;

  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
  description: string | null;

  // new fields
  role?: string | null;
  key_responsibilities?: string | null;
  ideal_qualifications?: string | null;
  must_have_qualifications?: string | null;
  what_we_offer?: string | null;

  keywords: string | null;
  salary_display: string | null;
  apply_url: string | null;
  owner_id: string | null;
  created_at?: string | null;
};

export default function JobDetailPage() {
  const router = useRouter();
  const { user } = useSupabaseUser();

  const jobId = firstQueryValue(router.query.id as any);

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!router.isReady) return;
      if (!jobId) return;

      setLoading(true);
      setLoadError(null);

      try {
        // LEFT join org slug via jobs_org_id_fkey (do not require org_id)
        const { data, error } = await supabase
          .from("jobs")
          .select(
            `
              id,
              title,
              company_name,
              org_id,
              location,
              employment_type,
              remote_type,
              short_description,
              description,
              role,
              key_responsibilities,
              ideal_qualifications,
              must_have_qualifications,
              what_we_offer,
              keywords,
              salary_display,
              apply_url,
              owner_id,
              created_at,
              organizations:organizations!jobs_org_id_fkey(
                slug
              )
            `
          )
          .eq("id", jobId)
          .maybeSingle();

        if (error) {
          console.error("Error loading job", error);
          setLoadError("Could not load this job.");
          setJob(null);
        } else if (data) {
          const row: any = data;

          const jobWithOrg: Job = {
            id: row.id,
            title: row.title,
            company_name: row.company_name,
            org_id: row.org_id ?? null,
            org_slug: row.organizations?.slug ?? null,

            location: row.location,
            employment_type: row.employment_type,
            remote_type: row.remote_type,
            short_description: row.short_description,
            description: row.description,

            role: row.role ?? null,
            key_responsibilities: row.key_responsibilities ?? null,
            ideal_qualifications: row.ideal_qualifications ?? null,
            must_have_qualifications: row.must_have_qualifications ?? null,
            what_we_offer: row.what_we_offer ?? null,

            keywords: row.keywords,
            salary_display: row.salary_display,
            apply_url: row.apply_url,
            owner_id: row.owner_id,
            created_at: row.created_at,
          };

          setJob(jobWithOrg);
        } else {
          setJob(null);
          setLoadError("Job not found.");
        }
      } catch (e) {
        console.error("Unexpected fetch error", e);
        setLoadError("Could not load this job.");
        setJob(null);
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [router.isReady, jobId]);

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

  const showAnyStructured =
    !!job &&
    !!(
      job.role ||
      job.key_responsibilities ||
      job.must_have_qualifications ||
      job.ideal_qualifications ||
      job.what_we_offer
    );

  const Block = ({
    label,
    value,
  }: {
    label: string;
    value: string | null | undefined;
  }) => {
    if (!value || !String(value).trim()) return null;
    return (
      <div style={{ marginTop: 18 }}>
        <div className="profile-section-label">{label}</div>
        <p
          className="profile-summary-text"
          style={{ whiteSpace: "pre-wrap", fontSize: 13 }}
        >
          {String(value).trim()}
        </p>
      </div>
    );
  };

  return (
    <section className="section">
      <div className="job-detail-shell">
        {/* Header row */}
        <div className="section-header job-detail-header">
          <div>
            <div className="section-title">Job details</div>
            <div className="section-sub">
              A role inside the quantum ecosystem listed on Quantum5ocial.
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="nav-ghost-btn"
              onClick={() => router.push("/jobs")}
            >
              ← Back to jobs
            </button>

            {isOwner && (
              <>
                <button
                  type="button"
                  className="nav-ghost-btn"
                  onClick={() => router.push(`/jobs/new?id=${job?.id || ""}`)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="nav-cta delete-btn"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </>
            )}
          </div>
        </div>

        {loading && <p className="products-status">Loading job…</p>}
        {loadError && (
          <p className="products-status error" style={{ marginTop: 8 }}>
            {loadError}
          </p>
        )}

        {!loading && !loadError && job && (
          <div className="product-detail-card">
            <div className="product-detail-top">
              <div className="product-detail-main">
                <h1 className="product-detail-title">
                  {job.title || "Untitled job"}
                </h1>

                {job.company_name &&
                  (job.org_slug ? (
                    <Link
                      href={`/orgs/${encodeURIComponent(job.org_slug)}`}
                      className="product-detail-company"
                      style={{ textDecoration: "underline" }}
                    >
                      {job.company_name}
                    </Link>
                  ) : (
                    <div className="product-detail-company">
                      {job.company_name}
                    </div>
                  ))}

                {(job.location || job.employment_type || job.remote_type) && (
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
                  <div className="product-detail-price">{job.salary_display}</div>
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
              </div>

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

            {/* Full description */}
            {job.description && (
              <div style={{ marginTop: 24 }}>
                <div className="profile-section-label">Full description</div>
                <p
                  className="profile-summary-text"
                  style={{ whiteSpace: "pre-wrap", fontSize: 13 }}
                >
                  {job.description}
                </p>
              </div>
            )}

            {/* New structured sections */}
            {showAnyStructured && (
              <div style={{ marginTop: 10 }}>
                <Block label="The role" value={job.role ?? null} />
                <Block
                  label="Key responsibilities"
                  value={job.key_responsibilities ?? null}
                />
                <Block
                  label="Must-have qualifications"
                  value={job.must_have_qualifications ?? null}
                />
                <Block
                  label="Ideal qualifications"
                  value={job.ideal_qualifications ?? null}
                />
                <Block label="What we offer" value={job.what_we_offer ?? null} />
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .job-detail-shell {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
        }

        .job-detail-header {
          margin-bottom: 18px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        .header-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .product-detail-card {
          width: 100%;
          padding: 24px 22px 28px;
          border-radius: 18px;
          background: radial-gradient(
              circle at top left,
              rgba(56, 189, 248, 0.06),
              transparent 55%
            ),
            rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.25);
        }

        .product-detail-top {
          display: grid;
          grid-template-columns: minmax(0, 1fr);
          gap: 32px;
        }

        @media (max-width: 900px) {
          .product-detail-top {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .product-detail-main {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .product-detail-title {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
        }

        .product-detail-company {
          font-size: 14px;
          font-weight: 500;
          color: #7dd3fc;
        }

        .product-detail-price {
          margin-top: 10px;
          font-size: 15px;
          font-weight: 600;
          color: #22d3ee;
        }

        .product-detail-body {
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid rgba(31, 41, 55, 0.9);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .product-detail-section {
          max-width: 800px;
        }

        .profile-section-label {
          font-size: 13px;
          font-weight: 700;
          color: rgba(148, 163, 184, 0.9);
          margin-bottom: 4px;
        }

        .profile-summary-text {
          font-size: 14px;
          color: rgba(226, 232, 240, 0.92);
          line-height: 1.5;
        }

        .profile-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .profile-tag-chip {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          background: rgba(15, 23, 42, 0.9);
          color: #cbd5f5;
        }

        .nav-ghost-btn,
        .nav-cta {
          padding: 6px 12px;
          min-width: auto;
        }

        .delete-btn {
          border-color: rgba(248, 113, 113, 0.7);
          color: #fecaca;
        }
      `}</style>
    </section>
  );
}

(JobDetailPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
