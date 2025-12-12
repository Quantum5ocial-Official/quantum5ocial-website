// pages/index.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import LeftSidebar from "../components/LeftSidebar";
import { useEffect, useState, useRef } from "react";

const Navbar = dynamic(() => import("../components/NavbarIcons"), {
  ssr: false,
});

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
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredMembers, setFeaturedMembers] = useState<CommunityProfile[]>(
    []
  );

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(true);
  // ===== SWIPE (mobile) =====
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchLastX = useRef<number | null>(null);
  const touchLastY = useRef<number | null>(null);
  // ===== MOBILE DRAWERS =====
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 900;
  });
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  const anyOpen = leftOpen || rightOpen;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = anyOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [anyOpen]);

  useEffect(() => {
    if (!anyOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLeftOpen(false);
        setRightOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [anyOpen]);

  useEffect(() => {
    if (leftOpen) setRightOpen(false);
  }, [leftOpen]);

  useEffect(() => {
    if (rightOpen) setLeftOpen(false);
  }, [rightOpen]);

  const closeAll = () => {
    setLeftOpen(false);
    setRightOpen(false);
  };

  // ===== DATA LOADS =====
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
    // ===== MOBILE EDGE SWIPE HANDLING =====
  useEffect(() => {
    if (!isMobile) return;

    const EDGE_PX = 24;
    const MIN_SWIPE_PX = 70;
    const MAX_VERTICAL_PX = 60;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchStartX.current = t.clientX;
      touchStartY.current = t.clientY;
      touchLastX.current = t.clientX;
      touchLastY.current = t.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      touchLastX.current = t.clientX;
      touchLastY.current = t.clientY;
    };

    const onTouchEnd = () => {
      if (
        touchStartX.current === null ||
        touchLastX.current === null ||
        touchStartY.current === null ||
        touchLastY.current === null
      ) {
        return;
      }

      const dx = touchLastX.current - touchStartX.current;
      const dy = touchLastY.current - touchStartY.current;

      touchStartX.current = null;
      touchLastX.current = null;
      touchStartY.current = null;
      touchLastY.current = null;

      // Ignore vertical scroll
      if (Math.abs(dy) > MAX_VERTICAL_PX) return;

      const screenWidth = window.innerWidth;

      // Close gestures
      if (leftOpen && dx < -MIN_SWIPE_PX) {
        setLeftOpen(false);
        return;
      }

      if (rightOpen && dx > MIN_SWIPE_PX) {
        setRightOpen(false);
        return;
      }

      // Open gestures (from edges only)
      if (!leftOpen && !rightOpen) {
        if (touchStartX.current! <= EDGE_PX && dx > MIN_SWIPE_PX) {
          setLeftOpen(true);
          return;
        }

        if (
          touchStartX.current! >= screenWidth - EDGE_PX &&
          dx < -MIN_SWIPE_PX
        ) {
          setRightOpen(true);
          return;
        }
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart as any);
      window.removeEventListener("touchmove", onTouchMove as any);
      window.removeEventListener("touchend", onTouchEnd as any);
    };
  }, [isMobile, leftOpen, rightOpen]);

  // ===== FORMATTERS =====
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
      (m as any).highest_education || (m as any).education_level || "" || undefined;
    const role = (m as any).role || (m as any).describes_you || undefined;
    const aff = (m as any).affiliation || (m as any).current_org || undefined;

    return [highestEdu, role, aff].filter(Boolean).join(" · ");
  };

  // ===== RIGHT SIDEBAR CONTENT (reuse for desktop + mobile drawer) =====
  const RightSidebar = () => (
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
              Browse internships, MSc/PhD positions, postdocs, and industry roles
              from labs and companies worldwide.
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
              Discover quantum hardware, control electronics, software tools, and
              services from specialized vendors.
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
              <span className="tile-pill">Labs &amp; companies</span>
              <span className="tile-pill">Entangle connections</span>
            </div>
            <div className="tile-cta">
              Browse community <span>›</span>
            </div>
          </div>
        </Link>
      </div>
    </aside>
  );

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        {/* ===== MOBILE DRAWERS + EDGE BUTTONS ===== */}
        {isMobile && anyOpen && (
          <div
            onClick={closeAll}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              zIndex: 9998,
            }}
          />
        )}

        {isMobile && !anyOpen && (
          <>
            {/* Left edge button */}
            <button
              type="button"
              aria-label="Open left drawer"
              onClick={() => setLeftOpen(true)}
              style={{
                position: "fixed",
                top: "50%",
                transform: "translateY(-50%)",
                left: 6,
                zIndex: 9997,
                width: 28,
                height: 64,
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.55)",
                background: "rgba(15,23,42,0.75)",
                color: "rgba(226,232,240,0.95)",
                fontSize: 22,
                cursor: "pointer",
              }}
            >
              ‹
            </button>

            {/* Right edge button */}
            <button
              type="button"
              aria-label="Open right drawer"
              onClick={() => setRightOpen(true)}
              style={{
                position: "fixed",
                top: "50%",
                transform: "translateY(-50%)",
                right: 6,
                zIndex: 9997,
                width: 28,
                height: 64,
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.55)",
                background: "rgba(15,23,42,0.75)",
                color: "rgba(226,232,240,0.95)",
                fontSize: 22,
                cursor: "pointer",
              }}
            >
              ›
            </button>
          </>
        )}

        {/* Left drawer */}
        {isMobile && (
          <aside
            aria-hidden={!leftOpen}
            style={{
              position: "fixed",
              top: 84, // matches your NAV_HEADER_HEIGHT
              bottom: 0,
              left: 0,
              width: "86vw",
              maxWidth: 380,
              background: "rgba(10,15,30,0.98)",
              borderRight: "1px solid rgba(148,163,184,0.25)",
              zIndex: 9999,
              transform: leftOpen ? "translateX(0)" : "translateX(-105%)",
              transition: "transform 180ms ease-out",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                height: 52,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 14px",
                borderBottom: "1px solid rgba(148,163,184,0.25)",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(226,232,240,0.9)",
                }}
              >
                Menu
              </div>
              <button
                type="button"
                aria-label="Close left drawer"
                onClick={() => setLeftOpen(false)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(148,163,184,0.35)",
                  color: "rgba(226,232,240,0.9)",
                  borderRadius: 999,
                  width: 34,
                  height: 34,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: 12,
              }}
            >
              <LeftSidebar />
            </div>
          </aside>
        )}

        {/* Right drawer */}
        {isMobile && (
          <aside
            aria-hidden={!rightOpen}
            style={{
              position: "fixed",
              top: 84,
              bottom: 0,
              right: 0,
              width: "86vw",
              maxWidth: 380,
              background: "rgba(10,15,30,0.98)",
              borderLeft: "1px solid rgba(148,163,184,0.25)",
              zIndex: 9999,
              transform: rightOpen ? "translateX(0)" : "translateX(105%)",
              transition: "transform 180ms ease-out",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                height: 52,
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 14px",
                borderBottom: "1px solid rgba(148,163,184,0.25)",
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(226,232,240,0.9)",
                }}
              >
                Shortcuts
              </div>
              <button
                type="button"
                aria-label="Close right drawer"
                onClick={() => setRightOpen(false)}
                style={{
                  background: "transparent",
                  border: "1px solid rgba(148,163,184,0.35)",
                  color: "rgba(226,232,240,0.9)",
                  borderRadius: 999,
                  width: 34,
                  height: 34,
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                flex: 1,
                overflowY: "auto",
                WebkitOverflowScrolling: "touch",
                padding: 12,
              }}
            >
              <RightSidebar />
            </div>
          </aside>
        )}

        {/* ===== DESKTOP: original 3-col layout | MOBILE: middle only ===== */}
        <main className={isMobile ? "" : "layout-3col"}>
          {!isMobile && <LeftSidebar />}

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
                  <span className="tag-chip">Hardware · Software · Services</span>
                </div>
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
                  <div className="section-title">Featured community members</div>
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
                      (m as any).short_bio || (m as any).short_description || "";

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
                              <div className="card-meta" style={{ marginTop: 2 }}>
                                {meta}
                              </div>
                            )}
                            {bio && (
                              <div
                                className="card-footer-text"
                                style={{ marginTop: 6 }}
                              >
                                {bio.length > 80 ? bio.slice(0, 77) + "..." : bio}
                              </div>
                            )}
                            <button
                              type="button"
                              style={{
                                marginTop: 10,
                                padding: "5px 10px",
                                borderRadius: 999,
                                border: "1px solid rgba(148,163,184,0.7)",
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
                    <li>
                      Post roles or products → earn vendor &amp; mentor badges
                    </li>
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
                    <span className="badge-dot" /> Entangled · Connected with labs
                  </div>
                  <div className="badge-pill">
                    <span className="badge-dot" /> Quantum Vendor · Active startup
                  </div>
                  <div className="badge-pill">
                    <span className="badge-dot" /> Resonant · Highly active profile
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
                    <span className="who-title">Students &amp; early-career</span>
                  </div>
                  <p className="who-text">
                    Explore internships, MSc/PhD projects, and your first postdoc
                    or industry role. Build your profile as you grow into the
                    field.
                  </p>
                </div>

                <div className="who-card">
                  <div className="who-title-row">
                    <span className="who-emoji">🧑‍🔬</span>
                    <span className="who-title">Researchers &amp; labs</span>
                  </div>
                  <p className="who-text">
                    Showcase your group, attract collaborators, and make it
                    easier to find the right candidates for your quantum projects.
                  </p>
                </div>

                <div className="who-card">
                  <div className="who-title-row">
                    <span className="who-emoji">🏢</span>
                    <span className="who-title">Companies &amp; startups</span>
                  </div>
                  <p className="who-text">
                    Post jobs, list your hero products, and reach a focused
                    audience that already cares about quantum technologies.
                  </p>
                </div>
              </div>
            </section>
          </section>

          {!isMobile && <RightSidebar />}
        </main>
      </div>
    </>
  );
}
