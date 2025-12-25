// pages/orgs/[slug].tsx
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

import OrgPostsTab from "../../components/org/OrgPostsTab";
import OrgTeamTab from "../../components/org/OrgTeamTab";
import OrgProductsTab from "../../components/org/OrgProductsTab";
import OrgJobsTab from "../../components/org/OrgJobsTab"; // <-- new import
import OrgAnalyticsTab from "../../components/org/OrgAnalyticsTab"; // <-- new import (placeholder)

type Org = {
  id: string;
  created_by: string | null;
  kind: "company" | "research_group";
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  website: string | null;
  logo_url: string | null;
  country: string | null;
  city: string | null;
  industry: string | null;
  focus_areas: string | null;
  size_label: string | null;
  company_type: string | null;
  group_type: string | null;
  institution: string | null;
  department: string | null;
  hiring_status:
    | ""
    | "not_hiring"
    | "hiring_selectively"
    | "actively_hiring"
    | null;
};

// membership roles for org_members
type OrgMemberRole = "owner" | "co_owner" | "admin" | "member";

type OrgMemberRow = {
  user_id: string;
  role: OrgMemberRole;
  is_affiliated: boolean;
};

// ------------------------------------
// extended TabKey to include analytics
// ------------------------------------
type TabKey = "posts" | "products" | "jobs" | "team" | "analytics";

