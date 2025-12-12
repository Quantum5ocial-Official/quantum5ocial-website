// pages/orgs/[slug].tsx
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/NavbarIcons"), {
  ssr: false,
});

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

  // Follow state (current user ↔ this org)
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [followLoading, setFollowLoading] = useState<boolean>(false);

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

  const isOwner = useMemo(() => {
    if (!user || !org) return false;
    return org.created_by === user.id;
  }, [user, org]);

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
        // 1) follower user_ids
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

        // If logged in, we can derive isFollowing from the IDs without fetching profiles
        if (user) setIsFollowing(userIds.includes(user.id));
        else setIsFollowing(false);

        if (userIds.length === 0) {
          setFollowers([]);
          return;
        }

        // 2) follower profiles
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

  // === Follow / unfollow handler ===
  const handleFollowClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (!org) return;

    // Not logged in → auth redirect back to this page
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

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        {/* ✅ AppLayout provides LEFT. This page renders only the MIDDLE content. */}
        <main className="layout-3col">
          <section className="layout-main">
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
                  {/* Back */}
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
                      background:
                        "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,1))",
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
                          </div>
                        </div>

                        <div style={{ display: "flex", flexDirection: "row", gap: 8, flexShrink: 0 }}>
                          {isOwner ? (
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
                        <div style={{ fontSize: 13, color: "rgba(148,163,184,0.95)", marginBottom: 6 }}>
                          {metaLine}
                        </div>
                      )}

                      {org.tagline && (
                        <div style={{ fontSize: 14, color: "rgba(209,213,219,0.95)" }}>{org.tagline}</div>
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

                  {/* Body */}
                  <section>
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
                      <div style={{ fontSize: 14, color: "rgba(156,163,175,0.95)" }}>
                        No detailed description added yet.
                      </div>
                    )}

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
                        <div style={{ fontSize: 14, color: "rgba(226,232,240,0.95)" }}>
                          {org.focus_areas}
                        </div>
                      </div>
                    )}

                    {/* Followers */}
                    <div style={{ marginTop: 24 }}>
                      <div
                        style={{
                          fontSize: 13,
                          textTransform: "uppercase",
                          letterSpacing: 0.08,
                          color: "rgba(148,163,184,0.9)",
                          marginBottom: 6,
                        }}
                      >
                        Followers
                      </div>

                      {loadingFollowers && <p className="profile-muted">Loading followers…</p>}

                      {followersError && !loadingFollowers && (
                        <p className="profile-muted" style={{ color: "#f97373", marginTop: 4 }}>
                          {followersError}
                        </p>
                      )}

                      {!loadingFollowers && !followersError && followersCount === 0 && (
                        <div className="products-empty">
                          No followers yet. Once people follow this organization, they will appear here.
                        </div>
                      )}

                      {!loadingFollowers && !followersError && followers.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 6 }}>
                          {followers.map((f) => {
                            const name = f.full_name || "Quantum5ocial member";
                            const initials = name
                              .split(" ")
                              .map((p) => p[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase();

                            const location = [f.city, f.country].filter(Boolean).join(", ");
                            const metaParts: string[] = [];
                            if (f.role) metaParts.push(f.role);
                            if (f.affiliation) metaParts.push(f.affiliation);
                            if (location) metaParts.push(location);
                            const meta = metaParts.join(" · ");

                            return (
                              <div
                                key={f.id}
                                className="card"
                                style={{
                                  padding: 10,
                                  borderRadius: 12,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  gap: 10,
                                }}
                              >
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                  <div
                                    style={{
                                      width: 36,
                                      height: 36,
                                      borderRadius: "999px",
                                      overflow: "hidden",
                                      flexShrink: 0,
                                      background: "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      border: "1px solid rgba(148,163,184,0.6)",
                                      color: "#e5e7eb",
                                      fontWeight: 600,
                                      fontSize: 13,
                                    }}
                                  >
                                    {f.avatar_url ? (
                                      <img
                                        src={f.avatar_url}
                                        alt={name}
                                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                      />
                                    ) : (
                                      initials
                                    )}
                                  </div>

                                  <div style={{ fontSize: 13 }}>
                                    <div style={{ fontWeight: 500, marginBottom: 2 }}>{name}</div>
                                    {meta && (
                                      <div style={{ fontSize: 11, color: "rgba(148,163,184,0.95)" }}>{meta}</div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </section>
                </>
              )}
            </section>
          </section>
        </main>
      </div>
    </>
  );
}

// ✅ Tell AppLayout: left-only global sidebar, no right sidebar
(OrganizationDetailPage as any).layoutProps = { variant: "two-left", right: null };
