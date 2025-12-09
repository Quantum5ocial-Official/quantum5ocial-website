// pages/index.tsx
import { useEffect, useState, FormEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type Job = {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
  remote_type: string | null;
  short_description: string | null;
};

type Product = {
  id: string;
  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;
  price_type: "fixed" | "contact" | null;
  price_value: string | null;
  in_stock: boolean | null;
  image1_url: string | null;
};

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
};

type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  role?: string | null;
  affiliation?: string | null;
  short_bio?: string | null;
};

// NEW: minimal org summary for sidebar tile
type MyOrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export default function Home() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  // 🔍 global search input (hero)
  const [globalSearch, setGlobalSearch] = useState("");

  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredMembers, setFeaturedMembers] = useState<CommunityProfile[]>(
    []
  );

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );

  // counts for sidebar quick dashboard
  const [savedJobsCount, setSavedJobsCount] = useState<number | null>(null);
  const [savedProductsCount, setSavedProductsCount] = useState<number | null>(
    null
  );
  const [entangledCount, setEntangledCount] = useState<number | null>(null);

  // NEW: first organization created by this user (for sidebar tile)
  const [myOrg, setMyOrg] = useState<MyOrgSummary | null>(null);
  const [loadingMyOrg, setLoadingMyOrg] = useState<boolean>(true);

  // === GLOBAL SEARCH HANDLER ===
  const handleGlobalSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const term = globalSearch.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  // === LOAD FEATURED JOBS & PRODUCTS ===
  useEffect(() => {
    const loadJobs = async () => {
      setLoadingJobs(true);
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, title, company_name, location, employment_type, remote_type, short_description"
        )
        .order("created_at", { ascending: false })
        .limit(2);

      if (!error && data) {
        setFeaturedJobs(data as Job[]);
      } else {
        setFeaturedJobs([]);
      }
      setLoadingJobs(false);
    };

    const loadProducts = async () => {
      setLoadingProducts(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, company_name, category, short_description, price_type, price_value, in_stock, image1_url"
        )
        .order("created_at", { ascending: false })
        .limit(2);

      if (!error && data) {
        setFeaturedProducts(data as Product[]);
      } else {
        setFeaturedProducts([]);
      }
      setLoadingProducts(false);
    };

    loadJobs();
    loadProducts();
  }, []);

  // === LOAD FEATURED COMMUNITY MEMBERS (latest 2 profiles) ===
  useEffect(() => {
    const loadMembers = async () => {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2);

      if (!error && data) {
        setFeaturedMembers(data as CommunityProfile[]);
      } else {
        setFeaturedMembers([]);
      }
      setLoadingMembers(false);
    };

    loadMembers();
  }, []);

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

  // === LOAD FIRST ORGANIZATION OWNED BY THIS USER FOR SIDEBAR TILE ===
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

  // === HELPERS ===

  const formatJobMeta = (job: Job) =>
    [job.company_name, job.location, job.remote_type].filter(Boolean).join(" · ");

  const formatPrice = (p: Product) => {
    if (p.price_type === "fixed" && p.price_value) return p.price_value;
    if (p.price_type === "contact") return "Contact for price";
    return "";
  };

  const formatProductMeta = (p: Product) =>
    [p.company_name ? `Vendor: ${p.company_name}` : null]
      .filter(Boolean)
      .join(" · ");

  const formatProductTags = (p: Product) => {
    const tags: string[] = [];
    const price = formatPrice(p);
    if (p.category) tags.push(p.category);
    if (price) tags.push(price);
    if (p.in_stock === true) tags.push("In stock");
    if (p.in_stock === false) tags.push("Out of stock");
    return tags.slice(0, 3);
  };

  const formatMemberMeta = (m: CommunityProfile) => {
    const highestEdu =
      (m as any).highest_education ||
      (m as any).education_level ||
      "" ||
      undefined;
    const role = (m as any).role || (m as any).describes_you || undefined;
    const aff = (m as any).affiliation || (m as any).current_org || undefined;

    return [highestEdu, role, aff].filter(Boolean).join(" · ");
  };

  // Fallback / sidebar name
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

  // Sidebar labels with counts
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
          {/* LEFT SIDEBAR */}
<aside
  className="layout-left sticky-col"
  style={{
    display: "flex",
    flexDirection: "column",
    gap: 6, // uniform spacing between all sidebar sections
  }}
