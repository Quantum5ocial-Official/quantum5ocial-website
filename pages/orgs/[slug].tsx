// pages/orgs/[slug].tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { supabase } from "../../lib/supabaseClient";

const Navbar = dynamic(() => import("../../components/Navbar"), {
  ssr: false,
});

type Org = {
  id: string;
  kind: "company" | "research_group";
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  banner_url: string | null;
  country: string | null;
  city: string | null;
  industry: string | null;
  focus_areas: string | null;
  size_label: string | null;
  company_type: string | null;
  group_type: string | null;
  institution: string | null;
  department: string | null;
};

export default function OrganizationPage() {
  const router = useRouter();
  const { slug } = router.query;

  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadOrg = async () => {
      if (!slug || typeof slug !== "string") return;
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error("Error loading organization", error);
        setOrg(null);
        setNotFound(true);
      } else if (!data) {
        setOrg(null);
        setNotFound(true);
      } else {
        setOrg(data as Org);
      }
      setLoading(false);
    };

    loadOrg();
  }, [slug]);

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
          {loading && (
            <div style={{ color: "#e5e7eb", fontSize: 15 }}>Loading…</div>
          )}

          {!loading && notFound && (
            <div
              style={{
                color: "#e5e7eb",
                fontSize: 16,
                padding: 24,
                borderRadius: 16,
                border: "1px solid rgba(148,163,184,0.35)",
                background: "rgba(15,23,42,0.9)",
              }}
            >
              Organization not found.
            </div>
          )}

          {!loading && org && (
            <>
              {/* Header card */}
              <section
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.92))",
                  boxShadow: "0 20px 50px rgba(15,23,42,0.7)",
                  marginBottom: 28,
                  overflow: "hidden",
                }}
              >
                {/* Banner */}
                <div
                  style={{
                    height: 120,
                    background:
                      org.banner_url
                        ? `url(${org.banner_url}) center/cover no-repeat`
                        : "radial-gradient(circle at 0% 0%, #3bc7f399, #0f172a 55%)",
                  }}
                />

                <div
                  style={{
                    padding: "20px 22px 22px",
                    display: "flex",
                    gap: 20,
                    alignItems: "flex-end",
                  }}
                >
                  {/* Logo */}
                  <div
                    style={{
                      marginTop: -64,
                      width: 90,
                      height: 90,
                      borderRadius: 20,
                      border: "2px solid rgba(15,23,42,0.9)",
                      overflow: "hidden",
                      background:
                        "linear-gradient(135deg,#3bc7f3,#8468ff)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {org.logo_url ? (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      <span
                        style={{
                          fontSize: 34,
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {org.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Text block */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 24,
                        fontWeight: 600,
                        color: "#e5e7eb",
                        marginBottom: 4,
                      }}
                    >
                      {org.name}
                    </div>

                    {/* Meta line */}
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(148,163,184,0.95)",
                        marginBottom: 6,
                      }}
                    >
                      {org.kind === "company"
                        ? "Company"
                        : "Research group"}
                      {org.institution && org.kind === "research_group"
                        ? ` · ${org.institution}`
                        : ""}
                      {org.city && org.country
                        ? ` · ${org.city}, ${org.country}`
                        : org.country
                        ? ` · ${org.country}`
                        : ""}
                    </div>

                    {/* Tagline */}
                    {org.tagline && (
                      <div
                        style={{
                          fontSize: 14,
                          color: "rgba(226,232,240,0.95)",
                          marginTop: 2,
                        }}
                      >
                        {org.tagline}
                      </div>
                    )}
                  </div>

                  {/* Website button */}
                  {org.website && (
                    <a
                      href={org.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "8px 16px",
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.7)",
                        fontSize: 13,
                        color: "#7dd3fc",
                        textDecoration: "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Visit website ↗
                    </a>
                  )}
                </div>
              </section>

              {/* Details section */}
              <section
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1.2fr)",
                  gap: 20,
                }}
              >
                {/* Left: description placeholder */}
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.28)",
                    background: "rgba(15,23,42,0.92)",
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      marginBottom: 8,
                      color: "#e5e7eb",
                    }}
                  >
                    About
                  </div>
                  {org.description ? (
                    <p
                      style={{
                        fontSize: 14,
                        color: "rgba(209,213,219,0.95)",
                        lineHeight: 1.55,
                      }}
                    >
                      {org.description}
                    </p>
                  ) : (
                    <p
                      style={{
                        fontSize: 14,
                        color: "rgba(148,163,184,0.95)",
                        lineHeight: 1.55,
                      }}
                    >
                      This organization has not added a full description yet.
                      As Quantum5ocial evolves, this section will show more
                      details, projects, and links.
                    </p>
                  )}
                </div>

                {/* Right: meta info */}
                <div
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.28)",
                    background: "rgba(15,23,42,0.92)",
                    padding: 18,
                    fontSize: 13,
                    color: "rgba(209,213,219,0.95)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14.5,
                      fontWeight: 500,
                      marginBottom: 6,
                      color: "#e5e7eb",
                    }}
                  >
                    Details
                  </div>

                  {org.kind === "company" && org.industry && (
                    <div>
                      <span style={{ opacity: 0.7 }}>Industry:</span>{" "}
                      {org.industry}
                    </div>
                  )}

                  {org.kind === "company" && org.company_type && (
                    <div>
                      <span style={{ opacity: 0.7 }}>Type:</span>{" "}
                      {org.company_type}
                    </div>
                  )}

                  {org.kind === "research_group" && org.institution && (
                    <div>
                      <span style={{ opacity: 0.7 }}>Institution:</span>{" "}
                      {org.institution}
                    </div>
                  )}

                  {org.kind === "research_group" && org.department && (
                    <div>
                      <span style={{ opacity: 0.7 }}>Department:</span>{" "}
                      {org.department}
                    </div>
                  )}

                  {org.focus_areas && (
                    <div>
                      <span style={{ opacity: 0.7 }}>Focus areas:</span>{" "}
                      {org.focus_areas}
                    </div>
                  )}

                  {org.size_label && (
                    <div>
                      <span style={{ opacity: 0.7 }}>Size:</span>{" "}
                      {org.size_label} people
                    </div>
                  )}

                  {!org.industry &&
                    !org.focus_areas &&
                    !org.size_label &&
                    !org.institution && (
                      <div style={{ opacity: 0.7 }}>
                        More details will appear here as this organization
                        completes its profile.
                      </div>
                    )}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
}
