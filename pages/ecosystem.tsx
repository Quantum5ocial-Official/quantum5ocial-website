// pages/ecosystem.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

// Sidebar profile summary (same flavor as community / entangled-states)
type ProfileSummary = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  highest_education: string | null;
  describes_you: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

type EntangledProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  affiliation: string | null;
  current_org: string | null;
  role: string | null;
  describes_you: string | null;
};

type EcosystemOrg = {
  id: string;
  name: string;
  slug: string;
  kind: "company" | "research_group";
  logo_url: string | null;
  tagline: string | null;
  city: string | null;
  country: string | null;
  industry: string | null;
  focus_areas: string | null;
};

export default function MyEcosystemPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  // Sidebar
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [savedProductsCount, setSavedProductsCount] = useState(0);
  const [entangledCount, setEntangledCount] = useState(0);

  // Main content
  const [entangledProfiles, setEntangledProfiles] = useState<
    EntangledProfile[]
  >([]);
  const [followedOrgs, setFollowedOrgs] = useState<EcosystemOrg[]>([]);

  const [mainLoading, setMainLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/ecosystem");
    }
  }, [loading, user, router]);

  // Load sidebar profile + counters
  useEffect(() => {
    if (!user) {
      setProfileSummary(null);
      setSavedJobsCount(0);
      setSavedProductsCount(0);
      setEntangledCount(0);
      return;
    }

    const loadSidebar = async () => {
      try {
        // profile
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, highest_education, describes_you, affiliation, country, city"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (!profErr && prof) {
          setProfileSummary(prof as ProfileSummary);
        } else {
          setProfileSummary(null);
        }

        // saved jobs
        const { data: savedJobRows, error: savedJobErr } = await supabase
          .from("saved_jobs")
          .select("id")
          .eq("user_id", user.id);

        if (!savedJobErr && savedJobRows) {
          setSavedJobsCount(savedJobRows.length);
        } else {
          setSavedJobsCount(0);
        }

        // saved products
        const { data: savedProdRows, error: savedProdErr } = await supabase
          .from("saved_products")
          .select("id")
          .eq("user_id", user.id);

        if (!savedProdErr && savedProdRows) {
          setSavedProductsCount(savedProdRows.length);
        } else {
          setSavedProductsCount(0);
        }

        // entangled count
        const { data: connRows, error: connErr } = await supabase
          .from("connections")
          .select("user_id, target_user_id, status")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (!connErr && connRows && connRows.length > 0) {
          const otherIds = Array.from(
            new Set(
              connRows.map((c: any) =>
                c.user_id === user.id ? c.target_user_id : c.user_id
              )
            )
          );
          setEntangledCount(otherIds.length);
        } else {
          setEntangledCount(0);
        }
      } catch (e) {
        console.error("Error loading ecosystem sidebar", e);
        setProfileSummary(null);
        setSavedJobsCount(0);
        setSavedProductsCount(0);
        setEntangledCount(0);
      }
    };

    loadSidebar();
  }, [user]);

  // Load main ecosystem content
  useEffect(() => {
    if (!user) {
      setMainLoading(false);
      setEntangledProfiles([]);
      setFollowedOrgs([]);
      return;
    }

    const loadEcosystem = async () => {
      setMainLoading(true);
      setErrorMsg(null);

      try {
        // 1) Entangled people
        const { data: connData, error: connError } = await supabase
          .from("connections")
          .select("user_id, target_user_id, status")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (connError) throw connError;

        let entangledList: EntangledProfile[] = [];
        if (connData && connData.length > 0) {
          const otherIds = Array.from(
            new Set(
              connData.map((c: any) =>
                c.user_id === user.id ? c.target_user_id : c.user_id
              )
            )
          );

          if (otherIds.length > 0) {
            const { data: profData, error: profError } = await supabase
              .from("profiles")
              .select(
                "id, full_name, avatar_url, affiliation, current_org, role, describes_you"
              )
              .in("id", otherIds);

            if (profError) throw profError;
            entangledList = (profData || []) as EntangledProfile[];
          }
        }

        setEntangledProfiles(entangledList);

        // 2) Followed organizations
        const { data: followRows, error: followError } = await supabase
          .from("org_follows")
          .select("org_id")
          .eq("user_id", user.id);

        if (followError) throw followError;

        let orgList: EcosystemOrg[] = [];
        const orgIds = Array.from(
          new Set((followRows || []).map((r: any) => r.org_id))
        );

        if (orgIds.length > 0) {
          const { data: orgData, error: orgErr } = await supabase
            .from("organizations")
            .select(
              "id, name, slug, kind, logo_url, tagline, city, country, industry, focus_areas"
            )
            .in("id", orgIds);

          if (orgErr) throw orgErr;

          orgList = (orgData || []) as EcosystemOrg[];
        }

        setFollowedOrgs(orgList);
      } catch (e) {
        console.error("Error loading ecosystem", e);
        setErrorMsg("Could not load your ecosystem. Please try again later.");
        setEntangledProfiles([]);
        setFollowedOrgs([]);
      } finally {
        setMainLoading(false);
      }
    };

    loadEcosystem();
  }, [user]);

  if (!user && !loading) return null;

  const sidebarName = profileSummary?.full_name || "Quantum explorer";
  const avatarUrl = profileSummary?.avatar_url || null;
  const educationLevel = profileSummary?.highest_education || "";
  const describesYou = profileSummary?.describes_you || "";
  const affiliation =
    profileSummary?.affiliation ||
    [profileSummary?.city, profileSummary?.country]
      .filter(Boolean)
      .join(", ") ||
    "";

  const hasProfileExtraInfo =
    Boolean(educationLevel) || Boolean(describesYou) || Boolean(affiliation);

  const entangledTotal = entangledProfiles.length;
  const orgsTotal = followedOrgs.length;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* LEFT SIDEBAR */}
          <aside
            className="layout-left sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {/* Profile card */}
            <Link
              href="/profile"
              className="sidebar-card profile-sidebar-card"
              style={{
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
              <div className="profile-sidebar-header">
                <div className="profile-sidebar-avatar-wrapper">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={sidebarName}
                      className="profile-sidebar-avatar"
                    />
                  ) : (
                    <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                      {sidebarName
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-sidebar-title-block">
                  <div className="profile-sidebar-name">{sidebarName}</div>
                  {profileSummary?.role && (
                    <div className="profile-sidebar-role">
                      {profileSummary.role}
                    </div>
                  )}
                </div>
              </div>

              {hasProfileExtraInfo && (
                <div className="profile-sidebar-info-block">
                  {educationLevel && (
                    <div className="profile-sidebar-info-value">
                      {educationLevel}
                    </div>
                  )}
                  {describesYou && (
                    <div
                      className="profile-sidebar-info-value"
                      style={{ marginTop: 4 }}
                    >
                      {describesYou}
                    </div>
                  )}
                  {affiliation && (
                    <div
                      className="profile-sidebar-info-value"
                      style={{ marginTop: 4 }}
                    >
                      {affiliation}
                    </div>
                  )}
                </div>
              )}
            </Link>

            {/* Quick dashboard */}
            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>
              <div className="dashboard-sidebar-links">
                <Link
                  href="/dashboard/entangled-states"
                  className="dashboard-sidebar-link"
                >
                  Entangled states ({entangledCount})
                </Link>
                <Link
                  href="/dashboard/saved-jobs"
                  className="dashboard-sidebar-link"
                >
                  Saved jobs ({savedJobsCount})
                </Link>
                <Link
                  href="/dashboard/saved-products"
                  className="dashboard-sidebar-link"
                >
                  Saved products ({savedProductsCount})
                </Link>
              </div>
            </div>
          </aside>

          {/* CENTER CONTENT */}
          <section className="layout-center">
            {/* HERO CARD */}
            <div
              className="card"
              style={{
                padding: 20,
                marginBottom: 24,
                background:
                  "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), rgba(15,23,42,0.95))",
                border: "1px solid rgba(148,163,184,0.35)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 16,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <div className="section-title">My ecosystem</div>
                  <div className="section-sub">
                    A snapshot of your quantum network – the people you&apos;re
                    entangled with and the organizations you follow.
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    <span className="pill pill-soft">
                      🧬 Entangled members:{" "}
                      <strong style={{ marginLeft: 4 }}>
                        {entangledTotal}
                      </strong>
                    </span>
                    <span className="pill pill-soft">
                      🏢 Followed organizations:{" "}
                      <strong style={{ marginLeft: 4 }}>{orgsTotal}</strong>
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 8,
                    minWidth: 160,
                  }}
                >
                  <Link
                    href="/community"
                    className="section-link"
                    style={{ fontSize: 13 }}
                  >
                    Explore community →
                  </Link>
                  <Link
                    href="/orgs"
                    className="section-link"
                    style={{ fontSize: 13 }}
                  >
                    Discover organizations →
                  </Link>
                </div>
              </div>
            </div>

            {mainLoading ? (
              <p className="profile-muted">Loading your ecosystem…</p>
            ) : errorMsg ? (
              <p className="profile-muted">{errorMsg}</p>
            ) : (
              <>
                {/* Entangled people */}
                <div style={{ marginBottom: 32 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 8,
                    }}
                  >
                    <div className="section-subtitle">
                      🧬 Entangled members
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: "rgba(148,163,184,0.9)",
                          fontWeight: 400,
                        }}
                      >
                        {entangledTotal} connection
                        {entangledTotal === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  {entangledProfiles.length === 0 ? (
                    <div className="products-empty">
                      You have no entangled states yet. Visit the{" "}
                      <Link href="/community" className="section-link">
                        community
                      </Link>{" "}
                      and start connecting with quantum people.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 16,
                      }}
                    >
                      {entangledProfiles.map((p) => {
                        const name = p.full_name || "Quantum member";
                        const meta = [
                          p.role || p.describes_you || null,
                          p.affiliation || p.current_org || null,
                        ]
                          .filter(Boolean)
                          .join(" · ");

                        return (
                          <div
                            key={p.id}
                            className="card"
                            style={{
                              padding: 14,
                              minHeight: 150,
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              border: "1px solid rgba(148,163,184,0.28)",
                              background:
                                "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(30,64,175,0.45))",
                            }}
                          >
                            <div
                              className="card-inner"
                              style={{ display: "flex", gap: 14 }}
                            >
                              <div
                                style={{
                                  width: 44,
                                  height: 44,
                                  borderRadius: "999px",
                                  background:
                                    "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  overflow: "hidden",
                                  flexShrink: 0,
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
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "white",
                                      fontSize: 16,
                                    }}
                                  >
                                    {name
                                      .split(" ")
                                      .map((part) => part[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 15,
                                    marginBottom: 4,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {name}
                                </div>
                                {meta && (
                                  <div
                                    style={{
                                      fontSize: 13,
                                      color: "rgba(191,219,254,0.95)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {meta}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginTop: 12,
                              }}
                            >
                              <Link
                                href={`/profile/${p.id}`}
                                className="section-link"
                                style={{ fontSize: 12 }}
                              >
                                View profile →
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Followed orgs */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      marginBottom: 8,
                    }}
                  >
                    <div className="section-subtitle">
                      🏢 Followed organizations
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          color: "rgba(148,163,184,0.9)",
                          fontWeight: 400,
                        }}
                      >
                        {orgsTotal} organization
                        {orgsTotal === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>

                  {followedOrgs.length === 0 ? (
                    <div className="products-empty">
                      You&apos;re not following any organizations yet. Browse
                      the{" "}
                      <Link href="/orgs" className="section-link">
                        organizations directory
                      </Link>{" "}
                      and follow the ones you care about.
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: 16,
                      }}
                    >
                      {followedOrgs.map((org) => {
                        const subtitle =
                          org.kind === "company"
                            ? org.industry || "Quantum company"
                            : org.focus_areas || "Quantum research group";
                        const location = [org.city, org.country]
                          .filter(Boolean)
                          .join(", ");

                        return (
                          <Link
                            key={org.id}
                            href={`/orgs/${org.slug}`}
                            className="card"
                            style={{
                              padding: 14,
                              textDecoration: "none",
                              color: "inherit",
                              border: "1px solid rgba(148,163,184,0.28)",
                              background:
                                "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(147,51,234,0.4))",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: 14,
                                alignItems: "center",
                              }}
                            >
                              <div
                                style={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: 10,
                                  background:
                                    "radial-gradient(circle at 0% 0%, #a855f7, #0f172a)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  overflow: "hidden",
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
                                    }}
                                  />
                                ) : (
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "white",
                                      fontSize: 16,
                                    }}
                                  >
                                    {org.name
                                      .split(" ")
                                      .map((p) => p[0])
                                      .join("")
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                )}
                              </div>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 15,
                                    marginBottom: 2,
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {org.name}
                                </div>
                                {subtitle && (
                                  <div
                                    style={{
                                      fontSize: 13,
                                      color: "rgba(191,219,254,0.95)",
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                    }}
                                  >
                                    {subtitle}
                                  </div>
                                )}
                                {location && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "rgba(148,163,184,0.9)",
                                      marginTop: 2,
                                    }}
                                  >
                                    {location}
                                  </div>
                                )}
                              </div>
                            </div>

                            {org.tagline && (
                              <div
                                style={{
                                  marginTop: 10,
                                  fontSize: 12,
                                  color: "rgba(148,163,184,0.95)",
                                }}
                              >
                                {org.tagline}
                              </div>
                            )}

                            <div
                              style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                marginTop: 10,
                              }}
                            >
                              <span
                                className="section-link"
                                style={{ fontSize: 12 }}
                              >
                                View organization →
                              </span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </section>

          {/* RIGHT COLUMN – reserved for future suggestions / feed */}
          <aside className="layout-right" />
        </main>
      </div>
    </>
  );
}
