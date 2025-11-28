// pages/products.tsx
import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type Product = {
  id: string;
  owner_id: string;
  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;
  price_type: "fixed" | "contact" | null;
  price_value: string | null;
  in_stock: boolean | null;
  stock_quantity: number | null;
  image1_url: string | null;
  created_at: string;
};

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [priceTypeFilter, setPriceTypeFilter] = useState<"any" | "fixed" | "contact">("any");
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading products", error);
        setLoadError("Could not load products.");
        setProducts([]);
      } else {
        setProducts((data || []) as Product[]);
      }

      setLoading(false);
    };

    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((p) => {
      // Search in name, company, description, category
      if (q) {
        const haystack = [
          p.name,
          p.company_name || "",
          p.short_description || "",
          p.category || "",
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      // Category filter
      if (categoryFilter !== "all") {
        if ((p.category || "").toLowerCase() !== categoryFilter.toLowerCase()) {
          return false;
        }
      }

      // Price type filter
      if (priceTypeFilter === "fixed" && p.price_type !== "fixed") return false;
      if (priceTypeFilter === "contact" && p.price_type !== "contact") return false;

      // In-stock filter
      if (inStockOnly && !p.in_stock) return false;

      return true;
    });
  }, [products, search, categoryFilter, priceTypeFilter, inStockOnly]);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header" style={{ marginBottom: 18 }}>
            <div>
              <div className="section-title">Quantum Products Lab</div>
              <div className="section-sub">
                Discover hardware, electronics, software tools, and services from across
                the quantum ecosystem.
              </div>
            </div>

            <Link href="/products/new" className="nav-cta">
              List your product
            </Link>
          </div>

          <div className="products-layout">
            {/* LEFT: FILTER SIDEBAR */}
            <aside className="products-filters">
              <div className="products-filters-section">
                <div className="products-filters-title">Search</div>
                <input
                  type="text"
                  className="products-filters-search"
                  placeholder="Search by name, lab, or keyword…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="products-filters-section">
                <div className="products-filters-title">Category</div>
                <div className="products-filters-chips">
                  <button
                    type="button"
                    className={
                      categoryFilter === "all"
                        ? "products-filter-chip active"
                        : "products-filter-chip"
                    }
                    onClick={() => setCategoryFilter("all")}
                  >
                    All
                  </button>
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={
                        categoryFilter === cat
                          ? "products-filter-chip active"
                          : "products-filter-chip"
                      }
                      onClick={() => setCategoryFilter(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="products-filters-section">
                <div className="products-filters-title">Price</div>
                <div className="products-filters-radio">
                  <label>
                    <input
                      type="radio"
                      name="priceFilter"
                      value="any"
                      checked={priceTypeFilter === "any"}
                      onChange={() => setPriceTypeFilter("any")}
                    />
                    Any
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="priceFilter"
                      value="fixed"
                      checked={priceTypeFilter === "fixed"}
                      onChange={() => setPriceTypeFilter("fixed")}
                    />
                    Fixed price
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="priceFilter"
                      value="contact"
                      checked={priceTypeFilter === "contact"}
                      onChange={() => setPriceTypeFilter("contact")}
                    />
                    Contact for price
                  </label>
                </div>
              </div>

              <div className="products-filters-section">
                <div className="products-filters-title">Availability</div>
                <label className="products-filters-checkbox">
                  <input
                    type="checkbox"
                    checked={inStockOnly}
                    onChange={(e) => setInStockOnly(e.target.checked)}
                  />
                  Only show in-stock products
                </label>
              </div>
            </aside>

            {/* RIGHT: RESULTS GRID */}
            <div className="products-results">
              <div className="products-results-header">
                {loading ? (
                  <span className="products-status">Loading products…</span>
                ) : loadError ? (
                  <span className="products-status error">{loadError}</span>
                ) : (
                  <span className="products-status">
                    {filteredProducts.length} product
                    {filteredProducts.length === 1 ? "" : "s"} found
                  </span>
                )}
              </div>

              <div className="products-grid">
                {!loading &&
                  !loadError &&
                  filteredProducts.map((p) => {
                    const hasImage = !!p.image1_url;
                    const showFixedPrice = p.price_type === "fixed" && p.price_value;
                    const company = p.company_name || "Unknown vendor";

                    return (
                      <Link
                        href={`/products/${p.id}`}
                        key={p.id}
                        className="products-card"
                      >
                        <div className="products-card-image">
                          {hasImage ? (
                            <img src={p.image1_url!} alt={p.name} />
                          ) : (
                            <div className="products-card-image-placeholder">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="products-card-body">
                          <div className="products-card-name">{p.name}</div>
                          <div className="products-card-vendor">{company}</div>

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

                {!loading && !loadError && filteredProducts.length === 0 && (
                  <div className="products-empty">
                    No products match these filters. Try adjusting your search.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
