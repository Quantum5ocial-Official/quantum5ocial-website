import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import ProductCard from "../../components/ProductCard";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load all products
  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error) setProducts(data || []);
      setLoading(false);
    };

    loadProducts();
  }, []);

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
                Browse quantum products from startups, labs, and companies worldwide.
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

              <div className="filter-block">
                <div className="filter-section-title">Category</div>
                {/* we will fill this later */}
                <p style={{ fontSize: 13, color: "#aaa" }}>Coming soon…</p>
              </div>

              <div className="filter-block">
                <div className="filter-section-title">Price</div>
                <p style={{ fontSize: 13, color: "#aaa" }}>Coming soon…</p>
              </div>

              <div className="filter-block">
                <div className="filter-section-title">Stock</div>
                <p style={{ fontSize: 13, color: "#aaa" }}>Coming soon…</p>
              </div>
            </aside>

            {/* RIGHT GRID */}
            <div className="products-grid">
              {loading ? (
                <p className="profile-muted">Loading products…</p>
              ) : products.length === 0 ? (
                <p className="profile-muted">No products listed yet.</p>
              ) : (
                products.map((p: any) => <ProductCard key={p.id} product={p} />)
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
