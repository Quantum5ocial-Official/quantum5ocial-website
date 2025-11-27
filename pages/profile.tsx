import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type ProfileForm = {
  full_name: string;
  role: string;
  organisation: string;
  country: string;
  bio: string;
  website: string;
  github: string;
  linkedin: string;
};

export default function ProfilePage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>({
    full_name: "",
    role: "",
    organisation: "",
    country: "",
    bio: "",
    website: "",
    github: "",
    linkedin: "",
  });

  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<null | "loaded" | "error" | "saved">(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth?redirect=/profile");
    }
  }, [loading, user, router]);

  // Load or create profile
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setStatus(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error loading profile", error);
        setStatus("error");
        return;
      }

      // If no row yet: create a default one
      let profile = data as any;
      if (!profile) {
        const defaults: ProfileForm & { id: string } = {
          id: user.id,
          full_name:
            (user as any).user_metadata?.name ||
            (user as any).user_metadata?.full_name ||
            "",
          role: "",
          organisation: "",
          country: "",
          bio: "",
          website: "",
          github: (user as any).user_metadata?.user_name
            ? `https://github.com/${(user as any).user_metadata.user_name}`
            : "",
          linkedin: "",
        };

        const { data: inserted, error: insertError } = await supabase
          .from("profiles")
          .insert(defaults)
          .select()
          .single();

        if (insertError) {
          console.error("Error creating profile", insertError);
          setStatus("error");
          return;
        }
        profile = inserted;
      }

      setForm({
        full_name: profile.full_name || "",
        role: profile.role || "",
        organisation: profile.organisation || "",
        country: profile.country || "",
        bio: profile.bio || "",
        website: profile.website || "",
        github: profile.github || "",
        linkedin: profile.linkedin || "",
      });
      setStatus("loaded");
    };

    loadProfile();
  }, [user]);

  const handleChange =
    (field: keyof ProfileForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setStatus(null);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        role: form.role,
        organisation: form.organisation,
        country: form.country,
        bio: form.bio,
        website: form.website,
        github: form.github,
        linkedin: form.linkedin,
      })
      .eq("id", user.id);

    setSaving(false);

    if (error) {
      console.error("Error saving profile", error);
      setStatus("error");
    } else {
      setStatus("saved");
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
                This information helps labs, companies, and collaborators understand who
                you are in the quantum ecosystem.
              </div>
            </div>
          </div>

          <div className="profile-card">
            {(!status || status === "loaded" || status === "saved") && (
              <form onSubmit={handleSubmit} className="profile-form">
                <div className="profile-grid">
                  <div className="profile-field">
                    <label>Full name</label>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={handleChange("full_name")}
                      placeholder="Your name"
                    />
                  </div>

                  <div className="profile-field">
                    <label>Role</label>
                    <input
                      type="text"
                      value={form.role}
                      onChange={handleChange("role")}
                      placeholder="Student, Postdoc, Professor, Engineer, Founder…"
                    />
                  </div>

                  <div className="profile-field">
                    <label>Organisation / Lab / Company</label>
                    <input
                      type="text"
                      value={form.organisation}
                      onChange={handleChange("organisation")}
                      placeholder="University / institute / startup"
                    />
                  </div>

                  <div className="profile-field">
                    <label>Country / City</label>
                    <input
                      type="text"
                      value={form.country}
                      onChange={handleChange("country")}
                      placeholder="e.g. Switzerland, Zurich"
                    />
                  </div>

                  <div className="profile-field profile-field-full">
                    <label>Short bio</label>
                    <textarea
                      rows={4}
                      value={form.bio}
                      onChange={handleChange("bio")}
                      placeholder="Briefly describe your focus in quantum (devices, theory, software, hardware, entrepreneurship…)."
                    />
                  </div>

                  <div className="profile-field">
                    <label>Website</label>
                    <input
                      type="url"
                      value={form.website}
                      onChange={handleChange("website")}
                      placeholder="https://…"
                    />
                  </div>

                  <div className="profile-field">
                    <label>GitHub</label>
                    <input
                      type="url"
                      value={form.github}
                      onChange={handleChange("github")}
                      placeholder="https://github.com/your-handle"
                    />
                  </div>

                  <div className="profile-field">
                    <label>LinkedIn</label>
                    <input
                      type="url"
                      value={form.linkedin}
                      onChange={handleChange("linkedin")}
                      placeholder="https://www.linkedin.com/in/…"
                    />
                  </div>
                </div>

                <div className="profile-actions">
                  <button type="submit" className="nav-cta" disabled={saving}>
                    {saving ? "Saving…" : "Save profile"}
                  </button>

                  {status === "saved" && (
                    <span className="profile-status success">Profile updated ✓</span>
                  )}
                  {status === "error" && (
                    <span className="profile-status error">
                      Could not save profile. Please try again.
                    </span>
                  )}
                </div>
              </form>
            )}

            {status === null && (
              <div className="profile-loading">Loading your profile…</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
