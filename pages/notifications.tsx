// pages/notifications.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
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
  user_id: string; // requester
  target_user_id: string; // recipient
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
  requester_id: string; // who sent the request
  message: string;
  created_at: string | null;
  otherProfile: MiniProfile | null;
};

type FeedItem =
  | {
      kind: "notif";
      created_at: string | null;
      notification: Notification;
    }
  | {
      kind: "entangled";
      created_at: string | null;
      connection_id: string;
      otherProfile: MiniProfile | null;
      message: string;
    };

type NotificationsCtx = {};

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
          In future we can let users fine-tune which notifications they receive –
          for example only job updates, only entanglement requests, or only
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
          For now, this page focuses on entanglement requests and the latest
          notifications feed.
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
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entanglementRequests, setEntanglementRequests] = useState<
    EntanglementItem[]
  >([]);

  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [otherNotifications, setOtherNotifications] = useState<Notification[]>(
    []
  );

  const [markingAll, setMarkingAll] = useState(false);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  const requestsRowRef = useRef<HTMLDivElement | null>(null);

  const formatCreated = (created_at: string | null) => {
    if (!created_at) return "";
    const t = Date.parse(created_at);
    if (Number.isNaN(t)) return "";
    return new Date(t).toLocaleString();
  };

  const safeTime = (created_at: string | null) => {
    const t = created_at ? Date.parse(created_at) : NaN;
    return Number.isNaN(t) ? 0 : t;
  };

  // Prefer the "XXX accepted..." message over the generic one
  const isGenericAcceptedNotif = (n: Notification) => {
    const title = (n.title || "").toLowerCase();
    const msg = (n.message || "").toLowerCase();
    return (
      title.includes("entanglement accepted") &&
      (msg.includes("your entanglement request was accepted") ||
        msg.startsWith("your entanglement request"))
    );
  };

  const isNamedAcceptedNotif = (n: Notification) => {
    const title = (n.title || "").toLowerCase();
    const msg = (n.message || "").toLowerCase();
    return (
      title.includes("entanglement accepted") &&
      msg.includes(" accepted your entanglement request")
    );
  };

  const dedupeNotifications = (rows: Notification[]) => {
    // Key: title + link_url (so accept for a person groups cleanly)
    const bestByKey: Record<string, Notification> = {};

    for (let i = 0; i < rows.length; i++) {
      const n = rows[i];
      const key = `${n.title || ""}__${n.link_url || ""}__${n.type || ""}`;

      const cur = bestByKey[key];
      if (!cur) {
        bestByKey[key] = n;
        continue;
      }

      const nTime = safeTime(n.created_at);
      const curTime = safeTime(cur.created_at);

      // Prefer named accepted over generic accepted
      const nNamed = isNamedAcceptedNotif(n);
      const curNamed = isNamedAcceptedNotif(cur);
      const nGeneric = isGenericAcceptedNotif(n);
      const curGeneric = isGenericAcceptedNotif(cur);

      if (nNamed && curGeneric) {
        bestByKey[key] = n;
        continue;
      }
      if (curNamed && nGeneric) {
        continue;
      }

      // Otherwise keep newest
      if (nTime >= curTime) bestByKey[key] = n;
    }

    return Object.values(bestByKey).sort(
      (a, b) => safeTime(b.created_at) - safeTime(a.created_at)
    );
  };

  useEffect(() => {
    const loadAll = async () => {
      if (!user) {
        setEntanglementRequests([]);
        setOtherNotifications([]);
        setFeed([]);
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

        // 2) Accepted connections (YOU in the pair) — used for feed "You are now entangled..."
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

        const reqItems: EntanglementItem[] = pending.map((c) => {
          const other = profileMap.get(c.user_id) || null; // requester
          const name = other?.full_name || "Quantum member";
          return {
            id: c.id,
            requester_id: c.user_id,
            message: `${name} wants to entangle with you`,
            created_at: c.created_at,
            otherProfile: other,
          };
        });
        setEntanglementRequests(reqItems);

        // 4) Notifications table
        let notifRowsSafe: Notification[] = [];
        try {
          const { data: notifRows, error: notifErr } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (!notifErr && notifRows) {
            notifRowsSafe = dedupeNotifications(notifRows as Notification[]);
            setOtherNotifications(notifRowsSafe);
          } else {
            setOtherNotifications([]);
            if (notifErr) console.warn("notifications-table error:", notifErr);
          }
        } catch (innerErr) {
          console.warn("notifications-table error:", innerErr);
          setOtherNotifications([]);
        }

        // 5) Build unified feed: notif rows + accepted connections
        const acceptedFeed: FeedItem[] = accepted.map((c) => {
          const otherId = c.user_id === user.id ? c.target_user_id : c.user_id;
          const other = profileMap.get(otherId) || null;
          const name = other?.full_name || "Quantum member";
          return {
            kind: "entangled",
            created_at: c.created_at,
            connection_id: c.id,
            otherProfile: other,
            message: `You are now entangled with ${name}`,
          };
        });

        const notifFeed: FeedItem[] = (notifRowsSafe || []).map((n) => ({
          kind: "notif",
          created_at: n.created_at,
          notification: n,
        }));

        const merged = [...notifFeed, ...acceptedFeed].sort(
          (a, b) => safeTime(b.created_at) - safeTime(a.created_at)
        );

        setFeed(merged);
      } catch (err) {
        console.error("Error loading notifications view", err);
        setError("Could not load notifications.");
        setEntanglementRequests([]);
        setOtherNotifications([]);
        setFeed([]);
      }

      setLoading(false);
    };

    loadAll();
  }, [user]);

  // ✅ unread should match what you SHOW
  const unreadNotifShownCount = feed.reduce((acc, it) => {
    if (it.kind !== "notif") return acc;
    return acc + (!it.notification.is_read ? 1 : 0);
  }, 0);

  const unreadCount = (entanglementRequests?.length || 0) + unreadNotifShownCount;

  const handleMarkAllRead = async () => {
    if (!user) return;

    const unreadNotifIds = feed
      .filter((it) => it.kind === "notif" && !it.notification.is_read)
      .map((it) => (it as any).notification.id as string);

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

        setFeed((prev) =>
          prev.map((it) => {
            if (it.kind !== "notif") return it;
            if (unreadNotifIds.includes(it.notification.id)) {
              return {
                ...it,
                notification: { ...it.notification, is_read: true },
              };
            }
            return it;
          })
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
        setFeed((prev) =>
          prev.map((it) => {
            if (it.kind !== "notif") return it;
            if (it.notification.id === notification.id) {
              return {
                ...it,
                notification: { ...it.notification, is_read: true },
              };
            }
            return it;
          })
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
          return;
        }

        // ✅ IMPORTANT: do NOT insert notification here.
        // DB trigger handles notifying the requester.

        setEntanglementRequests((prev) =>
          prev.filter((req) => req.id !== item.id)
        );

        const name = item.otherProfile?.full_name || "Quantum member";
        const newFeedItem: FeedItem = {
          kind: "entangled",
          created_at: new Date().toISOString(),
          connection_id: item.id,
          otherProfile: item.otherProfile,
          message: `You are now entangled with ${name}`,
        };

        setFeed((prev) => [newFeedItem, ...prev]);
      } else {
        // decline: no notify (and your DB doesn’t allow "declined" anyway)
        const { error } = await supabase
          .from("connections")
          .delete()
          .eq("id", item.id)
          .eq("target_user_id", user.id);

        if (error) console.error("Decline(delete) entanglement error", error);

        setEntanglementRequests((prev) =>
          prev.filter((req) => req.id !== item.id)
        );
      }
    } finally {
      setActingOnId(null);
    }
  };

  const totalItems = entanglementRequests.length + feed.length;

  const scrollRequests = (direction: "left" | "right") => {
    const node = requestsRowRef.current;
    if (!node) return;
    const delta = direction === "left" ? -320 : 320;
    node.scrollBy({ left: delta, behavior: "smooth" });
  };

  const pillBtnStyle: React.CSSProperties = {
    fontSize: 13,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.45)",
    background: "rgba(15,23,42,0.65)",
    color: "rgba(226,232,240,0.95)",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <section className="section">
      <div className="section-header">
        <div>
          <div
            className="section-title"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            Notifications
            {!loading && !error && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                  fontSize: 12,
                  padding: "3px 9px",
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
            Latest notifications appear at the top.
          </div>
        </div>

        {totalItems > 0 && unreadNotifShownCount > 0 && (
          <button
            type="button"
            style={pillBtnStyle}
            disabled={markingAll}
            onClick={handleMarkAllRead}
          >
            {markingAll ? "Marking…" : "Mark all as read"}
          </button>
        )}
      </div>

      {loading && <div className="products-status">Loading notifications…</div>}

      {error && !loading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {error}
        </div>
      )}

      {!loading && !error && totalItems === 0 && (
        <div className="products-empty">
          No notifications yet. As you entangle with people and interact with the
          platform, updates will appear here.
        </div>
      )}

      {!loading && !error && totalItems > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {entanglementRequests.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(148,163,184,0.9)",
                  marginBottom: 8,
                }}
              >
                Entanglement requests
              </div>

              <div style={{ position: "relative", paddingBottom: 4 }}>
                {entanglementRequests.length > 2 && (
                  <>
                    <button
                      type="button"
                      onClick={() => scrollRequests("left")}
                      style={{
                        position: "absolute",
                        left: -6,
                        top: "50%",
                        transform: "translateY(-50%)",
                        borderRadius: "999px",
                        border: "1px solid rgba(148,163,184,0.6)",
                        background: "rgba(15,23,42,0.95)",
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        cursor: "pointer",
                        zIndex: 2,
                      }}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollRequests("right")}
                      style={{
                        position: "absolute",
                        right: -6,
                        top: "50%",
                        transform: "translateY(-50%)",
                        borderRadius: "999px",
                        border: "1px solid rgba(148,163,184,0.6)",
                        background: "rgba(15,23,42,0.95)",
                        width: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        cursor: "pointer",
                        zIndex: 2,
                      }}
                    >
                      ›
                    </button>
                  </>
                )}

                <div
                  ref={requestsRowRef}
                  style={{
                    display: "flex",
                    gap: 12,
                    overflowX: "auto",
                    paddingBottom: 4,
                    scrollbarWidth: "none",
                  }}
                >
                  {entanglementRequests.map((item) => {
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
                        key={item.id}
                        className="card"
                        style={{
                          minWidth: 320,
                          maxWidth: 360,
                          padding: 14,
                          borderRadius: 14,
                          border: "1px solid rgba(56,189,248,0.8)",
                          background:
                            "radial-gradient(circle at top left, rgba(34,211,238,0.18), rgba(15,23,42,1))",
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: 12,
                            alignItems: "center",
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: "999px",
                              overflow: "hidden",
                              border: "1px solid rgba(148,163,184,0.6)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background:
                                "linear-gradient(135deg,#3bc7f3,#8468ff)",
                              color: "#fff",
                              fontWeight: 600,
                              fontSize: 18,
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
                            <div
                              className="card-title"
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {name}
                            </div>
                            <div
                              className="card-meta"
                              style={{ fontSize: 12, lineHeight: 1.3 }}
                            >
                              Quantum5ocial member
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--text-muted)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 3,
                            marginBottom: 8,
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
                          <div
                            style={{
                              marginTop: 4,
                              fontSize: 11,
                              color: "rgba(148,163,184,0.9)",
                            }}
                          >
                            {formatCreated(item.created_at)}
                          </div>
                        </div>

                        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            disabled={actingOnId === item.id}
                            onClick={() => handleRespondRequest(item, "accept")}
                            style={{
                              flex: 1,
                              padding: "7px 0",
                              borderRadius: 10,
                              border: "none",
                              background:
                                "linear-gradient(90deg,#22c55e,#16a34a)",
                              color: "#0f172a",
                              fontSize: 12,
                              fontWeight: 700,
                              cursor:
                                actingOnId === item.id ? "default" : "pointer",
                              opacity: actingOnId === item.id ? 0.7 : 1,
                            }}
                          >
                            {actingOnId === item.id
                              ? "Accepting…"
                              : "Accept request"}
                          </button>

                          <button
                            type="button"
                            disabled={actingOnId === item.id}
                            onClick={() => handleRespondRequest(item, "decline")}
                            style={{
                              flex: 1,
                              padding: "7px 0",
                              borderRadius: 10,
                              border: "1px solid rgba(148,163,184,0.7)",
                              background: "transparent",
                              color: "rgba(248,250,252,0.9)",
                              fontSize: 12,
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
                  })}
                </div>
              </div>
            </div>
          )}

          {feed.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(148,163,184,0.9)",
                  marginBottom: 8,
                }}
              >
                Latest
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {feed.map((item) => {
                  if (item.kind === "notif") {
                    const n = item.notification;
                    const read = !!n.is_read;

                    return (
                      <div
                        key={`notif-${n.id}`}
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
                        onClick={() => n.link_url && handleOpenNotification(n)}
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
                            <div style={{ fontSize: 14, fontWeight: 800 }}>
                              {n.title || "Notification"}
                            </div>
                            {n.message && (
                              <div
                                style={{
                                  marginTop: 4,
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
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatCreated(n.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  const other = item.otherProfile;
                  const name = other?.full_name || "Quantum member";
                  const avatarUrl = other?.avatar_url || null;

                  return (
                    <div
                      key={`ent-${item.connection_id}-${item.created_at || ""}`}
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
                              border: "1px solid rgba(148,163,184,0.6)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                              color: "#fff",
                              fontWeight: 700,
                              fontSize: 14,
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
                                }}
                              />
                            ) : (
                              name.charAt(0).toUpperCase()
                            )}
                          </div>

                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {other?.id ? (
                              <>
                                You are now entangled with{" "}
                                <Link
                                  href={`/profile/${other.id}`}
                                  style={{
                                    color: "#7dd3fc",
                                    textDecoration: "none",
                                    fontWeight: 900,
                                  }}
                                >
                                  {name}
                                </Link>
                              </>
                            ) : (
                              item.message
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
                })}
              </div>
            </div>
          )}
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
      <div style={{ paddingRight: 16 }}>
        <NotificationsMiddle />
      </div>

      <div
        style={{
          background: "rgba(148,163,184,0.35)",
          width: 1,
          alignSelf: "stretch",
        }}
      />

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
