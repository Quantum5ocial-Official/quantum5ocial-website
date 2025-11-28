// pages/products.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type Product = {
  id: string;
  name: string;
  company_name: string | null;
  short_description: string | null;
  category: string | null;
  price_type: "fixed" | "contact";
  price_value: string | null;
  image1_url: string | null;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setProducts(data as Product[]);
      } else {
        console.error("Error loading products", error);
      }
      setLoading(false);
    };

    load();
  }, []);

  return (
    <>
      <div className="bg-layer" />
      <Navbar />

      <div className="page">
        <section className="section">
          <div className="section-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="section-title">Products</div>
              <div className="section-sub">
                Discover quantum hardware, software, tools, and components from
                across the ecosystem.
              </div>
            </div>

            <Link href="/products/new" className="nav-ghost-btn">
              List your product →
            </Link>
          </div>

          <div className="product-grid">
            {loading ? (
              <p className="profile-muted">Loading products…</p>
            ) : products.length === 0 ? (
              <p className="profile-muted">No products listed yet.</p>
            ) : (
              products.map((p) => {
                const img =
                  p.image1_url ?? "/placeholder-product.png"; // fallback

                const priceLabel =
                  p.price_type === "contact"
                    ? "Contact for price"
                    : p.price_value && p.price_value.trim() !== ""
                    ? p.price_value
                    : "Price on request";

                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.id}`}
                    className="product-card"
                  >
                    <div className="product-card-img-wrap">
                      <img src={img} alt={p.name} />
                    </div>

                    <div className="product-card-body">
                      <div className="product-card-title">{p.name}</div>

                      {p.company_name && (
                        <div className="product-card-company">
                          {p.company_name}
                        </div>
                      )}

                      {p.short_description && (
                        <div className="product-card-desc">
                          {p.short_description}
                        </div>
                      )}

                      <div className="product-card-footer">
                        <span className="product-card-price">
                          {priceLabel}
                        </span>
                        {p.category && (
                          <span className="product-card-category">
                            {p.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      </div>

      <style jsx>{`
        .product-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 24px;
          margin-top: 30px;
        }

        @media (max-width: 1100px) {
          .product-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .product-grid {
            grid-template-columns: repeat(1, minmax(0, 1fr));
          }
        }

        .product-card {
          background: rgba(15, 23, 42, 0.95);
          border-radius: 14px;
          border: 1px solid rgba(148, 163, 184, 0.25);
          text-decoration: none;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          transition: transform 0.18s ease, box-shadow 0.18s ease,
            border-color 0.18s ease;
        }

        .product-card:hover {
          transform: translateY(-4px);
          border-color: rgba(125, 211, 252, 0.6);
          box-shadow: 0 18px 40px rgba(15, 23, 42, 0.85);
        }

        .product-card-img-wrap {
          width: 100%;
          height: 180px;
          background: #020617;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .product-card-img-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .product-card-body {
          padding: 12px 14px 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .product-card-title {
          font-size: 15px;
          font-weight: 600;
          color: #e5e7eb;
        }

        .product-card-company {
          font-size: 13px;
          color: #a5b4fc;
        }

        .product-card-desc {
          margin-top: 4px;
          font-size: 13px;
          color: #9ca3af;
          line-height: 1.4;
          max-height: 3.6em;
          overflow: hidden;
        }

        .product-card-footer {
          margin-top: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .product-card-price {
          font-size: 14px;
          color: #7dd3fc;
          font-weight: 500;
        }

        .product-card-category {
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 999px;
          border: 1px solid rgba(148, 163, 184, 0.4);
          color: #cbd5f5;
          background: rgba(15, 23, 42, 0.9);
          white-space: nowrap;
        }
      `}</style>
    </>
  );
}
