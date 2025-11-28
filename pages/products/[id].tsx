// pages/products/[id].tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

type Product = {
  id: string;
  owner_id: string | null;
  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;
  specifications: string | null;
  product_url: string | null;
  keywords: string | null;
  price_type: string | null;      // 'fixed' | 'contact' | null
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
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load product
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
      }

      setLoading(false);
    };

    load();
  }, [id]);

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

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (error) {
      console.error("Error deleting product", error);
      setErrorMsg("Could not delete product. Please try again.");
      setDeleting(false);
      return;
    }

    router.push("/products");
  };

  if (loading) {
    return (
      <>
        <div className="bg-layer" />
        <Navbar />
        <div className="page" style={{ paddingTop: 40 }}>
          <section className="section">
            <p className="profile-muted">Loading product…</p>
          </section>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <div className="bg-layer" />
        <Navbar />
        <div className="page" style={{ paddingTop: 40 }}>
          <section className="section">
            <p className="profile-muted">
              Product not found or no longer available.
            </p>
          </section>
        </div>
      </>
    );
  }

    // 💰 Price: if price_type is 'fixed' and a value exists, show it. Otherwise "Contact for price".
  const hasFixedPrice =
    product.price_type === "fixed" && product.price_value !== null;

  const priceLabel = hasFixedPrice
    ? String(product.price_value) // handles both number and string
    : "Contact for price";

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

  return (
    <>
      <div className="bg-layer" />
      <Navbar />
      <div className="page">
        <section className="section">
          {/* Header with actions */}
          <div className="section-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="section-title">{product.name}</div>
              <div className="section-sub">
                {product.company_name
                  ? `Listed by ${product.company_name}`
                  : "Listed by unknown vendor"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/products" className="nav-ghost-btn">
                ← Back to products
              </Link>

              {isOwner && (
                <>
                  {/* For now: use the same UI as "List your product" */}
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
            {/* Top layout: images + main info */}
            <div className="product-detail-top">
              <div className="product-detail-images">
                {images.length > 0 ? (
                  images.map((url) => (
                    <div key={url} className="product-detail-image-box">
                      <img src={url} alt={product.name} />
                    </div>
                  ))
                ) : (
                  <div className="product-detail-image-placeholder">
                    No images provided
                  </div>
                )}
              </div>

              <div className="product-detail-main">
                {product.category && (
                  <div className="product-detail-category">
                    {product.category}
                  </div>
                )}

                {product.short_description && (
                  <p className="product-detail-short">
                    {product.short_description}
                  </p>
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

            {/* Bottom: technical text */}
            <div className="product-detail-body">
              {product.specifications && (
                <div className="product-detail-section">
                  <div className="profile-section-label">Specifications</div>
                  <p className="profile-summary-text">
                    {product.specifications}
                  </p>
                </div>
              )}
            </div>

            {errorMsg && (
              <p
                style={{
                  color: "#fecaca",
                  marginTop: 16,
                  fontSize: 13,
                }}
              >
                {errorMsg}
              </p>
            )}
          </div>

          {/* Optional small debug in dev */}
          {process.env.NODE_ENV === "development" && (
            <div style={{ marginTop: 20, fontSize: 11, color: "#64748b" }}>
              <div>Debug:</div>
              <div>current user id: {user?.id || "none"}</div>
              <div>product.owner_id: {product.owner_id || "null"}</div>
              <div>isOwner: {String(isOwner)}</div>
            </div>
          )}
        </section>
      </div>

      <style jsx>{`
        .product-detail-card {
          max-width: 1100px;
          margin: 0 auto;
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
          gap: 26px;
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

        .product-detail-image-box {
          border-radius: 14px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: #020617;
        }

        .product-detail-image-box img {
          width: 100%;
          height: 220px;
          object-fit: cover;
        }

        .product-detail-image-placeholder {
          height: 220px;
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

        .product-detail-category {
          display: inline-block;
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
          gap: 18px;
        }

        .product-detail-body {
          margin-top: 22px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .product-detail-section {
          max-width: 800px;
        }
      `}</style>
    </>
  );
}
