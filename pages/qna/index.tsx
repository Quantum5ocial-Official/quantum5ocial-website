// pages/qna/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { createPortal } from "react-dom";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type ProfileLite = {
  full_name: string | null;
  avatar_url: string | null;
};

// Supabase may return embedded relations as object OR array depending on relationship config.
type ProfileMaybe = ProfileLite | ProfileLite[] | null;

type QQuestion = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  tags: string[] | null;
  created_at: string;
  profiles?: ProfileMaybe;

  qna_answers?: { count: number }[] | null;
  qna_votes?: { count: number }[] | null;
};

type QAnswer = {
  // Normalized answer id. Can be row.id or row.answer_id depending on schema.
  id: string;

  // raw fields (if your DB uses answer_id)
  answer_id?: string;

  question_id: string;
  user_id: string;
  body: string;
  created_at: string;
  profiles?: ProfileMaybe;

  qna_answer_votes?: { count: number }[] | null;
};

type MyProfileMini = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

function BodyPortal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

function pickProfile(p: ProfileMaybe): ProfileLite | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

function pickId(row: any): string {
  return row?.id ?? row?.answer_id ?? "";
}

function timeAgo(iso: string) {
  const t = Date.parse(iso);
  const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function pillTagStyle(active: boolean) {
  return {
    fontSize: 12,
    borderRadius: 999,
    padding: "6px 10px",
    border: active ? "1px solid rgba(56,189,248,0.7)" : "1px solid rgba(148,163,184,0.45)",
    background: active ? "rgba(56,189,248,0.12)" : "rgba(15,23,42,0.55)",
    color: active ? "#7dd3fc" : "rgba(226,232,240,0.9)",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };
}

function avatarBubble(name: string, avatar_url: string | null, size = 28) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        border: "1px solid rgba(148,163,184,0.5)",
        background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#0f172a",
        fontWeight: 800,
        fontSize: Math.max(12, Math.floor(size * 0.45)),
      }}
    >
      {avatar_url ? (
        <img
          src={avatar_url}
          alt={name}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

function useIsMobile(maxWidth = 520) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(`(max-width: ${maxWidth}px)`);
    const set = () => setIsMobile(mq.matches);
    set();

    const anyMq = mq as any;
    if (mq.addEventListener) {
      mq.addEventListener("change", set);
      return () => mq.removeEventListener("change", set);
    }
    if (anyMq.addListener) {
      anyMq.addListener(set);
      return () => anyMq.removeListener(set);
    }
  }, [maxWidth]);

  return isMobile;
}

/* =========================
   Ask Composer (homepage-like)
   ========================= */

