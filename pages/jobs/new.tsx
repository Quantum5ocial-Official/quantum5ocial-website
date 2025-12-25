// pages/jobs/new.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

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

/* -------------------------------------------------------------------------- */
/*  Types                                                                   */
/* -------------------------------------------------------------------------- */

type Org = {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  is_active?: boolean | null;
};

type OrgMemberRole = "owner" | "co_owner" | "admin" | "member";

type OrgMemberRowLite = {
  org_id: string;
  role: OrgMemberRole;
};

type JobRow = {
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
  created_at?: string | null;
  org_id?: string | null; // optional linkage if you want to store it
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                  */
/* -------------------------------------------------------------------------- */

function firstQueryValue(v: string | string[] | undefined) {
  if (!v) return "";
  return Array.isArray(v) ? v[0] : v;
}

function looksLikeUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
}

/* -------------------------------------------------------------------------- */
/*  Component                                                                */
/* -------------------------------------------------------------------------- */

export default function NewJobPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const jobId = firstQueryValue(router.query.id as any);
  const orgParam = firstQueryValue(router.query.org as any); // optional param for org page flow

  const isEditing = !!jobId;

  /* form fields */
  const [form, setForm] = useState({
    title: "",
    company_name: "",
    location: "",
    employment_type: "",
    remote_type: "",
    short_description: "",
    description: "",
    keywords: "",
    salary_display: "",
    apply_url: "",
  });

  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  /* ---------- Org / permission state ---------- */

  // When posting as an org:
  const [org, setOrg] = useState<Org | null>(null);
  const [loadingOrg, setLoadingOrg] = useState(false);
  const [canPostAsOrg, setCanPostAsOrg] = useState(false);

  // Marketplace style: user may have multiple eligible orgs
  const [eligibleOrgs, setEligibleOrgs] = useState<Org[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");

  // Decide whether we are in marketplace flow (no org param, not editing)
  const isMarketplaceCreate = !isEditing && !orgParam;

  // Lock company_name input when org is chosen
  const lockCompanyField = !!org;

  /* ---------------------------------------------------------------------- */
  /*  Redirect if not logged in                                              */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!loading && !user) {
      const redirectUrl = isEditing
        ? `/auth?redirect=/jobs/new?id=${encodeURIComponent(jobId || "")}`
        : "/auth?redirect=/jobs/new";
      router.replace(redirectUrl);
    }
  }, [loading, user, router, isEditing, jobId]);

  /* ---------------------------------------------------------------------- */
  /*  Load eligible orgs (marketplace flow)                                  */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const loadEligibleOrgs = async () => {
      if (!router.isReady) return;
      if (!user) return;
      if (!isMarketplaceCreate) return;

      setLoadingOrg(true);
      setLoadError(null);

      try {
        // 1) Orgs where user is creator
        const { data: created, error: createdErr } = await supabase
          .from("organizations")
          .select("id,name,slug,created_by,is_active")
          .eq("is_active", true)
          .eq("created_by", user.id);

        if (createdErr) throw createdErr;

        // 2) Orgs where user is owner/co_owner member
        const { data: memberRows, error: memberErr } = await supabase
          .from("org_members")
          .select("org_id, role")
          .eq("user_id", user.id)
          .in("role", ["owner", "co_owner"]);

        if (memberErr) throw memberErr;

        const memberOrgIds = Array.from(
          new Set(
            (memberRows || [])
              .map((r: any) => String(r.org_id))
              .filter(Boolean)
          )
        );

        const { data: memberOrgs, error: memberOrgsErr } = memberOrgIds.length
          ? await supabase
              .from("organizations")
              .select("id,name,slug,created_by,is_active")
              .eq("is_active", true)
              .in("id", memberOrgIds)
          : { data: [], error: null as any };

        if (memberOrgsErr) throw memberOrgsErr;

        // Merge unique
        const merged = [...(created || []), ...(memberOrgs || [])] as Org[];
        const uniq = Array.from(new Map(merged.map((o) => [o.id, o])).values());

        setEligibleOrgs(uniq);

        if (uniq.length === 1) {
          // Auto-pick single org
          const only = uniq[0];
          setOrg(only);
          setSelectedOrgId(only.id);
          setCanPostAsOrg(true);
          setForm((prev) => ({ ...prev, company_name: only.name || prev.company_name }));
          setLoadError(null);
        } else if (uniq.length > 1) {
          // Require explicit selection
          setOrg(null);
          setCanPostAsOrg(false);
          setLoadError("Choose an organization to publish under.");
        } else {
          // None
          setOrg(null);
          setCanPostAsOrg(false);
          setLoadError("You need an organization to publish a job.");
        }
      } catch (e: any) {
        console.error("Error loading eligible orgs", e);
        setOrg(null);
        setCanPostAsOrg(false);
        setEligibleOrgs([]);
        setLoadError("Could not load your organizations.");
      } finally {
        setLoadingOrg(false);
      }
    };

    loadEligibleOrgs();
  }, [router.isReady, user, isMarketplaceCreate]);

  const onPickOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    const found = eligibleOrgs.find((o) => o.id === orgId) || null;

    if (!found) {
      setOrg(null);
      setCanPostAsOrg(false);
      setLoadError("Choose an organization to publish under.");
      setForm((prev) => ({ ...prev, company_name: "" }));
      return;
    }

    setOrg(found);
    setCanPostAsOrg(true);
    setLoadError(null);
    setForm((prev) => ({ ...prev, company_name: found.name || prev.company_name }));
  };

  /* ---------------------------------------------------------------------- */
  /*  Load org context when orgParam is provided (from org page)            */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const loadOrgContextFromParam = async () => {
      if (!router.isReady) return;
      if (!user) return;
      if (!orgParam) return; // only run when param present

      setLoadingOrg(true);
      setLoadError(null);

      let foundOrg: Org | null = null;

      try {
        if (looksLikeUuid(orgParam)) {
          const { data, error } = await supabase
            .from("organizations")
            .select("id,name,slug,created_by,is_active")
            .eq("id", orgParam)
            .eq("is_active", true)
            .maybeSingle();

          if (!error && data) foundOrg = data as Org;
        } else {
          const { data, error } = await supabase
            .from("organizations")
            .select("id,name,slug,created_by,is_active")
            .eq("slug", orgParam)
            .eq("is_active", true)
            .maybeSingle();

          if (!error && data) foundOrg = data as Org;
        }

        if (!foundOrg) {
          setOrg(null);
          setCanPostAsOrg(false);
          setLoadError("Organization not found or inactive.");
          return;
        }

        setOrg(foundOrg);
        setSelectedOrgId(foundOrg.id);

        // Permission: creator OR owner/co_owner can post
        let allowed = false;

        if (foundOrg.created_by && foundOrg.created_by === user.id) {
          allowed = true;
        } else {
          const { data: mem, error: memErr } = await supabase
            .from("org_members")
            .select("role")
            .eq("org_id", foundOrg.id)
            .eq("user_id", user.id)
            .maybeSingle<{ role: OrgMemberRole }>();

          if (!memErr && mem && (mem.role === "owner" || mem.role === "co_owner")) {
            allowed = true;
          }
        }

        setCanPostAsOrg(allowed);

        // Auto-fill & lock company_name
        setForm((prev) => ({
          ...prev,
          company_name: foundOrg!.name || prev.company_name,
        }));

        if (!allowed) {
          setLoadError("Only the organization owner/co-owner can post jobs for this org.");
        }
      } catch (e: any) {
        console.error("Error loading org context", e);
        setOrg(null);
        setCanPostAsOrg(false);
        setLoadError("Could not load organization.");
      } finally {
        setLoadingOrg(false);
      }
    };

    loadOrgContextFromParam();
  }, [router.isReady, user, orgParam]);

  /* ---------------------------------------------------------------------- */
  /*  If editing: load existing job                                          */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const loadJob = async () => {
      if (!jobId || !user) return;
      setLoadError(null);

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (error) {
        console.error("Error loading job to edit", error);
        setLoadError("Could not load this job for editing.");
        return;
      }
      if (!data) {
        setLoadError("Job not found.");
        return;
      }
      if ((data as any).owner_id && (data as any).owner_id !== user.id) {
        setLoadError("You do not have permission to edit this job.");
        return;
      }

      const job = data as JobRow;

      setForm({
        title: job.title || "",
        company_name: job.company_name || "",
        location: job.location || "",
        employment_type: job.employment_type || "",
        remote_type: job.remote_type || "",
        short_description: job.short_description || "",
        description: job.description || "",
        keywords: job.keywords || "",
        salary_display: job.salary_display || "",
        apply_url: job.apply_url || "",
      });

      // Optional: if job has org_id, you could load that org too; for now we trust existing company_name
    };

    if (isEditing && user) {
      loadJob();
    }
  }, [jobId, user, isEditing]);

  /* ---------------------------------------------------------------------- */
  /*  Handlers                                                               */
  /* ---------------------------------------------------------------------- */

  const handleChange =
    (field: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // enforce org requirement if we are in org-style post
    if (!isEditing) {
      if (!org) {
        setSaveError(
          isMarketplaceCreate
            ? "Choose an organization to publish under."
            : "You must create a job from an organization page."
        );
        return;
      }
      if (!canPostAsOrg) {
        setSaveError("Only the organization owner/co-owner can post this job.");
        return;
      }
    }

    if (!form.title.trim()) {
      setSaveError("Job title is required.");
      return;
    }
    if (!form.company_name.trim()) {
      setSaveError("Company / lab name is required.");
      return;
    }

    setSaving(true);
    setSaveError(null);

    const payload = {
      title: form.title.trim(),
      company_name: form.company_name.trim(),
      location: form.location.trim() || null,
      employment_type: form.employment_type || null,
      remote_type: form.remote_type || null,
      short_description: form.short_description.trim() || null,
      description: form.description.trim() || null,
      keywords: form.keywords.trim() || null,
      salary_display: form.salary_display.trim() || null,
      apply_url: form.apply_url.trim() || null,
      // Optionally store org_id:
      org_id: org ? org.id : null,
    };

    try {
      if (isEditing && jobId) {
        const { error } = await supabase
          .from("jobs")
          .update(payload)
          .eq("id", jobId)
          .eq("owner_id", user.id);

        if (error) {
          console.error("Error updating job", error);
          setSaveError(error.message || "Could not update job. Please try again.");
        } else {
          router.push(`/jobs/${jobId}`);
        }
      } else {
        const { data, error } = await supabase
          .from("jobs")
          .insert({
            owner_id: user.id,
            ...payload,
          })
          .select()
          .single();

        if (error) {
          console.error("Error creating job", error);
          setSaveError(error.message || "Could not create job. Please try again.");
        } else {
          router.push(`/jobs/${(data as any).id}`);
        }
      }
    } finally {
      setSaving(false);
    }
  };

  if (!user && !loading) return null;

  /* ---------------------------------------------------------------------- */
  /*  Derived values and UI helpers                                         */
  /* ---------------------------------------------------------------------- */

  // Back target: if org exists, send user back to that org page with jobs tab
  const backTarget = useMemo(() => {
    if (org?.slug) return `/orgs/${org.slug}?tab=jobs`;
    return isEditing ? (jobId ? `/jobs/${jobId}` : "/jobs") : "/jobs";
  }, [org?.slug, isEditing, jobId]);

  // Whether to show org picker (only when multiple eligible orgs)
  const showPublishAsPicker =
    !isEditing && isMarketplaceCreate && eligibleOrgs.length > 1;

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                */
  /* ---------------------------------------------------------------------- */

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="section-title">
                {isEditing ? "Edit job" : "Post a job"}
              </div>
              <div className="section-sub">
                {isEditing
                  ? "Update your job listing for the quantum community."
                  : "Create a role for students, researchers, and engineers in quantum."}
              </div>
            </div>

            <button
              type="button"
              className="nav-ghost-btn"
              onClick={() => router.push(backTarget)}
            >
              ← Back
            </button>
          </div>

          {/* Show any org-loading state */}
          {!isEditing && loadingOrg && (
            <p className="profile-muted">Loading organization…</p>
          )}

          <div className="products-create-layout">
            <div className="products-create-main">
              <div className="products-create-card">
                <h3 className="products-create-title">
                  {isEditing ? "Job details" : "New job listing"}
                </h3>

                {loadError && (
                  <p
                    className="products-status error"
                    style={{ marginBottom: 10 }}
                  >
                    {loadError}
                  </p>
                )}

                <form onSubmit={handleSubmit} className="products-create-form">
                  {/* Basics */}
                  <div className="products-section">
                    <div className="products-section-header">
                      <h4 className="products-section-title">Basics</h4>
                      <p className="products-section-sub">
                        Role title, organisation, and where it&apos;s based.
                      </p>
                    </div>

                    <div className="products-grid">
                      <div className="products-field">
                        <label>Job title *</label>
                        <input
                          type="text"
                          value={form.title}
                          onChange={handleChange("title")}
                          required
                        />
                      </div>

                      {/* Publisher / org picker, if needed */}
                      {showPublishAsPicker && (
                        <div className="products-field">
                          <label>Publish as *</label>
                          <select
                            value={selectedOrgId}
                            onChange={(e) => onPickOrg(e.target.value)}
                          >
                            <option value="">Select…</option>
                            {eligibleOrgs.map((o) => (
                              <option key={o.id} value={o.id}>
                                {o.name}
                              </option>
                            ))}
                          </select>
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>
                            This determines the organization shown on the job listing.
                          </span>
                        </div>
                      )}

                      <div className="products-field">
                        <label>Company / lab *</label>
                        <input
                          type="text"
                          value={form.company_name}
                          onChange={handleChange("company_name")}
                          required
                          disabled={lockCompanyField}
                        />
                        {lockCompanyField && (
                          <span style={{ fontSize: 12, color: "#9ca3af" }}>
                            Fixed to the organization you’re publishing under.
                          </span>
                        )}
                      </div>

                      <div className="products-field">
                        <label>Location</label>
                        <input
                          type="text"
                          value={form.location}
                          onChange={handleChange("location")}
                          placeholder="Basel, Switzerland / Remote"
                        />
                      </div>

                      <div className="products-field">
                        <label>Employment type</label>
                        <select
                          value={form.employment_type}
                          onChange={handleChange("employment_type")}
                        >
                          <option value="">Select…</option>
                          {EMPLOYMENT_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="products-field">
                        <label>Work mode</label>
                        <select
                          value={form.remote_type}
                          onChange={handleChange("remote_type")}
                        >
                          <option value="">Select…</option>
                          {REMOTE_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="products-field products-field-full">
                        <label>Short description</label>
                        <input
                          type="text"
                          value={form.short_description}
                          onChange={handleChange("short_description")}
                          placeholder="1–2 line summary people see in the listing grid."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Full description */}
                  <div className="products-section">
                    <div className="products-section-header">
                      <h4 className="products-section-title">Role details</h4>
                      <p className="products-section-sub">
                        A clear description helps people understand whether this
                        role fits them.
                      </p>
                    </div>

                    <div className="products-grid">
                      <div className="products-field products-field-full">
                        <label>Full description</label>
                        <textarea
                          rows={6}
                          value={form.description}
                          onChange={handleChange("description")}
                          placeholder="Responsibilities, requirements, project context, etc."
                        />
                      </div>

                      <div className="products-field products-field-full">
                        <label>Keywords (comma-separated)</label>
                        <input
                          type="text"
                          value={form.keywords}
                          onChange={handleChange("keywords")}
                          placeholder="spin qubits, cryogenics, cQED, fabrication…"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Salary & apply link */}
                  <div className="products-section">
                    <div className="products-section-header">
                      <h4 className="products-section-title">
                        Salary & application
                      </h4>
                      <p className="products-section-sub">
                        Optional salary information and where to apply.
                      </p>
                    </div>

                    <div className="products-grid">
                      <div className="products-field">
                        <label>Salary information</label>
                        <input
                          type="text"
                          value={form.salary_display}
                          onChange={handleChange("salary_display")}
                          placeholder="e.g. CHF 80k–100k, based on experience"
                        />
                      </div>

                      <div className="products-field products-field-full">
                        <label>Application URL</label>
                        <input
                          type="url"
                          value={form.apply_url}
                          onChange={handleChange("apply_url")}
                          placeholder="https://…"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="products-create-actions">
                    <button
                      type="submit"
                      className="nav-cta"
                      disabled={
                        saving ||
                        (!isEditing && (!org || !canPostAsOrg)) ||
                        loadingOrg ||
                        loading
                      }
                    >
                      {saving
                        ? isEditing
                          ? "Updating…"
                          : "Publishing…"
                        : isEditing
                        ? "Save changes"
                        : "Publish job"}
                    </button>

                    {saveError && (
                      <span className="products-status error">{saveError}</span>
                    )}
                  </div>
                </form>
              </div>
            </div>

            {/* Right-hand tips panel */}
            <aside className="products-create-aside">
              <div className="products-tips-card">
                <h4 className="products-tips-title">
                  Tips for a strong job post
                </h4>
                <ul className="products-tips-list">
                  <li>Use a specific title (e.g. “Spin qubit postdoc”).</li>
                  <li>Mention the main platform (superconducting, ion trap, …).</li>
                  <li>Include key requirements and location clearly.</li>
                  <li>Add salary range if possible.</li>
                  <li>Link to a lab or company page for more context.</li>
                </ul>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </>
  );
}

// ✅ global layout: left sidebar + middle only, no right column
(NewJobPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
