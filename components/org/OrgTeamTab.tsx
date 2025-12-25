// components/org/OrgTeamTab.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type Org = {
  id: string;
  created_by: string | null;
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

type OrgMemberRow = {
  user_id: string;
  role: OrgMemberRole;
  is_affiliated: boolean;
  designation?: string | null; // new column
};

type OrgMemberWithProfile = {
  user_id: string;
  role: OrgMemberRole;
  is_affiliated: boolean;
  designation?: string | null; // store locally too
  profile: FollowerProfile | null;
};

type SearchProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

type MenuPosition = { top: number; left: number } | null;

function roleLabel(role: OrgMemberRole) {
  if (role === "owner") return "Owner";
  if (role === "co_owner") return "Co-owner";
  if (role === "admin") return "Admin";
  return "Member";
}

function shouldShowRemoveMember(openMember: OrgMemberWithProfile, canRemoveOthers: boolean) {
  if (!openMember) return false;
  return canRemoveOthers && openMember.role !== "owner";
}

export default function OrgTeamTab({
  org,
  canManageMembers,
  canRemoveOthers,
  memberRole,
  isAffiliated,
  onSelfAffiliatedChange,
}: {
  org: Org;
  canManageMembers: boolean;
  canRemoveOthers: boolean;
  memberRole: OrgMemberRole | null;
  isAffiliated: boolean;
  onSelfAffiliatedChange?: (next: boolean) => void;
}) {
  const router = useRouter();
  const { user } = useSupabaseUser();

  // Followers
  const [followers, setFollowers] = useState<FollowerProfile[]>([]);
  const [followersCount, setFollowersCount] = useState<number | null>(null);
  const [loadingFollowers, setLoadingFollowers] = useState<boolean>(true);
  const [followersError, setFollowersError] = useState<string | null>(null);
  const [followersExpanded, setFollowersExpanded] = useState<boolean>(false);

  // Members
  const [members, setMembers] = useState<OrgMemberWithProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(true);
  const [membersError, setMembersError] = useState<string | null>(null);

  // Invite panel state
  const [showAddMember, setShowAddMember] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<SearchProfile[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<OrgMemberRole>("member");
  const [selectedAffiliated, setSelectedAffiliated] = useState<boolean>(true);
  const [selectedDesignation, setSelectedDesignation] = useState<string>(""); // NEW
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  // Member menu portal
  const [memberMenuOpenId, setMemberMenuOpenId] = useState<string | null>(null);
  const [memberActionLoadingId, setMemberActionLoadingId] = useState<string | null>(null);
  const [selfAffLoadingId, setSelfAffLoadingId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>(null);

  // NEW: track when editing designation in-menu, and draft text
  const [editingDesignationId, setEditingDesignationId] = useState<string | null>(null);
  const [designationDraft, setDesignationDraft] = useState<string>("");

  const openMember = useMemo(
    () => members.find((m) => m.user_id === memberMenuOpenId) || null,
    [members, memberMenuOpenId]
  );

  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";

  // scroller ref kept only for potential future use; not needed for grid
  const teamScrollerRef = useRef<HTMLDivElement | null>(null);

  const goToProfile = (profileId: string) => {
    router.push(`/profile/${profileId}`);
  };

  // Load followers
  useEffect(() => {
    const loadFollowers = async () => {
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
          return;
        }

        const userIds = (followRows || []).map((r: any) => r.user_id);
        setFollowersCount(userIds.length);

        if (userIds.length === 0) {
          setFollowers([]);
          return;
        }

        const { data: profileRows, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, role, highest_education, affiliation, country, city")
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
      } finally {
        setLoadingFollowers(false);
      }
    };

    loadFollowers();
  }, [org.id]);

  // Load members
  useEffect(() => {
    const loadMembers = async () => {
      setMembersLoading(true);
      setMembersError(null);

      try {
        const { data: memberRows, error: membersErr } = await supabase
          .from("org_members")
          .select("user_id, role, is_affiliated, designation") // include designation
          .eq("org_id", org.id);

        if (membersErr) {
          console.error("Error loading org members", membersErr);
          setMembers([]);
          setMembersError("Could not load team members.");
          return;
        }

        let rows = (memberRows || []) as OrgMemberRow[];

        // Ensure creator present as Owner
        if (org.created_by) {
          const hasCreator = rows.some((r) => r.user_id === org.created_by);
          if (!hasCreator) {
            rows = [...rows, { user_id: org.created_by, role: "owner", is_affiliated: true }];
          }
        }

        if (rows.length === 0) {
          setMembers([]);
          return;
        }

        const userIds = rows.map((m) => m.user_id);

        const { data: profileRows, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, role, highest_education, affiliation, country, city")
          .in("id", userIds);

        if (profErr) {
          console.error("Error loading member profiles", profErr);
          setMembersError("Could not load member profiles.");
          setMembers([]);
          return;
        }

        const profileMap = new Map((profileRows || []).map((p: any) => [p.id, p as FollowerProfile]));

        const merged: OrgMemberWithProfile[] = rows.map((m) => ({
          user_id: m.user_id,
          role: m.role,
          is_affiliated: !!m.is_affiliated,
          designation: m.designation ?? null,
          profile: profileMap.get(m.user_id) || null,
        }));

        merged.sort((a, b) => {
          const order: Record<OrgMemberRole, number> = { owner: 0, co_owner: 1, admin: 2, member: 3 };
          const da = order[a.role] - order[b.role];
          if (da !== 0) return da;
          return (a.profile?.full_name || "").localeCompare(b.profile?.full_name || "");
        });

        setMembers(merged);
      } catch (err) {
        console.error("Unexpected error loading org members", err);
        setMembers([]);
        setMembersError("Could not load team members.");
      } finally {
        setMembersLoading(false);
      }
    };

    loadMembers();
  }, [org.id, org.created_by]);

  // Live search (followers only)
  useEffect(() => {
    if (!showAddMember) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }
    if (!searchTerm.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const lower = searchTerm.trim().toLowerCase();
    const filtered = followers.filter((f) => (f.full_name || "").toLowerCase().includes(lower));
    setSearchResults(filtered.slice(0, 20));
    setSearchError(null);
  }, [searchTerm, followers, showAddMember]);

  const handleAddMember = async (profileId: string) => {
    if (!canManageMembers) return;

    setSavingMemberId(profileId);
    try {
      const { error } = await supabase
        .from("org_members")
        .upsert(
          {
            org_id: org.id,
            user_id: profileId,
            role: selectedRole,
            is_affiliated: selectedAffiliated,
            designation: selectedDesignation || null, // NEW
          },
          { onConflict: "org_id,user_id" }
        );

      if (error) {
        console.error("Error adding org member", error);
        return;
      }

      const profile = (searchResults.find((p) => p.id === profileId) as FollowerProfile) || null;

      setMembers((prev) => {
        const idx = prev.findIndex((m) => m.user_id === profileId);
        const updated: OrgMemberWithProfile = {
          user_id: profileId,
          role: selectedRole,
          is_affiliated: selectedAffiliated,
          designation: selectedDesignation || null, // NEW
          profile,
        };
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [...prev, updated];
      });
      // Reset designation field if you want after add
      setSelectedDesignation("");
    } catch (err) {
      console.error("Unexpected error adding org member", err);
    } finally {
      setSavingMemberId(null);
    }
  };

  const handleToggleSelfAffiliation = (member: OrgMemberWithProfile, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (member.user_id !== user.id) return;

    const update = async () => {
      const newValue = !member.is_affiliated;
      setSelfAffLoadingId(member.user_id);

      try {
        const { error } = await supabase
          .from("org_members")
          .upsert(
            { org_id: org.id, user_id: user.id, role: memberRole ?? "member", is_affiliated: newValue },
            { onConflict: "org_id,user_id" }
          );

        if (error) {
          console.error("Error updating self affiliation", error);
          return;
        }

        setMembers((prev) => prev.map((m) => (m.user_id === member.user_id ? { ...m, is_affiliated: newValue } : m)));
        onSelfAffiliatedChange?.(newValue);
      } catch (err) {
        console.error("Unexpected error updating self affiliation", err);
      } finally {
        setSelfAffLoadingId(null);
      }
    };

    void update();
  };

  const handleChangeMemberRole = async (memberUserId: string, newRole: OrgMemberRole, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canManageMembers) return;

    setMemberActionLoadingId(memberUserId);
    try {
      const { error } = await supabase
        .from("org_members")
        .update({ role: newRole })
        .eq("org_id", org.id)
        .eq("user_id", memberUserId);

      if (error) {
        console.error("Error changing member role", error);
        return;
      }

      setMembers((prev) => prev.map((m) => (m.user_id === memberUserId ? { ...m, role: newRole } : m)));
      setMemberMenuOpenId(null);
      setMenuPosition(null);
    } finally {
      setMemberActionLoadingId(null);
    }
  };

  const handleRemoveMember = async (memberUserId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!canRemoveOthers) return;

    setMemberActionLoadingId(memberUserId);
    try {
      const { error } = await supabase
        .from("org_members")
        .delete()
        .eq("org_id", org.id)
        .eq("user_id", memberUserId);

      if (error) {
        console.error("Error removing member from org", error);
        return;
      }

      setMembers((prev) => prev.filter((m) => m.user_id !== memberUserId));
      setMemberMenuOpenId(null);
      setMenuPosition(null);
    } finally {
      setMemberActionLoadingId(null);
    }
  };

  // NEW: handle saving updated designation
  const handleSaveDesignation = async (memberUserId: string) => {
    const newDesign = designationDraft.trim() || null;
    setMemberActionLoadingId(memberUserId);

    try {
      const { error } = await supabase
        .from("org_members")
        .update({ designation: newDesign })
        .eq("org_id", org.id)
        .eq("user_id", memberUserId);

      if (error) {
        console.error("Error updating designation", error);
        return;
      }

      setMembers((prev) =>
        prev.map((m) =>
          m.user_id === memberUserId ? { ...m, designation: newDesign ?? null } : m
        )
      );
      // close editing UI
      setEditingDesignationId(null);
      setMemberMenuOpenId(null);
      setMenuPosition(null);
    } finally {
      setMemberActionLoadingId(null);
    }
  };

  const handleCancelEditDesignation = () => {
    setEditingDesignationId(null);
    setDesignationDraft("");
  };

  return (
    <div style={{ marginTop: 18 }}>
      {/* Team header + Add member */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.08, color: "rgba(148,163,184,0.9)" }}>
          Team &amp; members
        </div>

        {canManageMembers && (
          <button
            type="button"
            onClick={() => {
              setShowAddMember((prev) => !prev);
              setSearchTerm("");
              setSearchResults([]);
              setSearchError(null);
            }}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              border: "1px solid rgba(148,163,184,0.6)",
              background: showAddMember ? "rgba(15,23,42,0.9)" : "rgba(15,23,42,0.6)",
              color: "rgba(226,232,240,0.95)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ display: "inline-flex", width: 14, height: 14, borderRadius: 999, alignItems: "center", justifyContent: "center", border: "1px solid rgba(148,163,184,0.8)", fontSize: 10 }}>
              {showAddMember ? "−" : "+"}
            </span>
            {showAddMember ? "Close" : "Add member"}
          </button>
        )}
      </div>

      {showAddMember && canManageMembers && (
        <div style={{ borderRadius: 16, border: "1px solid rgba(148,163,184,0.4)", padding: 12, marginBottom: 12, background: "rgba(15,23,42,0.85)" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 12 }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search followers by name…"
              style={{
                flex: "1 1 220px",
                minWidth: 0,
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(51,65,85,0.9)",
                background: "rgba(15,23,42,0.95)",
                color: "#e5e7eb",
                fontSize: 13,
              }}
            />
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setSearchResults([]);
                setSearchError(null);
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.6)",
                background: "transparent",
                color: "rgba(148,163,184,0.95)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Clear
            </button>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 10 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(209,213,219,0.95)" }}>
              Member role:
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as OrgMemberRole)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(15,23,42,0.9)",
                  color: "#e5e7eb",
                  fontSize: 12,
                  outline: "none",
                }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="co_owner">Co-owner</option>
              </select>
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(209,213,219,0.95)" }}>
              <input type="checkbox" checked={selectedAffiliated} onChange={(e) => setSelectedAffiliated(e.target.checked)} style={{ margin: 0 }} />
              Mark as affiliated
            </label>

            {/* NEW designation input */}
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(209,213,219,0.95)" }}>
              Designation / role:
              <input
                type="text"
                value={selectedDesignation}
                onChange={(e) => setSelectedDesignation(e.target.value)}
                placeholder="CEO / Engineer / Scientist"
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(148,163,184,0.7)",
                  background: "rgba(15,23,42,0.9)",
                  color: "#e5e7eb",
                  fontSize: 12,
                  outline: "none",
                  minWidth: 140,
                }}
              />
            </label>
          </div>

          {searchError && <div style={{ fontSize: 12, color: "#f97373", marginBottom: 8 }}>{searchError}</div>}

          {searchResults.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 10,
                maxHeight: 260,
                overflowY: "auto",
                paddingRight: 4,
              }}
            >
              {searchResults.map((p) => {
                const name = p.full_name || "Quantum5ocial member";
                const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

                const location = [p.city, p.country].filter(Boolean).join(", ");
                const subtitle = [p.role, p.affiliation, location].filter(Boolean).join(" · ") || "Quantum5ocial member";

                const alreadyMember = members.some((m) => m.user_id === p.id);

                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      borderRadius: 14,
                      padding: 10,
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      background: "rgba(2,6,23,0.7)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 999,
                          overflow: "hidden",
                          flexShrink: 0,
                          background: "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(148,163,184,0.6)",
                          color: "#e5e7eb",
                          fontWeight: 700,
                          fontSize: 12,
                        }}
                      >
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={name}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
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

                    <div style={{ marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 11, color: "rgba(148,163,184,0.9)" }}>
                        {alreadyMember ? "Already in team" : "Add to team"}
                      </div>
                      <button
                        type="button"
                        disabled={alreadyMember || savingMemberId === p.id}
                        onClick={() => handleAddMember(p.id)}
                        style={{
                          padding: "4px 10px",
                          borderRadius: 999,
                          border: alreadyMember
                            ? "1px solid rgba(148,163,184,0.6)"
                            : "1px solid rgba(34,197,94,0.7)",
                          background: alreadyMember ? "transparent" : "rgba(22,163,74,0.18)",
                          color: alreadyMember ? "rgba(148,163,184,0.9)" : "rgba(187,247,208,0.96)",
                          fontSize: 11,
                          cursor: alreadyMember || savingMemberId === p.id ? "default" : "pointer",
                        }}
                      >
                        {alreadyMember ? "In team" : savingMemberId === p.id ? "Adding…" : "Add"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            searchTerm.trim() &&
            !searchError && (
              <div style={{ fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
                No matching followers found. Only followers can be added to the team.
              </div>
            )
          )}

          {!searchTerm.trim() && followers.length === 0 && (
            <div style={{ fontSize: 12, color: "rgba(148,163,184,0.85)", marginTop: 6 }}>
              This organization has no followers yet. Once people follow, you can add them here as team members.
            </div>
          )}
        </div>
      )}

      {membersLoading && <p className="profile-muted">Loading team members…</p>}
      {membersError && !membersLoading && <p className="profile-muted" style={{ color: "#f97373", marginTop: 4 }}>{membersError}</p>}
      {!membersLoading && !membersError && members.length === 0 && <div className="products-empty">No team members added yet.</div>}

      {!membersLoading && !membersError && members.length > 0 && (
        <div
          className="card"
          style={{
            position: "relative",
            padding: 14,
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(15,23,42,0.72)",
            overflow: "hidden",
          }}
        >
          {/* changed from horizontal scroll to grid */}
          <div
            style={{
              display: "grid",
              // exactly 3 columns layout; MDN docs describe grid property usage and patterns.  [oai_citation:0‡MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/grid#:~:text=%3C%27grid,if%20it%27s%20specified)
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 12,
              padding: "4px 0px 10px 0px",
            }}
          >
            {members.map((m) => {
              const profile = m.profile;
              const name = profile?.full_name || "Quantum5ocial member";
              const initials = name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              const location = [profile?.city, profile?.country].filter(Boolean).join(", ");
              const subtitle =
                [profile?.role, profile?.affiliation, location].filter(Boolean).join(" · ") || "Quantum5ocial member";

              const isCurrentUser = !!user && !!profile && profile.id === user.id;
              const isRealOwner = !!org && m.user_id === org.created_by && m.role === "owner";

              return (
                <div key={m.user_id} style={{ width: "100%" }}>
                  <button
                    type="button"
                    onClick={() => profile && goToProfile(profile.id)}
                    className="card"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 14,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                      cursor: profile ? "pointer" : "default",
                      background: "rgba(2,6,23,0.35)",
                      position: "relative",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 999,
                            overflow: "hidden",
                            flexShrink: 0,
                            background: "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(148,163,184,0.6)",
                            color: "#e5e7eb",
                            fontWeight: 700,
                            fontSize: 13,
                          }}
                        >
                          {profile?.avatar_url ? (
                            <img src={profile.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                            {isCurrentUser && (
                              <span style={{ marginLeft: 6, fontSize: 11, color: "rgba(148,163,184,0.95)" }}>(you)</span>
                            )}
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
                          {/* Optional: show designation under subtitle if present */}
                          {m.designation && (
                            <div
                              style={{
                                marginTop: 2,
                                fontSize: 11,
                                fontStyle: "italic",
                                color: "rgba(178,186,207,0.95)",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {m.designation}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* show menu for all members if canManageMembers */}
                      {canManageMembers && (
                        <div style={{ marginLeft: "auto", flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!isBrowser) return;

                              if (memberMenuOpenId === m.user_id) {
                                setMemberMenuOpenId(null);
                                setMenuPosition(null);
                                setEditingDesignationId(null);
                                return;
                              }

                              const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                              const scrollX = window.scrollX ?? window.pageXOffset ?? 0;
                              const scrollY = window.scrollY ?? window.pageYOffset ?? 0;

                              const dropdownWidth = 190;
                              const top = rect.bottom + scrollY + 6;
                              const left = rect.right + scrollX - dropdownWidth;

                              setMemberMenuOpenId(m.user_id);
                              setMenuPosition({ top, left });
                              setEditingDesignationId(null);
                            }}
                            style={{
                              width: 24,
                              height: 24,
                              borderRadius: 999,
                              border: "1px solid rgba(71,85,105,0.9)",
                              background: "rgba(15,23,42,0.95)",
                              color: "rgba(148,163,184,0.95)",
                              fontSize: 14,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              padding: 0,
                            }}
                          >
                            ⋯
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontSize: 11,
                          borderRadius: 999,
                          padding: "2px 7px",
                          border: "1px solid rgba(129,140,248,0.8)",
                          color: "rgba(191,219,254,0.95)",
                        }}
                      >
                        {roleLabel(m.role)}
                      </span>

                      {m.is_affiliated && (
                        <span
                          style={{
                            fontSize: 11,
                            borderRadius: 999,
                            padding: "2px 7px",
                            border: "1px solid rgba(34,197,94,0.7)",
                            color: "rgba(187,247,208,0.95)",
                          }}
                        >
                          Affiliated
                        </span>
                      )}
                    </div>

                    {isCurrentUser && (
                      <div
                        style={{
                          marginTop: 6,
                          paddingTop: 6,
                          borderTop: "1px dashed rgba(51,65,85,0.9)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.95)" }}>
                          Affiliated with this organization
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelfAffiliation(m, e)}
                          disabled={selfAffLoadingId === m.user_id}
                          style={{
                            fontSize: 11,
                            borderRadius: 999,
                            padding: "2px 8px",
                            border: m.is_affiliated ? "1px solid rgba(34,197,94,0.8)" : "1px solid rgba(148,163,184,0.7)",
                            background: m.is_affiliated ? "rgba(22,163,74,0.2)" : "transparent",
                            color: m.is_affiliated ? "rgba(187,247,208,0.96)" : "rgba(226,232,240,0.9)",
                            cursor: selfAffLoadingId === m.user_id ? "default" : "pointer",
                          }}
                        >
                          {selfAffLoadingId === m.user_id ? "Updating…" : m.is_affiliated ? "Set as not affiliated" : "Set as affiliated"}
                        </button>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Followers section */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.08, color: "rgba(148,163,184,0.9)" }}>
            Followers
          </div>

          <button
            type="button"
            onClick={() => setFollowersExpanded((v) => !v)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 12,
              border: "1px solid rgba(148,163,184,0.6)",
              background: followersExpanded ? "rgba(15,23,42,0.9)" : "rgba(15,23,42,0.6)",
              color: "rgba(226,232,240,0.95)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              whiteSpace: "nowrap",
            }}
          >
            {followersExpanded ? "Collapse" : "Expand"} <span style={{ opacity: 0.85 }}>{followersExpanded ? "▴" : "▾"}</span>
          </button>
        </div>

        {loadingFollowers && <p className="profile-muted">Loading followers…</p>}
        {followersError && !loadingFollowers && <p className="profile-muted" style={{ color: "#f97373", marginTop: 4 }}>{followersError}</p>}
        {!loadingFollowers && !followersError && followersCount === 0 && <div className="products-empty">No followers yet.</div>}

        {!loadingFollowers && !followersError && followers.length > 0 && !followersExpanded && (
          <div style={{ fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
            {followersCount !== null ? `${followersCount} follower${followersCount === 1 ? "" : "s"}.` : "Followers."} Click{" "}
            <span style={{ color: "#7dd3fc" }}>Expand</span> to view.
          </div>
        )}

        {!loadingFollowers && !followersError && followersExpanded && followers.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginTop: 6 }}>
            {followers.map((f) => {
              const name = f.full_name || "Quantum5ocial member";
              const initials = name
                .split(" ")
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              const location = [f.city, f.country].filter(Boolean).join(", ");
              const subtitle =
                [f.role, f.affiliation, location].filter(Boolean).join(" · ") || "Quantum5ocial member";

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
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 999,
                        overflow: "hidden",
                        flexShrink: 0,
                        background: "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(148,163,184,0.6)",
                        color: "#e5e7eb",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {f.avatar_url ? <img src={f.avatar_url} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(226,232,240,0.98)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {name}
                      </div>
                      <div style={{ marginTop: 2, fontSize: 11, color: "rgba(148,163,184,0.95)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {subtitle}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "auto", fontSize: 12, color: "#7dd3fc", display: "inline-flex", alignItems: "center", gap: 6 }}>
                    View profile <span style={{ opacity: 0.9 }}>›</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Global floating member dropdown via portal */}
      {isBrowser &&
        canManageMembers &&
        memberMenuOpenId &&
        openMember &&
        menuPosition &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: menuPosition.top,
              left: menuPosition.left,
              zIndex: 9999,
              borderRadius: 10,
              border: "1px solid rgba(30,64,175,0.9)",
              background: "linear-gradient(135deg,rgba(15,23,42,0.98),rgba(15,23,42,1))",
              boxShadow: "0 18px 40px rgba(15,23,42,0.9)",
              minWidth: 190,
              padding: 4,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "4px 8px", fontSize: 11, color: "rgba(148,163,184,0.95)", borderBottom: "1px solid rgba(30,64,175,0.6)", marginBottom: 4 }}>
              Manage member
            </div>

            {/* Only designation edit for Owner */}
            {openMember.role === "owner" ? (
              <>
                {/* Edit designation option */}
                {!editingDesignationId && (
                  <button
                    type="button"
                    disabled={memberActionLoadingId === openMember.user_id}
                    onClick={() => {
                      setEditingDesignationId(openMember.user_id);
                      setDesignationDraft(openMember.designation || "");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      color: "rgba(226,232,240,0.95)",
                      fontSize: 12,
                      cursor: memberActionLoadingId === openMember.user_id ? "default" : "pointer",
                    }}
                  >
                    Edit designation
                  </button>
                )}

                {/* Designation edit UI */}
                {editingDesignationId === openMember.user_id && (
                  <div style={{ marginTop: 4 }}>
                    <input
                      type="text"
                      value={designationDraft}
                      onChange={(e) => setDesignationDraft(e.target.value)}
                      placeholder="CEO / Engineer / Scientist"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        fontSize: 12,
                        padding: "4px 6px",
                        borderRadius: 6,
                        border: "1px solid rgba(71,85,105,0.8)",
                        background: "rgba(15,23,42,0.9)",
                        color: "rgba(226,232,240,0.95)",
                        marginBottom: 4,
                      }}
                    />
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        type="button"
                        disabled={memberActionLoadingId === openMember.user_id}
                        onClick={() => handleSaveDesignation(openMember.user_id)}
                        style={{
                          flex: 1,
                          fontSize: 12,
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "none",
                          background: "rgba(34,197,94,0.7)",
                          color: "#e5e7eb",
                          cursor: memberActionLoadingId === openMember.user_id ? "default" : "pointer",
                        }}
                      >
                        {memberActionLoadingId === openMember.user_id ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={memberActionLoadingId === openMember.user_id}
                        onClick={handleCancelEditDesignation}
                        style={{
                          flex: 1,
                          fontSize: 12,
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "none",
                          background: "rgba(148,163,184,0.7)",
                          color: "#e5e7eb",
                          cursor: memberActionLoadingId === openMember.user_id ? "default" : "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Non-owner menu: keep prior options */
              <>
                {/* role change options */}
                {(["co_owner", "admin", "member"] as OrgMemberRole[]).map((roleOption) => (
                  <button
                    key={roleOption}
                    type="button"
                    disabled={memberActionLoadingId === openMember.user_id}
                    onClick={(e) => handleChangeMemberRole(openMember.user_id, roleOption, e)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "none",
                      background: roleOption === openMember.role ? "rgba(37,99,235,0.2)" : "transparent",
                      color: roleOption === openMember.role ? "#bfdbfe" : "rgba(226,232,240,0.95)",
                      fontSize: 12,
                      cursor: memberActionLoadingId === openMember.user_id ? "default" : "pointer",
                    }}
                  >
                    {roleOption === "co_owner"
                      ? "Make co-owner"
                      : roleOption === "admin"
                      ? "Make admin"
                      : "Make member"}
                  </button>
                ))}

                {/* Divider */}
                <div style={{ borderTop: "1px solid rgba(30,64,175,0.6)", marginTop: 4, paddingTop: 4 }} />

                {/* Edit designation option */}
                {!editingDesignationId && (
                  <button
                    type="button"
                    disabled={memberActionLoadingId === openMember.user_id}
                    onClick={() => {
                      setEditingDesignationId(openMember.user_id);
                      setDesignationDraft(openMember.designation || "");
                    }}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      borderRadius: 6,
                      border: "none",
                      background: "transparent",
                      color: "rgba(226,232,240,0.95)",
                      fontSize: 12,
                      cursor: memberActionLoadingId === openMember.user_id ? "default" : "pointer",
                    }}
                  >
                    Edit designation
                  </button>
                )}

                {/* Designation edit UI */}
                {editingDesignationId === openMember.user_id && (
                  <div style={{ marginTop: 4 }}>
                    <input
                      type="text"
                      value={designationDraft}
                      onChange={(e) => setDesignationDraft(e.target.value)}
                      placeholder="CEO / Engineer / Scientist"
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        fontSize: 12,
                        padding: "4px 6px",
                        borderRadius: 6,
                        border: "1px solid rgba(71,85,105,0.8)",
                        background: "rgba(15,23,42,0.9)",
                        color: "rgba(226,232,240,0.95)",
                        marginBottom: 4,
                      }}
                    />
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        type="button"
                        disabled={memberActionLoadingId === openMember.user_id}
                        onClick={() => handleSaveDesignation(openMember.user_id)}
                        style={{
                          flex: 1,
                          fontSize: 12,
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "none",
                          background: "rgba(34,197,94,0.7)",
                          color: "#e5e7eb",
                          cursor: memberActionLoadingId === openMember.user_id ? "default" : "pointer",
                        }}
                      >
                        {memberActionLoadingId === openMember.user_id ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        disabled={memberActionLoadingId === openMember.user_id}
                        onClick={handleCancelEditDesignation}
                        style={{
                          flex: 1,
                          fontSize: 12,
                          padding: "6px 8px",
                          borderRadius: 6,
                          border: "none",
                          background: "rgba(148,163,184,0.7)",
                          color: "#e5e7eb",
                          cursor: memberActionLoadingId === openMember.user_id ? "default" : "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Remove member option */}
                {shouldShowRemoveMember(openMember, canRemoveOthers) && (
                  <div style={{ borderTop: "1px solid rgba(30,64,175,0.6)", marginTop: editingDesignationId ? 8 : 4, paddingTop: 4 }}>
                    <button
                      type="button"
                      disabled={memberActionLoadingId === openMember.user_id}
                      onClick={(e) => handleRemoveMember(openMember.user_id, e)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: "none",
                        background: "transparent",
                        color: "#fecaca",
                        fontSize: 12,
                        cursor: memberActionLoadingId === openMember.user_id ? "default" : "pointer",
                      }}
                    >
                      {memberActionLoadingId === openMember.user_id ? "Removing…" : "Remove from team"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
