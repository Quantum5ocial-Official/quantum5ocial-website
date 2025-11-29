// pages/dashboard/index.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

type SavedJob = {
  id: string;
};

type SavedProduct = {
  id: string;
};

type Profile = {
  id: string;
  full_name: string | null;
  short_bio: string | null;
  role: string | null;
  affiliation: string | null;
  city: string | null;
  country: string | null;
  avatar_url: string | null;
  institutional_email: string | null;
};

export default function DashboardPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard");
    }
  }, [loading, user, router]);

  // load saved jobs (for count)
  useEffect(() => {
    if (!user) return;

    const loadJobs = async () => {
      const { data: savedRows, error: savedErr } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", user.id);

      if (savedErr) {
        console.error("Error loading saved_jobs", savedErr);
        setSavedJobs([]);
        return;
      }

      const jobIds = Array.from(
        new Set((savedRows || []).map((r: any) => r.job_id))
      );

      setSavedJobs(jobIds.map((id) => ({ id })));
    };

    loadJobs();
  }, [user]);

  // load saved products (for count)
  useEffect(() => {
    if (!user) return;

    const loadProducts = async () => {
      const { data: savedRows, error: savedErr } = await supabase
        .from("saved_products")
        .select("product_id")
        .eq("user_id", user.id);

      if (savedErr) {
        console.error("Error loading saved_products", savedErr);
        setSavedProducts([]);
        return;
      }

      const productIds = Array.from(
        new Set((savedRows || []).map((r: any) => r.product_id))
      );

      setSavedProducts(productIds.map((id) => ({ id })));
    };

    loadProducts();
  }, [user]);

  // load profile summary
  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile", error);
        setProfile(null);
      } else {
        setProfile(data as Profile);
      }
      setProfileLoading(false);
    };

    loadProfile();
  }, [user]);

  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const displayName = profile?.full_name || fallbackName;

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("");

  if (!user && !loading) return null;

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
            <div
              className="dashboard-summary-row"
              style={{
                gap: 16,
                justifyContent: "flex-start",
              }}
            >
              <Link
                href="/dashboard/saved-jobs"
                className="dashboard-summary-card"
                style={{
                  textDecoration: "none",
                  flex: "0 0 220px",
                  maxWidth: "220px",
                }}
              >
                <div className="dashboard-summary-label">Saved jobs</div>
                <div className="dashboard-summary-value">
                  {savedJobs.length}
                </div>
              </Link>

              <Link
                href="/dashboard/saved-products"
                className="dashboard-summary-card"
                style={{
                  textDecoration: "none",
                  flex: "0 0 220px",
                  maxWidth: "220px",
                }}
              >
                <div className="dashboard-summary-label">Saved products</div>
                <div className="dashboard-summary-value">
                  {savedProducts.length}
                </div>
              </Link>

              <Link
                href="/"
                className="dashboard-summary-card"
                style={{
                  textDecoration: "none",
                  flex: "0 0 220px",
                  maxWidth: "220px",
                }}
              >
                <div className="dashboard-summary-label">Go to homepage</div>
                <div
                  className="dashboard-summary-value"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Image
                    src="/Q5_black_bg2.png"
                    alt="Quantum5ocial logo"
                    width={40}
                    height={40}
                    style={{ borderRadius: 6 }}
                  />
                </div>
              </Link>
            </div>

            {/* Centered profile summary card (larger) */}
            <div
              className="profile-summary-card"
              style={{
                marginTop: 24,
                maxWidth: 880, // a bit larger than before
                marginLeft: "auto",
                marginRight: "auto",
              }}
            >
              {profileLoading ? (
                <p className="profile-muted">Loading your profile…</p>
              ) : (
                <div className="profile-header">
                  <div className="profile-avatar">
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={displayName}
                        className="profile-avatar-img"
                      />
                    ) : (
                      <span>{initials || "Q5"}</span>
                    )}
                  </div>

                  <div className="profile-header-text">
                    <div className="profile-name">{displayName}</div>

                    {(profile?.role || profile?.affiliation) && (
                      <div className="profile-role">
                        {[profile?.role, profile?.affiliation]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    )}

                    {(profile?.city || profile?.country) && (
                      <div className="profile-location">
                        {[profile?.city, profile?.country]
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    )}

                    {profile?.institutional_email && (
                      <div className="profile-location">
                        Verified email: {profile.institutional_email}
                      </div>
                    )}

                    {profile?.short_bio && (
                      <p className="profile-bio" style={{ marginTop: 10 }}>
                        {profile.short_bio}
                      </p>
                    )}

                    <div style={{ marginTop: 12 }}>
                      <Link
                        href="/profile/edit"
                        className="nav-ghost-btn"
                        style={{ textDecoration: "none" }}
                      >
                        Edit / complete profile
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
