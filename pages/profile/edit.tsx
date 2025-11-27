// pages/profile/edit.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

type Profile = {
  id: string;
  full_name: string | null;
  short_bio: string | null;
  role: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
  focus_areas: string | null;
  skills: string | null;
  highest_education: string | null;
  key_experience: string | null;
  avatar_url: string | null;
  orcid: string | null;
  google_scholar: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  personal_website: string | null;
  lab_website: string | null;
  institutional_email: string | null;
};

export default function ProfileEditPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    short_bio: "",
    role: "",
    affiliation: "",
    country: "",
    city: "",
    focus_areas: "",
    skills: "",
    highest_education: "",
    key_experience: "",
    avatar_url: "",
    orcid: "",
    google_scholar: "",
    linkedin_url: "",
    github_url: "",
    personal_website: "",
    lab_website: "",
    institutional_email: "",
  });

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/profile/edit");
    }
  }, [loading, user, router]);

  // Load existing profile values into the form
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setProfileLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile", error);
      } else if (data) {
        const p = data as Profile;
        setForm({
          full_name: p.full_name || "",
          short_bio: p.short_bio || "",
          role: p.role || "",
          affiliation: p.affiliation || "",
          country: p.country || "",
          city: p.city || "",
          focus_areas: p.focus_areas || "",
          skills: p.skills || "",
          highest_education: p.highest_education || "",
          key_experience: p.key_experience || "",
          avatar_url: p.avatar_url || "",
          orcid: p.orcid || "",
          google_scholar: p.google_scholar || "",
          linkedin_url: p.linkedin_url || "",
          github_url: p.github_url || "",
          personal_website: p.personal_website || "",
          lab_website: p.lab_website || "",
          institutional_email: p.institutional_email || "",
        });
      }

      setProfileLoading(false);
    };

    if (user) loadProfile();
  }, [user]);

  const handleChange =
    (field: keyof typeof form) =>
    (
      e:
        | React.ChangeEvent<HTMLInputElement>
        | React.ChangeEvent<HTMLTextAreaElement>
        | React.ChangeEvent<HTMLSelectElement>
    ) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSaveMessage(null);

    const payload = {
      id: user.id,
      full_name: form.full_name.trim() || null,
      short_bio: form.short_bio.trim() || null,
      role: form.role.trim() || null,
      affiliation: form.affiliation.trim() || null,
      country: form.country.trim() || null,
      city: form.city.trim() || null,
      focus_areas: form.focus_areas.trim() || null,
      skills: form.skills.trim() || null,
      highest_education: form.highest_education || null,
      key_experience: form.key_experience.trim() || null,
      avatar_url: form.avatar_url || null,
      orcid: form.orcid.trim() || null,
      google_scholar: form.google_scholar.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      github_url: form.github_url.trim() || null,
      personal_website: form.personal_website.trim() || null,
      lab_website: form.lab_website.trim() || null,
      institutional_email: form.institutional_email.trim() || null,
    };

    const { error } = await supabase
  .from("profiles")
  .upsert(payload, { onConflict: "id" });

