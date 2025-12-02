// pages/community.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education: string | null;
  affiliation: string | null;
  role: string | null;
  short_bio: string | null;
};

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
};

export default function CommunityPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [profileSummary, setProfileSummary] =
    useState<ProfileSummary | null>(null);

  /** ===== LOAD COMMUNITY MEMBERS ===== */
  useEffect(() => {
    if (authLoading) return;

    const loadProfiles = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, highest_education, affiliation, role, short_bio"
          )
          .order("full_name", { ascending: true });

        if (user?.id) query = query.neq("id", user.id);

        const { data, error } = await query;

        if (error) {
          console.error("Error loading profiles:", error);
          setError("Could not load community members.");
        } else {
          setProfiles((data || []) as Profile[]);
        }
      } catch (e) {
        console.error("Community load crashed:", e);
        setError("Something went wrong while loading the community.");
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [authLoading, user?.id]);

  /** ===== LOAD CURRENT USER FOR LEFT SIDEBAR ===== */
  useEffect(() => {
    const loadProfileSummary = async () => {
      if (!user) return setProfileSummary(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      setProfileSummary(!error && data ? (data as ProfileSummary) : null);
    };

    loadProfileSummary();
  }, [user]);

  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarFullName = profileSummary?.full_name || fallbackName;
  const avatarUrl = profileSummary?.avatar_url || null;

  const educationLevel =
    profileSummary?.education_level ||
    profileSummary?.highest_education ||
    "";
  const describesYou = profileSummary?.describes_you || profileSummary?.role || "";
  const affiliationSidebar =
    profileSummary?.affiliation || profileSummary?.current_org || "";

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        {/* === 3 COLUMN LAYOUT === */}
        <main className="layout-3col">
          {/* LEFT SIDEBAR */}
          <aside className="layout-left sticky-col" style={{ display: "flex", flexDirection: "column" }}>
            {/* --- Profile card --- */}
            <div className="sidebar-card profile-sidebar-card">
              <div className="profile-sidebar-header">
                <div className="profile-sidebar-avatar-wrapper">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={sidebarFullName}
                      className="profile-sidebar-avatar"
                    />
                  ) : (
                    <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                      {sidebarFullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="profile-sidebar-name">{sidebarFullName}</div>
              </div>

              {/* Only show if filled */}
              <div className="profile-sidebar-info-block">
                {educationLevel && (
                  <div className="profile-sidebar-info-value">{educationLevel}</div>
                )}
                {describesYou && (
                  <div
                    className="profile-sidebar-info-value"
                    style={{ marginTop: 4 }}
                  >
                    {describesYou}
                  </div>
                )}
                {affiliationSidebar && (
                  <div
                    className="profile-sidebar-info-value"
                    style={{ marginTop: 4 }}
                  >
                    {affiliationSidebar}
                  </div>
                )}
              </div>

              <Link href="/profile" className="sidebar-btn">
                View / edit profile
              </Link>
            </div>

            {/* --- Quick dashboard card --- */}
            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>

              <div className="dashboard-sidebar-links">
                <Link href="/dashboard" className="dashboard-sidebar-link">
                  Overview
                </Link>
                <Link
                  href="/dashboard/entangled"
                  className="dashboard-sidebar-link"
                >
                  Entangled states
                </Link>
                <Link href="/dashboard/saved-jobs" className="dashboard-sidebar-link">
                  Saved jobs
                </Link>
                <Link
                  href="/dashboard/saved-products"
                  className="dashboard-sidebar-link"
                >
                  Saved products
                </Link>
              </div>
            </div>

            {/* --- Social icons + Brand footer --- */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 16,
                borderTop: "1px solid rgba(148,163,184,0.18)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {/* Icons */}
              <div style={{ display: "flex", gap: 12, fontSize: 18 }}>
                <a
                  href="mailto:info@quantum5ocial.com"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  ✉️
                </a>
                <a href="#" style={{ color: "rgba(148,163,184,0.9)" }}>
                  ✖️
                </a>
                <a href="#" style={{ color: "rgba(148,163,184,0.9)" }}>
                  🐱
                </a>
              </div>

              {/* Brand row */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <img
                  src="/Q5_white_bg.png"
                  alt="Quantum5ocial"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 4,
                    objectFit: "contain",
                  }}
                />
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Quantum5ocial
                </span>
              </div>
            </div>
          </aside>
          
