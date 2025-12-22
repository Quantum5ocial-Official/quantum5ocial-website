// components/LeftSidebar.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;

  // existing fields you already use
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
  city?: string | null;
  country?: string | null;

  // ✅ for "current title (or role)"
  current_title?: string | null;
  role?: string | null;

  // ✅ Q5 badge fields (mirrored onto profiles)
  q5_badge_level?: number | null;
  q5_badge_label?: string | null;
  q5_badge_review_status?: string | null;
  q5_badge_claimed_at?: string | null;
};

type MyOrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type SidebarData = {
  profile: ProfileSummary | null;
  entangledCount: number | null;
  savedJobsCount: number | null;
  savedProductsCount: number | null;
  myOrg: MyOrgSummary | null;
  myOrgFollowersCount: number | null;
};

function Q5BadgePill({
  label,
  status,
}: {
  label: string;
  status?: string | null;
}) {
  const s = (status || "").toLowerCase();

  const border =
    s === "approved"
      ? "1px solid rgba(74,222,128,0.55)"
      : s === "rejected"
      ? "1px solid rgba(248,113,113,0.55)"
      : s === "pending"
      ? "1px solid rgba(148,163,184,0.35)"
      : "1px solid rgba(34,211,238,0.40)";

  const bg =
    s === "approved"
      ? "rgba(34,197,94,0.10)"
      : s === "rejected"
      ? "rgba(248,113,113,0.10)"
      : s === "pending"
      ? "rgba(2,6,23,0.45)"
      : "rgba(34,211,238,0.10)";

  const color =
    s === "approved"
      ? "rgba(187,247,208,0.95)"
      : s === "rejected"
      ? "rgba(254,202,202,0.95)"
      : "rgba(226,232,240,0.95)";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "4px 8px",
        borderRadius: 999,
        border,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 900,
        lineHeight: "14px",
        whiteSpace: "nowrap",
        boxShadow: "0 8px 18px rgba(0,0,0,0.22)",
        pointerEvents: "none",
      }}
      title={label}
    >
      {label}
    </span>
  );
}

