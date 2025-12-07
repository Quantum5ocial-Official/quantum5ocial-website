// pages/orgs/create/company.tsx
import { useEffect, useState, FormEvent } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../../../lib/useSupabaseUser";
import { supabase } from "../../../lib/supabaseClient";

const Navbar = dynamic(() => import("../../../components/Navbar"), {
  ssr: false,
});

type OrgSize =
  | ""
  | "1-10"
  | "11-50"
  | "51-200"
  | "201-500"
  | "501-1000"
  | "1001+";

type OrgType =
  | ""
  | "startup"
  | "scaleup"
  | "corporate"
  | "vendor"
  | "lab"
  | "nonprofit"
  | "other";

export default function CreateCompanyPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  // redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState<OrgSize>("");
  const [orgType, setOrgType] = useState<OrgType>("");
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

  // auto-update slug from name until user edits slug manually
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited]);

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

    if (!name.trim()) {
      setSubmitError("Please enter your organization name.");
      return;
    }
    if (!industry.trim()) {
      setSubmitError("Please specify the industry.");
      return;
    }
    if (!size) {
      setSubmitError("Please select organization size.");
      return;
    }
    if (!orgType) {
      setSubmitError("Please select organization type.");
      return;
    }
    if (!authorized) {
      setSubmitError(
        "Please confirm that you are authorized to create this page."
      );
      return;
    }
    if (!user) {
      setSubmitError("You must be logged in to create an organization.");
      return;
    }

    setSubmitting(true);

    try {
      const effectiveSlug = (slug || slugify(name)).toLowerCase();

      const { data, error } = await supabase
        .from("organizations")
        .insert({
          created_by: user.id,
          kind: "company",
          name,
          slug: effectiveSlug,
          website: website || null,
          industry: industry || null,
          size_label: size || null,
          company_type: orgType || null,
          tagline: tagline || null,
          // logo_url will be set later when we add Storage upload
        })
        .select("slug")
        .single();

      if (error) {
        throw error;
      }

      setSubmitMessage("Company page created successfully.");
      setSubmitError(null);

      if (data?.slug) {
        router.push(`/orgs/${data.slug}`);
      }
    } catch (err: any) {
      console.error(err);
      setSubmitError(
        err?.message ||
          "Something went wrong while creating the organization."
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
              Create a company page
            </h1>
            <p
              style={{
                fontSize: 15,
                opacity: 0.8,
                maxWidth: 620,
              }}
            >
              Set up a presence for your company, startup, or vendor on
              Quantum5ocial. You&apos;ll be able to link jobs and products to
              this page later.
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
            {/* Name */}
            <div>
              <label
                htmlFor="org-name"
                style={{ display: "block", fontSize: 14, marginBottom: 4 }}
              >
                Organization name <span style={{ color: "#f97373" }}>*</span>
              </label>
              <input
                id="org-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Y-Quantum"
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

            {/* Slug */}
            <div>
              <label
                htmlFor="org-slug"
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
                  id="org-slug"
                  type="text"
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  placeholder="y-quantum"
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
                This is how your company page URL will look. You can customize
                it now.
              </p>
            </div>

            {/* Website */}
            <div>
              <label
                htmlFor="org-website"
                style={{ display: "block", fontSize: 14, marginBottom: 4 }}
              >
                Website
              </label>
              <input
                id="org-website"
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourcompany.com"
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

            {/* Industry + size + type */}
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
                  htmlFor="org-industry"
                  style={{
                    display: "block",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  Industry <span style={{ color: "#f97373" }}>*</span>
                </label>
                <input
                  id="org-industry"
                  type="text"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="e.g. Quantum hardware, control electronics"
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
                  htmlFor="org-size"
                  style={{
                    display: "block",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  Organization size{" "}
                  <span style={{ color: "#f97373" }}>*</span>
                </label>
                <select
                  id="org-size"
                  value={size}
                  onChange={(e) => setSize(e.target.value as OrgSize)}
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
                  <option value="1-10">1–10</option>
                  <option value="11-50">11–50</option>
                  <option value="51-200">51–200</option>
                  <option value="201-500">201–500</option>
                  <option value="501-1000">501–1000</option>
                  <option value="1001+">1001+</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="org-type"
                  style={{
                    display: "block",
                    fontSize: 14,
                    marginBottom: 4,
                  }}
                >
                  Organization type{" "}
                  <span style={{ color: "#f97373" }}>*</span>
                </label>
                <select
                  id="org-type"
                  value={orgType}
                  onChange={(e) => setOrgType(e.target.value as OrgType)}
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
                  <option value="startup">Startup</option>
                  <option value="scaleup">Scale-up</option>
                  <option value="corporate">Corporate</option>
                  <option value="vendor">Vendor / supplier</option>
                  <option value="lab">Industrial research lab</option>
                  <option value="nonprofit">Non-profit</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Logo upload */}
            <div>
              <label
                htmlFor="org-logo"
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
                  id="org-logo"
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
                  Selected: {logoFile.name} (logo upload wiring will come later)
                </div>
              )}
            </div>

            {/* Tagline */}
            <div>
              <label
                htmlFor="org-tagline"
                style={{ display: "block", fontSize: 14, marginBottom: 4 }}
              >
                Tagline
              </label>
              <textarea
                id="org-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Building high-impedance quantum hardware for next-generation qubits."
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
                id="org-authorized"
                type="checkbox"
                checked={authorized}
                onChange={(e) => setAuthorized(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <label
                htmlFor="org-authorized"
                style={{ fontSize: 13, lineHeight: 1.4 }}
              >
                I verify that I am an authorized representative of this
                organization and have the right to create and manage this page
                on its behalf.
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
                {submitting ? "Creating…" : "Create company page"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </>
  );
}
