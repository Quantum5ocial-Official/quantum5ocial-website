// pages/notifications.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

// Sidebar profile summary
type ProfileSummary = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  highest_education: string | null;
  describes_you: string | null;
  affiliation: string | null;
  current_org: string | null;
  country: string | null;
  city: string | null;
};

// Connection row (pending request)
type ConnectionRow = {
  id: string;
  user_id: string;
  target_user_id: string;
  status: string;
  created_at: string | null;
};

// Minimal profile for request cards
type RequestProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string | null;
  short_bio: string | null;
  highest_education: string | null;
  affiliation: string | null;
  country: string | null;
  city: string | null;
};

type PendingRequest = {
  connectionId: string;
  created_at: string | null;
  sender: RequestProfile;
};

export default function NotificationsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [sidebarProfile, setSidebarProfile] = useState<ProfileSummary | null>(
    null
  );
  const [savedJobsCount, setSavedJobsCount] = useState<number | null>(null);
  const [savedProductsCount, setSavedProductsCount] = useState<number | null>(
    null
  );
  const [entangledCount, setEntangledCount] = useState<number | null>(null);

  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [requestsError, setRequestsError] = useState<string | null>(null);
  const [actionLoadingIds, setActionLoadingIds] = useState<string[]>([]);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/notifications");
    }
  }, [loading, user, router]);

  // Load sidebar profile + counts
  useEffect(() => {
    const loadSidebar = async () => {
      if (!user) {
        setSidebarProfile(null);
        setSavedJobsCount(null);
        setSavedProductsCount(null);
        setEntangledCount(null);
        return;
      }

      try {
        // Profile
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, highest_education, describes_you, affiliation, current_org, country, city"
          )
          .eq("id", user.id)
          .maybeSingle();

        if (!profErr && prof) {
          setSidebarProfile(prof as ProfileSummary);
        } else {
          setSidebarProfile(null);
        }

        // Saved jobs
        const { data: savedJobsRows, error: savedJobsErr } = await supabase
          .from("saved_jobs")
          .select("id")
          .eq("user_id", user.id);

        if (!savedJobsErr && savedJobsRows) {
          setSavedJobsCount(savedJobsRows.length);
        } else {
          setSavedJobsCount(0);
        }

        // Saved products
        const { data: savedProdRows, error: savedProdErr } = await supabase
          .from("saved_products")
          .select("id")
          .eq("user_id", user.id);

        if (!savedProdErr && savedProdRows) {
          setSavedProductsCount(savedProdRows.length);
        } else {
          setSavedProductsCount(0);
        }

        // Entangled states
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
        console.error("Error loading notifications sidebar", e);
        setSidebarProfile(null);
        setSavedJobsCount(0);
        setSavedProductsCount(0);
        setEntangledCount(0);
      }
    };

    loadSidebar();
  }, [user]);

  // Load pending entanglement requests
  useEffect(() => {
    const loadPendingRequests = async () => {
      if (!user) {
        setPendingRequests([]);
        setLoadingRequests(false);
        return;
      }

      setLoadingRequests(true);
      setRequestsError(null);

      try {
        // 1) Get pending connections where current user is the target
        const { data: connRows, error: connErr } = await supabase
          .from("connections")
          .select("id, user_id, target_user_id, status, created_at")
          .eq("target_user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (connErr) throw connErr;

        if (!connRows || connRows.length === 0) {
          setPendingRequests([]);
          return;
        }

        const senderIds = Array.from(
          new Set((connRows as ConnectionRow[]).map((c) => c.user_id))
        );

        // 2) Fetch sender profiles
        const { data: senderProfiles, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, short_bio, highest_education, affiliation, country, city"
          )
          .in("id", senderIds);

        if (profErr) throw profErr;

        const profilesById: Record<string, RequestProfile> = {};
        (senderProfiles || []).forEach((p: any) => {
          profilesById[p.id] = p as RequestProfile;
        });

        // 3) Build request objects
        const requests: PendingRequest[] = (connRows as ConnectionRow[])
          .map((c) => {
            const sender = profilesById[c.user_id];
            if (!sender) return null;
            return {
              connectionId: c.id,
              created_at: c.created_at,
              sender,
            };
          })
          .filter(Boolean) as PendingRequest[];

        setPendingRequests(requests);
      } catch (e) {
        console.error("Error loading pending requests", e);
        setRequestsError(
          "Could not load your notifications. Please try again later."
        );
        setPendingRequests([]);
      } finally {
        setLoadingRequests(false);
      }
    };

    loadPendingRequests();
  }, [user]);

  const isActionLoading = (connectionId: string) =>
    actionLoadingIds.includes(connectionId);

  const handleRespond = async (connectionId: string, accept: boolean) => {
    if (!user) {
      router.push("/auth?redirect=/notifications");
      return;
    }

    setActionLoadingIds((prev) => [...prev, connectionId]);

    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", connectionId);

      if (error) {
        console.error("Error updating connection", error);
      } else {
        // Remove from local list
        setPendingRequests((prev) =>
          prev.filter((r) => r.connectionId !== connectionId)
        );
      }
    } catch (e) {
      console.error("Unexpected error updating connection", e);
    } finally {
      setActionLoadingIds((prev) =>
        prev.filter((id) => id !== connectionId)
      );
    }
  };

  if (!user && !loading) return null;

  // Sidebar helpers
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarName = sidebarProfile?.full_name || fallbackName || "Your profile";
  const avatarUrl = sidebarProfile?.avatar_url || null;
  const educationLevel = sidebarProfile?.highest_education || "";
  const describesYou = sidebarProfile?.describes_you || sidebarProfile?.role || "";
  const affiliation =
    sidebarProfile?.affiliation ||
    sidebarProfile?.current_org ||
    [sidebarProfile?.city, sidebarProfile?.country]
      .filter(Boolean)
      .join(", ");

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
          {/* LEFT SIDEBAR */}
          <aside
            className="layout-left sticky-col"
            style={{ display: "flex", flexDirection: "column" }}
          >
            {/* Profile card */}
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
                      alt={sidebarName}
                      className="profile-sidebar-avatar"
                    />
                  ) : (
                    <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                      {sidebarName
                        .split(" ")
                        .map((p) => p[0])
                        .join("")
                        .slice(0, 2)
                        .toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="profile-sidebar-title-block">
                  <div className="profile-sidebar-name">{sidebarName}</div>
                  {sidebarProfile?.role && (
                    <div className="profile-sidebar-role">
                      {sidebarProfile.role}
                    </div>
                  )}
                </div>
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
          </aside>

          {/* CENTER – NOTIFICATIONS */}
          <section className="layout-center">
            <div className="section-header" style={{ marginBottom: 16 }}>
              <div>
                <div className="section-title">Notifications</div>
                <div className="section-sub">
                  Entanglement requests from other members in the Quantum5ocial
                  community.
                </div>
              </div>
            </div>

            {loadingRequests && (
              <p className="profile-muted">Loading your notifications…</p>
            )}

            {requestsError && !loadingRequests && (
              <p
                className="profile-muted"
                style={{ color: "#f97373", marginTop: 8 }}
              >
                {requestsError}
              </p>
            )}

            {!loadingRequests &&
              !requestsError &&
              pendingRequests.length === 0 && (
                <div className="products-empty">
                  You have no entanglement requests at the moment.
                  <br />
                  <br />
                  Discover new members in the{" "}
                  <Link href="/community" className="section-link">
                    community
                  </Link>{" "}
                  and start building your ecosystem.
                </div>
              )}

            {!loadingRequests &&
              !requestsError &&
              pendingRequests.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                  }}
                >
                  {pendingRequests.map(({ connectionId, sender }) => {
                    const name =
                      sender.full_name || "Quantum5ocial member";
                    const initials = name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    const location = [sender.city, sender.country]
                      .filter(Boolean)
                      .join(", ");
                    const metaLines: string[] = [];
                    if (sender.highest_education)
                      metaLines.push(sender.highest_education);
                    if (sender.affiliation) metaLines.push(sender.affiliation);
                    if (location) metaLines.push(location);
                    const meta = metaLines.join(" · ");

                    return (
                      <div
                        key={connectionId}
                        className="card"
                        style={{
                          padding: 18,
                          borderRadius: 18,
                          border: "1px solid rgba(56,189,248,0.35)",
                          background:
                            "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.14), rgba(15,23,42,0.98))",
                          boxShadow: "0 18px 45px rgba(15,23,42,0.75)",
                        }}
                      >
                        <div
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
                              flexShrink: 0,
                              background:
                                "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              border:
                                "1px solid rgba(148,163,184,0.55)",
                              color: "#e5e7eb",
                              fontWeight: 600,
                              fontSize: 18,
                            }}
                          >
                            {sender.avatar_url ? (
                              <img
                                src={sender.avatar_url}
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

                          {/* Text block */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                marginBottom: 4,
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 15,
                                  }}
                                >
                                  {name}
                                </div>
                                {sender.role && (
                                  <div
                                    style={{
                                      fontSize: 12,
                                      color: "rgba(148,163,184,0.95)",
                                      marginTop: 2,
                                    }}
                                  >
                                    {sender.role}
                                  </div>
                                )}
                              </div>
                              <span
                                style={{
                                  fontSize: 11,
                                  padding: "2px 9px",
                                  borderRadius: 999,
                                  border:
                                    "1px solid rgba(148,163,184,0.7)",
                                  color: "rgba(226,232,240,0.95)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Member
                              </span>
                            </div>

                            {meta && (
                              <div
                                style={{
                                  fontSize: 12,
                                  color: "rgba(148,163,184,0.95)",
                                  marginBottom: 6,
                                }}
                              >
                                {meta}
                              </div>
                            )}

                            <div
                              style={{
                                fontSize: 12,
                                color: "var(--text-muted)",
                                lineHeight: 1.45,
                                marginBottom: 12,
                              }}
                            >
                              {sender.short_bio ||
                                "Wants to entangle with you on Quantum5ocial and join your ecosystem."}
                            </div>

                            {/* Actions */}
                            <div
                              style={{
                                display: "flex",
                                gap: 10,
                                flexWrap: "wrap",
                              }}
                            >
                              <button
                                type="button"
                                disabled={isActionLoading(connectionId)}
                                onClick={() =>
                                  handleRespond(connectionId, true)
                                }
                                style={{
                                  flex: 1,
                                  minWidth: 140,
                                  padding: "8px 0",
                                  borderRadius: 999,
                                  border: "none",
                                  background: isActionLoading(connectionId)
                                    ? "rgba(34,197,94,0.7)"
                                    : "#22c55e",
                                  color: "#022c22",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                {isActionLoading(connectionId)
                                  ? "Accepting…"
                                  : "Accept request"}
                              </button>

                              <button
                                type="button"
                                disabled={isActionLoading(connectionId)}
                                onClick={() =>
                                  handleRespond(connectionId, false)
                                }
                                style={{
                                  flex: 1,
                                  minWidth: 120,
                                  padding: "8px 0",
                                  borderRadius: 999,
                                  border:
                                    "1px solid rgba(148,163,184,0.7)",
                                  background: "transparent",
                                  color: "rgba(248,250,252,0.9)",
                                  fontSize: 13,
                                  cursor: "pointer",
                                }}
                              >
                                {isActionLoading(connectionId)
                                  ? "Processing…"
                                  : "Decline"}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </section>

          {/* RIGHT COLUMN – empty for now */}
          <aside className="layout-right" />
        </main>
      </div>
    </>
  );
}
