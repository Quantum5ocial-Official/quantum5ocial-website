// pages/products/index.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

const CATEGORIES = [
  "Cryogenics",
  "Control Electronics",
  "Readout / Amplifiers",
  "Fabrication Services",
  "Qubits / Devices",
  "Software / Simulation",
  "Consulting",
  "Other",
];

type Product = {
  id: string;
  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;
  price_type: "fixed" | "contact" | null;
  price_value: string | null;
  in_stock: boolean | null;
  stock_quantity: number | null;
  image1_url: string | null;
  image2_url: string | null;
  image3_url: string | null;
};

export default function ProductsPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loadingSaved, setLoadingSaved] = useState(false);

  // Filters
  const [searchText, setSearchText] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priceFilter, setPriceFilter] = useState<"all" | "fixed" | "contact">(
    "all"
  );
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");

  // --- Load products ---
  useEffect(() => {
    const loadProducts = async () => {
      setLoadingProducts(true);
      setError(null);

      const { data, error: err } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (err) {
        console.error("Error loading products", err);
        setError("Could not load products. Please try again.");
        setProducts([]);
      } else {
        setProducts((data || []) as Product[]);
      }

      setLoadingProducts(false);
    };

    loadProducts();
  }, []);

  // --- Load saved products for current user ---
  useEffect(() => {
    const loadSaved = async () => {
      if (!user) {
        setSavedIds(new Set());
        return;
      }
      setLoadingSaved(true);
      const { data, error: err } = await supabase
        .from("saved_products")
        .select("product_id")
        .eq("user_id", user.id);

      if (err) {
        console.error("Error loading saved products", err);
        setSavedIds(new Set());
      } else {
        const ids = new Set<string>(
          (data || []).map((row: any) => String(row.product_id))
        );
        setSavedIds(ids);
      }
      setLoadingSaved(false);
    };

    loadSaved();
  }, [user]);

  // --- Toggle save / unsave ---
  const toggleSaved = async (productId: string) => {
    if (!user) {
      router.push("/auth?redirect=/products");
      return;
    }

    const isSaved = savedIds.has(productId);

    if (isSaved) {
      const { error: err } = await supabase
        .from("saved_products")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", productId);

      if (err) {
        console.error("Error removing saved product", err);
        return;
      }
      setSavedIds((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    } else {
      const { error: err } = await supabase
        .from("saved_products")
        .insert({ user_id: user.id, product_id: productId });

      if (err) {
        console.error("Error saving product", err);
        return;
      }
      setSavedIds((prev) => new Set(prev).add(productId));
    }
  };

  // --- Filtered & derived lists ---
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // search
      const q = searchText.trim().toLowerCase();
      if (q) {
        const haystack = [
          p.name,
          p.company_name,
          p.short_description,
          p.category,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      // category
      if (categoryFilter !== "all") {
        if (!p.category || p.category !== categoryFilter) return false;
      }

      // price
      if (priceFilter !== "all") {
        const pt = p.price_type || "contact";
        if (priceFilter === "fixed" && pt !== "fixed") return false;
        if (priceFilter === "contact" && pt !== "contact") return false;
      }

      // stock
      if (stockFilter !== "all") {
        const inStock = !!p.in_stock;
        if (stockFilter === "in" && !inStock) return false;
        if (stockFilter === "out" && inStock) return false;
      }

      return true;
    });
  }, [products, searchText, categoryFilter, priceFilter, stockFilter]);

  const resetFilters = () => {
    setSearchText("");
    setCategoryFilter("all");
    setPriceFilter("all");
    setStockFilter("all");
  };

  const formatPrice = (p: Product) => {
    if (p.price_type === "fixed" && p.price_value) return p.price_value;
    return "Contact for price";
  };

  const formatStock = (p: Product) => {
    if (p.in_stock) {
      if (p.stock_quantity != null) {
        return `In stock · ${p.stock_quantity} pcs`;
      }
      return "In stock";
    }
    if (p.in_stock === false) return "Out of stock";
    return "Stock not specified";
  };

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header" style={{ marginBottom: 18 }}>
            <div>
              <div className="section-title">Quantum Marketplace</div>
              <div className="section-sub">
                Browse quantum products from startups, labs, and companies
                worldwide.
              </div>
            </div>

            <button
              className="nav-cta"
              style={{ cursor: "pointer" }}
              onClick={() => router.push("/products/new")}
            >
              List your product
            </button>
          </div>

          <div className="products-layout">
            {/* LEFT: filters */}
            <aside className="products-filters">
              <div className="products-filters-section">
                <div className="products-filters-title">Search</div>
                <input
                  className="products-filters-search"
                  type="text"
                  placeholder="Name, company, keywords..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
              </div>

              <div className="products-filters-section">
                <div className="products-filters-title">Category</div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 13,
                  }}
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="products-filters-section">
                <div className="products-filters-title">Price</div>
                <select
                  value={priceFilter}
                  onChange={(e) =>
                    setPriceFilter(e.target.value as "all" | "fixed" | "contact")
                  }
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 13,
                  }}
                >
                  <option value="all">All</option>
                  <option value="fixed">Fixed price</option>
                  <option value="contact">Contact for price</option>
                </select>
              </div>

              <div className="products-filters-section">
                <div className="products-filters-title">Stock</div>
                <select
                  value={stockFilter}
                  onChange={(e) =>
                    setStockFilter(e.target.value as "all" | "in" | "out")
                  }
                  style={{
                    width: "100%",
                    padding: "6px 10px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.4)",
                    background: "rgba(15,23,42,0.9)",
                    color: "#e5e7eb",
                    fontSize: 13,
                  }}
                >
                  <option value="all">All</option>
                  <option value="in">In stock</option>
                  <option value="out">Out of stock</option>
                </select>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                style={{
                  marginTop: 8,
                  width: "100%",
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.5)",
                  background: "rgba(15,23,42,0.95)",
                  color: "#e5e7eb",
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Reset filters
              </button>
            </aside>

            {/* RIGHT: results */}
            <main className="products-results">
              <div className="products-results-header">
                <div className="products-status">
                  {loadingProducts
                    ? "Loading products…"
                    : `${filteredProducts.length} product${
                        filteredProducts.length === 1 ? "" : "s"
                      }`}
                  {loadingSaved && " · updating saved…"}
                </div>
              </div>

              {error && (
                <div className="products-status error" style={{ marginBottom: 8 }}>
                  {error}
                </div>
              )}

              {filteredProducts.length === 0 && !loadingProducts ? (
                <div className="products-empty">
                  No products match these filters yet.
                </div>
              ) : (
                <div className="products-grid">
                  {filteredProducts.map((p) => {
                    const isSaved = savedIds.has(p.id);

                    return (
                      <div key={p.id} className="products-card">
                        {/* Heart / save button */}
                        <button
                          type="button"
                          className="product-save-btn"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleSaved(p.id);
                          }}
                          aria-label={
                            isSaved ? "Remove from saved products" : "Save product"
                          }
                        >
                          {isSaved ? "❤️" : "🤍"}
                        </button>

                        <Link href={`/products/${p.id}`}>
                          <div className="products-card-image">
                            {p.image1_url ? (
                              <img src={p.image1_url} alt={p.name} />
                            ) : (
                              <div className="products-card-image-placeholder">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="products-card-body">
                            <div className="products-card-name">{p.name}</div>

                            {p.company_name && (
                              <div className="products-card-vendor">
                                {p.company_name}
                              </div>
                            )}

                            {p.short_description && (
                              <div className="products-card-description">
                                {p.short_description}
                              </div>
                            )}

                            <div className="products-card-footer">
                              <span className="products-card-price">
                                {formatPrice(p)}
                              </span>
                              {p.category && (
                                <span className="products-card-category">
                                  {p.category}
                                </span>
                              )}
                            </div>

                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 11,
                                color: "#9ca3af",
                              }}
                            >
                              {formatStock(p)}
                            </div>
                          </div>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </main>
          </div>
        </section>
      </div>
    </>
  );
}
