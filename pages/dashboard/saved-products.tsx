// pages/dashboard/saved-products.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import LeftSidebar from "../../components/LeftSidebar";

type SavedRow = {
  id: string;
  product: any; // Supabase nested product
};

function SavedProductsRightSidebar() {
  return (
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
              A curated spotlight job from the Quantum Jobs Universe.
            </p>
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
              Highlighting a selected product from the Quantum Products Lab.
            </p>
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
              A standout researcher, founder, or quantum engineer.
            </p>
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
  );
}

export default function SavedProductsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard/saved-products");
    }
  }, [loading, user, router]);

  // ---- Load saved products for middle column ----
  useEffect(() => {
    const loadSaved = async () => {
      if (!user) return;

      setLoadingSaved(true);
      setError(null);

      const { data, error } = await supabase
        .from("saved_products")
        .select("id, product:products(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setSaved(data as SavedRow[]);
      } else {
        console.error("Error loading saved products", error);
        setSaved([]);
        setError("Could not load saved products.");
      }

      setLoadingSaved(false);
    };

    if (user) loadSaved();
  }, [user]);

  const countLabel = useMemo(() => {
    const n = saved.length;
    return `${n} product${n === 1 ? "" : "s"} saved`;
  }, [saved.length]);

  if (!user && !loading) return null;

  return (
    <section className="layout-main">
      <section className="section">
        <div className="section-header">
          <div>
            <div className="section-title">Saved products</div>
            <div className="section-sub">
              Products you&apos;ve bookmarked from the marketplace.
            </div>
          </div>

          {!loadingSaved && !error && (
            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              {countLabel}
            </div>
          )}
        </div>

        {loadingSaved ? (
          <p className="profile-muted">Loading saved products…</p>
        ) : error ? (
          <p className="profile-muted" style={{ color: "#f87171" }}>
            {error}
          </p>
        ) : saved.length === 0 ? (
          <p className="profile-muted">
            You haven&apos;t saved any products yet. Tap the heart on a product
            to add it here.
          </p>
        ) : (
          <div className="products-grid">
            {saved.map((row) => {
              const p = row.product;
              if (!p) return null;

              const hasImage = !!p.image1_url;
              const showFixedPrice =
                p.price_type === "fixed" && p.price_value;
              const company = p.company_name || "Unknown vendor";

              return (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="products-card"
                >
                  <div className="products-card-image">
                    {hasImage ? (
                      <img src={p.image1_url} alt={p.name} />
                    ) : (
                      <div className="products-card-image-placeholder">
                        No image
                      </div>
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
  );
}

// ✅ AppLayout configuration (matches your new pattern)
(SavedProductsPage as any).layoutProps = {
  variant: "three",
  left: <LeftSidebar />,
  right: <SavedProductsRightSidebar />,
};
