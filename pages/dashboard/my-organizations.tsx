// pages/dashboard/my-organizations.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import LeftSidebar from "../../components/LeftSidebar";

type OrgKind = "company" | "research_group";

type Org = {
  id: string;
  kind: OrgKind;
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  industry?: string | null;
  company_type?: string | null;
  institution?: string | null;
  department?: string | null;
  size_label?: string | null;
};

function DashboardRightSidebar() {
  return (
    <aside
      className="layout-right sticky-col"
      style={{ display: "flex", flexDirection: "column" }}
    >
      <div className="hero-tiles hero-tiles-vertical">
        <div className="hero-tile">
          <div className="hero-tile-inner">
            <div className="tile-label">Dashboard</div>
            <div className="tile-title-row">
              <div className="tile-title">Create organizations</div>
              <div className="tile-icon-orbit">🏢</div>
            </div>
            <p className="tile-text">
              Organization pages can be linked from jobs, products, and your
              community profile.
            </p>
            <Link href="/orgs/create" className="tile-cta" style={{ display: "inline-flex" }}>
              + Create new <span>›</span>
            </Link>
          </div>
        </div>

        <div className="hero-tile">
          <div className="hero-tile-inner">
            <div className="tile-label">Tip</div>
            <div className="tile-title-row">
              <div className="tile-title">Keep it discoverable</div>
              <div className="tile-icon-orbit">✨</div>
            </div>
            <p className="tile-text">
              Add a clear tagline + location so people can recognize you fast.
            </p>
            <div className="tile-cta">
              Optimize profile <span>›</span>
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

export default function MyOrganizationsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // redirect to auth if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard/my-organizations");
    }
  }, [user, loading, router]);

  // load organizations created by this user
  useEffect(() => {
    const loadMyOrgs = async () => {
      if (loading) return;

      if (!user) {
        setOrgs([]);
        setLoadingOrgs(false);
        return;
      }

      setLoadingOrgs(true);

      const { data, error } = await supabase
        .from("organizations")
        .select(
          "id, kind, name, slug, tagline, logo_url, city, country, industry, company_type, institution, department, size_label"
        )
        .eq("created_by", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrgs(data as Org[]);
      } else {
        setOrgs([]);
        if (error) console.error("Error loading my organizations", error);
      }

      setLoadingOrgs(false);
    };

    loadMyOrgs();
  }, [user, loading]);

  const formatKindLabel = (kind: Org["kind"]) =>
    kind === "company" ? "Company" : "Research group";

  const formatLocation = (org: Org) =>
    [org.city, org.country].filter(Boolean).join(", ");

  const headerSubtitle = useMemo(() => {
    if (loadingOrgs) return "Loading your organization pages…";
    return `${orgs.length} organization${orgs.length === 1 ? "" : "s"} created`;
  }, [loadingOrgs, orgs.length]);

  if (!user && !loading) return null;

  return (
    <section className="layout-main">
      <section className="section">
        <div className="section-header">
          <div>
            <div className="section-title">My organizations</div>
            <div className="section-sub">
              Manage the organization profiles you’ve created on Quantum5ocial.
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {headerSubtitle}
            </div>
            <Link href="/orgs/create" className="nav-cta">
              + Create
            </Link>
          </div>
        </div>

        {loadingOrgs ? (
          <div className="products-status">Loading your organizations…</div>
        ) : orgs.length === 0 ? (
          <div className="products-empty">
            You haven&apos;t created any organization pages yet.{" "}
            <Link href="/orgs/create" className="section-link">
              Create your first organization
            </Link>{" "}
            to represent your company or research group.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: 16,
            }}
          >
            {orgs.map((org) => {
              const firstLetter = org.name.charAt(0).toUpperCase();
              const location = formatLocation(org);

              const editHref =
                org.kind === "company"
                  ? `/orgs/create/company?edit=${encodeURIComponent(org.slug)}`
                  : `/orgs/create/research-group?edit=${encodeURIComponent(
                      org.slug
                    )}`;

              return (
                <div
                  key={org.id}
                  className="card"
                  style={{
                    borderRadius: 18,
                    padding: 18,
                    display: "flex",
                    gap: 14,
                    alignItems: "flex-start",
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
                      background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
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
                        justifyContent: "space-between",
                        alignItems: "center",
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
                        {formatKindLabel(org.kind)}
                      </span>
                    </div>

                    {location && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(148,163,184,0.95)",
                          marginBottom: 4,
                        }}
                      >
                        {location}
                      </div>
                    )}

                    {org.tagline && (
                      <div
                        style={{
                          fontSize: 13,
                          color: "rgba(209,213,219,0.95)",
                          marginBottom: 8,
                        }}
                      >
                        {org.tagline.length > 90
                          ? org.tagline.slice(0, 87) + "…"
                          : org.tagline}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 10, marginTop: 6, fontSize: 13 }}>
                      <Link href={`/orgs/${org.slug}`} className="section-link">
                        View profile →
                      </Link>
                      <Link
                        href={editHref}
                        style={{ color: "#c4b5fd", textDecoration: "none" }}
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
}

// ✅ AppLayout config (Jobs/Products/Community-style 3 columns)
(MyOrganizationsPage as any).layoutProps = {
  variant: "three",
  left: <LeftSidebar />,
  right: <DashboardRightSidebar />,
};
