// pages/messages/index.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type ProfileLite = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education?: string | null;
  affiliation?: string | null;
};

type ThreadRow = {
  id: string;
  user1: string;
  user2: string;
  created_at: string;
};

type ThreadVM = {
  thread: ThreadRow;
  otherUserId: string;
  otherProfile: ProfileLite | null;
  lastMessage: { body: string; created_at: string } | null;
  unread_count: number;
};

export default function MessagesIndexPage() {
  const { user, loading: userLoading } = useSupabaseUser();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ThreadVM[]>([]);
  const [error, setError] = useState<string | null>(null);

  // New chat
  const [openNew, setOpenNew] = useState(false);
  const [entangled, setEntangled] = useState<ProfileLite[]>([]);
  const [search, setSearch] = useState("");

  const uid = user?.id ?? null;

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

  const pillBtn = {
    fontSize: 13,
    padding: "8px 12px",
    borderRadius: 999,
    border: "1px solid rgba(148,163,184,0.22)",
    background: "rgba(2,6,23,0.22)",
    color: "rgba(226,232,240,0.92)",
    cursor: "pointer",
    fontWeight: 900,
  } as const;

  const cardStyle = {
    border: "1px solid rgba(148,163,184,0.18)",
    background: "rgba(15,23,42,0.92)",
    borderRadius: 14,
    padding: 14,
  } as const;

  const subtitle = (p: ProfileLite | null) =>
    [p?.highest_education, p?.affiliation].filter(Boolean).join(" · ");

  const loadThreads = async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);

    try {
      // 1) threads where I'm a participant (RLS also enforces)
      const { data: tRows, error: tErr } = await supabase
        .from("dm_threads")
        .select("id, user1, user2, created_at")
        .order("created_at", { ascending: false });

      if (tErr) throw tErr;

      const threads = (tRows || []) as ThreadRow[];
      const otherIds = threads.map((t) => (t.user1 === uid ? t.user2 : t.user1));
      const uniqOther = Array.from(new Set(otherIds));

      // 2) profiles of other participants
      let profileMap = new Map<string, ProfileLite>();
      if (uniqOther.length > 0) {
        const { data: pRows } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, highest_education, affiliation")
          .in("id", uniqOther);

        (pRows as any[] | null)?.forEach((p) => profileMap.set(p.id, p as ProfileLite));
      }

      // 3) last message per thread (simple approach: fetch latest for all threads)
      let lastByThread = new Map<string, { body: string; created_at: string }>();
      if (threads.length > 0) {
        const ids = threads.map((t) => t.id);
        const { data: mRows } = await supabase
          .from("dm_messages")
          .select("thread_id, body, created_at")
          .in("thread_id", ids)
          .order("created_at", { ascending: false })
          .limit(200);
        
        // 4) unread counts via dm_inbox (thread_id -> unread_count)
let unreadByThread = new Map<string, number>();
try {
  const { data: inboxRows, error: inboxErr } = await supabase.rpc("dm_inbox");
  if (!inboxErr) {
    (inboxRows as any[] | null)?.forEach((r) => {
      unreadByThread.set(r.thread_id, Number(r.unread_count || 0));
    });
  }
} catch {}

        // first occurrence per thread is the latest (due to ordering)
        (mRows as any[] | null)?.forEach((m) => {
          if (!lastByThread.has(m.thread_id)) {
            lastByThread.set(m.thread_id, { body: m.body, created_at: m.created_at });
          }
        });
      }

      const vms: ThreadVM[] = threads.map((t) => {
  const otherUserId = t.user1 === uid ? t.user2 : t.user1;
  return {
    thread: t,
    otherUserId,
    otherProfile: profileMap.get(otherUserId) || null,
    lastMessage: lastByThread.get(t.id) || null,
    unread_count: unreadByThread.get(t.id) || 0,
  };
});

// ✅ newest first by lastMessage time, fallback thread time
vms.sort((a, b) => {
  const ta = a.lastMessage?.created_at || a.thread.created_at;
  const tb = b.lastMessage?.created_at || b.thread.created_at;
  return tb.localeCompare(ta);
});

setThreads(vms);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Could not load messages.");
      setThreads([]);
    } finally {
      setLoading(false);
    }
  };

  const loadEntangledPeople = async () => {
    if (!uid) return;

    // accepted connections can be either direction
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

    setEntangled((pRows as any[])?.map((p) => p as ProfileLite) || []);
  };

  const openOrCreateThread = async (otherUserId: string) => {
    if (!uid) return;

    // enforce ordering user1 < user2 (matches table check + unique)
    const user1 = uid < otherUserId ? uid : otherUserId;
    const user2 = uid < otherUserId ? otherUserId : uid;

    // try find existing
    const existing = threads.find((t) => {
      const th = t.thread;
      return th.user1 === user1 && th.user2 === user2;
    });

    if (existing) {
      router.push(`/messages/${existing.thread.id}`);
      return;
    }

    // create thread (RLS will only allow if entangled & not blocked)
    const { data, error } = await supabase
      .from("dm_threads")
      .insert({ user1, user2 })
      .select("id")
      .maybeSingle();

    if (error) {
      alert(error.message || "Could not start chat.");
      return;
    }

    const threadId = (data as any)?.id;
    if (threadId) router.push(`/messages/${threadId}`);
  };

  const filteredEntangled = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entangled;
    return entangled.filter((p) => (p.full_name || "").toLowerCase().includes(q));
  }, [entangled, search]);

  useEffect(() => {
    if (userLoading) return;
    if (!uid) {
      router.push("/auth?redirect=/messages");
      return;
    }
    loadThreads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoading, uid]);

  useEffect(() => {
    if (!openNew) return;
    loadEntangledPeople();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNew]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Messages</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" style={pillBtn} onClick={() => loadThreads()} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
          <button type="button" style={pillBtn} onClick={() => setOpenNew(true)}>
            New chat
          </button>
        </div>
      </div>

      <div style={{ height: 12 }} />

      {loading && <div style={{ opacity: 0.8 }}>Loading…</div>}
      {error && !loading && <div style={{ color: "#f87171" }}>{error}</div>}

      {!loading && !error && threads.length === 0 && (
        <div style={{ opacity: 0.85 }}>
          No chats yet. Create an entangle connection first, then start a chat.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {threads.map((t) => {
          const p = t.otherProfile;
          const name = p?.full_name || "Quantum member";
          const initials = initialsOf(p?.full_name);

          return (
            <Link
              key={t.thread.id}
              href={`/messages/${t.thread.id}`}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div style={{ ...cardStyle, cursor: "pointer" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={avatarStyle(42)}>
                    {p?.avatar_url ? (
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
                    <div style={{ fontWeight: 900, fontSize: 14, lineHeight: 1.2 }}>
                      {name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8, marginTop: 3 }}>
                      {subtitle(p) || "Entangled member"}
                    </div>

                    <div style={{ fontSize: 12, opacity: 0.85, marginTop: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {t.lastMessage ? t.lastMessage.body : "No messages yet."}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
  {t.unread_count > 0 && (
    <div
      title="Unread"
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        background: "rgba(59,199,243,0.95)",
        boxShadow: "0 0 0 3px rgba(59,199,243,0.18)",
      }}
    />
  )}
  <div style={{ fontSize: 12, opacity: 0.6, fontWeight: 800 }}>›</div>
</div>
                    ›
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* New chat modal */}
      {openNew && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.62)",
            backdropFilter: "blur(8px)",
            zIndex: 1000,
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
                      onClick={() => openOrCreateThread(p.id)}
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
                            {subtitle(p) || "Entangled member"}
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
    </div>
  );
}

(MessagesIndexPage as any).layoutProps = {
  variant: "three",
  right: null,
};
