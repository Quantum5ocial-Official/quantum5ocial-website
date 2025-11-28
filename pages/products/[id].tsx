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
  company_name: string | null;
  product_name: string;
  description: string | null;
  specifications: string | null;
  keywords: string | string[] | null;
  price: number | null;
  contact_for_price: boolean;
  stock_quantity: number | null;
  datasheet_url: string | null;
  images: string[] | null;
  created_at: string;
};

export default function ProductDetail() {
  const router = useRouter();
  const { id } = router.query;

  const { user, loading: userLoading } = useSupabaseUser();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load the product
  useEffect(() => {
    if (!id) return;

    const loadProduct = async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id as string)
        .maybeSingle();

      if (error) {
        console.error("Error loading product:", error);
        setErrorMsg("Could not load product.");
        setProduct(null);
      } else {
        setProduct(data as Product);
      }

      setLoading(false);
    };

    loadProduct();
  }, [id]);

  // Who owns this product?
  const ownerId = product?.owner_id ?? null;
  const isOwner =
    !!user && !!ownerId && !userLoading && user.id === ownerId;

  const handleDelete = async () => {
    if (!product) return;
    if (!isOwner) return;

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

  const priceDisplay =
    product.contact_for_price || product.price == null
      ? "Contact for price"
      : `${product.price.toLocaleString()} €`;

  // Normalise keywords: could be text[] or comma-separated string
  const keywordList: string[] =
    typeof product.keywords === "string"
      ? product.keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : product.keywords || [];

  const imageList = product.images || [];

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          {/* Header with actions */}
          <div className="section-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="section-title">{product.product_name}</div>
              <div className="section-sub">
                Listed by {product.company_name || "Unknown vendor"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/products" className="nav-ghost-btn">
                ← Back to products
              </Link>

              {isOwner && (
                <>
                  <Link
                    href={`/products/${product.id}/edit`}
                    className="nav-ghost-btn"
                  >
                    Edit product
                  </Link>
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
            {/* Top: images + main info */}
            <div className="product-detail-top">
              <div className="product-detail-images">
                {imageList.length > 0 ? (
                  imageList.map((url) => (
                    <div key={url} className="product-detail-image-box">
                      <img src={url} alt={product.product_name} />
                    </div>
                  ))
                ) : (
                  <div className="product-detail-image-placeholder">
                    No images provided
                  </div>
                )}
              </div>

              <div className="product-detail-main">
                <h1 className="product-detail-title">
                  {product.product_name}
                </h1>

                {product.company_name && (
                  <div className="product-detail-company">
                    {product.company_name}
                  </div>
                )}

                <div className="product-detail-price">{priceDisplay}</div>

                <div className="product-detail-stock">
                  {product.stock_quantity != null
                    ? `In stock · ${product.stock_quantity} pcs`
                    : "Stock not specified"}
                </div>

                {keywordList.length > 0 && (
                  <div className="profile-tags" style={{ marginTop: 12 }}>
                    {keywordList.map((k) => (
                      <span key={k} className="profile-tag-chip">
                        {k}
                      </span>
                    ))}
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

            {/* Description / specs */}
            <div className="product-detail-body">
              {product.description && (
                <div className="product-detail-section">
                  <div className="profile-section-label">Description</div>
                  <p className="profile-summary-text">
                    {product.description}
                  </p>
                </div>
              )}

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
    </>
  );
}
