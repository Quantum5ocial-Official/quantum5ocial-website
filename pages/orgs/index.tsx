// pages/orgs/index.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import LeftSidebar from "../../components/LeftSidebar";

const Navbar = dynamic(() => import("../../components/NavbarIcons"), {
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

type KindFilter = "all" | "company" | "research_group";

function OrgsRightSidebar({ showCreateCta }: { showCreateCta: boolean }) {
  return (
    <aside
      className="layout-right sticky-col"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div className="hero-tiles hero-tiles-vertical">
        {showCreateCta && (
          <div className="hero-tile">
            <div className="hero-tile-inner">
              <div className="tile-label">Action</div>
              <div className="tile-title-row">
                <div className="tile-title">Create your org page</div>
                <div className="tile-icon-orbit">🏢</div>
              </div>
              <p className="tile-text">
                Add your company or research group to the directory.
              </p>
              <Link href="/orgs/create" className="tile-cta" style={{ textDecoration: "none" }}>
                Create organization <span>›</span>
              </Link>
            </div>
          </div>
        )}

        <div className="hero-tile">
          <div className="hero-tile-inner">
            <div className="tile-label">Highlighted</div>
            <div className="tile-title-row">
              <div className="tile-title">Quantum org of the week</div>
              <div className="tile-icon-orbit">✨</div>
            </div>
            <p className="tile-text">
              A featured company or group from the ecosystem directory.
            </p>
            <div className="tile-cta">
              View spotlight <span>›</span>
            </div>
          </div>
        </div>

        <div className="hero-tile">
          <div className="hero-tile-inner">
            <div className="tile-label">Tip</div>
            <div className="tile-title-row">
              <div className="tile-title">Make your page searchable</div>
              <div className="tile-icon-orbit">🔎</div>
            </div>
            <p className="tile-text">
              Use a clear tagline + focus areas so people can discover you fast.
            </p>
            <div className="tile-cta">
              Best practices <span>›</span>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: "auto",
          paddingTop: 12,
          borderTop: "1px solid rgba(148,163,184,0.18)",
          fontSize: 12,
          color: "rgba(148,163,184,0.9)",
          textAlign: "right",
        }}
      >
        © 2025 Quantum5ocial
      </div>
    </aside>
  );
}

