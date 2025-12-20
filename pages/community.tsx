// pages/community.tsx (PART 1/3)
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";
import { useEntanglements } from "../lib/useEntanglements";

/* =========================
   TYPES
   ========================= */

// Community member type (person)
type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  short_bio: string | null;
  highest_education: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
  created_at?: string | null;

  // optional extra fields
  education_level?: string | null;
  describes_you?: string | null;
  current_org?: string | null;

  // featured fields
  is_featured?: boolean | null;
  featured_rank?: number | null;
  featured_at?: string | null;
};

// Organization type for community view
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

  // featured fields
  is_featured?: boolean | null;
  featured_rank?: number | null;
  featured_at?: string | null;
};

// Unified item in the grid
type CommunityItem = {
  kind: "person" | "organization";
  id: string;
  slug?: string;
  name: string;
  avatar_url: string | null;
  typeLabel: string;
  roleLabel: string;
  affiliationLine: string;
  short_bio: string;
  highest_education?: string | null;
  city?: string | null;
  country?: string | null;
  created_at: string | null;
};

type CommunityCtx = {
  profiles: CommunityProfile[];
  orgs: CommunityOrg[];

  loadingProfiles: boolean;
  profilesError: string | null;

  loadingOrgs: boolean;
  orgsError: string | null;

  // featured tiles (separate loading)
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

  // entanglements (people)
  getConnectionStatus: (otherUserId: string) => any;
  isEntangleLoading: (otherUserId: string) => boolean;
  handleEntangle: (otherUserId: string) => Promise<void>;
  handleDeclineEntangle: (otherUserId: string) => Promise<void>;

  // org follows
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
   MOBILE HOOK + DRAWER
   ========================= */

function useIsMobile(maxWidth = 820) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const set = () => setIsMobile(mq.matches);

    set();

    const anyMq = mq as any;

    if (mq.addEventListener) {
      mq.addEventListener("change", set);
      return () => mq.removeEventListener("change", set);
    }

    if (anyMq.addListener) {
      anyMq.addListener(set);
      return () => anyMq.removeListener(set);
    }

    return;
  }, [maxWidth]);

  return isMobile;
}

function RightDrawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);

    // lock background scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;
  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(2,6,23,0.62)",
        backdropFilter: "blur(8px)",
        display: "flex",
        justifyContent: "flex-end",
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "min(420px, 92vw)",
          height: "100%",
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.985))",
          borderLeft: "1px solid rgba(148,163,184,0.18)",
          boxShadow: "-24px 0 80px rgba(0,0,0,0.55)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "14px 14px",
            borderBottom: "1px solid rgba(148,163,184,0.14)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div
            style={{
              fontWeight: 900,
              fontSize: 14,
              color: "rgba(226,232,240,0.92)",
            }}
          >
            {title || "Panel"}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.18)",
              background: "rgba(2,6,23,0.22)",
              color: "rgba(226,232,240,0.92)",
              cursor: "pointer",
              fontWeight: 900,
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 12, overflowY: "auto" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

function CommunityRightSidebarDrawer() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* fixed right-edge tab (mobile only) */}
      <button
  type="button"
  aria-label={open ? "Close community panel" : "Open community panel"}
  onClick={() => setOpen((v) => !v)}
  style={{
    position: "fixed",
    right: 0,
    top: "80%",
    transform: "translateY(-50%)",
    zIndex: 1200,
    width: 30,
    height: 80,
    border: "1px solid rgba(148,163,184,0.35)",
    borderRight: "none",
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    background: "rgba(2,6,23,0.72)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
  }}
>
  <span
    aria-hidden="true"
    style={{
      fontSize: 22,
      lineHeight: 1,
      color: "rgba(226,232,240,0.95)",
      transform: open ? "rotate(180deg)" : "none",
      transition: "transform 160ms ease",
      userSelect: "none",
    }}
  >
    ❮
  </span>
