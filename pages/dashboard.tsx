import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

export default function DashboardPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [jobsCount, setJobsCount] = useState<number | null>(null);
  const [productsCount, setProductsCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard");
    }
  }, [loading, user, router]);

  // Load counts
  useEffect(() => {
    const loadCounts = async () => {
      if (!user) return;
      setLoadingCounts(true);
      setError(null);

      try {
        const [{ data: savedJobs }, { data: savedProducts }] = await Promise.all([
          supabase.from("saved_jobs").select("id").eq("user_id", user.id),
          supabase.from("saved_products").select("id").eq("user_id", user.id),
        ]);

        setJobsCount(savedJobs?.length ?? 0);
        setProductsCount(savedProducts?.length ?? 0);
      } catch (err) {
        console.error(err);
        setError("Could not load your dashboard data.");
        setJobsCount(0);
        setProductsCount(0);
      } finally {
        setLoadingCounts(false);
      }
    };

    if (user) loadCounts();
  }, [user]);

  if (!user && !loading) return null;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Dashboard</div>
              <div className="section-sub">Your Quantum5ocial overview</div>
            </div>
          </div>

          <div className="dashboard-layout">
            <div className="dashboard-summary-row">
              <div className="dashboard-summary-card">
                <div className="dashboard-summary-label">Saved jobs</div>
                <div className="dashboard-summary-value">
                  {loadingCounts || jobsCount === null ? "…" : jobsCount}
                </div>
              </div>

              <div className="dashboard-summary-card">
                <div className="dashboard-summary-label">Saved products</div>
                <div className="dashboard-summary-value">
                  {loadingCounts || productsCount === null ? "…" : productsCount}
                </div>
              </div>
            </div>

            <div className="dashboard-actions">
              <Link href="/dashboard/saved-jobs" className="nav-ghost-btn">
                View saved jobs
              </Link>
              <Link href="/dashboard/saved-products" className="nav-ghost-btn">
                View saved products
              </Link>
            </div>

            {error && <div className="dashboard-status error">{error}</div>}
          </div>
        </section>
      </div>
    </>
  );
}
