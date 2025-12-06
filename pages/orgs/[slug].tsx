// pages/orgs/[slug].tsx
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), {
  ssr: false,
});

type Org = {
  id: string;
  created_by: string | null;
  kind: "company" | "research_group";
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
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

export default function OrganizationDetailPage() {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const { slug } = router.query;

  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const loadOrg = async () => {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        setOrg(data as Org);
      } else {
        setOrg(null);
        setNotFound(true);
      }
      setLoading(false);
    };

    loadOrg();
  }, [slug]);

  const isOwner = useMemo(() => {
    if (!user || !org) return false;
    return org.created_by === user.id;
  }, [user, org]);

  const kindLabel = org?.kind === "company" ? "Company" : "Research group";

  const metaLine = useMemo(() => {
    if (!org) return "";

    const bits: string[] = [];

    if (org.kind === "company") {
      if (org.industry) bits.push(org.industry);
      if (org.company_type) bits.push(org.company_type);
    } else {
      if (org.institution) bits.push(org.institution);
      if (org.department) bits.push(org.department);
    }

    if (org.size_label) bits.push(org.size_label);

    if (org.city && org.country) bits.push(`${org.city}, ${org.country}`);
    else if (org.country) bits.push(org.country);

    return bits.join(" · ");
  }, [org]);

  const firstLetter = org?.name?.charAt(0).toUpperCase() || "Q";

  // 🆕 Edit target – go back to the corresponding create form in "edit" mode
  const editHref = useMemo(() => {
    if (!org) return "#";
    if (org.kind === "company") {
      return `/orgs/create/company?edit=${encodeURIComponent(org.slug)}`;
    }
    return `/orgs/create/research-group?edit=${encodeURIComponent(
      org.slug
    )}`;
  }, [org]);

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
          {loading ? (
            <div
              style={{
                fontSize: 14,
                color: "rgba(209,213,219,0.9)",
              }}
            >
              Loading organization…
            </div>
          ) : notFound || !org ? (
            <div
              style={{
                fontSize: 14,
                color: "rgba(209,213,219,0.9)",
              }}
            >
              Organization not found or no longer active.
            </div>
          ) : (
            <>
              {/* Top bar: back link */}
              <div
                style={{
                  marginBottom: 16,
                  fontSize: 13,
                }}
              >
                <Link
                  href="/orgs"
                  style={{
                    color: "#7dd3fc",
                    textDecoration: "none",
                  }}
                >
                  ← Back to organizations
                </Link>
              </div>

              {/* Header card */}
              <section
                style={{
                  borderRadius: 20,
                  padding: 20,
                  border: "1px solid rgba(148,163,184,0.3)",
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.98))",
                  boxShadow: "0 18px 40px rgba(15,23,42,0.6)",
                  marginBottom: 24,
                  display: "flex",
                  gap: 18,
                  alignItems: "flex-start",
                }}
              >
                {/* Logo / initial */}
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: 20,
                    overflow: "hidden",
                    flexShrink: 0,
                    border: "1px solid rgba(148,163,184,0.45)",
                    background:
                      "linear-gradient(135deg,#3bc7f3,#8468ff)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0f172a",
                    fontWeight: 700,
                    fontSize: 26,
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
                    firstLetter
                  )}
                </div>

                {/* Text + actions */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 12,
                      marginBottom: 4,
                    }}
                  >
                    <div
                      style={{
                        minWidth: 0,
                      }}
                    >
                      <h1
                        style={{
                          fontSize: 26,
                          fontWeight: 600,
                          margin: 0,
                          marginBottom: 4,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {org.name}
                      </h1>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            borderRadius: 999,
                            padding: "3px 9px",
                            border:
                              "1px solid rgba(148,163,184,0.7)",
                            color: "rgba(226,232,240,0.95)",
                          }}
                        >
                          {kindLabel}
                        </span>
                        {org.size_label && (
                          <span
                            style={{
                              fontSize: 12,
                              borderRadius: 999,
                              padding: "3px 9px",
                              border:
                                "1px solid rgba(148,163,184,0.5)",
                              color: "rgba(226,232,240,0.9)",
                            }}
                          >
                            {org.size_label}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions: Edit for owner, placeholder Follow for others */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        gap: 8,
                        flexShrink: 0,
                      }}
                    >
                      {isOwner ? (
                        <Link
                          href={editHref}
                          style={{
                            padding: "8px 14px",
                            borderRadius: 999,
                            fontSize: 13,
                            fontWeight: 500,
                            textDecoration: "none",
                            background:
                              "linear-gradient(135deg,#3bc7f3,#8468ff)",
                            color: "#0f172a",
                            border: "none",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Edit organization
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          style={{
                            padding: "8px 14px",
                            borderRadius: 999,
                            fontSize: 13,
                            border: "1px solid rgba(148,163,184,0.6)",
                            background: "transparent",
                            color: "rgba(148,163,184,0.95)",
                            cursor: "not-allowed",
                            whiteSpace: "nowrap",
                          }}
                        >
                          Follow (soon)
                        </button>
                      )}
                    </div>
                  </div>

                  {metaLine && (
                    <div
                      style={{
                        fontSize: 13,
                        color: "rgba(148,163,184,0.95)",
                        marginBottom: 6,
                      }}
                    >
                      {metaLine}
                    </div>
                  )}

                  {org.tagline && (
                    <div
                      style={{
                        fontSize: 14,
                        color: "rgba(209,213,219,0.95)",
                      }}
                    >
                      {org.tagline}
                    </div>
                  )}

                  {org.website && (
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: 13,
                      }}
                    >
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "#7dd3fc",
                          textDecoration: "none",
                        }}
                      >
                        {org.website.replace(/^https?:\/\//, "")} ↗
                      </a>
                    </div>
                  )}
                </div>
              </section>

              {/* Content section */}
              <section>
                {org.description ? (
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.6,
                      color: "rgba(226,232,240,0.95)",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {org.description}
                  </div>
                ) : (
                  <div
                    style={{
                      fontSize: 14,
                      color: "rgba(156,163,175,0.95)",
                    }}
                  >
                    No detailed description added yet.
                  </div>
                )}

                {org.focus_areas && (
                  <div
                    style={{
                      marginTop: 18,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: 0.08,
                        color: "rgba(148,163,184,0.9)",
                        marginBottom: 6,
                      }}
                    >
                      Focus areas
                    </div>
                    <div
                      style={{
                        fontSize: 14,
                        color: "rgba(226,232,240,0.95)",
                      }}
                    >
                      {org.focus_areas}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
}