</button>

      <RightDrawer open={open} onClose={() => setOpen(false)} title="Community">
        <CommunityRightSidebar />
      </RightDrawer>
    </>
  );
}
// pages/community.tsx (PART 2/3)

function CommunityProvider({ children }: { children: ReactNode }) {
  const { user } = useSupabaseUser();
  const router = useRouter();

  // --- Community data: people + orgs ---
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const [orgs, setOrgs] = useState<CommunityOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  // --- Featured picks (DB-driven like jobs/products) ---
  const [featuredProfile, setFeaturedProfile] = useState<CommunityProfile | null>(null);
  const [featuredOrg, setFeaturedOrg] = useState<CommunityOrg | null>(null);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const [search, setSearch] = useState("");

  // === CONNECTION STATE (from shared hook) ===
  const {
    getConnectionStatus,
    isEntangleLoading,
    handleEntangle,
    handleDeclineEntangle,
  } = useEntanglements({
    user,
    redirectPath: "/community",
  });

  // === FOLLOW STATE (orgs) ===
  const [orgFollows, setOrgFollows] = useState<Record<string, boolean>>({});
  const [followLoadingIds, setFollowLoadingIds] = useState<string[]>([]);

  const isFollowingOrg = (orgId: string) => !!orgFollows[orgId];
  const isFollowLoading = (orgId: string) => followLoadingIds.includes(orgId);

  // --- FOLLOW / UNFOLLOW ORG HANDLER ---
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

  // === LOAD COMMUNITY PROFILES (PEOPLE) ===
  useEffect(() => {
    const loadProfiles = async () => {
      setLoadingProfiles(true);
      setProfilesError(null);

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
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

  // === LOAD COMMUNITY ORGANIZATIONS ===
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

  // === LOAD FEATURED PROFILE + FEATURED ORG (DB-driven like jobs/products) ===
  useEffect(() => {
    let cancelled = false;

    const pickOne = async <T,>(
      table: string,
      select: string,
      // optional filter for orgs
      extraFilter?: { col: string; value: any }
    ): Promise<T | null> => {
      // 1) Try featured first (ranked, then most recently featured, then newest)
      let q = supabase.from(table).select(select).eq("is_featured", true);
      if (extraFilter) q = q.eq(extraFilter.col, extraFilter.value);

      const { data: featured, error: featErr } = await q
        .order("featured_rank", { ascending: true, nullsFirst: false })
        .order("featured_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1);

      if (!featErr && featured && featured.length > 0) return featured[0] as T;

      // 2) Fallback: latest
      let q2 = supabase.from(table).select(select);
      if (extraFilter) q2 = q2.eq(extraFilter.col, extraFilter.value);

      const { data: latest, error: latErr } = await q2
        .order("created_at", { ascending: false })
        .limit(1);

      if (!latErr && latest && latest.length > 0) return latest[0] as T;

      return null;
    };

    const loadFeatured = async () => {
      setLoadingFeatured(true);

      try {
        const [p, o] = await Promise.all([
          pickOne<CommunityProfile>(
            "profiles",
            "id, full_name, avatar_url, role, short_bio, highest_education, affiliation, city, country, created_at, is_featured, featured_rank, featured_at"
          ),
          pickOne<CommunityOrg>(
            "organizations",
            "id, name, slug, kind, logo_url, tagline, industry, focus_areas, institution, department, city, country, created_at, is_featured, featured_rank, featured_at",
            { col: "is_active", value: true }
          ),
        ]);

        if (cancelled) return;
        setFeaturedProfile(p);
        setFeaturedOrg(o);
      } catch (e) {
        console.error("Featured load crashed:", e);
        if (cancelled) return;
        setFeaturedProfile(null);
        setFeaturedOrg(null);
      } finally {
        if (cancelled) return;
        setLoadingFeatured(false);
      }
    };

    loadFeatured();

    return () => {
      cancelled = true;
    };
  }, []);

  // === LOAD ORG_FOLLOWS FOR FOLLOW STATE ===
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

  // === FILTER PEOPLE + ORGS BY SEARCH ===
  const filteredProfiles = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return profiles;

    return profiles.filter((p) => {
      const haystack = (
        `${p.full_name || ""} ${p.role || ""} ${p.affiliation || ""} ${p.short_bio || ""} ${
          p.city || ""
        } ${p.country || ""}`
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

  // === UNIFIED COMMUNITY ITEM LIST (MIXED PEOPLE + ORGS) ===
  const communityItems: CommunityItem[] = useMemo(() => {
    const personItems: CommunityItem[] = filteredProfiles.map((p) => {
      const name = p.full_name || "Quantum5ocial member";
      const location = [p.city, p.country].filter(Boolean).join(", ");
      const affiliationLine = p.affiliation || location || "—";
      const short_bio =
        p.short_bio ||
        (p.affiliation
          ? `Member of the quantum ecosystem at ${p.affiliation}.`
          : "Quantum5ocial community member exploring the quantum ecosystem.");

      return {
        kind: "person",
        id: p.id,
        name,
        avatar_url: p.avatar_url || null,
        typeLabel: "Member",
        roleLabel: p.role || "Quantum5ocial member",
        affiliationLine,
        short_bio,
        highest_education: p.highest_education || null,
        city: p.city || null,
        country: p.country || null,
        created_at: p.created_at || null,
      };
    });

    const orgItems: CommunityItem[] = filteredOrgs.map((o) => {
      const typeLabel = o.kind === "company" ? "Company" : "Research group";

      let roleLabel: string;
      let affiliationLine: string;

      if (o.kind === "company") {
        roleLabel = o.industry || "Quantum company";
        const location = [o.city, o.country].filter(Boolean).join(", ");
        affiliationLine = location || (o.industry || "—");
      } else {
        roleLabel = o.institution || "Research group";
        const base = [o.department || "", o.institution || ""].filter(Boolean).join(", ");
        const location = [o.city, o.country].filter(Boolean).join(", ");
        affiliationLine = base || location || "—";
      }

      const short_bio =
        o.tagline ||
        o.focus_areas ||
        (o.kind === "company"
          ? "Quantum company active in the quantum ecosystem."
          : "Research group active in the quantum ecosystem.");

      return {
        kind: "organization",
        id: o.id,
        slug: o.slug,
        name: o.name,
        avatar_url: o.logo_url || null,
        typeLabel,
        roleLabel,
        affiliationLine,
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
// pages/community.tsx (PART 3/3)

function CommunityRightSidebar() {
  const router = useRouter();
  const { user } = useSupabaseUser();

  const {
    featuredProfile,
    featuredOrg,
    loadingFeatured,

    getConnectionStatus,
    isEntangleLoading,
    handleEntangle,
    handleDeclineEntangle,

    isFollowingOrg,
    isFollowLoading,
    handleFollowOrg,
  } = useCommunityCtx();

  // ===== Inline styles to match Ecosystem colors =====
  const tileBase: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid rgba(148,163,184,0.18)",
    background: "linear-gradient(135deg, rgba(15,23,42,0.86), rgba(15,23,42,0.94))",
    boxShadow: "0 18px 40px rgba(15,23,42,0.45)",
  };

  // Cyan (Spotlight)
  const cyanTile: React.CSSProperties = {
    ...tileBase,
    border: "1px solid rgba(34,211,238,0.38)",
    background: "radial-gradient(circle at 0% 0%, rgba(34,211,238,0.16), rgba(15,23,42,0.96))",
    boxShadow:
      "0 18px 45px rgba(15,23,42,0.75), 0 0 0 1px rgba(34,211,238,0.10) inset",
  };

  // Purple (Featured org)
  const purpleTile: React.CSSProperties = {
    ...tileBase,
    border: "1px solid rgba(168,85,247,0.34)",
    background: "radial-gradient(circle at 0% 0%, rgba(168,85,247,0.14), rgba(15,23,42,0.96))",
    boxShadow:
      "0 18px 45px rgba(15,23,42,0.75), 0 0 0 1px rgba(168,85,247,0.10) inset",
  };

  const cyanLabel: React.CSSProperties = { color: "rgba(34,211,238,0.92)" };
  const purpleLabel: React.CSSProperties = { color: "rgba(168,85,247,0.92)" };

  const cyanOrbit: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(34,211,238,0.16)",
    border: "1px solid rgba(34,211,238,0.35)",
    color: "rgba(34,211,238,0.95)",
  };

  const purpleOrbit: React.CSSProperties = {
    width: 34,
    height: 34,
    borderRadius: 999,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(168,85,247,0.14)",
    border: "1px solid rgba(168,85,247,0.32)",
    color: "rgba(168,85,247,0.95)",
  };

  const cyanCta: React.CSSProperties = { color: "rgba(34,211,238,0.95)" };
  const purpleCta: React.CSSProperties = { color: "rgba(168,85,247,0.95)" };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <div className="hero-tiles hero-tiles-vertical">
        {/* =========================
            FEATURED MEMBER (tile)
        ========================== */}
        {loadingFeatured ? (
          <div className="hero-tile" style={cyanTile}>
            <div className="hero-tile-inner">
              <div className="tile-label" style={cyanLabel}>Profile of the week</div>
              <div className="tile-title-row">
                <div className="tile-title">Spotlight</div>
                <div className="tile-icon-orbit" style={cyanOrbit}>🤝</div>
              </div>
              <p className="tile-text">Loading featured member…</p>
            </div>
          </div>
        ) : featuredProfile ? (
          <div className="hero-tile" style={cyanTile}>
            <div className="hero-tile-inner">
              <div className="tile-label" style={cyanLabel}>Profile of the week</div>
              <div className="tile-title-row">
                <div className="tile-title">Spotlight</div>
                <div className="tile-icon-orbit" style={cyanOrbit}>🤝</div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  cursor: "pointer",
                }}
                onClick={() => router.push(`/profile/${featuredProfile.id}`)}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 999,
                    overflow: "hidden",
                    flexShrink: 0,
                    border: "1px solid rgba(148,163,184,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  {featuredProfile.avatar_url ? (
                    <img
                      src={featuredProfile.avatar_url}
                      alt={featuredProfile.full_name || "Member"}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    (featuredProfile.full_name || "M")[0].toUpperCase()
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>
                    {featuredProfile.full_name || "Quantum member"}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, lineHeight: 1.35 }}>
                    {[featuredProfile.highest_education, featuredProfile.role, featuredProfile.affiliation]
                      .filter(Boolean)
                      .join(" · ") || "Quantum5ocial community member"}
                  </div>
                  {featuredProfile.short_bio && (
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, lineHeight: 1.35 }}>
                      {featuredProfile.short_bio.length > 90
                        ? featuredProfile.short_bio.slice(0, 87) + "..."
                        : featuredProfile.short_bio}
                    </div>
                  )}
                </div>
              </div>

              {/* Entangle actions (same logic as middle) */}
              {(!user || featuredProfile.id !== user.id) &&
                (() => {
                  const status = getConnectionStatus(featuredProfile.id);
                  const loading = isEntangleLoading(featuredProfile.id);

                  if (user && status === "pending_incoming") {
                    return (
                      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEntangle(featuredProfile.id);
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
                            handleDeclineEntangle(featuredProfile.id);
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
                        handleEntangle(featuredProfile.id);
                      }}
                      style={{
                        width: "100%",
                        marginTop: 12,
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
                })()}

              <div className="tile-cta" style={cyanCta}>
                View member <span>›</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="hero-tile" style={cyanTile}>
            <div className="hero-tile-inner">
              <div className="tile-label" style={cyanLabel}>Profile of the week</div>
              <div className="tile-title-row">
                <div className="tile-title">Spotlight</div>
                <div className="tile-icon-orbit" style={cyanOrbit}>🤝</div>
              </div>
              <p className="tile-text">No profiles found yet.</p>
            </div>
          </div>
        )}

        {/* =========================
            FEATURED ORG (tile)
        ========================== */}
        {loadingFeatured ? (
          <div className="hero-tile" style={purpleTile}>
            <div className="hero-tile-inner">
              <div className="tile-label" style={purpleLabel}>Organization of the week</div>
              <div className="tile-title-row">
                <div className="tile-title">Featured</div>
                <div className="tile-icon-orbit" style={purpleOrbit}>🏢</div>
              </div>
              <p className="tile-text">Loading featured organization…</p>
            </div>
          </div>
        ) : featuredOrg ? (
          <div className="hero-tile" style={purpleTile}>
            <div className="hero-tile-inner">
              <div className="tile-label" style={purpleLabel}>Organization of the week</div>
              <div className="tile-title-row">
                <div className="tile-title">Featured</div>
                <div className="tile-icon-orbit" style={purpleOrbit}>🏢</div>
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                  cursor: featuredOrg.slug ? "pointer" : "default",
                }}
                onClick={() => {
                  if (featuredOrg.slug) router.push(`/orgs/${featuredOrg.slug}`);
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    overflow: "hidden",
                    flexShrink: 0,
                    border: "1px solid rgba(148,163,184,0.35)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                    color: "#0f172a",
                    fontWeight: 700,
                  }}
                >
                  {featuredOrg.logo_url ? (
                    <img
                      src={featuredOrg.logo_url}
                      alt={featuredOrg.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    featuredOrg.name.charAt(0).toUpperCase()
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>
                    {featuredOrg.name}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.85, marginTop: 4, lineHeight: 1.35 }}>
                    {featuredOrg.kind === "company"
                      ? featuredOrg.industry || "Quantum company"
                      : featuredOrg.institution || "Research group"}
                    {featuredOrg.city || featuredOrg.country
                      ? ` · ${[featuredOrg.city, featuredOrg.country].filter(Boolean).join(", ")}`
                      : ""}
                  </div>

                  {(featuredOrg.tagline || featuredOrg.focus_areas) && (
                    <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, lineHeight: 1.35 }}>
                      {(featuredOrg.tagline || featuredOrg.focus_areas || "").length > 90
                        ? (featuredOrg.tagline || featuredOrg.focus_areas || "").slice(0, 87) + "..."
                        : featuredOrg.tagline || featuredOrg.focus_areas}
                    </div>
                  )}
                </div>
              </div>

              {/* Follow button (same logic as middle) */}
              {(() => {
                const following = isFollowingOrg(featuredOrg.id);
                const loading = isFollowLoading(featuredOrg.id);

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
                      marginTop: 12,
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
                      handleFollowOrg(featuredOrg.id);
                    }}
                  >
                    {loading ? "…" : label}
                    {!following && <span style={{ fontSize: 14 }}>+</span>}
                  </button>
                );
              })()}

              <div className="tile-cta" style={purpleCta}>
                View organization <span>›</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="hero-tile" style={purpleTile}>
            <div className="hero-tile-inner">
              <div className="tile-label" style={purpleLabel}>Organization of the week</div>
              <div className="tile-title-row">
                <div className="tile-title">Featured</div>
                <div className="tile-icon-orbit" style={purpleOrbit}>🏢</div>
              </div>
              <p className="tile-text">No organizations found yet.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

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
              <div
                className="section-title"
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
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
                background:
                  "linear-gradient(90deg, rgba(56,189,248,0.7), rgba(129,140,248,0.7))",
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

      {/* BODY STATES */}
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

      {/* MAIN CONTENT */}
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
              <div style={{ fontSize: "0.95rem", fontWeight: 600 }}>
                Members &amp; organizations
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Showing {communityItems.length} match{communityItems.length === 1 ? "" : "es"}
            </div>
          </div>

          {/* Mixed grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: 16,
            }}
          >
            {communityItems.map((item) => {
              const initial = item.name.charAt(0).toUpperCase();
              const location = [item.city, item.country].filter(Boolean).join(", ");
              const highestEducation =
                item.kind === "person" ? item.highest_education || "—" : undefined;

              const isOrganization = item.kind === "organization";
              const isSelf = item.kind === "person" && user && item.id === user.id;

              const isClickable =
                item.kind === "person" || (item.kind === "organization" && item.slug);

              return (
                <div
                  key={`${item.kind}-${item.id}`}
                  className="card"
                  style={{
                    textDecoration: "none",
                    padding: 14,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: 230,
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
                  <div className="card-inner">
                    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
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
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <span>{initial}</span>
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <div
                            className="card-title"
                            style={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {item.name}
                          </div>
                          <span
                            style={{
                              fontSize: 10.5,
                              borderRadius: 999,
                              padding: "2px 7px",
                              border: "1px solid rgba(148,163,184,0.7)",
                              color: "rgba(226,232,240,0.95)",
                              whiteSpace: "nowrap",
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                            }}
                          >
                            {item.typeLabel}
                          </span>
                        </div>
                        <div className="card-meta" style={{ fontSize: 12, lineHeight: 1.4 }}>
                          {item.roleLabel}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        marginTop: 6,
                      }}
                    >
                      {item.kind === "person" && (
                        <div>
                          <span style={{ opacity: 0.7 }}>Education: </span>
                          <span>{highestEducation || "—"}</span>
                        </div>
                      )}

                      <div>
                        <span style={{ opacity: 0.7 }}>
                          {item.kind === "person" ? "Affiliation: " : "Location / meta: "}
                        </span>
                        <span>{item.affiliationLine || location || "—"}</span>
                      </div>

                      {location && (
                        <div>
                          <span style={{ opacity: 0.7 }}>Location: </span>
                          <span>{location}</span>
                        </div>
                      )}

                      <div
                        style={{
                          marginTop: 6,
                          fontSize: 12,
                          lineHeight: 1.4,
                          maxHeight: 60,
                          overflow: "hidden",
                        }}
                      >
                        {item.short_bio}
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div style={{ marginTop: 10 }}>
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

function CommunityTwoColumnShell() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 1px 280px",
        alignItems: "stretch",
        minHeight: "100vh",
      }}
    >
      {/* MIDDLE */}
      <div style={{ paddingRight: 16 }}>
        <CommunityMiddle />
      </div>

      {/* FULL-HEIGHT DIVIDER */}
      <div
        style={{
          background: "rgba(148,163,184,0.35)",
          width: 1,
          alignSelf: "stretch",
        }}
      />

      {/* RIGHT */}
      <div style={{ paddingLeft: 16, position: "sticky", top: 16, alignSelf: "start" }}>
        <CommunityRightSidebar />
      </div>
    </div>
  );
}

export default function CommunityPage() {
  const isMobile = useIsMobile(820);

  // desktop: unchanged (shows right sidebar normally)
  if (!isMobile) return <CommunityTwoColumnShell />;

  // mobile: only middle + right drawer
  return (
    <>
      <CommunityMiddle />
      <CommunityRightSidebarDrawer />
    </>
  );
}

// ✅ global layout: left-only
// ✅ wrap so mobileMain also has context
// ✅ mobileMain remains middle (drawer is inside the page)
(CommunityPage as any).layoutProps = {
  variant: "two-left",
  right: null,
  wrap: (children: React.ReactNode) => <CommunityProvider>{children}</CommunityProvider>,
  mobileMain: (
    <>
      <CommunityMiddle />
      <CommunityRightSidebarDrawer />
    </>
  ),
};
