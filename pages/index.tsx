// pages/index.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

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
  return (
    <>
      {/* HERO */}
      <section className="hero" id="about">
        <div>
          <div className="eyebrow">Quantum ecosystem hub</div>
          <h1 className="hero-title">
            Discover{" "}
            <span className="hero-highlight">jobs, products &amp; services</span>{" "}
            shaping the future of quantum technology.
          </h1>
          <p className="hero-sub">
            Quantum5ocial connects students, researchers, and companies with
            curated opportunities, services and products across the global
            quantum ecosystem.
          </p>

          <div className="hero-tags">
            <span className="tag-chip">Intern, PhD, Postdoc, and Industry roles</span>
            <span className="tag-chip">Startups, Vendors, and Labs</span>
            <span className="tag-chip">Hardware · Software · Services</span>
          </div>
        </div>
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
              rewarding meaningful activity like completing your profile,
              posting jobs/products, and exploring the ecosystem.
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
            <div className="section-title">Built for the entire quantum community</div>
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
              Explore internships, MSc/PhD projects, and your first postdoc or
              industry role. Build your profile as you grow into the field.
            </p>
          </div>

          <div className="who-card">
            <div className="who-title-row">
              <span className="who-emoji">🧑‍🔬</span>
              <span className="who-title">Researchers &amp; labs</span>
            </div>
            <p className="who-text">
              Showcase your group, attract collaborators, and make it easier to
              find the right candidates for your quantum projects.
            </p>
          </div>

          <div className="who-card">
            <div className="who-title-row">
              <span className="who-emoji">🏢</span>
              <span className="who-title">Companies &amp; startups</span>
            </div>
            <p className="who-text">
              Post jobs, list your hero products, and reach a focused audience
              that already cares about quantum technologies.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

/* =========================
   RIGHT SIDEBAR (dynamic tiles)
   ========================= */

function HomeRightSidebar() {
  const [latestJob, setLatestJob] = useState<Job | null>(null);
  const [latestProduct, setLatestProduct] = useState<Product | null>(null);
  const [latestMember, setLatestMember] = useState<CommunityProfile | null>(null);

  const [loadingJob, setLoadingJob] = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadingMember, setLoadingMember] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadLatestJob = async () => {
      setLoadingJob(true);
      const { data, error } = await supabase
        .from("jobs")
        .select(
          "id, title, company_name, location, employment_type, remote_type, short_description"
        )
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (!error && data && data.length > 0) setLatestJob(data[0] as Job);
      else setLatestJob(null);

      setLoadingJob(false);
    };

    const loadLatestProduct = async () => {
      setLoadingProduct(true);
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, name, company_name, category, short_description, price_type, price_value, in_stock, image1_url"
        )
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (!error && data && data.length > 0) setLatestProduct(data[0] as Product);
      else setLatestProduct(null);

      setLoadingProduct(false);
    };

    const loadLatestMember = async () => {
      setLoadingMember(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, highest_education, affiliation, short_bio, role")
        .order("created_at", { ascending: false })
        .limit(1);

      if (cancelled) return;

      if (!error && data && data.length > 0) setLatestMember(data[0] as CommunityProfile);
      else setLatestMember(null);

      setLoadingMember(false);
    };

    loadLatestJob();
    loadLatestProduct();
    loadLatestMember();

    return () => {
      cancelled = true;
    };
  }, []);

  const formatJobMeta = (job: Job) =>
    [job.company_name, job.location, job.remote_type].filter(Boolean).join(" · ");

  const formatPrice = (p: Product) => {
    if (p.price_type === "fixed" && p.price_value) return p.price_value;
    if (p.price_type === "contact") return "Contact for price";
    return "";
  };

  const memberName = latestMember?.full_name || "Quantum member";
  const memberFirstName =
    typeof memberName === "string" ? memberName.split(" ")[0] || memberName : "Member";

  const memberProfileHref = latestMember ? `/profile/${latestMember.id}` : "/community";

  return (
    <div className="hero-tiles hero-tiles-vertical">
      {/* JOBS TILE */}
      <Link href="/jobs" className="hero-tile">
        <div className="hero-tile-inner">
          <div className="tile-label">Featured role</div>
          <div className="tile-title-row">
            <div className="tile-title">Hot opening</div>
            <div className="tile-icon-orbit">🧪</div>
          </div>

          {loadingJob ? (
            <p className="tile-text">Loading the newest job…</p>
          ) : !latestJob ? (
            <p className="tile-text">No jobs posted yet — be the first to add one.</p>
          ) : (
            <div style={{ marginTop: 8 }}>
              <Link
                href={`/jobs/${latestJob.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>
                  {latestJob.title || "Untitled role"}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, lineHeight: 1.35 }}>
                  {formatJobMeta(latestJob) || "Quantum role"}
                </div>
                {latestJob.short_description && (
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, lineHeight: 1.35 }}>
                    {latestJob.short_description.length > 90
                      ? latestJob.short_description.slice(0, 87) + "..."
                      : latestJob.short_description}
                  </div>
                )}
              </Link>
            </div>
          )}

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

      {/* PRODUCTS TILE */}
      <Link href="/products" className="hero-tile">
        <div className="hero-tile-inner">
          <div className="tile-label">Featured product</div>
          <div className="tile-title-row">
            <div className="tile-title">Product of the week</div>
            <div className="tile-icon-orbit">🔧</div>
          </div>

          {loadingProduct ? (
            <p className="tile-text">Loading the newest product…</p>
          ) : !latestProduct ? (
            <p className="tile-text">No products listed yet — add your first product.</p>
          ) : (
            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 12,
                  overflow: "hidden",
                  flexShrink: 0,
                  background: "rgba(15,23,42,0.9)",
                  border: "1px solid rgba(148,163,184,0.18)",
                }}
              >
                {latestProduct.image1_url ? (
                  <img
                    src={latestProduct.image1_url}
                    alt={latestProduct.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      opacity: 0.75,
                    }}
                  >
                    No image
                  </div>
                )}
              </div>

              <Link
                href={`/products/${latestProduct.id}`}
                style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>
                  {latestProduct.name}
                </div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, lineHeight: 1.35 }}>
                  {[latestProduct.company_name, latestProduct.category, formatPrice(latestProduct)]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
                {latestProduct.short_description && (
                  <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, lineHeight: 1.35 }}>
                    {latestProduct.short_description.length > 90
                      ? latestProduct.short_description.slice(0, 87) + "..."
                      : latestProduct.short_description}
                  </div>
                )}
              </Link>
            </div>
          )}

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

      {/* COMMUNITY TILE */}
      <Link href="/community" className="hero-tile">
        <div className="hero-tile-inner">
          <div className="tile-label">Featured member</div>
          <div className="tile-title-row">
            <div className="tile-title">Spotlight</div>
            <div className="tile-icon-orbit">🤝</div>
          </div>

          {loadingMember ? (
            <p className="tile-text">Loading the newest member…</p>
          ) : !latestMember ? (
            <p className="tile-text">No profiles found yet.</p>
          ) : (
            <div style={{ marginTop: 8, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <div
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 999,
                  overflow: "hidden",
                  flexShrink: 0,
                  border: "1px solid rgba(148,163,184,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                {latestMember.avatar_url ? (
                  <img
                    src={latestMember.avatar_url}
                    alt={memberFirstName}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                ) : (
                  memberFirstName.charAt(0).toUpperCase()
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={memberProfileHref} style={{ textDecoration: "none", color: "inherit" }}>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>
                    {memberName}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, lineHeight: 1.35 }}>
                    {[latestMember.highest_education, latestMember.role, latestMember.affiliation]
                      .filter(Boolean)
                      .join(" · ") || "Quantum5ocial community member"}
                  </div>
                  {latestMember.short_bio && (
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, lineHeight: 1.35 }}>
                      {latestMember.short_bio.length > 90
                        ? latestMember.short_bio.slice(0, 87) + "..."
                        : latestMember.short_bio}
                    </div>
                  )}
                </Link>
              </div>
            </div>
          )}

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
  );
}

// Tell _app.tsx to render the right sidebar for this page (no page-level AppLayout)
(Home as any).layoutProps = {
  variant: "three",
  right: <HomeRightSidebar />,
};
