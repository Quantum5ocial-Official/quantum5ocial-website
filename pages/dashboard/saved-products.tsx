// pages/dashboard/saved-products.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import { useRouter } from "next/router";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

type SavedRow = {
  id: string;
  product: any;
};

export default function SavedProductsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  // Counts for quick dashboard sidebar
  const [savedJobsCount, setSavedJobsCount] = useState<number>(0);
  const [savedProductsCount, setSavedProductsCount] = useState<number>(0);
  const [entangledCount, setEntangledCount] = useState<number>(0);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard/saved-products");
    }
  }, [loading, user, router]);

  // Load saved products
  useEffect(() => {
    const loadSaved = async () => {
      if (!user) return;

      setLoadingSaved(true);

      const { data, error } = await supabase
        .from("saved_products")
        .select("id, product:products(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setSaved(data);
        setSavedProductsCount(data.length);
      }

      setLoadingSaved(false);
    };

    if (user) loadSaved();
  }, [user]);

  // Load counts for quick dashboard
  useEffect(() => {
    if (!user) return;

    const loadCounts = async () => {
      const { data: jobs } = await supabase
        .from("saved_jobs")
        .select("id")
        .eq("user_id", user.id);

      setSavedJobsCount(jobs?.length || 0);

      const { data: ents } = await supabase
        .from("entangled_states")
        .select("id")
        .eq("user_id", user.id);

      setEntangledCount(ents?.length || 0);
    };

    loadCounts();
  }, [user]);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* LEFT SIDEBAR */}
          <aside className="layout-left sticky-col">
            <div className="sidebar-card profile-sidebar-card">
              <div className="profile-sidebar-header">
                <div className="profile-sidebar-avatar-wrapper">
                  <div className="profile-sidebar-avatar">Q5</div>
                </div>
                <div className="profile-sidebar-name">Your dashboard</div>
              </div>
            </div>

            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>

              <Link href="/dashboard/entangled-states" className="dashboard-sidebar-link">
                Entangled states <span>{entangledCount}</span>
              </Link>

              <Link href="/dashboard/saved-jobs" className="dashboard-sidebar-link">
                Saved jobs <span>{savedJobsCount}</span>
              </Link>

              <Link href="/dashboard/saved-products" className="dashboard-sidebar-link">
                Saved products <span>{savedProductsCount}</span>
              </Link>
            </div>

            <div className="sidebar-footer">
              <img src="/Q5_white_bg.png" alt="Q5" width={26} height={26} />
              <span>Quantum5ocial</span>
            </div>
          </aside>

          {/* MIDDLE COLUMN */}
          <section className="layout-main">
            <section className="section">
              <div className="section-header">
                <div>
                  <div className="section-title">Saved products</div>
                  <div className="section-sub">
                    Products you’ve bookmarked from the marketplace.
                  </div>
                </div>

                {!loadingSaved && (
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    {saved.length} product{saved.length === 1 ? "" : "s"} saved
                  </div>
                )}
              </div>

              {loadingSaved ? (
                <p className="profile-muted">Loading saved products…</p>
              ) : saved.length === 0 ? (
                <p className="profile-muted">
                  You haven’t saved any products yet. Tap the heart on a product to add it here.
                </p>
              ) : (
                <div className="products-grid">
                  {saved.map((row) => {
                    const p = row.product;
                    if (!p) return null;

                    const hasImage = !!p.image1_url;
                    const showFixedPrice = p.price_type === "fixed" && p.price_value;
                    const company = p.company_name || "Unknown vendor";

                    return (
                      <Link key={p.id} href={`/products/${p.id}`} className="products-card">
                        <div className="products-card-image">
                          {hasImage ? (
                            <img src={p.image1_url} alt={p.name} />
                          ) : (
                            <div className="products-card-image-placeholder">No image</div>
                          )}
                        </div>

                        <div className="products-card-body">
                          <div className="products-card-header">
                            <div>
                              <div className="products-card-name">{p.name}</div>
                              <div className="products-card-vendor">{company}</div>
                            </div>
                            <div className="products-card-fav">❤️</div>
                          </div>

                          {p.short_description && (
                            <div className="products-card-description">
                              {p.short_description}
                            </div>
                          )}

                          <div className="products-card-footer">
                            <div className="products-card-price">
                              {showFixedPrice ? p.price_value : "Contact for price"}
                            </div>
                            {p.category && (
                              <div className="products-card-category">{p.category}</div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </section>

          {/* RIGHT SIDEBAR — Spotlight tiles */}
          <aside className="layout-right sticky-col">
            <div className="hero-tiles hero-tiles-vertical">
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum roles spotlight</div>
                    <div className="tile-icon-orbit">🧪</div>
                  </div>
                  <p className="tile-text">
                    A curated spotlight job from the Quantum Jobs Universe.
                  </p>
                  <div className="tile-cta">Jobs spotlight ›</div>
                </div>
              </div>

              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum product of the week</div>
                    <div className="tile-icon-orbit">🔧</div>
                  </div>
                  <p className="tile-text">
                    Highlighting a selected product from the Quantum Products Lab.
                  </p>
                  <div className="tile-cta">Product spotlight ›</div>
                </div>
              </div>

              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Featured quantum talent</div>
                    <div className="tile-icon-orbit">🤝</div>
                  </div>
                  <p className="tile-text">
                    A standout researcher, founder, or quantum engineer.
                  </p>
                  <div className="tile-cta">Talent spotlight ›</div>
                </div>
              </div>
            </div>

            <div className="right-footer">© 2025 Quantum5ocial</div>
          </aside>
        </main>
      </div>
    </>
  );
}
