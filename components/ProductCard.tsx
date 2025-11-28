// components/ProductCard.tsx
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type Product = {
  id: string;
  name: string;
  company_name: string | null;
  category: string | null;
  short_description: string | null;
  price_type: "fixed" | "contact" | null;
  price_value: string | null;
};

type Props = {
  product: Product;
};

export default function ProductCard({ product }: Props) {
  const { user } = useSupabaseUser();
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Check if this product is already saved
  useEffect(() => {
    const checkSaved = async () => {
      if (!user) {
        setIsSaved(false);
        return;
      }

      const { data, error } = await supabase
        .from("saved_products")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      if (!error && data) {
        setIsSaved(true);
      } else {
        setIsSaved(false);
      }
    };

    checkSaved();
  }, [user, product.id]);

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || saving) return;

    setSaving(true);

    try {
      if (isSaved) {
        // remove
        await supabase
          .from("saved_products")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", product.id);

        setIsSaved(false);
      } else {
        // add
        await supabase.from("saved_products").insert({
          user_id: user.id,
          product_id: product.id,
        });

        setIsSaved(true);
      }
    } catch (err) {
      console.error("Error toggling saved product", err);
    } finally {
      setSaving(false);
    }
  };

  const showPrice =
    product.price_type === "fixed" && product.price_value
      ? product.price_value
      : "Contact for price";

  return (
    <Link href={`/products/${product.id}`} className="product-card">
      <div className="product-card-inner">
        {/* Heart */}
        <button
          className="product-heart-btn"
          onClick={toggleSave}
          aria-label={isSaved ? "Remove from saved" : "Save product"}
        >
          <span
            style={{
              fontSize: 20,
              color: isSaved ? "#f97373" : "#e5e7eb",
            }}
          >
            {isSaved ? "♥" : "♡"}
          </span>
        </button>

        {/* Content */}
        <div className="product-card-body">
          <div className="product-card-title">{product.name}</div>
          {product.company_name && (
            <div className="product-card-company">{product.company_name}</div>
          )}
          {product.short_description && (
            <div className="product-card-desc">
              {product.short_description}
            </div>
          )}
          <div className="product-card-price">{showPrice}</div>
          {product.category && (
            <div className="product-card-tag">{product.category}</div>
          )}
        </div>
      </div>
    </Link>
  );
}
