// pages/dashboard/index.tsx
import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

type SavedJob = {
  id: string;
  title: string | null;
  company_name: string | null;
  location: string | null;
  employment_type: string | null;
};

type SavedProduct = {
  id: string;
  name: string;
  company_name: string | null;
  category: string | null;
  price_type: "fixed" | "contact" | null;
  price_value: string | null;
};

export default function DashboardPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [view, setView] = useState<"jobs" | "products">("jobs");

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);

  const [jobsLoading, setJobsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  const [jobsError, setJobsError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);

  // redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard");
    }
  }, [loading, user, router]);

  // load saved jobs
  useEffect(() => {
    if (!user) return;

    const loadJobs = async () => {
      setJobsLoading(true);
      setJobsError(null);

      const { data: favRows, error: favError } = await supabase
        .from("job_favorites")
        .select("job_id")
        .eq("user_id", user.id);

      if (favError) {
        console.error("Error loading job_favorites", favError);
        if ((favError as any).code === "42P01") {
          setJobsError("Saved jobs are not configured yet.");
        } else {
          setJobsError("Could not load saved jobs.");
        }
        setJobsLoading(false);
        return;
      }

      const jobIds = Array.from(
        new Set((favRows || []).map((r: any) => r.job_id))
      );

      if (jobIds.length === 0) {
        setSavedJobs([]);
        setJobsLoading(false);
        return;
      }

      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("id, title, company_name, location, employment_type")
        .in("id", jobIds);

      if (jobsError) {
        console.error("Error loading jobs", jobsError);
        setJobsError("Could not load saved jobs.");
        setSavedJobs([]);
      } else {
        setSavedJobs((jobs || []) as SavedJob[]);
      }

      setJobsLoading(false);
    };

    loadJobs();
  }, [user]);

  // load saved products
  useEffect(() => {
    if (!user) return;

    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError(null);

      const { data: favRows, error: favError } = await supabase
        .from("product_favorites")
        .select("product_id")
        .eq("user_id", user.id);

      if (favError) {
        console.error("Error loading product_favorites", favError);
        if ((favError as any).code === "42P01") {
          setProductsError("Saved products are not configured yet.");
        } else {
          setProductsError("Could not load saved products.");
        }
        setProductsLoading(false);
        return;
      }

      const productIds = Array.from(
        new Set((favRows || []).map((r: any) => r.product_id))
      );

      if (productIds.length === 0) {
        setSavedProducts([]);
        setProductsLoading(false);
        return;
      }

      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id, name, company_name, category, price_type, price_value")
        .in("id", productIds);

      if (productsError) {
        console.error("Error loading products", productsError);
        setProductsError("Could not load saved products.");
        setSavedProducts([]);
      } else {
        setSavedProducts((products || []) as SavedProduct[]);
      }

      setProductsLoading(false);
    };

    loadProducts();
  }, [user]);

  const totalSaved = useMemo(
    () => savedJobs.length + savedProducts.length,
    [savedJobs.length, savedProducts.length]
  );

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          {/* Header */}
          <div className="section-header" style={{ marginBottom: 18 }}>
            <div>
              <div className="section-title">Dashboard</div>
              <div className="section-sub">
                Your activity inside Quantum5ocial — saved jobs, products, and
                profile shortcuts.
              </div>
            </div>
          </div>

          <div className="dashboard-layout">
            {/* Summary tiles */}
            <div className="dashboard-summary-row">
              <div className="dashboard-summary-card">
                <div className="dashboard-summary-label">Saved jobs</div>
                <div className="dashboard-summary-value">
                  {savedJobs.length}
                </div>
              </div>
              <div className="dashboard-summary-card">
                <div className="dashboard-summary-label">Saved products</div>
                <div className="dashboard-summary-value">
                  {savedProducts.length}
                </div>
              </div>
              <div className="dashboard-summary-card">
                <div className="dashboard-summary-label">
                  Total saved items
                </div>
                <div className="dashboard-summary-value">{totalSaved}</div>
              </div>
            </div>

            {/* Top actions */}
            <div className="dashboard-actions">
              <Link href="/profile" className="nav-ghost-btn">
                View profile
              </Link>
              <Link href="/profile/edit" className="nav-ghost-btn">
                Complete profile
              </Link>
              <Link href="/products" className="nav-ghost-btn">
                Browse products
              </Link>
              <Link href="/jobs" className="nav-ghost-btn">
                Browse jobs
              </Link>
            </div>

            {/* View selector */}
            <div className="dashboard-view-selector">
              <label>
                View:
                <select
                  value={view}
                  onChange={(e) =>
                    setView(e.target.value as "jobs" | "products")
                  }
                >
                  <option value="jobs">Saved jobs</option>
                  <option value="products">Saved products</option>
                </select>
              </label>
            </div>

            {/* Content */}
            <div className="dashboard-list">
              {view === "jobs" ? (
                <>
                  {jobsLoading ? (
                    <p className="dashboard-status">Loading saved jobs…</p>
                  ) : jobsError ? (
                    <p className="dashboard-status error">{jobsError}</p>
                  ) : savedJobs.length === 0 ? (
                    <p className="dashboard-status">
                      You haven&apos;t saved any jobs yet.
                    </p>
                  ) : (
                    savedJobs.map((job) => (
                      <Link
                        key={job.id}
                        href={`/jobs/${job.id}`}
                        className="dashboard-card"
                      >
                        <div className="dashboard-card-main">
                          <div className="dashboard-card-title">
                            {job.title || "Untitled role"}
                          </div>
                          <div className="dashboard-card-sub">
                            {job.company_name || "Unknown lab / company"}
                          </div>
                        </div>
                        <div className="dashboard-card-meta">
                          {job.location && (
                            <span className="dashboard-pill">
                              {job.location}
                            </span>
                          )}
                          {job.employment_type && (
                            <span className="dashboard-pill">
                              {job.employment_type}
                            </span>
                          )}
                        </div>
                      </Link>
                    ))
                  )}
                </>
              ) : (
                <>
                  {productsLoading ? (
                    <p className="dashboard-status">
                      Loading saved products…
                    </p>
                  ) : productsError ? (
                    <p className="dashboard-status error">{productsError}</p>
                  ) : savedProducts.length === 0 ? (
                    <p className="dashboard-status">
                      You haven&apos;t saved any products yet.
                    </p>
                  ) : (
                    savedProducts.map((p) => {
                      const showFixed =
                        p.price_type === "fixed" && p.price_value;
                      return (
                        <Link
                          key={p.id}
                          href={`/products/${p.id}`}
                          className="dashboard-card"
                        >
                          <div className="dashboard-card-main">
                            <div className="dashboard-card-title">
                              {p.name}
                            </div>
                            <div className="dashboard-card-sub">
                              {p.company_name || "Unknown vendor"}
                            </div>
                          </div>
                          <div className="dashboard-card-meta">
                            {p.category && (
                              <span className="dashboard-pill">
                                {p.category}
                              </span>
                            )}
                            <span className="dashboard-pill">
                              {showFixed ? p.price_value : "Contact for price"}
                            </span>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