export default function LeftSidebar() {
  const { user, loading: userLoading } = useSupabaseUser();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SidebarData>({
    profile: null,
    entangledCount: null,
    savedJobsCount: null,
    savedProductsCount: null,
    myOrg: null,
    myOrgFollowersCount: null,
  });

  const fallbackName = useMemo(() => {
    return (
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.email?.split("@")[0] ||
      "User"
    );
  }, [user?.id]);

  useEffect(() => {
    let alive = true;

    const uid = user?.id;
    if (!uid) {
      setLoading(true);
      setData({
        profile: null,
        entangledCount: null,
        savedJobsCount: null,
        savedProductsCount: null,
        myOrg: null,
        myOrgFollowersCount: null,
      });
      return () => {
        alive = false;
      };
    }

    const loadAll = async () => {
      setLoading(true);

      try {
        const profileQ = supabase
          .from("profiles")
          .select("*")
          .eq("id", uid)
          .maybeSingle();

        const connectionsQ = supabase
          .from("connections")
          .select("user_id, target_user_id, status")
          .eq("status", "accepted")
          .or(`user_id.eq.${uid},target_user_id.eq.${uid}`);

        const savedJobsQ = supabase.from("saved_jobs").select("job_id").eq("user_id", uid);

        const savedProductsQ = supabase
          .from("saved_products")
          .select("product_id")
          .eq("user_id", uid);

        const orgQ = supabase
          .from("organizations")
          .select("id, name, slug, logo_url")
          .eq("created_by", uid)
          .eq("is_active", true)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        const [pRes, cRes, sjRes, spRes, orgRes] = await Promise.all([
          profileQ,
          connectionsQ,
          savedJobsQ,
          savedProductsQ,
          orgQ,
        ]);

        const profile = (pRes.data as ProfileSummary) || null;

        let entangledCount = 0;
        if (!cRes.error && cRes.data && cRes.data.length > 0) {
          const otherIds = Array.from(
            new Set(
              (cRes.data as any[]).map((c: any) =>
                c.user_id === uid ? c.target_user_id : c.user_id
              )
            )
          ).filter(Boolean);
          entangledCount = otherIds.length;
        }

        const savedJobsCount = (sjRes.data || []).length;
        const savedProductsCount = (spRes.data || []).length;

        const myOrg = (orgRes.data as MyOrgSummary) || null;

        let myOrgFollowersCount: number | null = null;
        if (myOrg?.id) {
          const { data: followRows, error: followErr } = await supabase
            .from("org_follows")
            .select("user_id")
            .eq("org_id", myOrg.id);

          myOrgFollowersCount = followErr ? 0 : (followRows || []).length;
        }

        if (!alive) return;

        setData({
          profile,
          entangledCount,
          savedJobsCount,
          savedProductsCount,
          myOrg,
          myOrgFollowersCount,
        });
      } catch (err) {
        console.error("LeftSidebar load error:", err);
        if (!alive) return;
        setData({
          profile: null,
          entangledCount: 0,
          savedJobsCount: 0,
          savedProductsCount: 0,
          myOrg: null,
          myOrgFollowersCount: null,
        });
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };

    void loadAll();

    return () => {
      alive = false;
    };
  }, [user?.id]);

  const profile = data.profile;

  const fullName = profile?.full_name || fallbackName;
  const avatarUrl = profile?.avatar_url || null;

  const educationLevel = profile?.education_level || profile?.highest_education || "";
  const describesYou = profile?.describes_you || "";

  const headline = profile?.current_title?.trim()
    ? profile.current_title
    : profile?.role?.trim()
    ? profile.role
    : "";

  const affiliation = profile?.affiliation || profile?.current_org || "";
  const city = profile?.city || "";
  const country = profile?.country || "";

  const hasExtras = educationLevel || describesYou || headline || affiliation || city || country;

  // ✅ badge label from profiles mirror (preferred)
  const hasBadge = !!(profile?.q5_badge_label || profile?.q5_badge_level != null);
  const badgeLabel =
    (profile?.q5_badge_label && profile.q5_badge_label.trim()) ||
    (profile?.q5_badge_level != null ? `Q5-Level ${profile.q5_badge_level}` : "");

  return (
    <aside
      className="layout-left sticky-col"
      style={{ display: "flex", flexDirection: "column", gap: 6 }}
    >
      {/* PROFILE CARD */}
      <Link
        href={user ? "/profile" : "/auth"}
        className="sidebar-card profile-sidebar-card"
        style={{
          textDecoration: "none",
          color: "inherit",
          opacity: userLoading ? 0.9 : 1,
          pointerEvents: user ? "auto" : "none",
        }}
      >
        <div className="profile-sidebar-header">
          {/* ✅ Avatar wrapper must be RELATIVE so badge positions top-right correctly */}
          <div
            className="profile-sidebar-avatar-wrapper"
            style={{ position: "relative" }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={fullName} className="profile-sidebar-avatar" />
            ) : (
              <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                {(fullName || "Q").charAt(0).toUpperCase()}
              </div>
            )}

            {/* ✅ Badge top-right of avatar (same line/row) */}
            {hasBadge && badgeLabel && (
              <div
                style={{
                  position: "absolute",
                  top: -6,
                  right: -6,
                  zIndex: 2,
                }}
              >
                <Q5BadgePill
                  label={badgeLabel}
                  status={profile?.q5_badge_review_status}
                />
              </div>
            )}
          </div>

          <div className="profile-sidebar-name">{loading ? "Loading…" : fullName}</div>
        </div>

        {loading ? (
          <div className="profile-sidebar-info-block" style={{ opacity: 0.8 }}>
            <div className="profile-sidebar-info-value"> </div>
            <div className="profile-sidebar-info-value" style={{ marginTop: 4 }}>
              {" "}
            </div>
            <div className="profile-sidebar-info-value" style={{ marginTop: 4 }}>
              {" "}
            </div>
          </div>
        ) : (
          hasExtras && (
            <div className="profile-sidebar-info-block">
              {educationLevel && (
                <div className="profile-sidebar-info-value">{educationLevel}</div>
              )}

              {describesYou && (
                <div className="profile-sidebar-info-value" style={{ marginTop: 4 }}>
                  {describesYou}
                </div>
              )}

              {/* ✅ headline BEFORE affiliation, same line */}
              {(headline || affiliation) && (
                <div className="profile-sidebar-info-value" style={{ marginTop: 4 }}>
                  {[headline, affiliation].filter(Boolean).join(" · ")}
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
          )
        )}
      </Link>

      {/* QUICK DASHBOARD */}
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
            <span style={{ opacity: 0.9 }}>{data.entangledCount ?? "…"}</span>
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
            <span style={{ opacity: 0.9 }}>{data.savedJobsCount ?? "…"}</span>
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
            <span style={{ opacity: 0.9 }}>{data.savedProductsCount ?? "…"}</span>
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

      {/* MY ACTIVITY */}
      <div className="sidebar-card dashboard-sidebar-card">
        <div className="dashboard-sidebar-title">My activity</div>
        <div className="dashboard-sidebar-links" style={{ marginTop: 8 }}>
          <div
            className="dashboard-sidebar-link"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              cursor: "default",
            }}
          >
            <span>Posts</span>
            <span style={{ opacity: 0.9 }}>0</span>
          </div>
          <div
            className="dashboard-sidebar-link"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              cursor: "default",
            }}
          >
            <span>Questions</span>
            <span style={{ opacity: 0.9 }}>0</span>
          </div>
          <div
            className="dashboard-sidebar-link"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 8,
              cursor: "default",
            }}
          >
            <span>Answers</span>
            <span style={{ opacity: 0.9 }}>0</span>
          </div>
        </div>
      </div>

      {/* MY ORGANIZATION */}
      {data.myOrg && (
        <Link
          href={`/orgs/${data.myOrg.slug}`}
          className="sidebar-card dashboard-sidebar-card"
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <div className="dashboard-sidebar-title">My organization</div>

          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
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
              {data.myOrg.logo_url ? (
                <img
                  src={data.myOrg.logo_url}
                  alt={data.myOrg.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                data.myOrg.name.charAt(0).toUpperCase()
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
                {data.myOrg.name}
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
                  Followers:{" "}
                  <span style={{ color: "#e5e7eb" }}>
                    {data.myOrgFollowersCount ?? "…"}
                  </span>
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

      {/* PREMIUM CARD */}
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

        <div style={{ fontSize: 12, color: "rgba(248,250,252,0.9)", lineHeight: 1.5 }}>
          Unlock advanced analytics, reduced ads, and premium perks for your profile
          and organization.
        </div>
      </div>

      <div
        style={{
          width: "100%",
          height: 1,
          background: "rgba(148,163,184,0.18)",
          marginTop: 6,
          marginBottom: 6,
        }}
      />

      {/* SOCIALS + COPYRIGHT */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 12, fontSize: 18 }}>
          <a href="mailto:info@quantum5ocial.com" style={{ color: "rgba(148,163,184,0.9)" }}>
            ✉️
          </a>
          <a href="#" style={{ color: "rgba(148,163,184,0.9)" }}>
            𝕏
          </a>
          <a href="#" style={{ color: "rgba(148,163,184,0.9)", fontWeight: 600 }}>
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
