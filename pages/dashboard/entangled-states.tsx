// pages/dashboard/entangled-states.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/NavbarIcons"), {
  ssr: false,
});

// Sidebar profile summary (same shape as community.tsx)
type ProfileSummary = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  highest_education: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

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

// (Future) followed organizations strip
type FollowedOrg = {
  id: string;
  name: string | null;
  logo_url: string | null;
  short_description: string | null;
};

export default function EntangledStatesPage() {
  const { user } = useSupabaseUser();

  // main data
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // followed orgs (for top strip)
  const [followedOrgs, setFollowedOrgs] = useState<FollowedOrg[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  // sidebar profile + counters
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [savedProductsCount, setSavedProductsCount] = useState(0);
  const [entangledCount, setEntangledCount] = useState(0);

  // ----- load sidebar profile -----
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfileSummary(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          avatar_url,
          role,
          highest_education,
          affiliation,
          country,
          city
        `)
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfileSummary(data as ProfileSummary);
      } else {
        setProfileSummary(null);
      }
    };

    loadProfile();
  }, [user]);

  // ----- sidebar counters -----
  useEffect(() => {
    if (!user) {
      setSavedJobsCount(0);
      setSavedProductsCount(0);
      setEntangledCount(0);
      return;
    }

    const loadCounts = async () => {
      const { count: jobsCount } = await supabase
        .from("saved_jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: productsCount } = await supabase
        .from("saved_products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      const { count: entCount } = await supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

      setSavedJobsCount(jobsCount || 0);
      setSavedProductsCount(productsCount || 0);
      setEntangledCount(entCount || 0);
    };

    loadCounts();
  }, [user]);

  // ----- load followed organizations (horizontal strip) -----
  useEffect(() => {
    const loadFollowedOrgs = async () => {
      if (!user) {
        setFollowedOrgs([]);
        return;
      }

      setOrgsLoading(true);

      // 🔧 Wire this to your real "org follows" table when ready.
      // For now we just leave it empty (UI will show a friendly message).
      try {
        // Example (adjust to your schema later):
        // const { data, error } = await supabase
        //   .from("organization_followers")
        //   .select("organizations(id, name, logo_url, short_description)")
        //   .eq("user_id", user.id);
        //
        // if (!error && data) {
        //   const orgs: FollowedOrg[] = data
        //     .map((row: any) => row.organizations)
        //     .filter(Boolean);
        //   setFollowedOrgs(orgs);
        // } else {
        //   setFollowedOrgs([]);
        // }

        setFollowedOrgs([]); // placeholder
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
        setLoading(false);
        setEntangledCount(0);
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

      // If somehow nothing valid, stop here
      if (otherIds.length === 0) {
        setProfiles([]);
        setEntangledCount(0);
        setLoading(false);
        return;
      }

      const { data: profData, error: profError } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, affiliation, current_org, role, describes_you"
        )
        .in("id", otherIds);

      if (profError) {
        console.error(profError);
        setErrorMsg("Could not load connected profiles.");
        setProfiles([]);
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

  // Sidebar helpers
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarFullName =
    profileSummary?.full_name || fallbackName || "Your profile";

  const avatarUrl = profileSummary?.avatar_url || null;
  const educationLevel = profileSummary?.highest_education || "";
  const describesYou = profileSummary?.role || "";
  const affiliation =
    profileSummary?.affiliation ||
    [profileSummary?.city, profileSummary?.country]
      .filter(Boolean)
      .join(", ") ||
    "";

  const hasProfileExtraInfo =
    Boolean(educationLevel) || Boolean(describesYou) || Boolean(affiliation);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* ========== LEFT SIDEBAR ========== */}
          <aside
            className="layout-left sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
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
                      alt={sidebarFullName}
                      className="profile-sidebar-avatar"
                    />
                  ) : (
                    <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                      {sidebarFullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-sidebar-name">{sidebarFullName}</div>
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

            {/* Dashboard counters */}
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

            {/* Social + Brand */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 16,
                borderTop: "1px solid rgba(148,163,184,0.18)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", gap: 12, fontSize: 18 }}>
                <a
                  href="mailto:info@quantum5ocial.com"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  ✉️
                </a>
                <a
                  href="#"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  𝕏
                </a>
                <a
                  href="#"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  🐱
                </a>
              </div>

              <div
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <img
                  src="/Q5_white_bg.png"
                  alt="Quantum5ocial logo"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    objectFit: "contain",
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Quantum5ocial
                </span>
              </div>
            </div>
          </aside>

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
                        minHeight: 140,
                      }}
                    >
                      {followedOrgs.map((org) => (
                        <div
                          key={org.id}
                          className="card"
                          style={{
                            minWidth: 220,
                            padding: 12,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                            }}
                          >
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 12,
                                overflow: "hidden",
                                border:
                                  "1px solid rgba(148,163,184,0.6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background:
                                  "linear-gradient(135deg,#3bc7f3,#8468ff)",
                                color: "#0f172a",
                                fontWeight: 700,
                              }}
                            >
                              {org.logo_url ? (
                                <img
                                  src={org.logo_url}
                                  alt={org.name || "Org"}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                (org.name || "?")
                                  .charAt(0)
                                  .toUpperCase()
                              )}
                            </div>
                            <div
                              style={{
                                fontWeight: 600,
                                fontSize: 14,
                              }}
                            >
                              {org.name || "Quantum organization"}
                            </div>
                          </div>
                          {org.short_description && (
                            <p
                              style={{
                                marginTop: 8,
                                fontSize: 12,
                                opacity: 0.8,
                              }}
                            >
                              {org.short_description}
                            </p>
                          )}
                        </div>
                      ))}
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
                      gridTemplateColumns:
                        "repeat(2,minmax(0,1fr))",
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
                        <div
                          key={p.id}
                          className="card"
                          style={{
                            padding: 14,
                            minHeight: 160,
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
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
                    A curated job or role from the Quantum Jobs
                    Universe.
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
                    A selected hardware, software, or service from the
                    Quantum Products Lab.
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
