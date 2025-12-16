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
  requester_id: string; // who sent the request (to notify on accept)
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

type NotificationsCtx = {
  // (Nothing shared yet — this is here so later you can add right-drawer state cleanly.)
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
  // (kept identical)
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
          For now, this page focuses on entanglement requests, past entanglement
          notifications, and any additional activity routed through the
          notifications system.
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
  // If you later want shared state, call useNotificationsCtx() here.
  // const ctx = useNotificationsCtx();
  const { user } = useSupabaseUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [entanglementRequests, setEntanglementRequests] = useState<
    EntanglementItem[]
  >([]);

  // unified feed: newest first (no categories)
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [otherNotifications, setOtherNotifications] = useState<Notification[]>(
    []
  );

  const [markingAll, setMarkingAll] = useState(false);
  const [actingOnId, setActingOnId] = useState<string | null>(null);

  // for horizontal scroll of request cards
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

  // ===== LOAD DATA =====
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

        // 2) Accepted entangled states (YOU in the pair) — for feed
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

        // Pending requests block (actionable)
        const reqItems: EntanglementItem[] = pending.map((c) => {
          const other = profileMap.get(c.user_id) || null; // requester
          const name = other?.full_name || "Quantum member";
          return {
            id: c.id,
            requester_id: c.user_id, // ✅
            message: `${name} wants to entangle with you`,
            created_at: c.created_at,
            otherProfile: other,
          };
        });

        setEntanglementRequests(reqItems);

        // 4) Notifications table (optional extra notifications)
        let notifRowsSafe: Notification[] = [];
        try {
          const { data: notifRows, error: notifErr } = await supabase
            .from("notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (!notifErr && notifRows) {
            notifRowsSafe = notifRows as Notification[];
            setOtherNotifications(notifRowsSafe);
          } else {
            setOtherNotifications([]);
            if (notifErr) console.warn("notifications-table error:", notifErr);
          }
        } catch (innerErr) {
          console.warn("notifications-table error:", innerErr);
          setOtherNotifications([]);
        }

        // 5) Build ONE unified feed (newest first), and de-dupe entanglement-accept duplicates
        // If two notifications exist for the same accept, keep only the best one.
        const notifFeedAll: FeedItem[] = (notifRowsSafe || []).map((n) => ({
          kind: "notif",
          created_at: n.created_at,
          notification: n,
        }));

        // Prefer the "X accepted your entanglement request" over generic variants
        const isEntAccept = (n: Notification) =>
          (n.type || "").toLowerCase() === "entanglement" &&
          (n.title || "").toLowerCase().includes("accepted");

        const acceptQuality = (n: Notification) => {
          const msg = (n.message || "").toLowerCase();
          // prefer messages that include "accepted your entanglement request"
          if (msg.includes("accepted your entanglement request")) return 3;
          // generic "your entanglement request was accepted"
          if (msg.includes("your entanglement request") && msg.includes("accepted"))
            return 2;
          // fallback
          return 1;
        };

        const bestAcceptByLink = new Map<string, Notification>();
        const acceptKeysToKeep = new Set<string>();

        for (const n of notifRowsSafe || []) {
          if (!isEntAccept(n)) continue;
          const key = n.link_url || `no_link_${n.id}`;
          const cur = bestAcceptByLink.get(key);
          if (!cur || acceptQuality(n) > acceptQuality(cur)) {
            bestAcceptByLink.set(key, n);
          }
        }
        for (const [key, n] of bestAcceptByLink.entries()) {
          acceptKeysToKeep.add(n.id);
        }

        const notifFeed: FeedItem[] = notifFeedAll.filter((it) => {
          if (it.kind !== "notif") return true;
          const n = it.notification;
          if (!isEntAccept(n)) return true;
          // keep only the best entanglement-accept per link_url
          return acceptKeysToKeep.has(n.id);
        });

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

  // ===== COUNTS =====
  const unreadOtherCount = otherNotifications.filter((n) => !n.is_read).length;
  const unreadCount = (entanglementRequests?.length || 0) + unreadOtherCount;

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

        // also update unified feed items
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

        // ✅ ONLY on ACCEPT: notify the requester via notifications table
        // ✅ ALSO de-dupe: keep ONLY this "X accepted your entanglement request" notif
        try {
          const { data: meP } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", user.id)
            .maybeSingle();

          const myName = meP?.full_name || "Someone";
          const linkUrl = `/profile/${user.id}`;

          const { data: inserted, error: insErr } = await supabase
            .from("notifications")
            .insert({
              user_id: item.requester_id, // requester gets this notif
              type: "entanglement",
              title: "Entanglement accepted",
              message: `${myName} accepted your entanglement request.`,
              link_url: linkUrl,
              is_read: false,
            })
            .select("id")
            .maybeSingle();

          // Delete duplicates for the same (user_id, type, link_url) — keep the newest inserted one
          if (!insErr && inserted?.id) {
            await supabase
              .from("notifications")
              .delete()
              .eq("user_id", item.requester_id)
              .eq("type", "entanglement")
              .eq("link_url", linkUrl)
              .neq("id", inserted.id);
          }
        } catch (e) {
          console.warn("accept notification insert/dedupe failed:", e);
        }

        // remove from pending UI
        setEntanglementRequests((prev) =>
          prev.filter((req) => req.id !== item.id)
        );

        // add into unified feed immediately (top) as "entangled"
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
        // ✅ DECLINE: do NOT notify
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

  const totalItems = entanglementRequests.length + feed.length;

  const scrollRequests = (direction: "left" | "right") => {
    const node = requestsRowRef.current;
    if (!node) return;
    const delta = direction === "left" ? -320 : 320;
    node.scrollBy({ left: delta, behavior: "smooth" });
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
            Latest notifications appear at the top.
          </div>
        </div>

        {totalItems > 0 && unreadOtherCount > 0 && (
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

      {!loading && !error && totalItems === 0 && (
        <div className="products-empty">
          No notifications yet. As you entangle with people and interact with the
          platform, updates will appear here.
        </div>
      )}

      {!loading && !error && totalItems > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* ACTIONABLE: Entanglement requests */}
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
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                marginBottom: 2,
                              }}
                            >
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
                              <span
                                style={{
                                  fontSize: 10.5,
                                  borderRadius: 999,
                                  padding: "2px 7px",
                                  border: "1px solid rgba(148,163,184,0.7)",
                                  color: "rgba(226,232,240,0.95)",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                }}
                              >
                                Member
                              </span>
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

                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <button
                            type="button"
                            disabled={actingOnId === item.id}
                            onClick={() =>
                              handleRespondRequest(item, "accept")
                            }
                            style={{
                              flex: 1,
                              minWidth: 120,
                              padding: "7px 0",
                              borderRadius: 10,
                              border: "none",
                              background:
                                "linear-gradient(90deg,#22c55e,#16a34a)",
                              color: "#0f172a",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor:
                                actingOnId === item.id
                                  ? "default"
                                  : "pointer",
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
                            onClick={() =>
                              handleRespondRequest(item, "decline")
                            }
                            style={{
                              flex: 1,
                              minWidth: 100,
                              padding: "7px 0",
                              borderRadius: 10,
                              border: "1px solid rgba(148,163,184,0.7)",
                              background: "transparent",
                              color: "rgba(248,250,252,0.9)",
                              fontSize: 12,
                              cursor:
                                actingOnId === item.id
                                  ? "default"
                                  : "pointer",
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

          {/* UNIFIED FEED: newest first, no categories */}
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
                            <div
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
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
                              whiteSpace: "nowrap",
                            }}
                          >
                            {formatCreated(n.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // entangled item
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
                              background:
                                "linear-gradient(135deg,#3bc7f3,#8468ff)",
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

                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {other?.id ? (
                              <>
                                You are now entangled with{" "}
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

// ✅ same as Jobs/Products/Community:
// - global layout left-only
// - wrap ensures mobileMain has the same provider/state
// - mobileMain shows only the middle on mobile
(NotificationsPage as any).layoutProps = {
  variant: "two-left",
  right: null,
  wrap: (children: React.ReactNode) => (
    <NotificationsProvider>{children}</NotificationsProvider>
  ),
  mobileMain: <NotificationsMiddle />,
};
