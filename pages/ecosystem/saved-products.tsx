// pages/ecosystem/saved-products.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

// ✅ IMPORTANT: use the SAME shopping cart icon component used in the tile.
// Replace the import below with your actual path.
// Examples (pick the real one in your repo):
// import CartIcon from "../../components/icons/CartIcon";
// import { CartIcon } from "../../components/icons";
// import ShoppingCartIcon from "../../components/icons/ShoppingCartIcon";
import CartIcon from "../../components/icons/CartIcon";

type SavedRow = {
  id: string;
  product: any; // Supabase nested product
};

export default function EcosystemSavedProductsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // search
  const [search, setSearch] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/ecosystem/saved-products");
    }
  }, [loading, user, router]);

  // ---- Load saved products ----
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return saved;

    return saved.filter((row) => {
      const p = row.product;
      if (!p) return false;

      const hay = [
        p.name,
        p.company_name,
        p.category,
        p.short_description,
        p.price_value,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });
  }, [saved, search]);

  const total = saved.length;

  if (!user && !loading) return null;

  return (
    <section className="section">
      {/* Header card — matches the ecosystem style */}
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className="section-title"
              style={{ display: "flex", gap: 12, alignItems: "center" }}
            >
              {/* Icon bubble — SAME shopping cart icon as tile */}
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#0f172a",
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <CartIcon />
              </div>

              <span>Saved products</span>

              {!loadingSaved && !error && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(56,189,248,0.45)",
                    color: "#7dd3fc",
                    whiteSpace: "nowrap",
                  }}
                >
                  {total} total
                </span>
              )}
            </div>

            <div className="section-sub" style={{ maxWidth: 560 }}>
              Products you&apos;ve bookmarked from the Quantum marketplace.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
            }}
          >
            <Link href="/ecosystem" className="section-link" style={{ fontSize: 13 }}>
              ← Back to ecosystem
            </Link>
            <Link href="/products" className="section-link" style={{ fontSize: 13 }}>
              Browse marketplace →
            </Link>
          </div>
        </div>

        {/* Search (pill style, like following page) */}
        {!loadingSaved && !error && total > 0 && (
          <div style={{ marginTop: 12, display: "flex", gap: 10, maxWidth: 640 }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search saved products…"
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
              type="button"
              onClick={() => setSearch((s) => s.trim())}
              style={{
                padding: "10px 16px",
                borderRadius: 999,
                border: "none",
                background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              Search
            </button>
          </div>
        )}

        {!loadingSaved && !error && total > 0 && search.trim() && (
          <div style={{ marginTop: 10, fontSize: 12, color: "rgba(148,163,184,0.95)" }}>
            Showing {filtered.length} result{filtered.length === 1 ? "" : "s"} for{" "}
            <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
              &quot;{search.trim()}&quot;
            </span>
          </div>
        )}
      </div>

      {/* States */}
      {loadingSaved ? (
        <p className="profile-muted">Loading saved products…</p>
      ) : error ? (
        <p className="profile-muted" style={{ color: "#f87171" }}>
          {error}
        </p>
      ) : total === 0 ? (
        <p className="profile-muted">
          You haven&apos;t saved any products yet. Tap the heart on a product to add
          it here.
        </p>
      ) : filtered.length === 0 ? (
        <div className="products-empty">
          No saved products matched{" "}
          <span style={{ fontWeight: 600 }}>&quot;{search.trim()}&quot;</span>.
        </div>
      ) : (
        <div className="products-grid">
          {filtered.map((row) => {
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
                    <div className="products-card-description">{p.short_description}</div>
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
  );
}

(EcosystemSavedProductsPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
