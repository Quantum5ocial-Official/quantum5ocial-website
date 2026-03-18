// pages/messages/[threadId].tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type ThreadRow = { id: string; user1: string; user2: string; created_at: string };
type ProfileLite = {
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
  recipient_id?: string;
};

function useIsMobile(maxWidth = 720) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const update = () => setIsMobile(mq.matches);
    update();

    const anyMq = mq as any;
    if (mq.addEventListener) {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    if (anyMq.addListener) {
      anyMq.addListener(update);
      return () => anyMq.removeListener(update);
    }
  }, [maxWidth]);

  return isMobile;
}

export default function ThreadPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const router = useRouter();
  const isMobile = useIsMobile(720);

  const threadId = useMemo(() => {
    const raw = router.query?.threadId;
    const v = Array.isArray(raw) ? raw[0] : raw;
    return typeof v === "string" ? v : null;
  }, [router.query]);

  const uid = user?.id ?? null;

  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<ThreadRow | null>(null);
  const [other, setOther] = useState<ProfileLite | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement | null>(null);
  const isNearBottomRef = useRef(true);

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

  const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  };

  const measureNearBottom = () => {
    const el = listRef.current;
    if (!el) return true;
    const threshold = 80;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    return dist < threshold;
  };

  const markThreadRead = async () => {
    if (!uid || !threadId) return;
    try {
      await supabase.rpc("dm_mark_thread_read", { p_thread_id: threadId });
    } catch {}
  };

  const loadThreadAndMessages = async () => {
    if (!uid || !threadId) return;
    setLoading(true);
    setError(null);

    try {
      const { data: t, error: tErr } = await supabase
        .from("dm_threads")
        .select("id, user1, user2, created_at")
        .eq("id", threadId)
        .maybeSingle();

      if (tErr) throw tErr;
      if (!t) throw new Error("Thread not found (or access denied).");

      const th = t as ThreadRow;
      setThread(th);

      const otherId = th.user1 === uid ? th.user2 : th.user1;

      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, highest_education, affiliation")
        .eq("id", otherId)
        .maybeSingle();

      setOther((p as any) || null);

      const { data: m, error: mErr } = await supabase
        .from("dm_messages")
        .select("id, thread_id, sender_id, body, created_at, recipient_id")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (mErr) throw mErr;

      setMessages((m as any[])?.map((x) => x as MessageRow) || []);

      requestAnimationFrame(() => {
        scrollToBottom("auto");
        setTimeout(() => scrollToBottom("auto"), 60);
      });

      await markThreadRead();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Could not load chat.");
      setThread(null);
      setOther(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const send = async () => {
    if (!uid || !threadId) return;
    const body = draft.trim();
    if (!body) return;

    setSending(true);
    try {
      const { data, error } = await supabase
        .from("dm_messages")
        .insert({
          thread_id: threadId,
          sender_id: uid,
          body,
        })
        .select("id, thread_id, sender_id, body, created_at, recipient_id")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMessages((prev) => {
          const exists = prev.some((x) => x.id === (data as any).id);
          return exists ? prev : [...prev, data as any as MessageRow];
        });
        setDraft("");

        requestAnimationFrame(() => {
          scrollToBottom("smooth");
          setTimeout(() => scrollToBottom("smooth"), 60);
        });
      }
    } catch (e: any) {
      alert(e?.message || "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (userLoading) return;
    if (!uid) {
      router.push("/auth?redirect=/messages");
      return;
    }
    void loadThreadAndMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, uid, threadId]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      isNearBottomRef.current = measureNearBottom();
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    isNearBottomRef.current = measureNearBottom();

    return () => {
      el.removeEventListener("scroll", onScroll);
    };
  }, [messages.length]);

  useEffect(() => {
    if (!uid || !threadId) return;

    const channel = supabase
      .channel(`dm-thread-page:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages" },
        async (payload) => {
          const row = payload.new as any as MessageRow;

          if (row.thread_id !== threadId) return;

          if (thread) {
            const allowed =
              row.sender_id === thread.user1 || row.sender_id === thread.user2;
            if (!allowed) return;
          }

          setMessages((prev) => {
            const exists = prev.some((x) => x.id === row.id);
            return exists ? prev : [...prev, row];
          });

          if (isNearBottomRef.current) {
            requestAnimationFrame(() => {
              scrollToBottom("auto");
              setTimeout(() => scrollToBottom("auto"), 40);
            });
          }

          if (row.sender_id !== uid) {
            await markThreadRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, threadId, thread]);

  useEffect(() => {
    if (!uid || !threadId) return;

    const onFocus = () => void markThreadRead();
    const onVis = () => {
      if (document.visibilityState === "visible") void markThreadRead();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [uid, threadId]);

  if (loading && !thread) {
    return <div style={{ opacity: 0.8 }}>Loading chat…</div>;
  }

  if (error && !thread) {
    return (
      <div>
        <div style={{ color: "#f87171", fontWeight: 900 }}>{error}</div>
        <div style={{ height: 10 }} />
        <Link href="/messages" style={{ color: "rgba(34,211,238,0.95)" }}>
          Back to Messages
        </Link>
      </div>
    );
  }

  const name = other?.full_name || "Quantum member";
  const initials = initialsOf(other?.full_name);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        height: isMobile ? "calc(100dvh - 180px)" : "calc(100dvh - 160px)",
        paddingBottom: isMobile ? 8 : 0,
      }}
    >
      {/* header */}
      <div
        style={{
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(15,23,42,0.92)",
          borderRadius: 14,
          padding: isMobile ? "10px 12px" : 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 10 : 12,
            minWidth: 0,
            flex: 1,
          }}
        >
          <Link
            href="/messages"
            style={{
              textDecoration: "none",
              color: "rgba(226,232,240,0.92)",
              fontWeight: 900,
              fontSize: isMobile ? 24 : 18,
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            ←
          </Link>

          {other?.id ? (
            <Link
              href={`/profile/${other.id}`}
              style={{
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 10 : 12,
                minWidth: 0,
                flex: 1,
              }}
            >
              <div style={avatarStyle(isMobile ? 38 : 40)}>
                {other?.avatar_url ? (
                  <img
                    src={other.avatar_url}
                    alt={name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  initials
                )}
              </div>

              <div
                style={{
                  fontWeight: 900,
                  fontSize: isMobile ? 13 : 14,
                  color: "rgba(226,232,240,0.95)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
                title={name}
              >
                {name}
              </div>
            </Link>
          ) : (
            <>
              <div style={avatarStyle(isMobile ? 38 : 40)}>
                {other?.avatar_url ? (
                  <img
                    src={other.avatar_url}
                    alt={name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  initials
                )}
              </div>

              <div
                style={{
                  fontWeight: 900,
                  fontSize: isMobile ? 13 : 14,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  minWidth: 0,
                }}
                title={name}
              >
                {name}
              </div>
            </>
          )}
        </div>

        {other?.id && (
          <Link
            href={`/profile/${other.id}`}
            style={{
              fontSize: isMobile ? 12 : 13,
              color: "rgba(34,211,238,0.95)",
              textDecoration: "none",
              fontWeight: 900,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            View profile
          </Link>
        )}
      </div>

      <div style={{ height: 10, flexShrink: 0 }} />

      {/* message list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          border: "1px solid rgba(148,163,184,0.14)",
          background: "rgba(2,6,23,0.18)",
          borderRadius: 14,
          padding: isMobile ? 10 : 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {messages.length === 0 ? (
          <div style={{ opacity: 0.8, fontSize: 13 }}>No messages yet. Say hi.</div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === uid;
            return (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  justifyContent: mine ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: isMobile ? "86%" : "78%",
                    borderRadius: 14,
                    padding: isMobile ? "9px 11px" : "10px 12px",
                    border: mine
                      ? "1px solid rgba(59,199,243,0.35)"
                      : "1px solid rgba(148,163,184,0.18)",
                    background: mine
                      ? "rgba(59,199,243,0.10)"
                      : "rgba(15,23,42,0.70)",
                    color: "rgba(226,232,240,0.95)",
                    fontSize: isMobile ? 13 : 14,
                    lineHeight: 1.45,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={{ height: 10, flexShrink: 0 }} />

      {/* composer */}
      <div
        style={{
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(15,23,42,0.92)",
          borderRadius: 14,
          padding: isMobile ? 10 : 12,
          display: "flex",
          gap: isMobile ? 8 : 10,
          alignItems: "center",
          flexShrink: 0,
          position: "sticky",
          bottom: 0,
          zIndex: 5,
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          onFocus={() => void markThreadRead()}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          style={{
            flex: 1,
            minWidth: 0,
            height: isMobile ? 40 : 42,
            borderRadius: 12,
            border: "1px solid rgba(148,163,184,0.2)",
            background: "rgba(2,6,23,0.26)",
            color: "rgba(226,232,240,0.94)",
            padding: isMobile ? "0 10px" : "0 12px",
            fontSize: isMobile ? 13 : 14,
            outline: "none",
          }}
        />

        <button
          type="button"
          onClick={() => void send()}
          disabled={sending || !draft.trim()}
          style={{
            padding: isMobile ? "9px 12px" : "9px 14px",
            borderRadius: 999,
            border: "none",
            fontSize: isMobile ? 12 : 13,
            fontWeight: 900,
            background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
            color: "#0f172a",
            opacity: sending || !draft.trim() ? 0.55 : 1,
            cursor: sending || !draft.trim() ? "default" : "pointer",
            flexShrink: 0,
          }}
        >
          {sending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}

(ThreadPage as any).layoutProps = {
  variant: "three",
  right: null,
};