if (error) {
  console.error("Error saving profile", error);
  // Show the actual Supabase error message on screen
  setSaveMessage(`Error: ${error.message}`);
} else {
  setSaveMessage("Profile updated ✅");
  // router.push("/profile");
}

    setSaving(false);
  };

  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setSaveMessage(null);

      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Error uploading avatar", uploadError);
        setSaveMessage("Could not upload image. Please try again.");
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      setForm((prev) => ({ ...prev, avatar_url: publicUrl }));

      // Save avatar_url to profile immediately
      await supabase
        .from("profiles")
        .upsert(
          { id: user.id, avatar_url: publicUrl },
          { onConflict: "id" }
        );
      setSaveMessage("Profile picture updated ✅");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const initials =
    form.full_name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "Q5";

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header" style={{ marginBottom: 14 }}>
            <div>
              <div className="section-title">Edit profile</div>
              <div className="section-sub">
                Update your information so others see an accurate profile.
              </div>
            </div>

            <Link href="/profile" className="nav-ghost-btn">
              ← Back to profile
            </Link>
          </div>

          <div className="profile-edit-card">
            {profileLoading ? (
              <p className="profile-muted">Loading your profile…</p>
            ) : (
              <>
                <h3 className="profile-edit-title">Profile details</h3>
                <p className="profile-edit-sub">
                  These fields power recommendations and discovery inside
                  Quantum5ocial.
                </p>

                <form onSubmit={handleSave} className="profile-form">
                  {/* Basics */}
                  <div className="profile-section">
                    <div className="profile-section-header">
                      <h4 className="profile-section-title">
                        Basic information
                      </h4>
                      <p className="profile-section-sub">
                        Your name, headline, and where you are based.
                      </p>
                    </div>

                    <div className="profile-grid">
                      {/* Avatar */}
                      <div className="profile-field profile-field-full">
                        <label>Profile photo (optional)</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div className="profile-avatar" style={{ flexShrink: 0 }}>
                            {form.avatar_url ? (
                              <img
                                src={form.avatar_url}
                                alt="Avatar"
                                className="profile-avatar-img"
                              />
                            ) : (
                              <span>{initials}</span>
                            )}
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            disabled={uploadingAvatar}
                          />
                        </div>
                        {uploadingAvatar && (
                          <span className="profile-status">
                            Uploading image…
                          </span>
                        )}
                      </div>

                      <div className="profile-field">
                        <label>Full name</label>
                        <input
                          type="text"
                          value={form.full_name}
                          onChange={handleChange("full_name")}
                          placeholder="Your full name"
                        />
                      </div>

                      <div className="profile-field profile-field-full">
                        <label>Short bio</label>
                        <textarea
                          rows={3}
                          value={form.short_bio}
                          onChange={handleChange("short_bio")}
                          placeholder="1–2 sentences about what you work on."
                        />
                      </div>

                      <div className="profile-field">
                        <label>What best describes you?</label>
                        <select
                          value={form.role}
                          onChange={handleChange("role")}
                        >
                          <option value="">Select…</option>
                          <option value="Bachelor student">
                            Bachelor student
                          </option>
                          <option value="Master student">Master student</option>
                          <option value="PhD student">PhD student</option>
                          <option value="Postdoc">Postdoc</option>
                          <option value="Researcher / Scientist">
                            Researcher / Scientist
                          </option>
                          <option value="Professor / Group Leader">
                            Professor / Group Leader
                          </option>
                          <option value="Engineer / Technician">
                            Engineer / Technician
                          </option>
                          <option value="Industry Professional">
                            Industry Professional
                          </option>
                          <option value="CEO / Founder">CEO / Founder</option>
                          <option value="Product / Business role">
                            Product / Business role
                          </option>
                          <option value="Other">Other</option>
                        </select>
                      </div>

                      <div className="profile-field">
                        <label>Affiliation / workplace</label>
                        <input
                          type="text"
                          value={form.affiliation}
                          onChange={handleChange("affiliation")}
                          placeholder="University, lab, or company"
                        />
                      </div>

                      <div className="profile-field">
                        <label>Country</label>
                        <input
                          type="text"
                          value={form.country}
                          onChange={handleChange("country")}
                          placeholder="Switzerland, Germany, India…"
                        />
                      </div>

                      <div className="profile-field">
                        <label>City</label>
                        <input
                          type="text"
                          value={form.city}
                          onChange={handleChange("city")}
                          placeholder="Basel, Zurich, Berlin…"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Expertise */}
                  <div className="profile-section">
                    <div className="profile-section-header">
                      <h4 className="profile-section-title">Expertise</h4>
                      <p className="profile-section-sub">
                        Focus areas and skills help with matching and discovery.
                      </p>
                    </div>

                    <div className="profile-grid">
                      <div className="profile-field profile-field-full">
                        <label>
                          Research / work focus areas (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={form.focus_areas}
                          onChange={handleChange("focus_areas")}
                          placeholder="Superconducting qubits, spin qubits, cryogenics…"
                        />
                      </div>

                      <div className="profile-field profile-field-full">
                        <label>Skills (comma-separated)</label>
                        <input
                          type="text"
                          value={form.skills}
                          onChange={handleChange("skills")}
                          placeholder="Python, Qiskit, microwave design, nanofabrication…"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Background */}
                  <div className="profile-section">
                    <div className="profile-section-header">
                      <h4 className="profile-section-title">Background</h4>
                      <p className="profile-section-sub">
                        A quick overview of your academic and work background.
                      </p>
                    </div>

                    <div className="profile-grid">
                      <div className="profile-field">
                        <label>Highest education level</label>
                        <select
                          value={form.highest_education}
                          onChange={handleChange("highest_education")}
                        >
                          <option value="">Select…</option>
                          <option value="Bachelor">Bachelor</option>
                          <option value="Master">Master</option>
                          <option value="PhD">PhD</option>
                          <option value="Postdoc">Postdoc</option>
                          <option value="Other / not applicable">
                            Other / not applicable
                          </option>
                        </select>
                      </div>

                      <div className="profile-field profile-field-full">
                        <label>Key experience (optional)</label>
                        <textarea
                          rows={2}
                          value={form.key_experience}
                          onChange={handleChange("key_experience")}
                          placeholder="e.g. 2 years working with nanofabrication and cQED measurements."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Links & verification */}
                  <div className="profile-section">
                    <div className="profile-section-header">
                      <h4 className="profile-section-title">
                        Links & verification
                      </h4>
                      <p className="profile-section-sub">
                        Optional external links for credibility and blue ticks
                        later.
                      </p>
                    </div>

                    <div className="profile-grid">
                      <div className="profile-field">
                        <label>Institutional email</label>
                        <input
                          type="email"
                          value={form.institutional_email}
                          onChange={handleChange("institutional_email")}
                          placeholder="your.name@ethz.ch"
                        />
                      </div>

                      <div className="profile-field">
                        <label>ORCID</label>
                        <input
                          type="text"
                          value={form.orcid}
                          onChange={handleChange("orcid")}
                          placeholder="https://orcid.org/…"
                        />
                      </div>

                      <div className="profile-field">
                        <label>Google Scholar</label>
                        <input
                          type="text"
                          value={form.google_scholar}
                          onChange={handleChange("google_scholar")}
                          placeholder="https://scholar.google.com/…"
                        />
                      </div>

                      <div className="profile-field">
                        <label>LinkedIn</label>
                        <input
                          type="text"
                          value={form.linkedin_url}
                          onChange={handleChange("linkedin_url")}
                          placeholder="https://linkedin.com/in/…"
                        />
                      </div>

                      <div className="profile-field">
                        <label>GitHub</label>
                        <input
                          type="text"
                          value={form.github_url}
                          onChange={handleChange("github_url")}
                          placeholder="https://github.com/…"
                        />
                      </div>

                      <div className="profile-field">
                        <label>Personal website</label>
                        <input
                          type="text"
                          value={form.personal_website}
                          onChange={handleChange("personal_website")}
                          placeholder="https://yourname.dev"
                        />
                      </div>

                      <div className="profile-field">
                        <label>Lab website</label>
                        <input
                          type="text"
                          value={form.lab_website}
                          onChange={handleChange("lab_website")}
                          placeholder="https://yourlab.org"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="profile-actions">
                    <button
                      type="submit"
                      className="nav-cta"
                      disabled={saving}
                    >
                      {saving ? "Saving…" : "Save profile"}
                    </button>

                    {saveMessage && (
                      <span className="profile-status">{saveMessage}</span>
                    )}
                  </div>
                </form>
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
