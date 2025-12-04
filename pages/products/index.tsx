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
};

export default function ProductsPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  // ---------- LOAD PRODUCTS ----------
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      setProducts((data || []) as Product[]);
      setLoading(false);
    };

    load();
  }, []);

  // ---------- LOAD SAVED PRODUCTS ----------
  useEffect(() => {
    if (!user) {
      setSavedIds(new Set());
      return;
    }

    const loadSaved = async () => {
      const { data } = await supabase
        .from("saved_products")
        .select("product_id")
        .eq("user_id", user.id);

      setSavedIds(
        new Set((data || []).map((x: any) => String(x.product_id)))
      );
    };

    loadSaved();
  }, [user]);

  const toggleSaved = async (id: string) => {
    if (!user) {
      router.push("/auth?redirect=/products");
      return;
    }

    const already = savedIds.has(id);

    if (already) {
      await supabase
        .from("saved_products")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", id);

      setSavedIds((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
    } else {
      await supabase
        .from("saved_products")
        .insert({ user_id: user.id, product_id: id });

      setSavedIds((prev) => new Set(prev).add(id));
    }
  };

  // ---------- FILTERS ----------
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return products.filter((p) => {
      if (q) {
        const hay = `${p.name} ${p.company_name} ${p.category} ${p.short_description}`
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (category !== "all" && p.category !== category) return false;

      return true;
    });
  }, [products, search, category]);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Quantum Marketplace</div>
              <div className="section-sub">
                Browse quantum products from startups, labs, and companies worldwide.
              </div>
            </div>
          </div>

          {/* ============================================
                  3-COLUMN LAYOUT
          ============================================ */}
          <div className="products-3col">
            {/* LEFT COLUMN — FILTERS */}
            <aside className="products-left">
              <div className="products-filter-box">
                <div className="products-filters-title">Search</div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="products-filter-input"
                  placeholder="Search products..."
                />
              </div>

              <div className="products-filter-box">
                <div className="products-filters-title">Category</div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="products-filter-input"
                >
                  <option value="all">All</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </aside>

            {/* MIDDLE COLUMN — RESULTS */}
            <main className="products-middle">
              <div className="products-middle-header">
                <div className="products-status">
                  {loading
                    ? "Loading..."
                    : `${filtered.length} product${filtered.length === 1 ? "" : "s"}`}
                </div>

                {/* BUTTON ON TOP RIGHT */}
                <button
                  className="nav-cta"
                  onClick={() => router.push("/products/new")}
                >
                  List your product
                </button>
              </div>

              <div className="products-grid">
                {filtered.map((p) => {
                  const isSaved = savedIds.has(p.id);

                  return (
                    <div key={p.id} className="products-card">
                      {/* ❤️ Save Button */}
                      <button
                        className="product-heart"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSaved(p.id);
                        }}
                      >
                        {isSaved ? "❤️" : "🤍"}
                      </button>

                      <Link href={`/products/${p.id}`}>
                        <div className="products-card-image">
                          {p.image1_url ? (
                            <img src={p.image1_url} alt={p.name} />
                          ) : (
                            <div className="products-card-image-placeholder">No image</div>
                          )}
                        </div>

                        <div className="products-card-body">
                          <div className="products-card-name">{p.name}</div>
                          <div className="products-card-vendor">
                            {p.company_name || "Unknown vendor"}
                          </div>

                          {p.short_description && (
                            <div className="products-card-description">
                              {p.short_description}
                            </div>
                          )}

                          <div className="products-card-footer">
                            <span className="products-card-price">
                              {p.price_type === "fixed"
                                ? p.price_value
                                : "Contact for price"}
                            </span>
                            {p.category && (
                              <span className="products-card-category">{p.category}</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            </main>

            {/* RIGHT COLUMN — FEATURED */}
            <aside className="products-right">
              <div className="featured-box">
                <div className="featured-title">Featured</div>
                <div className="featured-tile">Coming soon…</div>
                <div className="featured-tile">Sponsored product slot</div>
              </div>
            </aside>
          </div>
        </section>
      </div>
    </>
  );
}
