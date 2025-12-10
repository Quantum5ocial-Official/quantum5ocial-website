// pages/community.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";
import LeftSidebar from "../components/LeftSidebar";
import { useEntanglements } from "../lib/useEntanglements";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

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
  slug?: string;              // <— add this
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

export default function CommunityPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  // --- Community data: people + orgs ---
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  const [orgs, setOrgs] = useState<CommunityOrg[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [orgsError, setOrgsError] = useState<string | null>(null);

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
        `${p.full_name || ""} ${p.role || ""} ${p.affiliation || ""} ${
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
          : `${org.institution || ""} ${org.department || ""} ${
              org.focus_areas || ""
            }`;

      const haystack = (
        `${org.name || ""} ${meta} ${org.tagline || ""} ${location}`
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
      const typeLabel = o.kind === "company" ? "Company" : "Research group";

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
        slug: o.slug,
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

    return merged.sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });
  }, [filteredProfiles, filteredOrgs]);

  const hasAnyCommunity = communityItems.length > 0;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* LEFT SIDEBAR (shared component, self-contained) */}
          <LeftSidebar />

          {/* MIDDLE COLUMN – COMMUNITY LIST */}
          <section className="layout-main">
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

              {/* MAIN CONTENT */}
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
                            {(!user || featuredProfile.id !== user.id) && (() => {
                              const status = getConnectionStatus(
                                featuredProfile.id
                              );
                              const loading = isEntangleLoading(
                                featuredProfile.id
                              );

                              // Incoming request → Accept + Decline
                              if (user && status === "pending_incoming") {
                                return (
                                  <div
                                    style={{
                                      marginTop: 10,
                                      display: "flex",
                                      gap: 8,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    <button
                                      type="button"
                                      disabled={loading}
                                      onClick={() =>
                                        handleEntangle(featuredProfile.id)
                                      }
                                      style={{
                                        flex: 1,
                                        minWidth: 120,
                                        padding: "6px 0",
                                        borderRadius: 999,
                                        border: "none",
                                        background:
                                          "linear-gradient(90deg,#22c55e,#16a34a)",
                                        color: "#0f172a",
                                        fontSize: 12,
                                        fontWeight: 600,
                                        cursor: loading
                                          ? "default"
                                          : "pointer",
                                        opacity: loading ? 0.7 : 1,
                                      }}
                                    >
                                      {loading ? "…" : "Accept request"}
                                    </button>

                                    <button
                                      type="button"
                                      disabled={loading}
                                      onClick={() =>
                                        handleDeclineEntangle(
                                          featuredProfile.id
                                        )
                                      }
                                      style={{
                                        flex: 1,
                                        minWidth: 100,
                                        padding: "6px 0",
                                        borderRadius: 999,
                                        border:
                                          "1px solid rgba(148,163,184,0.7)",
                                        background: "transparent",
                                        color: "rgba(248,250,252,0.9)",
                                        fontSize: 12,
                                        cursor: loading
                                          ? "default"
                                          : "pointer",
                                        opacity: loading ? 0.7 : 1,
                                      }}
                                    >
                                      Decline
                                    </button>
                                  </div>
                                );
                              }

                              // Other states → single button
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
                                } else if (status === "accepted") {
                                  label = "Entangled ✓";
                                  bg = "transparent";
                                  border =
                                    "1px solid rgba(74,222,128,0.7)";
                                  color = "rgba(187,247,208,0.95)";
                                  disabled = true;
                                } else if (status === "declined") {
                                  label = "Declined";
                                  bg = "transparent";
                                  border =
                                    "1px solid rgba(148,163,184,0.5)";
                                  color = "rgba(148,163,184,0.7)";
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
                                  onClick={() =>
                                    handleEntangle(featuredProfile.id)
                                  }
                                >
                                  {loading ? "…" : label}
                                </button>
                              );
                            })()}
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
                          {/* Logo */}
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
                                : featuredOrg.institution || "Research group"}
                              {featuredOrg.city || featuredOrg.country
                                ? ` · ${[featuredOrg.city, featuredOrg.country]
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

                              const label = following ? "Following" : "Follow";
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
                                    cursor: loading ? "default" : "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 6,
                                    opacity: loading ? 0.7 : 1,
                                  }}
                                  disabled={loading}
                                  onClick={() => handleFollowOrg(featuredOrg.id)}
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

const isClickable =
  item.kind === "person" ||
  (item.kind === "organization" && item.slug);

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
            if (item.kind === "person") {
              router.push(`/profile/${item.id}`);
            } else if (item.kind === "organization" && item.slug) {
              router.push(`/orgs/${item.slug}`);
            }
          }
    }
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
                                  borderRadius: isOrganization ? 14 : "999px",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                  border:
                                    "1px solid rgba(148,163,184,0.4)",
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

                          {/* Footer actions */}
<div style={{ marginTop: 10 }}>
  {isOrganization ? (
    // Follow / Following for org cards
    (() => {
      const following = isFollowingOrg(item.id);
      const loading = isFollowLoading(item.id);

      const label = following ? "Following" : "Follow";
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
            cursor: loading ? "default" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            opacity: loading ? 0.7 : 1,
          }}
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation();        // 🔥 Prevent card navigation
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
      onClick={(e) => e.stopPropagation()} // 🔥 Just in case
    >
      This is you
    </button>
  ) : (
    // Entangle logic for people
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
                e.stopPropagation();    // 🔥 Prevent card click
                handleEntangle(item.id);
              }}
              style={{
                flex: 1,
                minWidth: 120,
                padding: "7px 0",
                borderRadius: 10,
                border: "none",
                background:
                  "linear-gradient(90deg,#22c55e,#16a34a)",
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
                e.stopPropagation();    // 🔥 Prevent card click
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

      // Outgoing or accepted states
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
            e.stopPropagation();        // 🔥 Prevent card nav
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
            cursor:
              disabled || loading ? "default" : "pointer",
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
          </section>

          {/* RIGHT SIDEBAR – HIGHLIGHTED TILES + COPYRIGHT */}
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
