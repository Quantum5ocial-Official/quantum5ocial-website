import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

const FOCUS_AREAS = [
  "Superconducting Qubits",
  "Spin Qubits",
  "Photonic Qubits",
  "Ion Traps",
  "Neutral Atoms",
  "Quantum Algorithms",
  "Quantum Software",
  "Quantum Sensing",
  "Quantum Networks",
  "Microwave Engineering",
  "Cryogenics",
  "Fabrication / Nanotech",
  "Theory / Simulation",
  "Quantum Machine Learning",
];

const SKILLS = [
  "Python",
  "Qiskit / Cirq / PennyLane",
  "Microwave Circuit Design",
  "Cryostat Operation",
  "E-beam Lithography",
  "Cleanroom Processing",
  "Quantum Control",
  "Classical ML / DL",
  "FPGA",
  "SEM / TEM",
];

type ProfileForm = {
  first_name: string;
  last_name: string;
  bio_short: string;
  profile_photo_url: string;

  role_type: string;
  affiliation: string;
  country: string;
  city: string;

  focusAreas: string[];
  skills: string[];

  education_level: string;
  experience_summary: string;

  orcid: string;
  google_scholar: string;
  linkedin: string;
  github: string;
  personal_website: string;
  lab_website: string;

  institutional_email: string;

  org_name: string;
  org_type: string;
  org_business_model: string;
  org_website: string;
  org_country: string;
  org_city: string;
  org_description: string;
  org_focus_areas: string;
};

