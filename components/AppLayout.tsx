// components/AppLayout.tsx
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import LeftSidebar from "./LeftSidebar";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

const Navbar = dynamic(() => import("./NavbarIcons"), { ssr: false });

type LayoutVariant = "three" | "two-left" | "two-right" | "center";

type AppLayoutProps = {
  children: ReactNode;

  left?: ReactNode | null;
  right?: ReactNode | null;

  variant?: LayoutVariant;
  showNavbar?: boolean;

  mobileMode?: "middle-only" | "keep-columns";
  mobileMain?: ReactNode;
  wrapMiddle?: boolean;
};

export default function AppLayout({
  children,
  left,
  right,
  variant = "three",
  showNavbar = true,
  mobileMode = "middle-only",
  mobileMain,
  wrapMiddle = true,
}: AppLayoutProps) {
  const [isMobile, setIsMobile] = useState(false);

  // ✅ mobile left drawer (ONLY used in mobile middle-only mode)
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handle = () => setIsMobile(window.innerWidth <= 900);
    handle();
    window.addEventListener("resize", handle);
    return () => window.removeEventListener("resize", handle);
  }, []);

  // Close drawer when switching out of mobile or out of middle-only mode
  useEffect(() => {
    if (!isMobile || mobileMode !== "middle-only") setMobileLeftOpen(false);
  }, [isMobile, mobileMode]);

  // ESC to close (mobile drawer only)
  useEffect(() => {
    if (!mobileLeftOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileLeftOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileLeftOpen]);

  const resolvedLeft = useMemo(() => {
    if (left === undefined) return <LeftSidebar />;
    return left;
  }, [left]);

  const resolvedRight = useMemo(() => {
    if (right === undefined) return <div />;
    return right;
  }, [right]);

  const hideSidebarsOnMobile = isMobile && mobileMode === "middle-only";

  const showLeft =
    !hideSidebarsOnMobile &&
    variant !== "two-right" &&
    variant !== "center" &&
    resolvedLeft !== null;

  const showRight =
    !hideSidebarsOnMobile &&
    variant !== "two-left" &&
    variant !== "center" &&
    resolvedRight !== null;

  // ✅ IMPORTANT:
  // Default <LeftSidebar /> already has a right border/line.
  // Only inject a left divider if the page provides a CUSTOM left sidebar.
  const useLeftInjectedDivider = showLeft && left !== undefined;

  // Right divider is safe to inject.
  const useRightInjectedDivider = showRight;

  const Divider = () => (
    <div
      aria-hidden="true"
      style={{
        width: 1,
        background: "rgba(148,163,184,0.35)",
        alignSelf: "stretch",
      }}
    />
  );

  const gridTemplateColumns = (() => {
    if (hideSidebarsOnMobile) return "minmax(0, 1fr)";

    const cols: string[] = [];

    if (showLeft) {
      cols.push("280px");
      if (useLeftInjectedDivider) cols.push("1px");
    }

    cols.push("minmax(0, 1fr)");

    if (showRight) {
      if (useRightInjectedDivider) cols.push("1px");
      cols.push("280px");
    }

    return cols.join(" ");
  })();

  const canOpenMobileLeftDrawer =
    hideSidebarsOnMobile &&
    variant !== "two-right" &&
    variant !== "center" &&
    resolvedLeft !== null;

  const mainContent =
    hideSidebarsOnMobile && mobileMain !== undefined ? mobileMain : children;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        {showNavbar && <Navbar />}

        {/* ✅ MOBILE: left-edge mid-screen arrow tab + drawer */}
        {canOpenMobileLeftDrawer && (
          <>
            <button
              type="button"
              aria-label={mobileLeftOpen ? "Close sidebar" : "Open sidebar"}
              onClick={() => setMobileLeftOpen((v) => !v)}
              style={{
                position: "fixed",
                left: 0,
                top: "80%",
                transform: "translateY(-50%)",
                zIndex: 60,
                width: 30,
                height: 80,
                border: "1px solid rgba(148,163,184,0.35)",
                borderLeft: "none",
                borderTopRightRadius: 16,
                borderBottomRightRadius: 16,
                background: "rgba(2,6,23,0.72)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  fontSize: 22,
                  lineHeight: 1,
                  color: "rgba(226,232,240,0.95)",
                  transform: mobileLeftOpen ? "rotate(180deg)" : "none",
                  transition: "transform 160ms ease",
                  userSelect: "none",
                }}
              >
                ❯
              </span>
            </button>

            {mobileLeftOpen && (
              <div
                aria-hidden="true"
                onClick={() => setMobileLeftOpen(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 55,
                  background: "rgba(0,0,0,0.45)",
                }}
              />
            )}

            <aside
              aria-label="Sidebar drawer"
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                bottom: 0,
                width: 280,
                zIndex: 56,
                transform: mobileLeftOpen ? "translateX(0)" : "translateX(-105%)",
                transition: "transform 200ms ease",
                background: "rgba(2,6,23,0.92)",
                backdropFilter: "blur(14px)",
                WebkitBackdropFilter: "blur(14px)",
                borderRight: "1px solid rgba(148,163,184,0.35)",
                overflowY: "auto",
              }}
            >
              {resolvedLeft}
            </aside>
          </>
        )}

        <main
          className="layout-3col"
          style={{
            display: "grid",
            gridTemplateColumns,
            gap: 24,
            alignItems: "start",
          }}
        >
          {showLeft && (
            <>
              {resolvedLeft}
              {useLeftInjectedDivider && <Divider />}
            </>
          )}

          {wrapMiddle ? (
            <section className="layout-main">{mainContent}</section>
          ) : (
            <>{mainContent}</>
          )}

          {showRight && (
            <>
              {useRightInjectedDivider && <Divider />}
              <aside
                className="layout-right sticky-col"
                style={{ display: "flex", flexDirection: "column" }}
              >
                {resolvedRight}
              </aside>
            </>
          )}
        </main>

        {/* ✅ GLOBAL FLOATING MESSAGES DOCK */}
        <FloatingMessagesDock />
      </div>
    </>
  );
}

