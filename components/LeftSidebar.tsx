// components/LeftSidebar.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";
import Q5BadgeChips from "./Q5BadgeChips";

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;

  highest_education?: string | null;

  role?: string | null;
  current_title?: string | null;
  affiliation?: string | null;

  q5_badge_level?: number | null;
  q5_badge_label?: string | null;
  q5_badge_review_status?: string | null;
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
  myPostsCount: number | null;
  myOrg: MyOrgSummary | null;
  myOrgFollowersCount: number | null;
};

export default function LeftSidebar() {
  const { user, loading: userLoading } = useSupabaseUser();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SidebarData>({
    profile: null,
    entangledCount: null,
    savedJobsCount: null,
    savedProductsCount: null,
    myPostsCount: null,
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
        myPostsCount: null,
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

        const savedJobsQ = supabase
          .from("saved_jobs")
          .select("job_id")
          .eq("user_id", uid);

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

        const postsQ = supabase
          .from("posts")
          .select("id")
          .eq("user_id", uid);

        const [pRes, cRes, sjRes, spRes, orgRes, postsRes] = await Promise.all([
          profileQ,
          connectionsQ,
          savedJobsQ,
          savedProductsQ,
          orgQ,
          postsQ,
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
        const myPostsCount = (postsRes.data || []).length;

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
          myPostsCount,
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
          myPostsCount: 0,
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

  const badgeLabel = profile?.q5_badge_label ?? null;
  const badgeStatus = profile?.q5_badge_review_status ?? null;

  const highestEducation = (profile?.highest_education || "").trim();

  const currentTitle =
    (profile?.current_title || "").trim() || (profile?.role || "").trim();
  const affiliation = (profile?.affiliation || "").trim();

  const titleLine = [currentTitle, affiliation].filter(Boolean).join(" · ");

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
        <div
          className="profile-sidebar-header"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 6,
          }}
        >
          {/* Badge pill */}
          {!loading && badgeLabel && (
            <div>
              <Q5BadgeChips
                label={badgeLabel}
                reviewStatus={badgeStatus}
                size="sm"
              />
            </div>
          )}

          {/* Avatar */}
          <div className="profile-sidebar-avatar-wrapper">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={fullName}
                className="profile-sidebar-avatar"
              />
            ) : (
              <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                {(fullName || "Q").charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Name */}
          <div className="profile-sidebar-name">
            {loading ? "Loading…" : fullName}
          </div>

          {/* Highest education */}
          {!loading && highestEducation && (
            <div
              style={{
                fontSize: 13,
                color: "rgba(226,232,240,0.88)",
                lineHeight: 1.2,
              }}
            >
              {highestEducation}
            </div>
          )}

          {/* Title + affiliation */}
          {!loading && titleLine && (
            <div
              style={{
                fontSize: 13,
                color: "rgba(148,163,184,0.95)",
                lineHeight: 1.2,
              }}
            >
              {titleLine}
            </div>
          )}
        </div>

        {/* Skeleton */}
        {loading && (
          <div style={{ marginTop: 10, opacity: 0.7 }}>
            <div
              className="profile-sidebar-info-value"
              style={{ height: 12 }}
            />
            <div
              className="profile-sidebar-info-value"
              style={{ height: 12, marginTop: 6 }}
            />
          </div>
        )}
      </Link>

      {/* DASHBOARD */}
      <div className="sidebar-card dashboard-sidebar-card">
        <div className="dashboard-sidebar-title">Dashboard</div>

        <div
          className="dashboard-sidebar-links"
          style={{
            marginTop: 8,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {/* Main ecosystem entry */}
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
            <span>My ecosystem</span>
            <span
              style={{
                fontSize: 11,
                color: "#7dd3fc",
                whiteSpace: "nowrap",
              }}
            >
              Open →
            </span>
          </Link>

          {/* Sub-menu under ecosystem */}
          <div
            style={{
              marginTop: 4,
              paddingLeft: 10,
              borderLeft: "1px dashed rgba(148,163,184,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Link
              href="/ecosystem/entangled"
              className="dashboard-sidebar-link"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
              }}
            >
              <span>Entanglements</span>
              <span style={{ opacity: 0.9 }}>
                {data.entangledCount ?? "…"}
              </span>
            </Link>

            <Link
              href="/ecosystem/my-posts"
              className="dashboard-sidebar-link"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
              }}
            >
              <span>Posts</span>
              <span style={{ opacity: 0.9 }}>
                {data.myPostsCount ?? "…"}
              </span>
            </Link>

            <Link
              href="/ecosystem/saved-jobs"
              className="dashboard-sidebar-link"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
              }}
            >
              <span>Saved jobs</span>
              <span style={{ opacity: 0.9 }}>
                {data.savedJobsCount ?? "…"}
              </span>
            </Link>

            <Link
              href="/ecosystem/saved-products"
              className="dashboard-sidebar-link"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
              }}
            >
              <span>Saved products</span>
              <span style={{ opacity: 0.9 }}>
                {data.savedProductsCount ?? "…"}
              </span>
            </Link>
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
              {data.myOrg.logo_url ? (
                <img
                  src={data.myOrg.logo_url}
                  alt={data.myOrg.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
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
                <div style={{ marginTop: 4, color: "#7dd3fc" }}>
                  Analytics →
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* PREMIUM CARD – title + pill + link, no body text */}
      <div
        className="sidebar-card premium-sidebar-card"
        style={{
          padding: "14px 16px",
          borderRadius: 20,
          background:
            "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(244,114,182,0.18))",
          border: "1px solid rgba(251,191,36,0.5)",
          boxShadow: "0 12px 30px rgba(15,23,42,0.7)",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
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

        <Link
          href="/premium"
          style={{
            fontSize: 12,
            color: "rgba(251,191,36,0.95)",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>Learn more</span>
          <span style={{ fontSize: 13 }}>›</span>
        </Link>
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
            style={{
              color: "rgba(148,163,184,0.9)",
              fontWeight: 600,
            }}
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