>

  {/* PROFILE CARD – clickable → profile page */}
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

    {/* Education / Role / Affiliation / Location */}
    {(hasProfileExtraInfo ||
      (profileSummary as any)?.city ||
      (profileSummary as any)?.country) && (
      <div className="profile-sidebar-info-block">
        {educationLevel && (
          <div className="profile-sidebar-info-value">{educationLevel}</div>
        )}
        {describesYou && (
          <div className="profile-sidebar-info-value" style={{ marginTop: 4 }}>
            {describesYou}
          </div>
        )}
        {affiliation && (
          <div className="profile-sidebar-info-value" style={{ marginTop: 4 }}>
            {affiliation}
          </div>
        )}

        {(profileSummary as any)?.city ||
        (profileSummary as any)?.country ? (
          <div
            className="profile-sidebar-info-value"
            style={{ marginTop: 4, opacity: 0.9 }}
          >
            {[
              (profileSummary as any)?.city,
              (profileSummary as any)?.country,
            ]
              .filter(Boolean)
              .join(", ")}
          </div>
        ) : null}
      </div>
    )}
  </Link>

  {/* QUICK DASHBOARD (individual row links) */}
  <div className="sidebar-card dashboard-sidebar-card">
    <div className="dashboard-sidebar-title">Quick dashboard</div>

    <div className="dashboard-sidebar-links" style={{ marginTop: 8 }}>
      <Link
        href="/dashboard/entangled-states"
        className="dashboard-sidebar-link"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Entanglements</span>
        <span style={{ opacity: 0.9 }}>
          {entangledCount === null ? "…" : entangledCount}
        </span>
      </Link>

      <Link
        href="/dashboard/saved-jobs"
        className="dashboard-sidebar-link"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Saved jobs</span>
        <span style={{ opacity: 0.9 }}>
          {savedJobsCount === null ? "…" : savedJobsCount}
        </span>
      </Link>

      <Link
        href="/dashboard/saved-products"
        className="dashboard-sidebar-link"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Saved products</span>
        <span style={{ opacity: 0.9 }}>
          {savedProductsCount === null ? "…" : savedProductsCount}
        </span>
      </Link>

      <Link
        href="/ecosystem"
        className="dashboard-sidebar-link"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>My Ecosystem</span>
      </Link>
    </div>
  </div>

  {/* MY ORGANIZATION TILE */}
  {user && !loadingMyOrg && myOrg && (
    <Link
      href={`/orgs/${myOrg.slug}`}
      className="sidebar-card dashboard-sidebar-card"
      style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
    >
      <div className="dashboard-sidebar-title">My organization</div>

      <div
        style={{
          marginTop: 10,
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            overflow: "hidden",
            flexShrink: 0,
            border: "1px solid rgba(148,163,184,0.45)",
            background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
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
              }}
            />
          ) : (
            myOrg.name.charAt(0).toUpperCase()
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
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
              Followers: <span style={{ color: "#e5e7eb" }}>0</span>
            </div>
            <div>
              Views: <span style={{ color: "#e5e7eb" }}>0</span>
            </div>
            <div style={{ marginTop: 4, color: "#7dd3fc" }}>Analytics →</div>
          </div>
        </div>
      </div>
    </Link>
  )}

  {/* PREMIUM CARD */}
  <div
    className="sidebar-card premium-sidebar-card"
    style={{
      padding: "14px 16px",
      borderRadius: 20,
      background:
        "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(244,114,182,0.18))",
      border: "1px solid rgba(251,191,36,0.5)",
      boxShadow: "0 12px 30px rgba(15,23,42,0.7)",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <span style={{ fontSize: 18 }}>👑</span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>Go Premium</span>
    </div>

    <div
      style={{
        fontSize: 12,
        color: "rgba(248,250,252,0.9)",
        lineHeight: 1.5,
        marginBottom: 10,
      }}
    >
      Unlock advanced analytics, boosted visibility, and premium perks for your
      profile and organization.
    </div>

    <div
      style={{
        fontSize: 11,
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(15,23,42,0.75)",
        width: "fit-content",
        border: "1px solid rgba(251,191,36,0.6)",
        color: "rgba(251,191,36,0.9)",
      }}
    >
      Coming soon
    </div>
  </div>

  {/* DIVIDER */}
  <div
    style={{
      width: "100%",
      height: 1,
      background: "rgba(148,163,184,0.18)",
      marginTop: 6,
      marginBottom: 6,
    }}
  />

  {/* SOCIAL + LOGO + COPYRIGHT */}
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      gap: 8,
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
      <a href="mailto:info@quantum5ocial.com" style={{ color: "rgba(148,163,184,0.9)" }}>✉️</a>
      <a href="#" style={{ color: "rgba(148,163,184,0.9)" }}>𝕏</a>
      <a href="#" style={{ color: "rgba(148,163,184,0.9)", fontWeight: 600 }}>in</a>
    </div>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: "rgba(148,163,184,0.9)",
      }}
    >
      <img
        src="/Q5_white_bg.png"
        alt="Quantum5ocial logo"
        style={{ width: 24, height: 24, borderRadius: 4 }}
      />
      <span>© 2025 Quantum5ocial</span>
    </div>
  </div>
