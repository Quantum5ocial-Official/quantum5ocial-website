// pages/notifications.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

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
  updated_at?: string | null;
};

type MiniProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  affiliation?: string | null;
  short_bio?: string | null;
};

type EntanglementItem = {
  id: string; // connection id
  message: string;
  created_at: string | null;
  otherProfile: MiniProfile | null;
};

type FeedItem =
  | {
      kind: "entanglement_request";
      id: string; // connection id
      created_at: string | null;
      message: string;
      otherProfile: MiniProfile | null;
    }
  | {
      kind: "entanglement_update";
      id: string; // connection id
      created_at: string | null;
      message: string;
      otherProfile: MiniProfile | null;
    }
  | {
      kind: "notification";
      id: string; // notification id
      created_at: string | null;
      type: string | null;
      title: string | null;
      message: string | null;
      link_url: string | null;
      is_read: boolean;
    };

type NotificationsCtx = {
  // reserved for future
};

const NotificationsContext = createContext<NotificationsCtx | null>(null);

function NotificationsProvider({ children }: { children: ReactNode }) {
  const value: NotificationsCtx = {};
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

function useNotificationsCtx() {
  const ctx = useContext(NotificationsContext);
  if (!ctx)
    throw new Error(
      "useNotificationsCtx must be used inside <NotificationsProvider />"
    );
  return ctx;
}

function NotificationsRightSidebar() {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100%" }}>
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
          In future we can let users fine-tune which notifications they receive
          – for example only job updates, only entanglement requests, or only
          organization activity.
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
          For now, this page shows a single feed of your latest notifications.
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
    </div>
  );
}