export default function ProfilePage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>({
    first_name: "",
    last_name: "",
    bio_short: "",
    profile_photo_url: "",
    role_type: "",
    affiliation: "",
    country: "",
    city: "",
    focusAreas: [],
    skills: [],
    education_level: "",
    experience_summary: "",
    orcid: "",
    google_scholar: "",
    linkedin: "",
    github: "",
    personal_website: "",
    lab_website: "",
    institutional_email: "",
    org_name: "",
    org_type: "",
    org_business_model: "",
    org_website: "",
    org_country: "",
    org_city: "",
    org_description: "",
    org_focus_areas: "",
  });

  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"" | "ok" | "error">("");

  // if not logged in -> send to auth
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth?redirect=/profile");
    }
  }, [loading, user, router]);

  // load (or create) profile once user is known
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setLoadingProfile(true);
      setSaveStatus("");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      let profile: any = data;

      // if row not found, create default
      if (error && (error as any).code === "PGRST116") {
        const metadata = (user as any).user_metadata || {};
        const fullName: string =
          metadata.name || metadata.full_name || metadata.fullName || "";
        const [firstName, ...rest] = fullName.split(" ");
        const lastName = rest.join(" ");

        const defaults = {
          id: user.id,
          first_name: firstName || "",
          last_name: lastName || "",
          bio_short: "",
          profile_photo_url: "",
          role_type: "",
          affiliation: "",
          country: "",
          city: "",
          focus_areas: "",
          skills: "",
          education_level: "",
          experience_summary: "",
          orcid: "",
          google_scholar: "",
          linkedin: "",
          github: metadata.user_name
            ? `https://github.com/${metadata.user_name}`
            : "",
          personal_website: "",
          lab_website: "",
          institutional_email: user.email ?? "",
          org_name: "",
          org_type: "",
          org_business_model: "",
          org_website: "",
          org_country: "",
          org_city: "",
          org_description: "",
          org_focus_areas: "",
        };

        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert(defaults)
          .select()
          .single();

        if (insertError) {
          console.error("Error creating profile", insertError);
          setLoadingProfile(false);
          return;
        }

        profile = inserted;
      } else if (error) {
        console.error("Error loading profile", error);
        setLoadingProfile(false);
        return;
      }

      setForm({
        first_name: profile.first_name || "",
        last_name: profile.last_name || "",
        bio_short: profile.bio_short || "",
        profile_photo_url: profile.profile_photo_url || "",
        role_type: profile.role_type || "",
        affiliation: profile.affiliation || "",
        country: profile.country || "",
        city: profile.city || "",
        focusAreas: (profile.focus_areas || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        skills: (profile.skills || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        education_level: profile.education_level || "",
        experience_summary: profile.experience_summary || "",
        orcid: profile.orcid || "",
        google_scholar: profile.google_scholar || "",
        linkedin: profile.linkedin || "",
        github: profile.github || "",
        personal_website: profile.personal_website || "",
        lab_website: profile.lab_website || "",
        institutional_email:
          profile.institutional_email || user.email || "",
        org_name: profile.org_name || "",
        org_type: profile.org_type || "",
        org_business_model: profile.org_business_model || "",
        org_website: profile.org_website || "",
        org_country: profile.org_country || "",
        org_city: profile.org_city || "",
        org_description: profile.org_description || "",
        org_focus_areas: profile.org_focus_areas || "",
      });

      setLoadingProfile(false);
    };

    loadProfile();
  }, [user]);

  const handleFieldChange =
    (field: keyof ProfileForm) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const toggleFromList =
    (field: "focusAreas" | "skills", value: string) => () => {
      setForm((prev) => {
        const current = prev[field];
        const exists = current.includes(value);
        const next = exists
          ? current.filter((v) => v !== value)
          : [...current, value];
        return { ...prev, [field]: next };
      });
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSaveStatus("");

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: form.first_name,
        last_name: form.last_name,
        bio_short: form.bio_short,
        profile_photo_url: form.profile_photo_url,
        role_type: form.role_type,
        affiliation: form.affiliation,
        country: form.country,
        city: form.city,
        focus_areas: form.focusAreas.join(","),
        skills: form.skills.join(","),
        education_level: form.education_level,
        experience_summary: form.experience_summary,
        orcid: form.orcid,
        google_scholar: form.google_scholar,
        linkedin: form.linkedin,
        github: form.github,
        personal_website: form.personal_website,
        lab_website: form.lab_website,
        institutional_email: form.institutional_email,
        org_name: form.org_name,
        org_type: form.org_type,
        org_business_model: form.org_business_model,
        org_website: form.org_website,
        org_country: form.org_country,
        org_city: form.org_city,
        org_description: form.org_description,
        org_focus_areas: form.org_focus_areas,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      console.error("Error saving profile", error);
      setSaveStatus("error");
    } else {
      setSaveStatus("ok");
    }
  };

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Your profile</div>
              <div className="section-sub">
                This information helps labs, companies, and collaborators
                understand who you are in the quantum ecosystem.
              </div>
            </div>
          </div>

          <div className="profile-card">
            {loadingProfile && (
              <div className="profile-loading">Loading your profile…</div>
            )}

            {!loadingProfile && (
              <form onSubmit={handleSubmit} className="profile-form">
                {/* SECTION 1 – BASIC IDENTITY */}
                <div className="profile-section">
                  <h3>Basic identity</h3>
                  <p className="profile-section-sub">
                    How you appear across Quantum5ocial.
                  </p>
                  <div className="profile-grid">
                    <div className="profile-field">
                      <label>First name</label>
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={handleFieldChange("first_name")}
                      />
                    </div>
                    <div className="profile-field">
                      <label>Last name</label>
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={handleFieldChange("last_name")}
                      />
                    </div>
                    <div className="profile-field profile-field-full">
                      <label>Short bio (1–2 sentences)</label>
                      <textarea
                        rows={2}
                        value={form.bio_short}
                        onChange={handleFieldChange("bio_short")}
                        placeholder="PhD student working on superconducting qubits at ETH Zürich."
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2 – PROFESSIONAL INFORMATION */}
                <div className="profile-section">
                  <h3>Professional information</h3>
                  <p className="profile-section-sub">
                    Your current role and where you are based.
                  </p>
                  <div className="profile-grid">
                    <div className="profile-field">
                      <label>What best describes you?</label>
                      <select
                        value={form.role_type}
                        onChange={handleFieldChange("role_type")}
                      >
                        <option value="">Select one…</option>
                        <option>Bachelor student</option>
                        <option>Master student</option>
                        <option>PhD student</option>
                        <option>Postdoc</option>
                        <option>Researcher / Scientist</option>
                        <option>Professor / Group Leader</option>
                        <option>Engineer / Technician</option>
                        <option>Industry Professional</option>
                        <option>CEO / Founder</option>
                        <option>Product / Business role</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div className="profile-field">
                      <label>Affiliation / workplace</label>
                      <input
                        type="text"
                        value={form.affiliation}
                        onChange={handleFieldChange("affiliation")}
                        placeholder="University / lab / company name"
                      />
                    </div>

                    <div className="profile-field">
                      <label>Country</label>
                      <input
                        type="text"
                        value={form.country}
                        onChange={handleFieldChange("country")}
                        placeholder="Switzerland"
                      />
                    </div>

                    <div className="profile-field">
                      <label>City</label>
                      <input
                        type="text"
                        value={form.city}
                        onChange={handleFieldChange("city")}
                        placeholder="Basel"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3 – EXPERTISE */}
                <div className="profile-section">
                  <h3>Expertise & focus areas</h3>
                  <p className="profile-section-sub">
                    Used later for job matching, collaborations and content.
                  </p>

                  <div className="profile-field profile-field-full">
                    <label>Research / work focus areas</label>
                    <div className="chip-row">
                      {FOCUS_AREAS.map((item) => {
                        const active = form.focusAreas.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            className={`chip ${active ? "chip-active" : ""}`}
                            onClick={toggleFromList("focusAreas", item)}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="profile-field profile-field-full">
                    <label>Skills</label>
                    <div className="chip-row">
                      {SKILLS.map((item) => {
                        const active = form.skills.includes(item);
                        return (
                          <button
                            key={item}
                            type="button"
                            className={`chip ${active ? "chip-active" : ""}`}
                            onClick={toggleFromList("skills", item)}
                          >
                            {item}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* SECTION 4 – BACKGROUND */}
                <div className="profile-section">
                  <h3>Academic / work background</h3>
                  <div className="profile-grid">
                    <div className="profile-field">
                      <label>Highest education level</label>
                      <select
                        value={form.education_level}
                        onChange={handleFieldChange("education_level")}
                      >
                        <option value="">Select…</option>
                        <option>Bachelor</option>
                        <option>Master</option>
                        <option>PhD</option>
                        <option>Postdoc</option>
                        <option>Not applicable</option>
                      </select>
                    </div>

                    <div className="profile-field profile-field-full">
                      <label>Key experience (optional)</label>
                      <textarea
                        rows={2}
                        value={form.experience_summary}
                        onChange={handleFieldChange("experience_summary")}
                        placeholder="2 years working with nanofabrication and cQED measurements."
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 5 – LINKS */}
                <div className="profile-section">
                  <h3>External links</h3>
                  <p className="profile-section-sub">
                    Optional, but useful for credibility and networking.
                  </p>
                  <div className="profile-grid">
                    <div className="profile-field">
                      <label>ORCID</label>
                      <input
                        type="url"
                        value={form.orcid}
                        onChange={handleFieldChange("orcid")}
                        placeholder="https://orcid.org/…"
                      />
                    </div>

                    <div className="profile-field">
                      <label>Google Scholar</label>
                      <input
                        type="url"
                        value={form.google_scholar}
                        onChange={handleFieldChange("google_scholar")}
                        placeholder="https://scholar.google.com/…"
                      />
                    </div>

                    <div className="profile-field">
                      <label>LinkedIn</label>
                      <input
                        type="url"
                        value={form.linkedin}
                        onChange={handleFieldChange("linkedin")}
                        placeholder="https://www.linkedin.com/in/…"
                      />
                    </div>

                    <div className="profile-field">
                      <label>GitHub</label>
                      <input
                        type="url"
                        value={form.github}
                        onChange={handleFieldChange("github")}
                        placeholder="https://github.com/…"
                      />
                    </div>

                    <div className="profile-field">
                      <label>Personal website</label>
                      <input
                        type="url"
                        value={form.personal_website}
                        onChange={handleFieldChange("personal_website")}
                        placeholder="https://…"
                      />
                    </div>

                    <div className="profile-field">
                      <label>Lab / organisation website</label>
                      <input
                        type="url"
                        value={form.lab_website}
                        onChange={handleFieldChange("lab_website")}
                        placeholder="https://…"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 6 – VERIFICATION */}
                <div className="profile-section">
                  <h3>Verification (optional)</h3>
                  <p className="profile-section-sub">
                    Institutional emails will later help us award verified
                    “blue tick” status.
                  </p>
                  <div className="profile-grid">
                    <div className="profile-field profile-field-full">
                      <label>Institutional email</label>
                      <input
                        type="email"
                        value={form.institutional_email}
                        onChange={handleFieldChange("institutional_email")}
                        placeholder="you@ethz.ch, you@ox.ac.uk, you@startup.com"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 7 – ORGANISATION */}
                <div className="profile-section">
                  <h3>Organisation (optional)</h3>
                  <p className="profile-section-sub">
                    Fill this only if you want to represent an organisation
                    (startup, company, lab, institute).
                  </p>
                  <div className="profile-grid">
                    <div className="profile-field">
                      <label>Organisation name</label>
                      <input
                        type="text"
                        value={form.org_name}
                        onChange={handleFieldChange("org_name")}
                      />
                    </div>

                    <div className="profile-field">
                      <label>Type</label>
                      <select
                        value={form.org_type}
                        onChange={handleFieldChange("org_type")}
                      >
                        <option value="">Select…</option>
                        <option>Startup</option>
                        <option>Company</option>
                        <option>Lab</option>
                        <option>Institute</option>
                        <option>Other</option>
                      </select>
                    </div>

                    <div className="profile-field">
                      <label>Business model</label>
                      <select
                        value={form.org_business_model}
                        onChange={handleFieldChange("org_business_model")}
                      >
                        <option value="">Select…</option>
                        <option>B2B</option>
                        <option>B2C</option>
                        <option>Academic</option>
                        <option>Mixed</option>
                      </select>
                    </div>

                    <div className="profile-field">
                      <label>Website</label>
                      <input
                        type="url"
                        value={form.org_website}
                        onChange={handleFieldChange("org_website")}
                        placeholder="https://…"
                      />
                    </div>

                    <div className="profile-field">
                      <label>Country</label>
                      <input
                        type="text"
                        value={form.org_country}
                        onChange={handleFieldChange("org_country")}
                      />
                    </div>

                    <div className="profile-field">
                      <label>City</label>
                      <input
                        type="text"
                        value={form.org_city}
                        onChange={handleFieldChange("org_city")}
                      />
                    </div>

                    <div className="profile-field profile-field-full">
                      <label>Organisation description</label>
                      <textarea
                        rows={3}
                        value={form.org_description}
                        onChange={handleFieldChange("org_description")}
                      />
                    </div>

                    <div className="profile-field profile-field-full">
                      <label>Organisation focus areas (free text)</label>
                      <textarea
                        rows={2}
                        value={form.org_focus_areas}
                        onChange={handleFieldChange("org_focus_areas")}
                        placeholder="Quantum control hardware, cryogenic electronics, fabrication services…"
                      />
                    </div>
                  </div>
                </div>

                <div className="profile-actions">
                  <button type="submit" className="nav-cta" disabled={saving}>
                    {saving ? "Saving…" : "Save profile"}
                  </button>

                  {saveStatus === "ok" && (
                    <span className="profile-status success">
                      Profile updated ✓
                    </span>
                  )}
                  {saveStatus === "error" && (
                    <span className="profile-status error">
                      Could not save profile. Please try again.
                    </span>
                  )}
                </div>
              </form>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
