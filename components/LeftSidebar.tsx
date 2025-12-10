// components/LeftSidebar.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
  city?: string | null;
  country?: string | null;
};

type MyOrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

export default function LeftSidebar() {
  const { user } = useSupabaseUser();

  const [loading, setLoading] = useState(true);

  // Fetched data
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [entangledCount, setEntangledCount] = useState<number | null>(null);
  const [savedJobsCount, setSavedJobsCount] = useState<number | null>(null);
  const [savedProductsCount, setSavedProductsCount] = useState<number | null>(
    null
  );
  const [myOrg, setMyOrg] = useState<MyOrgSummary | null>(null);

  // 🔥 Load everything internally
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadAll = async () => {
      try {
        // PROFILE
        const { data: p } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();
        setProfile((p as ProfileSummary) || null);

        // ENTANGLEMENTS
        const { data: ents } = await supabase
          .from("entanglements")
          .select("id")
          .eq("user_id", user.id);
        setEntangledCount(ents?.length || 0);

        // SAVED JOBS
        const { data: savedJobs } = await supabase
          .from("saved_jobs")
          .select("job_id")
          .eq("user_id", user.id);
        setSavedJobsCount(savedJobs?.length || 0);

        // SAVED PRODUCTS
        const { data: savedProducts } = await supabase
          .from("saved_products")
          .select("product_id")
          .eq("user_id", user.id);
        setSavedProductsCount(savedProducts?.length || 0);

        // MY ORGANIZATION (first one)
        const { data: orgRow } = await supabase
          .from("organizations")
          .select("id, name, slug, logo_url")
          .eq("created_by", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (orgRow) {
          setMyOrg(orgRow as MyOrgSummary);
        } else {
          setMyOrg(null);
        }
      } catch (err) {
        console.error("LeftSidebar load error:", err);
      }

      setLoading(false);
    };

    loadAll();
  }, [user]);

  if (!user) return null;

  // Derived fields
  const fallbackName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const fullName = profile?.full_name || fallbackName;
  const avatarUrl = profile?.avatar_url || null;

  const educationLevel =
    profile?.education_level || profile?.highest_education || "";
  const describesYou = profile?.describes_you || "";
  const affiliation = profile?.affiliation || profile?.current_org || "";
  const city = profile?.city || "";
  const country = profile?.country || "";

  const hasExtras =
    educationLevel || describesYou || affiliation || city || country;

  return (
    <aside
      className="layout-left sticky-col"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {/* ======================================================
         PROFILE CARD
      ======================================================= */}
      <Link
        href="/profile"
        className="sidebar-card profile-sidebar-card"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <div className="profile-sidebar-header">
          <div className="profile-sidebar-avatar-wrapper">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="profile-sidebar-avatar"
              />
            ) : (
              <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-sidebar-name">{fullName}</div>
        </div>

        {hasExtras && (
          <div className="profile-sidebar-info-block">
            {educationLevel && (
              <div className="profile-sidebar-info-value">
                {educationLevel}
              </div>
            )}
            {describesYou && (
              <div className="profile-sidebar-info-value" style={{ marginTop: 4 }}>
                {describesYou}
              </div>
            )}
            {affiliation && (
              <div className="profile-sidebar-info-value" style={{ marginTop: 4 }}>
                {affiliation}
              </div>
            )}
            {(city || country) && (
              <div
                className="profile-sidebar-info-value"
                style={{ marginTop: 4, opacity: 0.9 }}
              >
                {[city, country].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        )}
      </Link>

      {/* ======================================================
         QUICK DASHBOARD
      ======================================================= */}
      <div className="sidebar-card dashboard-sidebar-card">
        <div className="dashboard-sidebar-title">Quick dashboard</div>

        <div className="dashboard-sidebar-links" style={{ marginTop: 8 }}>
          <Link
            href="/dashboard/entangled-states"
            className="dashboard-sidebar-link"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>Entanglements</span>
            <span style={{ opacity: 0.9 }}>{entangledCount ?? "…"}</span>
          </Link>

          <Link
            href="/dashboard/saved-jobs"
            className="dashboard-sidebar-link"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>Saved jobs</span>
            <span style={{ opacity: 0.9 }}>{savedJobsCount ?? "…"}</span>
          </Link>

          <Link
            href="/dashboard/saved-products"
            className="dashboard-sidebar-link"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>Saved products</span>
            <span style={{ opacity: 0.9 }}>{savedProductsCount ?? "…"}</span>
          </Link>

          <Link
            href="/ecosystem"
            className="dashboard-sidebar-link"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>My Ecosystem</span>
          </Link>
        </div>
      </div>

      {/* ======================================================
         MY ORGANIZATION — conditional
      ======================================================= */}
      {myOrg && (
        <Link
          href={`/orgs/${myOrg.slug}`}
          className="sidebar-card dashboard-sidebar-card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="dashboard-sidebar-title">My organization</div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                overflow: "hidden",
                border: "1px solid rgba(148,163,184,0.45)",
                background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              {myOrg.logo_url ? (
                <img
                  src={myOrg.logo_url}
                  alt={myOrg.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                myOrg.name.charAt(0).toUpperCase()
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {myOrg.name}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "rgba(148,163,184,0.95)",
                  marginTop: 4,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div>
                  Followers: <span style={{ color: "#e5e7eb" }}>0</span>
                </div>
                <div>
                  Views: <span style={{ color: "#e5e7eb" }}>0</span>
                </div>
                <div style={{ marginTop: 4, color: "#7dd3fc" }}>Analytics →</div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* ======================================================
         PREMIUM CARD
      ======================================================= */}
      <div
        className="sidebar-card premium-sidebar-card"
        style={{
          padding: "14px 16px",
          borderRadius: 20,
          background:
            "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(244,114,182,0.18))",
          border: "1px solid rgba(251,191,36,0.5)",
          boxShadow: "0 12px 30px rgba(15,23,42,0.7)",
        }}
      >
        {/* header row: icon + title + pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 18 }}>👑</span>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Go Premium</span>
          </div>

          <div
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.75)",
              border: "1px solid rgba(251,191,36,0.6)",
              color: "rgba(251,191,36,0.9)",
              whiteSpace: "nowrap",
            }}
          >
            Coming soon
          </div>
        </div>

        <div
          style={{
            fontSize: 12,
            color: "rgba(248,250,252,0.9)",
            lineHeight: 1.5,
          }}
        >
          Unlock advanced analytics, reduced ads, and premium perks for your
          profile and organization.
        </div>
      </div>

      {/* DIVIDER */}
      <div
        style={{
          width: "100%",
          height: 1,
          background: "rgba(148,163,184,0.18)",
          marginTop: 6,
          marginBottom: 6,
        }}
      />

      {/* ======================================================
         SOCIALS + COPYRIGHT
      ======================================================= */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 18 }}>
          <a
            href="mailto:info@quantum5ocial.com"
            style={{ color: "rgba(148,163,184,0.9)" }}
          >
            ✉️
          </a>
          <a href="#" style={{ color: "rgba(148,163,184,0.9)" }}>
            𝕏
          </a>
          <a
            href="#"
            style={{ color: "rgba(148,163,184,0.9)", fontWeight: 600 }}
          >
            in
          </a>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "rgba(148,163,184,0.9)",
          }}
        >
          <img
            src="/Q5_white_bg.png"
            alt="Quantum5ocial logo"
            style={{ width: 24, height: 24, borderRadius: 4 }}
          />
          <span>© 2025 Quantum5ocial</span>
        </div>
      </div>
    </aside>
  );
}
