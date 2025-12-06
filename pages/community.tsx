// pages/community.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

// What we need for the left sidebar
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

// What we need for each community card
type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  short_bio: string | null;
  highest_education: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

export default function CommunityPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sidebar counters
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [savedProductsCount, setSavedProductsCount] = useState(0);
  const [entangledCount, setEntangledCount] = useState(0);

  // Search in community list
  const [searchText, setSearchText] = useState("");

  // ---- Load current user profile for left sidebar ----
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfileSummary(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            avatar_url,
            role,
            highest_education,
            affiliation,
            country,
            city
          `
        )
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

  // ---- Load dashboard counters (saved jobs, saved products, entangled states) ----
  useEffect(() => {
    if (!user) {
      setSavedJobsCount(0);
      setSavedProductsCount(0);
      setEntangledCount(0);
      return;
    }

    const loadCounts = async () => {
      // Saved jobs
      const { count: jobsCount } = await supabase
        .from("saved_jobs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setSavedJobsCount(jobsCount || 0);

      // Saved products
      const { count: productsCount } = await supabase
        .from("saved_products")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setSavedProductsCount(productsCount || 0);

      // Entangled states (accepted connections)
      const { count: entCount } = await supabase
        .from("connections")
        .select("*", { count: "exact", head: true })
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

      setEntangledCount(entCount || 0);
    };

    loadCounts();
  }, [user]);

  // ---- Load community profiles for middle column ----
  useEffect(() => {
    if (authLoading) return;

    const loadProfiles = async () => {
      setLoadingProfiles(true);
      setError(null);

      try {
        let query = supabase
          .from("profiles")
          .select(
            `
              id,
              full_name,
              avatar_url,
              role,
              short_bio,
              highest_education,
              affiliation,
              country,
              city
            `
          )
          .order("full_name", { ascending: true });

        // exclude current user from list (they are in sidebar)
        if (user?.id) {
          query = query.neq("id", user.id);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error loading profiles:", error);
          setError("Could not load community members.");
          setProfiles([]);
        } else {
          setProfiles((data || []) as CommunityProfile[]);
        }
      } catch (e: any) {
        console.error("Community load crashed:", e);
        setError("Something went wrong while loading the community.");
        setProfiles([]);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadProfiles();
  }, [authLoading, user?.id]);

  // ---- Filtered profiles based on search ----
  const filteredProfiles = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return profiles;

    return profiles.filter((p) => {
      const haystack = [
        p.full_name,
        p.role,
        p.short_bio,
        p.affiliation,
        p.city,
        p.country,
        p.highest_education,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [profiles, searchText]);

  const featuredProfile = !loadingProfiles && !error
    ? filteredProfiles[0] || null
    : null;
  const remainingProfiles =
    featuredProfile && filteredProfiles.length > 1
      ? filteredProfiles.slice(1)
      : featuredProfile
      ? []
      : filteredProfiles;

  // ==== helpers for sidebar ====
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
            {/* Profile card – clickable, goes to My profile */}
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

            {/* Quick dashboard card with counters */}
            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>
              <div className="dashboard-sidebar-links">
                <Link
                  href="/dashboard/entangled-states"
                  className="dashboard-sidebar-link"
                >
                  Entangled states
                  {user ? ` (${entangledCount})` : ""}
                </Link>
                <Link
                  href="/dashboard/saved-jobs"
                  className="dashboard-sidebar-link"
                >
                  Saved jobs
                  {user ? ` (${savedJobsCount})` : ""}
                </Link>
                <Link
                  href="/dashboard/saved-products"
                  className="dashboard-sidebar-link"
                >
                  Saved products
                  {user ? ` (${savedProductsCount})` : ""}
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

                {/* X */}
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
              {/* Sticky header + search */}
              <div className="jobs-main-header">
                <div className="section-header">
                  <div>
                    <div
                      className="section-title"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
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
                          {filteredProfiles.length} members
                        </span>
                      )}
                    </div>

                    <div className="section-sub">
                      Discover the quantum ecosystem and{" "}
                      <span style={{ color: "#7dd3fc" }}>entangle</span> with
                      members.
                    </div>
                  </div>
                </div>

                {/* SEARCH BAR */}
                <div className="jobs-main-search">
                  <div
                    style={{
                      width: "100%",
                      borderRadius: 999,
                      padding: "2px",
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
                      <span style={{ fontSize: 14, opacity: 0.85 }}>🔍</span>
                      <input
                        style={{
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          color: "#e5e7eb",
                          fontSize: 14,
                          width: "100%",
                        }}
                        placeholder="Search by name, affiliation, country, role…"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= FEATURED MEMBER ================= */}
              {!loadingProfiles && !error && featuredProfile && (
                <div
                  style={{
                    marginTop: 16,
                    marginBottom: 20,
                    borderRadius: 16,
                    padding: 16,
                    border: "1px solid rgba(129,140,248,0.5)",
                    background:
                      "radial-gradient(circle at top left, rgba(56,189,248,0.12), rgba(15,23,42,1))",
                  }}
                >
                  {/* Label */}
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#a5b4fc",
                      marginBottom: 6,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>Featured member</span>
                    <span style={{ fontSize: 14 }}>✨</span>
                  </div>

                  {/* Title */}
                  <div
                    style={{
                      fontSize: "0.95rem",
                      fontWeight: 600,
                      marginBottom: 12,
                      color: "#e5e7eb",
                    }}
                  >
                    Profile of the week
                  </div>

                  {/* Main featured block */}
                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      alignItems: "center",
                    }}
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "999px",
                        overflow: "hidden",
                        border: "1px solid rgba(148,163,184,0.6)",
                        background: "rgba(15,23,42,0.9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        fontSize: 18,
                        fontWeight: 600,
                        color: "#e5e7eb",
                      }}
                    >
                      {featuredProfile.avatar_url ? (
                        <img
                          src={featuredProfile.avatar_url}
                          alt={featuredProfile.full_name || "Featured member"}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        <span>
                          {(featuredProfile.full_name || "Q")
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Featured info */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>
                        {featuredProfile.full_name || "Quantum5ocial member"}
                      </div>

                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          marginBottom: 4,
                        }}
                      >
                        {featuredProfile.role || "Quantum community member"}
                      </div>

                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {featuredProfile.affiliation ||
                          [featuredProfile.city, featuredProfile.country]
                            .filter(Boolean)
                            .join(", ") ||
                          "Part of the global quantum ecosystem."}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= LOADING / ERROR / EMPTY ================= */}
              {loadingProfiles && (
                <div className="products-status">Loading community members…</div>
              )}

              {error && !loadingProfiles && (
                <div className="products-status" style={{ color: "#f87171" }}>
                  {error}
                </div>
              )}

              {!loadingProfiles &&
                !error &&
                filteredProfiles.length === 0 && (
                  <div className="products-empty">
                    No members match this search yet. As more users join
                    Quantum5ocial, they will appear here.
                  </div>
                )}

              {/* ================= COMMUNITY GRID ================= */}
              {!loadingProfiles &&
                !error &&
                remainingProfiles.length > 0 && (
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
                            {/* Avatar + name */}
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

                            {/* Info block */}
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

                          // pages/jobs/index.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

type Job = {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
  description: string | null;
  keywords: string | null;
  salary_display: string | null;
  created_at: string | null;
  owner_id: string | null;

  technology_type: string | null;
  organisation_type: string | null;
  quantum_domain: string | null;
  role_track: string | null;
  seniority_level: string | null;
};

const EMPLOYMENT_FILTERS = [
  "All",
  "Full-time",
  "Part-time",
  "Internship",
  "PhD",
  "Postdoc",
  "Contract",
  "Fellowship",
  "Other",
];

const REMOTE_FILTERS = ["All", "On-site", "Hybrid", "Remote"];

const TECHNOLOGY_FILTERS = [
  "All",
  "Hardware",
  "Software",
  "Consulting",
  "Cryogenics / Electronics",
  "Other",
];

const ORG_TYPE_FILTERS = [
  "All",
  "University / Lab",
  "Startup",
  "Company",
  "Consortium / Institute",
  "Other",
];

const DOMAIN_FILTERS = [
  "All",
  "Quantum computing",
  "Quantum communication",
  "Quantum sensing / metrology",
  "Quantum materials / fabrication",
  "Quantum control / electronics",
  "Other",
];

const ROLE_TRACK_FILTERS = [
  "All",
  "Research",
  "Engineering",
  "Theory / algorithms",
  "Product / business",
  "Other",
];

const SENIORITY_FILTERS = [
  "All",
  "Student / Intern",
  "Early-career",
  "Mid-level",
  "Senior / Lead",
  "PI / Professor",
];

export default function JobsIndexPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [employmentFilter, setEmploymentFilter] = useState("All");
  const [remoteFilter, setRemoteFilter] = useState("All");

  const [technologyFilter, setTechnologyFilter] = useState("All");
  const [orgTypeFilter, setOrgTypeFilter] = useState("All");
  const [domainFilter, setDomainFilter] = useState("All");
  const [roleTrackFilter, setRoleTrackFilter] = useState("All");
  const [seniorityFilter, setSeniorityFilter] = useState("All");

  const [savedJobIds, setSavedJobIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  // ---- Load jobs ----
  useEffect(() => {
    const loadJobs = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading jobs", error);
        setError("Could not load jobs. Please try again.");
        setJobs([]);
      } else {
        setJobs((data || []) as Job[]);
      }

      setLoading(false);
    };

    loadJobs();
  }, []);

  // ---- Load saved jobs for current user ----
  useEffect(() => {
    const loadSaved = async () => {
      if (!user) {
        setSavedJobIds([]);
        return;
      }

      const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error loading saved jobs", error);
        return;
      }

      setSavedJobIds((data || []).map((row: any) => row.job_id as string));
    };

    loadSaved();
  }, [user]);

  const isSaved = (id: string) => savedJobIds.includes(id);

  const handleToggleSave = async (jobId: string) => {
    if (!user) {
      router.push("/auth?redirect=/jobs");
      return;
    }

    setSavingId(jobId);
    const alreadySaved = isSaved(jobId);

    try {
      if (alreadySaved) {
        const { error } = await supabase
          .from("saved_jobs")
          .delete()
          .eq("user_id", user.id)
          .eq("job_id", jobId);

        if (error) {
          console.error("Error unsaving job", error);
        } else {
          setSavedJobIds((prev) => prev.filter((id) => id !== jobId));
        }
      } else {
        const { error } = await supabase.from("saved_jobs").insert({
          user_id: user.id,
          job_id: jobId,
        });

        if (error) {
          console.error("Error saving job", error);
        } else {
          setSavedJobIds((prev) => [...prev, jobId]);
        }
      }
    } finally {
      setSavingId(null);
    }
  };

  // ---- Filtering ----
  const filteredJobs = useMemo(() => {
    const q = search.toLowerCase().trim();

    const normalize = (v: string | null) => (v || "").toLowerCase();
    const matchesCategory = (filterValue: string, fieldValue: string | null) => {
      if (filterValue === "All") return true;
      return normalize(fieldValue) === filterValue.toLowerCase();
    };

    return jobs.filter((job) => {
      if (employmentFilter !== "All" && job.employment_type !== employmentFilter) {
        return false;
      }
      if (remoteFilter !== "All" && job.remote_type !== remoteFilter) {
        return false;
      }

      if (!matchesCategory(technologyFilter, job.technology_type)) return false;
      if (!matchesCategory(orgTypeFilter, job.organisation_type)) return false;
      if (!matchesCategory(domainFilter, job.quantum_domain)) return false;
      if (!matchesCategory(roleTrackFilter, job.role_track)) return false;
      if (!matchesCategory(seniorityFilter, job.seniority_level)) return false;

      if (!q) return true;

      const haystack = (
        `${job.title || ""} ${job.company_name || ""} ${job.location || ""} ${
          job.short_description || ""
        } ${job.keywords || ""} ${job.technology_type || ""} ${
          job.quantum_domain || ""
        } ${job.role_track || ""} ${job.seniority_level || ""}`
      ).toLowerCase();

      return haystack.includes(q);
    });
  }, [
    jobs,
    search,
    employmentFilter,
    remoteFilter,
    technologyFilter,
    orgTypeFilter,
    domainFilter,
    roleTrackFilter,
    seniorityFilter,
  ]);

  const recommendedJobs = filteredJobs.slice(0, 2);
  const remainingJobs = filteredJobs.slice(recommendedJobs.length);

  const resetFilters = () => {
    setSearch("");
    setEmploymentFilter("All");
    setRemoteFilter("All");
    setTechnologyFilter("All");
    setOrgTypeFilter("All");
    setDomainFilter("All");
    setRoleTrackFilter("All");
    setSeniorityFilter("All");
  };

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* ========== LEFT COLUMN – FILTERS ========== */}
          <aside className="layout-left sticky-col">
            <div className="sidebar-card">
              {/* Employment type */}
              <div className="products-filters-section">
                <div className="products-filters-title">Employment type</div>
                <select
                  className="products-filters-input"
                  value={employmentFilter}
                  onChange={(e) => setEmploymentFilter(e.target.value)}
                >
                  {EMPLOYMENT_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Work mode */}
              <div className="products-filters-section">
                <div className="products-filters-title">Work mode</div>
                <select
                  className="products-filters-input"
                  value={remoteFilter}
                  onChange={(e) => setRemoteFilter(e.target.value)}
                >
                  {REMOTE_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Technology */}
              <div className="products-filters-section">
                <div className="products-filters-title">Technology type</div>
                <select
                  className="products-filters-input"
                  value={technologyFilter}
                  onChange={(e) => setTechnologyFilter(e.target.value)}
                >
                  {TECHNOLOGY_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Organisation */}
              <div className="products-filters-section">
                <div className="products-filters-title">Organisation</div>
                <select
                  className="products-filters-input"
                  value={orgTypeFilter}
                  onChange={(e) => setOrgTypeFilter(e.target.value)}
                >
                  {ORG_TYPE_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Domain */}
              <div className="products-filters-section">
                <div className="products-filters-title">Quantum domain</div>
                <select
                  className="products-filters-input"
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                >
                  {DOMAIN_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role focus */}
              <div className="products-filters-section">
                <div className="products-filters-title">Role focus</div>
                <select
                  className="products-filters-input"
                  value={roleTrackFilter}
                  onChange={(e) => setRoleTrackFilter(e.target.value)}
                >
                  {ROLE_TRACK_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Seniority */}
              <div className="products-filters-section">
                <div className="products-filters-title">Seniority</div>
                <select
                  className="products-filters-input"
                  value={seniorityFilter}
                  onChange={(e) => setSeniorityFilter(e.target.value)}
                >
                  {SENIORITY_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="nav-ghost-btn"
                style={{ width: "100%", marginTop: 8 }}
                onClick={resetFilters}
              >
                Reset filters
              </button>
            </div>
          </aside>

          {/* ========== MIDDLE COLUMN – JOBS LIST ========== */}
          <section className="layout-main">
            <section className="section">
              {/* STICKY HEADER + SEARCH */}
              <div className="jobs-main-header">
                <div className="section-header">
                  <div>
                    <div
                      className="section-title"
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      Quantum Jobs Universe
                      {!loading && !error && (
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
                          {filteredJobs.length} roles
                        </span>
                      )}
                    </div>
                    <div
                      className="section-sub"
                      style={{ maxWidth: "480px", lineHeight: "1.45" }}
                    >
                      Browse internships, MSc/PhD positions, postdocs, and
                      industry roles across labs and companies.
                    </div>
                  </div>

                  <button
                    className="nav-cta"
                    style={{ cursor: "pointer" }}
                    onClick={() => router.push("/jobs/new")}
                  >
                    Post a job
                  </button>
                </div>

                {/* Center-column search bar */}
                <div className="jobs-main-search">
                  <div
                    style={{
                      width: "100%",
                      borderRadius: 999,
                      padding: "2px",
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
                        placeholder="Search by title, company, location, keywords…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* === BODY (scrolls under sticky header) === */}
              {!loading && !error && filteredJobs.length === 0 && (
                <p className="products-empty">
                  No roles match your filters yet. Try broadening your search.
                </p>
              )}

              {!loading && !error && filteredJobs.length > 0 && (
                <>
                  {/* Top recommendations */}
                  {recommendedJobs.length > 0 && (
                    <div
                      style={{
                        marginBottom: 32,
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
                          alignItems: "baseline",
                          marginBottom: 12,
                          gap: 12,
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
                            Recommended for you
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
                            Top recommendations based on your profile
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            textAlign: "right",
                          }}
                        >
                          For now based on your filters. <br />
                          Later: AI profile matching.
                        </div>
                      </div>

                      <div className="jobs-grid">
                        {recommendedJobs.map((job) => {
                          const saved = isSaved(job.id);
                          return (
                            <Link
                              key={job.id}
                              href={`/jobs/${job.id}`}
                              className="job-card"
                            >
                              <div className="job-card-header">
                                <div>
                                  <div className="job-card-title">
                                    {job.title || "Untitled role"}
                                  </div>
                                  <div className="job-card-meta">
                                    {job.company_name && `${job.company_name} · `}
                                    {job.location}
                                    {job.remote_type ? ` · ${job.remote_type}` : ""}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="product-save-btn"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!savingId) {
                                      handleToggleSave(job.id);
                                    }
                                  }}
                                  aria-label={
                                    saved ? "Remove from saved jobs" : "Save job"
                                  }
                                >
                                  {saved ? "❤️" : "🤍"}
                                </button>
                              </div>

                              {job.short_description && (
                                <div className="job-card-description">
                                  {job.short_description}
                                </div>
                              )}

                              <div className="job-card-footer">
                                <span className="job-salary">
                                  {job.salary_display || ""}
                                </span>
                                {job.employment_type && (
                                  <span className="job-type">
                                    {job.employment_type}
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* All roles */}
                  {remainingJobs.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {recommendedJobs.length > 0 && (
                        <div
                          style={{
                            height: 1,
                            margin: "4px 0 20px",
                            background:
                              "linear-gradient(90deg, rgba(148,163,184,0), rgba(148,163,184,0.6), rgba(148,163,184,0))",
                          }}
                        />
                      )}

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
                            Browse everything
                          </div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 600,
                            }}
                          >
                            All roles
                          </div>
                        </div>
                      </div>

                      <div className="jobs-grid">
                        {remainingJobs.map((job) => {
                          const saved = isSaved(job.id);

                          return (
                            <Link
                              key={job.id}
                              href={`/jobs/${job.id}`}
                              className="job-card"
                            >
                              <div className="job-card-header">
                                <div>
                                  <div className="job-card-title">
                                    {job.title || "Untitled role"}
                                  </div>
                                  <div className="job-card-meta">
                                    {job.company_name && `${job.company_name} · `}
                                    {job.location}
                                    {job.remote_type ? ` · ${job.remote_type}` : ""}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  className="product-save-btn"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if (!savingId) {
                                      handleToggleSave(job.id);
                                    }
                                  }}
                                  aria-label={
                                    saved ? "Remove from saved jobs" : "Save job"
                                  }
                                >
                                  {saved ? "❤️" : "🤍"}
                                </button>
                              </div>

                              {job.short_description && (
                                <div className="job-card-description">
                                  {job.short_description}
                                </div>
                              )}

                              <div className="job-card-footer">
                                <span className="job-salary">
                                  {job.salary_display || ""}
                                </span>
                                {job.employment_type && (
                                  <span className="job-type">
                                    {job.employment_type}
                                  </span>
                                )}
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </section>

          {/* ========== RIGHT COLUMN – HIGHLIGHTED TILES ========== */}
          <aside className="layout-right sticky-col">
            <div className="hero-tiles hero-tiles-vertical">
              {/* Quantum roles spotlight */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum roles spotlight</div>
                    <div className="tile-icon-orbit">🧪</div>
                  </div>
                  <p className="tile-text">
                    This tile will later showcase a curated quantum job or role
                    from the marketplace – ideal for demos.
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

              {/* Featured hiring partner */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Featured hiring partner</div>
                    <div className="tile-icon-orbit">🏢</div>
                  </div>
                  <p className="tile-text">
                    Later this can feature a lab, startup, or company actively
                    hiring across multiple roles.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Superconducting</span>
                    <span className="tile-pill">Spin qubits</span>
                    <span className="tile-pill">Cryo engineer</span>
                  </div>
                  <div className="tile-cta">
                    Partner spotlight <span>›</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
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
                    This tile will highlight one selected hardware, software, or
                    service from the Quantum Products Lab.
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
                    Later this tile can feature a standout community member – for
                    example a PI, postdoc, or startup founder.
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
        </main>
      </div>
    </>
  );
}
