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

type ConnectionRow = {
  id: string;
  user_id: string;
  target_user_id: string;
  status: string;
  created_at: string | null;
};

type MiniProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type EntanglementItem = {
  id: string;
  message: string;
  created_at: string | null;
  otherProfile: MiniProfile | null;
};

export default function NotificationsPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entanglementRequests, setEntanglementRequests] = useState<
    EntanglementItem[]
  >([]);
  const [entangledUpdates, setEntangledUpdates] = useState<EntanglementItem[]>(
    []
  );
  const [otherNotifications, setOtherNotifications] = useState<Notification[]>(
    []
  );

  const [markingAll, setMarkingAll] = useState(false);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const formatCreated = (created_at: string | null) => {
    if (!created_at) return "";
    const t = Date.parse(created_at);
    if (Number.isNaN(t)) return "";
    return new Date(t).toLocaleString();
  };

  // ===== LOAD DATA =====
  useEffect(() => {
    const loadAll = async () => {
      if (!user) {
        setEntanglementRequests([]);
        setEntangledUpdates([]);
        setOtherNotifications([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1) Pending entanglement requests (YOU are target)
        const { data: pendingRows, error: pendingErr } = await supabase
          .from("connections")
          .select("id, user_id, target_user_id, status, created_at")
          .eq("status", "pending")
          .eq("target_user_id", user.id);

        if (pendingErr) throw pendingErr;
        const pending = (pendingRows || []) as ConnectionRow[];

        // 2) Accepted entangled states (YOU in the pair)
        const { data: acceptedRows, error: acceptedErr } = await supabase
          .from("connections")
          .select("id, user_id, target_user_id, status, created_at")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`)
          .order("created_at", { ascending: false });

        if (acceptedErr) throw acceptedErr;
        const accepted = (acceptedRows || []) as ConnectionRow[];

        // 3) Load profiles for all other users
        const allIds = new Set<string>();
        pending.forEach((c) => allIds.add(c.user_id));
        accepted.forEach((c) => {
          allIds.add(c.user_id);
          allIds.add(c.target_user_id);
        });

        let profileMap = new Map<string, MiniProfile>();

        if (allIds.size > 0) {
          const { data: profRows, error: profErr } = await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", Array.from(allIds));

          if (profErr) throw profErr;

          const profiles = (profRows || []) as MiniProfile[];
          profileMap = new Map(
            profiles.map((p) => [p.id, p] as [string, MiniProfile])
          );
        }

        // Build entanglement requests block
        const reqItems: EntanglementItem[] = pending.map((c) => {
          const other = profileMap.get(c.user_id) || null; // requester
          const name = other?.full_name || "Quantum member";
          return {
            id: c.id,
            message: `${name} wants to entangle with you`,
            created_at: c.created_at,
            otherProfile: other,
          };
        });

        // Build accepted / past notifications block
        const updItems: EntanglementItem[] = accepted.map((c) => {
          const otherId = c.user_id === user.id ? c.target_user_id : c.user_id;
          const other = profileMap.get(otherId) || null;
          const name = other?.full_name || "Quantum member";
          return {
            id: c.id,
            message: `You are now entangled with ${name}`,
            created_at: c.created_at,
            otherProfile: other,
          };
        });

        setEntanglementRequests(reqItems);
        setEntangledUpdates(updItems);

        // 4) Optional extra notifications table
        try {
          const { data: notifRows, error: notifErr } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (!notifErr && notifRows) {
            setOtherNotifications(notifRows as Notification[]);
          } else {
            setOtherNotifications([]);
            if (notifErr) console.warn("notifications-table error:", notifErr);
          }
        } catch (innerErr) {
          console.warn("notifications-table error:", innerErr);
          setOtherNotifications([]);
        }
      } catch (err) {
        console.error("Error loading notifications view", err);
        setError("Could not load notifications.");
        setEntanglementRequests([]);
        setEntangledUpdates([]);
        setOtherNotifications([]);
      }

      setLoading(false);
    };

    loadAll();
  }, [user]);

  // ===== HANDLERS =====

  const unreadCount = useMemo(
    () =>
      (entanglementRequests?.length || 0) +
      otherNotifications.filter((n) => !n.is_read).length,
    [entanglementRequests, otherNotifications]
  );

  const handleMarkAllRead = async () => {
    if (!user) return;

    const unreadNotifIds = otherNotifications
      .filter((n) => !n.is_read)
      .map((n) => n.id);

    if (unreadNotifIds.length === 0) return;

    setMarkingAll(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .in("id", unreadNotifIds);

      if (error) {
        console.error("Error marking notifications as read", error);
      } else {
        setOtherNotifications((prev) =>
          prev.map((n) =>
            unreadNotifIds.includes(n.id) ? { ...n, is_read: true } : n
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
        setOtherNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
      }
    }

    router.push(notification.link_url);
  };

  const handleRespondRequest = async (
    item: EntanglementItem,
    action: "accept" | "decline"
  ) => {
    if (!user) return;
    setActingOnId(item.id);

    try {
      if (action === "accept") {
        const { error } = await supabase
          .from("connections")
          .update({ status: "accepted" })
          .eq("id", item.id)
          .eq("target_user_id", user.id);

        if (error) {
          console.error("Accept entanglement error", error);
        } else {
          // Remove from requests
          setEntanglementRequests((prev) =>
            prev.filter((req) => req.id !== item.id)
          );

          // Add to past notifications (at the top)
          const name =
            item.otherProfile?.full_name || "Quantum member";
          const acceptedItem: EntanglementItem = {
            ...item,
            message: `You are now entangled with ${name}`,
          };
          setEntangledUpdates((prev) => [acceptedItem, ...prev]);
        }
      } else {
        // decline
        const { error } = await supabase
          .from("connections")
          .update({ status: "declined" })
          .eq("id", item.id)
          .eq("target_user_id", user.id);

        if (error) {
          console.error("Decline entanglement error", error);
        } else {
          setEntanglementRequests((prev) =>
            prev.filter((req) => req.id !== item.id)
          );
        }
      }
    } finally {
      setActingOnId(null);
    }
  };

  const totalItems =
    entanglementRequests.length +
    entangledUpdates.length +
    otherNotifications.length;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="layout-3col">
          {/* LEFT SIDEBAR */}
          <LeftSidebar />

          {/* MIDDLE COLUMN */}
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
                    Stay up to date with entanglement requests, past
                    entanglement notifications, job updates, and activity across
                    the Quantum5ocial ecosystem.
                  </div>
                </div>

                {totalItems > 0 && unreadCount > 0 && (
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

              {/* Status / empty */}
              {loading && (
                <div className="products-status">Loading notifications…</div>
              )}

              {error && !loading && (
                <div className="products-status" style={{ color: "#f87171" }}>
                  {error}
                </div>
              )}

              {!loading && !error && totalItems === 0 && (
                <div className="products-empty">
                  No notifications yet. As you entangle with people and interact
                  with jobs and organizations, updates will appear here.
                </div>
              )}

              {!loading && !error && totalItems > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    marginTop: 8,
                  }}
                >
                  {/* BLOCK 1 – Entanglement requests */}
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
                        {entanglementRequests.map((item) => {
                          const other = item.otherProfile;
                          const name =
                            other?.full_name || "Quantum member";
                          const avatarUrl = other?.avatar_url || null;

                          return (
                            <div
                              key={item.id}
                              className="card"
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: "1px solid rgba(56,189,248,0.8)",
                                background:
                                  "radial-gradient(circle at top left, rgba(34,211,238,0.18), rgba(15,23,42,1))",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 12,
                                }}
                              >
                                {/* Left: profile */}
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: "999px",
                                      overflow: "hidden",
                                      border:
                                        "1px solid rgba(148,163,184,0.6)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background:
                                        "linear-gradient(135deg,#3bc7f3,#8468ff)",
                                      color: "#fff",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={name}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                      />
                                    ) : (
                                      name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div
                                      style={{
                                        fontSize: 14,
                                        fontWeight: 500,
                                      }}
                                    >
                                      {name}
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 12,
                                        color: "var(--text-muted)",
                                      }}
                                    >
                                      wants to entangle with you
                                    </div>
                                  </div>
                                </div>

                                {/* Right: date + buttons */}
                                <div
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "flex-end",
                                    gap: 6,
                                  }}
                                >
                                  <div
                                    style={{
                                      fontSize: 11,
                                      color: "rgba(148,163,184,0.9)",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {formatCreated(item.created_at)}
                                  </div>
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 6,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      className="nav-cta"
                                      style={{
                                        padding: "4px 10px",
                                        fontSize: 12,
                                        cursor: "pointer",
                                      }}
                                      disabled={actingOnId === item.id}
                                      onClick={() =>
                                        handleRespondRequest(item, "accept")
                                      }
                                    >
                                      {actingOnId === item.id
                                        ? "Accepting…"
                                        : "Accept"}
                                    </button>
                                    <button
                                      type="button"
                                      className="nav-ghost-btn"
                                      style={{
                                        padding: "4px 10px",
                                        fontSize: 12,
                                        cursor: "pointer",
                                      }}
                                      disabled={actingOnId === item.id}
                                      onClick={() =>
                                        handleRespondRequest(item, "decline")
                                      }
                                    >
                                      {actingOnId === item.id
                                        ? "Declining…"
                                        : "Decline"}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* BLOCK 2 – Past notifications (accepted entanglements) */}
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
                        Past notifications
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 8,
                        }}
                      >
                        {entangledUpdates.map((item) => {
                          const other = item.otherProfile;
                          const name =
                            other?.full_name || "Quantum member";
                          const avatarUrl = other?.avatar_url || null;

                          return (
                            <div
                              key={item.id}
                              className="card"
                              style={{
                                padding: 10,
                                borderRadius: 10,
                                border: "1px solid rgba(30,64,175,0.4)",
                                background: "rgba(15,23,42,0.9)",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: 12,
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
                                      border:
                                        "1px solid rgba(148,163,184,0.6)",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      background:
                                        "linear-gradient(135deg,#3bc7f3,#8468ff)",
                                      color: "#fff",
                                      fontWeight: 600,
                                      fontSize: 14,
                                    }}
                                  >
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={name}
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "cover",
                                        }}
                                      />
                                    ) : (
                                      name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <div
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                      }}
                                    >
                                      {item.message}
                                    </div>
                                  </div>
                                </div>
                                <div
                                  style={{
                                    fontSize: 11,
                                    color: "rgba(148,163,184,0.9)",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {formatCreated(item.created_at)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* BLOCK 3 – Other activity (optional, from notifications table) */}
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

          {/* RIGHT COLUMN – tips */}
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
                For now, this page focuses on entanglement requests, past
                entanglement notifications, and any additional activity routed
                through the notifications system.
              </div>
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
