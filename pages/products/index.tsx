// pages/products/index.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });
const LeftSidebar: any = dynamic(
  () => import("../../components/LeftSidebar"),
  { ssr: false }
);

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

const PRODUCT_TYPE_FILTERS = [
  "All",
  "Hardware",
  "Software",
  "Service",
  "Consulting",
  "Other",
];

const TECH_TYPE_FILTERS = [
  "All",
  "Cryogenics",
  "Control / AWG / RF",
  "Readout / Amplifiers",
  "Fabrication / Foundry",
  "Qubits / Chips / Devices",
  "Software / Simulation",
  "Other",
];

const ORG_TYPE_FILTERS = [
  "All",
  "Startup",
  "Company",
  "University / Lab",
  "Consortium / Institute",
  "Other",
];

const DOMAIN_FILTERS = [
  "All",
  "Quantum computing",
  "Quantum communication",
  "Quantum sensing / metrology",
  "Quantum materials / fabrication",
  "Generic / platform",
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

  // extra optional metadata for richer filters
  product_type: string | null; // Hardware / Software / Service / Consulting / Other
  technology_type: string | null; // coarse tech modality
  organisation_type: string | null; // Startup / Company / University / ...
  quantum_domain: string | null; // Computing / Communication / Sensing / ...
};

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
};

