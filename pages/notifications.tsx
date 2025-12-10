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

type RequestProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education: string | null;
  affiliation: string | null;
  role: string | null;
  describes_you: string | null;
};

type IncomingRequest = {
  id: string; // connection id
  from_user_id: string;
  created_at: string | null;
  profile: RequestProfile | null;
};

export default function NotificationsPage() {
  const { user } = useSupabaseUser();
  const router = useRouter();

  // ==== NOTIFICATIONS STATE (for past notifications + unread badge) ====
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifLoading, setNotifLoading] = useState<boolean>(true);
  const [notifError, setNotifError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  // ==== INCOMING ENTANGLEMENT REQUESTS ====
  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [reqLoading, setReqLoading] = useState<boolean>(true);
  const [reqError, setReqError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null); // connection id currently being accepted/declined

  // ---------- Load notifications ----------
  useEffect(() => {
    const loadNotifications = async () => {
      if (!user) {
        setNotifications([]);
        setNotifLoading(false);
        return;
      }

      setNotifLoading(true);
      setNotifError(null);

      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading notifications", error);
        setNotifError("Could not load notifications.");
        setNotifications([]);
      } else {
        setNotifications((data || []) as Notification[]);
      }

      setNotifLoading(false);
    };

    loadNotifications();
  }, [user]);

  // ---------- Load incoming entanglement requests ----------
  useEffect(() => {
    const loadRequests = async () => {
      if (!user) {
        setRequests([]);
        setReqLoading(false);
        return;
      }

      setReqLoading(true);
      setReqError(null);

      // 1) pending connections where *you* are the target
      const { data: connRows, error: connErr } = await supabase
        .from("connections")
        .select("id, user_id, target_user_id, status, created_at")
        .eq("target_user_id", user.id)
        .eq("status", "pending");

      if (connErr) {
        console.error("Error loading entanglement requests", connErr);
        setReqError("Could not load entanglement requests.");
        setRequests([]);
        setReqLoading(false);
        return;
      }

      if (!connRows || connRows.length === 0) {
        setRequests([]);
        setReqLoading(false);
        return;
      }

      const fromIds = Array.from(new Set(connRows.map((c: any) => c.user_id)));

      // 2) fetch profiles of the request senders
      const { data: profRows, error: profErr } = await supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, highest_education, affiliation, role, describes_you"
        )
        .in("id", fromIds);

      if (profErr) {
        console.error("Error loading profiles for requests", profErr);
        // still show something (without profile info)
        const mappedFallback: IncomingRequest[] = (connRows || []).map(
          (c: any) => ({
            id: c.id,
            from_user_id: c.user_id,
            created_at: c.created_at || null,
            profile: null,
          })
        );
        setRequests(mappedFallback);
        setReqLoading(false);
        return;
      }

      const profMap = new Map<string, RequestProfile>();
      (profRows || []).forEach((p: any) => {
        profMap.set(p.id as string, p as RequestProfile);
      });

      const mapped: IncomingRequest[] = (connRows || []).map((c: any) => ({
        id: c.id,
        from_user_id: c.user_id,
        created_at: c.created_at || null,
        profile: profMap.get(c.user_id) || null,
      }));

      setRequests(mapped);
      setReqLoading(false);
    };

    loadRequests();
  }, [user]);

  // ---------- Derived data ----------
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.is_read).length,
    [notifications]
  );

  // everything that is NOT an entanglement-request type goes into "past notifications"
  const pastNotifications = useMemo(
    () =>
      notifications.filter(
        (n) =>
          !n.type ||
          (n.type && n.type.toLowerCase() !== "entanglement_request")
      ),
    [notifications]
  );

  const formatDateTime = (iso: string | null) => {
    if (!iso) return "";
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return "";
    return new Date(t).toLocaleString();
  };

  const primaryTextForNotification = (n: Notification) =>
    n.title || n.message || "Notification";

  const avatarInitialForNotification = (n: Notification) => {
    const text =
      n.title || n.message || "Q"; // fall back to "Q" for Quantum
    const words = text.trim().split(" ");
    const last = words[words.length - 1] || words[0];
    return last.charAt(0).toUpperCase();
  };

  // ---------- Handlers ----------
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

    // mark single notification as read
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

  const reloadNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setNotifications(data as Notification[]);
    }
  };

  const handleAcceptRequest = async (req: IncomingRequest) => {
    if (!user) return;
    setActionId(req.id);

    try {
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted" })
        .eq("id", req.id);

      if (error) {
        console.error("Error accepting entanglement request", error);
        return;
      }

      // remove from local list
      setRequests((prev) => prev.filter((r) => r.id !== req.id));

      // reload notifications so the "you are now entangled" item appears with correct time
      await reloadNotifications();
    } finally {
      setActionId(null);
    }
  };

  const handleDeclineRequest = async (req: IncomingRequest) => {
    if (!user) return;
    setActionId(req.id);

    try {
      // Delete the pending connection so the sender can send a fresh request later
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", req.id);

      if (error) {
        console.error("Error declining entanglement request", error);
        return;
      }

      setRequests((prev) => prev.filter((r) => r.id !== req.id));

      // Optionally reload notifications (in case backend creates a "declined" notification)
      await reloadNotifications();
    } finally {
      setActionId(null);
    }
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
                    {!notifLoading && !notifError && (
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

              {/* =================== ENTANGLEMENT REQUESTS =================== */}
              <div
                style={{
                  marginTop: 12,
                  marginBottom: 4,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(148,163,184,0.9)",
                }}
              >
                Entanglement requests
              </div>

              {reqError && (
                <div
                  className="products-status"
                  style={{ color: "#f87171", marginBottom: 4 }}
                >
                  {reqError}
                </div>
              )}

              {reqLoading ? (
                <div className="products-status">Loading requests…</div>
              ) : requests.length === 0 ? (
                <div
                  className="products-status"
                  style={{ fontSize: 12, opacity: 0.85 }}
                >
                  No pending entanglement requests.
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    marginBottom: 16,
                  }}
                >
                  {requests.map((req) => {
                    const p = req.profile;
                    const name = p?.full_name || "Quantum member";
                    const avatarLetter = name.charAt(0).toUpperCase();
                    const roleLine =
                      p?.role || p?.describes_you || "Quantum5ocial member";
                    const educationLine = p?.highest_education || "—";
                    const affiliationLine = p?.affiliation || "—";
                    const created = formatDateTime(req.created_at);

                    const loadingThis = actionId === req.id;

                    return (
                      <div
                        key={req.id}
                        className="card"
                        style={{
                          borderRadius: 16,
                          padding: 14,
                          border: "1px solid rgba(56,189,248,0.6)",
                          background:
                            "radial-gradient(circle at top left, rgba(34,211,238,0.18), rgba(15,23,42,1))",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 12,
                          }}
                        >
                          {/* Left: avatar + main info */}
                          <div style={{ display: "flex", gap: 12 }}>
                            <div
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: "999px",
                                overflow: "hidden",
                                border:
                                  "1px solid rgba(148,163,184,0.55)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background:
                                  "linear-gradient(135deg,#3bc7f3,#8468ff)",
                                color: "#0f172a",
                                fontWeight: 700,
                                fontSize: 20,
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
                                  }}
                                />
                              ) : (
                                avatarLetter
                              )}
                            </div>

                            <div>
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 8,
                                  marginBottom: 2,
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: 14,
                                    fontWeight: 600,
                                  }}
                                >
                                  {name}
                                </div>
                                <span
                                  style={{
                                    fontSize: 10,
                                    padding: "2px 8px",
                                    borderRadius: 999,
                                    border:
                                      "1px solid rgba(148,163,184,0.5)",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.08em",
                                    color: "rgba(248,250,252,0.9)",
                                  }}
                                >
                                  Member
                                </span>
                              </div>

                              <div
                                style={{
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                  marginBottom: 6,
                                }}
                              >
                                {roleLine}
                              </div>

                              <div
                                style={{
                                  fontSize: 11,
                                  color: "rgba(148,163,184,0.95)",
                                  marginBottom: 2,
                                }}
                              >
                                Education:{" "}
                                <span style={{ color: "#e5e7eb" }}>
                                  {educationLine}
                                </span>
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "rgba(148,163,184,0.95)",
                                }}
                              >
                                Affiliation:{" "}
                                <span style={{ color: "#e5e7eb" }}>
                                  {affiliationLine}
                                </span>
                              </div>

                              <div
                                style={{
                                  marginTop: 6,
                                  fontSize: 12,
                                  color: "var(--text-muted)",
                                }}
                              >
                                {name} wants to entangle with you.
                              </div>
                            </div>
                          </div>

                          {/* Right: timestamp */}
                          <div
                            style={{
                              textAlign: "right",
                              minWidth: 110,
                              fontSize: 11,
                              color: "rgba(148,163,184,0.9)",
                            }}
                          >
                            {created}
                          </div>
                        </div>

                        {/* Buttons */}
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            gap: 8,
                          }}
                        >
                          <button
                            type="button"
                            className="nav-cta"
                            style={{
                              flex: 0,
                              padding: "6px 14px",
                              fontSize: 13,
                              borderRadius: 999,
                              cursor: loadingThis ? "default" : "pointer",
                              opacity: loadingThis ? 0.7 : 1,
                              background:
                                "linear-gradient(135deg,#22c55e,#16a34a)",
                            }}
                            disabled={loadingThis}
                            onClick={() => handleAcceptRequest(req)}
                          >
                            {loadingThis ? "Processing…" : "Accept request"}
                          </button>

                          <button
                            type="button"
                            className="nav-ghost-btn"
                            style={{
                              padding: "6px 14px",
                              fontSize: 13,
                              borderRadius: 999,
                              cursor: loadingThis ? "default" : "pointer",
                              opacity: loadingThis ? 0.7 : 1,
                            }}
                            disabled={loadingThis}
                            onClick={() => handleDeclineRequest(req)}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* =================== PAST NOTIFICATIONS =================== */}
              <div
                style={{
                  marginTop: 8,
                  marginBottom: 4,
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "rgba(148,163,184,0.9)",
                }}
              >
                Past notifications
              </div>

              {notifError && (
                <div
                  className="products-status"
                  style={{ color: "#f87171" }}
                >
                  {notifError}
                </div>
              )}

              {!notifLoading && !notifError && pastNotifications.length === 0 && (
                <div className="products-empty">
                  No past notifications yet.
                </div>
              )}

              {!notifLoading && !notifError && pastNotifications.length > 0 && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  {pastNotifications.map((n) => {
                    const created = formatDateTime(n.created_at);
                    const avatarLetter = avatarInitialForNotification(n);
                    const primaryText = primaryTextForNotification(n);
                    const isUnread = !n.is_read;

                    return (
                      <div
                        key={n.id}
                        className="card"
                        style={{
                          padding: 10,
                          borderRadius: 12,
                          border: isUnread
                            ? "1px solid rgba(56,189,248,0.7)"
                            : "1px solid rgba(30,64,175,0.4)",
                          background: isUnread
                            ? "radial-gradient(circle at top left, rgba(34,211,238,0.15), rgba(15,23,42,1))"
                            : "rgba(15,23,42,0.9)",
                          cursor: n.link_url ? "pointer" : "default",
                        }}
                        onClick={() =>
                          n.link_url && handleOpenNotification(n)
                        }
                      >
                        <div
                          style={{
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
                                width: 30,
                                height: 30,
                                borderRadius: "999px",
                                border:
                                  "1px solid rgba(148,163,184,0.55)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                background:
                                  "linear-gradient(135deg,#3bc7f3,#6366f1)",
                                color: "#0f172a",
                                fontWeight: 700,
                                fontSize: 14,
                              }}
                            >
                              {avatarLetter}
                            </div>
                            <div
                              style={{
                                fontSize: 13,
                                color: "#e5e7eb",
                              }}
                            >
                              {primaryText}
                            </div>
                          </div>

                          <div
                            style={{
                              minWidth: 120,
                              textAlign: "right",
                              fontSize: 11,
                              color: "rgba(148,163,184,0.9)",
                            }}
                          >
                            {created}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
