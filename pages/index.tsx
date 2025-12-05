// pages/index.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
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

export default function Home() {
  const { user } = useSupabaseUser();

  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredMembers, setFeaturedMembers] = useState<CommunityProfile[]>([]);

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);

  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(null);

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

  // === LOAD FEATURED COMMUNITY MEMBERS (latest 3 profiles) ===
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
    if (p.category) tags.push(p.category);
    const price = formatPrice(p);
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
                <div className="profile-sidebar-name">
                  {sidebarFullName}
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
            // === LOAD DASHBOARD COUNTS (saved jobs/products + entangled states) ===
useEffect(() => {
  const loadCounts = async () => {
    if (!user) {
      setSavedJobsCount(null);
      setSavedProductsCount(null);
      setEntangledCount(null);
      return;
    }

    const userId = user.id;

    // Saved jobs
    const { count: jobsCount } = await supabase
      .from("saved_jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    setSavedJobsCount(jobsCount ?? 0);

    // Saved products
    const { count: productsCount } = await supabase
      .from("saved_products")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    setSavedProductsCount(productsCount ?? 0);

    // Entangled states (accepted connections involving this user)
    const { count: entCount } = await supabase
      .from("connections")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`user_id.eq.${userId},target_user_id.eq.${userId}`);

    setEntangledCount(entCount ?? 0);
  };

  loadCounts();
}, [user]);

            {/* Quick dashboard card */}
            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>
              <div className="dashboard-sidebar-links">
                <Link
                  href="/dashboard/entangled-states"
                  className="dashboard-sidebar-link"
                >
                  Entangled states
                </Link>
                <Link
                  href="/dashboard/saved-jobs"
                  className="dashboard-sidebar-link"
                >
                  Saved jobs
                </Link>
                <Link
                  href="/dashboard/saved-products"
                  className="dashboard-sidebar-link"
                >
                  Saved products
                </Link>
              </div>
            </div>

            {/* Social icons + brand logo/name at bottom of left column */}
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
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                      ry="2"
                    />
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
                  with curated opportunities, services and products across the global
                  quantum ecosystem.
                </p>

                <div className="hero-tags">
                  <span className="tag-chip">
                    Intern, PhD, Postdoc, and Industry roles
                  </span>
                  <span className="tag-chip">
                    Startups, Vendors, and Labs
                  </span>
                  <span className="tag-chip">
                    Hardware · Software · Services
                  </span>
                </div>

                <p className="hero-note">
                  Starting with marketplace features now, and evolving into a full
                  social platform as the community grows.
                </p>
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
                    <span className="who-title">
                      Researchers &amp; labs
                    </span>
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

            {/* Copyright pinned at bottom of right column */}
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