function NotificationsMiddle() {
  // const ctx = useNotificationsCtx();
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

  const sortByCreatedDesc = (a: { created_at: string | null }, b: { created_at: string | null }) => {
    const ta = a.created_at ? Date.parse(a.created_at) : 0;
    const tb = b.created_at ? Date.parse(b.created_at) : 0;
    return tb - ta;
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
            .select(
              "id, full_name, avatar_url, highest_education, affiliation, short_bio"
            )
            .in("id", Array.from(allIds));

          if (profErr) throw profErr;

          const profiles = (profRows || []) as MiniProfile[];
          profileMap = new Map(
            profiles.map((p) => [p.id, p] as [string, MiniProfile])
          );
        }

        // Pending requests
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

        // Accepted updates
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

  // ===== COUNTS =====
  const unreadOtherCount = otherNotifications.filter((n) => !n.is_read).length;
  const unreadCount = (entanglementRequests?.length || 0) + unreadOtherCount;

  // ===== FEED (single, latest-first) =====
  const feed: FeedItem[] = useMemo(() => {
    const req: FeedItem[] = entanglementRequests.map((x) => ({
      kind: "entanglement_request",
      id: x.id,
      created_at: x.created_at,
      message: x.message,
      otherProfile: x.otherProfile,
    }));

    const upd: FeedItem[] = entangledUpdates.map((x) => ({
      kind: "entanglement_update",
      id: x.id,
      created_at: x.created_at,
      message: x.message,
      otherProfile: x.otherProfile,
    }));

    const oth: FeedItem[] = otherNotifications.map((n) => ({
      kind: "notification",
      id: n.id,
      created_at: n.created_at,
      type: n.type ?? null,
      title: n.title ?? null,
      message: n.message ?? null,
      link_url: n.link_url ?? null,
      is_read: !!n.is_read,
    }));

    return [...req, ...upd, ...oth].sort(sortByCreatedDesc);
  }, [entanglementRequests, entangledUpdates, otherNotifications]);

  // ===== HANDLERS =====
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

  const handleOpenNotification = async (notificationId: string) => {
    const n = otherNotifications.find((x) => x.id === notificationId);
    if (!n || !n.link_url) return;

    if (!n.is_read) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", n.id);

      if (!error) {
        setOtherNotifications((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
        );
      }
    }

    router.push(n.link_url);
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
          setEntanglementRequests((prev) =>
            prev.filter((req) => req.id !== item.id)
          );

          const name = item.otherProfile?.full_name || "Quantum member";
          const acceptedItem: EntanglementItem = {
            ...item,
            message: `You are now entangled with ${name}`,
            created_at: new Date().toISOString(),
          };
          setEntangledUpdates((prev) => [acceptedItem, ...prev]);
        }
      } else {
        const { error } = await supabase
          .from("connections")
          .update({ status: "declined" })
          .eq("id", item.id);

        if (error) {
          console.error(
            "Decline entanglement error, falling back to delete",
            error
          );

          const { error: deleteError } = await supabase
            .from("connections")
            .delete()
            .eq("id", item.id);
          if (deleteError) {
            console.error("Error deleting connection on decline", deleteError);
          }
        }

        setEntanglementRequests((prev) =>
          prev.filter((req) => req.id !== item.id)
        );
      }
    } finally {
      setActingOnId(null);
    }
  };

  return (
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
            style={{ maxWidth: 520, lineHeight: 1.45 }}
          >
            Latest activity first.
          </div>
        </div>

        {feed.length > 0 && unreadOtherCount > 0 && (
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
      {loading && <div className="products-status">Loading notifications…</div>}

      {error && !loading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {error}
        </div>
      )}

      {!loading && !error && feed.length === 0 && (
        <div className="products-empty">
          No notifications yet. As you entangle with people and interact with
          QnA, jobs, and organizations, updates will appear here.
        </div>
      )}

      {/* FEED */}
      {!loading && !error && feed.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {feed.map((item) => {
            if (item.kind === "entanglement_request") {
              const other = item.otherProfile;
              const name = other?.full_name || "Quantum member";
              const avatarUrl = other?.avatar_url || null;
              const education = other?.highest_education || "—";
              const affiliation = other?.affiliation || "—";
              const short_bio =
                other?.short_bio ||
                "Quantum5ocial community member exploring the quantum ecosystem.";

              return (
                <div
                  key={`req:${item.id}`}
                  className="card"
                  style={{
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid rgba(56,189,248,0.8)",
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
                    <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
                      <div
                        style={{
                          width: 42,
                          height: 42,
                          borderRadius: "999px",
                          overflow: "hidden",
                          border: "1px solid rgba(148,163,184,0.6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            "linear-gradient(135deg,#3bc7f3,#8468ff)",
                          color: "#fff",
                          fontWeight: 700,
                          fontSize: 16,
                          flexShrink: 0,
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
                              display: "block",
                            }}
                          />
                        ) : (
                          name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: "#7dd3fc" }}>
                          Entanglement request
                        </div>

                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 800,
                            marginTop: 2,
                            lineHeight: 1.3,
                          }}
                        >
                          {name} wants to entangle with you
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 12,
                            color: "var(--text-muted)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                          }}
                        >
                          <div>
                            <span style={{ opacity: 0.7 }}>Education: </span>
                            <span>{education}</span>
                          </div>
                          <div>
                            <span style={{ opacity: 0.7 }}>Affiliation: </span>
                            <span>{affiliation}</span>
                          </div>
                          <div style={{ marginTop: 4 }}>{short_bio}</div>
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
                      disabled={actingOnId === item.id}
                      onClick={() =>
                        handleRespondRequest(
                          {
                            id: item.id,
                            message: item.message,
                            created_at: item.created_at,
                            otherProfile: item.otherProfile,
                          },
                          "accept"
                        )
                      }
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "none",
                        background: "linear-gradient(90deg,#22c55e,#16a34a)",
                        color: "#0f172a",
                        fontSize: 12,
                        fontWeight: 800,
                        cursor:
                          actingOnId === item.id ? "default" : "pointer",
                        opacity: actingOnId === item.id ? 0.7 : 1,
                      }}
                    >
                      {actingOnId === item.id ? "Accepting…" : "Accept"}
                    </button>

                    <button
                      type="button"
                      disabled={actingOnId === item.id}
                      onClick={() =>
                        handleRespondRequest(
                          {
                            id: item.id,
                            message: item.message,
                            created_at: item.created_at,
                            otherProfile: item.otherProfile,
                          },
                          "decline"
                        )
                      }
                      style={{
                        padding: "8px 12px",
                        borderRadius: 10,
                        border: "1px solid rgba(148,163,184,0.7)",
                        background: "transparent",
                        color: "rgba(248,250,252,0.9)",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor:
                          actingOnId === item.id ? "default" : "pointer",
                        opacity: actingOnId === item.id ? 0.7 : 1,
                      }}
                    >
                      {actingOnId === item.id ? "Declining…" : "Decline"}
                    </button>
                  </div>
                </div>
              );
            }

            if (item.kind === "entanglement_update") {
              const other = item.otherProfile;
              const name = other?.full_name || "Quantum member";
              const avatarUrl = other?.avatar_url || null;

              return (
                <div
                  key={`upd:${item.id}`}
                  className="card"
                  style={{
                    padding: 12,
                    borderRadius: 12,
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
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "999px",
                          overflow: "hidden",
                          border: "1px solid rgba(148,163,184,0.6)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            "linear-gradient(135deg,#3bc7f3,#8468ff)",
                          color: "#fff",
                          fontWeight: 700,
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

                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        You are now entangled with{" "}
                        {other?.id ? (
                          <Link
                            href={`/profile/${other.id}`}
                            style={{
                              color: "#7dd3fc",
                              textDecoration: "none",
                              fontWeight: 800,
                            }}
                          >
                            {name}
                          </Link>
                        ) : (
                          <span style={{ fontWeight: 800 }}>{name}</span>
                        )}
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
            }

            // generic notification row
            const read = item.is_read;

            return (
              <div
                key={`n:${item.id}`}
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
                  cursor: item.link_url ? "pointer" : "default",
                }}
                onClick={() => item.link_url && handleOpenNotification(item.id)}
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
                      {item.type || "Update"}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 3 }}>
                      {item.title || "Notification"}
                    </div>
                    {item.message && (
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.message}
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "rgba(148,163,184,0.9)",
                      textAlign: "right",
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
      )}
    </section>
  );
}

function NotificationsTwoColumnShell() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 1px 280px",
        alignItems: "stretch",
        minHeight: "100vh",
      }}
    >
      {/* MIDDLE */}
      <div style={{ paddingRight: 16 }}>
        <NotificationsMiddle />
      </div>

      {/* DIVIDER */}
      <div
        style={{
          background: "rgba(148,163,184,0.35)",
          width: 1,
          alignSelf: "stretch",
        }}
      />

      {/* RIGHT */}
      <div
        style={{
          paddingLeft: 16,
          position: "sticky",
          top: 16,
          alignSelf: "start",
        }}
      >
        <NotificationsRightSidebar />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  return <NotificationsTwoColumnShell />;
}

(NotificationsPage as any).layoutProps = {
  variant: "two-left",
  right: null,
  wrap: (children: React.ReactNode) => (
    <NotificationsProvider>{children}</NotificationsProvider>
  ),
  mobileMain: <NotificationsMiddle />,
};
