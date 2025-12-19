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
};

export default function ThreadPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const router = useRouter();

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

  const subtitle = (p: ProfileLite | null) =>
    [p?.highest_education, p?.affiliation].filter(Boolean).join(" · ");

  const scrollToBottom = () => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const loadThreadAndMessages = async () => {
    if (!uid || !threadId) return;
    setLoading(true);
    setError(null);

    try {
      // 1) thread
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

      // 2) other profile
      const { data: p } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, highest_education, affiliation")
        .eq("id", otherId)
        .maybeSingle();

      setOther((p as any) || null);

      // 3) messages
      const { data: m, error: mErr } = await supabase
        .from("dm_messages")
        .select("id, thread_id, sender_id, body, created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (mErr) throw mErr;

      setMessages((m as any[])?.map((x) => x as MessageRow) || []);

      // slight delay helps after render
      setTimeout(scrollToBottom, 50);
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
        .select("id, thread_id, sender_id, body, created_at")
        .maybeSingle();

      if (error) throw error;

      // optimistic append (realtime will also come, but dedupe by id)
      if (data) {
        setMessages((prev) => {
          const exists = prev.some((x) => x.id === (data as any).id);
          return exists ? prev : [...prev, data as any as MessageRow];
        });
        setDraft("");
        setTimeout(scrollToBottom, 20);
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
    loadThreadAndMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, uid, threadId]);

  // Realtime subscription (new messages for this thread)
  useEffect(() => {
    if (!threadId) return;

    const channel = supabase
      .channel(`dm:${threadId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `thread_id=eq.${threadId}`,
        },
        (payload) => {
          const row = payload.new as any as MessageRow;
          setMessages((prev) => {
            const exists = prev.some((x) => x.id === row.id);
            return exists ? prev : [...prev, row];
          });
          setTimeout(scrollToBottom, 20);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

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
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 160px)" }}>
      {/* header */}
      <div
        style={{
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(15,23,42,0.92)",
          borderRadius: 14,
          padding: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <Link href="/messages" style={{ textDecoration: "none", color: "rgba(226,232,240,0.92)", fontWeight: 900 }}>
            ←
          </Link>

          <div style={avatarStyle(40)}>
            {other?.avatar_url ? (
              <img
                src={other.avatar_url}
                alt={name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              initials
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.2 }}>{name}</div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>
              {subtitle(other) || "Entangled member"}
            </div>
          </div>
        </div>

        {other?.id && (
          <Link
            href={`/profile/${other.id}`}
            style={{
              textDecoration: "none",
              fontSize: 13,
              fontWeight: 900,
              color: "rgba(34,211,238,0.95)",
            }}
          >
            View profile
          </Link>
        )}
      </div>

      <div style={{ height: 10 }} />

      {/* message list */}
      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: "auto",
          border: "1px solid rgba(148,163,184,0.14)",
          background: "rgba(2,6,23,0.18)",
          borderRadius: 14,
          padding: 12,
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
              <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
                <div
                  style={{
                    maxWidth: "78%",
                    borderRadius: 14,
                    padding: "10px 12px",
                    border: mine
                      ? "1px solid rgba(59,199,243,0.35)"
                      : "1px solid rgba(148,163,184,0.18)",
                    background: mine ? "rgba(59,199,243,0.10)" : "rgba(15,23,42,0.70)",
                    color: "rgba(226,232,240,0.95)",
                    fontSize: 14,
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

      <div style={{ height: 10 }} />

      {/* composer */}
      <div
        style={{
          border: "1px solid rgba(148,163,184,0.18)",
          background: "rgba(15,23,42,0.92)",
          borderRadius: 14,
          padding: 12,
          display: "flex",
          gap: 10,
          alignItems: "center",
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write a message…"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          style={{
            flex: 1,
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

        <button
          type="button"
          onClick={send}
          disabled={sending || !draft.trim()}
          style={{
            padding: "9px 14px",
            borderRadius: 999,
            border: "none",
            fontSize: 13,
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
  );
}

(ThreadPage as any).layoutProps = {
  variant: "three",
  right: null,
};