function QnAComposerStrip({ onCreated }: { onCreated: (newQ: QQuestion) => void }) {
  const router = useRouter();
  const { user, loading } = useSupabaseUser();
  const isMobile = useIsMobile(520);

  const [me, setMe] = useState<MyProfileMini | null>(null);
  const [open, setOpen] = useState(false);

  const [askTitle, setAskTitle] = useState("");
  const [askBody, setAskBody] = useState("");
  const [askTags, setAskTags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      if (!user) {
        setMe(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle<MyProfileMini>();

      if (cancelled) return;
      if (!error && data) setMe(data);
      else setMe({ id: user.id, full_name: null, avatar_url: null });
    };

    if (!loading) loadMe();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const isAuthed = !!user;
  const displayName = me?.full_name || "Member";
  const firstName = (displayName.split(" ")[0] || displayName).trim() || "Member";

  const initials =
    (me?.full_name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "U";

  const avatarNode = (
    <div
      style={{
        width: isMobile ? 36 : 40,
        height: isMobile ? 36 : 40,
        borderRadius: 999,
        overflow: "hidden",
        flexShrink: 0,
        border: "1px solid rgba(148,163,184,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
        color: "#fff",
        fontWeight: 800,
        letterSpacing: 0.5,
      }}
      aria-label="Your avatar"
      title={displayName}
    >
      {me?.avatar_url ? (
        <img src={me.avatar_url} alt={displayName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
    </div>
  );

  const openComposer = () => {
    if (!isAuthed) {
      router.push("/auth?redirect=/qna");
      return;
    }
    setOpen(true);
  };

  const closeComposer = () => setOpen(false);

  const collapsedPlaceholder = isMobile ? "Ask a question…" : `Ask the quantum community, ${firstName}…`;

  const canSubmit = !!askTitle.trim() && !!askBody.trim() && !saving;

  const submit = async () => {
    if (!user) {
      router.push("/auth?redirect=/qna");
      return;
    }

    const title = askTitle.trim();
    const body = askBody.trim();
    const tags = askTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (!title || !body) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("qna_questions")
        .insert({
          user_id: user.id,
          title,
          body,
          tags,
        })
        .select(
          `
          id, user_id, title, body, tags, created_at,
          profiles:profiles ( full_name, avatar_url ),
          qna_answers(count),
          qna_votes(count)
        `
        )
        .maybeSingle();

      if (error) {
        console.error("insert question error:", error);
        return;
      }

      if (data) {
        const normalized = { ...(data as any), profiles: pickProfile((data as any).profiles) } as QQuestion;
        onCreated(normalized);

        setAskTitle("");
        setAskBody("");
        setAskTags("");
        closeComposer();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.18)",
          background: "linear-gradient(135deg, rgba(15,23,42,0.70), rgba(15,23,42,0.86))",
          boxShadow: "0 18px 40px rgba(15,23,42,0.35)",
          padding: isMobile ? 12 : 14,
          marginTop: 14,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {avatarNode}

          <div
            style={{
              height: isMobile ? 40 : 42,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(2,6,23,0.35)",
              color: "rgba(226,232,240,0.92)",
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              userSelect: "none",
              minWidth: 0,
              flex: "1 1 260px",
            }}
            onClick={openComposer}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") openComposer();
            }}
            aria-label="Ask a question"
            title="Ask a question"
          >
            <span style={{ opacity: 0.9, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {collapsedPlaceholder}
            </span>
            <span style={{ marginLeft: "auto", opacity: 0.75, fontSize: 12, flexShrink: 0 }}>❓</span>
          </div>

          <button
            type="button"
            onClick={openComposer}
            style={{
              padding: isMobile ? "8px 12px" : "9px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              border: "none",
              background: "linear-gradient(90deg,#22d3ee,#6366f1)",
              color: "#0f172a",
              cursor: "pointer",
              boxShadow: "0 14px 35px rgba(34,211,238,0.18)",
              whiteSpace: "nowrap",
            }}
          >
            Ask
          </button>
        </div>
      </div>

      {open && (
        <BodyPortal>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.62)",
              backdropFilter: "blur(8px)",
              zIndex: 999999,
              display: "flex",
              alignItems: isMobile ? "flex-end" : "center",
              justifyContent: "center",
              padding: isMobile ? 10 : 18,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeComposer();
            }}
          >
            <div
              style={{
                width: "min(760px, 100%)",
                borderRadius: isMobile ? "18px 18px 0 0" : 18,
                border: "1px solid rgba(148,163,184,0.22)",
                background: "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,23,42,0.98))",
                boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
                overflow: "hidden",
                maxHeight: isMobile ? "86vh" : "90vh",
                display: "flex",
                flexDirection: "column",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid rgba(148,163,184,0.22)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "1px solid rgba(148,163,184,0.4)",
                    flexShrink: 0,
                  }}
                >
                  {me?.avatar_url ? (
                    <img src={me.avatar_url} alt={firstName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {firstName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{firstName}</div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>Public · Q&amp;A</div>
                </div>

                <button
                  onClick={closeComposer}
                  style={{
                    marginLeft: "auto",
                    border: "none",
                    background: "transparent",
                    color: "rgba(226,232,240,0.8)",
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto" }}>
                <input
                  value={askTitle}
                  onChange={(e) => setAskTitle(e.target.value)}
                  placeholder="Question title (be specific)"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    padding: "12px 14px",
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.6)",
                    color: "#e5e7eb",
                    fontSize: 15,
                    outline: "none",
                  }}
                />

                <textarea
                  value={askBody}
                  onChange={(e) => setAskBody(e.target.value)}
                  placeholder="Add context, details, constraints, what you already tried…"
                  rows={6}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    padding: "12px 14px",
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.6)",
                    color: "#e5e7eb",
                    fontSize: 14,
                    outline: "none",
                    resize: "vertical",
                    lineHeight: 1.5,
                  }}
                />

                <input
                  value={askTags}
                  onChange={(e) => setAskTags(e.target.value)}
                  placeholder="Tags (comma-separated) e.g. Hardware, Cryo, Careers"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    padding: "10px 12px",
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.6)",
                    color: "#e5e7eb",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(148,163,184,0.22)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  onClick={closeComposer}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.45)",
                    background: "transparent",
                    color: "rgba(226,232,240,0.9)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 999,
                    border: "none",
                    background: "linear-gradient(90deg,#22d3ee,#6366f1)",
                    color: "#0f172a",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: saving ? "default" : "pointer",
                    opacity: !canSubmit ? 0.65 : 1,
                  }}
                >
                  {saving ? "Posting…" : "Post question"}
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}
    </>
  );
}