// Minimal org summary for sidebar tile
type MyOrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
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
  const [productTypeFilter, setProductTypeFilter] = useState<string>("All");
  const [techTypeFilter, setTechTypeFilter] = useState<string>("All");
  const [orgTypeFilter, setOrgTypeFilter] = useState<string>("All");
  const [domainFilter, setDomainFilter] = useState<string>("All");
  const [priceFilter, setPriceFilter] = useState<"all" | "fixed" | "contact">(
    "all"
  );
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");

  // ==== LEFT SIDEBAR STATE (profile + counts + org) ====
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [savedJobsCount, setSavedJobsCount] = useState<number | null>(null);
  const [savedProductsCount, setSavedProductsCount] = useState<number | null>(
    null
  );
  const [entangledCount, setEntangledCount] = useState<number | null>(null);
  const [myOrg, setMyOrg] = useState<MyOrgSummary | null>(null);

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

  // --- Load saved products for current user (ids + count) ---
  useEffect(() => {
    const loadSaved = async () => {
      if (!user) {
        setSavedIds(new Set());
        setSavedProductsCount(null);
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
        setSavedProductsCount(0);
      } else {
        const idsArray = (data || []).map((row: any) =>
          String(row.product_id)
        );
        setSavedIds(new Set<string>(idsArray));
        setSavedProductsCount(idsArray.length);
      }
      setLoadingSaved(false);
    };

    loadSaved();
  }, [user]);

  // --- Load saved jobs count + entangled count for sidebar ---
  useEffect(() => {
    const loadSidebarCounts = async () => {
      if (!user) {
        setSavedJobsCount(null);
        setEntangledCount(null);
        return;
      }

      try {
        // Saved jobs count
        const { data: savedJobsRows, error: savedJobsErr } = await supabase
          .from("saved_jobs")
          .select("job_id")
          .eq("user_id", user.id);

        if (!savedJobsErr && savedJobsRows) {
          setSavedJobsCount(savedJobsRows.length);
        } else {
          setSavedJobsCount(0);
        }

        // Entangled states – unique "other" user ids
        const { data: connRows, error: connErr } = await supabase
          .from("connections")
          .select("user_id, target_user_id, status")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (!connErr && connRows && connRows.length > 0) {
          const otherIds = Array.from(
            new Set(
              connRows.map((c: any) =>
                c.user_id === user.id ? c.target_user_id : c.user_id
              )
            )
          );
          setEntangledCount(otherIds.length);
        } else {
          setEntangledCount(0);
        }
      } catch (e) {
        console.error("Error loading sidebar counts", e);
        setSavedJobsCount(0);
        setEntangledCount(0);
      }
    };

    loadSidebarCounts();
  }, [user]);

  // ---- Load current user profile for LeftSidebar ----
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfileSummary(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfileSummary(data as ProfileSummary);
      } else {
        setProfileSummary(null);
      }
    };

    loadProfile();
  }, [user]);

  // ---- Load user's first organization for LeftSidebar ----
  useEffect(() => {
    const loadMyOrg = async () => {
      if (!user) {
        setMyOrg(null);
        return;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, logo_url")
        .eq("created_by", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setMyOrg(data as MyOrgSummary);
      } else {
        setMyOrg(null);
      }
    };

    loadMyOrg();
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
      setSavedProductsCount((prev) => (prev !== null ? prev - 1 : prev));
    } else {
      const { error: err } = await supabase
        .from("saved_products")
        .insert({ user_id: user.id, product_id: productId });

      if (err) {
        console.error("Error saving product", err);
        return;
      }
      setSavedIds((prev) => new Set(prev).add(productId));
      setSavedProductsCount((prev) => (prev !== null ? prev + 1 : prev));
    }
  };

  const normalize = (v: string | null) => (v || "").toLowerCase();

  const matchesCategoryFilter = (filterValue: string, fieldValue: string | null) => {
    if (filterValue === "All") return true;
    return normalize(fieldValue) === filterValue.toLowerCase();
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
          p.product_type,
          p.technology_type,
          p.quantum_domain,
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

      // product type (Hardware / Software / Service / Consulting / Other)
      if (!matchesCategoryFilter(productTypeFilter, p.product_type)) {
        return false;
      }

      // technology type
      if (!matchesCategoryFilter(techTypeFilter, p.technology_type)) {
        return false;
      }

      // organisation type
      if (!matchesCategoryFilter(orgTypeFilter, p.organisation_type)) {
        return false;
      }

      // quantum domain
      if (!matchesCategoryFilter(domainFilter, p.quantum_domain)) {
        return false;
      }

      // price type
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
  }, [
    products,
    searchText,
    categoryFilter,
    productTypeFilter,
    techTypeFilter,
    orgTypeFilter,
    domainFilter,
    priceFilter,
    stockFilter,
  ]);

  const heroProducts = filteredProducts.slice(0, 2);
  const remainingProducts = filteredProducts.slice(heroProducts.length);

  const resetFilters = () => {
    setSearchText("");
    setCategoryFilter("all");
    setProductTypeFilter("All");
    setTechTypeFilter("All");
    setOrgTypeFilter("All");
    setDomainFilter("All");
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

        {/* Same 3-column layout as homepage / jobs */}
        <main className="layout-3col">
          {/* ========== LEFT: profile sidebar via LeftSidebar ========== */}
          <LeftSidebar
            user={user}
            profileSummary={profileSummary}
            myOrg={myOrg}
            entangledCount={entangledCount}
            savedJobsCount={savedJobsCount}
            savedProductsCount={savedProductsCount}
          />

          {/* ========== MIDDLE: header + products (layout-main) ========== */}
          <section className="layout-main">
            <section className="section">
              {/* STICKY HEADER + SEARCH */}
              <div className="jobs-main-header">
                <div className="section-header">
                  <div>
                    <div
                      className="section-title"
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      Quantum Marketplace
                      {!loadingProducts && !error && (
                        <span
                          style={{
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 999,
                            background: "rgba(56,189,248,0.15)",
                            border: "1px solid rgba(56,189,248,0.35)",
                            color: "#7dd3fc",
                          }}
                        >
                          {filteredProducts.length} products
                        </span>
                      )}
                    </div>
                    <div
                      className="section-sub"
                      style={{ maxWidth: "480px", lineHeight: "1.45" }}
                    >
                      Browse quantum hardware, software, and services from
                      startups, labs, and companies.
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

                {/* Center-column search bar */}
                <div className="jobs-main-search">
                  <div
                    style={{
                      width: "100%",
                      borderRadius: 999,
                      padding: "2px",
                      background:
                        "linear-gradient(90deg, rgba(56,189,248,0.5), rgba(129,140,248,0.5))",
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 999,
                        background: "rgba(15,23,42,0.97)",
                        padding: "6px 12px",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          opacity: 0.85,
                        }}
                      >
                        🔍
                      </span>
                      <input
                        style={{
                          border: "none",
                          outline: "none",
                          background: "transparent",
                          color: "#e5e7eb",
                          fontSize: 14,
                          width: "100%",
                        }}
                        placeholder="Search by name, company, keywords…"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* STATUS LINE */}
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
                <div
                  className="products-status"
                  style={{ marginBottom: 8, color: "#f97373" }}
                >
                  {error}
                </div>
              )}

              {/* EMPTY STATE */}
              {filteredProducts.length === 0 && !loadingProducts ? (
                <div className="products-empty">
                  No products match these filters yet.
                </div>
              ) : (
                <>
                  {/* HERO PRODUCTS (top recommendations) */}
                  {heroProducts.length > 0 && (
                    <div
                      style={{
                        marginBottom: 32,
                        padding: 16,
                        borderRadius: 16,
                        border: "1px solid rgba(56,189,248,0.35)",
                        background:
                          "radial-gradient(circle at top left, rgba(34,211,238,0.12), rgba(15,23,42,1))",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          marginBottom: 12,
                          gap: 12,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "#7dd3fc",
                              marginBottom: 4,
                            }}
                          >
                            Highlighted for you
                          </div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 600,
                              background:
                                "linear-gradient(90deg,#22d3ee,#a855f7)",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                            }}
                          >
                            Hero products & services
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            textAlign: "right",
                          }}
                        >
                          For now based on your filters. <br />
                          Later: AI-driven ranking.
                        </div>
                      </div>

                      <div className="products-grid products-grid-market">
                        {heroProducts.map((p) => {
                          const isSaved = savedIds.has(p.id);
                          return (
                            <Link
                              key={p.id}
                              href={`/products/${p.id}`}
                              className="products-card"
                            >
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
                                <div className="products-card-header">
                                  <div>
                                    <div className="products-card-name">
                                      {p.name}
                                    </div>
                                    {p.company_name && (
                                      <div className="products-card-vendor">
                                        {p.company_name}
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    className="product-save-btn"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleSaved(p.id);
                                    }}
                                    aria-label={
                                      isSaved
                                        ? "Remove from saved products"
                                        : "Save product"
                                    }
                                  >
                                    {isSaved ? "❤️" : "🤍"}
                                  </button>
                                </div>

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
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ALL REMAINING PRODUCTS */}
                  {remainingProducts.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {heroProducts.length > 0 && (
                        <div
                          style={{
                            height: 1,
                            margin: "4px 0 20px",
                            background:
                              "linear-gradient(90deg, rgba(148,163,184,0), rgba(148,163,184,0.6), rgba(148,163,184,0))",
                          }}
                        />
                      )}

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "baseline",
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "rgba(148,163,184,0.9)",
                              marginBottom: 3,
                            }}
                          >
                            Browse everything
                          </div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 600,
                            }}
                          >
                            All products
                          </div>
                        </div>
                      </div>

                      <div className="products-grid products-grid-market">
                        {remainingProducts.map((p) => {
                          const isSaved = savedIds.has(p.id);
                          return (
                            <Link
                              key={p.id}
                              href={`/products/${p.id}`}
                              className="products-card"
                            >
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
                                <div className="products-card-header">
                                  <div>
                                    <div className="products-card-name">
                                      {p.name}
                                    </div>
                                    {p.company_name && (
                                      <div className="products-card-vendor">
                                        {p.company_name}
                                      </div>
                                    )}
                                  </div>

                                  <button
                                    type="button"
                                    className="product-save-btn"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      toggleSaved(p.id);
                                    }}
                                    aria-label={
                                      isSaved
                                        ? "Remove from saved products"
                                        : "Save product"
                                    }
                                  >
                                    {isSaved ? "❤️" : "🤍"}
                                  </button>
                                </div>

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
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </section>

          {/* ========== RIGHT: filters (moved from old left) ========== */}
          <aside className="layout-right sticky-col">
            <div className="sidebar-card">
              {/* Category */}
              <div className="products-filters-section">
                <div className="products-filters-title">Category</div>
                <select
                  className="products-filters-input"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="all">All categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Product type */}
              <div className="products-filters-section">
                <div className="products-filters-title">Product type</div>
                <select
                  className="products-filters-input"
                  value={productTypeFilter}
                  onChange={(e) => setProductTypeFilter(e.target.value)}
                >
                  {PRODUCT_TYPE_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Technology type */}
              <div className="products-filters-section">
                <div className="products-filters-title">Technology</div>
                <select
                  className="products-filters-input"
                  value={techTypeFilter}
                  onChange={(e) => setTechTypeFilter(e.target.value)}
                >
                  {TECH_TYPE_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Organisation type */}
              <div className="products-filters-section">
                <div className="products-filters-title">Organisation</div>
                <select
                  className="products-filters-input"
                  value={orgTypeFilter}
                  onChange={(e) => setOrgTypeFilter(e.target.value)}
                >
                  {ORG_TYPE_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantum domain */}
              <div className="products-filters-section">
                <div className="products-filters-title">Quantum domain</div>
                <select
                  className="products-filters-input"
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                >
                  {DOMAIN_FILTERS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="products-filters-section">
                <div className="products-filters-title">Price</div>
                <select
                  className="products-filters-input"
                  value={priceFilter}
                  onChange={(e) =>
                    setPriceFilter(
                      e.target.value as "all" | "fixed" | "contact"
                    )
                  }
                >
                  <option value="all">All</option>
                  <option value="fixed">Fixed price</option>
                  <option value="contact">Contact for price</option>
                </select>
              </div>

              {/* Stock */}
              <div className="products-filters-section">
                <div className="products-filters-title">Stock</div>
                <select
                  className="products-filters-input"
                  value={stockFilter}
                  onChange={(e) =>
                    setStockFilter(e.target.value as "all" | "in" | "out")
                  }
                >
                  <option value="all">All</option>
                  <option value="in">In stock</option>
                  <option value="out">Out of stock</option>
                </select>
              </div>

              <button
                type="button"
                className="nav-ghost-btn"
                style={{ width: "100%", marginTop: 8 }}
                onClick={resetFilters}
              >
                Reset filters
              </button>
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
