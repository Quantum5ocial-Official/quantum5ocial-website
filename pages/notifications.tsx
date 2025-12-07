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

// Connection row (pending / accepted / declined)
type ConnectionRow = {
  id: string;
  user_id: string;
  target_user_id: string;
  status: string;
  created_at: string | null;
};

// Minimal profile for request & entanglement cards
type UserProfile = {
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
  sender: UserProfile;
};

type RecentEntanglement = {
  connectionId: string;
  created_at: string | null;
  status: string;
  isSender: boolean; // whether *you* are the one who sent the original request
  otherUser: UserProfile;
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

  const [recentEntanglements, setRecentEntanglements] = useState<
    RecentEntanglement[]
  >([]);
  const [loadingEntanglements, setLoadingEntanglements] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/notifications");
    }
  }, [loading, user, router]);

  // Format date/time for entanglement cards
  const formatDateTime = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

        // Entangled states (unique others in accepted connections)
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

  // Load pending requests (status=pending where current user is target)
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

        const { data: senderProfiles, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, short_bio, highest_education, affiliation, country, city"
          )
          .in("id", senderIds);

        if (profErr) throw profErr;

        const profilesById: Record<string, UserProfile> = {};
        (senderProfiles || []).forEach((p: any) => {
          profilesById[p.id] = p as UserProfile;
        });

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

  // Load recent entanglements (accepted + declined where current user is either side)
  useEffect(() => {
    const loadEntanglements = async () => {
      if (!user) {
        setRecentEntanglements([]);
        setLoadingEntanglements(false);
        return;
      }

      setLoadingEntanglements(true);

      try {
        const { data: connRows, error: connErr } = await supabase
          .from("connections")
          .select("id, user_id, target_user_id, status, created_at")
          .in("status", ["accepted", "declined"])
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(30);

        if (connErr) throw connErr;

        if (!connRows || connRows.length === 0) {
          setRecentEntanglements([]);
          return;
        }

        const rows = connRows as ConnectionRow[];

        const otherIdByConnection: Record<string, string> = {};
        const isSenderByConnection: Record<string, boolean> = {};
        const otherIdsSet = new Set<string>();

        rows.forEach((c) => {
          const isSender = c.user_id === user.id;
          const otherId = isSender ? c.target_user_id : c.user_id;
          otherIdByConnection[c.id] = otherId;
          isSenderByConnection[c.id] = isSender;
          otherIdsSet.add(otherId);
        });

        const otherIds = Array.from(otherIdsSet);

        const { data: otherProfiles, error: profErr } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, short_bio, highest_education, affiliation, country, city"
          )
          .in("id", otherIds);

        if (profErr) throw profErr;

        const profilesById: Record<string, UserProfile> = {};
        (otherProfiles || []).forEach((p: any) => {
          profilesById[p.id] = p as UserProfile;
        });

        const entanglements: RecentEntanglement[] = rows
          .map((c) => {
            const otherUser = profilesById[otherIdByConnection[c.id]];
            if (!otherUser) return null;
            return {
              connectionId: c.id,
              created_at: c.created_at,
              status: c.status,
              isSender: isSenderByConnection[c.id],
              otherUser,
            };
          })
          .filter(Boolean) as RecentEntanglement[];

        setRecentEntanglements(entanglements);
      } catch (e) {
        console.error("Error loading entanglements", e);
        setRecentEntanglements([]);
      } finally {
        setLoadingEntanglements(false);
      }
    };

    loadEntanglements();
  }, [user]);

  const isActionLoading = (connectionId: string) =>
    actionLoadingIds.includes(connectionId);

  const handleRespond = async (
    connectionId: string,
    accept: boolean,
    sender?: UserProfile
  ) => {
    if (!user) {
      router.push("/auth?redirect=/notifications");
      return;
    }

    setActionLoadingIds((prev) => [...prev, connectionId]);

    try {
      if (accept) {
        // Simple accept: set status = 'accepted'
        const { error } = await supabase
          .from("connections")
          .update({ status: "accepted" })
          .eq("id", connectionId);

        if (error) {
          console.error("Error accepting connection", error);
        } else {
          // Remove from pending list
          setPendingRequests((prev) =>
            prev.filter((r) => r.connectionId !== connectionId)
          );

          // Add to recent entanglements immediately (you are target here)
          if (sender) {
            setRecentEntanglements((prev) => [
              {
                connectionId,
                created_at: new Date().toISOString(),
                status: "accepted",
                isSender: false,
                otherUser: sender,
              },
              ...prev,
            ]);
          }
        }
      } else {
        // Decline: try status = 'declined', fallback to delete
        const { error } = await supabase
          .from("connections")
          .update({ status: "declined" })
          .eq("id", connectionId);

        if (error) {
          console.error(
            "Error declining connection, falling back to delete",
            error
          );
          const { error: deleteError } = await supabase
            .from("connections")
            .delete()
            .eq("id", connectionId);

          if (deleteError) {
            console.error(
              "Error deleting connection on decline fallback",
              deleteError
            );
          }
        }

        // Remove from pending list locally
        setPendingRequests((prev) =>
          prev.filter((r) => r.connectionId !== connectionId)
        );

        // If the status='declined' update succeeded, the sender will later
        // see: "Your entanglement request has been declined by X".
        // For you (decliner), show in your recent list right away:
        if (sender) {
          setRecentEntanglements((prev) => [
            {
              connectionId,
              created_at: new Date().toISOString(),
              status: "declined",
              isSender: false,
              otherUser: sender,
            },
            ...prev,
          ]);
        }
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
  const describesYou =
    sidebarProfile?.describes_you || sidebarProfile?.role || "";
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
                  Entanglement activity in your Quantum5ocial ecosystem.
                </div>
              </div>
            </div>

            {/* PENDING REQUESTS */}
            <div style={{ marginBottom: 24 }}>
              <div
                className="section-subtitle"
                style={{ marginBottom: 8 }}
              >
                Pending entanglement requests
              </div>

              {loadingRequests && (
                <p className="profile-muted">Loading your requests…</p>
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
                      if (sender.affiliation)
                        metaLines.push(sender.affiliation);
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
                                    handleRespond(
                                      connectionId,
                                      true,
                                      sender
                                    )
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
                                    handleRespond(connectionId, false, sender)
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
            </div>

            {/* RECENT ENTANGLEMENTS */}
            <div>
              <div
                className="section-subtitle"
                style={{ marginBottom: 8 }}
              >
                Recent entanglements
              </div>

              {loadingEntanglements && (
                <p className="profile-muted">Loading your entangled states…</p>
              )}

              {!loadingEntanglements &&
                recentEntanglements.length === 0 && (
                  <div className="products-empty">
                    No entangled activity yet. Once you accept, send, or decline
                    requests, you&apos;ll see a history of entanglements here.
                  </div>
                )}

              {!loadingEntanglements &&
                recentEntanglements.length > 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    {recentEntanglements.map(
                      ({ connectionId, otherUser, created_at, status, isSender }) => {
                        const name =
                          otherUser.full_name || "Quantum5ocial member";
                        const initials = name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        const when = formatDateTime(created_at);

                        let message: string;
                        if (status === "accepted") {
                          message = `You are now entangled with ${name}`;
                        } else if (status === "declined") {
                          if (isSender) {
                            message = `Your entanglement request has been declined by ${name}`;
                          } else {
                            message = `You declined the entanglement request from ${name}`;
                          }
                        } else {
                          // Fallback (should not happen)
                          message = `Entanglement activity with ${name}`;
                        }

                        return (
                          <div
                            key={`ent-${connectionId}`}
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
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: "999px",
                                  overflow: "hidden",
                                  flexShrink: 0,
                                  background:
                                    "radial-gradient(circle at 0% 0%, #22d3ee, #1e293b)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 13,
                                  color: "#e5e7eb",
                                  fontWeight: 600,
                                }}
                              >
                                {otherUser.avatar_url ? (
                                  <img
                                    src={otherUser.avatar_url}
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
                              <div style={{ fontSize: 13 }}>
                                <span style={{ opacity: 0.9 }}>
                                  {message}
                                </span>
                              </div>
                            </div>
                            {when && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "rgba(148,163,184,0.95)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {when}
                              </div>
                            )}
                          </div>
                        );
                      }
                    )}
                  </div>
                )}
            </div>
          </section>

          {/* RIGHT COLUMN – empty for now */}
          <aside className="layout-right" />
        </main>
      </div>
    </>
  );
}
