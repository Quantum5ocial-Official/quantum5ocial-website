// pages/orgs/[slug].tsx
import { useEffect, useState, useMemo } from "react";
import type React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

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
};

type FollowerProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  highest_education: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

type OrgMemberRole = "owner" | "co_owner" | "admin" | "member";

type OrgMember = {
  id: string;
  org_id: string;
  user_id: string;
  role: OrgMemberRole;
  title: string | null;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    highest_education: string | null;
    affiliation: string | null;
    country: string | null;
    city: string | null;
  } | null;
};

export default function OrganizationDetailPage() {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const { slug } = router.query;

  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Followers state
  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [loadingFollowers, setLoadingFollowers] = useState<boolean>(true);
  const [followersError, setFollowersError] = useState<string | null>(null);

  // Team / members state
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(true);
  const [membersError, setMembersError] = useState<string | null>(null);
  const [currentMemberRole, setCurrentMemberRole] =
    useState<OrgMemberRole | null>(null);

  // Follow state (current user ↔ this org)
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);

  // Team role menu
  const [openRoleMenuFor, setOpenRoleMenuFor] = useState<string | null>(null);

  // Add member UI (invite from followers)
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

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
        .maybeSingle<Org>();

      if (!error && data) {
        setOrg(data);
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

  // === LOAD FOLLOWERS FOR THIS ORG ===
  useEffect(() => {
    const loadFollowers = async () => {
      if (!org) {
        setFollowers([]);
        setFollowersCount(null);
        setFollowersError(null);
        setLoadingFollowers(false);
        setIsFollowing(false);
        return;
      }

      setLoadingFollowers(true);
      setFollowersError(null);

      try {
        const { data: followRows, error: followErr } = await supabase
          .from("org_follows")
          .select("user_id")
          .eq("org_id", org.id);

        if (followErr) {
          console.error("Error loading org followers", followErr);
          setFollowers([]);
          setFollowersCount(0);
          setFollowersError("Could not load followers.");
          setIsFollowing(false);
          return;
        }

        const userIds = (followRows || []).map((r: any) => r.user_id);
        setFollowersCount(userIds.length);

        if (user) setIsFollowing(userIds.includes(user.id));
        else setIsFollowing(false);

        if (userIds.length === 0) {
          setFollowers([]);
          return;
        }

        const { data: profileRows, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, highest_education, affiliation, country, city"
          )
          .in("id", userIds);

        if (profErr) {
          console.error("Error loading follower profiles", profErr);
          setFollowersError("Could not load follower profiles.");
          setFollowers([]);
          return;
        }

        setFollowers((profileRows || []) as FollowerProfile[]);
      } catch (e) {
        console.error("Unexpected error loading followers", e);
        setFollowersError("Could not load followers.");
        setFollowers([]);
        setFollowersCount(0);
        setIsFollowing(false);
      } finally {
        setLoadingFollowers(false);
      }
    };

    loadFollowers();
  }, [org, user]);

  // === LOAD TEAM / MEMBERS FOR THIS ORG ===
  useEffect(() => {
    const loadMembers = async () => {
      if (!org) {
        setMembers([]);
        setCurrentMemberRole(null);
        setMembersError(null);
        setLoadingMembers(false);
        return;
      }

      setLoadingMembers(true);
      setMembersError(null);

      try {
        const { data, error } = await supabase
          .from("org_members")
          .select(
            `
            id,
            org_id,
            user_id,
            role,
            title,
            profiles:profiles (
              id,
              full_name,
              avatar_url,
              role,
              highest_education,
              affiliation,
              country,
              city
            )
          `
          )
          .eq("org_id", org.id);

        if (error) {
          console.error("Error loading org members", error);
          setMembersError("Could not load team members.");
          setMembers([]);
          setCurrentMemberRole(null);
          return;
        }

        // 👇 Cast via unknown to satisfy TS
        const rows = (data ?? []) as unknown as OrgMember[];
        setMembers(rows);

        if (user) {
          const mine = rows.find((m) => m.user_id === user.id) || null;
          setCurrentMemberRole(mine ? mine.role : null);
        } else {
          setCurrentMemberRole(null);
        }
      } catch (e) {
        console.error("Unexpected error loading members", e);
        setMembersError("Could not load team members.");
        setMembers([]);
        setCurrentMemberRole(null);
      } finally {
        setLoadingMembers(false);
      }
    };

    loadMembers();
  }, [org, user]);

  // PERMISSIONS
  const canEditOrg = useMemo(() => {
    if (!org || !user) return false;
    if (org.created_by === user.id) return true;
    if (currentMemberRole === "owner" || currentMemberRole === "co_owner") {
      return true;
    }
    return false;
  }, [org, user, currentMemberRole]);

  const canManageMembers = useMemo(() => {
    if (!user) return false;
    return currentMemberRole === "owner" || currentMemberRole === "co_owner";
  }, [user, currentMemberRole]);

  // === Follow / unfollow handler ===
  const handleFollowClick = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => {
    e.preventDefault();
    if (!org) return;

    if (!user) {
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
          setFollowersCount((prev) =>
            prev === null ? prev : Math.max(prev - 1, 0)
          );
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

  const goToProfile = (profileId: string) => {
    router.push(`/profile/${profileId}`);
  };

  const firstOrgLetter = org?.name?.charAt(0).toUpperCase() || "Q";

  // TEAM HELPERS
  const roleLabel = (role: OrgMemberRole) => {
    switch (role) {
      case "owner":
        return "Owner";
      case "co_owner":
        return "Co-owner";
      case "admin":
        return "Admin";
      case "member":
      default:
        return "Member";
    }
  };

  const sortedMembers: OrgMember[] = useMemo(() => {
    const rank: Record<OrgMemberRole, number> = {
      owner: 0,
      co_owner: 1,
      admin: 2,
      member: 3,
    };
    return [...members].sort((a, b) => {
      const ra = rank[a.role] ?? 99;
      const rb = rank[b.role] ?? 99;
      if (ra !== rb) return ra - rb;
      const nameA = a.profiles?.full_name?.toLowerCase() || "zzzz";
      const nameB = b.profiles?.full_name?.toLowerCase() || "zzzz";
      return nameA.localeCompare(nameB);
    });
  }, [members]);

  const existingMemberUserIds = useMemo(
    () => new Set(members.map((m) => m.user_id)),
    [members]
  );

  const candidateFollowers = useMemo(() => {
    if (!followers) return [];
    const term = memberSearch.trim().toLowerCase();

    return followers
      .filter((f) => !existingMemberUserIds.has(f.id))
      .filter((f) => {
        if (!term) return true;
        const name = (f.full_name || "Quantum5ocial member").toLowerCase();
        const role = (f.role || "").toLowerCase();
        const aff = (f.affiliation || "").toLowerCase();
        const loc = [f.city, f.country].filter(Boolean).join(", ").toLowerCase();
        return (
          name.includes(term) ||
          role.includes(term) ||
          aff.includes(term) ||
          loc.includes(term)
        );
      })
      .slice(0, 10);
  }, [followers, existingMemberUserIds, memberSearch]);

  const handleChangeMemberRole = async (
    memberUserId: string,
    newRole: OrgMemberRole,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!org || !user) return;
    if (!canManageMembers) return;

    try {
      const { error } = await supabase
        .from("org_members")
        .update({ role: newRole })
        .eq("org_id", org.id)
        .eq("user_id", memberUserId);

      if (error) {
        console.error("Error updating member role", error);
        return;
      }

      setMembers((prev) =>
        prev.map((m) => (m.user_id === memberUserId ? { ...m, role: newRole } : m))
      );

      if (memberUserId === user.id) {
        setCurrentMemberRole(newRole);
      }

      setOpenRoleMenuFor(null);
    } catch (err) {
      console.error("Unexpected error updating member role", err);
    }
  };

  const handleRemoveMember = async (
    memberUserId: string,
    e: React.MouseEvent
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!org || !user) return;
    if (!canManageMembers) return;

    const confirmed = window.confirm(
      "Remove this person from the team? They will remain a follower."
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("org_members")
        .delete()
        .eq("org_id", org.id)
        .eq("user_id", memberUserId);

      if (error) {
        console.error("Error removing member", error);
        return;
      }

      setMembers((prev) => prev.filter((m) => m.user_id !== memberUserId));

      if (memberUserId === user.id) {
        setCurrentMemberRole(null);
      }

      setOpenRoleMenuFor(null);
    } catch (err) {
      console.error("Unexpected error removing member", err);
    }
  };

  const handleAddMemberFromFollower = async (followerId: string) => {
    if (!org || !user) return;
    if (!canManageMembers) return;

    try {
      const { data, error } = await supabase
        .from("org_members")
        .insert({
          org_id: org.id,
          user_id: followerId,
          role: "member" as OrgMemberRole,
        })
        .select(
          `
          id,
          org_id,
          user_id,
          role,
          title,
          profiles:profiles (
            id,
            full_name,
            avatar_url,
            role,
            highest_education,
            affiliation,
            country,
            city
          )
        `
        )
        .single();

      if (error) {
        console.error("Error adding member", error);
        return;
      }

      // 👇 cast via unknown here as well
      const newMember = data as unknown as OrgMember;
      setMembers((prev) => [...prev, newMember]);
      setMemberSearch("");
      setShowAddMember(false);
    } catch (err) {
      console.error("Unexpected error adding member", err);
    }
  };

  // === RENDER ===
  return (
    <section className="section" style={{ paddingTop: 24, paddingBottom: 48 }}>
      {loading ? (
        <div style={{ fontSize: 14, color: "rgba(209,213,219,0.9)" }}>
          Loading organization…
        </div>
      ) : notFound || !org ? (
        <div style={{ fontSize: 14, color: "rgba(209,213,219,0.9)" }}>
          Organization not found or no longer active.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 16, fontSize: 13 }}>
            <Link href="/orgs" style={{ color: "#7dd3fc", textDecoration: "none" }}>
              ← Back to organizations
            </Link>
          </div>

          {/* Header */}
          <section
            style={{
              borderRadius: 24,
              padding: 24,
              border: "1px solid rgba(148,163,184,0.35)",
              background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,1))",
              boxShadow: "0 22px 50px rgba(15,23,42,0.75)",
              marginBottom: 24,
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
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
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

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
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

                    {currentMemberRole && (
                      <span
                        style={{
                          fontSize: 11,
                          borderRadius: 999,
                          padding: "3px 9px",
                          border: "1px solid rgba(52,211,153,0.6)",
                          color: "rgba(190,242,100,0.9)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span>Team</span>
                        <span
                          style={{
                            opacity: 0.7,
                            fontSize: 10,
                          }}
                        >
                          •
                        </span>
                        <span>{roleLabel(currentMemberRole)}</span>
                      </span>
                    )}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
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
                        background: isFollowing
                          ? "transparent"
                          : "rgba(59,130,246,0.16)",
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
                  style={{
                    fontSize: 13,
                    color: "rgba(148,163,184,0.95)",
                    marginBottom: 6,
                  }}
                >
                  {metaLine}
                </div>
              )}

              {org.tagline && (
                <div
                  style={{
                    fontSize: 14,
                    color: "rgba(209,213,219,0.95)",
                  }}
                >
                  {org.tagline}
                </div>
              )}

              {org.website && (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                  }}
                >
                  <a
                    href={org.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "#7dd3fc",
                      textDecoration: "none",
                    }}
                  >
                    {org.website.replace(/^https?:\/\//, "")} ↗
                  </a>
                </div>
              )}
            </div>
          </section>

          {/* Body */}
          <section>
            {/* Description */}
            {org.description ? (
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "rgba(226,232,240,0.95)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {org.description}
              </div>
            ) : (
              <div
                style={{
                  fontSize: 14,
                  color: "rgba(156,163,175,0.95)",
                }}
              >
                No detailed description added yet.
              </div>
            )}

            {/* Focus areas */}
            {org.focus_areas && (
              <div style={{ marginTop: 18 }}>
                <div
                  style={{
                    fontSize: 13,
                    textTransform: "uppercase",
                    letterSpacing: 0.08,
                    color: "rgba(148,163,184,0.9)",
                    marginBottom: 6,
                  }}
                >
                  Focus areas
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "rgba(226,232,240,0.95)",
                  }}
                >
                  {org.focus_areas}
                </div>
              </div>
            )}

            {/* Team & Members */}
            <div style={{ marginTop: 26 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 8,
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      textTransform: "uppercase",
                      letterSpacing: 0.08,
                      color: "rgba(148,163,184,0.9)",
                      marginBottom: 4,
                    }}
                  >
                    Team & members
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "rgba(148,163,184,0.95)",
                    }}
                  >
                    People officially linked to this organization on Quantum5ocial.
                  </div>
                </div>

                {canManageMembers && (
                  <button
                    type="button"
                    onClick={() => setShowAddMember(true)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(148,163,184,0.6)",
                      background: "rgba(15,23,42,0.85)",
                      fontSize: 12,
                      color: "#e5e7eb",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      +
                    </span>
                    <span>Add from followers</span>
                  </button>
                )}
              </div>

              {loadingMembers ? (
                <p className="profile-muted" style={{ fontSize: 13 }}>
                  Loading team…
                </p>
              ) : membersError ? (
                <p
                  className="profile-muted"
                  style={{ color: "#f97373", fontSize: 13 }}
                >
                  {membersError}
                </p>
              ) : sortedMembers.length === 0 ? (
                <div className="products-empty">
                  No team members yet. Once people are added from followers, they
                  will appear here.
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 12,
                    marginTop: 6,
                  }}
                >
                  {sortedMembers.map((m) => {
                    const p = m.profiles;
                    const name = p?.full_name || "Quantum5ocial member";
                    const initials = name
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    const location = [p?.city, p?.country]
                      .filter(Boolean)
                      .join(", ");
                    const subtitle =
                      [p?.role, p?.affiliation, location]
                        .filter(Boolean)
                        .join(" · ") || "Quantum5ocial member";

                    const isMe = user && p?.id === user.id;
                    const isOwner = m.role === "owner";
                    const isCoOwner = m.role === "co_owner";

                    const showRoleMenuButton = canManageMembers;

                    return (
                      <div
                        key={m.id}
                        className="card"
                        style={{
                          position: "relative",
                          textAlign: "left",
                          padding: 12,
                          borderRadius: 14,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          background: "rgba(2,6,23,0.35)",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => p?.id && goToProfile(p.id)}
                          style={{
                            border: "none",
                            padding: 0,
                            margin: 0,
                            textAlign: "left",
                            background: "transparent",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            cursor: "pointer",
                          }}
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 999,
                              overflow: "hidden",
                              flexShrink: 0,
                              background:
                                "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid rgba(148,163,184,0.6)",
                              color: "#e5e7eb",
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            {p?.avatar_url ? (
                              <img
                                src={p.avatar_url}
                                alt={name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              initials
                            )}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "rgba(226,232,240,0.98)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {name}
                            </div>
                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 11,
                                color: "rgba(148,163,184,0.95)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {subtitle}
                            </div>
                          </div>
                        </button>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: "auto",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              borderRadius: 999,
                              padding: "3px 8px",
                              border: isOwner
                                ? "1px solid rgba(250,204,21,0.7)"
                                : isCoOwner
                                ? "1px solid rgba(129,230,217,0.8)"
                                : "1px solid rgba(148,163,184,0.7)",
                              color: isOwner
                                ? "rgba(252,211,77,0.95)"
                                : isCoOwner
                                ? "rgba(129,230,217,0.95)"
                                : "rgba(226,232,240,0.95)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {isOwner && (
                              <span
                                style={{
                                  fontSize: 12,
                                }}
                              >
                                👑
                              </span>
                            )}
                            {isCoOwner && (
                              <span
                                style={{
                                  fontSize: 11,
                                }}
                              >
                                ✦
                              </span>
                            )}
                            <span>{roleLabel(m.role)}</span>
                            {isMe && <span style={{ opacity: 0.7 }}>· you</span>}
                          </div>

                          {showRoleMenuButton && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setOpenRoleMenuFor((prev) =>
                                  prev === m.user_id ? null : m.user_id
                                );
                              }}
                              style={{
                                width: 26,
                                height: 26,
                                borderRadius: 999,
                                border: "1px solid rgba(148,163,184,0.5)",
                                background: "rgba(15,23,42,0.9)",
                                color: "rgba(148,163,184,0.95)",
                                fontSize: 14,
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              ⋯
                            </button>
                          )}
                        </div>

                        {/* Role / actions menu */}
                        {openRoleMenuFor === m.user_id && (
                          <div
                            style={{
                              position: "absolute",
                              top: 6,
                              right: 6,
                              zIndex: 50,
                              minWidth: 190,
                              borderRadius: 12,
                              background: "rgba(15,23,42,0.98)",
                              border: "1px solid rgba(148,163,184,0.9)",
                              boxShadow: "0 18px 40px rgba(0,0,0,0.75)",
                              padding: 8,
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                textTransform: "uppercase",
                                letterSpacing: 0.08,
                                color: "rgba(148,163,184,0.9)",
                                marginBottom: 4,
                              }}
                            >
                              Change role
                            </div>

                            {m.role !== "co_owner" && (
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleChangeMemberRole(m.user_id, "co_owner", e)
                                }
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  border: "none",
                                  background: "transparent",
                                  padding: "4px 6px 4px 2px",
                                  fontSize: 13,
                                  color: "rgba(226,232,240,0.96)",
                                  cursor: "pointer",
                                }}
                              >
                                Make co-owner
                              </button>
                            )}

                            {m.role !== "admin" && (
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleChangeMemberRole(m.user_id, "admin", e)
                                }
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  border: "none",
                                  background: "transparent",
                                  padding: "4px 6px 4px 2px",
                                  fontSize: 13,
                                  color: "rgba(226,232,240,0.96)",
                                  cursor: "pointer",
                                }}
                              >
                                Make admin
                              </button>
                            )}

                            {m.role !== "member" && (
                              <button
                                type="button"
                                onClick={(e) =>
                                  handleChangeMemberRole(m.user_id, "member", e)
                                }
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  border: "none",
                                  background: "transparent",
                                  padding: "4px 6px 4px 2px",
                                  fontSize: 13,
                                  color: "rgba(226,232,240,0.96)",
                                  cursor: "pointer",
                                }}
                              >
                                Make member
                              </button>
                            )}

                            {(currentMemberRole === "owner" ||
                              currentMemberRole === "co_owner") &&
                              !isOwner && (
                                <div
                                  style={{
                                    borderTop: "1px solid rgba(55,65,81,0.9)",
                                    marginTop: 4,
                                    paddingTop: 4,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={(e) =>
                                      handleRemoveMember(m.user_id, e)
                                    }
                                    style={{
                                      width: "100%",
                                      textAlign: "left",
                                      border: "none",
                                      background: "transparent",
                                      padding: "4px 6px 4px 2px",
                                      fontSize: 13,
                                      color: "#fecaca",
                                      cursor: "pointer",
                                    }}
                                  >
                                    Remove from team
                                  </button>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Add member drawer / panel */}
            {showAddMember && canManageMembers && (
              <div
                onClick={() => setShowAddMember(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 40,
                  background: "rgba(15,23,42,0.75)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "100%",
                    maxWidth: 420,
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.55)",
                    background:
                      "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,1))",
                    boxShadow: "0 22px 50px rgba(0,0,0,0.8)",
                    padding: 18,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                        }}
                      >
                        Add member from followers
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "rgba(148,163,184,0.9)",
                        }}
                      >
                        Start typing a name, role, or affiliation. Only followers
                        who are not yet in the team are shown.
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.6)",
                        background: "rgba(15,23,42,0.95)",
                        color: "rgba(148,163,184,0.96)",
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  <div style={{ marginBottom: 10 }}>
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search followers…"
                      autoFocus
                      style={{
                        width: "100%",
                        padding: "9px 11px",
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.7)",
                        background: "rgba(15,23,42,0.95)",
                        color: "#e5e7eb",
                        fontSize: 13,
                      }}
                    />
                  </div>

                  {candidateFollowers.length === 0 ? (
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(148,163,184,0.9)",
                      }}
                    >
                      No matching followers found that are not already in the
                      team.
                    </div>
                  ) : (
                    <div
                      style={{
                        maxHeight: 260,
                        overflowY: "auto",
                        paddingRight: 2,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      {candidateFollowers.map((f) => {
                        const name = f.full_name || "Quantum5ocial member";
                        const initials = name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        const location = [f.city, f.country]
                          .filter(Boolean)
                          .join(", ");
                        const subtitle =
                          [f.role, f.affiliation, location]
                            .filter(Boolean)
                            .join(" · ") || "Quantum5ocial member";

                        return (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleAddMemberFromFollower(f.id)}
                            style={{
                              width: "100%",
                              borderRadius: 10,
                              border: "1px solid rgba(148,163,184,0.5)",
                              background: "rgba(15,23,42,0.95)",
                              padding: 8,
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              cursor: "pointer",
                            }}
                          >
                            <div
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 999,
                                overflow: "hidden",
                                flexShrink: 0,
                                background:
                                  "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "1px solid rgba(148,163,184,0.6)",
                                color: "#e5e7eb",
                                fontWeight: 700,
                                fontSize: 12,
                              }}
                            >
                              {f.avatar_url ? (
                                <img
                                  src={f.avatar_url}
                                  alt={name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              ) : (
                                initials
                              )}
                            </div>

                            <div
                              style={{
                                flex: 1,
                                minWidth: 0,
                                textAlign: "left",
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 500,
                                  color: "rgba(226,232,240,0.98)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {name}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "rgba(148,163,184,0.95)",
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {subtitle}
                              </div>
                            </div>

                            <div
                              style={{
                                fontSize: 11,
                                color: "#a5b4fc",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Add to team
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Followers */}
            <div style={{ marginTop: 28 }}>
              <div
                style={{
                  fontSize: 13,
                  textTransform: "uppercase",
                  letterSpacing: 0.08,
                  color: "rgba(148,163,184,0.9)",
                  marginBottom: 10,
                }}
              >
                Followers
              </div>

              {loadingFollowers && (
                <p className="profile-muted">Loading followers…</p>
              )}

              {followersError && !loadingFollowers && (
                <p
                  className="profile-muted"
                  style={{
                    color: "#f97373",
                    marginTop: 4,
                  }}
                >
                  {followersError}
                </p>
              )}

              {!loadingFollowers && !followersError && followersCount === 0 && (
                <div className="products-empty">
                  No followers yet. Once people follow this organization, they
                  will appear here.
                </div>
              )}

              {!loadingFollowers && !followersError && followers.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                    gap: 12,
                    marginTop: 6,
                  }}
                >
                  {followers.map((f) => {
                    const name = f.full_name || "Quantum5ocial member";
                    const initials = name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                    const location = [f.city, f.country]
                      .filter(Boolean)
                      .join(", ");
                    const subtitle =
                      [f.role, f.affiliation, location]
                        .filter(Boolean)
                        .join(" · ") || "Quantum5ocial member";

                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => goToProfile(f.id)}
                        className="card"
                        style={{
                          textAlign: "left",
                          padding: 12,
                          borderRadius: 14,
                          display: "flex",
                          flexDirection: "column",
                          gap: 10,
                          cursor: "pointer",
                          background: "rgba(2,6,23,0.35)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                          }}
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 999,
                              overflow: "hidden",
                              flexShrink: 0,
                              background:
                                "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border: "1px solid rgba(148,163,184,0.6)",
                              color: "#e5e7eb",
                              fontWeight: 700,
                              fontSize: 13,
                            }}
                          >
                            {f.avatar_url ? (
                              <img
                                src={f.avatar_url}
                                alt={name}
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                }}
                              />
                            ) : (
                              initials
                            )}
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontSize: 13,
                                fontWeight: 600,
                                color: "rgba(226,232,240,0.98)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {name}
                            </div>
                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 11,
                                color: "rgba(148,163,184,0.95)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {subtitle}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: "auto",
                            fontSize: 12,
                            color: "#7dd3fc",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          View profile <span style={{ opacity: 0.9 }}>›</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

// layout config
(OrganizationDetailPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
