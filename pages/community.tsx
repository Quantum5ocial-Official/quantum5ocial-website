// pages/community.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

// What we need for the left sidebar (same as homepage)
type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
};

// Community member type
type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  short_bio: string | null;
  highest_education: string | null;
  affiliation: string | null;

  // add these two:
  country?: string | null;
  city?: string | null;
};

export default function CommunityPage() {
  const { user } = useSupabaseUser();

  // --- Sidebar profile + counts (same logic as homepage) ---
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [savedJobsCount, setSavedJobsCount] = useState<number | null>(null);
  const [savedProductsCount, setSavedProductsCount] = useState<number | null>(
    null
  );
  const [entangledCount, setEntangledCount] = useState<number | null>(null);

  // --- Community data ---
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile of the week (featured member)
  const [featuredMember, setFeaturedMember] = useState<CommunityProfile | null>(
    null
  );

  // Search input
  const [search, setSearch] = useState("");

  // Total members (for the "10 members" badge)
  const [totalMembers, setTotalMembers] = useState<number | null>(null);
    // === LOAD CURRENT USER PROFILE FOR LEFT SIDEBAR ===
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

  // === LOAD COUNTS FOR QUICK DASHBOARD (saved jobs/products + entangled states) ===
  useEffect(() => {
    const loadCounts = async () => {
      if (!user) {
        setSavedJobsCount(null);
        setSavedProductsCount(null);
        setEntangledCount(null);
        return;
      }

      try {
        // Saved jobs
        const { data: savedJobsRows, error: savedJobsErr } = await supabase
          .from("saved_jobs")
          .select("job_id")
          .eq("user_id", user.id);

        if (!savedJobsErr && savedJobsRows) {
          setSavedJobsCount(savedJobsRows.length);
        } else {
          setSavedJobsCount(0);
        }

        // Saved products
        const { data: savedProdRows, error: savedProdErr } = await supabase
          .from("saved_products")
          .select("product_id")
          .eq("user_id", user.id);

        if (!savedProdErr && savedProdRows) {
          setSavedProductsCount(savedProdRows.length);
        } else {
          setSavedProductsCount(0);
        }

        // Entangled states – count unique "other" users in accepted connections
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

  // === LOAD COMMUNITY PROFILES ===
  useEffect(() => {
    const loadProfiles = async () => {
      setLoadingProfiles(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading community profiles", error);
          setError("Could not load community members.");
          setProfiles([]);
          setTotalMembers(null);
          setFeaturedMember(null);
        } else {
          const list = (data || []) as CommunityProfile[];
          setProfiles(list);
          setTotalMembers(list.length || 0);
          setFeaturedMember(list.length > 0 ? list[0] : null);
        }
      } catch (e) {
        console.error("Community load crashed:", e);
        setError("Something went wrong while loading the community.");
        setProfiles([]);
        setTotalMembers(null);
        setFeaturedMember(null);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadProfiles();
  }, []);

  // === FORMAT HELPERS ===
  const formatMemberMeta = (m: CommunityProfile) => {
    const highestEdu =
      m.highest_education || m.education_level || undefined;
    const role = m.role || m.describes_you || undefined;
    const aff = m.affiliation || m.current_org || undefined;

    return [highestEdu, role, aff].filter(Boolean).join(" · ");
  };

  // Filtered list based on search
  const filteredProfiles = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return profiles;

    return profiles.filter((m) => {
      const haystack = [
        m.full_name || "",
        m.role || "",
        m.describes_you || "",
        m.affiliation || "",
        m.current_org || "",
        m.short_bio || "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [profiles, search]);

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
  {/* ========== LEFT SIDEBAR (same as homepage) ========== */}
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

  {/* Quick dashboard */}
  <div className="sidebar-card dashboard-sidebar-card">
    <div className="dashboard-sidebar-title">Quick dashboard</div>
    <div className="dashboard-sidebar-links">
      <Link href="/dashboard/entangled-states" className="dashboard-sidebar-link">
        {entangledLabel}
      </Link>
      <Link href="/dashboard/saved-jobs" className="dashboard-sidebar-link">
        {savedJobsLabel}
      </Link>
      <Link href="/dashboard/saved-products" className="dashboard-sidebar-link">
        {savedProductsLabel}
      </Link>
    </div>
  </div>

  {/* Social icons + brand logo/name */}
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
    {/* Icons row */}
    <div
      style={{
        display: "flex",
        gap: 12,
        fontSize: 18,
        alignItems: "center",
      }}
    >
      {/* Email */}
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

      {/* X icon */}
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

      {/* GitHub */}
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

    {/* Brand row */}
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
  {/* ========== MIDDLE COLUMN – COMMUNITY LIST ========== */}
<section className="layout-main">
  <section className="section">
    {/* STICKY HEADER + SEARCH */}
    <div className="community-main-header">
      <div className="section-header">
        <div>
          <div
            className="section-title"
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            Quantum5ocial community
            {!loadingProfiles && !error && (
              <span
                style={{
                  fontSize: 12,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "rgba(56,189,248,0.15)",
                  border: "1px solid rgba(56,189,248,0.35)",
                  color: "#7dd3fc",
                }}
              >
                {profiles.length} member{profiles.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <div
            className="section-sub"
            style={{ maxWidth: 480, lineHeight: 1.45 }}
          >
            Discover members of the quantum ecosystem and{" "}
            <span style={{ color: "#7dd3fc" }}>entangle</span> with them.
          </div>
        </div>
      </div>

      {/* Center-column search bar */}
      <div className="community-main-search">
        <div
          style={{
            width: "100%",
            borderRadius: 999,
            padding: 2,
            background:
              "linear-gradient(90deg, rgba(56,189,248,0.5), rgba(129,140,248,0.5))",
          }}
        >
          <div
            style={{
              borderRadius: 999,
              background: "rgba(15,23,42,0.97)",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 14,
                opacity: 0.85,
              }}
            >
              🔍
            </span>
            <input
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                color: "#e5e7eb",
                fontSize: 14,
                width: "100%",
              }}
              placeholder="Search by name, role, affiliation, location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>

    {/* === BODY (scrolls under sticky header) === */}
    {loadingProfiles && (
      <div className="products-status">Loading community members…</div>
    )}

    {error && !loadingProfiles && (
      <div className="products-status" style={{ color: "#f87171" }}>
        {error}
      </div>
    )}

    {!loadingProfiles && !error && profiles.length === 0 && (
      <div className="products-empty">
        No members visible yet. As more users join Quantum5ocial, they will
        appear here.
      </div>
    )}

    {!loadingProfiles && !error && profiles.length > 0 && (
      <>
        {/* Prepare filtered + sliced lists */}
        {(() => {
          const q = search.toLowerCase().trim();

          const filteredProfiles = !q
            ? profiles
            : profiles.filter((p) => {
                const haystack = (
                  `${p.full_name || ""} ${p.role || ""} ${
                    p.affiliation || ""
                  } ${p.short_bio || ""} ${p.city || ""} ${p.country || ""}`
                ).toLowerCase();
                return haystack.includes(q);
              });

          const featuredProfile =
            filteredProfiles.length > 0 ? filteredProfiles[0] : null;
          const remainingProfiles = featuredProfile
            ? filteredProfiles.slice(1, 11)
            : filteredProfiles.slice(0, 10);

          return (
            <>
              {/* PROFILE OF THE WEEK / FEATURED MEMBER */}
              {featuredProfile && (
                <div
                  style={{
                    marginBottom: 24,
                    padding: 16,
                    borderRadius: 16,
                    border: "1px solid rgba(56,189,248,0.35)",
                    background:
                      "radial-gradient(circle at top left, rgba(34,211,238,0.12), rgba(15,23,42,1))",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "#7dd3fc",
                          marginBottom: 4,
                        }}
                      >
                        Profile of the week
                      </div>
                      <div
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          background:
                            "linear-gradient(90deg,#22d3ee,#a855f7)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                        }}
                      >
                        Standout member from the Quantum Community
                      </div>
                    </div>
                  </div>

                  <div
                    className="card"
                    style={{
                      borderRadius: 14,
                      padding: 14,
                      background: "rgba(15,23,42,0.95)",
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
                          width: 56,
                          height: 56,
                          borderRadius: "999px",
                          overflow: "hidden",
                          border: "1px solid rgba(148,163,184,0.5)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            "linear-gradient(135deg,#3bc7f3,#8468ff)",
                          color: "#fff",
                          fontWeight: 600,
                          fontSize: 18,
                        }}
                      >
                        {featuredProfile.avatar_url ? (
                          <img
                            src={featuredProfile.avatar_url}
                            alt={featuredProfile.full_name || "Member"}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          (featuredProfile.full_name ||
                            "Member")[0].toUpperCase()
                        )}
                      </div>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="card-title"
                          style={{ marginBottom: 2 }}
                        >
                          {featuredProfile.full_name || "Quantum member"}
                        </div>
                        <div
                          className="card-meta"
                          style={{ fontSize: 12, lineHeight: 1.4 }}
                        >
                          {featuredProfile.role || "Quantum5ocial member"}
                          {featuredProfile.affiliation
                            ? ` · ${featuredProfile.affiliation}`
                            : ""}
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            color: "var(--text-muted)",
                            lineHeight: 1.5,
                          }}
                        >
                          {featuredProfile.short_bio ||
                            "Active contributor in the quantum ecosystem on Quantum5ocial."}
                        </div>
                        <button
                          type="button"
                          style={{
                            marginTop: 10,
                            padding: "6px 12px",
                            borderRadius: 999,
                            border: "1px solid rgba(59,130,246,0.6)",
                            background: "rgba(59,130,246,0.16)",
                            color: "#bfdbfe",
                            fontSize: 12,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                          onClick={() => {
                            console.log("Entangle with", featuredProfile.id);
                          }}
                        >
                          <span>Entangle</span>
                          <span style={{ fontSize: 14 }}>+</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DIVIDER BEFORE GENERAL LIST */}
              {remainingProfiles.length > 0 && (
                <div
                  style={{
                    height: 1,
                    margin: "4px 0 16px",
                    background:
                      "linear-gradient(90deg, rgba(148,163,184,0), rgba(148,163,184,0.6), rgba(148,163,184,0))",
                  }}
                />
              )}

              {/* BROWSE MEMBERS TITLE */}
              {remainingProfiles.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(148,163,184,0.9)",
                        marginBottom: 3,
                      }}
                    >
                      Browse community
                    </div>
                    <div
                      style={{
                        fontSize: "0.95rem",
                        fontWeight: 600,
                      }}
                    >
                      Members
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-muted)",
                    }}
                  >
                    Showing {remainingProfiles.length} of{" "}
                    {filteredProfiles.length} match
                    {filteredProfiles.length === 1 ? "" : "es"}
                  </div>
                </div>
              )}

              {/* MEMBERS GRID (UP TO 10) */}
              {remainingProfiles.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                    gap: 16,
                  }}
                >
                  {remainingProfiles.map((p) => {
                    const name = p.full_name || "Quantum5ocial member";
                    const initial = name.charAt(0).toUpperCase();
                    const highestEducation = p.highest_education || "—";
                    const role = p.role || "Quantum5ocial member";
                    const location = [p.city, p.country]
                      .filter(Boolean)
                      .join(", ");
                    const affiliationLine =
                      p.affiliation || location || "—";
                    const shortBio =
                      p.short_bio ||
                      (p.affiliation
                        ? `Member of the quantum ecosystem at ${p.affiliation}.`
                        : "Quantum5ocial community member exploring the quantum ecosystem.");

                    return (
                      <div
                        key={p.id}
                        className="card"
                        style={{
                          textDecoration: "none",
                          padding: 14,
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          minHeight: 230,
                        }}
                      >
                        <div className="card-inner">
                          {/* Top row: avatar + name */}
                          <div
                            style={{
                              display: "flex",
                              gap: 12,
                              alignItems: "center",
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 52,
                                height: 52,
                                borderRadius: "999px",
                                overflow: "hidden",
                                flexShrink: 0,
                                border:
                                  "1px solid rgba(148,163,184,0.4)",
                                background: "rgba(15,23,42,0.9)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 18,
                                fontWeight: 600,
                                color: "#e5e7eb",
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
                                    display: "block",
                                  }}
                                />
                              ) : (
                                <span>{initial}</span>
                              )}
                            </div>

                            <div style={{ minWidth: 0 }}>
                              <div
                                className="card-title"
                                style={{
                                  marginBottom: 2,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {name}
                              </div>
                              <div
                                className="card-meta"
                                style={{ fontSize: 12, lineHeight: 1.4 }}
                              >
                                {role}
                              </div>
                            </div>
                          </div>

                          {/* Middle info block */}
                          <div
                            style={{
                              fontSize: 12,
                              color: "var(--text-muted)",
                              display: "flex",
                              flexDirection: "column",
                              gap: 4,
                              marginTop: 6,
                            }}
                          >
                            <div>
                              <span style={{ opacity: 0.7 }}>
                                Education:{" "}
                              </span>
                              <span>{highestEducation}</span>
                            </div>
                            <div>
                              <span style={{ opacity: 0.7 }}>
                                Affiliation:{" "}
                              </span>
                              <span>{affiliationLine}</span>
                            </div>
                            <div>
                              <span style={{ opacity: 0.7 }}>Role: </span>
                              <span>{role}</span>
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                lineHeight: 1.4,
                                maxHeight: 60,
                                overflow: "hidden",
                              }}
                            >
                              {shortBio}
                            </div>
                          </div>
                        </div>

                        {/* Entangle button */}
                        <div style={{ marginTop: 12 }}>
                          <button
                            type="button"
                            style={{
                              width: "100%",
                              padding: "7px 0",
                              borderRadius: 10,
                              border:
                                "1px solid rgba(59,130,246,0.6)",
                              background: "rgba(59,130,246,0.16)",
                              color: "#bfdbfe",
                              fontSize: 12,
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                            }}
                            onClick={() => {
                              console.log("Entangle with", p.id);
                            }}
                          >
                            <span>Entangle</span>
                            <span style={{ fontSize: 14 }}>+</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </>
    )}
  </section>
</section>
  {/* ========== RIGHT SIDEBAR – HIGHLIGHTED TILES ========== */}
<aside
  className="layout-right sticky-col"
  style={{ display: "flex", flexDirection: "column" }}
>
  <div className="hero-tiles hero-tiles-vertical">
    {/* Highlighted jobs */}
    <div className="hero-tile">
      <div className="hero-tile-inner">
        <div className="tile-label">Highlighted</div>
        <div className="tile-title-row">
          <div className="tile-title">Quantum roles spotlight</div>
          <div className="tile-icon-orbit">🧪</div>
        </div>
        <p className="tile-text">
          This tile will later showcase a curated quantum job or role
          from the marketplace – ideal to show during demos.
        </p>
        <div className="tile-pill-row">
          <span className="tile-pill">Example: PhD position</span>
          <span className="tile-pill">Location</span>
          <span className="tile-pill">Lab / company</span>
        </div>
        <div className="tile-cta">
          Jobs spotlight <span>›</span>
        </div>
      </div>
    </div>

    {/* Highlighted products */}
    <div className="hero-tile">
      <div className="hero-tile-inner">
        <div className="tile-label">Highlighted</div>
        <div className="tile-title-row">
          <div className="tile-title">Quantum product of the week</div>
          <div className="tile-icon-orbit">🔧</div>
        </div>
        <p className="tile-text">
          This tile will highlight one selected hardware, software,
          or service from the Quantum Products Lab.
        </p>
        <div className="tile-pill-row">
          <span className="tile-pill">Example: Cryo system</span>
          <span className="tile-pill">Control electronics</span>
          <span className="tile-pill">Software suite</span>
        </div>
        <div className="tile-cta">
          Product spotlight <span>›</span>
        </div>
      </div>
    </div>

    {/* Highlighted talent */}
    <div className="hero-tile">
      <div className="hero-tile-inner">
        <div className="tile-label">Highlighted</div>
        <div className="tile-title-row">
          <div className="tile-title">Featured quantum talent</div>
          <div className="tile-icon-orbit">🤝</div>
        </div>
        <p className="tile-text">
          Later this tile can feature a standout community member –
          for example a PI, postdoc, or startup founder.
        </p>
        <div className="tile-pill-row">
          <span className="tile-pill">Example: Role</span>
          <span className="tile-pill">Field</span>
          <span className="tile-pill">Affiliation</span>
        </div>
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
