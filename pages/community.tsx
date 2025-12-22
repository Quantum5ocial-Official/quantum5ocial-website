// pages/community.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";
import { useEntanglements } from "../lib/useEntanglements";
import Q5BadgeChips from "../components/Q5BadgeChips";

/* =========================
   TYPES
   ========================= */

type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;

  role: string | null;
  current_title?: string | null;

  short_bio: string | null;
  highest_education: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
  created_at?: string | null;

  is_featured?: boolean | null;
  featured_rank?: number | null;
  featured_at?: string | null;

  q5_badge_level?: number | null;
  q5_badge_label?: string | null;
  q5_badge_review_status?: string | null;
  q5_badge_claimed_at?: string | null;
};

type CommunityOrg = {
  id: string;
  name: string;
  slug: string;
  kind: "company" | "research_group";
  logo_url: string | null;
  tagline: string | null;
  industry: string | null;
  focus_areas: string | null;
  institution: string | null;
  department: string | null;
  city: string | null;
  country: string | null;
  created_at?: string | null;

  is_featured?: boolean | null;
  featured_rank?: number | null;
  featured_at?: string | null;
};

type CommunityItem = {
  kind: "person" | "organization";
  id: string;
  slug?: string;

  name: string;
  avatar_url: string | null;

  role?: string | null;
  current_title?: string | null;
  affiliation?: string | null;
  short_bio?: string | null;

  typeLabel: string;
  roleLabel: string;

  created_at: string | null;

  q5_badge_level?: number | null;
  q5_badge_label?: string | null;
  q5_badge_review_status?: string | null;
};

type CommunityCtx = {
  profiles: CommunityProfile[];
  orgs: CommunityOrg[];

  loadingProfiles: boolean;
  profilesError: string | null;

  loadingOrgs: boolean;
  orgsError: string | null;

  featuredProfile: CommunityProfile | null;
  featuredOrg: CommunityOrg | null;
  loadingFeatured: boolean;

  search: string;
  setSearch: (v: string) => void;

  communityLoading: boolean;
  communityError: string | null;
  totalCommunityCount: number;

  filteredProfiles: CommunityProfile[];
  filteredOrgs: CommunityOrg[];

  communityItems: CommunityItem[];
  hasAnyCommunity: boolean;

  getConnectionStatus: (otherUserId: string) => any;
  isEntangleLoading: (otherUserId: string) => boolean;
  handleEntangle: (otherUserId: string) => Promise<void>;
  handleDeclineEntangle: (otherUserId: string) => Promise<void>;

  orgFollows: Record<string, boolean>;
  followLoadingIds: string[];

  isFollowingOrg: (orgId: string) => boolean;
  isFollowLoading: (orgId: string) => boolean;
  handleFollowOrg: (orgId: string) => Promise<void>;
};

const CommunityContext = createContext<CommunityCtx | null>(null);

function useCommunityCtx() {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunityCtx must be used inside <CommunityProvider />");
  return ctx;
}

/* =========================
   PROVIDER
   ========================= */

