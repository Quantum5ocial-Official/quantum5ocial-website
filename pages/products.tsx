import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type Product = {
  id: string;
  created_at: string;
  owner_id: string | null;
  name: string;
  company_name: string | null;
  short_description: string | null;
  specifications: string | null;
  keywords: string | null;
  category: string | null;
  product_url: string | null;
  datasheet_url: string | null;
  image1_url: string | null;
  image2_url: string | null;
  image3_url: string | null;
  in_stock: boolean | null;
  stock_quantity: number | null;
  price_type: string | null;   // 'fixed' or 'contact'
  price_value: string | null;  // text description when fixed
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

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const [priceFilter, setPriceFilter] = useState<string>("All"); // All | Fixed | Contact
  const [stockFilter, setStockFilter] = useState<string>("All"); // All | In | Out

  // Fetch products
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading products", error);
        setProducts([]);
      } else {
        setProducts(data as Product[]);
      }

      setLoading(false);
    };

    loadProducts();
  }, []);

  const filteredProducts = products.filter((p) => {
  // Category
  const matchesCategory =
    categoryFilter === "All" ||
    !categoryFilter ||
    (p.category || "").toLowerCase() === categoryFilter.toLowerCase();

  // Text search
  const text =
    (p.name || "") +
    " " +
    (p.company_name || "") +
    " " +
    (p.short_description || "") +
    " " +
    (p.specifications || "") +
    " " +
    (p.keywords || "");

  const matchesSearch = text.toLowerCase().includes(search.toLowerCase());

  // Price filter
  const isFixed = p.price_type === "fixed" && !!p.price_value;
  const isContact = p.price_type !== "fixed" || !p.price_value;

  const matchesPrice =
    priceFilter === "All" ||
    (priceFilter === "Fixed" && isFixed) ||
    (priceFilter === "Contact" && isContact);

  // Stock filter
  const isOut =
    p.in_stock === false ||
    (p.stock_quantity !== null && p.stock_quantity === 0);

  const isIn = !isOut;

  const matchesStock =
    stockFilter === "All" ||
    (stockFilter === "In" && isIn) ||
    (stockFilter === "Out" && isOut);

  return matchesCategory && matchesSearch && matchesPrice && matchesStock;
});

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header" style={{ alignItems: "flex-start" }}>
            <div>
              <div className="section-title">Quantum product marketplace</div>
              <div className="section-sub">
                Discover hardware, software, and services from quantum startups,
                vendors, and labs.
              </div>
            </div>

            <div>
              <Link href="/products/new" className="nav-cta">
                List your product
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="products-filters">
  <input
    type="text"
    placeholder="Search by product, company, tags…"
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="products-search"
  />

  <select
    value={categoryFilter}
    onChange={(e) => setCategoryFilter(e.target.value)}
    className="products-select"
  >
    <option value="All">All categories</option>
    {CATEGORIES.map((c) => (
      <option key={c} value={c}>
        {c}
      </option>
    ))}
  </select>

  <select
    value={priceFilter}
    onChange={(e) => setPriceFilter(e.target.value)}
    className="products-select"
  >
    <option value="All">All prices</option>
    <option value="Fixed">Fixed price</option>
    <option value="Contact">Contact for price</option>
  </select>

  <select
    value={stockFilter}
    onChange={(e) => setStockFilter(e.target.value)}
    className="products-select"
  >
    <option value="All">All stock</option>
    <option value="In">In stock</option>
    <option value="Out">Out of stock</option>
  </select>
</div>

          {/* Product cards */}
          <div className="products-list">
            {loading && (
              <div className="products-loading">Loading products…</div>
            )}

            {!loading && filteredProducts.length === 0 && (
              <div className="products-empty">
                No products listed yet.  
                Be the first vendor to{" "}
                <Link href="/products/new" className="product-link">
                  list a product
                </Link>
                .
              </div>
            )}

            {!loading &&
              filteredProducts.map((p) => {
                const images = [p.image1_url, p.image2_url, p.image3_url].filter(
                  Boolean
                ) as string[];
                const priceLabel =
                  p.price_type === "fixed" && p.price_value
                    ? p.price_value
                    : "Contact for price";
                const stockLabel =
                  p.in_stock === false
                    ? "Out of stock"
                    : p.stock_quantity && p.stock_quantity > 0
                    ? `In stock • ${p.stock_quantity} pcs`
                    : "In stock";

                return (
                  <article key={p.id} className="product-card">
                    <div className="product-header">
                      <h3 className="product-name">{p.name}</h3>
                      {p.category && (
                        <span className="product-category">{p.category}</span>
                      )}
                    </div>

                    {p.company_name && (
                      <div className="product-company">{p.company_name}</div>
                    )}

                    {images.length > 0 && (
                      <div
                        style={{
                          marginTop: 6,
                          marginBottom: 4,
                          display: "flex",
                          gap: 6,
                          overflow: "hidden",
                        }}
                      >
                        {images.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`${p.name} image ${idx + 1}`}
                            style={{
                              width: "32%",
                              borderRadius: 8,
                              objectFit: "cover",
                              maxHeight: 120,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {p.short_description && (
                      <p className="product-short">{p.short_description}</p>
                    )}

                    {p.specifications && (
                      <p
                        style={{
                          margin: "2px 0 4px",
                          fontSize: 12,
                          color: "#9ca3af",
                        }}
                      >
                        {p.specifications}
                      </p>
                    )}

                    {p.keywords && (
                      <div className="product-tags">
                        {p.keywords.split(",").map((tag) => (
                          <span key={tag.trim()} className="product-tag-chip">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="product-footer">
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <span className="product-price-model">
                          {priceLabel}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            color:
                              p.in_stock === false ? "#f97373" : "#a3e635",
                          }}
                        >
                          {stockLabel}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          alignItems: "flex-end",
                        }}
                      >
                        {p.datasheet_url && (
                          <a
                            href={p.datasheet_url}
                            target="_blank"
                            rel="noreferrer"
                            className="product-link"
                          >
                            View datasheet
                          </a>
                        )}
                        {p.product_url && (
                          <a
                            href={p.product_url}
                            target="_blank"
                            rel="noreferrer"
                            className="product-link"
                          >
                            View product
                          </a>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
          </div>
        </section>
      </div>
    </>
  );
}
