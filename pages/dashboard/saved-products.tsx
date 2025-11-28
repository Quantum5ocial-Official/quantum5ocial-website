// pages/dashboard/saved-products.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import { useRouter } from "next/router";
import ProductCard from "../../components/ProductCard";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

type SavedRow = {
  id: string;
  product: any; // Supabase will nest the full product here
};

export default function SavedProductsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard/saved-products");
    }
  }, [loading, user, router]);

  useEffect(() => {
    const loadSaved = async () => {
      if (!user) return;
      setLoadingSaved(true);

      const { data, error } = await supabase
        .from("saved_products")
        .select("id, product:products(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setSaved(data as SavedRow[]);
      } else {
        console.error("Error loading saved products", error);
      }

      setLoadingSaved(false);
    };

    if (user) loadSaved();
  }, [user]);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Saved products</div>
              <div className="section-sub">
                Products you&apos;ve bookmarked from the marketplace.
              </div>
            </div>
          </div>

          {loadingSaved ? (
            <p className="profile-muted">Loading saved products…</p>
          ) : saved.length === 0 ? (
            <p className="profile-muted">
              You haven&apos;t saved any products yet. Tap the heart on a
              product to add it here.
            </p>
          ) : (
            <div className="products-grid">
              {saved.map((row) =>
                row.product ? (
                  <ProductCard key={row.product.id} product={row.product} />
                ) : null
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
