// pages/jobs/[id].tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type Job = {
  id: string;
  title: string | null;
  company_name: string | null;

  org_id?: string | null;
  org_slug?: string | null;

  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;

  additional_description: string | null;

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

function cleanLinesToList(value?: string | null) {
  const raw = (value || "").replace(/\r/g, "").trim();
  if (!raw) return [];
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^[-•\u2022]\s*/, "").trim())
    .filter(Boolean);
}

export default function JobDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useSupabaseUser();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchJob = async () => {
      if (!id) return;
      setLoading(true);
      setLoadError(null);

      try {
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
            org_id:
              jobRow.org_id ??
              jobRow.organisation_id ??
              jobRow.organisations_id ??
              null,
            org_slug: orgSlug,

            location: jobRow.location,
            employment_type: jobRow.employment_type,
            remote_type: jobRow.remote_type,
            short_description: jobRow.short_description,

            additional_description: jobRow.additional_description ?? null,

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

  const responsibilities = useMemo(
    () => cleanLinesToList(job?.key_responsibilities),
    [job?.key_responsibilities]
  );
  const mustHave = useMemo(
    () => cleanLinesToList(job?.must_have_qualifications),
    [job?.must_have_qualifications]
  );
  const ideal = useMemo(
    () => cleanLinesToList(job?.ideal_qualifications),
    [job?.ideal_qualifications]
  );
  const offer = useMemo(
    () => cleanLinesToList(job?.what_we_offer),
    [job?.what_we_offer]
  );

  const hasAnyStructured = !!(
    (job?.role || "").trim() ||
    responsibilities.length ||
    mustHave.length ||
    ideal.length ||
    offer.length
  );

  return (
    <section className="section">
      <div className="job-shell">
        <div className="top-actions">
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
            <div className="top-actions-right">
              <button
                type="button"
                className="nav-ghost-btn"
                onClick={() => router.push(`/jobs/new?id=${job?.id}`)}
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
            </div>
          )}
        </div>

        {loading && <p className="products-status">Loading job…</p>}
        {loadError && (
          <p className="products-status error" style={{ marginTop: 8 }}>
            {loadError}
          </p>
        )}

        {!loading && !loadError && job && (
          <div className="job-card">
            <div className="hero">
              <div className="heroKicker">JOB</div>
              <h1 className="heroTitle">{job.title || "Untitled job"}</h1>

              {/* ✅ truly clickable */}
              {{job.company_name &&
  (job.org_slug ? (
    <Link href={`/orgs/${encodeURIComponent(job.org_slug)}`}>
      <a className="heroCompanyLink">{job.company_name}</a>
    </Link>
  ) : (
    <div className="heroCompany">{job.company_name}</div>
  ))}

              {(job.location || job.employment_type || job.remote_type) && (
                <div className="heroMeta">
                  {[job.location, job.employment_type, job.remote_type]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              )}

              {(formattedDate || job.salary_display) && (
                <div className="heroMeta2">
                  {formattedDate ? `Posted on ${formattedDate}` : ""}
                  {formattedDate && job.salary_display ? " · " : ""}
                  {job.salary_display ? job.salary_display : ""}
                </div>
              )}

              <div className="heroCtas">
                {job.apply_url && (
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
                )}

                {keywordList.length > 0 && (
                  <div className="heroTags" aria-label="Keywords">
                    {keywordList.slice(0, 8).map((k) => (
                      <span key={k} className="tagChip">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {job.short_description && (
                <div className="heroSummary">{job.short_description}</div>
              )}
            </div>

            <div className="divider" />

            {hasAnyStructured ? (
              <div className="jobBody">
                {!!(job.role || "").trim() && (
                  <div className="block blockRole">
                    <h2 className="hRole">The Role</h2>
                    <p className="pText">{(job.role || "").trim()}</p>
                  </div>
                )}

                <div className="twoCol">
                  <div className="col">
                    {responsibilities.length > 0 && (
                      <div className="block">
                        <h3 className="hTeal">Key Responsibilities</h3>
                        <ul className="bullets">
                          {responsibilities.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {mustHave.length > 0 && (
                      <div className="block">
                        <h3 className="hTeal">Must-Have Qualifications</h3>
                        <ul className="bullets">
                          {mustHave.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="col">
                    {ideal.length > 0 && (
                      <div className="block">
                        <h3 className="hTeal">Ideal Qualifications</h3>
                        <ul className="bullets">
                          {ideal.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {offer.length > 0 && (
                      <div className="block">
                        <h3 className="hTeal">What We Offer</h3>
                        <ul className="bullets">
                          {offer.map((x, i) => (
                            <li key={i}>{x}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {!!(job.additional_description || "").trim() && (
                  <div className="block">
                    <h3 className="hTeal">Additional description</h3>
                    <p className="pText" style={{ whiteSpace: "pre-wrap" }}>
                      {(job.additional_description || "").trim()}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="jobBody">
                {!!(job.additional_description || "").trim() && (
                  <div className="block">
                    <h3 className="hTeal">Additional description</h3>
                    <p className="pText" style={{ whiteSpace: "pre-wrap" }}>
                      {(job.additional_description || "").trim()}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .job-shell {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
        }

        .top-actions {
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .top-actions-right {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          align-items: center;
        }

        .delete-btn {
          border-color: rgba(248, 113, 113, 0.7);
          color: #fecaca;
        }

        .job-card {
          width: 100%;
          border-radius: 18px;
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.25);
          overflow: hidden;
        }

        .hero {
          padding: 18px;
          background: radial-gradient(
              circle at 0% 0%,
              rgba(56, 189, 248, 0.12),
              transparent 55%
            ),
            rgba(15, 23, 42, 0.95);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .divider {
          height: 1px;
          width: 100%;
          background: rgba(148, 163, 184, 0.18);
        }

        .heroKicker {
          font-size: 12px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: rgba(148, 163, 184, 0.9);
        }

        .heroTitle {
          margin: 0;
          font-size: 28px;
          line-height: 1.15;
          font-weight: 750;
          color: rgba(226, 232, 240, 0.98);
        }

        .heroCompany {
          font-size: 14px;
          font-weight: 650;
          color: #7dd3fc;
        }

        .heroCompanyLink {
          font-size: 14px;
          font-weight: 650;
          color: #7dd3fc;
          text-decoration: underline;
          cursor: pointer;
          width: fit-content;
        }

        .heroCompanyLink:hover {
          opacity: 0.95;
        }

        .heroMeta {
          margin-top: 2px;
          font-size: 13px;
          color: rgba(148, 163, 184, 0.95);
        }

        .heroMeta2 {
          font-size: 12px;
          color: rgba(148, 163, 184, 0.75);
        }

        .heroCtas {
          margin-top: 8px;
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          align-items: center;
        }

        .heroTags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .tagChip {
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(2, 6, 23, 0.55);
          color: rgba(226, 232, 240, 0.9);
        }

        .heroSummary {
          margin-top: 10px;
          max-width: 860px;
          font-size: 14px;
          color: rgba(226, 232, 240, 0.92);
          line-height: 1.55;
        }

        .jobBody {
          padding: 18px 20px 22px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .block {
          max-width: 1100px;
        }

        .blockRole {
          max-width: 920px;
        }

        .hRole {
          margin: 0 0 8px;
          font-size: 26px;
          font-weight: 800;
          color: #7c3aed;
          letter-spacing: -0.01em;
        }

        .hTeal {
          margin: 0 0 10px;
          font-size: 22px;
          font-weight: 800;
          color: #2dd4bf;
          letter-spacing: -0.01em;
        }

        .pText {
          margin: 0;
          font-size: 14px;
          color: rgba(226, 232, 240, 0.92);
          line-height: 1.65;
          white-space: pre-wrap;
        }

        .twoCol {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }

        @media (max-width: 900px) {
          .twoCol {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .col {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .bullets {
          margin: 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .bullets li {
          font-size: 14px;
          color: rgba(226, 232, 240, 0.92);
          line-height: 1.6;
        }
      `}</style>
    </section>
  );
}

(JobDetailPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