const OrganizationDetailPage = () => {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const { slug } = router.query;

  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Followers count (keep for header badge)
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [followLoading, setFollowLoading] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);

  // Membership state for current user
  const [memberRole, setMemberRole] = useState<OrgMemberRole | null>(null);
  const [isAffiliated, setIsAffiliated] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<TabKey>("posts");

  // Sync tab from query (optional)
  useEffect(() => {
    const t = (router.query.tab as string | undefined) || "";
    const key = (t || "").toLowerCase();
    if (
      key === "posts" ||
      key === "products" ||
      key === "jobs" ||
      key === "team" ||
      key === "analytics"
    ) {
      setActiveTab(key as TabKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query.tab]);

  const setTab = (t: TabKey) => {
    setActiveTab(t);
    const next = { ...router.query, tab: t };
    router.replace({ pathname: router.pathname, query: next }, undefined, {
      shallow: true,
    });
  };

  // === LOAD CURRENT ORG BY SLUG ===
  useEffect(() => {
    if (!slug) return;

    const loadOrg = async () => {
      setLoading(true);
      setNotFound(false);

      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        setOrg(data as Org);
      } else {
        setOrg(null);
        setNotFound(true);
      }

      setLoading(false);
    };

    loadOrg();
  }, [slug]);

  const kindLabel = org?.kind === "company" ? "Company" : "Research group";

  const metaLine = useMemo(() => {
    if (!org) return "";
    const bits: string[] = [];

    if (org.kind === "company") {
      if (org.industry) bits.push(org.industry);
      if (org.company_type) bits.push(org.company_type);
    } else {
      if (org.institution) bits.push(org.institution);
      if (org.department) bits.push(org.department);
    }

    if (org.size_label) bits.push(org.size_label);

    if (org.city && org.country) bits.push(`${org.city}, ${org.country}`);
    else if (org.country) bits.push(org.country);

    return bits.join(" · ");
  }, [org]);

  const firstLetter = org?.name?.charAt(0).toUpperCase() || "Q";

  const editHref = useMemo(() => {
    if (!org) return "#";
    return org.kind === "company"
      ? `/orgs/edit/company/${org.slug}`
      : `/orgs/edit/research-group/${org.slug}`;
  }, [org]);

  // === UPDATED Hiring badge logic ===
  const hiringBadge = useMemo(() => {
    if (!org) return null;
    if (org.kind !== "company") return null;

    const hs = org.hiring_status || "";

    // No status or empty string
    if (!hs) {
      return {
        text: "Hiring updates soon",
        title: "Hiring status not set yet",
        border: "1px solid rgba(148,163,184,0.7)",
        background: "rgba(15,23,42,0.18)",
        color: "rgba(209,213,219,0.95)",
        icon: "🕒",
      };
    }

    if (hs === "not_hiring") {
      return {
        text: "Not hiring",
        title: "This company is not hiring currently",
        border: "1px solid rgba(248,113,113,0.9)",
        background: "rgba(248,113,113,0.12)",
        color: "rgba(248,113,113,0.95)",
        icon: "🚫",
      };
    }

    if (hs === "actively_hiring") {
      return {
        text: "Actively hiring",
        title: "This company is actively hiring",
        border: "1px solid rgba(34,197,94,0.95)",
        background: "rgba(22,163,74,0.18)",
        color: "rgba(187,247,208,0.98)",
        icon: "⚡",
      };
    }

    if (hs === "hiring_selectively") {
      return {
        text: "Hiring selectively",
        title: "This company is hiring selectively",
        border: "1px solid rgba(250,204,21,0.9)",
        background: "rgba(234,179,8,0.14)",
        color: "rgba(254,249,195,0.95)",
        icon: "✨",
      };
    }

    return null;
  }, [org]);

  // === LOAD FOLLOWERS COUNT + IS_FOLLOWING (header only) ===
  useEffect(() => {
    const loadFollowers = async () => {
      if (!org) {
        setFollowersCount(null);
        setIsFollowing(false);
        return;
      }

      try {
        const { data: followRows, error: followErr } = await supabase
          .from("org_follows")
          .select("user_id")
          .eq("org_id", org.id);

        if (followErr) {
          console.error("Error loading org followers", followErr);
          setFollowersCount(0);
          setIsFollowing(false);
          return;
        }

        const userIds = (followRows || []).map((r: any) => r.user_id);
        setFollowersCount(userIds.length);
        if (user) setIsFollowing(userIds.includes(user.id));
        else setIsFollowing(false);
      } catch (e) {
        console.error("Unexpected error loading followers count", e);
        setFollowersCount(0);
        setIsFollowing(false);
      }
    };

    loadFollowers();
  }, [org, user]);

  // === LOAD MEMBERSHIP FOR CURRENT USER ===
  useEffect(() => {
    const loadMembership = async () => {
      if (!user || !org) {
        setMemberRole(null);
        setIsAffiliated(false);
        return;
      }

      // ✅ CREATOR FALLBACK: if you're the org creator, you're always affiliated/owner
      if (org.created_by === user.id) {
        setMemberRole("owner");
        setIsAffiliated(true);
        return;
      }

      const { data, error } = await supabase
        .from("org_members")
        .select("role, is_affiliated")
        .eq("org_id", org.id)
        .eq("user_id", user.id)
        .maybeSingle<OrgMemberRow>();

      if (error) {
        console.error("Error loading org membership", error);
        setMemberRole(null);
        setIsAffiliated(false);
        return;
      }

      if (data) {
        setMemberRole(data.role);
        setIsAffiliated(!!data.is_affiliated);
      } else {
        setMemberRole(null);
        setIsAffiliated(false);
      }
    };

    loadMembership();
  }, [user, org]);

  // === PERMISSIONS (same logic as before) ===
  const { canEditOrg, canManageMembers, canRemoveOthers } = useMemo(() => {
    if (!user || !org) {
      return {
        canEditOrg: false,
        canManageMembers: false,
        canRemoveOthers: false,
      };
    }

    const isCreator = org.created_by === user.id;
    const isOwnerLike = memberRole === "owner" || memberRole === "co_owner";
    const isAdmin = memberRole === "admin";

    // Org-page editing: only owner / co-owner / creator (fallback)
    const canEditOrgPage = isOwnerLike || isCreator;

    // Team management: owner / co-owner / admin / creator (fallback)
    const canManage = isOwnerLike || isAdmin || isCreator;

    // Removing others: owner / co-owner / admin / creator (fallback)
    const canRemove =
      memberRole === "owner" ||
      memberRole === "co_owner" ||
      memberRole === "admin" ||
      isCreator;

    return {
      canEditOrg: canEditOrgPage,
      canManageMembers: canManage,
      canRemoveOthers: canRemove,
    };
  }, [user, org, memberRole]);

  // Who is allowed to post as the org:
  const canPostAsOrg =
    !!user &&
    !!org &&
    (org.created_by === user.id ||
      memberRole === "owner" ||
      memberRole === "co_owner" ||
      memberRole === "admin");

  // ✅ Who is allowed to list products as the org (owner/co_owner only)
  const canListProductsAsOrg =
    !!user &&
    !!org &&
    (org.created_by === user.id || memberRole === "owner" || memberRole === "co_owner");

  // ✅ Who is allowed to list jobs as the org (owner/co_owner only) — mirror products logic
  const canListJobsAsOrg = canListProductsAsOrg;

  // ---------- new: who can view analytics ----------
  const canViewAnalytics = memberRole === "owner" || memberRole === "co_owner";

  const handleFollowClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!org) return;

    if (!user) {
      // Next.js Link usage shown in docs.  [oai_citation:0‡Next.js](https://nextjs.org/docs/app/api-reference/components/link#:~:text=,Script%20Component)
      router.push(`/auth?redirect=${encodeURIComponent(router.asPath)}`);
      return;
    }

    if (followLoading) return;

    setFollowLoading(true);
    try {
      if (isFollowing) {
        const { error } = await supabase
          .from("org_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("org_id", org.id);

        if (error) {
          console.error("Error unfollowing organization", error);
        } else {
          setIsFollowing(false);
          setFollowersCount((prev) => (prev === null ? prev : Math.max(prev - 1, 0)));
        }
      } else {
        const { error } = await supabase.from("org_follows").insert({
          user_id: user.id,
          org_id: org.id,
        });

        if (error) {
          console.error("Error following organization", error);
        } else {
          setIsFollowing(true);
          setFollowersCount((prev) => (prev === null ? 1 : prev + 1));
        }
      }
    } catch (err) {
      console.error("Unexpected follow/unfollow error", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const aboutCard: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.62)",
    padding: 14,
    marginBottom: 12,
  };

  const tabWrapStyle: React.CSSProperties = {
    marginTop: 16,
    marginBottom: 12,
    padding: 6,
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.28)",
    display: "flex",
    gap: 6,
    alignItems: "center",
    flexWrap: "wrap",
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 999,
    border: active ? "1px solid rgba(99,102,241,0.55)" : "1px solid rgba(148,163,184,0.18)",
    background: active
      ? "linear-gradient(135deg, rgba(59,130,246,0.22), rgba(99,102,241,0.18))"
      : "rgba(2,6,23,0.16)",
    color: active ? "rgba(226,232,240,0.98)" : "rgba(226,232,240,0.86)",
    fontSize: 13,
    fontWeight: 800,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    userSelect: "none",
  });

  const comingSoonCard: React.CSSProperties = {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.72)",
    padding: 14,
    color: "rgba(226,232,240,0.92)",
  };

  return (
    <section className="section" style={{ paddingTop: 24, paddingBottom: 48 }}>
      {loading ? (
        <div style={{ fontSize: 14, color: "rgba(209,213,219,0.9)" }}>Loading organization…</div>
      ) : notFound || !org ? (
        <div style={{ fontSize: 14, color: "rgba(209,213,219,0.9)" }}>
          Organization not found or no longer active.
        </div>
      ) : (
        <>
          {/* Header (kept as-is) */}
          <section
            style={{
              borderRadius: 24,
              padding: 24,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,1))",
              boxShadow: "0 22px 50px rgba(15,23,42,0.75)",
              marginBottom: 16,
              display: "flex",
              gap: 20,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 24,
                overflow: "hidden",
                flexShrink: 0,
                border: "1px solid rgba(148,163,184,0.45)",
                background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: 30,
              }}
            >
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                firstLetter
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 6,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h1
                    style={{
                      fontSize: 28,
                      fontWeight: 600,
                      margin: 0,
                      marginBottom: 6,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {org.name}
                  </h1>

                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        fontSize: 12,
                        borderRadius: 999,
                        padding: "3px 9px",
                        border: "1px solid rgba(148,163,184,0.7)",
                        color: "rgba(226,232,240,0.95)",
                      }}
                    >
                      {kindLabel}
                    </span>

                    {org.size_label && (
                      <span
                        style={{
                          fontSize: 12,
                          borderRadius: 999,
                          padding: "3px 9px",
                          border: "1px solid rgba(148,163,184,0.5)",
                          color: "rgba(226,232,240,0.9)",
                        }}
                      >
                        {org.size_label}
                      </span>
                    )}

                    {followersCount !== null && (
                      <span
                        style={{
                          fontSize: 12,
                          borderRadius: 999,
                          padding: "3px 9px",
                          border: "1px solid rgba(148,163,184,0.5)",
                          color: "rgba(226,232,240,0.9)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Followers: {followersCount}
                      </span>
                    )}

                    {isAffiliated && (
                      <span
                        style={{
                          fontSize: 12,
                          borderRadius: 999,
                          padding: "3px 9px",
                          border: "1px solid rgba(34,197,94,0.7)",
                          color: "rgba(187,247,208,0.95)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        You&apos;re affiliated
                      </span>
                    )}

                    {hiringBadge && (
                      <span
                        title={hiringBadge.title}
                        style={{
                          fontSize: 12,
                          borderRadius: 999,
                          padding: "3px 10px",
                          border: hiringBadge.border,
                          background: hiringBadge.background,
                          color: hiringBadge.color,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span style={{ fontSize: 12, lineHeight: 1 }}>{hiringBadge.icon}</span>
                        {hiringBadge.text}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "row", gap: 8, flexShrink: 0 }}>
                  {canEditOrg ? (
                    <Link
                      href={editHref}
                      style={{
                        padding: "9px 16px",
                        borderRadius: 999,
                        fontSize: 13,
                        fontWeight: 500,
                        textDecoration: "none",
                        background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                        color: "#0f172a",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Edit organization
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={handleFollowClick}
                      disabled={followLoading}
                      style={{
                        padding: "9px 16px",
                        borderRadius: 999,
                        fontSize: 13,
                        border: isFollowing
                          ? "1px solid rgba(148,163,184,0.7)"
                          : "1px solid rgba(59,130,246,0.6)",
                        background: isFollowing ? "transparent" : "rgba(59,130,246,0.16)",
                        color: isFollowing ? "rgba(148,163,184,0.95)" : "#bfdbfe",
                        cursor: followLoading ? "default" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
                    </button>
                  )}
                </div>
              </div>

              {metaLine && (
                <div
                  style={{ fontSize: 13, color: "rgba(148,163,184,0.95)", marginBottom: 6 }}
                >
                  {metaLine}
                </div>
              )}

              {org.tagline && (
                <div style={{ fontSize: 14, color: "rgba(209,213,219,0.95)" }}>
                  {org.tagline}
                </div>
              )}

              {org.website && (
                <div style={{ marginTop: 10, fontSize: 13 }}>
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#7dd3fc", textDecoration: "none" }}
                  >
                    {org.website.replace(/^https?:\/\//, "")} ↗
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* About (description + focus areas) */}
          {(org.description || org.focus_areas) && (
            <div className="card" style={aboutCard}>
              {org.description ? (
                <div
                  style={{
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "rgba(226,232,240,0.92)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {org.description}
                </div>
              ) : null}

              {org.focus_areas ? (
                <div style={{ marginTop: org.description ? 12 : 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 0.08,
                      color: "rgba(148,163,184,0.9)",
                      marginBottom: 6,
                    }}
                  >
                    Focus areas
                  </div>
                  <div style={{ fontSize: 14, color: "rgba(226,232,240,0.92)" }}>
                    {org.focus_areas}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Tabs */}
          <div style={tabWrapStyle} role="tablist" aria-label="Organization sections">
            <button
              type="button"
              onClick={() => setTab("posts")}
              style={tabBtn(activeTab === "posts")}
              role="tab"
              aria-selected={activeTab === "posts"}
            >
              Posts
            </button>

            <button
              type="button"
              onClick={() => setTab("products")}
              style={tabBtn(activeTab === "products")}
              role="tab"
              aria-selected={activeTab === "products"}
            >
              Our Products
            </button>

            <button
              type="button"
              onClick={() => setTab("jobs")}
              style={tabBtn(activeTab === "jobs")}
              role="tab"
              aria-selected={activeTab === "jobs"}
            >
              Jobs available
            </button>

            <button
              type="button"
              onClick={() => setTab("team")}
              style={tabBtn(activeTab === "team")}
              role="tab"
              aria-selected={activeTab === "team"}
            >
              Our Team
            </button>

            {/* new Analytics tab — only for owner/co-owner */}
            {canViewAnalytics && (
              <button
                type="button"
                onClick={() => setTab("analytics")}
                style={tabBtn(activeTab === "analytics")}
                role="tab"
                aria-selected={activeTab === "analytics"}
              >
                Analytics
              </button>
            )}
          </div>

          {/* Panels */}
          {activeTab === "posts" && <OrgPostsTab org={org} canPostAsOrg={canPostAsOrg} />}

          {activeTab === "products" && (
            <OrgProductsTab org={org} canListProduct={canListProductsAsOrg} />
          )}

          {activeTab === "jobs" && (
            // render jobs tab instead of coming soon
            <OrgJobsTab org={org} canListJob={canListJobsAsOrg} />
          )}

          {activeTab === "team" && (
            <OrgTeamTab
              org={org}
              canManageMembers={canManageMembers}
              canRemoveOthers={canRemoveOthers}
              memberRole={memberRole}
              isAffiliated={isAffiliated}
              onSelfAffiliatedChange={(v: boolean) => setIsAffiliated(v)}
            />
          )}

          {/* new Analytics panel — only render if allowed */}
          {activeTab === "analytics" && canViewAnalytics && <OrgAnalyticsTab org={org} />}
        </>
      )}
    </section>
  );
};

// AppLayout: left-only global sidebar, no right sidebar
(OrganizationDetailPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};

export default OrganizationDetailPage;
