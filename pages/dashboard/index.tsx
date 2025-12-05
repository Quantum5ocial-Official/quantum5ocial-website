// pages/dashboard/index.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import Image from "next/image";
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

type Profile = {
  id: string;
  full_name: string | null;
  short_bio: string | null;
  role: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
  focus_areas: string | null;
  skills: string | null;
  highest_education: string | null;
  key_experience: string | null;
  avatar_url: string | null;
  orcid: string | null;
  google_scholar: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  personal_website: string | null;
  lab_website: string | null;
  institutional_email: string | null;
};

export default function DashboardPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [savedProducts, setSavedProducts] = useState<SavedProduct[]>([]);

  const [jobsLoading, setJobsLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  const [jobsError, setJobsError] = useState<string | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard");
    }
  }, [loading, user, router]);

  // Load saved jobs (from saved_jobs)
  useEffect(() => {
    if (!user) return;

    const loadJobs = async () => {
      setJobsLoading(true);
      setJobsError(null);

      const { data: favRows, error: favError } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", user.id);

      if (favError) {
        console.error("Error loading saved_jobs", favError);
        setJobsError("Could not load saved jobs.");
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

  // Load saved products (from saved_products)
  useEffect(() => {
    if (!user) return;

    const loadProducts = async () => {
      setProductsLoading(true);
      setProductsError(null);

      const { data: favRows, error: favError } = await supabase
        .from("saved_products")
        .select("product_id")
        .eq("user_id", user.id);

      if (favError) {
        console.error("Error loading saved_products", favError);
        setProductsError("Could not load saved products.");
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

  // Load profile (same as profile page)
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setProfileLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error loading profile", error);
        setProfile(null);
      } else if (data) {
        setProfile(data as Profile);
      } else {
        setProfile(null);
      }

      setProfileLoading(false);
    };

    if (user) loadProfile();
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

  const focusTags =
    profile?.focus_areas
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) || [];

  const skillTags =
    profile?.skills
      ?.split(",")
      .map((t) => t.trim())
      .filter(Boolean) || [];

  const links = [
    { label: "ORCID", value: profile?.orcid },
    { label: "Google Scholar", value: profile?.google_scholar },
    { label: "LinkedIn", value: profile?.linkedin_url },
    { label: "GitHub", value: profile?.github_url },
    { label: "Personal website", value: profile?.personal_website },
    { label: "Lab website", value: profile?.lab_website },
  ].filter((x) => x.value);

  const hasAnyProfileInfo =
    profile &&
    (profile.full_name ||
      profile.short_bio ||
      profile.role ||
      profile.affiliation ||
      profile.city ||
      profile.country ||
      profile.focus_areas ||
      profile.skills ||
      profile.highest_education ||
      profile.key_experience ||
      profile.institutional_email);

  if (!user && !loading) return null;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          {/* NEW: shared content container to match homepage width */}
          <div
            style={{
              maxWidth: 1100,
              margin: "0 auto",
            }}
          >
            {/* Header */}
            <div className="section-header" style={{ marginBottom: 18 }}>
              <div>
                <div className="section-title">Dashboard</div>
                <div className="section-sub">
                  Your activity inside Quantum5ocial — saved jobs, products,
                  your entangled states, and your profile snapshot.
                </div>
              </div>
            </div>

            <div className="dashboard-layout">
              {/* Summary tiles row: compact */}
              <div
                className="dashboard-summary-row"
                style={{
                  justifyContent: "flex-start",
                  gap: 16,
                  maxWidth: 900,
                  marginBottom: 28,
                }}
              >
                {/* Entangled states tile – count is not loaded here yet, so “–” */}
                <Link
                  href="/dashboard/entangled-states"
                  className="dashboard-summary-card"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    flex: "0 0 260px",
                    maxWidth: 260,
                    position: "relative",
                  }}
                >
                  <div className="dashboard-summary-label">Entangled states</div>
                  <div className="dashboard-summary-value-wrapper">
                    <div className="dashboard-summary-value">–</div>
                  </div>
                </Link>

                {/* Saved jobs tile */}
                <Link
                  href="/dashboard/saved-jobs"
                  className="dashboard-summary-card"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    flex: "0 0 260px",
                    maxWidth: 260,
                    position: "relative",
                  }}
                >
                  <div className="dashboard-summary-label">
                    Saved jobs
                    {jobsLoading && " (loading…)"}
                  </div>
                  <div className="dashboard-summary-value-wrapper">
                    <div className="dashboard-summary-value">
                      {jobsError ? "–" : savedJobs.length}
                    </div>
                  </div>
                </Link>

                {/* Saved products tile */}
                <Link
                  href="/dashboard/saved-products"
                  className="dashboard-summary-card"
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    flex: "0 0 260px",
                    maxWidth: 260,
                    position: "relative",
                  }}
                >
                  <div className="dashboard-summary-label">
                    Saved products
                    {productsLoading && " (loading…)"}
                  </div>
                  <div className="dashboard-summary-value-wrapper">
                    <div className="dashboard-summary-value">
                      {productsError ? "–" : savedProducts.length}
                    </div>
                  </div>
                </Link>
              </div>

              {/* Profile card – same style, but wider on dashboard */}
              <div
                className="profile-container"
                style={{
                  marginTop: 16,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <div
                  className="profile-summary-card"
                  style={{ width: "100%", maxWidth: 960 }}
                >
                  {profileLoading ? (
                    <p className="profile-muted">Loading your profile…</p>
                  ) : !hasAnyProfileInfo ? (
                    <div>
                      <p
                        className="profile-muted"
                        style={{ marginBottom: 12 }}
                      >
                        You haven&apos;t filled in your profile yet. A complete
                        profile helps labs, companies, and collaborators know
                        who you are in the quantum ecosystem.
                      </p>
                      <Link href="/profile/edit" className="nav-cta">
                        Complete your profile
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* Top identity */}
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

                          <div style={{ marginTop: 12 }}>
                            <Link
                              href="/profile/edit"
                              className="nav-ghost-btn"
                              style={{ textDecoration: "none" }}
                            >
                              Edit / complete your profile
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Short bio */}
                      {profile?.short_bio && (
                        <p className="profile-bio">{profile.short_bio}</p>
                      )}

                      {/* Experience inline */}
                      {profile?.key_experience && (
                        <p className="profile-bio">
                          <span className="profile-section-label-inline">
                            Experience:
                          </span>{" "}
                          {profile.key_experience}
                        </p>
                      )}

                      {/* Two-column layout */}
                      <div className="profile-two-columns">
                        {/* LEFT */}
                        <div className="profile-col">
                          {profile?.affiliation && (
                            <div className="profile-summary-item">
                              <div className="profile-section-label">
                                Affiliation
                              </div>
                              <div className="profile-summary-text">
                                {profile.affiliation}
                              </div>
                            </div>
                          )}

                          {focusTags.length > 0 && (
                            <div className="profile-summary-item">
                              <div className="profile-section-label">
                                Focus areas
                              </div>
                              <div className="profile-tags">
                                {focusTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="profile-tag-chip"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {links.length > 0 && (
                            <div
                              className="profile-summary-item"
                              style={{ marginTop: 18 }}
                            >
                              <div className="profile-section-label">
                                Links
                              </div>
                              <ul
                                style={{
                                  paddingLeft: 16,
                                  fontSize: 13,
                                  marginTop: 4,
                                }}
                              >
                                {links.map((l) => (
                                  <li key={l.label}>
                                    <a
                                      href={l.value as string}
                                      target="_blank"
                                      rel="noreferrer"
                                      style={{ color: "#7dd3fc" }}
                                    >
                                      {l.label}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>

                        {/* RIGHT */}
                        <div className="profile-col">
                          {profile?.highest_education && (
                            <div className="profile-summary-item">
                              <div className="profile-section-label">
                                Highest education
                              </div>
                              <div className="profile-summary-text">
                                {profile.highest_education}
                              </div>
                            </div>
                          )}

                          {skillTags.length > 0 && (
                            <div className="profile-summary-item">
                              <div className="profile-section-label">
                                Skills
                              </div>
                              <div className="profile-tags">
                                {skillTags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="profile-tag-chip"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
