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

// Sidebar profile summary
type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
};

// Minimal org summary for "My organization" tile
type MyOrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

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

// Followers of the organization
type FollowerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  highest_education: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

export default function OrganizationDetailPage() {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const { slug } = router.query;

  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Sidebar: profile + counts + myOrg
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [savedJobsCount, setSavedJobsCount] = useState<number | null>(null);
  const [savedProductsCount, setSavedProductsCount] = useState<number | null>(
    null
  );
  const [entangledCount, setEntangledCount] = useState<number | null>(null);

  const [myOrg, setMyOrg] = useState<MyOrgSummary | null>(null);
  const [loadingMyOrg, setLoadingMyOrg] = useState<boolean>(true);

    // Followers state
  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [loadingFollowers, setLoadingFollowers] = useState<boolean>(true);
  const [followersError, setFollowersError] = useState<string | null>(null);

  // 🔹 Follow state for this org
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  
  // === LOAD CURRENT ORG BY SLUG ===
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

  // Edit target – go to dedicated edit pages
  const editHref = useMemo(() => {
    if (!org) return "#";
    return org.kind === "company"
      ? `/orgs/edit/company/${org.slug}`
      : `/orgs/edit/research-group/${org.slug}`;
  }, [org]);

  // === LOAD FOLLOWERS FOR THIS ORG ===
  useEffect(() => {
    const loadFollowers = async () => {
      if (!org) {
        setFollowers([]);
        setFollowersCount(null);
        setLoadingFollowers(false);
        setFollowersError(null);
        return;
      }

      setLoadingFollowers(true);
      setFollowersError(null);

      try {
        // 1) Get follower user_ids from org_follows
        const { data: followRows, error: followErr } = await supabase
          .from("org_follows")
          .select("user_id")
          .eq("org_id", org.id);

        if (followErr) {
          console.error("Error loading org followers", followErr);
          setFollowers([]);
          setFollowersCount(0);
          setFollowersError("Could not load followers.");
          return;
        }

        const userIds = (followRows || []).map((r: any) => r.user_id);
        setFollowersCount(userIds.length);

        if (userIds.length === 0) {
          setFollowers([]);
          return;
        }

        // 2) Fetch profiles of the followers
        const { data: profileRows, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, highest_education, affiliation, country, city"
          )
          .in("id", userIds);

        if (profErr) {
          console.error("Error loading follower profiles", profErr);
          setFollowersError("Could not load follower profiles.");
          setFollowers([]);
          return;
        }

        setFollowers((profileRows || []) as FollowerProfile[]);
      } catch (e) {
        console.error("Unexpected error loading followers", e);
        setFollowersError("Could not load followers.");
        setFollowers([]);
        setFollowersCount(0);
      } finally {
        setLoadingFollowers(false);
      }
    };

    loadFollowers();
  }, [org]);

  // === SIDEBAR: LOAD CURRENT USER PROFILE ===
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfileSummary(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
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

  // === SIDEBAR: LOAD COUNTS (saved jobs/products + entangled states) ===
  useEffect(() => {
    const loadCounts = async () => {
      if (!user) {
        setSavedJobsCount(null);
        setSavedProductsCount(null);
        setEntangledCount(null);
        return;
      }

      try {
        const { data: savedJobsRows, error: savedJobsErr } = await supabase
          .from("saved_jobs")
          .select("job_id")
          .eq("user_id", user.id);

        if (!savedJobsErr && savedJobsRows) {
          setSavedJobsCount(savedJobsRows.length);
        } else {
          setSavedJobsCount(0);
        }

        const { data: savedProdRows, error: savedProdErr } = await supabase
          .from("saved_products")
          .select("product_id")
          .eq("user_id", user.id);

        if (!savedProdErr && savedProdRows) {
          setSavedProductsCount(savedProdRows.length);
        } else {
          setSavedProductsCount(0);
        }

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
        console.error("Error loading sidebar counts", e);
        setSavedJobsCount(0);
        setSavedProductsCount(0);
        setEntangledCount(0);
      }
    };

    loadCounts();
  }, [user]);

  // === SIDEBAR: LOAD FIRST ORGANIZATION OWNED BY THIS USER ===
  useEffect(() => {
    const loadMyOrg = async () => {
      if (!user) {
        setMyOrg(null);
        setLoadingMyOrg(false);
        return;
      }

      setLoadingMyOrg(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, logo_url")
        .eq("created_by", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setMyOrg(data as MyOrgSummary);
      } else {
        setMyOrg(null);
        if (error) {
          console.error("Error loading my organization for sidebar", error);
        }
      }
      setLoadingMyOrg(false);
    };

    loadMyOrg();
  }, [user]);

    // 🔹 Load whether current user follows this organization
  useEffect(() => {
    const loadFollowStatus = async () => {
      if (!user || !org) {
        setIsFollowing(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("org_follows")
          .select("org_id")
          .eq("user_id", user.id)
          .eq("org_id", org.id)
          .maybeSingle();

        if (!error && data) {
          setIsFollowing(true);
        } else {
          setIsFollowing(false);
        }
      } catch (e) {
        console.error("Error loading follow status", e);
        setIsFollowing(false);
      }
    };

    loadFollowStatus();
  }, [user, org]);

  // === SIDEBAR HELPERS ===
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarFullName =
    profileSummary?.full_name || fallbackName || "Your profile";

  const avatarUrl = profileSummary?.avatar_url || null;
  const educationLevel =
    (profileSummary as any)?.education_level ||
    (profileSummary as any)?.highest_education ||
    "";
  const describesYou =
    (profileSummary as any)?.describes_you ||
    (profileSummary as any)?.role ||
    "";
  const affiliation =
    (profileSummary as any)?.affiliation ||
    (profileSummary as any)?.current_org ||
    "";

  const hasProfileExtraInfo =
    Boolean(educationLevel) || Boolean(describesYou) || Boolean(affiliation);

  const entangledLabel = !user
    ? "Entangled states"
    : `Entangled states (${entangledCount === null ? "…" : entangledCount})`;

  const savedJobsLabel = !user
    ? "Saved jobs"
    : `Saved jobs (${savedJobsCount === null ? "…" : savedJobsCount})`;

  const savedProductsLabel = !user
    ? "Saved products"
    : `Saved products (${
        savedProductsCount === null ? "…" : savedProductsCount
      })`;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        {/* 3-COLUMN LAYOUT */}
        <main className="layout-3col">
          {/* LEFT SIDEBAR (same as homepage) */}
          <aside
            className="layout-left sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {/* Profile card – clickable */}
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
            
              // 🔹 Follow / unfollow handler
  const handleFollowClick = async () => {
    if (!org) return;

    // Not logged in → go to auth
    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    setFollowLoading(true);

    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await supabase
          .from("org_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("org_id", org.id);

        if (error) {
          console.error("Error unfollowing organization", error);
        } else {
          setIsFollowing(false);
          setFollowersCount((prev) =>
            prev === null ? prev : Math.max(prev - 1, 0)
          );
        }
      } else {
        // Follow
        const { error } = await supabase
          .from("org_follows")
          .upsert(
            {
              user_id: user.id,
              org_id: org.id,
            },
            { onConflict: "user_id,org_id" }
          );

        if (error) {
          console.error("Error following organization", error);
        } else {
          setIsFollowing(true);
          setFollowersCount((prev) =>
            prev === null ? prev : prev + 1
          );
        }
      }
    } catch (e) {
      console.error("Unexpected error in follow handler", e);
    } finally {
      setFollowLoading(false);
    }
  };

            {/* Quick dashboard */}
            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>
              <div className="dashboard-sidebar-links">
                <Link
                  href="/dashboard/entangled-states"
                  className="dashboard-sidebar-link"
                >
                  {entangledLabel}
                </Link>
                <Link
                  href="/dashboard/saved-jobs"
                  className="dashboard-sidebar-link"
                >
                  {savedJobsLabel}
                </Link>
                <Link
                  href="/dashboard/saved-products"
                  className="dashboard-sidebar-link"
                >
                  {savedProductsLabel}
                </Link>
              </div>
            </div>

            {/* My organization tile (conditional) */}
            {user && !loadingMyOrg && myOrg && (
              <div
                className="sidebar-card dashboard-sidebar-card"
                style={{ marginTop: 16 }}
              >
                <div className="dashboard-sidebar-title">My organization</div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <Link
                    href={`/orgs/${myOrg.slug}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
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
                        fontSize: 18,
                      }}
                    >
                      {myOrg.logo_url ? (
                        <img
                          src={myOrg.logo_url}
                          alt={myOrg.name}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        myOrg.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {myOrg.name}
                    </div>
                  </Link>

                  {/* Still placeholder stats in sidebar – main page shows real followers */}
                  <div
                    style={{
                      fontSize: 13,
                      color: "rgba(148,163,184,0.95)",
                      marginTop: 4,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                    }}
                  >
                    <div>
                      Followers:{" "}
                      <span style={{ color: "#e5e7eb" }}>0</span>
                    </div>
                    <div>
                      Views: <span style={{ color: "#e5e7eb" }}>0</span>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Link
                        href="/dashboard/my-organizations"
                        style={{
                          color: "#7dd3fc",
                          textDecoration: "none",
                        }}
                      >
                        Analytics →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Social + brand */}
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
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  fontSize: 18,
                  alignItems: "center",
                }}
              >
                <a
                  href="mailto:info@quantum5ocial.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Email Quantum5ocial"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
                    <polyline points="3 7 12 13 21 7" />
                  </svg>
                </a>

                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Quantum5ocial on X"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4l8 9.5L20 4" />
                    <path d="M4 20l6.5-7.5L20 20" />
                  </svg>
                </a>

                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Quantum5ocial on GitHub"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.84 9.68.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.49.55-3.01-1.09-3.01-1.09-.45-1.17-1.11-1.48-1.11-1.48-.9-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.35-1.99-.23-4.09-1.03-4.09-4.6 0-1.02.35-1.85.93-2.5-.09-.23-.4-1.16.09-2.42 0 0 .75-.25 2.46.95A8.23 8.23 0 0 1 12 6.84c.76 0 1.53.1 2.25.29 1.7-1.2 2.45-.95 2.45-.95.5 1.26.19 2.19.09 2.42.58.65.93 1.48.93 2.5 0 3.58-2.11 4.37-4.12 4.6.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.04 10.04 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
                  </svg>
                </a>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
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

          {/* MIDDLE COLUMN – ORG DETAIL */}
          <section className="layout-main">
            <section
              className="section"
              style={{ paddingTop: 24, paddingBottom: 48 }}
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

                  {/* Header card – slightly bigger */}
                  <section
                    style={{
                      borderRadius: 24,
                      padding: 24,
                      border: "1px solid rgba(148,163,184,0.35)",
                      background:
                        "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,1))",
                      boxShadow: "0 22px 50px rgba(15,23,42,0.75)",
                      marginBottom: 24,
                      display: "flex",
                      gap: 20,
                      alignItems: "flex-start",
                    }}
                  >
                    {/* Logo / initial */}
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 24,
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
                        fontSize: 30,
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
                          marginBottom: 6,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <h1
                            style={{
                              fontSize: 28,
                              fontWeight: 600,
                              margin: 0,
                              marginBottom: 6,
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
                            {followersCount !== null && (
                              <span
                                style={{
                                  fontSize: 12,
                                  borderRadius: 999,
                                  padding: "3px 9px",
                                  border:
                                    "1px solid rgba(148,163,184,0.5)",
                                  color: "rgba(226,232,240,0.9)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Followers:{" "}
                                {followersCount}
                              </span>
                            )}
                          </div>
                        </div>

                                                {/* Actions */}
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
                                padding: "9px 16px",
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
                              onClick={handleFollowClick}   // 🔹 real handler
                              disabled={followLoading}
                              style={{
                                padding: "9px 16px",
                                borderRadius: 999,
                                fontSize: 13,
                                border: isFollowing
                                  ? "1px solid rgba(148,163,184,0.7)"
                                  : "1px solid rgba(59,130,246,0.6)",
                                background: isFollowing
                                  ? "transparent"
                                  : "rgba(59,130,246,0.16)",
                                color: isFollowing
                                  ? "rgba(148,163,184,0.95)"
                                  : "#bfdbfe",
                                cursor: followLoading
                                  ? "default"
                                  : "pointer",
                                whiteSpace: "nowrap",
                                opacity: followLoading ? 0.7 : 1,
                              }}
                            >
                              {followLoading
                                ? "…"
                                : !user
                                ? "Sign in to follow"
                                : isFollowing
                                ? "Following"
                                : "Follow"}
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
                            marginTop: 10,
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

                    {/* Followers section */}
                    <div
                      style={{
                        marginTop: 24,
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
                        Followers
                      </div>

                      {loadingFollowers && (
                        <p className="profile-muted">
                          Loading followers…
                        </p>
                      )}

                      {followersError && !loadingFollowers && (
                        <p
                          className="profile-muted"
                          style={{ color: "#f97373", marginTop: 4 }}
                        >
                          {followersError}
                        </p>
                      )}

                      {!loadingFollowers &&
                        !followersError &&
                        followersCount === 0 && (
                          <div className="products-empty">
                            No followers yet. Once people follow this
                            organization, they will appear here.
                          </div>
                        )}

                      {!loadingFollowers &&
                        !followersError &&
                        followers.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 10,
                              marginTop: 6,
                            }}
                          >
                            {followers.map((f) => {
                              const name =
                                f.full_name || "Quantum5ocial member";
                              const initials = name
                                .split(" ")
                                .map((p) => p[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase();
                              const location = [f.city, f.country]
                                .filter(Boolean)
                                .join(", ");
                              const metaParts: string[] = [];
                              if (f.role) metaParts.push(f.role);
                              if (f.affiliation)
                                metaParts.push(f.affiliation);
                              if (location) metaParts.push(location);
                              const meta = metaParts.join(" · ");

                              return (
                                <div
                                  key={f.id}
                                  className="card"
                                  style={{
                                    padding: 10,
                                    borderRadius: 12,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 10,
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
                                        width: 36,
                                        height: 36,
                                        borderRadius: "999px",
                                        overflow: "hidden",
                                        flexShrink: 0,
                                        background:
                                          "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border:
                                          "1px solid rgba(148,163,184,0.6)",
                                        color: "#e5e7eb",
                                        fontWeight: 600,
                                        fontSize: 13,
                                      }}
                                    >
                                      {f.avatar_url ? (
                                        <img
                                          src={f.avatar_url}
                                          alt={name}
                                          style={{
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                            display: "block",
                                          }}
                                        />
                                      ) : (
                                        initials
                                      )}
                                    </div>

                                    <div style={{ fontSize: 13 }}>
                                      <div
                                        style={{
                                          fontWeight: 500,
                                          marginBottom: 2,
                                        }}
                                      >
                                        {name}
                                      </div>
                                      {meta && (
                                        <div
                                          style={{
                                            fontSize: 11,
                                            color:
                                              "rgba(148,163,184,0.95)",
                                          }}
                                        >
                                          {meta}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  </section>
                </>
              )}
            </section>
          </section>

          {/* RIGHT SIDEBAR – simple copyright */}
          <aside
            className="layout-right sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
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
