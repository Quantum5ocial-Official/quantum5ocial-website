// pages/products/[id].tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

type Product = {
  id: string;
  created_by: string;
  name: string;
  company_name: string | null;
  description: string | null;
  specifications: string | null;
  keywords: string | null;
  price_type: "fixed" | "contact";
  price: number | null;
  stock_status: "in_stock" | "out_of_stock";
  stock_quantity: number | null;
  main_image_url: string | null;
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
    const loadProduct = async () => {
      if (!id) return;
      setLoading(true);
      setErrorMsg(null);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
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

    loadProduct();
  }, [id]);

  const isOwner =
    !userLoading &&
    user &&
    product &&
    product.created_by &&
    product.created_by === user.id;

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

    // After delete, go back to products list
    router.push("/products");
  };

  const priceDisplay =
    product?.price_type === "fixed" && product.price != null
      ? `${product.price.toLocaleString()} CHF`
      : "Contact for price";

  const allImages = [
    product?.main_image_url,
    product?.image2_url,
    product?.image3_url,
  ].filter(Boolean) as string[];

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="section-title">Product details</div>
              <div className="section-sub">
                Marketplace listing inside Quantum5ocial.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Link href="/products" className="nav-ghost-btn">
                ← Back to products
              </Link>

              {isOwner && (
                <>
                  <Link
                    href={`/products/${product?.id}/edit`}
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
            {loading ? (
              <p className="profile-muted">Loading product…</p>
            ) : !product ? (
              <p className="profile-muted">
                Product not found or no longer available.
              </p>
            ) : (
              <>
                {/* Top: images + main info */}
                <div className="product-detail-top">
                  <div className="product-detail-images">
                    {allImages.length > 0 ? (
                      allImages.map((url, idx) => (
                        <div key={idx} className="product-detail-image-box">
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
                    <h1 className="product-detail-title">{product.name}</h1>

                    {product.company_name && (
                      <div className="product-detail-company">
                        {product.company_name}
                      </div>
                    )}

                    <div className="product-detail-price">{priceDisplay}</div>

                    <div className="product-detail-stock">
                      {product.stock_status === "in_stock"
                        ? product.stock_quantity != null
                          ? `In stock · ${product.stock_quantity} pcs`
                          : "In stock"
                        : "Out of stock"}
                    </div>

                    {product.keywords && (
                      <div className="profile-tags" style={{ marginTop: 12 }}>
                        {product.keywords
                          .split(",")
                          .map((k) => k.trim())
                          .filter(Boolean)
                          .map((k) => (
                            <span
                              key={k}
                              className="profile-tag-chip"
                            >
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
                      <div className="profile-section-label">
                        Specifications
                      </div>
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
              </>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
