import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import ProductCard from "../../components/ProductCard";

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
  keywords: string | null;
  price_type: "fixed" | "contact" | null;
  price_value: string | null;
  in_stock: boolean | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [priceFilter, setPriceFilter] = useState<"all" | "fixed" | "contact">(
    "all"
  );
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");

  // Load all products once
  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProducts(data as Product[]);
      }
      setLoading(false);
    };

    loadProducts();
  }, []);

  // Apply filters in memory
  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((p) => {
      // Search across name / company / description / keywords / category
      if (q) {
        const haystack = [
          p.name,
          p.company_name,
          p.short_description,
          p.keywords,
          p.category,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(q)) return false;
      }

      // Category filter
      if (categoryFilter && p.category !== categoryFilter) return false;

      // Price filter
      if (priceFilter === "fixed" && p.price_type !== "fixed") return false;
      if (priceFilter === "contact" && p.price_type !== "contact") return false;

      // Stock filter
      if (stockFilter === "in" && p.in_stock !== true) return false;
      if (stockFilter === "out" && p.in_stock !== false) return false;

      return true;
    });
  }, [products, search, categoryFilter, priceFilter, stockFilter]);

  const handleResetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setPriceFilter("all");
    setStockFilter("all");
  };

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          {/* Page header */}
          <div className="section-header" style={{ marginBottom: 18 }}>
            <div>
              <div className="section-title">Quantum Marketplace</div>
              <div className="section-sub">
                Browse quantum products from startups, labs, and companies
                worldwide.
              </div>
            </div>

            <Link href="/products/new" className="nav-cta">
              List your product
            </Link>
          </div>

          <div className="products-page-layout">
            {/* LEFT FILTERS */}
            <aside className="products-filters">
              <h3 className="filter-title">Filters</h3>

              {/* Search */}
              <div className="filter-block">
                <div className="filter-section-title">Search</div>
                <input
                  type="text"
                  placeholder="Name, company, keywords…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Category */}
              <div className="filter-block">
                <div className="filter-section-title">Category</div>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  style={{ width: "100%" }}
                >
                  <option value="">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="filter-block">
                <div className="filter-section-title">Price</div>
                <select
                  value={priceFilter}
                  onChange={(e) =>
                    setPriceFilter(e.target.value as "all" | "fixed" | "contact")
                  }
                  style={{ width: "100%" }}
                >
                  <option value="all">All</option>
                  <option value="fixed">Fixed price only</option>
                  <option value="contact">Contact for price only</option>
                </select>
              </div>

              {/* Stock */}
              <div className="filter-block">
                <div className="filter-section-title">Stock</div>
                <select
                  value={stockFilter}
                  onChange={(e) =>
                    setStockFilter(e.target.value as "all" | "in" | "out")
                  }
                  style={{ width: "100%" }}
                >
                  <option value="all">All</option>
                  <option value="in">In stock</option>
                  <option value="out">Out of stock</option>
                </select>
              </div>

              <button
                type="button"
                className="nav-ghost-btn"
                style={{ width: "100%", marginTop: 4, cursor: "pointer" }}
                onClick={handleResetFilters}
              >
                Reset filters
              </button>
            </aside>

            {/* RIGHT GRID */}
            <div className="products-grid">
              {loading ? (
                <p className="profile-muted">Loading products…</p>
              ) : filteredProducts.length === 0 ? (
                <p className="profile-muted">
                  No products match the selected filters.
                </p>
              ) : (
                filteredProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