</aside>
          
          {/* MIDDLE MAIN COLUMN */}
          <section className="layout-main">
            {/* HERO */}
            <section className="hero" id="about">
              <div>
                <div className="eyebrow">Quantum ecosystem hub</div>
                <h1 className="hero-title">
                  Discover{" "}
                  <span className="hero-highlight">
                    jobs, products &amp; services
                  </span>{" "}
                  shaping the future of quantum technology.
                </h1>
                <p className="hero-sub">
                  Quantum5ocial connects students, researchers, and companies
                  with curated opportunities, services and products across the
                  global quantum ecosystem.
                </p>

                <div className="hero-tags">
                  <span className="tag-chip">
                    Intern, PhD, Postdoc, and Industry roles
                  </span>
                  <span className="tag-chip">Startups, Vendors, and Labs</span>
                  <span className="tag-chip">
                    Hardware · Software · Services
                  </span>
                </div>

                <p className="hero-note">
                  Starting with marketplace features now, and evolving into a
                  full social platform as the community grows.
                </p>

                {/* 🔍 GLOBAL SEARCH BAR */}
                <form
                  onSubmit={handleGlobalSearchSubmit}
                  className="hero-search"
                  style={{
                    marginTop: 24,
                    maxWidth: 580,
                    display: "flex",
                    gap: 10,
                  }}
                >
                  <input
                    type="text"
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                    placeholder="Search jobs, products, people, and organizations…"
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.5)",
                      background: "rgba(15,23,42,0.95)",
                      color: "#e5e7eb",
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "10px 18px",
                      borderRadius: 999,
                      border: "none",
                      background:
                        "linear-gradient(135deg,#3bc7f3,#8468ff)",
                      color: "#0f172a",
                      fontWeight: 600,
                      fontSize: 14,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Search
                  </button>
                </form>
              </div>
            </section>

            {/* FEATURED JOBS */}
            <section className="section" id="jobs">
              <div className="section-header">
                <div>
                  <div className="section-title">Featured quantum roles</div>
                  <div className="section-sub">
                    The latest roles from the Quantum Jobs Universe.
                  </div>
                </div>
                <a
                  href="/jobs"
                  className="section-link"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.6)",
                    background: "transparent",
                    color: "#e5e7eb",
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  View all jobs →
                </a>
              </div>

              {loadingJobs ? (
                <div className="products-status">Loading jobs…</div>
              ) : featuredJobs.length === 0 ? (
                <div className="products-empty">No jobs posted yet.</div>
              ) : (
                <div
                  className="card-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16,
                  }}
                >
                  {featuredJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="card"
                      style={{
                        textDecoration: "none",
                        color: "#e5e7eb",
                      }}
                    >
                      <div className="card-inner">
                        <div className="card-top-row">
                          <div className="card-title">
                            {job.title || "Untitled role"}
                          </div>
                          <div className="card-pill">
                            {job.employment_type || "Job"}
                          </div>
                        </div>
                        <div className="card-meta">
                          {formatJobMeta(job) || "Quantum role"}
                        </div>
                        {job.short_description && (
                          <div className="card-tags">
                            <span className="card-tag">
                              {job.short_description.length > 60
                                ? job.short_description.slice(0, 57) + "..."
                                : job.short_description}
                            </span>
                          </div>
                        )}
                        <div className="card-footer-text">
                          Open to see full details on the jobs page.
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* FEATURED PRODUCTS */}
            <section className="section" id="products">
              <div className="section-header">
                <div>
                  <div className="section-title">
                    Highlighted quantum tools &amp; products
                  </div>
                  <div className="section-sub">
                    The newest entries from the Quantum Products Lab.
                  </div>
                </div>
                <a
                  href="/products"
                  className="section-link"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.6)",
                    background: "transparent",
                    color: "#e5e7eb",
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  Browse all products →
                </a>
              </div>

              {loadingProducts ? (
                <div className="products-status">Loading products…</div>
              ) : featuredProducts.length === 0 ? (
                <div className="products-empty">No products listed yet.</div>
              ) : (
                <div
                  className="card-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16,
                  }}
                >
                  {featuredProducts.map((p) => (
                    <Link
                      key={p.id}
                      href={`/products/${p.id}`}
                      className="card"
                      style={{
                        textDecoration: "none",
                        color: "#e5e7eb",
                      }}
                    >
                      <div
                        className="card-inner"
                        style={{
                          display: "flex",
                          gap: 16,
                          alignItems: "flex-start",
                        }}
                      >
                        {/* Thumbnail */}
                        <div
                          style={{
                            width: 72,
                            height: 72,
                            borderRadius: 14,
                            overflow: "hidden",
                            flexShrink: 0,
                            background: "rgba(15,23,42,0.9)",
                            border: "1px solid rgba(15,23,42,0.9)",
                          }}
                        >
                          {p.image1_url ? (
                            <img
                              src={p.image1_url}
                              alt={p.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                display: "block",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 11,
                                color: "#6b7280",
                              }}
                            >
                              No image
                            </div>
                          )}
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="card-top-row">
                            <div className="card-title">{p.name}</div>
                            <div className="card-pill">
                              {p.category || "Product"}
                            </div>
                          </div>
                          <div className="card-meta">
                            {formatProductMeta(p) || "Quantum product"}
                          </div>
                          {p.short_description && (
                            <div className="card-tags">
                              {formatProductTags(p).map((tag) => (
                                <span key={tag} className="card-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="card-footer-text">
                            Click to see full details in the Quantum Products
                            Lab.
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* FEATURED COMMUNITY MEMBERS */}
            <section className="section" id="community">
              <div className="section-header">
                <div>
                  <div className="section-title">
                    Featured community members
                  </div>
                  <div className="section-sub">
                    Recently joined profiles from the Quantum Community.
                  </div>
                </div>
                <a
                  href="/community"
                  className="section-link"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.6)",
                    background: "transparent",
                    color: "#e5e7eb",
                    fontSize: 13,
                    textDecoration: "none",
                  }}
                >
                  Explore community →
                </a>
              </div>

              {loadingMembers ? (
                <div className="products-status">Loading community…</div>
              ) : featuredMembers.length === 0 ? (
                <div className="products-empty">
                  No community members visible yet.
                </div>
              ) : (
                <div
                  className="card-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: 16,
                  }}
                >
                  {featuredMembers.map((m) => {
                    const name = m.full_name || "Quantum member";
                    const firstName =
                      typeof name === "string"
                        ? name.split(" ")[0] || name
                        : "Member";
                    const meta = formatMemberMeta(m);
                    const bio =
                      (m as any).short_bio ||
                      (m as any).short_description ||
                      "";

                    return (
                      <div key={m.id} className="card">
                        <div
                          className="card-inner"
                          style={{
                            display: "flex",
                            gap: 14,
                            alignItems: "flex-start",
                          }}
                        >
                          {/* avatar */}
                          <div
                            style={{
                              width: 52,
                              height: 52,
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
                            }}
                          >
                            {m.avatar_url ? (
                              <img
                                src={m.avatar_url}
                                alt={firstName}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              firstName.charAt(0).toUpperCase()
                            )}
                          </div>

                          {/* text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="card-title">{name}</div>
                            {meta && (
                              <div
                                className="card-meta"
                                style={{ marginTop: 2 }}
                              >
                                {meta}
                              </div>
                            )}
                            {bio && (
                              <div
                                className="card-footer-text"
                                style={{ marginTop: 6 }}
                              >
                                {bio.length > 80
                                  ? bio.slice(0, 77) + "..."
                                  : bio}
                              </div>
                            )}
                            <button
                              type="button"
                              style={{
                                marginTop: 10,
                                padding: "5px 10px",
                                borderRadius: 999,
                                border:
                                  "1px solid rgba(148,163,184,0.7)",
                                background: "transparent",
                                color: "#7dd3fc",
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              + Entangle
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* GAMIFICATION */}
            <section className="section">
              <div className="gamify-strip">
                <div>
                  <div className="gamify-title">
                    Earn Quantum Points (QP) &amp; unlock quantum-themed badges
                  </div>
                  <p className="gamify-text">
                    Quantum5ocial stays professional but adds a light gamified
                    layer – rewarding meaningful activity like completing your
                    profile, posting jobs/products, and exploring the ecosystem.
                  </p>
                  <ul className="gamify-list">
                    <li>Complete your profile → gain QP and visibility</li>
                    <li>Post roles or products → earn vendor &amp; mentor badges</li>
                    <li>
                      Explore and engage → unlock levels like Superposition,
                      Entangled, Resonant
                    </li>
                  </ul>
                </div>
                <div className="gamify-badges">
                  <div className="badge-pill">
                    <span className="badge-dot" /> Superposition · New member
                  </div>
                  <div className="badge-pill">
                    <span className="badge-dot" /> Entangled · Connected with
                    labs
                  </div>
                  <div className="badge-pill">
                    <span className="badge-dot" /> Quantum Vendor · Active
                    startup
                  </div>
                  <div className="badge-pill">
                    <span className="badge-dot" /> Resonant · Highly active
                    profile
                  </div>
                </div>
              </div>
            </section>

            {/* FOR WHOM */}
            <section className="section">
              <div className="section-header">
                <div>
                  <div className="section-title">
                    Built for the entire quantum community
                  </div>
                  <div className="section-sub">
                    Different paths, one shared platform.
                  </div>
                </div>
              </div>

              <div className="who-grid">
                <div className="who-card">
                  <div className="who-title-row">
                    <span className="who-emoji">👨‍🎓</span>
                    <span className="who-title">
                      Students &amp; early-career
                    </span>
                  </div>
                  <p className="who-text">
                    Explore internships, MSc/PhD projects, and your first
                    postdoc or industry role. Build your profile as you grow
                    into the field.
                  </p>
                </div>

                <div className="who-card">
                  <div className="who-title-row">
                    <span className="who-emoji">🧑‍🔬</span>
                    <span className="who-title">Researchers &amp; labs</span>
                  </div>
                  <p className="who-text">
                    Showcase your group, attract collaborators, and make it
                    easier to find the right candidates for your quantum
                    projects.
                  </p>
                </div>

                <div className="who-card">
                  <div className="who-title-row">
                    <span className="who-emoji">🏢</span>
                    <span className="who-title">
                      Companies &amp; startups
                    </span>
                  </div>
                  <p className="who-text">
                    Post jobs, list your hero products, and reach a focused
                    audience that already cares about quantum technologies.
                  </p>
                </div>
              </div>
            </section>
          </section>

          {/* RIGHT SIDEBAR – STACKED HERO TILES + COPYRIGHT */}
          <aside
            className="layout-right sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div className="hero-tiles hero-tiles-vertical">
              {/* Jobs tile */}
              <Link href="/jobs" className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Explore</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum Jobs Universe</div>
                    <div className="tile-icon-orbit">🧪</div>
                  </div>
                  <p className="tile-text">
                    Browse internships, MSc/PhD positions, postdocs, and
                    industry roles from labs and companies worldwide.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">MSc / PhD</span>
                    <span className="tile-pill">Postdoc</span>
                    <span className="tile-pill">Industry</span>
                  </div>
                  <div className="tile-cta">
                    Browse jobs <span>›</span>
                  </div>
                </div>
              </Link>

              {/* Products tile */}
              <Link href="/products" className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Discover</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum Products Lab</div>
                    <div className="tile-icon-orbit">🔧</div>
                  </div>
                  <p className="tile-text">
                    Discover quantum hardware, control electronics, software
                    tools, and services from specialized vendors.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Hardware</span>
                    <span className="tile-pill">Control &amp; readout</span>
                    <span className="tile-pill">Software &amp; services</span>
                  </div>
                  <div className="tile-cta">
                    Browse products <span>›</span>
                  </div>
                </div>
              </Link>

              {/* Community tile */}
              <Link href="/community" className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Connect</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum Community</div>
                    <div className="tile-icon-orbit">🤝</div>
                  </div>
                  <p className="tile-text">
                    Discover people working in quantum technology – students,
                    researchers, and industry professionals across the world.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Profiles</span>
                    <span className="tile-pill">
                      Labs &amp; companies
                    </span>
                    <span className="tile-pill">Entangle connections</span>
                  </div>
                  <div className="tile-cta">
                    Browse community <span>›</span>
                  </div>
                </div>
              </Link>
            </div>

        
          </aside>
        </main>
      </div>
    </>
  );
}
