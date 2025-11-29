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

  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [savedProductsCount, setSavedProductsCount] = useState(0);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/dashboard");
    }
  }, [loading, user, router]);

  // load saved jobs count
  useEffect(() => {
    if (!user) return;

    const loadSavedJobs = async () => {
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("job_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error loading saved_jobs", error);
        setSavedJobsCount(0);
        return;
      }
      setSavedJobsCount((data || []).length);
    };

    loadSavedJobs();
  }, [user]);

  // load saved products count
  useEffect(() => {
    if (!user) return;

    const loadSavedProducts = async () => {
      const { data, error } = await supabase
        .from("saved_products")
        .select("product_id")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error loading saved_products", error);
        setSavedProductsCount(0);
        return;
      }
      setSavedProductsCount((data || []).length);
    };

    loadSavedProducts();
  }, [user]);

  // load profile summary
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
        console.error("Error loading profile in dashboard", error);
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

  if (!user && !loading) return null;

  const totalSaved = useMemo(
    () => savedJobsCount + savedProductsCount,
    [savedJobsCount, savedProductsCount]
  );

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
                profile overview.
              </div>
            </div>
          </div>

          <div className="dashboard-layout">
            {/* Summary tiles (smaller, not full-width) */}
            <div
              className="dashboard-summary-row"
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 32,
              }}
            >
              {/* Saved jobs tile */}
              <Link href="/dashboard/saved-jobs" style={{ textDecoration: "none" }}>
                <div
                  className="dashboard-summary-card"
                  style={{
                    width: 220,
                    padding: 16,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.5)",
                    background: "rgba(15,23,42,0.9)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    className="dashboard-summary-label"
                    style={{ fontSize: 12, color: "#9ca3af" }}
                  >
                    Saved jobs
                  </div>
                  <div
                    className="dashboard-summary-value"
                    style={{ fontSize: 26, fontWeight: 600 }}
                  >
                    {savedJobsCount}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Tap to view your saved roles.
                  </div>
                </div>
              </Link>

              {/* Saved products tile */}
              <Link
                href="/dashboard/saved-products"
                style={{ textDecoration: "none" }}
              >
                <div
                  className="dashboard-summary-card"
                  style={{
                    width: 220,
                    padding: 16,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.5)",
                    background: "rgba(15,23,42,0.9)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  <div
                    className="dashboard-summary-label"
                    style={{ fontSize: 12, color: "#9ca3af" }}
                  >
                    Saved products
                  </div>
                  <div
                    className="dashboard-summary-value"
                    style={{ fontSize: 26, fontWeight: 600 }}
                  >
                    {savedProductsCount}
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Tap to view your saved tools.
                  </div>
                </div>
              </Link>

              {/* Homepage tile with Q5 logo text */}
              <Link href="/" style={{ textDecoration: "none" }}>
                <div
                  className="dashboard-summary-card"
                  style={{
                    width: 220,
                    padding: 16,
                    borderRadius: 16,
                    border: "1px solid rgba(148,163,184,0.5)",
                    background: "rgba(15,23,42,0.9)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    className="dashboard-summary-label"
                    style={{ fontSize: 12, color: "#9ca3af" }}
                  >
                    Go to homepage
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      letterSpacing: 1,
                      background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Q5
                  </div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    Back to Quantum5ocial landing page.
                  </div>
                </div>
              </Link>
            </div>

            {/* Profile card, wider and centered */}
            <div
              className="dashboard-profile-wrapper"
              style={{
                display: "flex",
                justifyContent: "center",
              }}
            >
              <div
                className="dashboard-profile-card"
                style={{
                  width: "100%",
                  maxWidth: 1100, // 🔥 wider card (~1.5x)
                  padding: 24,
                  borderRadius: 16,
                  background: "rgba(15,23,42,0.95)",
                  border: "1px solid rgba(148,163,184,0.5)",
                }}
              >
                {profileLoading ? (
                  <p
                    style={{
                      fontSize: 13,
                      color: "#9ca3af",
                    }}
                  >
                    Loading your profile…
                  </p>
                ) : !hasAnyProfileInfo ? (
                  <div>
                    <p
                      style={{
                        fontSize: 13,
                        color: "#9ca3af",
                        marginBottom: 12,
                      }}
                    >
                      You haven&apos;t filled in your profile yet. A complete profile
                      helps labs, companies, and collaborators know who you are
                      in the quantum ecosystem.
                    </p>
                    <Link
                      href="/profile/edit"
                      className="nav-ghost-btn"
                      style={{ textDecoration: "none" }}
                    >
                      Edit / complete profile
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Top identity row */}
                    <div
                      style={{
                        display: "flex",
                        gap: 20,
                        alignItems: "flex-start",
                        marginBottom: 16,
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 60,
                          height: 60,
                          borderRadius: "999px",
                          background:
                            "radial-gradient(circle at 30% 0, #38bdf8, #0f172a)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 600,
                          fontSize: 22,
                          color: "#e5e7eb",
                          flexShrink: 0,
                          overflow: "hidden",
                        }}
                      >
                        {profile?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={profile.avatar_url}
                            alt={displayName}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              borderRadius: "999px",
                            }}
                          />
                        ) : (
                          <span>{initials || "Q5"}</span>
                        )}
                      </div>

                      {/* Text block */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 600,
                            marginBottom: 4,
                          }}
                        >
                          {displayName}
                        </div>

                        {(profile?.role || profile?.affiliation) && (
                          <div
                            style={{
                              fontSize: 13,
                              color: "#9ca3af",
                              marginBottom: 2,
                            }}
                          >
                            {[profile?.role, profile?.affiliation]
                              .filter(Boolean)
                              .join(" · ")}
                          </div>
                        )}

                        {(profile?.city || profile?.country) && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                              marginBottom: 2,
                            }}
                          >
                            {[profile?.city, profile?.country]
                              .filter(Boolean)
                              .join(", ")}
                          </div>
                        )}

                        {profile?.institutional_email && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6b7280",
                            }}
                          >
                            Verified email: {profile.institutional_email}
                          </div>
                        )}

                        <div style={{ marginTop: 10 }}>
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

                    {/* Short bio */}
                    {profile?.short_bio && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "#e5e7eb",
                          marginBottom: 10,
                        }}
                      >
                        {profile.short_bio}
                      </p>
                    )}

                    {/* Experience inline */}
                    {profile?.key_experience && (
                      <p
                        style={{
                          fontSize: 13,
                          color: "#e5e7eb",
                          marginBottom: 12,
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 500,
                            color: "#9ca3af",
                            marginRight: 4,
                          }}
                        >
                          Experience:
                        </span>
                        {profile.key_experience}
                      </p>
                    )}

                    {/* Two-column layout */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)",
                        gap: 20,
                        marginTop: 8,
                      }}
                    >
                      {/* LEFT COLUMN */}
                      <div>
                        {profile?.affiliation && (
                          <div style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#9ca3af",
                                marginBottom: 2,
                              }}
                            >
                              Affiliation
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: "#e5e7eb",
                              }}
                            >
                              {profile.affiliation}
                            </div>
                          </div>
                        )}

                        {focusTags.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#9ca3af",
                                marginBottom: 4,
                              }}
                            >
                              Focus areas
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              {focusTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="profile-tag-chip"
                                  style={{
                                    fontSize: 11,
                                    padding: "3px 8px",
                                    borderRadius: 999,
                                    border:
                                      "1px solid rgba(148,163,184,0.6)",
                                    color: "#e5e7eb",
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {links.length > 0 && (
                          <div style={{ marginTop: 12 }}>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#9ca3af",
                                marginBottom: 4,
                              }}
                            >
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
                                    style={{
                                      color: "#7dd3fc",
                                      textDecoration: "none",
                                    }}
                                  >
                                    {l.label}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* RIGHT COLUMN */}
                      <div>
                        {profile?.highest_education && (
                          <div style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#9ca3af",
                                marginBottom: 2,
                              }}
                            >
                              Highest education
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: "#e5e7eb",
                              }}
                            >
                              {profile.highest_education}
                            </div>
                          </div>
                        )}

                        {skillTags.length > 0 && (
                          <div style={{ marginBottom: 10 }}>
                            <div
                              style={{
                                fontSize: 12,
                                color: "#9ca3af",
                                marginBottom: 4,
                              }}
                            >
                              Skills
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              {skillTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="profile-tag-chip"
                                  style={{
                                    fontSize: 11,
                                    padding: "3px 8px",
                                    borderRadius: 999,
                                    border:
                                      "1px solid rgba(148,163,184,0.6)",
                                    color: "#e5e7eb",
                                  }}
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
        </section>
      </div>
    </>
  );
}
