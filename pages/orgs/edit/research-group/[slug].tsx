// pages/orgs/edit/research-group/[slug].tsx
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../../../../lib/useSupabaseUser";
import { supabase } from "../../../../lib/supabaseClient";

type GroupSize = "" | "1-5" | "6-15" | "16-30" | "31-60" | "61+";

type GroupType =
  | ""
  | "university_group"
  | "institute"
  | "center"
  | "collaboration"
  | "other";

type GroupRow = {
  id: string;
  created_by: string;
  kind: "company" | "research_group";
  name: string;
  slug: string;
  institution: string | null;
  department: string | null;
  website: string | null;
  focus_areas: string | null;
  size_label: GroupSize | null;
  group_type: GroupType | null;
  tagline: string | null;
  logo_url: string | null;
};

export default function EditResearchGroupPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const rawSlug = router.query.slug;
  const slugFromUrl = typeof rawSlug === "string" ? rawSlug : "";
  const [orgId, setOrgId] = useState<string | null>(null);

  const [groupName, setGroupName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  const [institution, setInstitution] = useState("");
  const [department, setDepartment] = useState("");
  const [website, setWebsite] = useState("");
  const [focusAreas, setFocusAreas] = useState("");
  const [size, setSize] = useState<GroupSize>("");
  const [groupType, setGroupType] = useState<GroupType>("");

  const [tagline, setTagline] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [authorizedCheckbox, setAuthorizedCheckbox] = useState(false);

  const [loadingOrg, setLoadingOrg] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

  // Load existing group
  useEffect(() => {
    if (!user || !slugFromUrl) return;

    const loadGroup = async () => {
      setLoadingOrg(true);
      setSubmitError(null);

      const { data, error } = await supabase
        .from("organizations")
        .select(
          "id, created_by, kind, name, slug, institution, department, website, focus_areas, size_label, group_type, tagline, logo_url"
        )
        .eq("slug", slugFromUrl)
        .eq("kind", "research_group")
        .maybeSingle<GroupRow>();

      if (error || !data) {
        console.error("Error loading research group for edit", error);
        setSubmitError("Could not load this research group page.");
        setLoadingOrg(false);
        return;
      }

      if (data.created_by !== user.id) {
        setSubmitError("You are not allowed to edit this group.");
        setLoadingOrg(false);
        return;
      }

      setOrgId(data.id);
      setGroupName(data.name ?? "");
      setSlug(data.slug ?? "");
      setInstitution(data.institution ?? "");
      setDepartment(data.department ?? "");
      setWebsite(data.website ?? "");
      setFocusAreas(data.focus_areas ?? "");
      setSize((data.size_label as GroupSize) || "");
      setGroupType((data.group_type as GroupType) || "");
      setTagline(data.tagline ?? "");
      setSlugManuallyEdited(true);
      setLoadingOrg(false);
    };

    loadGroup();
  }, [user, slugFromUrl]);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(groupName));
    }
  }, [groupName, slugManuallyEdited]);

  const handleSlugChange = (value: string) => {
    setSlug(value);
    setSlugManuallyEdited(true);
  };

  const handleLogoChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      setLogoFile(null);
      return;
    }
    setLogoFile(files[0]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitMessage(null);
    setSubmitError(null);

    if (!orgId || !user) {
      setSubmitError("Missing group information.");
      return;
    }
    if (!groupName.trim()) {
      setSubmitError("Please enter your group name.");
      return;
    }
    if (!institution.trim()) {
      setSubmitError("Please enter the institution / university.");
      return;
    }
    if (!size) {
      setSubmitError("Please select group size.");
      return;
    }
    if (!groupType) {
      setSubmitError("Please select group type.");
      return;
    }
    if (!authorizedCheckbox) {
      setSubmitError(
        "Please confirm that you are authorized to update this page."
      );
      return;
    }

    setSubmitting(true);

    try {
      const effectiveSlug = (slug || slugify(groupName)).toLowerCase();

      const { data, error } = await supabase
        .from("organizations")
        .update({
          name: groupName,
          slug: effectiveSlug,
          institution: institution || null,
          department: department || null,
          website: website || null,
          focus_areas: focusAreas || null,
          size_label: size || null,
          group_type: groupType || null,
          tagline: tagline || null,
        })
        .eq("id", orgId)
        .eq("created_by", user.id)
        .eq("kind", "research_group")
        .select("slug")
        .single();

      if (error) throw error;

      setSubmitMessage("Research group page updated successfully.");

      // If slug changed, navigate to the new public URL (and stop here).
      if (data?.slug && data.slug !== slugFromUrl) {
        router.push(`/orgs/${data.slug}`);
        return;
      }
    } catch (err: any) {
      console.error(err);
      setSubmitError(
        err?.message || "Something went wrong while updating the group."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || (!user && typeof window !== "undefined")) {
    return null;
  }

  return (
    <>
      <main
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "32px 24px 64px",
        }}
      >
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>
            Edit research group page
          </h1>
          <p style={{ fontSize: 15, opacity: 0.8, maxWidth: 620 }}>
            Update how your group or institute appears on Quantum5ocial.
          </p>
        </header>

        {loadingOrg ? (
          <div style={{ fontSize: 14, opacity: 0.8 }}>
            Loading research group…
          </div>
        ) : submitError && !orgId ? (
          <div style={{ fontSize: 14, color: "#fecaca" }}>{submitError}</div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{
              borderRadius: 18,
              padding: 24,
              border: "1px solid rgba(148,163,184,0.28)",
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.96))",
              boxShadow: "0 18px 40px rgba(15,23,42,0.55)",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {/* Group name */}
            <div>
              <label
                htmlFor="group-name"
                style={{ display: "block", fontSize: 14, marginBottom: 4 }}
              >
                Group name <span style={{ color: "#f97373" }}>*</span>
              </label>
              <input
                id="group-name"
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,0.6)",
                  backgroundColor: "rgba(15,23,42,0.9)",
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
              />
            </div>

            {/* Public URL */}
            <div>
              <label
                htmlFor="group-slug"
                style={{ display: "block", fontSize: 14, marginBottom: 4 }}
              >
                Public URL
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                }}
              >
                <span
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    backgroundColor: "rgba(15,23,42,0.8)",
                    border: "1px solid rgba(148,163,184,0.3)",
                    color: "rgba(148,163,184,0.9)",
                    whiteSpace: "nowrap",
                  }}
                >
                  quantum5ocial.com/orgs/
                </span>
                <input
                  id="group-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.6)",
                    backgroundColor: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
              <p style={{ marginTop: 4, fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
                This is the public URL of your group page.
              </p>
            </div>

            {/* Institution / Department / Website */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 2fr) minmax(0, 1.5fr) minmax(0, 1.5fr)",
                gap: 16,
              }}
            >
              <div>
                <label
                  htmlFor="group-institution"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Institution / University <span style={{ color: "#f97373" }}>*</span>
                </label>
                <input
                  id="group-institution"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.6)",
                    backgroundColor: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="group-department"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Department / Institute
                </label>
                <input
                  id="group-department"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.6)",
                    backgroundColor: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="group-website"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Group website
                </label>
                <input
                  id="group-website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.6)",
                    backgroundColor: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>
            </div>

            {/* Focus areas + size + group type */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1.2fr)",
                gap: 16,
              }}
            >
              <div>
                <label
                  htmlFor="group-focus"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Focus areas
                </label>
                <input
                  id="group-focus"
                  type="text"
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.6)",
                    backgroundColor: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 14,
                  }}
                />
              </div>

              <div>
                <label
                  htmlFor="group-size"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Group size <span style={{ color: "#f97373" }}>*</span>
                </label>
                <select
                  id="group-size"
                  value={size}
                  onChange={(e) => setSize(e.target.value as GroupSize)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.6)",
                    backgroundColor: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 14,
                  }}
                >
                  <option value="">Select size</option>
                  <option value="1-5">1–5</option>
                  <option value="6-15">6–15</option>
                  <option value="16-30">16–30</option>
                  <option value="31-60">31–60</option>
                  <option value="61+">61+</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="group-type"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Group type <span style={{ color: "#f97373" }}>*</span>
                </label>
                <select
                  id="group-type"
                  value={groupType}
                  onChange={(e) => setGroupType(e.target.value as GroupType)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "1px solid rgba(148,163,184,0.6)",
                    backgroundColor: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 14,
                  }}
                >
                  <option value="">Select type</option>
                  <option value="university_group">University group</option>
                  <option value="institute">Institute</option>
                  <option value="center">Center</option>
                  <option value="collaboration">Collaboration / network</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Logo upload */}
            <div>
              <label htmlFor="group-logo" style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
                Logo
              </label>
              <div
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: "1px dashed rgba(148,163,184,0.6)",
                  backgroundColor: "rgba(15,23,42,0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  fontSize: 13,
                  color: "rgba(148,163,184,0.95)",
                }}
              >
                <div>
                  <div>Upload a square logo (300×300px recommended).</div>
                  <div style={{ marginTop: 2, fontSize: 12 }}>JPG, JPEG or PNG.</div>
                </div>
                <input
                  id="group-logo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleLogoChange(e.target.files)}
                  style={{ maxWidth: 220 }}
                />
              </div>
              {logoFile && (
                <div style={{ marginTop: 4, fontSize: 12, color: "rgba(148,163,184,0.95)" }}>
                  Selected: {logoFile.name} (logo upload wiring will come later)
                </div>
              )}
            </div>

            {/* Tagline */}
            <div>
              <label htmlFor="group-tagline" style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
                Tagline
              </label>
              <textarea
                id="group-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                rows={3}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: "1px solid rgba(148,163,184,0.6)",
                  backgroundColor: "rgba(15,23,42,0.9)",
                  color: "#e5e7eb",
                  fontSize: 14,
                  resize: "vertical",
                }}
              />
            </div>

            {/* Authorization */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 4 }}>
              <input
                id="group-authorized"
                type="checkbox"
                checked={authorizedCheckbox}
                onChange={(e) => setAuthorizedCheckbox(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <label htmlFor="group-authorized" style={{ fontSize: 13, lineHeight: 1.4 }}>
                I confirm that I am still authorized to manage this group page.
              </label>
            </div>

            {/* Messages */}
            {submitError && (
              <div style={{ marginTop: 4, fontSize: 13, color: "#fecaca" }}>
                {submitError}
              </div>
            )}
            {submitMessage && (
              <div style={{ marginTop: 4, fontSize: 13, color: "#bbf7d0" }}>
                {submitMessage}
              </div>
            )}

            {/* Submit */}
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "9px 18px",
                  borderRadius: 999,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.7 : 1,
                  background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                  color: "#0f172a",
                }}
              >
                {submitting ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </main>
    </>
  );
}

// ✅ global layout: left sidebar + middle only, no right column
(EditResearchGroupPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
