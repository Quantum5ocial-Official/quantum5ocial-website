// pages/community.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

// Left-sidebar profile summary (same as homepage)
type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
};

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

  // Optional extra fields we sometimes use
  education_level?: string | null;
  describes_you?: string | null;
  current_org?: string | null;
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
};

// Unified item in the grid
type CommunityItem = {
  kind: "person" | "organization";
  id: string;
  name: string;
  avatar_url: string | null;
  typeLabel: string; // e.g. "Member", "Company", "Research group"
  roleLabel: string; // for person: role, for org: industry or institution
  affiliationLine: string;
  short_bio: string;
  highest_education?: string | null;
  city?: string | null;
  country?: string | null;
  created_at: string | null;
};

// Minimal org summary for sidebar tile
type MyOrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

// Connections / entanglement
type ConnectionStatus =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted";

type ConnectionRow = {
  id: string;
  user_id: string;
  target_user_id: string;
  status: "pending" | "accepted" | "declined";
};

export default function CommunityPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  // --- Sidebar profile + counts (same as homepage) ---
  const [profileSummary, setProfileSummary] = useState<ProfileSummary | null>(
    null
  );
  const [savedJobsCount, setSavedJobsCount] = useState<number | null>(null);
  const [savedProductsCount, setSavedProductsCount] = useState<number | null>(
    null
  );
  const [entangledCount, setEntangledCount] = useState<number | null>(null);

  // NEW: first organization created by this user (for sidebar tile)
  const [myOrg, setMyOrg] = useState<MyOrgSummary | null>(null);
  const [loadingMyOrg, setLoadingMyOrg] = useState<boolean>(true);

  // --- Community data: people + orgs ---
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const [orgs, setOrgs] = useState<CommunityOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // === CONNECTION + FOLLOW STATE ===
  const [connectionsByOtherId, setConnectionsByOtherId] = useState<
    Record<string, ConnectionRow>
  >({});
  const [entangleLoadingIds, setEntangleLoadingIds] = useState<string[]>([]);

  const [orgFollows, setOrgFollows] = useState<Record<string, boolean>>({});
  const [followLoadingIds, setFollowLoadingIds] = useState<string[]>([]);

  // --- HELPERS FOR CONNECTION/FOLLOW STATE ---
  const getConnectionStatus = (otherUserId: string): ConnectionStatus => {
    if (!user) return "none";
    const row = connectionsByOtherId[otherUserId];
    if (!row) return "none";

    if (row.status === "accepted") return "accepted";

    if (row.status === "pending") {
      if (row.user_id === user.id) return "pending_outgoing";
      if (row.target_user_id === user.id) return "pending_incoming";
    }

    return "none";
  };

  const isEntangleLoading = (otherUserId: string) =>
    entangleLoadingIds.includes(otherUserId);

  const isFollowingOrg = (orgId: string) => !!orgFollows[orgId];
  const isFollowLoading = (orgId: string) => followLoadingIds.includes(orgId);

  // --- ENTANGLE HANDLER (send / accept) ---
  const handleEntangle = async (targetUserId: string) => {
    if (!user) {
      router.push("/auth?redirect=/community");
      return;
    }

    if (targetUserId === user.id) return; // no self-entanglement

    const currentRow = connectionsByOtherId[targetUserId];
    const currentStatus = getConnectionStatus(targetUserId);

    // Already accepted or outgoing pending → ignore click
    if (currentStatus === "accepted" || currentStatus === "pending_outgoing") {
      return;
    }

    setEntangleLoadingIds((prev) => [...prev, targetUserId]);

    try {
      // Case 1: there's a pending request *to you* → accept it
      if (currentStatus === "pending_incoming" && currentRow) {
        const { error } = await supabase
          .from("connections")
          .update({ status: "accepted" })
          .eq("id", currentRow.id);

        if (error) {
          console.error("Error accepting entanglement", error);
        } else {
          setConnectionsByOtherId((prev) => ({
            ...prev,
            [targetUserId]: { ...currentRow, status: "accepted" },
          }));
        }
        return;
      }

      // Case 2: no connection yet → send request (pending_outgoing)
      if (currentStatus === "none") {
        const { data, error } = await supabase
          .from("connections")
          .insert({
            user_id: user.id,
            target_user_id: targetUserId,
            status: "pending",
          })
          .select("id, user_id, target_user_id, status")
          .maybeSingle();

        if (error) {
          console.error("Error creating entanglement request", error);
        } else if (data) {
          const newRow = data as ConnectionRow;
          setConnectionsByOtherId((prev) => ({
            ...prev,
            [targetUserId]: newRow,
          }));
        }
      }
    } catch (e) {
      console.error("Unexpected error creating/accepting entanglement", e);
    } finally {
      setEntangleLoadingIds((prev) =>
        prev.filter((id) => id !== targetUserId)
      );
    }
  };

  // --- FOLLOW / UNFOLLOW ORG HANDLER ---
  const handleFollowOrg = async (orgId: string) => {
    if (!user) {
      router.push("/auth?redirect=/community");
      return;
    }

    const alreadyFollowing = isFollowingOrg(orgId);

    setFollowLoadingIds((prev) => [...prev, orgId]);

    try{
      if (alreadyFollowing) {
        // Unfollow
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
        // Follow
        const { error } = await supabase
          .from("org_follows")
          .upsert(
            {
              user_id: user.id,
              org_id: orgId,
            },
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

  // === LOAD CURRENT USER PROFILE FOR LEFT SIDEBAR ===
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) {
        setProfileSummary(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) {
        setProfileSummary(data as ProfileSummary);
      } else {
        setProfileSummary(null);
      }
    };

    loadProfile();
  }, [user]);

  // === LOAD COUNTS FOR QUICK DASHBOARD (saved jobs/products + entangled states) ===
  useEffect(() => {
    const loadCounts = async () => {
      if (!user) {
        setSavedJobsCount(null);
        setSavedProductsCount(null);
        setEntangledCount(null);
        return;
      }

      try {
        // Saved jobs
        const { data: savedJobsRows, error: savedJobsErr } = await supabase
          .from("saved_jobs")
          .select("job_id")
          .eq("user_id", user.id);

        if (!savedJobsErr && savedJobsRows) {
          setSavedJobsCount(savedJobsRows.length);
        } else {
          setSavedJobsCount(0);
        }

        // Saved products
        const { data: savedProdRows, error: savedProdErr } = await supabase
          .from("saved_products")
          .select("product_id")
          .eq("user_id", user.id);

        if (!savedProdErr && savedProdRows) {
          setSavedProductsCount(savedProdRows.length);
        } else {
          setSavedProductsCount(0);
        }

        // Entangled states – count unique "other" users in accepted connections
        const { data: connRows, error: connErr } = await supabase
          .from("connections")
          .select("user_id, target_user_id, status")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (!connErr && connRows && connRows.length > 0) {
          const otherIds = Array.from(
            new Set(
              connRows.map((c: any) =>
                c.user_id === user.id ? c.target_user_id : c.user_id
              )
            )
          );
          setEntangledCount(otherIds.length);
        } else {
          setEntangledCount(0);
        }
      } catch (e) {
        console.error("Error loading sidebar counts", e);
        setSavedJobsCount(0);
        setSavedProductsCount(0);
        setEntangledCount(0);
      }
    };

    loadCounts();
  }, [user]);

  // === LOAD FIRST ORGANIZATION OWNED BY THIS USER FOR SIDEBAR TILE ===
  useEffect(() => {
    const loadMyOrg = async () => {
      if (!user) {
        setMyOrg(null);
        setLoadingMyOrg(false);
        return;
      }

      setLoadingMyOrg(true);
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name, slug, logo_url")
        .eq("created_by", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setMyOrg(data as MyOrgSummary);
      } else {
        setMyOrg(null);
        if (error) {
          console.error("Error loading my organization for sidebar", error);
        }
      }
      setLoadingMyOrg(false);
    };

    loadMyOrg();
  }, [user]);

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
          const list = (data || []) as CommunityProfile[];
          setProfiles(list);
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
            "id, name, slug, kind, logo_url, tagline, industry, focus_areas, institution, department, city, country, created_at"
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

  // === LOAD CONNECTIONS (ENTANGLEMENTS) ===
  useEffect(() => {
    const loadConnections = async () => {
      if (!user) {
        setConnectionsByOtherId({});
        return;
      }

      try {
        const { data, error } = await supabase
          .from("connections")
          .select("id, user_id, target_user_id, status")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (error) {
          console.error("Error loading entanglement connections", error);
          setConnectionsByOtherId({});
          return;
        }

        const rows = (data || []) as ConnectionRow[];
        const map: Record<string, ConnectionRow> = {};

        rows.forEach((c) => {
          const otherId = c.user_id === user.id ? c.target_user_id : c.user_id;
          map[otherId] = c;
        });

        setConnectionsByOtherId(map);
      } catch (e) {
        console.error("Unexpected error loading entanglement connections", e);
        setConnectionsByOtherId({});
      }
    };

    if (user) {
      loadConnections();
    } else {
      setConnectionsByOtherId({});
    }
  }, [user]);

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

    if (user) {
      loadOrgFollows();
    } else {
      setOrgFollows({});
    }
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
        `${p.full_name || ""} ${p.role || ""} ${
          p.affiliation || ""
        } ${p.short_bio || ""} ${p.city || ""} ${p.country || ""}`
      ).toLowerCase();

      return haystack.includes(q);
    });
  }, [profiles, search]);

  const filteredOrgs = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orgs;

    return orgs.filter((o) => {
      const location = [o.city, o.country].filter(Boolean).join(" ");
      const meta =
        o.kind === "company"
          ? `${o.industry || ""} ${o.focus_areas || ""}`
          : `${o.institution || ""} ${o.department || ""} ${
              o.focus_areas || ""
            }`;

      const haystack = (
        `${o.name || ""} ${meta} ${o.tagline || ""} ${location}`
      ).toLowerCase();

      return haystack.includes(q);
    });
  }, [orgs, search]);

  // === FEATURED PROFILE + ORGANIZATION OF THE WEEK ===
  const featuredProfile =
    filteredProfiles.length > 0 ? filteredProfiles[0] : null;

  const featuredOrg = filteredOrgs.length > 0 ? filteredOrgs[0] : null;

  // === UNIFIED COMMUNITY ITEM LIST (MIXED PEOPLE + ORGS) ===
  const communityItems: CommunityItem[] = useMemo(() => {
    const personItems: CommunityItem[] = filteredProfiles.map((p) => {
      const name = p.full_name || "Quantum5ocial member";
      const highestEducation = p.highest_education || null;
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
        highest_education: highestEducation,
        city: p.city || null,
        country: p.country || null,
        created_at: p.created_at || null,
      };
    });

    const orgItems: CommunityItem[] = filteredOrgs.map((o) => {
      const typeLabel =
        o.kind === "company" ? "Company" : "Research group";

      let roleLabel: string;
      let affiliationLine: string;

      if (o.kind === "company") {
        roleLabel = o.industry || "Quantum company";
        const location = [o.city, o.country].filter(Boolean).join(", ");
        affiliationLine = location || (o.industry || "—");
      } else {
        roleLabel = o.institution || "Research group";
        const dept = o.department || "";
        const inst = o.institution || "";
        const base = [dept, inst].filter(Boolean).join(", ");
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
        name: o.name,
        avatar_url: o.logo_url || null,
        typeLabel,
        roleLabel,
        affiliationLine,
        short_bio,
        highest_education: undefined,
        city: o.city || null,
        country: o.country || null,
        created_at: o.created_at || null,
      };
    });

    const merged = [...personItems, ...orgItems];

    // Sort by created_at descending so people + orgs are mixed chronologically
    return merged.sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });
  }, [filteredProfiles, filteredOrgs]);

  const hasAnyCommunity = communityItems.length > 0;

  // === SIDEBAR HELPERS ===
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarFullName =
    profileSummary?.full_name || fallbackName || "Your profile";

  const avatarUrl = profileSummary?.avatar_url || null;
  const educationLevel =
    (profileSummary as any)?.education_level ||
    (profileSummary as any)?.highest_education ||
    "";
  const describesYou =
    (profileSummary as any)?.describes_you ||
    (profileSummary as any)?.role ||
    "";
  const affiliation =
    (profileSummary as any)?.affiliation ||
    (profileSummary as any)?.current_org ||
    "";

  const hasProfileExtraInfo =
    Boolean(educationLevel) || Boolean(describesYou) || Boolean(affiliation);

  const entangledLabel = !user
    ? "Entangled states"
    : `Entangled states (${entangledCount === null ? "…" : entangledCount})`;

  const savedJobsLabel = !user
    ? "Saved jobs"
    : `Saved jobs (${savedJobsCount === null ? "…" : savedJobsCount})`;

  const savedProductsLabel = !user
    ? "Saved products"
    : `Saved products (${
        savedProductsCount === null ? "…" : savedProductsCount
      })`;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* ========== LEFT SIDEBAR (same as homepage) ========== */}
          <aside
            className="layout-left sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {/* Profile card – clickable */}
            <Link
              href="/profile"
              className="sidebar-card profile-sidebar-card"
              style={{
                textDecoration: "none",
                color: "inherit",
                cursor: "pointer",
              }}
            >
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

              {hasProfileExtraInfo && (
                <div className="profile-sidebar-info-block">
                  {educationLevel && (
                    <div className="profile-sidebar-info-value">
                      {educationLevel}
                    </div>
                  )}
                  {describesYou && (
                    <div
                      className="profile-sidebar-info-value"
                      style={{ marginTop: 4 }}
                    >
                      {describesYou}
                    </div>
                  )}
                  {affiliation && (
                    <div
                      className="profile-sidebar-info-value"
                      style={{ marginTop: 4 }}
                    >
                      {affiliation}
                    </div>
                  )}
                </div>
              )}
            </Link>

            {/* Quick dashboard */}
            <div className="sidebar-card dashboard-sidebar-card">
              <div className="dashboard-sidebar-title">Quick dashboard</div>
              <div className="dashboard-sidebar-links">
                <Link
                  href="/dashboard/entangled-states"
                  className="dashboard-sidebar-link"
                >
                  {entangledLabel}
                </Link>
                <Link
                  href="/dashboard/saved-jobs"
                  className="dashboard-sidebar-link"
                >
                  {savedJobsLabel}
                </Link>
                <Link
                  href="/dashboard/saved-products"
                  className="dashboard-sidebar-link"
                >
                  {savedProductsLabel}
                </Link>
              </div>
            </div>

            {/* My organization tile */}
            {user && !loadingMyOrg && myOrg && (
              <div
                className="sidebar-card dashboard-sidebar-card"
                style={{ marginTop: 16 }}
              >
                <div className="dashboard-sidebar-title">My organization</div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {/* Logo + name row */}
                  <Link
                    href={`/orgs/${myOrg.slug}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 14,
                        overflow: "hidden",
                        flexShrink: 0,
                        border: "1px solid rgba(148,163,184,0.45)",
                        background:
                          "linear-gradient(135deg,#3bc7f3,#8468ff)",
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
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                      ) : (
                        myOrg.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {myOrg.name}
                    </div>
                  </Link>

                  {/* Simple stats (placeholder) */}
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
                      <span style={{ color: "#e5e7eb" }}>0</span>
                    </div>
                    <div>
                      Views:{" "}
                      <span style={{ color: "#e5e7eb" }}>0</span>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <Link
                        href="/dashboard/my-organizations"
                        style={{
                          color: "#7dd3fc",
                          textDecoration: "none",
                        }}
                      >
                        Analytics →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Social icons + brand logo/name */}
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
              {/* Icons row */}
              <div
                style={{
                  display: "flex",
                  gap: 12,
                  fontSize: 18,
                  alignItems: "center",
                }}
              >
                {/* Email */}
                <a
                  href="mailto:info@quantum5ocial.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Email Quantum5ocial"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
                    <polyline points="3 7 12 13 21 7" />
                  </svg>
                </a>

                {/* X icon */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Quantum5ocial on X"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 4l8 9.5L20 4" />
                    <path d="M4 20l6.5-7.5L20 20" />
                  </svg>
                </a>

                {/* GitHub */}
                <a
                  href="#"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Quantum5ocial on GitHub"
                  style={{ color: "rgba(148,163,184,0.9)" }}
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.84 9.68.5.1.68-.22.68-.49 0-.24-.01-1.04-.01-1.89-2.49.55-3.01-1.09-3.01-1.09-.45-1.17-1.11-1.48-1.11-1.48-.9-.63.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.55 2.34 1.1 2.91.84.09-.66.35-1.1.63-1.35-1.99-.23-4.09-1.03-4.09-4.6 0-1.02.35-1.85.93-2.5-.09-.23-.4-1.16.09-2.42 0 0 .75-.25 2.46.95A8.23 8.23 0 0 1 12 6.84c.76 0 1.53.1 2.25.29 1.7-1.2 2.45-.95 2.45-.95.5 1.26.19 2.19.09 2.42.58.65.93 1.48.93 2.5 0 3.58-2.11 4.37-4.12 4.6.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.04 10.04 0 0 0 22 12.26C22 6.58 17.52 2 12 2z" />
                  </svg>
                </a>
              </div>

              {/* Brand row */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <img
                  src="/Q5_white_bg.png"
                  alt="Quantum5ocial logo"
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

          {/* ========== MIDDLE COLUMN – COMMUNITY LIST ========== */}
          <section className="layout-main">
            <section className="section">
              {/* STICKY HEADER + SEARCH (reuse jobs styles) */}
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
                  {/* HERO HEADER */}
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
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                        }}
                      >
                        Quantum5ocial community
                        {!communityLoading && !communityError && (
                          <span
                            style={{
                              fontSize: 12,
                              padding: "2px 10px",
                              borderRadius: 999,
                              background: "rgba(15,23,42,0.9)",
                              border:
                                "1px solid rgba(56,189,248,0.5)",
                              color: "#7dd3fc",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <span style={{ fontSize: 11 }}>🌐</span>
                            <span>
                              {totalCommunityCount} member
                              {totalCommunityCount === 1 ? "" : "s"}
                            </span>
                          </span>
                        )}
                      </div>
                      <div
                        className="section-sub"
                        style={{ maxWidth: 520, lineHeight: 1.45 }}
                      >
                        Discover members, labs, and companies in the quantum
                        ecosystem{" "}
                        <span style={{ color: "#7dd3fc" }}>
                          – entangle with people and follow organizations that
                          matter to you.
                        </span>
                      </div>
                    </div>

                    {/* Small CTA block on the right */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: 4,
                        minWidth: 160,
                      }}
                    >
                      <Link
                        href="/ecosystem"
                        className="section-link"
                        style={{ fontSize: 13 }}
                      >
                        View my ecosystem →
                      </Link>
                      <Link
                        href="/orgs"
                        className="section-link"
                        style={{ fontSize: 13 }}
                      >
                        Browse organizations →
                      </Link>
                    </div>
                  </div>

                  {/* Center-column search bar */}
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
                        <span
                          style={{
                            fontSize: 14,
                            opacity: 0.9,
                          }}
                        >
                          🔍
                        </span>
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
              {communityLoading && (
                <div className="products-status">
                  Loading community members…
                </div>
              )}

              {communityError && !communityLoading && (
                <div className="products-status" style={{ color: "#f87171" }}>
                  {communityError}
                </div>
              )}

              {!communityLoading &&
                !communityError &&
                !hasAnyCommunity && (
                  <div className="products-empty">
                    No members or organizations visible yet. As more users and
                    orgs join Quantum5ocial, they will appear here.
                  </div>
                )}

              {/* MAIN CONTENT WHEN WE HAVE ITEMS */}
              {!communityLoading && !communityError && hasAnyCommunity && (
                <>
                  {/* PROFILE OF THE WEEK */}
                  {featuredProfile && (
                    <div
                      style={{
                        marginBottom: 16,
                        padding: 16,
                        borderRadius: 16,
                        border: "1px solid rgba(56,189,248,0.35)",
                        background:
                          "radial-gradient(circle at top left, rgba(34,211,238,0.12), rgba(15,23,42,1))",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 16,
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "#7dd3fc",
                              marginBottom: 4,
                            }}
                          >
                            Profile of the week
                          </div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 600,
                              background:
                                "linear-gradient(90deg,#22d3ee,#a855f7)",
                              WebkitBackgroundClip: "text",
                              WebkitTextFillColor: "transparent",
                            }}
                          >
                            Standout member from the Quantum Community
                          </div>
                        </div>
                      </div>

                      <div
                        className="card"
                        style={{
                          borderRadius: 14,
                          padding: 14,
                          background: "rgba(15,23,42,0.95)",
                        }}
                      >
                        <div
                          className="card-inner"
                          style={{
                            display: "flex",
                            gap: 14,
                            alignItems: "flex-start",
                          }}
                        >
                          {/* Avatar */}
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: "999px",
                              overflow: "hidden",
                              border:
                                "1px solid rgba(148,163,184,0.5)",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background:
                                "linear-gradient(135deg,#3bc7f3,#8468ff)",
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: 18,
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
                              (featuredProfile.full_name || "Member")[0].toUpperCase()
                            )}
                          </div>

                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              className="card-title"
                              style={{ marginBottom: 2 }}
                            >
                              {featuredProfile.full_name || "Quantum member"}
                            </div>
                            <div
                              className="card-meta"
                              style={{ fontSize: 12, lineHeight: 1.4 }}
                            >
                              {featuredProfile.role || "Quantum5ocial member"}
                              {featuredProfile.affiliation
                                ? ` · ${featuredProfile.affiliation}`
                                : ""}
                            </div>
                            <div
                              style={{
                                marginTop: 6,
                                fontSize: 12,
                                color: "var(--text-muted)",
                                lineHeight: 1.5,
                              }}
                            >
                              {featuredProfile.short_bio ||
                                "Active contributor in the quantum ecosystem on Quantum5ocial."}
                            </div>

                            {/* Entangle button with status */}
                            {(!user || featuredProfile.id !== user.id) && (
                              (() => {
                                const status = getConnectionStatus(
                                  featuredProfile.id
                                );
                                const loading = isEntangleLoading(
                                  featuredProfile.id
                                );

                                let label = "Entangle +";
                                let bg = "rgba(59,130,246,0.16)";
                                let border =
                                  "1px solid rgba(59,130,246,0.6)";
                                let color = "#bfdbfe";
                                let disabled = false;

                                if (user) {
                                  if (status === "pending_outgoing") {
                                    label = "Requested";
                                    bg = "transparent";
                                    border =
                                      "1px solid rgba(148,163,184,0.7)";
                                    color = "rgba(148,163,184,0.95)";
                                    disabled = true;
                                  } else if (status === "pending_incoming") {
                                    label = "Accept request";
                                    bg =
                                      "linear-gradient(90deg,#22c55e,#16a34a)";
                                    border = "none";
                                    color = "#0f172a";
                                  } else if (status === "accepted") {
                                    label = "Entangled ✓";
                                    bg = "transparent";
                                    border =
                                      "1px solid rgba(74,222,128,0.7)";
                                    color = "rgba(187,247,208,0.95)";
                                    disabled = true;
                                  }
                                }

                                return (
                                  <button
                                    type="button"
                                    style={{
                                      marginTop: 10,
                                      padding: "6px 12px",
                                      borderRadius: 999,
                                      border,
                                      background: bg,
                                      color,
                                      fontSize: 12,
                                      cursor:
                                        disabled || loading
                                          ? "default"
                                          : "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 6,
                                      opacity: loading ? 0.7 : 1,
                                    }}
                                    disabled={disabled || loading}
                                    onClick={() => handleEntangle(
                                      featuredProfile.id
                                    )}
                                  >
                                    {loading ? "…" : label}
                                  </button>
                                );
                              })()
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ORGANIZATION OF THE WEEK */}
                  {featuredOrg && (
                    <div
                      style={{
                        marginBottom: 24,
                        padding: 16,
                        borderRadius: 16,
                        border: "1px solid rgba(59,130,246,0.45)",
                        background:
                          "radial-gradient(circle at top left, rgba(59,130,246,0.12), rgba(15,23,42,1))",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 16,
                          marginBottom: 10,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                              color: "#93c5fd",
                              marginBottom: 4,
                            }}
                          >
                            Organization of the week
                          </div>
                          <div
                            style={{
                              fontSize: "0.95rem",
                              fontWeight: 600,
                            }}
                          >
                            Featured company / lab in the ecosystem
                          </div>
                        </div>
                      </div>

                      <div
                        className="card"
                        style={{
                          borderRadius: 14,
                          padding: 14,
                          background: "rgba(15,23,42,0.95)",
                        }}
                      >
                        <div
                          className="card-inner"
                          style={{
                            display: "flex",
                            gap: 14,
                            alignItems: "flex-start",
                          }}
                        >
                          {/* Logo / initial */}
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 18,
                              overflow: "hidden",
                              border:
                                "1px solid rgba(148,163,184,0.5)",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background:
                                "linear-gradient(135deg,#3bc7f3,#8468ff)",
                              color: "#0f172a",
                              fontWeight: 700,
                              fontSize: 18,
                            }}
                          >
                            {featuredOrg.logo_url ? (
                              <img
                                src={featuredOrg.logo_url}
                                alt={featuredOrg.name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              featuredOrg.name.charAt(0).toUpperCase()
                            )}
                          </div>

                          {/* Text */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 2,
                              }}
                            >
                              <div
                                className="card-title"
                                style={{
                                  marginBottom: 0,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {featuredOrg.name}
                              </div>
                              <span
                                style={{
                                  fontSize: 11,
                                  borderRadius: 999,
                                  padding: "2px 8px",
                                  border:
                                    "1px solid rgba(148,163,184,0.7)",
                                  color: "rgba(226,232,240,0.95)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {featuredOrg.kind === "company"
                                  ? "Company"
                                  : "Research group"}
                              </span>
                            </div>

                            <div
                              className="card-meta"
                              style={{
                                fontSize: 12,
                                lineHeight: 1.4,
                                marginBottom: 4,
                              }}
                            >
                              {featuredOrg.kind === "company"
                                ? featuredOrg.industry || "Quantum company"
                                : featuredOrg.institution ||
                                  "Research group"}
                              {featuredOrg.city || featuredOrg.country
                                ? ` · ${[
                                    featuredOrg.city,
                                    featuredOrg.country,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}`
                                : ""}
                            </div>
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 12,
                                color: "var(--text-muted)",
                                lineHeight: 1.5,
                              }}
                            >
                              {featuredOrg.tagline ||
                                featuredOrg.focus_areas ||
                                "Active organization in the quantum ecosystem."}
                            </div>

                            {/* Follow / Following */}
                            {(() => {
                              const following = isFollowingOrg(featuredOrg.id);
                              const loading = isFollowLoading(featuredOrg.id);

                              const label = following
                                ? "Following"
                                : "Follow";
                              const bg = following
                                ? "transparent"
                                : "rgba(59,130,246,0.16)";
                              const border = following
                                ? "1px solid rgba(148,163,184,0.7)"
                                : "1px solid rgba(59,130,246,0.6)";
                              const color = following
                                ? "rgba(148,163,184,0.95)"
                                : "#bfdbfe";

                              return (
                                <button
                                  type="button"
                                  style={{
                                    marginTop: 10,
                                    padding: "6px 12px",
                                    borderRadius: 999,
                                    border,
                                    background: bg,
                                    color,
                                    fontSize: 12,
                                    cursor: loading
                                      ? "default"
                                      : "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    opacity: loading ? 0.7 : 1,
                                  }}
                                  disabled={loading}
                                  onClick={() =>
                                    handleFollowOrg(featuredOrg.id)
                                  }
                                >
                                  {loading ? "…" : label}
                                  {!following && (
                                    <span style={{ fontSize: 14 }}>+</span>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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
                      <div
                        style={{
                          fontSize: "0.95rem",
                          fontWeight: 600,
                        }}
                      >
                        Members &amp; organizations
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      Showing {communityItems.length} match
                      {communityItems.length === 1 ? "" : "es"}
                    </div>
                  </div>

                  {/* Mixed grid: people + orgs */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                      gap: 16,
                    }}
                  >
                    {communityItems.map((item) => {
                      const initial = item.name.charAt(0).toUpperCase();
                      const location = [item.city, item.country]
                        .filter(Boolean)
                        .join(", ");
                      const highestEducation =
                        item.kind === "person"
                          ? item.highest_education || "—"
                          : undefined;

                      const isOrganization = item.kind === "organization";
                      const isSelf =
                        item.kind === "person" &&
                        user &&
                        item.id === user.id;

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
                          }}
                        >
                          <div className="card-inner">
                            {/* Top row */}
                            <div
                              style={{
                                display: "flex",
                                gap: 12,
                                alignItems: "center",
                                marginBottom: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 52,
                                  height: 52,
                                  borderRadius:
                                    item.kind === "organization"
                                      ? 14
                                      : "999px",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                  border:
                                    "1px solid rgba(148,163,184,0.4)",
                                  background:
                                    item.kind === "organization"
                                      ? "linear-gradient(135deg,#3bc7f3,#8468ff)"
                                      : "rgba(15,23,42,0.9)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 18,
                                  fontWeight: 600,
                                  color:
                                    item.kind === "organization"
                                      ? "#0f172a"
                                      : "#e5e7eb",
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
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 6,
                                    marginBottom: 2,
                                  }}
                                >
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
                                      border:
                                        "1px solid rgba(148,163,184,0.7)",
                                      color: "rgba(226,232,240,0.95)",
                                      whiteSpace: "nowrap",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.08em",
                                    }}
                                  >
                                    {item.typeLabel}
                                  </span>
                                </div>
                                <div
                                  className="card-meta"
                                  style={{ fontSize: 12, lineHeight: 1.4 }}
                                >
                                  {item.roleLabel}
                                </div>
                              </div>
                            </div>

                            {/* Info */}
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
                                  <span style={{ opacity: 0.7 }}>
                                    Education:{" "}
                                  </span>
                                  <span>{highestEducation || "—"}</span>
                                </div>
                              )}
                              <div>
                                <span style={{ opacity: 0.7 }}>
                                  {item.kind === "person"
                                    ? "Affiliation: "
                                    : "Location / meta: "}
                                </span>
                                <span>
                                  {item.affiliationLine || location || "—"}
                                </span>
                              </div>
                              {location && (
                                <div>
                                  <span style={{ opacity: 0.7 }}>
                                    Location:{" "}
                                  </span>
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

                          {/* Entangle / Follow button */}
                          <div style={{ marginTop: 12 }}>
                            {isOrganization ? (
                              (() => {
                                const following = isFollowingOrg(item.id);
                                const loading = isFollowLoading(item.id);

                                const label = following
                                  ? "Following"
                                  : "Follow";
                                const bg = following
                                  ? "transparent"
                                  : "rgba(59,130,246,0.16)";
                                const border = following
                                  ? "1px solid rgba(148,163,184,0.7)"
                                  : "1px solid rgba(59,130,246,0.6)";
                                const color = following
                                  ? "rgba(148,163,184,0.95)"
                                  : "#bfdbfe";

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
                                      cursor: loading
                                        ? "default"
                                        : "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: 6,
                                      opacity: loading ? 0.7 : 1,
                                    }}
                                    disabled={loading}
                                    onClick={() => handleFollowOrg(item.id)}
                                  >
                                    {loading ? "…" : label}
                                    {!following && (
                                      <span style={{ fontSize: 14 }}>+</span>
                                    )}
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
                                  border:
                                    "1px solid rgba(148,163,184,0.7)",
                                  background: "transparent",
                                  color: "rgba(148,163,184,0.9)",
                                  fontSize: 12,
                                  cursor: "default",
                                }}
                                disabled
                              >
                                This is you
                              </button>
                            ) : (
                              (() => {
                                const status = getConnectionStatus(item.id);
                                const loading = isEntangleLoading(item.id);

                                let label = "Entangle +";
                                let bg =
                                  "linear-gradient(90deg,#22d3ee,#6366f1)";
                                let border = "none";
                                let color = "#0f172a";
                                let disabled = false;

                                if (user) {
                                  if (status === "pending_outgoing") {
                                    label = "Requested";
                                    bg = "transparent";
                                    border =
                                      "1px solid rgba(148,163,184,0.7)";
                                    color = "rgba(148,163,184,0.95)";
                                    disabled = true;
                                  } else if (status === "pending_incoming") {
                                    label = "Accept request";
                                    bg =
                                      "linear-gradient(90deg,#22c55e,#16a34a)";
                                    border = "none";
                                    color = "#0f172a";
                                  } else if (status === "accepted") {
                                    label = "Entangled ✓";
                                    bg = "transparent";
                                    border =
                                      "1px solid rgba(74,222,128,0.7)";
                                    color = "rgba(187,247,208,0.95)";
                                    disabled = true;
                                  }
                                }

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
                                      cursor:
                                        disabled || loading
                                          ? "default"
                                          : "pointer",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      gap: 6,
                                      opacity: loading ? 0.7 : 1,
                                    }}
                                    disabled={disabled || loading}
                                    onClick={() => handleEntangle(item.id)}
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
          </section>

          {/* ========== RIGHT SIDEBAR – HIGHLIGHTED TILES + COPYRIGHT ========== */}
          <aside
            className="layout-right sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            <div className="hero-tiles hero-tiles-vertical">
              {/* Highlighted jobs */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum roles spotlight</div>
                    <div className="tile-icon-orbit">🧪</div>
                  </div>
                  <p className="tile-text">
                    This tile will later showcase a curated quantum job or role
                    from the marketplace – ideal to show during demos.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Example: PhD position</span>
                    <span className="tile-pill">Location</span>
                    <span className="tile-pill">Lab / company</span>
                  </div>
                  <div className="tile-cta">
                    Jobs spotlight <span>›</span>
                  </div>
                </div>
              </div>

              {/* Highlighted products */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Quantum product of the week</div>
                    <div className="tile-icon-orbit">🔧</div>
                  </div>
                  <p className="tile-text">
                    This tile will highlight one selected hardware, software,
                    or service from the Quantum Products Lab.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Example: Cryo system</span>
                    <span className="tile-pill">Control electronics</span>
                    <span className="tile-pill">Software suite</span>
                  </div>
                  <div className="tile-cta">
                    Product spotlight <span>›</span>
                  </div>
                </div>
              </div>

              {/* Highlighted talent */}
              <div className="hero-tile">
                <div className="hero-tile-inner">
                  <div className="tile-label">Highlighted</div>
                  <div className="tile-title-row">
                    <div className="tile-title">Featured quantum talent</div>
                    <div className="tile-icon-orbit">🤝</div>
                  </div>
                  <p className="tile-text">
                    Later this tile can feature a standout community member –
                    for example a PI, postdoc, or startup founder.
                  </p>
                  <div className="tile-pill-row">
                    <span className="tile-pill">Example: Role</span>
                    <span className="tile-pill">Field</span>
                    <span className="tile-pill">Affiliation</span>
                  </div>
                  <div className="tile-cta">
                    Talent spotlight <span>›</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Copyright at bottom of right column */}
            <div
              style={{
                marginTop: "auto",
                paddingTop: 12,
                borderTop: "1px solid rgba(148,163,184,0.18)",
                fontSize: 12,
                color: "rgba(148,163,184,0.9)",
                textAlign: "right",
              }}
            >
              © 2025 Quantum5ocial
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
