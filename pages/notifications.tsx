// pages/notifications.tsx
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";
import LeftSidebar from "../components/LeftSidebar";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type Notification = {
  id: string;
  user_id: string;
  type: string | null;
  title: string | null;
  message: string | null;
  link_url: string | null;
  is_read: boolean | null;
  created_at: string | null;
};

export default function NotificationsPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  // ---- Load notifications ----
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading notifications", error);
        setError("Could not load notifications.");
        setNotifications([]);
      } else {
        setNotifications((data || []) as Notification[]);
      }

      setLoading(false);
    };

    loadNotifications();
  }, [user]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  // Group into 3 buckets
  const entanglementRequests = useMemo(
    () =>
      notifications.filter((n) =>
        ["entanglement_request", "connection_request"].includes(
          n.type || ""
        )
      ),
    [notifications]
  );

  const entangledUpdates = useMemo(
    () =>
      notifications.filter((n) =>
        ["entangled", "connection_accepted"].includes(n.type || "")
      ),
    [notifications]
  );

  const otherNotifications = useMemo(
    () =>
      notifications.filter(
        (n) =>
          !["entanglement_request", "connection_request", "entangled", "connection_accepted"].includes(
            n.type || ""
          )
      ),
    [notifications]
  );

  const handleMarkAllRead = async () => {
    if (!user || notifications.length === 0 || unreadCount === 0) return;

    setMarkingAll(true);
    try {
      const idsToMark = notifications
        .filter((n) => !n.is_read)
        .map((n) => n.id);

      if (idsToMark.length === 0) {
        setMarkingAll(false);
        return;
      }

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", idsToMark);

      if (error) {
        console.error("Error marking all as read", error);
      } else {
        setNotifications((prev) =>
          prev.map((n) =>
            idsToMark.includes(n.id) ? { ...n, is_read: true } : n
          )
        );
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const handleOpenNotification = async (notification: Notification) => {
    if (!notification.link_url) return;

    if (!notification.is_read) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
      }
    }

    router.push(notification.link_url);
  };

  const formatCreated = (created_at: string | null) => {
    if (!created_at) return "";
    const time = Date.parse(created_at);
    if (Number.isNaN(time)) return "";
    return new Date(time).toLocaleString();
  };

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* LEFT SIDEBAR – shared component (self-contained) */}
          <LeftSidebar />

          {/* MIDDLE – notifications list */}
          <section className="layout-main">
            <section className="section">
              {/* Header */}
              <div className="section-header">
                <div>
                  <div
                    className="section-title"
                    style={{ display: "flex", alignItems: "center", gap: 10 }}
                  >
                    Notifications
                    {!loading && !error && (
                      <span
                        style={{
                          fontSize: 12,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(56,189,248,0.13)",
                          border: "1px solid rgba(56,189,248,0.35)",
                          color: "#7dd3fc",
                        }}
                      >
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  <div
                    className="section-sub"
                    style={{ maxWidth: 480, lineHeight: 1.45 }}
                  >
                    Stay up to date with entanglement requests, new entangled
                    states, job updates, and activity across the Quantum5ocial
                    ecosystem.
                  </div>
                </div>

                {notifications.length > 0 && unreadCount > 0 && (
                  <button
                    className="nav-ghost-btn"
                    style={{ fontSize: 13, cursor: "pointer" }}
                    disabled={markingAll}
                    onClick={handleMarkAllRead}
                  >
                    {markingAll ? "Marking…" : "Mark all as read"}
                  </button>
                )}
              </div>

              {/* Status */}
              {loading && (
                <div className="products-status">Loading notifications…</div>
              )}

              {error && !loading && (
                <div className="products-status" style={{ color: "#f87171" }}>
                  {error}
                </div>
              )}

              {!loading && !error && notifications.length === 0 && (
                <div className="products-empty">
                  No notifications yet. As you entangle with people, and follow
                  jobs and organizations, updates will appear here.
                </div>
              )}

              {!loading && !error && notifications.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    marginTop: 8,
                  }}
                >
                  {/* ===== BLOCK 1 – Entanglement requests ===== */}
                  {entanglementRequests.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "rgba(148,163,184,0.9)",
                          marginBottom: 6,
                        }}
                      >
                        Entanglement requests
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {entanglementRequests.map((n) => {
                          const read = !!n.is_read;
                          return (
                            <div
                              key={n.id}
                              className="card"
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: read
                                  ? "1px solid rgba(30,64,175,0.4)"
                                  : "1px solid rgba(56,189,248,0.8)",
                                background: read
                                  ? "rgba(15,23,42,0.9)"
                                  : "radial-gradient(circle at top left, rgba(34,211,238,0.18), rgba(15,23,42,1))",
                                cursor: n.link_url ? "pointer" : "default",
                              }}
                              onClick={() =>
                                n.link_url && handleOpenNotification(n)
                              }
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 10,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 500,
                                  }}
                                >
                                  {n.message || n.title || "Entanglement request"}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "rgba(148,163,184,0.9)",
                                  }}
                                >
                                  {formatCreated(n.created_at)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ===== BLOCK 2 – Entangled states updates ===== */}
                  {entangledUpdates.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "rgba(148,163,184,0.9)",
                          marginBottom: 6,
                        }}
                      >
                        Entangled states
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {entangledUpdates.map((n) => {
                          const read = !!n.is_read;
                          return (
                            <div
                              key={n.id}
                              className="card"
                              style={{
                                padding: 10,
                                borderRadius: 10,
                                border: read
                                  ? "1px solid rgba(30,64,175,0.4)"
                                  : "1px solid rgba(56,189,248,0.8)",
                                background: read
                                  ? "rgba(15,23,42,0.9)"
                                  : "radial-gradient(circle at top left, rgba(34,211,238,0.18), rgba(15,23,42,1))",
                                cursor: n.link_url ? "pointer" : "default",
                              }}
                              onClick={() =>
                                n.link_url && handleOpenNotification(n)
                              }
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 10,
                                  fontSize: 13,
                                }}
                              >
                                <div>
                                  {n.message ||
                                    n.title ||
                                    "You are now entangled with a member."}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "rgba(148,163,184,0.9)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatCreated(n.created_at)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ===== BLOCK 3 – Other notifications ===== */}
                  {otherNotifications.length > 0 && (
                    <div>
                      <div
                        style={{
                          fontSize: 12,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "rgba(148,163,184,0.9)",
                          marginBottom: 6,
                        }}
                      >
                        Other activity
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {otherNotifications.map((n) => {
                          const read = !!n.is_read;
                          return (
                            <div
                              key={n.id}
                              className="card"
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: read
                                  ? "1px solid rgba(30,64,175,0.4)"
                                  : "1px solid rgba(56,189,248,0.8)",
                                background: read
                                  ? "rgba(15,23,42,0.9)"
                                  : "radial-gradient(circle at top left, rgba(34,211,238,0.18), rgba(15,23,42,1))",
                                cursor: n.link_url ? "pointer" : "default",
                              }}
                              onClick={() =>
                                n.link_url && handleOpenNotification(n)
                              }
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  gap: 10,
                                }}
                              >
                                <div>
                                  <div
                                    style={{
                                      fontSize: 12,
                                      letterSpacing: "0.08em",
                                      textTransform: "uppercase",
                                      color: read ? "#9ca3af" : "#7dd3fc",
                                      marginBottom: 2,
                                    }}
                                  >
                                    {n.type || "Update"}
                                  </div>
                                  <div
                                    style={{
                                      fontSize: 14,
                                      fontWeight: 600,
                                      marginBottom: 3,
                                    }}
                                  >
                                    {n.title || "Notification"}
                                  </div>
                                  {n.message && (
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "var(--text-muted)",
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {n.message}
                                    </div>
                                  )}
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "rgba(148,163,184,0.9)",
                                    textAlign: "right",
                                  }}
                                >
                                  {formatCreated(n.created_at)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          </section>

          {/* RIGHT COLUMN – static info / future settings */}
          <aside className="layout-right sticky-col">
            <div className="sidebar-card">
              <div className="products-filters-title">Notification tips</div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 6,
                  lineHeight: 1.5,
                }}
              >
                In future we can let users fine-tune which notifications they
                receive – for example only job updates, only entanglement
                requests, or only organization activity.
              </p>

              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 10,
                  background:
                    "radial-gradient(circle at top left, rgba(56,189,248,0.16), rgba(15,23,42,1))",
                  fontSize: 12,
                }}
              >
                For now, notifications are a simple feed of actions related to
                your profile, jobs, and organizations you follow.
              </div>
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
