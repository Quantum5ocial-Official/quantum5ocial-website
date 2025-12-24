// pages/orgs/edit/company/[slug].tsx
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../../../../lib/useSupabaseUser";
import { supabase } from "../../../../lib/supabaseClient";

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

type HiringStatus = "" | "not_hiring" | "hiring_selectively" | "actively_hiring";

type OrgRow = {
  id: string;
  created_by: string;
  kind: "company" | "research_group";
  name: string;
  slug: string;
  website: string | null;
  industry: string | null;
  size_label: OrgSize | null;
  company_type: OrgType | null;
  tagline: string | null;
  logo_url: string | null;

  country: string | null;
  city: string | null;
  description: string | null;
  focus_areas: string | null;
  technology_type: string | null;
  target_customers: string | null;
  careers_url: string | null;
  public_contact_email: string | null;
  hiring_status: HiringStatus | null;
};

type OrgMemberRow = {
  role: "owner" | "co_owner" | "admin" | "member";
};

export default function EditCompanyPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const rawSlug = router.query.slug;
  const slugFromUrl = typeof rawSlug === "string" ? rawSlug : "";
  const [orgId, setOrgId] = useState<string | null>(null);

  // core fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [size, setSize] = useState<OrgSize>("");
  const [orgType, setOrgType] = useState<OrgType>("");
  const [tagline, setTagline] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  // extra fields
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [description, setDescription] = useState("");
  const [focusAreas, setFocusAreas] = useState("");
  const [technologyType, setTechnologyType] = useState("");
  const [targetCustomers, setTargetCustomers] = useState("");
  const [careersUrl, setCareersUrl] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [hiringStatus, setHiringStatus] = useState<HiringStatus>("");

  const [authorizedCheckbox, setAuthorizedCheckbox] = useState(false);

  const [loadingOrg, setLoadingOrg] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [canEditOrg, setCanEditOrg] = useState(false);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  // Redirect to login if needed
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

  // Load existing organization + check permissions
  useEffect(() => {
    if (!user || !slugFromUrl) return;

    const loadOrg = async () => {
      setLoadingOrg(true);
      setSubmitError(null);
      setCanEditOrg(false);

      const { data, error } = await supabase
        .from("organizations")
        .select(
          `
          id,
          created_by,
          kind,
          name,
          slug,
          website,
          industry,
          size_label,
          company_type,
          tagline,
          logo_url,
          country,
          city,
          description,
          focus_areas,
          technology_type,
          target_customers,
          careers_url,
          public_contact_email,
          hiring_status
        `
        )
        .eq("slug", slugFromUrl)
        .eq("kind", "company")
        .maybeSingle<OrgRow>();

      if (error || !data) {
        console.error("Error loading company for edit", error);
        setSubmitError("Could not load this company page.");
        setLoadingOrg(false);
        return;
      }

      const isCreator = data.created_by === user.id;

      let role: OrgMemberRow["role"] | null = null;

      if (!isCreator) {
        const { data: memberRow, error: memberError } = await supabase
          .from("org_members")
          .select("role")
          .eq("org_id", data.id)
          .eq("user_id", user.id)
          .maybeSingle<OrgMemberRow>();

        if (memberError) {
          console.error("Error loading org membership", memberError);
        }
        role = memberRow?.role ?? null;
      }

      const isOwnerLike =
        isCreator || role === "owner" || role === "co_owner";

      if (!isOwnerLike) {
        setSubmitError("You are not allowed to edit this organization.");
        setLoadingOrg(false);
        return;
      }

      setCanEditOrg(true);

      // Prefill form from existing org
      setOrgId(data.id);
      setName(data.name ?? "");
      setSlug(data.slug ?? "");
      setWebsite(data.website ?? "");
      setIndustry(data.industry ?? "");
      setSize((data.size_label as OrgSize) || "");
      setOrgType((data.company_type as OrgType) || "");
      setTagline(data.tagline ?? "");

      setCountry(data.country ?? "");
      setCity(data.city ?? "");
      setDescription(data.description ?? "");
      setFocusAreas(data.focus_areas ?? "");
      setTechnologyType(data.technology_type ?? "");
      setTargetCustomers(data.target_customers ?? "");
      setCareersUrl(data.careers_url ?? "");
      setContactEmail(data.public_contact_email ?? "");
      setHiringStatus((data.hiring_status as HiringStatus) || "");

      setSlugManuallyEdited(true); // don't auto-change slug when editing
      setLoadingOrg(false);
    };

    loadOrg();
  }, [user, slugFromUrl]);

  // auto-update slug from name ONLY if user hasn't touched slug
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

    if (!orgId || !user) {
      setSubmitError("Missing organization information.");
      return;
    }

    if (!canEditOrg) {
      setSubmitError("You are not allowed to edit this organization.");
      return;
    }

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
    if (!authorizedCheckbox) {
      setSubmitError(
        "Please confirm that you are authorized to update this page."
      );
      return;
    }

    setSubmitting(true);

    try {
      const effectiveSlug = (slug || slugify(name)).toLowerCase();

      // 🔧 IMPORTANT CHANGE: no .select().single() here
      const { error } = await supabase
        .from("organizations")
        .update({
          name,
          slug: effectiveSlug,
          website: website || null,
          industry: industry || null,
          size_label: size || null,
          company_type: orgType || null,
          tagline: tagline || null,
          country: country || null,
          city: city || null,
          description: description || null,
          focus_areas: focusAreas || null,
          technology_type: technologyType || null,
          target_customers: targetCustomers || null,
          careers_url: careersUrl || null,
          public_contact_email: contactEmail || null,
          hiring_status: hiringStatus || null,
          // logo_url will be wired later when upload is implemented
        })
        .eq("id", orgId)
        .eq("kind", "company");

      if (error) throw error;

      // Decide which slug to use for redirect
      const finalSlug =
        effectiveSlug && effectiveSlug !== slugFromUrl
          ? effectiveSlug
          : slugFromUrl || effectiveSlug;

      // ✅ Always go back to the public org page after saving
      if (finalSlug) {
        router.push(`/orgs/${finalSlug}`);
      } else {
        setSubmitMessage("Company page updated.");
      }
    } catch (err: any) {
      console.error(err);
      const raw = err?.message as string | undefined;

      // nicer message if something similar ever appears again
      const friendly =
        raw &&
        raw.includes("Cannot coerce the result to a single JSON object")
          ? "Update failed – no row was updated. Please check your permissions."
          : raw || "Something went wrong while updating the company.";

      setSubmitError(friendly);
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
            Edit company page
          </h1>
          <p style={{ fontSize: 15, opacity: 0.8, maxWidth: 620 }}>
            Update how your company, startup, or vendor appears on Quantum5ocial.
          </p>
        </header>

        {loadingOrg ? (
          <div style={{ fontSize: 14, opacity: 0.8 }}>Loading company…</div>
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
                This is the public URL of your company page.
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

            {/* Location */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
                gap: 16,
              }}
            >
              <div>
                <label
                  htmlFor="org-country"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Country
                </label>
                <input
                  id="org-country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="e.g. Switzerland"
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
                  htmlFor="org-city"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  City
                </label>
                <input
                  id="org-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Villigen, Zurich, Boston"
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

            {/* Industry + size + type + hiring status */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "minmax(0, 2.1fr) minmax(0, 1.2fr) minmax(0, 1.4fr) minmax(0, 1.4fr)",
                gap: 16,
              }}
            >
              <div>
                <label
                  htmlFor="org-industry"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
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
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
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
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
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

              <div>
                <label
                  htmlFor="org-hiring-status"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Hiring status
                </label>
                <select
                  id="org-hiring-status"
                  value={hiringStatus}
                  onChange={(e) =>
                    setHiringStatus(e.target.value as HiringStatus)
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
                  <option value="">No status</option>
                  <option value="not_hiring">Not hiring</option>
                  <option value="hiring_selectively">Hiring selectively</option>
                  <option value="actively_hiring">Actively hiring</option>
                </select>
              </div>
            </div>

            {/* Logo upload (UI only) */}
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
                rows={2}
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

            {/* About / Description */}
            <div>
              <label
                htmlFor="org-description"
                style={{ display: "block", fontSize: 14, marginBottom: 4 }}
              >
                About the company
              </label>
              <textarea
                id="org-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what your company or lab does, your main mission and activities, and any highlights you’d like people to know."
                rows={5}
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

            {/* Focus / Tech / Customers */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1.1fr) minmax(0, 1.1fr)",
                gap: 16,
              }}
            >
              <div>
                <label
                  htmlFor="org-focus"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Focus areas
                </label>
                <textarea
                  id="org-focus"
                  value={focusAreas}
                  onChange={(e) => setFocusAreas(e.target.value)}
                  placeholder="Comma-separated list, e.g. superconducting qubits, control electronics, packaging, cryogenics"
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

              <div>
                <label
                  htmlFor="org-tech-type"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Technology type
                </label>
                <textarea
                  id="org-tech-type"
                  value={technologyType}
                  onChange={(e) => setTechnologyType(e.target.value)}
                  placeholder="e.g. Superconducting circuits, trapped ions, photonics, neutral atoms, quantum software, consulting"
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

              <div>
                <label
                  htmlFor="org-target-customers"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Target customers
                </label>
                <textarea
                  id="org-target-customers"
                  value={targetCustomers}
                  onChange={(e) => setTargetCustomers(e.target.value)}
                  placeholder="e.g. University labs, quantum startups, national labs, OEMs, cloud providers"
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
            </div>

            {/* Careers + contact */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1.2fr)",
                gap: 16,
              }}
            >
              <div>
                <label
                  htmlFor="org-careers-url"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Careers page
                </label>
                <input
                  id="org-careers-url"
                  type="url"
                  value={careersUrl}
                  onChange={(e) => setCareersUrl(e.target.value)}
                  placeholder="https://yourcompany.com/careers"
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
                  htmlFor="org-contact-email"
                  style={{ display: "block", fontSize: 14, marginBottom: 4 }}
                >
                  Public contact email
                </label>
                <input
                  id="org-contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. contact@yourcompany.com"
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
                checked={authorizedCheckbox}
                onChange={(e) => setAuthorizedCheckbox(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <label
                htmlFor="org-authorized"
                style={{ fontSize: 13, lineHeight: 1.4 }}
              >
                I confirm that I am still authorized to manage this
                organization page.
              </label>
            </div>

            {/* Messages */}
            {submitError && (
              <div
                style={{ marginTop: 4, fontSize: 13, color: "#fecaca" }}
              >
                {submitError}
              </div>
            )}
            {submitMessage && (
              <div
                style={{ marginTop: 4, fontSize: 13, color: "#bbf7d0" }}
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
(EditCompanyPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
