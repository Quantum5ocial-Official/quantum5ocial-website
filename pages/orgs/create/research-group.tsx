// pages/orgs/create/research-group.tsx
import { useEffect, useState, FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../../../lib/useSupabaseUser";
import { supabase } from "../../../lib/supabaseClient";

const Navbar = dynamic(() => import("../../../components/Navbar"), {
  ssr: false,
});

type GroupSize = "" | "1-5" | "6-15" | "16-30" | "31-60" | "61+";

type GroupType =
  | ""
  | "university_group"
  | "institute"
  | "center"
  | "collaboration"
  | "other";

export default function CreateResearchGroupPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

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
  const [authorized, setAuthorized] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Auto-generate slug from group name unless user edits slug manually
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
    if (!authorized) {
      setSubmitError(
        "Please confirm that you are authorized to create this page."
      );
      return;
    }

    setSubmitting(true);

    try {
      const effectiveSlug = (slug || slugify(groupName)).toLowerCase();

      const { data, error } = await supabase
        .from("organizations")
        .insert({
          kind: "research_group",
          name: groupName,
          slug: effectiveSlug,
          institution: institution || null,
          department: department || null,
          website: website || null,
          focus_areas: focusAreas || null,
          size_label: size || null,
          group_type: groupType || null,
          tagline: tagline || null,
          // logo_url will be wired later when we add Storage upload
        })
        .select("slug")
        .single();

      if (error) {
        throw error;
      }

      setSubmitMessage("Research group page created successfully.");
      setSubmitError(null);

      if (data?.slug) {
        router.push(`/orgs/${data.slug}`);
      }
    } catch (err: any) {
      console.error(err);
      setSubmitError(
        err?.message || "Something went wrong while creating the group."
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
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "32px 24px 64px",
          }}
        >
          <header
            style={{
              marginBottom: 24,
            }}
          >
            <h1
              style={{
                fontSize: 28,
                fontWeight: 600,
                marginBottom: 8,
              }}
            >
              Create a research group page
            </h1>
            <p
              style={{
                fontSize: 15,
                opacity: 0.8,
                maxWidth: 620,
              }}
            >
              Set up a public page for your university group or institute on
              Quantum5ocial. Later, you&apos;ll be able to link people, jobs,
              and projects to this page.
            </p>
          </header>

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
                placeholder="e.g. Quantum Devices Group"
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
                  placeholder="quantum-devices-basel"
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
              <p
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: "rgba(148,163,184,0.9)",
                }}
              >
                This is how your group page URL will look. You can customize it
                now.
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
                  style={{
                    display: "block",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  Institution / University{" "}
                  <span style={{ color: "#f97373" }}>*</span>
                </label>
                <input
                  id="group-institution"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. University of Basel"
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
                  style={{
                    display: "block",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  Department / Institute
                </label>
                <input
                  id="group-department"
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Department of Physics"
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
                  style={{
                    display: "block",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  Group website
                </label>
                <input
                  id="group-website"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://yourgroup.university.xx"
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
                  style={{
                    display: "block",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  Focus areas
                </label>
                <input
                  id="group-focus"
                  type="text"
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  placeholder="e.g. superconducting qubits, nanowires, cQED"
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
                  style={{
                    display: "block",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
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
                  style={{
                    display: "block",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  Group type <span style={{ color: "#f97373" }}>*</span>
                </label>
                <select
                  id="group-type"
                  value={groupType}
                  onChange={(e) =>
                    setGroupType(e.target.value as GroupType)
                  }
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
              <label
                htmlFor="group-logo"
                style={{ display: "block", fontSize: 14, marginBottom: 4 }}
              >
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
                  <div style={{ marginTop: 2, fontSize: 12 }}>
                    JPG, JPEG or PNG.
                  </div>
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
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    color: "rgba(148,163,184,0.95)",
                  }}
                >
                  Selected: {logoFile.name} (logo upload wiring will come
                  later)
                </div>
              )}
            </div>

            {/* Tagline */}
            <div>
              <label
                htmlFor="group-tagline"
                style={{ display: "block", fontSize: 14, marginBottom: 4 }}
              >
                Tagline
              </label>
              <textarea
                id="group-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Exploring high-impedance superconducting circuits for quantum technologies."
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

            {/* Authorization checkbox */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginTop: 4,
              }}
            >
              <input
                id="group-authorized"
                type="checkbox"
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <label
                htmlFor="group-authorized"
                style={{ fontSize: 13, lineHeight: 1.4 }}
              >
                I verify that I am an authorized representative of this group
                and have the right to create and manage this page on its
                behalf.
              </label>
            </div>

            {/* Messages */}
            {submitError && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: "#fecaca",
                }}
              >
                {submitError}
              </div>
            )}
            {submitMessage && (
              <div
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: "#bbf7d0",
                }}
              >
                {submitMessage}
              </div>
            )}

            {/* Submit */}
            <div
              style={{
                marginTop: 12,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
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
                {submitting ? "Creating…" : "Create research group page"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}
