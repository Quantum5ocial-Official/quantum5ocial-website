// pages/jobs/[id].tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type Job = {
  id: string;
  title: string | null;
  company_name: string | null;

  // Optional org linkage (if you add org_id and join)
  org_id?: string | null;
  org_slug?: string | null;

  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
  description: string | null;

  // ✅ new structured fields (safe even if null)
  role?: string | null;
  key_responsibilities?: string | null;
  must_have_qualifications?: string | null;
  ideal_qualifications?: string | null;
  what_we_offer?: string | null;

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

      try {
        // LEFT JOIN org slug (works even if org_id is null)
        const { data, error } = await supabase
          .from("jobs")
          .select(
            `
              *,
              organizations:organizations(
                slug
              )
            `
          )
          .eq("id", id)
          .maybeSingle();

        if (error) {
          console.error("Error loading job", error);
          setLoadError("Could not load this job.");
          setJob(null);
        } else if (data) {
          const jobRow: any = data;
          const orgSlug = jobRow.organizations?.slug ?? null;

          const jobWithOrg: Job = {
            id: jobRow.id,
            title: jobRow.title,
            company_name: jobRow.company_name,

            // prefer org_id column (your schema has org_id)
            org_id: jobRow.org_id ?? jobRow.organisation_id ?? jobRow.organisations_id ?? null,
            org_slug: orgSlug,

            location: jobRow.location,
            employment_type: jobRow.employment_type,
            remote_type: jobRow.remote_type,
            short_description: jobRow.short_description,
            description: jobRow.description,

            // ✅ new fields
            role: jobRow.role ?? null,
            key_responsibilities: jobRow.key_responsibilities ?? null,
            must_have_qualifications: jobRow.must_have_qualifications ?? null,
            ideal_qualifications: jobRow.ideal_qualifications ?? null,
            what_we_offer: jobRow.what_we_offer ?? null,

            keywords: jobRow.keywords,
            salary_display: jobRow.salary_display,
            apply_url: jobRow.apply_url,
            owner_id: jobRow.owner_id,
            created_at: jobRow.created_at,
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

  // helper for structured sections
  const renderBlock = (label: string, value?: string | null) => {
    const v = (value || "").trim();
    if (!v) return null;
    return (
      <div style={{ marginTop: 18 }}>
        <div className="profile-section-label">{label}</div>
        <p
          className="profile-summary-text"
          style={{ whiteSpace: "pre-wrap", fontSize: 13 }}
        >
          {v}
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

          {/* Back + owner actions in one row */}
          <div className="header-actions">
            <button
              type="button"
              className="nav-ghost-btn"
              onClick={() => router.push("/jobs")}
              style={{
                padding: "4px 10px",
                minWidth: "unset",
                width: "auto",
                lineHeight: "1.2",
              }}
            >
              ← Back to jobs
            </button>

            {isOwner && (
              <>
                <button
                  type="button"
                  className="nav-ghost-btn"
                  onClick={() => router.push(`/jobs/new?id=${job?.id}`)}
                  // ✅ tight pill width (fix)
                  style={{
                    padding: "4px 10px",
                    minWidth: "unset",
                    width: "auto",
                    lineHeight: "1.2",
                  }}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="nav-cta delete-btn"
                  onClick={handleDelete}
                  disabled={deleting}
                  style={{
                    padding: "4px 10px",
                    minWidth: "unset",
                    width: "auto",
                    lineHeight: "1.2",
                  }}
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
            {/* Main top section */}
            <div className="product-detail-top">
              <div className="product-detail-main">
                <h1 className="product-detail-title">
                  {job.title || "Untitled job"}
                </h1>

                {/* ✅ Clickable company name if org slug available */}
                {job.company_name &&
                  (job.org_slug ? (
                    <Link href={`/orgs/${encodeURIComponent(job.org_slug)}`}>
                      <span
                        className="product-detail-company"
                        style={{ textDecoration: "underline", cursor: "pointer" }}
                      >
                        {job.company_name}
                      </span>
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
                      style={{
                        padding: "6px 12px",
                        minWidth: "unset",
                        width: "fit-content",
                      }}
                    >
                      Apply / learn more
                    </a>
                  </div>
                )}
              </div>

              {/* Summary / short description */}
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

            {/* ✅ Structured blocks */}
            {renderBlock("The role", job.role)}
            {renderBlock("Key responsibilities", job.key_responsibilities)}
            {renderBlock("Must-have qualifications", job.must_have_qualifications)}
            {renderBlock("Ideal qualifications", job.ideal_qualifications)}
            {renderBlock("What we offer", job.what_we_offer)}

            {/* Full description (keep existing) */}
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
          </div>
        )}
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
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }

        /* Container for back + owner actions */
        .header-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
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

        .delete-btn {
          border-color: rgba(248, 113, 113, 0.7);
          color: #fecaca;
        }
      `}</style>
    </section>
  );
}

// ✅ global layout: left sidebar + middle only, no right column
(JobDetailPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
