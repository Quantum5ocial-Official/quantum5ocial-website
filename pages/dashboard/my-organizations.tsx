// pages/dashboard/my-organizations.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), {
  ssr: false,
});

type Org = {
  id: string;
  kind: "company" | "research_group";
  name: string;
  slug: string;
  tagline: string | null;
  logo_url: string | null;
  city: string | null;
  country: string | null;
};

export default function MyOrganizationsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      // not logged in – send to auth
      router.push("/auth");
    }
  }, [user, loading, router]);

  useEffect(() => {
    const loadMyOrgs = async () => {
      if (!user) {
        setOrgs([]);
        setLoadingOrgs(false);
        return;
      }

      setLoadingOrgs(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("id, kind, name, slug, tagline, logo_url, city, country")
        .eq("owner_id", user.id)
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
  }, [user]);

  const formatKindLabel = (kind: Org["kind"]) =>
    kind === "company" ? "Company" : "Research group";

  const formatLocation = (org: Org) =>
    [org.city, org.country].filter(Boolean).join(", ");

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
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 16,
              marginBottom: 20,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  letterSpacing: 0.06,
                  textTransform: "uppercase",
                  color: "rgba(148,163,184,0.9)",
                  marginBottom: 4,
                }}
              >
                Dashboard
              </div>
              <h1
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  marginBottom: 6,
                }}
              >
                My organizations
              </h1>
              <p
                style={{
                  fontSize: 15,
                  opacity: 0.85,
                  maxWidth: 600,
                }}
              >
                Manage the organization profiles you’ve created on
                Quantum5ocial. These pages can be linked from jobs, products,
                and your community profile in the future.
              </p>
            </div>

            <Link
              href="/orgs/create"
              className="nav-cta"
              style={{ alignSelf: "center", whiteSpace: "nowrap" }}
            >
              + Create new organization
            </Link>
          </header>

          <section>
            {loadingOrgs ? (
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(209,213,219,0.9)",
                }}
              >
                Loading your organizations…
              </div>
            ) : orgs.length === 0 ? (
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(209,213,219,0.9)",
                  padding: 16,
                  borderRadius: 16,
                  border: "1px solid rgba(148,163,184,0.3)",
                  background: "rgba(15,23,42,0.9)",
                }}
              >
                You haven&apos;t created any organization pages yet.{" "}
                <Link
                  href="/orgs/create"
                  style={{
                    color: "#7dd3fc",
                    textDecoration: "underline",
                  }}
                >
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

                  return (
                    <div
                      key={org.id}
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
                              border:
                                "1px solid rgba(148,163,184,0.7)",
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

                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            marginTop: 6,
                            fontSize: 13,
                          }}
                        >
                          <Link
                            href={`/orgs/${org.slug}`}
                            style={{
                              color: "#7dd3fc",
                              textDecoration: "none",
                            }}
                          >
                            View profile →
                          </Link>
                          {/* Placeholder for future edit page */}
                          {/* <Link href={`/orgs/edit/${org.id}`}>Edit</Link> */}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
