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
  created_by: string;
  company_name: string | null;
  product_name: string;
  description: string | null;
  specifications: string | null;
  keywords: string[] | null;
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

  const { user } = useSupabaseUser();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Load the product
  useEffect(() => {
    if (!id) return;
    loadProduct(id);
  }, [id]);

  const loadProduct = async (productId: string | string[]) => {
    setLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (error) {
      console.error("Error loading product:", error);
    } else {
      setProduct(data);
    }

    setLoading(false);
  };

  const handleDelete = async () => {
    if (!product) return;
    const confirmed = window.confirm("Are you sure you want to delete this product?");
    if (!confirmed) return;

    setDeleting(true);

    const { error } = await supabase.from("products").delete().eq("id", product.id);

    if (error) {
      alert("Error deleting product. Try again.");
      console.error(error);
      setDeleting(false);
      return;
    }

    alert("Product deleted.");
    router.push("/products");
  };

  if (loading) return <p style={{ padding: 30 }}>Loading product…</p>;
  if (!product) return <p style={{ padding: 30 }}>Product not found.</p>;

  const isOwner = user?.id === product.user_id;

  return (
    <>
      <div className="bg-layer" />
      <Navbar />

      <div className="page" style={{ paddingTop: 40 }}>
        <div className="section">
          <div className="section-header">
            <div>
              <div className="section-title">{product.product_name}</div>
              <div className="section-sub">Listed by {product.company_name ?? "Unknown vendor"}</div>
            </div>

            {isOwner && (
              <div style={{ display: "flex", gap: 12 }}>
                <Link href={`/products/${product.id}/edit`} className="nav-ghost-btn">
                  Edit
                </Link>
                <button
                  className="nav-cta"
                  style={{ background: "#ff3b3b", border: "none" }}
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </div>
            )}
          </div>

          {/* --- IMAGES --- */}
          {product.images && product.images.length > 0 && (
            <div style={{ marginTop: 20, display: "flex", gap: 16, overflowX: "auto" }}>
              {product.images.map((url) => (
                <img
                  key={url}
                  src={url}
                  style={{
                    width: 240,
                    height: 200,
                    objectFit: "cover",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
              ))}
            </div>
          )}

          {/* --- DETAILS --- */}
          <div style={{ marginTop: 32 }}>
            {product.description && (
              <p style={{ fontSize: 16, lineHeight: 1.6 }}>{product.description}</p>
            )}

            {product.specifications && (
              <div style={{ marginTop: 20 }}>
                <div className="profile-summary-label">Specifications</div>
                <pre
                  style={{
                    whiteSpace: "pre-wrap",
                    background: "rgba(255,255,255,0.05)",
                    padding: 16,
                    borderRadius: 8,
                    marginTop: 6,
                    fontSize: 14,
                  }}
                >
                  {product.specifications}
                </pre>
              </div>
            )}

            {/* Price */}
            <div style={{ marginTop: 20 }}>
              <div className="profile-summary-label">Price</div>
              <div className="profile-summary-text">
                {product.contact_for_price
                  ? "Contact vendor for pricing"
                  : product.price
                  ? `€ ${product.price.toLocaleString()}`
                  : "Not specified"}
              </div>
            </div>

            {/* Stock */}
            <div style={{ marginTop: 20 }}>
              <div className="profile-summary-label">Stock availability</div>
              <div className="profile-summary-text">
                {product.stock_quantity != null
                  ? `${product.stock_quantity} units available`
                  : "Stock not specified"}
              </div>
            </div>

            {/* Keywords */}
            {product.keywords && product.keywords.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <div className="profile-summary-label">Keywords</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {product.keywords.map((kw) => (
                    <span key={kw} className="profile-tag-chip">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Datasheet */}
            {product.datasheet_url && (
              <div style={{ marginTop: 30 }}>
                <a
                  href={product.datasheet_url}
                  target="_blank"
                  rel="noreferrer"
                  className="nav-ghost-btn"
                >
                  Download Datasheet
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