function CommunityProvider({ children }: { children: ReactNode }) {
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const [orgs, setOrgs] = useState<CommunityOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  const [featuredProfile, setFeaturedProfile] = useState<CommunityProfile | null>(null);
  const [featuredOrg, setFeaturedOrg] = useState<CommunityOrg | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const [search, setSearch] = useState("");

  const {
    getConnectionStatus,
    isEntangleLoading,
    handleEntangle,
    handleDeclineEntangle,
  } = useEntanglements({
    user,
    redirectPath: "/community",
  });

  const [orgFollows, setOrgFollows] = useState<Record<string, boolean>>({});
  const [followLoadingIds, setFollowLoadingIds] = useState<string[]>([]);

  const isFollowingOrg = (orgId: string) => !!orgFollows[orgId];
  const isFollowLoading = (orgId: string) => followLoadingIds.includes(orgId);

  const handleFollowOrg = async (orgId: string) => {
    if (!user) {
      router.push("/auth?redirect=/community");
      return;
    }

    const alreadyFollowing = isFollowingOrg(orgId);
    setFollowLoadingIds((prev) => [...prev, orgId]);

    try {
      if (alreadyFollowing) {
        const { error } = await supabase
          .from("org_follows")
          .delete()
          .eq("user_id", user.id)
          .eq("org_id", orgId);

        if (error) {
          console.error("Error unfollowing organization", error);
        } else {
          setOrgFollows((prev) => {
            const copy = { ...prev };
            delete copy[orgId];
            return copy;
          });
        }
      } else {
        const { error } = await supabase.from("org_follows").upsert(
          { user_id: user.id, org_id: orgId },
          { onConflict: "user_id,org_id" }
        );

        if (error) {
          console.error("Error following organization", error);
        } else {
          setOrgFollows((prev) => ({ ...prev, [orgId]: true }));
        }
      }
    } catch (e) {
      console.error("Unexpected error in follow/unfollow", e);
    } finally {
      setFollowLoadingIds((prev) => prev.filter((id) => id !== orgId));
    }
  };

  useEffect(() => {
    const loadProfiles = async () => {
      setLoadingProfiles(true);
      setProfilesError(null);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            `
            id,
            full_name,
            avatar_url,
            role,
            current_title,
            short_bio,
            highest_education,
            affiliation,
            country,
            city,
            created_at,
            is_featured,
            featured_rank,
            featured_at,
            q5_badge_level,
            q5_badge_label,
            q5_badge_review_status,
            q5_badge_claimed_at
          `
          )
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading community profiles", error);
          setProfilesError("Could not load community members.");
          setProfiles([]);
        } else {
          setProfiles((data || []) as CommunityProfile[]);
        }
      } catch (e) {
        console.error("Community load crashed:", e);
        setProfilesError("Something went wrong while loading the community.");
        setProfiles([]);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadProfiles();
  }, []);

  useEffect(() => {
    const loadOrgs = async () => {
      setLoadingOrgs(true);
      setOrgsError(null);

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select(
            "id, name, slug, kind, logo_url, tagline, industry, focus_areas, institution, department, city, country, created_at, is_featured, featured_rank, featured_at"
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error loading organizations for community", error);
          setOrgsError("Could not load organizations.");
          setOrgs([]);
        } else {
          setOrgs((data || []) as CommunityOrg[]);
        }
      } catch (e) {
        console.error("Organization load crashed:", e);
        setOrgsError("Could not load organizations.");
        setOrgs([]);
      } finally {
        setLoadingOrgs(false);
      }
    };

    loadOrgs();
  }, []);

  useEffect(() => {
    const loadOrgFollows = async () => {
      if (!user) {
        setOrgFollows({});
        return;
      }

      try {
        const { data, error } = await supabase
          .from("org_follows")
          .select("org_id")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error loading org follows", error);
          setOrgFollows({});
          return;
        }

        const map: Record<string, boolean> = {};
        (data || []).forEach((row: any) => {
          map[row.org_id] = true;
        });
        setOrgFollows(map);
      } catch (e) {
        console.error("Unexpected error loading org follows", e);
        setOrgFollows({});
      }
    };

    if (user) loadOrgFollows();
    else setOrgFollows({});
  }, [user]);

  const communityLoading = loadingProfiles || loadingOrgs;
  const communityError = profilesError || orgsError;
  const totalCommunityCount = (profiles?.length || 0) + (orgs?.length || 0);

  const filteredProfiles = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return profiles;

    return profiles.filter((p) => {
      const haystack = (
        `${p.full_name || ""} ${p.current_title || ""} ${p.role || ""} ${p.affiliation || ""} ${
          p.short_bio || ""
        } ${p.city || ""} ${p.country || ""}`
      ).toLowerCase();
      return haystack.includes(q);
    });
  }, [profiles, search]);

  const filteredOrgs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orgs;

    return orgs.filter((org) => {
      const location = [org.city, org.country].filter(Boolean).join(" ");
      const meta =
        org.kind === "company"
          ? `${org.industry || ""} ${org.focus_areas || ""}`
          : `${org.institution || ""} ${org.department || ""} ${org.focus_areas || ""}`;

      const haystack = `${org.name || ""} ${meta} ${org.tagline || ""} ${location}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [orgs, search]);

  const communityItems: CommunityItem[] = useMemo(() => {
    const personItems: CommunityItem[] = filteredProfiles.map((p) => ({
      kind: "person",
      id: p.id,
      name: p.full_name || "Quantum5ocial member",
      avatar_url: p.avatar_url || null,
      role: p.role || null,
      current_title: p.current_title || null,
      affiliation: p.affiliation || null,
      short_bio: p.short_bio || null,
      typeLabel: "Member",
      roleLabel: p.role || "Quantum5ocial member",
      created_at: p.created_at || null,
      q5_badge_level: p.q5_badge_level ?? null,
      q5_badge_label: p.q5_badge_label ?? null,
      q5_badge_review_status: p.q5_badge_review_status ?? null,
    }));

    const orgItems: CommunityItem[] = filteredOrgs.map((o) => {
      const typeLabel = o.kind === "company" ? "Company" : "Research group";
      const roleLabel = o.kind === "company" ? o.industry || "Quantum company" : o.institution || "Research group";
      const short_bio = o.tagline || o.focus_areas || null;

      return {
        kind: "organization",
        id: o.id,
        slug: o.slug,
        name: o.name,
        avatar_url: o.logo_url || null,
        typeLabel,
        roleLabel,
        short_bio,
        created_at: o.created_at || null,
      };
    });

    return [...personItems, ...orgItems].sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });
  }, [filteredProfiles, filteredOrgs]);

  const hasAnyCommunity = communityItems.length > 0;

  const value: CommunityCtx = {
    profiles,
    orgs,
    loadingProfiles,
    profilesError,
    loadingOrgs,
    orgsError,

    featuredProfile,
    featuredOrg,
    loadingFeatured,

    search,
    setSearch,

    communityLoading,
    communityError,
    totalCommunityCount,

    filteredProfiles,
    filteredOrgs,

    communityItems,
    hasAnyCommunity,

    getConnectionStatus,
    isEntangleLoading,
    handleEntangle,
    handleDeclineEntangle,

    orgFollows,
    followLoadingIds,
    isFollowingOrg,
    isFollowLoading,
    handleFollowOrg,
  };

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

/* =========================
   MIDDLE
   ========================= */

function CommunityMiddle() {
  const { user } = useSupabaseUser();
  const router = useRouter();
  const ctx = useCommunityCtx();

  const {
    search,
    setSearch,

    communityLoading,
    communityError,
    totalCommunityCount,

    communityItems,
    hasAnyCommunity,

    getConnectionStatus,
    isEntangleLoading,
    handleEntangle,
    handleDeclineEntangle,

    isFollowingOrg,
    isFollowLoading,
    handleFollowOrg,
  } = ctx;

  // ✅ per-card expand/collapse (no modal)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpanded = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const pillTopRightWrap: React.CSSProperties = {
    position: "absolute",
    top: 10,
    right: 10,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 8,
    zIndex: 2,
  };

  const orgTypePill: React.CSSProperties = {
    fontSize: 10.5,
    borderRadius: 999,
    padding: "2px 7px",
    border: "1px solid rgba(148,163,184,0.7)",
    color: "rgba(226,232,240,0.95)",
    whiteSpace: "nowrap",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  };

  return (
    <section className="section">
      {/* STICKY HEADER + SEARCH */}
      <div className="jobs-main-header">
        <div
          className="card"
          style={{
            padding: 16,
            background:
              "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), rgba(15,23,42,0.98))",
            border: "1px solid rgba(148,163,184,0.35)",
            boxShadow: "0 18px 45px rgba(15,23,42,0.8)",
          }}
        >
          <div
            className="section-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                Quantum5ocial community
                {!communityLoading && !communityError && (
                  <span
                    style={{
                      fontSize: 12,
                      padding: "2px 10px",
                      borderRadius: 999,
                      background: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(56,189,248,0.5)",
                      color: "#7dd3fc",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ fontSize: 11 }}>🌐</span>
                    <span>
                      {totalCommunityCount} member{totalCommunityCount === 1 ? "" : "s"}
                    </span>
                  </span>
                )}
              </div>
              <div className="section-sub" style={{ maxWidth: 520, lineHeight: 1.45 }}>
                Discover members, labs, and companies in the quantum ecosystem{" "}
                <span style={{ color: "#7dd3fc" }}>
                  – entangle with people and follow organizations that matter to you.
                </span>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 4,
                minWidth: 160,
              }}
            >
              <Link href="/ecosystem" className="section-link" style={{ fontSize: 13 }}>
                View my ecosystem →
              </Link>
              <Link href="/orgs" className="section-link" style={{ fontSize: 13 }}>
                Browse organizations →
              </Link>
            </div>
          </div>

          {/* Search bar */}
          <div className="jobs-main-search" style={{ marginTop: 14 }}>
            <div
              style={{
                width: "100%",
                borderRadius: 999,
                padding: 2,
                background: "linear-gradient(90deg, rgba(56,189,248,0.7), rgba(129,140,248,0.7))",
              }}
            >
              <div
                style={{
                  borderRadius: 999,
                  background: "rgba(15,23,42,0.97)",
                  padding: "7px 13px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 14, opacity: 0.9 }}>🔍</span>
                <input
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    color: "#e5e7eb",
                    fontSize: 14,
                    width: "100%",
                  }}
                  placeholder="Search by name, role, organization, location…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {communityLoading && <div className="products-status">Loading community members…</div>}
      {communityError && !communityLoading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {communityError}
        </div>
      )}
      {!communityLoading && !communityError && !hasAnyCommunity && (
        <div className="products-empty">
          No members or organizations visible yet. As more users and orgs join Quantum5ocial,
          they will appear here.
        </div>
      )}

      {!communityLoading && !communityError && hasAnyCommunity && (
        <>
          {/* Browse header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(148,163,184,0.9)",
                  marginBottom: 3,
                }}
              >
                Browse community
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>Members &amp; organizations</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Showing {communityItems.length} match{communityItems.length === 1 ? "" : "es"}
            </div>
          </div>

          {/* ✅ 3-column grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3,minmax(0,1fr))",
              gap: 16,
            }}
          >
            {communityItems.map((item) => {
              const key = `${item.kind}-${item.id}`;
              const initial = item.name.charAt(0).toUpperCase();
              const isOrganization = item.kind === "organization";
              const isSelf = item.kind === "person" && user && item.id === user.id;

              const isClickable =
                item.kind === "person" || (item.kind === "organization" && item.slug);

              const headline = (item.current_title || item.role || "").trim() || null;
              const headlineLine =
                item.kind === "person"
                  ? ([headline, item.affiliation].filter(Boolean).join(" · ") || "—")
                  : item.roleLabel;

              const hasBadge =
                item.kind === "person" && !!(item.q5_badge_label || item.q5_badge_level != null);

              const badgeLabel =
                (item.q5_badge_label && item.q5_badge_label.trim()) ||
                (item.q5_badge_level != null ? `Q5-Level ${item.q5_badge_level}` : "");

              const bio = (item.short_bio || "").trim();
              const isLongBio = bio.length > 110;
              const isExpanded = !!expanded[key];

              return (
                <div
                  key={key}
                  className="card"
                  style={{
                    position: "relative",
                    textDecoration: "none",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 240,
                    ...(isClickable ? { cursor: "pointer" } : {}),
                  }}
                  onClick={
                    !isClickable
                      ? undefined
                      : () => {
                          if (item.kind === "person") router.push(`/profile/${item.id}`);
                          else if (item.kind === "organization" && item.slug)
                            router.push(`/orgs/${item.slug}`);
                        }
                  }
                >
                  {/* ✅ Top-right pill */}
                  <div style={pillTopRightWrap} onClick={(e) => e.stopPropagation()}>
                    {item.kind === "person" ? (
                      hasBadge ? (
                        <Q5BadgeChips
                          label={badgeLabel}
                          reviewStatus={item.q5_badge_review_status ?? null}
                          size="sm"
                        />
                      ) : null
                    ) : (
                      <span style={orgTypePill}>{item.typeLabel}</span>
                    )}
                  </div>

                  <div className="card-inner">
                    {/* Avatar row */}
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: isOrganization ? 14 : "999px",
                          overflow: "hidden",
                          flexShrink: 0,
                          border: "1px solid rgba(148,163,184,0.4)",
                          background: isOrganization
                            ? "linear-gradient(135deg,#3bc7f3,#8468ff)"
                            : "rgba(15,23,42,0.9)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          fontWeight: 600,
                          color: isOrganization ? "#0f172a" : "#e5e7eb",
                        }}
                      >
                        {item.avatar_url ? (
                          <img
                            src={item.avatar_url}
                            alt={item.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <span>{initial}</span>
                        )}
                      </div>

                      <div style={{ minWidth: 0, flex: 1, paddingRight: 86 /* room for pill */ }}>
                        {/* ✅ Name BELOW (no pill in this row anymore) */}
                        <div
                          className="card-title"
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            maxWidth: "100%",
                          }}
                          title={item.name}
                        >
                          {item.name}
                        </div>

                        {/* ✅ current_title(or role) + affiliation */}
                        <div
                          className="card-meta"
                          style={{ fontSize: 12, lineHeight: 1.4, marginTop: 2 }}
                          title={headlineLine}
                        >
                          {headlineLine}
                        </div>
                      </div>
                    </div>

                    {/* ✅ Bio: 1 line + expand/collapse */}
                    <div style={{ marginTop: 10 }}>
                      {bio ? (
                        <>
                          <div
                            style={{
                              fontSize: 12,
                              lineHeight: 1.45,
                              color: "rgba(226,232,240,0.86)",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: isExpanded ? "normal" : "nowrap",
                              maxHeight: isExpanded ? 200 : 18,
                              transition: "max-height 180ms ease",
                            }}
                            title={!isExpanded ? bio : undefined}
                          >
                            {bio}
                          </div>

                          {isLongBio && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpanded(key);
                              }}
                              style={{
                                marginTop: 6,
                                border: "none",
                                background: "transparent",
                                color: "rgba(125,211,252,0.95)",
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                padding: 0,
                              }}
                            >
                              {isExpanded ? "Show less" : "More"}
                            </button>
                          )}
                        </>
                      ) : (
                        <div style={{ fontSize: 12, color: "rgba(148,163,184,0.85)" }}>—</div>
                      )}
                    </div>
                  </div>

                  {/* Footer actions (unchanged logic) */}
                  <div style={{ marginTop: 12 }}>
                    {isOrganization ? (
                      (() => {
                        const following = isFollowingOrg(item.id);
                        const loading = isFollowLoading(item.id);

                        const label = following ? "Following" : "Follow";
                        const bg = following ? "transparent" : "rgba(59,130,246,0.16)";
                        const border = following
                          ? "1px solid rgba(148,163,184,0.7)"
                          : "1px solid rgba(59,130,246,0.6)";
                        const color = following ? "rgba(148,163,184,0.95)" : "#bfdbfe";

                        return (
                          <button
                            type="button"
                            style={{
                              width: "100%",
                              padding: "7px 0",
                              borderRadius: 10,
                              border,
                              background: bg,
                              color,
                              fontSize: 12,
                              cursor: loading ? "default" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              opacity: loading ? 0.7 : 1,
                            }}
                            disabled={loading}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFollowOrg(item.id);
                            }}
                          >
                            {loading ? "…" : label}
                            {!following && <span style={{ fontSize: 14 }}>+</span>}
                          </button>
                        );
                      })()
                    ) : isSelf ? (
                      <button
                        type="button"
                        style={{
                          width: "100%",
                          padding: "7px 0",
                          borderRadius: 10,
                          border: "1px solid rgba(148,163,184,0.7)",
                          background: "transparent",
                          color: "rgba(148,163,184,0.9)",
                          fontSize: 12,
                          cursor: "default",
                        }}
                        disabled
                        onClick={(e) => e.stopPropagation()}
                      >
                        This is you
                      </button>
                    ) : (
                      (() => {
                        const status = getConnectionStatus(item.id);
                        const loading = isEntangleLoading(item.id);

                        if (user && status === "pending_incoming") {
                          return (
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                disabled={loading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEntangle(item.id);
                                }}
                                style={{
                                  flex: 1,
                                  minWidth: 120,
                                  padding: "7px 0",
                                  borderRadius: 10,
                                  border: "none",
                                  background: "linear-gradient(90deg,#22c55e,#16a34a)",
                                  color: "#0f172a",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: loading ? "default" : "pointer",
                                  opacity: loading ? 0.7 : 1,
                                }}
                              >
                                {loading ? "…" : "Accept request"}
                              </button>

                              <button
                                type="button"
                                disabled={loading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeclineEntangle(item.id);
                                }}
                                style={{
                                  flex: 1,
                                  minWidth: 100,
                                  padding: "7px 0",
                                  borderRadius: 10,
                                  border: "1px solid rgba(148,163,184,0.7)",
                                  background: "transparent",
                                  color: "rgba(248,250,252,0.9)",
                                  fontSize: 12,
                                  cursor: loading ? "default" : "pointer",
                                  opacity: loading ? 0.7 : 1,
                                }}
                              >
                                Decline
                              </button>
                            </div>
                          );
                        }

                        let label = "Entangle +";
                        let bg = "linear-gradient(90deg,#22d3ee,#6366f1)";
                        let border = "none";
                        let color = "#0f172a";
                        let disabled = false;

                        if (user) {
                          if (status === "pending_outgoing") {
                            label = "Requested";
                            bg = "transparent";
                            border = "1px solid rgba(148,163,184,0.7)";
                            color = "rgba(148,163,184,0.95)";
                            disabled = true;
                          } else if (status === "accepted") {
                            label = "Entangled ✓";
                            bg = "transparent";
                            border = "1px solid rgba(74,222,128,0.7)";
                            color = "rgba(187,247,208,0.95)";
                            disabled = true;
                          } else if (status === "declined") {
                            label = "Declined";
                            bg = "transparent";
                            border = "1px solid rgba(148,163,184,0.5)";
                            color = "rgba(148,163,184,0.7)";
                            disabled = true;
                          }
                        }

                        return (
                          <button
                            type="button"
                            disabled={disabled || loading}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!disabled && !loading) handleEntangle(item.id);
                            }}
                            style={{
                              width: "100%",
                              padding: "7px 0",
                              borderRadius: 10,
                              border,
                              background: bg,
                              color,
                              fontSize: 12,
                              cursor: disabled || loading ? "default" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              opacity: loading ? 0.7 : 1,
                            }}
                          >
                            {loading ? "…" : label}
                          </button>
                        );
                      })()
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

/* =========================
   PAGE
   ========================= */

export default function CommunityPage() {
  return <CommunityMiddle />;
}

(CommunityPage as any).layoutProps = {
  variant: "two-left",
  right: null,
  wrap: (children: React.ReactNode) => <CommunityProvider>{children}</CommunityProvider>,
};
