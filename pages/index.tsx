// pages/index.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

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

type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;              // adjust to your column name if needed
  affiliation: string | null;
  highest_education: string | null;
  short_bio: string | null;         // adjust to your column name if needed
};

export default function Home() {
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [featuredProfiles, setFeaturedProfiles] = useState<CommunityProfile[]>([]);

  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  useEffect(() => {
    const loadJobs = async () => {
      setLoadingJobs(true);
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, title, company_name, location, employment_type, remote_type, short_description"
        )
        .order("created_at", { ascending: false })
        .limit(3);

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
        .limit(3);

      if (!error && data) {
        setFeaturedProducts(data as Product[]);
      } else {
        setFeaturedProducts([]);
      }
      setLoadingProducts(false);
    };

    const loadProfiles = async () => {
      setLoadingProfiles(true);
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, role, affiliation, highest_education, short_bio"
        )
        .order("created_at", { ascending: false })
        .limit(3);

      if (!error && data) {
        setFeaturedProfiles(data as CommunityProfile[]);
      } else {
        setFeaturedProfiles([]);
      }
      setLoadingProfiles(false);
    };

    loadJobs();
    loadProducts();
    loadProfiles();
  }, []);

  const formatJobMeta = (job: Job) =>
    [job.company_name, job.location, job.remote_type].filter(Boolean).join(" · ");

  const formatPrice = (p: Product) => {
    if (p.price_type === "fixed" && p.price_value) return p.price_value;
    if (p.price_type === "contact") return "Contact for price";
    return "";
  };

  const formatProductMeta = (p: Product) =>
    [p.company_name ? `Vendor: ${p.company_name}` : null].filter(Boolean).join(" · ");

  const formatProductTags = (p: Product) => {
    const tags: string[] = [];
    if (p.category) tags.push(p.category);
    const price = formatPrice(p);
    if (price) tags.push(price);
    if (p.in_stock === true) tags.push("In stock");
    if (p.in_stock === false) tags.push("Out of stock");
    return tags.slice(0, 3);
  };

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        {/* HERO */}
        <section className="hero" id="about">
          <div>
            <div className="eyebrow">Quantum ecosystem hub</div>
            <h1 className="hero-title">
              Discover <span className="hero-highlight">jobs &amp; tools</span> shaping
              the future of quantum technology.
            </h1>
            <p className="hero-sub">
              Quantum5ocial connects students, researchers, and companies with curated
              opportunities and products across the global quantum ecosystem.
            </p>

            <div className="hero-tags">
              <span className="tag-chip">PhD, postdoc, and industry roles</span>
              <span className="tag-chip">Startups, vendors, and labs</span>
              <span className="tag-chip">Hardware · Software · Services</span>
            </div>

            <p className="hero-note">
              Start with marketplace features now – and evolve into a full social
              platform as the community grows.
            </p>
          </div>

          <aside>
            <div className="hero-tiles">
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
            </div>
          </aside>
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
            <div className="card-row">
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
            <div className="card-row">
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
                    {/* Thumbnail on the left */}
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

                    {/* Text content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-top-row">
                        <div className="card-title">{p.name}</div>
                        <div className="card-pill">{p.category || "Product"}</div>
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
                        Click to see full details in the Quantum Products Lab.
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
                A snapshot of the latest people joining the quantum ecosystem on
                Quantum5ocial.
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
              View all members →
            </a>
          </div>

          {loadingProfiles ? (
            <div className="products-status">Loading community members…</div>
          ) : featuredProfiles.length === 0 ? (
            <div className="products-empty">
              No community members to show yet. As users join, they will appear here.
            </div>
          ) : (
            <div className="card-row">
              {featuredProfiles.map((p) => {
                const name = p.full_name || "Quantum5ocial member";
                const initial = name.charAt(0).toUpperCase();
                const role = p.role || "Quantum5ocial member";
                const affiliation = p.affiliation || "—";
                const highestEducation = p.highest_education || "—";
                const shortBio =
                  p.short_bio ||
                  "Quantum5ocial community member exploring the quantum ecosystem.";

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
                      minHeight: 220,
                    }}
                  >
                    <div className="card-inner">
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
                            border: "1px solid rgba(148,163,184,0.4)",
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
                          <span style={{ opacity: 0.7 }}>Education: </span>
                          <span>{highestEducation}</span>
                        </div>
                        <div>
                          <span style={{ opacity: 0.7 }}>Affiliation: </span>
                          <span>{affiliation}</span>
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

                    <div style={{ marginTop: 12 }}>
                      <Link
                        href="/community"
                        style={{
                          width: "100%",
                          padding: "7px 0",
                          borderRadius: 10,
                          border: "1px solid rgba(59,130,246,0.6)",
                          background: "rgba(59,130,246,0.16)",
                          color: "#bfdbfe",
                          fontSize: 12,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          textDecoration: "none",
                        }}
                      >
                        <span>Entangle</span>
                        <span style={{ fontSize: 14 }}>+</span>
                      </Link>
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
                Quantum5ocial stays professional but adds a light gamified layer –
                rewarding meaningful activity like completing your profile, posting
                jobs/products, and exploring the ecosystem.
              </p>
              <ul className="gamify-list">
                <li>Complete your profile → gain QP and visibility</li>
                <li>Post roles or products → earn vendor &amp; mentor badges</li>
                <li>
                  Explore and engage → unlock levels like Superposition, Entangled,
                  Resonant
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
              <div className="section-sub">Different paths, one shared platform.</div>
            </div>
          </div>

          <div className="who-grid">
            <div className="who-card">
              <div className="who-title-row">
                <span className="who-emoji">👨‍🎓</span>
                <span className="who-title">Students &amp; early-career</span>
              </div>
              <p className="who-text">
                Explore internships, MSc/PhD projects, and your first postdoc or industry
                role. Build your profile as you grow into the field.
              </p>
            </div>

            <div className="who-card">
              <div className="who-title-row">
                <span className="who-emoji">🧑‍🔬</span>
                <span className="who-title">Researchers &amp; labs</span>
              </div>
              <p className="who-text">
                Showcase your group, attract collaborators, and make it easier to find the
                right candidates for your quantum projects.
              </p>
            </div>

            <div className="who-card">
              <div className="who-title-row">
                <span className="who-emoji">🏢</span>
                <span className="who-title">Companies &amp; startups</span>
              </div>
              <p className="who-text">
                Post jobs, list your hero products, and reach a focused audience that
                already cares about quantum technologies.
              </p>
            </div>
          </div>
        </section>

        {/* FOOTER is rendered in _app.tsx */}
      </div>
    </>
  );
}