/* =========================
   Floating Messages Dock
   ========================= */

type InboxRow = {
  thread_id: string;
  other_user_id: string;
  other_full_name: string | null;
  other_avatar_url: string | null;
  other_highest_education: string | null;
  other_affiliation: string | null;
  last_body: string | null;
  last_created_at: string | null;
  unread_count: number | string | null;
};

type EntangledProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  affiliation?: string | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  recipient_id?: string | null;
};

function FloatingMessagesDock() {
  const { user, loading: userLoading } = useSupabaseUser();
  const uid = user?.id ?? null;

  const [open, setOpen] = useState(false);

  // badge
  const [totalUnread, setTotalUnread] = useState<number>(0);

  // inbox
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [inbox, setInbox] = useState<InboxRow[]>([]);

  // thread view in dock
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const activeThread = useMemo(
    () => inbox.find((x) => x.thread_id === activeThreadId) || null,
    [inbox, activeThreadId]
  );

  // messages in dock
  const [loadingThread, setLoadingThread] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const listRef = useRef<HTMLDivElement | null>(null);

  // ✅ keep if user is near bottom (don’t yank if they scroll up)
  const isNearBottomRef = useRef(true);

  // new chat modal
  const [openNew, setOpenNew] = useState(false);
  const [entangled, setEntangled] = useState<EntangledProfile[]>([]);
  const [search, setSearch] = useState("");

  const initialsOf = (name: string | null | undefined) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "Q";

  const avatarStyle = (size = 34) => ({
    width: size,
    height: size,
    borderRadius: 999,
    overflow: "hidden" as const,
    border: "1px solid rgba(148,163,184,0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
    color: "#fff",
    fontWeight: 900,
    flexShrink: 0 as const,
  });

  const subtitle = (p: {
    other_highest_education?: string | null;
    other_affiliation?: string | null;
    highest_education?: string | null;
    affiliation?: string | null;
  }) =>
    [
      p.other_highest_education ?? p.highest_education,
      p.other_affiliation ?? p.affiliation,
    ]
      .filter(Boolean)
      .join(" · ");

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
  const el = listRef.current;
  if (!el) return;
  el.scrollTo({ top: el.scrollHeight, behavior });
};

  const measureNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    const threshold = 90;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    return dist < threshold;
  };

  // Track if user is near bottom while reading
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      isNearBottomRef.current = measureNearBottom();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    isNearBottomRef.current = measureNearBottom();

    return () => el.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThreadId, open]);

  // ✅ Sticky badge while closed
  const refreshTotalUnreadClamped = async () => {
    if (!uid) {
      setTotalUnread(0);
      return;
    }

    const { data, error } = await supabase.rpc("dm_total_unread");
    if (error) return;

    const v = Number(data || 0);

    setTotalUnread((prev) => {
      if (!open) return Math.max(prev, v);
      return v;
    });
  };

  const loadInbox = async () => {
    if (!uid) return;
    setLoadingInbox(true);
    try {
      const { data, error } = await supabase.rpc("dm_inbox");
      if (error) throw error;

      const rows: InboxRow[] = ((data || []) as any[]).map((r) => ({
        ...r,
        unread_count: Number(r.unread_count || 0),
      }));

      // newest conversation at top
      rows.sort((a, b) =>
        (b.last_created_at || "").localeCompare(a.last_created_at || "")
      );

      setInbox(rows);

      const serverTotal = rows.reduce(
        (s, r) => s + Number(r.unread_count || 0),
        0
      );
      setTotalUnread((prev) => (!open ? Math.max(prev, serverTotal) : serverTotal));
    } catch (e) {
      console.warn("dm_inbox error", e);
      setInbox([]);
    } finally {
      setLoadingInbox(false);
    }
  };

  const markThreadRead = async (threadId: string) => {
    if (!uid || !threadId) return;
    try {
      await supabase.rpc("dm_mark_thread_read", { p_thread_id: threadId });
    } catch {
      // ignore
    }
    await loadInbox();
    await refreshTotalUnreadClamped();
  };

  const loadThreadMessages = async (threadId: string) => {
    if (!uid || !threadId) return;
    setLoadingThread(true);
    try {
      const { data, error } = await supabase
        .from("dm_messages")
        .select("id, thread_id, sender_id, body, created_at, recipient_id")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // ✅ IMPORTANT: tell the layout-effect to scroll after paint
      setMessages(((data || []) as any[]) as MessageRow[]);

// ✅ ALWAYS open at bottom (newest) — same as ThreadPage
requestAnimationFrame(() => {
  scrollToBottom("auto");
  setTimeout(() => scrollToBottom("auto"), 60);
});

// ✅ let the UI finish scrolling first, then mark read (which refreshes inbox)
setTimeout(() => {
  void markThreadRead(threadId);
}, 120);
    } catch (e) {
      console.warn("loadThreadMessages error", e);
      setMessages([]);
    } finally {
      setLoadingThread(false);
    }
  };

  const send = async () => {
    if (!uid || !activeThreadId) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from("dm_messages")
        .insert({
          thread_id: activeThreadId,
          sender_id: uid,
          body,
        })
        .select("id, thread_id, sender_id, body, created_at, recipient_id")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // ✅ force scroll after paint
        setMessages((prev) => {
  const exists = prev.some((x) => x.id === (data as any).id);
  return exists ? prev : [...prev, data as any as MessageRow];
});

setDraft("");

// ✅ after sending, always go bottom — same as ThreadPage
requestAnimationFrame(() => {
  scrollToBottom("smooth");
  setTimeout(() => scrollToBottom("smooth"), 60);
});

await loadInbox();
await refreshTotalUnreadClamped();
      }
    } catch (e: any) {
      alert(e?.message || "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  const loadEntangledPeople = async () => {
    if (!uid) return;

    const { data: cRows, error } = await supabase
      .from("connections")
      .select("user_id, target_user_id, status")
      .or(`user_id.eq.${uid},target_user_id.eq.${uid}`)
      .eq("status", "accepted");

    if (error) return;

    const otherIds = (cRows || []).map((r: any) =>
      r.user_id === uid ? r.target_user_id : r.user_id
    );
    const uniq = Array.from(new Set(otherIds)).filter(Boolean);

    if (uniq.length === 0) {
      setEntangled([]);
      return;
    }

    const { data: pRows } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, highest_education, affiliation")
      .in("id", uniq);

    setEntangled((pRows as any[])?.map((p) => p as EntangledProfile) || []);
  };

  const openOrCreateThread = async (otherUserId: string) => {
    if (!uid) return;

    const user1 = uid < otherUserId ? uid : otherUserId;
    const user2 = uid < otherUserId ? otherUserId : uid;

    const existing = inbox.find((t) => t.other_user_id === otherUserId);
    if (existing) {
      setOpen(true);
      setOpenNew(false);
      setActiveThreadId(existing.thread_id);
      await loadThreadMessages(existing.thread_id);
      return;
    }

    const { data, error } = await supabase
      .from("dm_threads")
      .insert({ user1, user2 })
      .select("id")
      .maybeSingle();

    if (error) {
      alert(error.message || "Could not start chat.");
      return;
    }

    const threadId = (data as any)?.id as string | undefined;
    if (!threadId) return;

    await loadInbox();
    await refreshTotalUnreadClamped();

    setOpen(true);
    setOpenNew(false);
    setActiveThreadId(threadId);
    await loadThreadMessages(threadId);
  };

  const filteredEntangled = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entangled;
    return entangled.filter((p) =>
      (p.full_name || "").toLowerCase().includes(q)
    );
  }, [entangled, search]);

  useEffect(() => {
    if (userLoading) return;
    if (!uid) {
      setInbox([]);
      setTotalUnread(0);
      setActiveThreadId(null);
      setMessages([]);
      return;
    }
    void loadInbox();
    void refreshTotalUnreadClamped();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, uid]);

  // realtime: new dm_messages (badge + inbox refresh)
  useEffect(() => {
    if (!uid) return;

    const channel = supabase
      .channel("dm:global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        async (payload) => {
          const row = payload.new as any as MessageRow;

          // incoming only
          if (row.sender_id === uid) return;

          // badge increment immediately
          setTotalUnread((prev) => prev + 1);

          // if currently viewing that thread, append + mark read
          if (open && activeThreadId && row.thread_id === activeThreadId) {
            setMessages((prev) => {
              const exists = prev.some((x) => x.id === row.id);
              return exists ? prev : [...prev, row];
            });

            // ✅ only scroll if user is already near-bottom
            if (isNearBottomRef.current) {
  requestAnimationFrame(() => {
    scrollToBottom("auto");
    setTimeout(() => scrollToBottom("auto"), 40);
  });
}

            try {
              await supabase.rpc("dm_mark_thread_read", {
                p_thread_id: activeThreadId,
              });
            } catch {
              // ignore
            }
          }

          // keep inbox ordering + unread highlights accurate whenever dock is open
          if (open) {
            await loadInbox();
            await refreshTotalUnreadClamped();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, open, activeThreadId]);

  useEffect(() => {
    if (!openNew) return;
    void loadEntangledPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNew]);

  const pillBtn = {
    fontSize: 12,
    padding: "7px 10px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.22)",
    color: "rgba(226,232,240,0.92)",
    cursor: "pointer",
    fontWeight: 900,
  } as const;

  if (!uid) return null;

  const unreadCardStyle = {
    border: "1px solid rgba(59,199,243,0.35)",
    background:
      "linear-gradient(135deg, rgba(59,199,243,0.12), rgba(132,104,255,0.08))",
    boxShadow:
      "0 0 0 1px rgba(59,199,243,0.10) inset, 0 0 18px rgba(59,199,243,0.14)",
  } as const;

  const normalCardStyle = {
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(2,6,23,0.20)",
    boxShadow: "none",
  } as const;

  return (
    <>
      {/* Launcher button */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) {
            void loadInbox();
            void refreshTotalUnreadClamped();
          }
        }}
        aria-label="Messages"
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 80,
          height: 46,
          padding: "0 14px",
          borderRadius: 999,
          border: "1px solid rgba(148,163,184,0.26)",
          background: "rgba(2,6,23,0.78)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          color: "rgba(226,232,240,0.95)",
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          cursor: "pointer",
          boxShadow: "0 14px 40px rgba(0,0,0,0.35)",
          fontWeight: 900,
          overflow: "visible",
        }}
      >
        <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 14 }}>💬</span>
          <span style={{ fontSize: 13 }}>Messages</span>

          {totalUnread > 0 && (
            <span
              style={{
                position: "absolute",
                right: -10,
                top: -10,
                minWidth: 18,
                height: 18,
                padding: "0 6px",
                borderRadius: 999,
                background: "rgba(248,113,113,0.98)",
                color: "#0b1220",
                fontSize: 11,
                fontWeight: 900,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid rgba(2,6,23,0.92)",
                boxShadow: "0 10px 24px rgba(0,0,0,0.45)",
                pointerEvents: "none",
              }}
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </div>
      </button>

      {/* Dock panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            right: 18,
            bottom: 74,
            zIndex: 81,
            width: 380,
            maxWidth: "calc(100vw - 36px)",
            height: 520,
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.22)",
            background: "rgba(15,23,42,0.96)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "12px 12px",
              borderBottom: "1px solid rgba(148,163,184,0.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 14 }}>
              {activeThread ? "Chat" : "Messages"}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {!activeThread && (
                <button type="button" style={pillBtn} onClick={() => setOpenNew(true)}>
                  New chat
                </button>
              )}

              <Link
                href="/messages"
                onClick={() => {
                  setOpen(false);
                  setOpenNew(false);
                  setActiveThreadId(null);
                  setMessages([]);
                  setDraft("");
                }}
                style={{
                  ...pillBtn,
                  textDecoration: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                Open page
              </Link>

              <button
                type="button"
                style={pillBtn}
                onClick={() => {
                  setOpen(false);
                  setOpenNew(false);
                }}
              >
                Close
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {!activeThread ? (
              <div style={{ padding: 12, height: "100%", overflowY: "auto" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <div style={{ fontWeight: 900, fontSize: 13, opacity: 0.9 }}>Inbox</div>
                  <button
                    type="button"
                    style={pillBtn}
                    onClick={() => {
                      void loadInbox();
                      void refreshTotalUnreadClamped();
                    }}
                    disabled={loadingInbox}
                  >
                    {loadingInbox ? "Refreshing…" : "Refresh"}
                  </button>
                </div>

                <div style={{ height: 10 }} />

                {inbox.length === 0 ? (
                  <div style={{ opacity: 0.8, fontSize: 13 }}>
                    No chats yet. Start a chat with an entangled member.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {inbox.map((t) => {
                      const name = t.other_full_name || "Quantum member";
                      const initials = initialsOf(t.other_full_name);
                      const unread = Number(t.unread_count || 0);
                      const hasUnread = unread > 0;

                      return (
                        <button
                          key={t.thread_id}
                          type="button"
                          onClick={async () => {
                            // optimistic: remove highlight instantly
                            if (hasUnread) {
                              setInbox((prev) =>
                                prev.map((r) =>
                                  r.thread_id === t.thread_id ? { ...r, unread_count: 0 } : r
                                )
                              );
                              setTotalUnread((prev) => Math.max(0, prev - unread));
                            }

                            setActiveThreadId(t.thread_id);
                            await loadThreadMessages(t.thread_id);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            borderRadius: 14,
                            color: "rgba(226,232,240,0.95)",
                            padding: 12,
                            cursor: "pointer",
                            ...(hasUnread ? unreadCardStyle : normalCardStyle),
                          }}
                        >
                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <div style={avatarStyle(42)}>
                              {t.other_avatar_url ? (
                                <img
                                  src={t.other_avatar_url}
                                  alt={name}
                                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                                />
                              ) : (
                                initials
                              )}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                                <div style={{ fontWeight: 900, fontSize: 13, lineHeight: 1.2, minWidth: 0 }}>
                                  <span
                                    style={{
                                      whiteSpace: "nowrap",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      display: "block",
                                    }}
                                  >
                                    {name}
                                  </span>
                                </div>

                                {unread > 0 && (
                                  <div
                                    style={{
                                      minWidth: 18,
                                      height: 18,
                                      padding: "0 6px",
                                      borderRadius: 999,
                                      background: "rgba(248,113,113,0.92)",
                                      color: "#0b1220",
                                      fontSize: 11,
                                      fontWeight: 900,
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {unread > 99 ? "99+" : unread}
                                  </div>
                                )}
                              </div>

                              <div style={{ fontSize: 12, opacity: 0.78, marginTop: 3 }}>
                                {subtitle(t) || "Entangled member"}
                              </div>

                              <div
                                style={{
                                  fontSize: 12,
                                  opacity: hasUnread ? 0.98 : 0.85,
                                  fontWeight: hasUnread ? 900 : 700,
                                  marginTop: 8,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {t.last_body || "No messages yet."}
                              </div>
                            </div>

                            <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 900 }}>›</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
                <div
                  style={{
                    padding: 12,
                    borderBottom: "1px solid rgba(148,163,184,0.14)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveThreadId(null);
                        setMessages([]);
                        setDraft("");
                        void loadInbox();
                        void refreshTotalUnreadClamped();
                      }}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.22)",
                        background: "rgba(2,6,23,0.22)",
                        color: "rgba(226,232,240,0.92)",
                        cursor: "pointer",
                        fontWeight: 900,
                      }}
                      aria-label="Back"
                      title="Back"
                    >
                      ←
                    </button>

                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 900,
                          fontSize: 13,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {activeThread?.other_full_name || "Quantum member"}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>
                        {activeThread ? subtitle(activeThread) || "Entangled member" : "Entangled member"}
                      </div>
                    </div>
                  </div>

                  {activeThread?.other_user_id && (
                    <Link
                      href={`/profile/${activeThread.other_user_id}`}
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        color: "rgba(34,211,238,0.95)",
                        textDecoration: "none",
                        flexShrink: 0,
                      }}
                    >
                      View
                    </Link>
                  )}
                </div>

                <div
                  ref={listRef}
                  style={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    padding: 12,
                    background: "rgba(2,6,23,0.16)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  {loadingThread ? (
                    <div style={{ opacity: 0.8, fontSize: 13 }}>Loading chat…</div>
                  ) : messages.length === 0 ? (
                    <div style={{ opacity: 0.8, fontSize: 13 }}>No messages yet. Say hi.</div>
                  ) : (
                    <>
                      {messages.map((m) => {
                        const mine = m.sender_id === uid;
                        return (
                          <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                            <div
                              style={{
                                maxWidth: "78%",
                                borderRadius: 14,
                                padding: "10px 12px",
                                border: mine ? "1px solid rgba(59,199,243,0.35)" : "1px solid rgba(148,163,184,0.18)",
                                background: mine ? "rgba(59,199,243,0.10)" : "rgba(15,23,42,0.70)",
                                color: "rgba(226,232,240,0.95)",
                                fontSize: 13,
                                lineHeight: 1.45,
                                whiteSpace: "pre-wrap",
                                wordBreak: "break-word",
                              }}
                            >
                              {m.body}
                            </div>
                          </div>
                        );
                      })}

                      {/* ✅ bottom anchor */}
                    </>
                  )}
                </div>

                <div
                  style={{
                    padding: 12,
                    borderTop: "1px solid rgba(148,163,184,0.14)",
                    background: "rgba(15,23,42,0.92)",
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write a message…"
                    onFocus={() => {
                      if (activeThreadId) void markThreadRead(activeThreadId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.2)",
                      background: "rgba(2,6,23,0.26)",
                      color: "rgba(226,232,240,0.94)",
                      padding: "0 12px",
                      fontSize: 13,
                      outline: "none",
                    }}
                  />

                  <button
                    type="button"
                    onClick={() => void send()}
                    disabled={sending || !draft.trim()}
                    style={{
                      padding: "9px 14px",
                      borderRadius: 999,
                      border: "none",
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: sending ? "default" : "pointer",
                      opacity: sending || !draft.trim() ? 0.55 : 1,
                      background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                      color: "#0f172a",
                    }}
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New chat modal */}
      {openNew && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.62)",
            backdropFilter: "blur(8px)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpenNew(false);
          }}
        >
          <div
            style={{
              width: "min(620px, 100%)",
              borderRadius: 16,
              border: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(15,23,42,0.96)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div style={{ fontWeight: 900, fontSize: 15 }}>Start a chat</div>
              <button type="button" style={pillBtn} onClick={() => setOpenNew(false)}>
                Close
              </button>
            </div>

            <div style={{ height: 10 }} />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search entangled people…"
              style={{
                width: "100%",
                height: 42,
                borderRadius: 12,
                border: "1px solid rgba(148,163,184,0.2)",
                background: "rgba(2,6,23,0.26)",
                color: "rgba(226,232,240,0.94)",
                padding: "0 12px",
                fontSize: 14,
                outline: "none",
              }}
            />

            <div style={{ height: 10 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" }}>
              {filteredEntangled.length === 0 ? (
                <div style={{ opacity: 0.8, padding: 10 }}>No entangled members found.</div>
              ) : (
                filteredEntangled.map((p) => {
                  const name = p.full_name || "Quantum member";
                  const initials = initialsOf(p.full_name);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => void openOrCreateThread(p.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        borderRadius: 14,
                        border: "1px solid rgba(148,163,184,0.18)",
                        background: "rgba(2,6,23,0.20)",
                        color: "rgba(226,232,240,0.95)",
                        padding: 12,
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={avatarStyle(40)}>
                          {p.avatar_url ? (
                            <img
                              src={p.avatar_url}
                              alt={name}
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                          ) : (
                            initials
                          )}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 900, fontSize: 14 }}>{name}</div>
                          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>
                            {subtitle(p as any) || "Entangled member"}
                          </div>
                        </div>

                        <div style={{ fontSize: 12, opacity: 0.7, fontWeight: 900 }}>Message</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
