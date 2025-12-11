// pages/dashboard/entangled-states.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import LeftSidebar from "../../components/LeftSidebar";

const Navbar = dynamic(() => import("../../components/NavbarIcons"), {
  ssr: false,
});

// Connection profile card
type Profile = {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
  affiliation?: string | null;
  current_org?: string | null;
  role?: string | null;
  describes_you?: string | null;
};

// Followed organizations strip
type FollowedOrg = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  kind: "company" | "research_group";
  tagline: string | null;
  industry: string | null;
  focus_areas: string | null;
  institution: string | null;
  city: string | null;
  country: string | null;
};

export default function EntangledStatesPage() {
  const { user } = useSupabaseUser();

  // main data
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [entangledCount, setEntangledCount] = useState(0);

  // followed orgs (for top strip)
  const [followedOrgs, setFollowedOrgs] = useState<FollowedOrg[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  // ----- load followed organizations (horizontal strip) -----
  useEffect(() => {
    const loadFollowedOrgs = async () => {
      if (!user) {
        setFollowedOrgs([]);
        return;
      }

      setOrgsLoading(true);

      try {
        // 1) which org_ids does this user follow?
        const { data: followRows, error: followErr } = await supabase
          .from("org_follows")
          .select("org_id")
          .eq("user_id", user.id);

        if (followErr) {
          console.error("Error loading followed orgs", followErr);
          setFollowedOrgs([]);
          return;
        }

        const orgIds = (followRows || []).map((r: any) => r.org_id);
        if (orgIds.length === 0) {
          setFollowedOrgs([]);
          return;
        }

        // 2) load org info for those ids
        const { data: orgRows, error: orgErr } = await supabase
          .from("organizations")
          .select(
            "id, name, slug, logo_url, kind, tagline, industry, focus_areas, institution, city, country"
          )
          .in("id", orgIds)
          .eq("is_active", true);

        if (orgErr) {
          console.error(
            "Error loading organizations for followed strip",
            orgErr
          );
          setFollowedOrgs([]);
          return;
        }

        const orgs: FollowedOrg[] = (orgRows || []).map((o: any) => ({
          id: o.id,
          slug: o.slug,
          name: o.name,
          logo_url: o.logo_url,
          kind: o.kind,
          tagline: o.tagline,
          industry: o.industry,
          focus_areas: o.focus_areas,
          institution: o.institution,
          city: o.city,
          country: o.country,
        }));

        setFollowedOrgs(orgs);
      } catch (e) {
        console.error("Unexpected error loading followed orgs", e);
        setFollowedOrgs([]);
      } finally {
        setOrgsLoading(false);
      }
    };

    loadFollowedOrgs();
  }, [user]);

  // ----- load entangled states (connected members) -----
  useEffect(() => {
    const loadConnections = async () => {
      if (!user) {
        setProfiles([]);
        setEntangledCount(0);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      const { data: connData, error: connError } = await supabase
        .from("connections")
        .select("id, user_id, target_user_id, status")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

      if (connError) {
        console.error(connError);
        setErrorMsg("Could not load your entangled states.");
        setProfiles([]);
        setEntangledCount(0);
        setLoading(false);
        return;
      }

      if (!connData || connData.length === 0) {
        setProfiles([]);
        setEntangledCount(0);
        setLoading(false);
        return;
      }

      const otherIds = Array.from(
        new Set(
          connData.map((c: any) =>
            c.user_id === user.id ? c.target_user_id : c.user_id
          )
        )
      ).filter(Boolean) as string[];

      if (otherIds.length === 0) {
        setProfiles([]);
        setEntangledCount(0);
        setLoading(false);
        return;
      }

      const { data: profData, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .in("id", otherIds);

      if (profError) {
        console.error(profError);
        setErrorMsg("Could not load connected profiles.");
        setProfiles([]);
        setEntangledCount(0);
        setLoading(false);
        return;
      }

      const list = (profData || []) as Profile[];
      setProfiles(list);
      setEntangledCount(list.length);
      setLoading(false);
    };

    loadConnections();
  }, [user]);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* LEFT SIDEBAR – same as notifications page */}
          <LeftSidebar />

          {/* ========== MIDDLE COLUMN ========== */}
          <section className="layout-main">
            <section className="section">
              <div className="section-header">
                <div>
                  <div className="section-title">Entangled states</div>
                  <div className="section-sub">
                    Your accepted connections in the Quantum Community.
                  </div>
                </div>
                <div
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.7)",
                    fontSize: 13,
                  }}
                >
                  Entangled states: <strong>{entangledCount}</strong>
                </div>
              </div>

              {/* ==== TOP: FOLLOWED ORGANIZATIONS (horizontal strip) ==== */}
              <section style={{ marginTop: 24 }}>
                <div className="section-sub" style={{ fontSize: 13 }}>
                  Organizations you follow
                </div>

                <div
                  style={{
                    marginTop: 12,
                    overflowX: "auto",
                    paddingBottom: 4,
                  }}
                >
                  {orgsLoading ? (
                    <div className="products-status">
                      Loading organizations…
                    </div>
                  ) : followedOrgs.length === 0 ? (
                    <div className="products-empty">
                      You are not following any organizations yet.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        minHeight: 170,
                        paddingRight: 8,
                      }}
                    >
                      {followedOrgs.map((org) => {
                        const location = [org.city, org.country]
                          .filter(Boolean)
                          .join(", ");

                        return (
                          <div
                            key={org.id}
                            className="card"
                            onClick={() => {
                              if (org.slug)
                                window.location.href = `/orgs/${org.slug}`;
                            }}
                            style={{
                              minWidth: 260,
                              padding: 14,
                              borderRadius: 14,
                              cursor: "pointer",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                            }}
                          >
                            <div style={{ display: "flex", gap: 12 }}>
                              {/* Logo */}
                              <div
                                style={{
                                  width: 52,
                                  height: 52,
                                  borderRadius: 14,
                                  overflow: "hidden",
                                  flexShrink: 0,
                                  border:
                                    "1px solid rgba(148,163,184,0.4)",
                                  background:
                                    "linear-gradient(135deg,#3bc7f3,#8468ff)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 18,
                                  fontWeight: 700,
                                  color: "#0f172a",
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
                                    }}
                                  />
                                ) : (
                                  org.name.charAt(0).toUpperCase()
                                )}
                              </div>

                              {/* Text */}
                              <div style={{ minWidth: 0 }}>
                                <div
                                  className="card-title"
                                  style={{
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {org.name}
                                </div>
                                <div
                                  className="card-meta"
                                  style={{
                                    fontSize: 12,
                                    lineHeight: 1.4,
                                  }}
                                >
                                  {org.kind === "company"
                                    ? org.industry || "Quantum company"
                                    : org.institution || "Research group"}
                                  {location ? ` · ${location}` : ""}
                                </div>
                              </div>
                            </div>

                            {/* Tagline / focus areas */}
                            {(org.tagline || org.focus_areas) && (
                              <div
                                style={{
                                  marginTop: 8,
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                  lineHeight: 1.45,
                                }}
                              >
                                {org.tagline || org.focus_areas}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </section>

              {/* ==== BOTTOM: ENTANGLED MEMBERS (grid) ==== */}
              <section style={{ marginTop: 28 }}>
                <div className="section-sub" style={{ fontSize: 13 }}>
                  Members you are entangled with
                </div>

                {loading ? (
                  <div className="products-status">
                    Loading entangled states…
                  </div>
                ) : entangledCount === 0 ? (
                  <div className="products-empty">
                    You have no entangled states yet. Visit the{" "}
                    <Link href="/community" className="section-link">
                      community
                    </Link>{" "}
                    and start connecting.
                  </div>
                ) : (
                  <div
                    style={{
                      marginTop: 12,
                      display: "grid",
                      gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                      gap: 16,
                    }}
                  >
                    {profiles.map((p) => {
                      const name = p.full_name || "Quantum member";
                      const meta = [
                        p.role || p.describes_you || null,
                        p.affiliation || p.current_org || null,
                      ]
                        .filter(Boolean)
                        .join(" · ");

                      return (
                        <Link
                          key={p.id}
                          href={`/profile/${p.id}`}
                          style={{
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          <div
                            className="card"
                            style={{
                              padding: 14,
                              minHeight: 160,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              cursor: "pointer",
                            }}
                          >
                            <div
                              className="card-inner"
                              style={{
                                display: "flex",
                                gap: 14,
                                alignItems: "flex-start",
                              }}
                            >
                              {/* Avatar */}
                              <div
                                style={{
                                  width: 52,
                                  height: 52,
                                  borderRadius: "999px",
                                  overflow: "hidden",
                                  border:
                                    "1px solid rgba(148,163,184,0.5)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  background:
                                    "linear-gradient(135deg,#3bc7f3,#8468ff)",
                                  color: "#fff",
                                  fontWeight: 600,
                                }}
                              >
                                {p.avatar_url ? (
                                  <img
                                    src={p.avatar_url}
                                    alt={name}
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                    }}
                                  />
                                ) : (
                                  name.charAt(0).toUpperCase()
                                )}
                              </div>

                              <div style={{ flex: 1 }}>
                                <div className="card-title">
                                  {name}
                                </div>
                                {meta && (
                                  <div
                                    className="card-meta"
                                    style={{ marginTop: 2 }}
                                  >
                                    {meta}
                                  </div>
                                )}
                                <div
                                  className="card-footer-text"
                                  style={{
                                    marginTop: 6,
                                    fontSize: 12,
                                  }}
                                >
                                  One of your entangled states in the
                                  Quantum Community.
                                </div>
                              </div>
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}

                {errorMsg && (
                  <p
                    style={{
                      marginTop: 12,
                      fontSize: 13,
                      color: "#f97373",
                    }}
                  >
                    {errorMsg}
                  </p>
                )}
              </section>
            </section>
          </section>

          {/* ========== RIGHT SIDEBAR ========== */}
          <aside
            className="layout-right sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div className="hero-tiles hero-tiles-vertical">
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">
                      Quantum roles spotlight
                    </div>
                    <div className="tile-icon-orbit">🧪</div>
                  </div>
                  <p className="tile-text">
                    A curated job or role from the Quantum Jobs Universe.
                  </p>
                  <div className="tile-cta">
                    Jobs spotlight <span>›</span>
                  </div>
                </div>
              </div>

              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">
                      Quantum product of the week
                    </div>
                    <div className="tile-icon-orbit">🔧</div>
                  </div>
                  <p className="tile-text">
                    A selected hardware, software, or service from the Quantum
                    Products Lab.
                  </p>
                  <div className="tile-cta">
                    Product spotlight <span>›</span>
                  </div>
                </div>
              </div>

              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">
                      Featured quantum talent
                    </div>
                    <div className="tile-icon-orbit">🤝</div>
                  </div>
                  <p className="tile-text">
                    A standout member of the quantum ecosystem.
                  </p>
                  <div className="tile-cta">
                    Talent spotlight <span>›</span>
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
        </main>
      </div>
    </>
  );
}
