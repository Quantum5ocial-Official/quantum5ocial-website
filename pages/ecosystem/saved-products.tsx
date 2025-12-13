// pages/ecosystem/saved-products.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

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

  // NEW: search
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

  const countLabel = useMemo(() => {
    const n = saved.length;
    return `${n} product${n === 1 ? "" : "s"} saved`;
  }, [saved.length]);

  if (!user && !loading) return null;

  return (
    <section className="section">
      {/* Header */}
      <div className="section-header" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="section-title">Saved products</div>
          <div className="section-sub" style={{ maxWidth: 560 }}>
            Products you’ve bookmarked from the Quantum marketplace.
          </div>
        </div>

        {!loadingSaved && !error && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {countLabel}
          </div>
        )}
      </div>

      {/* Search */}
      {!loadingSaved && saved.length > 0 && (
        <div style={{ marginTop: 12, marginBottom: 18, maxWidth: 640 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved products… (name, vendor, category)"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid rgba(148,163,184,0.5)",
              background: "rgba(15,23,42,0.95)",
              color: "#e5e7eb",
              fontSize: 14,
              outline: "none",
            }}
          />
          {search.trim() && (
            <div
              style={{
                marginTop: 8,
                fontSize: 12,
                color: "rgba(148,163,184,0.95)",
              }}
            >
              Showing {filtered.length} result
              {filtered.length === 1 ? "" : "s"} for{" "}
              <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
                “{search.trim()}”
              </span>
            </div>
          )}
        </div>
      )}

      {/* States */}
      {loadingSaved ? (
        <p className="profile-muted">Loading saved products…</p>
      ) : error ? (
        <p className="profile-muted" style={{ color: "#f87171" }}>
          {error}
        </p>
      ) : saved.length === 0 ? (
        <p className="profile-muted">
          You haven’t saved any products yet. Tap the heart on a product to add
          it here.
        </p>
      ) : filtered.length === 0 ? (
        <div className="products-empty">
          No saved products matched{" "}
          <span style={{ fontWeight: 600 }}>“{search.trim()}”</span>.
        </div>
      ) : (
        <div className="products-grid">
          {filtered.map((row) => {
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
                      <div className="products-card-category">
                        {p.category}
                      </div>
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
