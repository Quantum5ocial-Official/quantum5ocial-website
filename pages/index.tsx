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
};

export default function Home() {
  const [featuredJobs, setFeaturedJobs] = useState<Job[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

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
          "id, name, company_name, category, short_description, price_type, price_value, in_stock"
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

    loadJobs();
    loadProducts();
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
            <a href="/jobs" className="section-link">
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
                <Link key={job.id} href={`/jobs/${job.id}`} className="card">
                  <div className="card-inner">
                    <div className="card-top-row">
                      <div className="card-title">{job.title || "Untitled role"}</div>
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
            <a href="/products" className="section-link">
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
                <Link key={p.id} href={`/products/${p.id}`} className="card">
                  <div className="card-inner">
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
                </Link>
              ))}
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

        {/* LOGIN PLACEHOLDER */}
        <section id="login" className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Login &amp; sign up </div>
              <div className="section-sub">
                Use the Login / Sign up button in the top-right corner to access your
                dashboard and start posting jobs and products.
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer>
          Quantum5ocial © 2025 · Building the quantum ecosystem ·{" "}
          <a href="mailto:info@quantum5ocial.com">Contact</a>
        </footer>
      </div>
    </>
  );
}