/* =========================
   Main
   ========================= */

function QnAMiddle() {
  const router = useRouter();
  const { user } = useSupabaseUser();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QQuestion[]>([]);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // thread panel
  const [openQ, setOpenQ] = useState<QQuestion | null>(null);
  const [answers, setAnswers] = useState<QAnswer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answerBody, setAnswerBody] = useState("");
  const [answerSaving, setAnswerSaving] = useState(false);

  // vote state per user (questions)
  const [myVotes, setMyVotes] = useState<Record<string, boolean>>({});
  const [voteLoadingIds, setVoteLoadingIds] = useState<string[]>([]);
  const isVoteLoading = (qid: string) => voteLoadingIds.includes(qid);

  // vote state per user (answers)
  const [myAnswerVotes, setMyAnswerVotes] = useState<Record<string, boolean>>({});
  const [answerVoteLoadingIds, setAnswerVoteLoadingIds] = useState<string[]>([]);
  const isAnswerVoteLoading = (aid: string) => answerVoteLoadingIds.includes(aid);

  const suggestedTags = useMemo(
    () => ["Hardware", "Software", "Careers", "Cryo", "Microwave", "Qubits", "Fabrication", "Theory", "Sensing"],
    []
  );

  // Load questions
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setErr(null);

      try {
        let q = supabase
          .from("qna_questions")
          .select(
            `
            id, user_id, title, body, tags, created_at,
            profiles:profiles ( full_name, avatar_url ),
            qna_answers(count),
            qna_votes(count)
          `
          )
          .order("created_at", { ascending: false });

        const term = search.trim();
        if (term) q = q.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
        if (activeTag) q = q.contains("tags", [activeTag]);

        const { data, error } = await q.limit(100);

        if (cancelled) return;

        if (error) {
          console.error(error);
          setErr("Could not load QnA.");
          setQuestions([]);
        } else {
          const normalized = (data || []).map((row: any) => ({
            ...row,
            profiles: pickProfile(row.profiles),
          }));
          setQuestions(normalized as QQuestion[]);
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          setErr("Something went wrong while loading QnA.");
          setQuestions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [search, activeTag]);

  // Load my question votes
  useEffect(() => {
    let cancelled = false;

    const loadMyVotes = async () => {
      if (!user) {
        setMyVotes({});
        return;
      }
      const { data, error } = await supabase.from("qna_votes").select("question_id").eq("user_id", user.id);
      if (cancelled) return;
      if (error) {
        console.error("votes load error", error);
        setMyVotes({});
        return;
      }
      const map: Record<string, boolean> = {};
      (data || []).forEach((r: any) => (map[r.question_id] = true));
      setMyVotes(map);
    };

    loadMyVotes();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const openThread = async (qq: QQuestion) => {
  setOpenQ(qq);
  setAnswers([]);
  setAnswerBody("");
  setLoadingAnswers(true);
  setMyAnswerVotes({});

  try {
    // 1) Load answers (NO embedded relations)
    const { data: ad, error: ae } = await supabase
      .from("qna_answers")
      .select("id, question_id, user_id, body, created_at")
      .eq("question_id", qq.id)
      .order("created_at", { ascending: true });

    if (ae) {
      console.error("openThread answers error:", ae);
      setAnswers([]);
      return;
    }

    const baseAnswers = (ad || []).map((row: any) => ({
      ...row,
      id: pickId(row),
      profiles: null,
      qna_answer_votes: [{ count: 0 }],
    })) as QAnswer[];

    // If still empty, then it's not a UI bug — it's RLS or question_id mismatch.
    setAnswers(baseAnswers);

    if (baseAnswers.length === 0) return;

    // 2) Load profiles for the answer authors
    const authorIds = Array.from(new Set(baseAnswers.map((a) => a.user_id).filter(Boolean)));

    const { data: pd, error: pe } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .in("id", authorIds);

    if (pe) console.error("profiles load error:", pe);

    const profileMap: Record<string, ProfileLite> = {};
    (pd || []).forEach((p: any) => {
      profileMap[p.id] = { full_name: p.full_name ?? null, avatar_url: p.avatar_url ?? null };
    });

    // 3) Load all answer votes for these answers, count client-side
    const answerIds = baseAnswers.map((a) => a.id).filter(Boolean);

    const { data: vd, error: ve } = await supabase
      .from("qna_answer_votes")
      .select("answer_id, user_id")
      .in("answer_id", answerIds);

    if (ve) console.error("answer votes load error:", ve);

    const voteCount: Record<string, number> = {};
    const myVoteMap: Record<string, boolean> = {};

    (vd || []).forEach((r: any) => {
      voteCount[r.answer_id] = (voteCount[r.answer_id] || 0) + 1;
      if (user && r.user_id === user.id) myVoteMap[r.answer_id] = true;
    });

    setMyAnswerVotes(myVoteMap);

    // 4) Merge back into answers state
    setAnswers((prev) =>
      prev.map((a) => ({
        ...a,
        profiles: profileMap[a.user_id] ?? null,
        qna_answer_votes: [{ count: voteCount[a.id] ?? 0 }],
      }))
    );
  } finally {
    setLoadingAnswers(false);
  }
};
  const toggleVote = async (qid: string) => {
    if (!user) {
      router.push("/auth?redirect=/qna");
      return;
    }
    if (isVoteLoading(qid)) return;

    setVoteLoadingIds((p) => [...p, qid]);
    const already = !!myVotes[qid];

    try {
      if (already) {
        const { error } = await supabase.from("qna_votes").delete().eq("question_id", qid).eq("user_id", user.id);
        if (error) {
          console.error(error);
          return;
        }

        setMyVotes((prev) => {
          const c = { ...prev };
          delete c[qid];
          return c;
        });

        setQuestions((prev) =>
          prev.map((q) => {
            if (q.id !== qid) return q;
            const cur = Math.max(0, (q.qna_votes?.[0]?.count ?? 0) - 1);
            return { ...q, qna_votes: [{ count: cur }] as any };
          })
        );
        setOpenQ((prev) => {
          if (!prev || prev.id !== qid) return prev;
          const cur = Math.max(0, (prev.qna_votes?.[0]?.count ?? 0) - 1);
          return { ...prev, qna_votes: [{ count: cur }] as any };
        });
      } else {
        const { error } = await supabase.from("qna_votes").insert({ question_id: qid, user_id: user.id });
        if (error) {
          console.error(error);
          return;
        }

        setMyVotes((prev) => ({ ...prev, [qid]: true }));

        setQuestions((prev) =>
          prev.map((q) => {
            if (q.id !== qid) return q;
            const cur = (q.qna_votes?.[0]?.count ?? 0) + 1;
            return { ...q, qna_votes: [{ count: cur }] as any };
          })
        );
        setOpenQ((prev) => {
          if (!prev || prev.id !== qid) return prev;
          const cur = (prev.qna_votes?.[0]?.count ?? 0) + 1;
          return { ...prev, qna_votes: [{ count: cur }] as any };
        });
      }
    } finally {
      setVoteLoadingIds((p) => p.filter((x) => x !== qid));
    }
  };

  const toggleAnswerVote = async (answerId: string) => {
    if (!user) {
      router.push("/auth?redirect=/qna");
      return;
    }
    if (!answerId) return;
    if (isAnswerVoteLoading(answerId)) return;

    setAnswerVoteLoadingIds((p) => [...p, answerId]);
    const already = !!myAnswerVotes[answerId];

    try {
      if (already) {
        const { error } = await supabase
          .from("qna_answer_votes")
          .delete()
          .eq("answer_id", answerId)
          .eq("user_id", user.id);

        if (error) {
          console.error(error);
          return;
        }

        setMyAnswerVotes((prev) => {
          const c = { ...prev };
          delete c[answerId];
          return c;
        });

        setAnswers((prev) =>
          prev.map((a) => {
            if (a.id !== answerId) return a;
            const cur = Math.max(0, (a.qna_answer_votes?.[0]?.count ?? 0) - 1);
            return { ...a, qna_answer_votes: [{ count: cur }] as any };
          })
        );
      } else {
        const { error } = await supabase.from("qna_answer_votes").insert({
          answer_id: answerId,
          user_id: user.id,
        });

        if (error) {
          console.error(error);
          return;
        }

        setMyAnswerVotes((prev) => ({ ...prev, [answerId]: true }));

        setAnswers((prev) =>
          prev.map((a) => {
            if (a.id !== answerId) return a;
            const cur = (a.qna_answer_votes?.[0]?.count ?? 0) + 1;
            return { ...a, qna_answer_votes: [{ count: cur }] as any };
          })
        );
      }
    } finally {
      setAnswerVoteLoadingIds((p) => p.filter((x) => x !== answerId));
    }
  };

  const filteredTagChips = useMemo(() => {
    const fromData = new Set<string>();
    questions.forEach((q) => (q.tags || []).forEach((t) => fromData.add(t)));
    const merged = Array.from(new Set([...suggestedTags, ...Array.from(fromData)]));
    return merged.slice(0, 18);
  }, [questions, suggestedTags]);

  return (
    <section className="section">
      <div className="jobs-main-header">
        <div
          className="card"
          style={{
            padding: 16,
            background: "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), rgba(15,23,42,0.98))",
            border: "1px solid rgba(148,163,184,0.35)",
            boxShadow: "0 18px 45px rgba(15,23,42,0.8)",
          }}
        >
          <div
            className="section-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
                QnA
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(56,189,248,0.5)",
                    color: "#7dd3fc",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ fontSize: 11 }}>🧩</span>
                  <span>
                    {questions.length} question{questions.length === 1 ? "" : "s"}
                  </span>
                </span>
              </div>
              <div className="section-sub" style={{ maxWidth: 620, lineHeight: 1.45 }}>
                Ask questions, share answers, and build signal in the quantum ecosystem.
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <Link href="/community" className="section-link" style={{ fontSize: 13 }}>
                Explore community →
              </Link>
            </div>
          </div>

          <QnAComposerStrip
            onCreated={(newQ) => {
              setQuestions((prev) => [newQ, ...prev]);
            }}
          />

          {/* Search */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 6, paddingLeft: 4 }}>Search questions</div>

            <div className="jobs-main-search">
              <div
                style={{
                  width: "100%",
                  borderRadius: 999,
                  padding: 2,
                  background: "linear-gradient(90deg, rgba(56,189,248,0.7), rgba(129,140,248,0.7))",
                }}
              >
                <div
                  style={{
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.97)",
                    padding: "9px 13px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span style={{ fontSize: 14, opacity: 0.9 }}>🔎</span>
                  <input
                    style={{
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      color: "#e5e7eb",
                      fontSize: 14,
                      width: "100%",
                    }}
                    placeholder="Type to search by title or content… (e.g. cryo wiring, resonator Q, fabrication)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />

                  {!!search.trim() && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      style={{
                        border: "1px solid rgba(148,163,184,0.5)",
                        background: "transparent",
                        color: "rgba(226,232,240,0.9)",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Clear ✕
                    </button>
                  )}

                  {activeTag && (
                    <button
                      type="button"
                      onClick={() => setActiveTag(null)}
                      style={{
                        border: "1px solid rgba(148,163,184,0.5)",
                        background: "transparent",
                        color: "rgba(226,232,240,0.9)",
                        borderRadius: 999,
                        padding: "6px 10px",
                        fontSize: 12,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Clear tag ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tag chips */}
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {filteredTagChips.map((t) => (
              <span key={t} onClick={() => setActiveTag((prev) => (prev === t ? null : t))} style={pillTagStyle(activeTag === t)}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {loading && <div className="products-status">Loading QnA…</div>}
      {err && !loading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {err}
        </div>
      )}

      {!loading && !err && questions.length === 0 && (
        <div className="products-empty">No questions yet. Be the first to ask something (hardware, qubits, fabrication, careers…).</div>
      )}

      {!loading && !err && questions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16 }}>
          {questions.map((q) => {
            const p = pickProfile(q.profiles);
            const author = p?.full_name || "Quantum5ocial member";
            const votes = q.qna_votes?.[0]?.count ?? 0;
            const ansCount = q.qna_answers?.[0]?.count ?? 0;
            const mine = !!myVotes[q.id];

            return (
              <div
                key={q.id}
                className="card"
                style={{
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 220,
                  cursor: "pointer",
                }}
                onClick={() => openThread(q)}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      {avatarBubble(author, p?.avatar_url || null, 30)}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {author}
                        </div>
                        <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)", marginTop: 2 }}>{timeAgo(q.created_at)} ago</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVote(q.id);
                        }}
                        disabled={isVoteLoading(q.id)}
                        style={{
                          borderRadius: 12,
                          padding: "7px 10px",
                          border: mine ? "1px solid rgba(34,211,238,0.8)" : "1px solid rgba(148,163,184,0.45)",
                          background: mine ? "rgba(34,211,238,0.12)" : "rgba(15,23,42,0.6)",
                          color: mine ? "#7dd3fc" : "rgba(226,232,240,0.9)",
                          cursor: isVoteLoading(q.id) ? "default" : "pointer",
                          fontSize: 12,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          opacity: isVoteLoading(q.id) ? 0.7 : 1,
                        }}
                        title={mine ? "Remove upvote" : "Upvote"}
                      >
                        ▲ {votes}
                      </button>

                      <div
                        style={{
                          borderRadius: 12,
                          padding: "7px 10px",
                          border: "1px solid rgba(148,163,184,0.45)",
                          background: "rgba(15,23,42,0.6)",
                          color: "rgba(226,232,240,0.9)",
                          fontSize: 12,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                        title="Answers"
                      >
                        💬 {ansCount}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}>{q.title}</div>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 12,
                      color: "rgba(148,163,184,0.95)",
                      lineHeight: 1.45,
                      maxHeight: 68,
                      overflow: "hidden",
                    }}
                  >
                    {q.body}
                  </div>

                  {(q.tags || []).length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {(q.tags || []).slice(0, 5).map((t) => (
                        <span
                          key={t}
                          style={{
                            fontSize: 11,
                            borderRadius: 999,
                            padding: "4px 8px",
                            border: "1px solid rgba(148,163,184,0.45)",
                            background: "rgba(15,23,42,0.55)",
                            color: "rgba(226,232,240,0.9)",
                          }}
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 12, fontSize: 12, color: "#7dd3fc" }}>
                  Open thread <span>›</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* THREAD PANEL */}
      {openQ && (
        <div
          onClick={closeThread}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.55)",
            zIndex: 80,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 92vw)",
              height: "100%",
              borderRadius: 0,
              borderLeft: "1px solid rgba(148,163,184,0.35)",
              background: "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,1))",
              boxShadow: "-10px 0 40px rgba(15,23,42,0.85)",
              padding: 16,
              overflow: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>Thread</div>
              <button
                type="button"
                onClick={closeThread}
                style={{
                  border: "1px solid rgba(148,163,184,0.45)",
                  background: "transparent",
                  color: "rgba(226,232,240,0.9)",
                  borderRadius: 12,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.25 }}>{openQ.title}</div>
              <div style={{ marginTop: 8, fontSize: 13, color: "rgba(226,232,240,0.92)", lineHeight: 1.55 }}>{openQ.body}</div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => toggleVote(openQ.id)}
                  disabled={isVoteLoading(openQ.id)}
                  style={{
                    borderRadius: 12,
                    padding: "7px 10px",
                    border: myVotes[openQ.id] ? "1px solid rgba(34,211,238,0.8)" : "1px solid rgba(148,163,184,0.45)",
                    background: myVotes[openQ.id] ? "rgba(34,211,238,0.12)" : "rgba(15,23,42,0.6)",
                    color: myVotes[openQ.id] ? "#7dd3fc" : "rgba(226,232,240,0.9)",
                    cursor: isVoteLoading(openQ.id) ? "default" : "pointer",
                    fontSize: 12,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: isVoteLoading(openQ.id) ? 0.7 : 1,
                  }}
                >
                  ▲ {openQ.qna_votes?.[0]?.count ?? 0}
                </button>

                {(openQ.tags || []).map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11,
                      borderRadius: 999,
                      padding: "4px 8px",
                      border: "1px solid rgba(148,163,184,0.45)",
                      background: "rgba(15,23,42,0.55)",
                      color: "rgba(226,232,240,0.9)",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 16, borderTop: "1px solid rgba(148,163,184,0.22)", paddingTop: 12 }}>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "rgba(148,163,184,0.9)",
                  marginBottom: 10,
                }}
              >
                Answers ({openQ.qna_answers?.[0]?.count ?? answers.length})
              </div>

              {loadingAnswers ? (
                <div className="products-status">Loading answers…</div>
              ) : answers.length === 0 ? (
                <div className="products-empty">No answers yet. Be the first to help.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {answers.map((a) => {
                    const p = pickProfile(a.profiles);
                    const name = p?.full_name || "Quantum5ocial member";
                    const aid = a.id;
                    const mine = !!myAnswerVotes[aid];
                    const v = a.qna_answer_votes?.[0]?.count ?? 0;

                    return (
                      <div
                        key={aid}
                        className="card"
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: "rgba(2,6,23,0.35)",
                          border: "1px solid rgba(148,163,184,0.22)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            {avatarBubble(name, p?.avatar_url || null, 26)}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 800 }}>{name}</div>
                              <div style={{ fontSize: 11, color: "rgba(148,163,184,0.95)", marginTop: 2 }}>{timeAgo(a.created_at)} ago</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleAnswerVote(aid)}
                            disabled={isAnswerVoteLoading(aid)}
                            style={{
                              borderRadius: 12,
                              padding: "7px 10px",
                              border: mine ? "1px solid rgba(34,211,238,0.8)" : "1px solid rgba(148,163,184,0.35)",
                              background: mine ? "rgba(34,211,238,0.12)" : "rgba(15,23,42,0.55)",
                              color: mine ? "#7dd3fc" : "rgba(226,232,240,0.9)",
                              cursor: isAnswerVoteLoading(aid) ? "default" : "pointer",
                              fontSize: 12,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              opacity: isAnswerVoteLoading(aid) ? 0.7 : 1,
                            }}
                            title={mine ? "Remove upvote" : "Upvote answer"}
                          >
                            ▲ {v}
                          </button>
                        </div>

                        <div style={{ marginTop: 8, fontSize: 13, lineHeight: 1.55, color: "rgba(226,232,240,0.92)" }}>{a.body}</div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add answer */}
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(148,163,184,0.9)",
                    marginBottom: 6,
                  }}
                >
                  Your answer
                </div>

                <textarea
                  value={answerBody}
                  onChange={(e) => setAnswerBody(e.target.value)}
                  placeholder={user ? "Write a helpful answer…" : "Login to answer…"}
                  rows={4}
                  disabled={!user}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    padding: "10px 12px",
                    border: "1px solid rgba(148,163,184,0.45)",
                    background: "rgba(15,23,42,0.65)",
                    color: "#e5e7eb",
                    outline: "none",
                    resize: "vertical",
                    opacity: user ? 1 : 0.65,
                  }}
                />

                <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 10 }}>
                  {!user ? (
                    <button
                      type="button"
                      onClick={() => router.push("/auth?redirect=/qna")}
                      style={{
                        padding: "9px 14px",
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 800,
                        border: "none",
                        background: "linear-gradient(90deg,#22d3ee,#6366f1)",
                        color: "#0f172a",
                        cursor: "pointer",
                      }}
                    >
                      Login to answer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddAnswer}
                      disabled={answerSaving || !answerBody.trim()}
                      style={{
                        padding: "9px 14px",
                        borderRadius: 12,
                        fontSize: 13,
                        fontWeight: 800,
                        border: "none",
                        background: "linear-gradient(90deg,#22d3ee,#6366f1)",
                        color: "#0f172a",
                        cursor: answerSaving ? "default" : "pointer",
                        opacity: answerSaving || !answerBody.trim() ? 0.65 : 1,
                      }}
                    >
                      {answerSaving ? "Posting…" : "Post answer"}
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 18, fontSize: 12, color: "rgba(148,163,184,0.9)" }}>
              Tip: keep answers specific — include links, papers, and measured values when possible.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default function QnAPage() {
  return <QnAMiddle />;
}

(QnAPage as any).layoutProps = {
  variant: "two-left",
  right: null,
  mobileMain: <QnAMiddle />,
};