export default function OrganizationsDirectoryPage() {
  const { user } = useSupabaseUser();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");

  useEffect(() => {
    const loadOrgs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) setOrgs(data as Org[]);
      else {
        setOrgs([]);
        if (error) console.error("Error loading organizations", error);
      }

      setLoading(false);
    };

    loadOrgs();
  }, []);

  const filteredOrgs = useMemo(() => {
    const term = search.trim().toLowerCase();
    return orgs.filter((org) => {
      if (kindFilter !== "all" && org.kind !== kindFilter) return false;
      if (!term) return true;

      const haystack = [
        org.name,
        org.institution,
        org.industry,
        org.focus_areas,
        org.tagline,
        org.city,
        org.country,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [orgs, search, kindFilter]);

  const formatMeta = (org: Org) => {
    const bits: string[] = [];

    if (org.kind === "company") {
      if (org.industry) bits.push(org.industry);
      if (org.company_type) bits.push(org.company_type);
    } else {
      if (org.institution) bits.push(org.institution);
      if (org.department) bits.push(org.department);
    }

    if (org.city && org.country) bits.push(`${org.city}, ${org.country}`);
    else if (org.country) bits.push(org.country);

    return bits.join(" · ");
  };

  const formatKindLabel = (org: Org) =>
    org.kind === "company" ? "Company" : "Research group";

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* LEFT */}
          <LeftSidebar />

          {/* MIDDLE */}
          <section className="layout-main">
            <section className="section">
              <div className="section-header">
                <div>
                  <div className="section-title">Organizations</div>
                  <div className="section-sub" style={{ maxWidth: 680 }}>
                    Explore companies, vendors, labs, and research groups active in
                    quantum technologies.
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {!loading
                    ? `${filteredOrgs.length} result${filteredOrgs.length === 1 ? "" : "s"}`
                    : ""}
                </div>
              </div>

              {/* Controls (keep in middle so no state needed on right) */}
              <section
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  alignItems: "center",
                  marginTop: 16,
                  marginBottom: 18,
                }}
              >
                <div style={{ flex: 1, minWidth: 240 }}>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name, institution, industry, or focus area…"
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.6)",
                      backgroundColor: "rgba(15,23,42,0.9)",
                      color: "#e5e7eb",
                      fontSize: 14,
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    padding: 2,
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.5)",
                    backgroundColor: "rgba(15,23,42,0.9)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setKindFilter("all")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: "none",
                      fontSize: 13,
                      cursor: "pointer",
                      background:
                        kindFilter === "all"
                          ? "linear-gradient(135deg,#3bc7f3,#8468ff)"
                          : "transparent",
                      color: kindFilter === "all" ? "#0f172a" : "#e5e7eb",
                    }}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setKindFilter("company")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: "none",
                      fontSize: 13,
                      cursor: "pointer",
                      background:
                        kindFilter === "company"
                          ? "linear-gradient(135deg,#3bc7f3,#8468ff)"
                          : "transparent",
                      color: kindFilter === "company" ? "#0f172a" : "#e5e7eb",
                    }}
                  >
                    Companies
                  </button>
                  <button
                    type="button"
                    onClick={() => setKindFilter("research_group")}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      border: "none",
                      fontSize: 13,
                      cursor: "pointer",
                      background:
                        kindFilter === "research_group"
                          ? "linear-gradient(135deg,#3bc7f3,#8468ff)"
                          : "transparent",
                      color:
                        kindFilter === "research_group" ? "#0f172a" : "#e5e7eb",
                    }}
                  >
                    Research groups
                  </button>
                </div>
              </section>

              {/* List */}
              {loading ? (
                <div className="products-status">Loading organizations…</div>
              ) : filteredOrgs.length === 0 ? (
                <div className="products-empty">
                  No organizations found. Try a different search or filter.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 16,
                  }}
                >
                  {filteredOrgs.map((org) => {
                    const meta = formatMeta(org);
                    const kindLabel = formatKindLabel(org);
                    const firstLetter = org.name.charAt(0).toUpperCase();

                    return (
                      <Link
                        key={org.id}
                        href={`/orgs/${org.slug}`}
                        className="org-card-link"
                        style={{ textDecoration: "none", color: "inherit" }}
                      >
                        <div
                          className="hover-tile"
                          style={{
                            borderRadius: 18,
                            padding: 18,
                            border: "1px solid rgba(148,163,184,0.28)",
                            background:
                              "linear-gradient(135deg, rgba(15,23,42,0.9), rgba(15,23,42,0.96))",
                            boxShadow: "0 18px 40px rgba(15,23,42,0.55)",
                            display: "flex",
                            gap: 14,
                            alignItems: "flex-start",
                            transition:
                              "transform 120ms ease-out, box-shadow 150ms ease-out, border-color 120ms ease-out",
                          }}
                        >
                          <div
                            style={{
                              width: 52,
                              height: 52,
                              borderRadius: 16,
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
                              fontSize: 20,
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

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                marginBottom: 4,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 16,
                                  fontWeight: 500,
                                  color: "#e5e7eb",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {org.name}
                              </div>
                              <span
                                style={{
                                  fontSize: 11,
                                  borderRadius: 999,
                                  padding: "3px 8px",
                                  border: "1px solid rgba(148,163,184,0.7)",
                                  color: "rgba(226,232,240,0.95)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {kindLabel}
                              </span>
                            </div>

                            {meta && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "rgba(148,163,184,0.95)",
                                  marginBottom: 4,
                                }}
                              >
                                {meta}
                              </div>
                            )}

                            {org.tagline && (
                              <div
                                style={{
                                  fontSize: 13,
                                  color: "rgba(209,213,219,0.95)",
                                }}
                              >
                                {org.tagline.length > 90
                                  ? org.tagline.slice(0, 87) + "…"
                                  : org.tagline}
                              </div>
                            )}

                            {!org.tagline && org.focus_areas && (
                              <div
                                style={{
                                  fontSize: 12.5,
                                  color: "rgba(209,213,219,0.9)",
                                }}
                              >
                                {org.focus_areas.length > 90
                                  ? org.focus_areas.slice(0, 87) + "…"
                                  : org.focus_areas}
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </section>

          {/* RIGHT */}
          <OrgsRightSidebar showCreateCta={!!user} />
        </main>
      </div>
    </>
  );
}
