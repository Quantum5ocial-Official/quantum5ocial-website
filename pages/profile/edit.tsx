// pages/profile/edit.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type ProfilePublic = {
  id: string;
  full_name: string | null;
  short_bio: string | null;

  role: string | null;
  current_title: string | null;

  affiliation: string | null;
  country: string | null;
  city: string | null;

  focus_areas: string | null;
  skills: string | null;

  highest_education: string | null;
  key_experience: string | null;

  avatar_url: string | null;

  lab_website: string | null;
  google_scholar: string | null;
  linkedin_url: string | null;
  orcid: string | null;
  github_url: string | null;
  personal_website: string | null;
};

type ProfilePrivate = {
  id: string;
  phone: string | null;
  institutional_email: string | null;
};

// --- Legacy normalization helpers (backwards-compatible) ---
const normalizeRole = (roleRaw: string | null | undefined) => {
  const r = (roleRaw || "").trim();
  if (!r) return "";

  const map: Record<string, string> = {
    "Bachelor student": "Bachelor Student",
    "Master student": "Master Student",
    "PhD student": "PhD Student",
    Postdoc: "Postdoctoral Researcher",
    "Researcher / Scientist": "Research Scientist",
    "Professor / Group Leader": "Professor / Principal Investigator",
    "Engineer / Technician": "Hardware Engineer",
    "Industry Professional": "Industry Professional",
    "CEO / Founder": "Executive (CEO / CTO / COO / CSO)",
    "Product / Business role": "Product Manager",
  };

  return map[r] || r;
};

