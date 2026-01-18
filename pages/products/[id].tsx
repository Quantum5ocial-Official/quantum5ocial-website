// pages/products/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type Product = {
  id: string;
  owner_id: string | null;
  org_id: string | null; // link to organization
  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;
  specifications: string | null;

  // ✅ NEW
  full_description?: string | null;

  product_url: string | null;
  keywords: string | null;
  price_type: string | null;
  price_value: string | null;
  in_stock: boolean | null;
  stock_quantity: number | null;
  image1_url: string | null;
  image2_url: string | null;
  image3_url: string | null;
  datasheet_url: string | null;
  created_at: string;
};

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const { user, loading: userLoading } = useSupabaseUser();
  const [product, setProduct] = useState<Product | null>(null);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id as string)
        .maybeSingle();

      if (error) {
        console.error("Error loading product", error);
        setErrorMsg("Could not load product.");
        setProduct(null);
      } else {
        setProduct(data as Product);

        if (data && (data as any).org_id) {
          const { data: orgData, error: orgErr } = await supabase
            .from("organizations")
            .select("slug")
            .eq("id", (data as any).org_id)
            .maybeSingle<{ slug: string }>();

          if (!orgErr && orgData) setOrgSlug(orgData.slug);
        }
      }

      setLoading(false);
    };

    load();
  }, [id]);

  useEffect(() => {
    setActiveIndex(0);
  }, [product?.image1_url, product?.image2_url, product?.image3_url]);

  const ownerId = product?.owner_id ?? null;
  const isOwner = !!user && !!ownerId && !userLoading && user.id === ownerId;

  const handleDelete = async () => {
    if (!product || !isOwner) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this product? This cannot be undone."
    );
    if (!confirmed) return;

    setDeleting(true);
    setErrorMsg(null);

    const { error } = await supabase.from("products").delete().eq("id", product.id);

    if (error) {
      console.error("Error deleting product", error);
      setErrorMsg("Could not delete product. Please try again.");
      setDeleting(false);
      return;
    }

    // Sync to search index
    await fetch("/api/search/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "product",
        data: { id: product.id },
        action: "delete"
      })
    });

    setDeleting(false);
    router.push("/products");
  };

  if (loading) {
    return (
      <section className="section">
        <p className="profile-muted">Loading product…</p>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="section">
        <p className="profile-muted">Product not found or no longer available.</p>
      </section>
    );
  }

  const hasFixedPrice = product.price_type === "fixed" && product.price_value !== null;
  const priceLabel = hasFixedPrice ? String(product.price_value) : "Contact for price";

  const stockLabel =
    product.in_stock === false
      ? "Out of stock"
      : product.stock_quantity != null
        ? `In stock · ${product.stock_quantity} pcs`
        : product.in_stock
          ? "In stock"
          : "Stock not specified";

  const keywordList =
    product.keywords
      ?.split(",")
      .map((k) => k.trim())
      .filter(Boolean) ?? [];

  const images = [product.image1_url, product.image2_url, product.image3_url].filter(
    Boolean
  ) as string[];

  const showPrev = () => {
    if (images.length <= 1) return;
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const showNext = () => {
    if (images.length <= 1) return;
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <section className="section">
      <div className="product-detail-shell">
        <div className="section-header product-detail-header">
          <div>
            <div className="section-title">{product.name}</div>
            <div className="section-sub">
              {product.company_name ? (
                orgSlug ? (
                  <Link href={`/orgs/${encodeURIComponent(orgSlug)}`}>
                    <a style={{ color: "#7dd3fc", textDecoration: "underline" }}>
                      Listed by {product.company_name}
                    </a>
                  </Link>
                ) : (
                  <>Listed by {product.company_name}</>
                )
              ) : (
                "Listed by unknown vendor"
              )}
            </div>
          </div>

          {/* ✅ single-row actions */}
          <div className="product-actions">
            <Link href="/products">
              <a className="nav-ghost-btn">← Back to products</a>
            </Link>

            {isOwner && (
              <>
                <button
                  type="button"
                  className="nav-ghost-btn"
                  style={{ cursor: "pointer" }}
                  onClick={() => router.push(`/products/new?id=${product.id}`)}
                >
                  Edit product
                </button>

                <button
                  onClick={handleDelete}
                  className="nav-cta"
                  style={{ background: "#b91c1c", cursor: "pointer" }}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="product-detail-card">
          <div className="product-detail-top">
            <div className="product-detail-images">
              {images.length > 0 ? (
                <div className="product-detail-carousel">
                  {images.length > 1 && (
                    <>
                      <button
                        className="product-detail-carousel-arrow left"
                        onClick={showPrev}
                        aria-label="Previous image"
                        type="button"
                      >
                        ‹
                      </button>
                      <button
                        className="product-detail-carousel-arrow right"
                        onClick={showNext}
                        aria-label="Next image"
                        type="button"
                      >
                        ›
                      </button>
                    </>
                  )}

                  <div className="product-detail-image-box">
                    <img src={images[activeIndex]} alt={product.name} />
                  </div>

                  {images.length > 1 && (
                    <div className="product-detail-dots">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={
                            "product-detail-dot" + (idx === activeIndex ? " active" : "")
                          }
                          onClick={() => setActiveIndex(idx)}
                          aria-label={`Show image ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="product-detail-image-placeholder">No images provided</div>
              )}
            </div>

            <div className="product-detail-main">
              {product.category && (
                <div className="product-detail-category">{product.category}</div>
              )}

              {product.short_description && (
                <p className="product-detail-short">{product.short_description}</p>
              )}

              <div className="product-detail-meta">
                <div>
                  <div className="profile-summary-label">Price</div>
                  <div className="profile-summary-text">{priceLabel}</div>
                </div>

                <div>
                  <div className="profile-summary-label">Stock</div>
                  <div className="profile-summary-text">{stockLabel}</div>
                </div>
              </div>

              {product.product_url && (
                <div style={{ marginTop: 14 }}>
                  <a
                    href={product.product_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#7dd3fc", fontSize: 14 }}
                  >
                    Visit product page ↗
                  </a>
                </div>
              )}

              {keywordList.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div className="profile-tags-label">Keywords</div>
                  <div className="profile-tags">
                    {keywordList.map((k) => (
                      <span key={k} className="profile-tag-chip">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {product.datasheet_url && (
                <div style={{ marginTop: 16 }}>
                  <a
                    href={product.datasheet_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#7dd3fc", fontSize: 14 }}
                  >
                    View datasheet (PDF)
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="product-detail-body">
            {product.specifications && (
              <div className="product-detail-section">
                <div className="profile-section-label">Specifications</div>
                <p className="profile-summary-text" style={{ whiteSpace: "pre-wrap" }}>
                  {product.specifications}
                </p>
              </div>
            )}

            {/* ✅ NEW: Full description below specs */}
            {!!(product.full_description || "").trim() && (
              <div className="product-detail-section">
                <div className="profile-section-label">Full description</div>
                <p className="profile-summary-text" style={{ whiteSpace: "pre-wrap" }}>
                  {(product.full_description || "").trim()}
                </p>
              </div>
            )}
          </div>

          {errorMsg && (
            <p style={{ color: "#fecaca", marginTop: 16, fontSize: 13 }}>{errorMsg}</p>
          )}
        </div>

        {process.env.NODE_ENV === "development" && (
          <div style={{ marginTop: 20, fontSize: 11, color: "#64748b" }}>
            <div>Debug:</div>
            <div>current user id: {user?.id || "none"}</div>
            <div>product.owner_id: {product.owner_id || "null"}</div>
            <div>isOwner: {String(isOwner)}</div>
            <div>linked org slug: {orgSlug || "none"}</div>
          </div>
        )}
      </div>

      <style jsx>{`
        .product-detail-shell {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
        }

        .product-detail-header {
          margin-bottom: 18px;
          align-items: flex-start;
        }

        /* ✅ keep actions on one row */
        .product-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: nowrap;
          white-space: nowrap;
        }

        @media (max-width: 700px) {
          .product-actions {
            flex-wrap: wrap; /* allow wrap only on small screens */
          }
        }

        .product-detail-card {
          width: 100%;
          padding: 24px 22px 28px;
          border-radius: 18px;
          background: radial-gradient(
              circle at top left,
              rgba(56, 189, 248, 0.06),
              transparent 55%
            ),
            rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(148, 163, 184, 0.25);
        }

        .product-detail-top {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(0, 2fr);
          gap: 32px;
        }

        @media (max-width: 900px) {
          .product-detail-top {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        .product-detail-images {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .product-detail-carousel {
          position: relative;
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: #020617;
        }

        .product-detail-image-box img {
          width: 100%;
          height: 300px;
          object-fit: cover;
          display: block;
        }

        .product-detail-carousel-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.7);
          background: rgba(15, 23, 42, 0.96);
          color: #e5e7eb;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 16px;
          transition: all 0.15s ease-out;
        }

        .product-detail-carousel-arrow.left {
          left: 18px;
        }

        .product-detail-carousel-arrow.right {
          right: 18px;
        }

        .product-detail-carousel-arrow:hover {
          border-color: rgba(56, 189, 248, 0.9);
          box-shadow: 0 0 12px rgba(56, 189, 248, 0.6);
        }

        .product-detail-dots {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 6px;
        }

        .product-detail-dot {
          width: 9px;
          height: 9px;
          border-radius: 999px;
          border: none;
          padding: 0;
          background: rgba(148, 163, 184, 0.35);
          cursor: pointer;
          transition: transform 0.12s ease, background 0.12s ease;
        }

        .product-detail-dot:hover {
          transform: scale(1.15);
        }

        .product-detail-dot.active {
          background: #22d3ee;
        }

        .product-detail-image-placeholder {
          height: 300px;
          border-radius: 14px;
          border: 1px dashed rgba(148, 163, 184, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          color: rgba(148, 163, 184, 0.8);
        }

        .product-detail-main {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        /* ✅ category pill fits text */
        .product-detail-category {
          display: inline-flex;
          width: fit-content;
          align-self: flex-start;
          margin-bottom: 4px;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          color: #cbd5f5;
          background: rgba(15, 23, 42, 0.9);
        }

        .product-detail-short {
          margin-top: 2px;
          font-size: 14px;
          color: #9ca3af;
        }

        .product-detail-meta {
          margin-top: 10px;
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
        }

        .product-detail-body {
          margin-top: 22px;
          padding-top: 16px;
          border-top: 1px solid rgba(31, 41, 55, 0.9);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .product-detail-section {
          max-width: 800px;
        }
      `}</style>
    </section>
  );
}

(ProductDetailPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
