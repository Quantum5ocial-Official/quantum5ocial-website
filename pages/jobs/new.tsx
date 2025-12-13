// pages/jobs/new.tsx
import { useEffect, useState } from "react";
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

export default function NewJobPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();
  const jobId = router.query.id as string | undefined;

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
  const [isEditing, setIsEditing] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/jobs/new");
    }
  }, [loading, user, router]);

  // If jobId is present -> load job
  useEffect(() => {
    const loadJob = async () => {
      if (!jobId || !user) return;
      setIsEditing(true);
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

      setForm({
        title: data.title || "",
        company_name: data.company_name || "",
        location: data.location || "",
        employment_type: data.employment_type || "",
        remote_type: data.remote_type || "",
        short_description: data.short_description || "",
        description: data.description || "",
        keywords: data.keywords || "",
        salary_display: data.salary_display || "",
        apply_url: data.apply_url || "",
      });
    };

    if (jobId && user) {
      loadJob();
    }
  }, [jobId, user]);

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
              onClick={() => router.push("/jobs")}
            >
              ← Back to jobs
            </button>
          </div>

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

                      <div className="products-field">
                        <label>Company / lab *</label>
                        <input
                          type="text"
                          value={form.company_name}
                          onChange={handleChange("company_name")}
                          required
                        />
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
                      disabled={saving}
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
                      <span className="products-status error">
                        {saveError}
                      </span>
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
                  <li>
                    Mention the main platform (superconducting, ion trap, …).
                  </li>
                  <li>Include key requirements and location clearly.</li>
                  <li>Add salary range if possible.</li>
                  <li>
                    Link to a lab or company page for more context.
                  </li>
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
