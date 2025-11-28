import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

export default function ProductCard({ product }) {
  const { user } = useSupabaseUser();
  const [saved, setSaved] = useState(false);

  // Load saved state
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("saved_products")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", product.id)
        .maybeSingle();

      setSaved(!!data);
    };
    load();
  }, [user, product.id]);

  // Toggle save/unsave
  const toggleSave = async () => {
    if (!user) {
      alert("Please sign in to save products");
      return;
    }

    if (!saved) {
      // save
      await supabase.from("saved_products").insert({
        user_id: user.id,
        product_id: product.id,
      });
      setSaved(true);
    } else {
      // unsave
      await supabase
        .from("saved_products")
        .delete()
        .eq("user_id", user.id)
        .eq("product_id", product.id);
      setSaved(false);
    }
  };

  return (
    <div className="product-card">
      {/* Heart button */}
      <button
        className="product-save-btn"
        onClick={(e) => {
          e.preventDefault();
          toggleSave();
        }}
      >
        {saved ? "❤️" : "🤍"}
      </button>

      {/* Main content */}
      <Link href={`/products/${product.id}`} className="product-card-link">
        <img
          src={product.image1_url || "/placeholder.png"}
          className="product-card-img"
          alt={product.name}
        />

        <div className="product-card-body">
          <div className="product-card-title">{product.name}</div>
          <div className="product-card-company">{product.company_name}</div>
          <div className="product-card-price">
            {product.price_type === "fixed"
              ? product.price_value
              : "Contact for price"}
          </div>
        </div>
      </Link>
    </div>
  );
}