const normalizeEducation = (eduRaw: string | null | undefined) => {
  const e = (eduRaw || "").trim();
  if (!e) return "";

  const map: Record<string, string> = {
    Postdoc: "Other / not applicable",
  };

  return map[e] || e;
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
    current_title: "",

    affiliation: "",
    country: "",
    city: "",

    focus_areas: "",
    skills: "",

    highest_education: "",
    key_experience: "",

    avatar_url: "",

    // Private contact (profile_private)
    phone: "",
    institutional_email: "",

    // Links (profiles)
    lab_website: "",
    google_scholar: "",
    linkedin_url: "",
    orcid: "",
    github_url: "",
    personal_website: "",
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

      // 1) Public profile
      const { data: pub, error: pubErr } = await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            short_bio,
            role,
            current_title,
            affiliation,
            country,
            city,
            focus_areas,
            skills,
            highest_education,
            key_experience,
            avatar_url,
            lab_website,
            google_scholar,
            linkedin_url,
            orcid,
            github_url,
            personal_website
          `
        )
        .eq("id", user.id)
        .maybeSingle();

      if (pubErr) console.error("Error loading profiles", pubErr);

      // 2) Private profile
      const { data: priv, error: privErr } = await supabase
        .from("profile_private")
        .select(`id, phone, institutional_email`)
        .eq("id", user.id)
        .maybeSingle();

      // It's OK if priv doesn't exist yet (first time)
      if (privErr) console.error("Error loading profile_private", privErr);

      if (pub) {
        const p = pub as ProfilePublic;

        setForm((prev) => ({
          ...prev,

          full_name: p.full_name || "",
          short_bio: p.short_bio || "",

          role: normalizeRole(p.role),
          current_title: p.current_title || "",

          affiliation: p.affiliation || "",
          country: p.country || "",
          city: p.city || "",

          focus_areas: p.focus_areas || "",
          skills: p.skills || "",

          highest_education: normalizeEducation(p.highest_education),
          key_experience: p.key_experience || "",

          avatar_url: p.avatar_url || "",

          lab_website: p.lab_website || "",
          google_scholar: p.google_scholar || "",
          linkedin_url: p.linkedin_url || "",
          orcid: p.orcid || "",
          github_url: p.github_url || "",
          personal_website: p.personal_website || "",
        }));
      }

      if (priv) {
        const q = priv as ProfilePrivate;

        setForm((prev) => ({
          ...prev,
          phone: q.phone || "",
          institutional_email: q.institutional_email || "",
        }));
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

  const normalizeUrlOrNull = (v: string) => {
    const s = (v || "").trim();
    if (!s) return null;
    if (/^https?:\/\//i.test(s)) return s;
    return `https://${s}`;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setSaveMessage(null);

    // Public payload -> profiles
    const payloadPublic = {
      id: user.id,
      full_name: form.full_name.trim() || null,
      short_bio: form.short_bio.trim() || null,

      role: form.role.trim() || null,
      current_title: form.current_title.trim() || null,

      affiliation: form.affiliation.trim() || null,
      country: form.country.trim() || null,
      city: form.city.trim() || null,

      focus_areas: form.focus_areas.trim() || null,
      skills: form.skills.trim() || null,

      highest_education: form.highest_education || null,
      key_experience: form.key_experience.trim() || null,

      avatar_url: form.avatar_url || null,

      // Links (ordered + normalized)
      lab_website: normalizeUrlOrNull(form.lab_website),
      google_scholar: normalizeUrlOrNull(form.google_scholar),
      linkedin_url: normalizeUrlOrNull(form.linkedin_url),
      orcid: form.orcid.trim() || null,
      github_url: normalizeUrlOrNull(form.github_url),
      personal_website: normalizeUrlOrNull(form.personal_website),
    };

    // Private payload -> profile_private
    const payloadPrivate = {
      id: user.id,
      phone: form.phone.trim() || null,
      institutional_email: form.institutional_email.trim() || null,
    };

    // Save public first
    const { error: e1 } = await supabase
      .from("profiles")
      .upsert(payloadPublic, { onConflict: "id" });

    if (e1) {
      console.error("Error saving profiles", e1);
      setSaveMessage(`Error: ${e1.message}`);
      setSaving(false);
      return;
    }

    // Save private second
    const { error: e2 } = await supabase
      .from("profile_private")
      .upsert(payloadPrivate, { onConflict: "id" });

    if (e2) {
      console.error("Error saving profile_private", e2);
      setSaveMessage(`Error: ${e2.message}`);
      setSaving(false);
      return;
    }

    setSaveMessage("Profile updated ✅");
    setSaving(false);
    router.push("/profile");
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingAvatar(true);
      setSaveMessage(null);

      const ext = file.name.split(".").pop() || "png";
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

      await supabase
        .from("profiles")
        .upsert({ id: user.id, avatar_url: publicUrl }, { onConflict: "id" });

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

  const accountEmail = user?.email || "";

  // Used for resilient dropdown display (shows legacy values if not in list)
  const knownRoleValues = new Set([
    "Bachelor Student",
    "Master Student",
    "PhD Student",
    "Postdoctoral Researcher",
    "Research Scientist",
    "Professor / Principal Investigator",
    "Quantum Engineer",
    "Hardware Engineer",
    "Software Engineer",
    "Microwave / RF Engineer",
    "Cryogenics Engineer",
    "Nanofabrication Engineer",
    "Experimental Physicist",
    "Theoretical Physicist",
    "Founder / Co-founder",
    "Executive (CEO / CTO / COO / CSO)",
    "Technical Lead / Architect",
    "Engineering Manager",
    "Product Manager",
    "Business Development",
    "Consultant",
    "Policy / Strategy",
    "Industry Professional",
    "Other",
  ]);

  const knownEduValues = new Set([
    "Bachelor",
    "Master",
    "PhD",
    "Other / not applicable",
  ]);

  return (
    <>
      {/* ✅ remove top gap (match profile page) */}
      <section className="section" style={{ paddingTop: 0, marginTop: -18 }}>
        <div className="section-header" style={{ marginBottom: 14 }}>
          <div>
            <div className="section-title">Edit profile</div>
            <div className="section-sub">
              Update your information so others see an accurate profile.
            </div>
          </div>

          {/* ✅ wrap pill to text only */}
          <Link
            href="/profile"
            className="nav-ghost-btn"
            style={{ width: "fit-content", whiteSpace: "nowrap" }}
          >
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
                    <h4 className="profile-section-title">Basic information</h4>
                    <p className="profile-section-sub">
                      Your name, headline, and where you are based.
                    </p>
                  </div>

                  <div className="profile-grid">
                    {/* Avatar */}
                    <div className="profile-field profile-field-full">
                      <label>Profile photo (optional)</label>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
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
                        <span className="profile-status">Uploading image…</span>
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
                      <label>Primary role</label>
                      <select value={form.role} onChange={handleChange("role")}>
                        <option value="">Select…</option>

                        {form.role && !knownRoleValues.has(form.role) && (
                          <option value={form.role}>{form.role} (legacy)</option>
                        )}

                        <optgroup label="Academia">
                          <option value="Bachelor Student">Bachelor Student</option>
                          <option value="Master Student">Master Student</option>
                          <option value="PhD Student">PhD Student</option>
                          <option value="Postdoctoral Researcher">
                            Postdoctoral Researcher
                          </option>
                          <option value="Research Scientist">
                            Research Scientist
                          </option>
                          <option value="Professor / Principal Investigator">
                            Professor / Principal Investigator
                          </option>
                        </optgroup>

                        <optgroup label="Technical professionals">
                          <option value="Quantum Engineer">Quantum Engineer</option>
                          <option value="Hardware Engineer">
                            Hardware Engineer
                          </option>
                          <option value="Software Engineer">
                            Software Engineer
                          </option>
                          <option value="Microwave / RF Engineer">
                            Microwave / RF Engineer
                          </option>
                          <option value="Cryogenics Engineer">
                            Cryogenics Engineer
                          </option>
                          <option value="Nanofabrication Engineer">
                            Nanofabrication Engineer
                          </option>
                          <option value="Experimental Physicist">
                            Experimental Physicist
                          </option>
                          <option value="Theoretical Physicist">
                            Theoretical Physicist
                          </option>
                        </optgroup>

                        <optgroup label="Industry & leadership">
                          <option value="Founder / Co-founder">
                            Founder / Co-founder
                          </option>
                          <option value="Executive (CEO / CTO / COO / CSO)">
                            Executive (CEO / CTO / COO / CSO)
                          </option>
                          <option value="Technical Lead / Architect">
                            Technical Lead / Architect
                          </option>
                          <option value="Engineering Manager">
                            Engineering Manager
                          </option>
                          <option value="Product Manager">Product Manager</option>
                          <option value="Industry Professional">
                            Industry Professional
                          </option>
                        </optgroup>

                        <optgroup label="Other">
                          <option value="Business Development">
                            Business Development
                          </option>
                          <option value="Consultant">Consultant</option>
                          <option value="Policy / Strategy">
                            Policy / Strategy
                          </option>
                          <option value="Other">Other</option>
                        </optgroup>
                      </select>
                    </div>

                    <div className="profile-field">
                      <label>Current title (optional)</label>
                      <input
                        type="text"
                        value={form.current_title}
                        onChange={handleChange("current_title")}
                        placeholder="e.g. CTO, Group Leader, Senior Quantum Engineer"
                      />
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

                {/* Private contact */}
                <div className="profile-section">
                  <div className="profile-section-header">
                    <h4 className="profile-section-title">Private contact</h4>
                    <p className="profile-section-sub">
                      Your email and phone number are visible only to you.
                    </p>
                  </div>

                  <div className="profile-grid">
                    <div className="profile-field">
                      <label>Account email (private)</label>
                      <input
                        type="email"
                        value={accountEmail}
                        readOnly
                        disabled
                        placeholder="you@example.com"
                      />
                    </div>

                    <div className="profile-field">
                      <label>Phone number (private, optional)</label>
                      <input
                        type="tel"
                        value={form.phone}
                        onChange={handleChange("phone")}
                        placeholder="+41 …"
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
                      <label>Research / work focus areas (comma-separated)</label>
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
                        placeholder="Python, microwave design, nanofabrication…"
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

                        {form.highest_education &&
                          !knownEduValues.has(form.highest_education) && (
                            <option value={form.highest_education}>
                              {form.highest_education} (legacy)
                            </option>
                          )}

                        <option value="Bachelor">Bachelor</option>
                        <option value="Master">Master</option>
                        <option value="PhD">PhD</option>
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

                {/* Links */}
                <div className="profile-section">
                  <div className="profile-section-header">
                    <h4 className="profile-section-title">Links & verification</h4>
                    <p className="profile-section-sub">
                      Optional external links for credibility and verification.
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
                      <label>Lab/Company website</label>
                      <input
                        type="text"
                        value={form.lab_website}
                        onChange={handleChange("lab_website")}
                        placeholder="https://…"
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
                      <label>ORCID</label>
                      <input
                        type="text"
                        value={form.orcid}
                        onChange={handleChange("orcid")}
                        placeholder="0000-0002-1825-0097 or https://orcid.org/…"
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
                  </div>
                </div>

                {/* ✅ footer actions: Cancel (left) + Save (right) */}
                <div
                  className="profile-actions"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    href="/profile"
                    className="nav-ghost-btn"
                    style={{ width: "fit-content", whiteSpace: "nowrap" }}
                  >
                    Cancel
                  </Link>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {saveMessage && <span className="profile-status">{saveMessage}</span>}

                    <button type="submit" className="nav-cta" disabled={saving}>
                      {saving ? "Saving…" : "Save profile"}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </>
  );
}

// ✅ global layout: left sidebar + middle only, no right column
(ProfileEditPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
