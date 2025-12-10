// pages/notifications.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });
const LeftSidebar = dynamic(() => import("../components/LeftSidebar"), {
  ssr: false,
});

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
  status: "accepted" | "declined" | "rejected";
  isSender: boolean; // is *current* user the one who sent the request?
  otherUser: UserProfile;
};

export default function NotificationsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

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

  // Load pending requests
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

  // Load recent entanglements
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
          .in("status", ["accepted", "declined", "rejected"])
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
          isSenderByConnection[c.id] = isSender;
          otherIdByConnection[c.id] = otherId;
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
            const otherId = otherIdByConnection[c.id];
            const otherUser = profilesById[otherId];
            if (!otherUser) return null;

            const status =
              (c.status as "accepted" | "declined" | "rejected") || "accepted";

            return {
              connectionId: c.id,
              created_at: c.created_at,
              status,
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
        const { error } = await supabase
          .from("connections")
          .update({ status: "accepted" })
          .eq("id", connectionId);

        if (error) {
          console.error("Error accepting connection", error);
        } else {
          setPendingRequests((prev) =>
            prev.filter((r) => r.connectionId !== connectionId)
          );

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

        setPendingRequests((prev) =>
          prev.filter((r) => r.connectionId !== connectionId)
        );

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

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* ========== LEFT COLUMN – PROFILE SIDEBAR (same component as homepage) ========== */}
          <LeftSidebar
            user={user}
            profileSummary={profileSummary}
            myOrg={myOrg}
            entangledCount={entangledCount}
            savedJobsCount={savedJobsCount}
            savedProductsCount={savedProductsCount}
          />

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

            {/* BLOCK 1: Pending requests */}
            <div
              className="card"
              style={{ marginBottom: 20, padding: 16, borderRadius: 18 }}
            >
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
                      marginTop: 4,
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

            {/* BLOCK 2: Recent entanglements */}
            <div
              className="card"
              style={{ padding: 16, borderRadius: 18 }}
            >
              <div
                className="section-subtitle"
                style={{ marginBottom: 8 }}
              >
                Recent entanglements
              </div>

              {loadingEntanglements && (
                <p className="profile-muted">
                  Loading your entangled states…
                </p>
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
                      marginTop: 4,
                    }}
                  >
                    {recentEntanglements.map(
                      ({
                        connectionId,
                        otherUser,
                        created_at,
                        status,
                        isSender,
                      }) => {
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
                        } else if (
                          status === "declined" ||
                          status === "rejected"
                        ) {
                          if (isSender) {
                            message = `Your entanglement request has been declined by ${name}`;
                          } else {
                            message = `You declined the entanglement request from ${name}`;
                          }
                        } else {
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

          {/* RIGHT COLUMN – with subtle divider */}
          <aside
            className="layout-right"
            style={{
              borderLeft: "1px solid rgba(148,163,184,0.18)",
              paddingLeft: 16,
            }}
          />
        </main>
      </div>
    </>
  );
}
