// pages/profile/edit.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import Link from "next/link";

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
};

export default function ProfileEditPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [profileLoading, setProfileLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

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
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("Error saving profile", error);
      setSaveMessage("Could not save profile. Please try again.");
    } else {
      setSaveMessage("Profile updated ✅");
      // Optionally go back to view page
      // router.push("/profile");
    }

    setSaving(false);
  };

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

                  {/* Education */}
                  <div className="profile-section">
                    <div className="profile-section-header">
                      <h4 className="profile-section-title">Background</h4>
                      <p className="profile-section-sub">
                        A quick overview of your academic level.
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
