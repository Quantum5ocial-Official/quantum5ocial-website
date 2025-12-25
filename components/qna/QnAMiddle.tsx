import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import type { QQuestion, QAnswer, ProfileLite } from "../../types/qna";

import { QnAComposerStrip } from "./QnAComposerStrip";
import {
  pickProfile,
  timeAgo,
  pillTagStyle,
  avatarBubble,
  useIsMobile,
} from "../../lib/qnaHelpers";

export default function QnAMiddle() {
  const router = useRouter();
  const { user } = useSupabaseUser();

  const focusQid =
    typeof router.query.focus === "string" ? router.query.focus : null;
  const focusAid =
    typeof router.query.answer === "string" ? router.query.answer : null;

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [questions, setQuestions] = useState<QQuestion[]>([]);
  const [search, setSearch] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // thread
  const [openQ, setOpenQ] = useState<QQuestion | null>(null);
  const [answers, setAnswers] = useState<QAnswer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answerBody, setAnswerBody] = useState("");
  const [answerSaving, setAnswerSaving] = useState(false);

  // votes (questions)
  const [myVotes, setMyVotes] = useState<Record<string, boolean>>({});
  const [voteLoadingIds, setVoteLoadingIds] = useState<string[]>([]);
  const isVoteLoading = (qid: string) => voteLoadingIds.includes(qid);

  // votes (answers)
  const [myAnswerVotes, setMyAnswerVotes] = useState<Record<string, boolean>>(
    {}
  );
  const [answerVoteLoadingIds, setAnswerVoteLoadingIds] = useState<string[]>(
    []
  );
  const isAnswerVoteLoading = (aid: string) =>
    answerVoteLoadingIds.includes(aid);

  // refs for scroll-to-focus
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const answerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const didAutoFocusQuestionRef = useRef(false);
  const didAutoFocusAnswerRef = useRef(false);

  const suggestedTags = useMemo(
    () => [
      "Hardware",
      "Software",
      "Careers",
      "Cryo",
      "Microwave",
      "Qubits",
      "Fabrication",
      "Theory",
      "Sensing",
    ],
    []
  );

  // ---------- load questions ----------
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
          console.error("questions load error:", error);
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

  // ---------- load my question votes ----------
  useEffect(() => {
    let cancelled = false;

    const loadMyVotes = async () => {
      if (!user) {
        setMyVotes({});
        return;
      }
      const { data, error } = await supabase
        .from("qna_votes")
        .select("question_id")
        .eq("user_id", user.id);

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

  // ---------- open thread ----------
  const openThread = async (qq: QQuestion) => {
    setOpenQ(qq);
    setAnswers([]);
    setAnswerBody("");
    setLoadingAnswers(true);
    setMyAnswerVotes({});
    didAutoFocusAnswerRef.current = false;
    answerRefs.current = {};

    try {
      const { data: ans, error: ansErr } = await supabase
        .from("qna_answers")
        .select(
          `
          id,
          question_id,
          user_id,
          body,
          created_at,
          qna_answer_votes(count)
        `
        )
        .eq("question_id", qq.id)
        .order("created_at", { ascending: true });

      if (ansErr) {
        console.error("openThread answers error:", ansErr);
        setAnswers([]);
        return;
      }

      const baseAnswers = (ans || []) as any[];

      // fetch profiles
      const userIds = Array.from(
        new Set(baseAnswers.map((a) => a.user_id).filter(Boolean))
      );
      let profileMap: Record<string, ProfileLite> = {};
      if (userIds.length > 0) {
        const { data: profs, error: profErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        if (profErr) {
          console.error("profiles fetch error:", profErr);
        } else {
          (profs || []).forEach((p: any) => {
            profileMap[p.id] = {
              id: p.id,
              full_name: p.full_name ?? null,
              avatar_url: p.avatar_url ?? null,
            };
          });
        }
      }

      const normalized: QAnswer[] = baseAnswers.map((row: any) => ({
        id: row.id,
        question_id: row.question_id,
        user_id: row.user_id,
        body: row.body,
        created_at: row.created_at,
        qna_answer_votes: row.qna_answer_votes ?? null,
        profile: profileMap[row.user_id] ?? null,
      }));

      setAnswers(normalized);

      // load my answer votes
      if (user && normalized.length > 0) {
        const ids = normalized.map((a) => a.id).filter(Boolean);

        const { data: vd, error: ve } = await supabase
          .from("qna_answer_votes")
          .select("answer_id")
          .eq("user_id", user.id)
          .in("answer_id", ids);

        if (ve) {
          console.error("answer votes load error", ve);
        } else {
          const map: Record<string, boolean> = {};
          (vd || []).forEach((r: any) => (map[r.answer_id] = true));
          setMyAnswerVotes(map);
        }
      }
    } finally {
      setLoadingAnswers(false);
    }
  };

  const closeThread = () => {
    setOpenQ(null);
    setAnswers([]);
    setAnswerBody("");
    setMyAnswerVotes({});
  };

  // ---------- auto-focus QA ----------
  useEffect(() => {
    if (!focusQid) return;
    if (loading || err) return;
    if (didAutoFocusQuestionRef.current) return;

    const q = questions.find((x) => x.id === focusQid);
    if (!q) return;

    didAutoFocusQuestionRef.current = true;

    const el = questionRefs.current[focusQid];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    openThread(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusQid, loading, err, questions]);

  useEffect(() => {
    if (!focusAid) return;
    if (!openQ) return;
    if (openQ.id !== focusQid) return;
    if (loadingAnswers) return;
    if (didAutoFocusAnswerRef.current) return;

    const t = window.setTimeout(() => {
      const el = answerRefs.current[focusAid];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      didAutoFocusAnswerRef.current = true;
    }, 60);

    return () => window.clearTimeout(t);
  }, [focusAid, focusQid, openQ, loadingAnswers]);

  // ---------- add answer ----------
  const handleAddAnswer = async () => {
    if (!user) {
      router.push("/auth?redirect=/qna");
      return;
    }
    if (!openQ) return;

    const body = answerBody.trim();
    if (!body) return;

    setAnswerSaving(true);
    try {
      const { data, error } = await supabase
        .from("qna_answers")
        .insert({
          question_id: openQ.id,
          user_id: user.id,
          body,
        })
        .select(
          `
          id,
          question_id,
          user_id,
          body,
          created_at,
          qna_answer_votes(count)
        `
        )
        .maybeSingle();

      if (error) {
        console.error("insert answer error:", error);
        return;
      }

      if (data) {
        const { data: myP } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        const normalized: QAnswer = {
          id: (data as any).id,
          question_id: (data as any).question_id,
          user_id: (data as any).user_id,
          body: (data as any).body,
          created_at: (data as any).created_at,
          qna_answer_votes: (data as any).qna_answer_votes ?? null,
          profile: myP
            ? {
                id: myP.id,
                full_name: myP.full_name ?? null,
                avatar_url: myP.avatar_url ?? null,
              }
            : null,
        };

        setAnswers((prev) => [...prev, normalized]);
        setAnswerBody("");

        // bump answer count locally
        setQuestions((prev) =>
          prev.map((q) => {
            if (q.id !== openQ.id) return q;
            const cur = (q.qna_answers?.[0]?.count ?? 0) + 1;
            return { ...q, qna_answers: [{ count: cur }] as any };
          })
        );

        setOpenQ((prev) => {
          if (!prev) return prev;
          const cur = (prev.qna_answers?.[0]?.count ?? 0) + 1;
          return { ...prev, qna_answers: [{ count: cur }] as any };
        });
      }
    } finally {
      setAnswerSaving(false);
    }
  };

  // ---------- toggle question vote ----------
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
        const { error } = await supabase
          .from("qna_votes")
          .delete()
          .eq("question_id", qid)
          .eq("user_id", user.id);
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
        const { error } = await supabase
          .from("qna_votes")
          .insert({ question_id: qid, user_id: user.id });
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

  // ---------- toggle answer vote ----------
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
        const { error } = await supabase
          .from("qna_answer_votes")
          .insert({ answer_id: answerId, user_id: user.id });
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
    const merged = Array.from(
      new Set([...suggestedTags, ...Array.from(fromData)])
    );
    return merged.slice(0, 18);
  }, [questions, suggestedTags]);

  const isMobile = useIsMobile(520);

  return (
    <section className="section">
      {/* Header + Composer */}
      <div className="jobs-main-header">
        <div
          className="card"
          style={{
            padding: 16,
            background:
              "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), rgba(15,23,42,0.98))",
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
              <div
                className="section-title"
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
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
                    {questions.length} question
                    {questions.length === 1 ? "" : "s"}
                  </span>
                </span>
              </div>
              <div
                className="section-sub"
                style={{ maxWidth: 620, lineHeight: 1.45 }}
              >
                Ask questions, share answers, and build signal in the quantum
                ecosystem.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/community"
                className="section-link"
                style={{ fontSize: 13 }}
              >
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
            <div
              style={{
                fontSize: 12,
                opacity: 0.85,
                marginBottom: 6,
                paddingLeft: 4,
              }}
            >
              Search questions
            </div>

            <div className="jobs-main-search">
              <div
                style={{
                  width: "100%",
                  borderRadius: 999,
                  padding: 2,
                  background:
                    "linear-gradient(90deg, rgba(56,189,248,0.7), rgba(129,140,248,0.7))",
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
          <div
            style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            {filteredTagChips.map((t) => (
              <span
                key={t}
                onClick={() => setActiveTag((prev) => (prev === t ? null : t))}
                style={pillTagStyle(activeTag === t)}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* status / empty */}
      {loading && <div className="products-status">Loading QnA…</div>}
      {err && !loading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {err}
        </div>
      )}
      {!loading && !err && questions.length === 0 && (
        <div className="products-empty">
          No questions yet. Be the first to ask something (hardware, qubits,
          fabrication, careers…).
        </div>
      )}

      {/* grid of questions */}
      {!loading && !err && questions.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 16,
          }}
        >
          {questions.map((q) => {
            const p = pickProfile(q.profiles);
            const author = p?.full_name || "Quantum5ocial member";
            const votes = q.qna_votes?.[0]?.count ?? 0;
            const ansCount = q.qna_answers?.[0]?.count ?? 0;
            const mine = !!myVotes[q.id];

            const isFocused = !!focusQid && q.id === focusQid;

            return (
              <div
                key={q.id}
                ref={(el) => {
                  questionRefs.current[q.id] = el;
                }}
                className="card"
                style={{
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 220,
                  cursor: "pointer",
                  border: isFocused
                    ? "1px solid rgba(56,189,248,0.85)"
                    : undefined,
                  background: isFocused
                    ? "radial-gradient(circle at top left, rgba(34,211,238,0.16), rgba(15,23,42,0.98))"
                    : undefined,
                  boxShadow: isFocused
                    ? "0 0 0 2px rgba(56,189,248,0.15), 0 18px 45px rgba(15,23,42,0.75)"
                    : undefined,
                }}
                onClick={() => openThread(q)}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        minWidth: 0,
                      }}
                    >
                      {avatarBubble(author, p?.avatar_url || null, 30)}
                      <div style={{ minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {author}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "rgba(148,163,184,0.95)",
                            marginTop: 2,
                          }}
                        >
                          {timeAgo(q.created_at)} ago
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: isMobile ? 6 : 8,
                        alignItems: "center",
                      }}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleVote(q.id);
                        }}
                        disabled={isVoteLoading(q.id)}
                        style={{
                          borderRadius: 12,
                          padding: isMobile ? "4px 7px" : "7px 10px",
                          border: mine
                            ? "1px solid rgba(34,211,238,0.8)"
                            : "1px solid rgba(148,163,184,0.45)",
                          background: mine
                            ? "rgba(34,211,238,0.12)"
                            : "rgba(15,23,42,0.6)",
                          color: mine ? "#7dd3fc" : "rgba(226,232,240,0.9)",
                          cursor: isVoteLoading(q.id) ? "default" : "pointer",
                          fontSize: isMobile ? 10 : 12,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: isMobile ? 4 : 6,
                          opacity: isVoteLoading(q.id) ? 0.7 : 1,
                        }}
                        title={mine ? "Remove upvote" : "Upvote"}
                      >
                        ▲ {votes}
                      </button>

                      <div
                        style={{
                          borderRadius: 12,
                          padding: isMobile ? "4px 7px" : "7px 10px",
                          border: "1px solid rgba(148,163,184,0.45)",
                          background: "rgba(15,23,42,0.6)",
                          color: "rgba(226,232,240,0.9)",
                          fontSize: isMobile ? 10 : 12,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: isMobile ? 4 : 6,
                        }}
                        title="Answers"
                      >
                        💬 {ansCount}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.25 }}
                  >
                    {q.title}
                  </div>

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
                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                      }}
                    >
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

      {/* Thread panel */}
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
              background:
                "linear-gradient(135deg, rgba(15,23,42,0.98), rgba(15,23,42,1))",
              boxShadow: "-10px 0 40px rgba(15,23,42,0.85)",
              padding: 16,
              overflow: "auto",
            }}
          >
            {/* thread header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 800 }}>
                Thread{" "}
                {focusQid && openQ.id === focusQid ? (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      padding: "3px 8px",
                      borderRadius: 999,
                      border: "1px solid rgba(56,189,248,0.45)",
                      background: "rgba(56,189,248,0.12)",
                      color: "#7dd3fc",
                      verticalAlign: "middle",
                    }}
                  >
                    Focused
                  </span>
                ) : null}
              </div>
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

            {/* thread content */}
            <div style={{ marginTop: 12 }}>
              <div
                style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.25 }}
              >
                {openQ.title}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "rgba(226,232,240,0.92)",
                  lineHeight: 1.55,
                }}
              >
                {openQ.body}
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => toggleVote(openQ.id)}
                  disabled={isVoteLoading(openQ.id)}
                  style={{
                    borderRadius: 12,
                    padding: "7px 10px",
                    border: myVotes[openQ.id]
                      ? "1px solid rgba(34,211,238,0.8)"
                      : "1px solid rgba(148,163,184,0.45)",
                    background: myVotes[openQ.id]
                      ? "rgba(34,211,238,0.12)"
                      : "rgba(15,23,42,0.6)",
                    color: myVotes[openQ.id]
                      ? "#7dd3fc"
                      : "rgba(226,232,240,0.9)",
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

            {/* answers list */}
            <div
              style={{
                marginTop: 16,
                borderTop: "1px solid rgba(148,163,184,0.22)",
                paddingTop: 12,
              }}
            >
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
                <div className="products-empty">
                  No answers yet. Be the first to help.
                </div>
              ) : (
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {answers.map((a) => {
                    const name =
                      a.profile?.full_name || "Quantum5ocial member";
                    const aid = a.id;
                    const mine = !!myAnswerVotes[aid];
                    const v = a.qna_answer_votes?.[0]?.count ?? 0;
                    const isFocusedAnswer = !!focusAid && aid === focusAid;

                    return (
                      <div
                        key={aid}
                        ref={(el) => {
                          answerRefs.current[aid] = el;
                        }}
                        className="card"
                        style={{
                          padding: 12,
                          borderRadius: 14,
                          background: isFocusedAnswer
                            ? "radial-gradient(circle at top left, rgba(34,211,238,0.16), rgba(2,6,23,0.35))"
                            : "rgba(2,6,23,0.35)",
                          border: isFocusedAnswer
                            ? "1px solid rgba(56,189,248,0.75)"
                            : "1px solid rgba(148,163,184,0.22)",
                          boxShadow: isFocusedAnswer
                            ? "0 0 0 2px rgba(56,189,248,0.12)"
                            : undefined,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              minWidth: 0,
                            }}
                          >
                            {avatarBubble(name, a.profile?.avatar_url || null, 26)}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 800 }}>
                                {name}
                                {isFocusedAnswer ? (
                                  <span
                                    style={{
                                      marginLeft: 8,
                                      fontSize: 10.5,
                                      padding: "2px 7px",
                                      borderRadius: 999,
                                      border: "1px solid rgba(56,189,248,0.45)",
                                      background: "rgba(56,189,248,0.12)",
                                      color: "#7dd3fc",
                                      verticalAlign: "middle",
                                    }}
                                  >
                                    Focus
                                  </span>
                                ) : null}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  color: "rgba(148,163,184,0.95)",
                                  marginTop: 2,
                                }}
                              >
                                {timeAgo(a.created_at)} ago
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleAnswerVote(aid)}
                            disabled={isAnswerVoteLoading(aid)}
                            style={{
                              borderRadius: 12,
                              padding: "7px 10px",
                              border: mine
                                ? "1px solid rgba(34,211,238,0.8)"
                                : "1px solid rgba(148,163,184,0.35)",
                              background: mine
                                ? "rgba(34,211,238,0.12)"
                                : "rgba(15,23,42,0.55)",
                              color: mine ? "#7dd3fc" : "rgba(226,232,240,0.9)",
                              cursor: isAnswerVoteLoading(aid)
                                ? "default"
                                : "pointer",
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

                        <div
                          style={{
                            marginTop: 8,
                            fontSize: 13,
                            lineHeight: 1.55,
                            color: "rgba(226,232,240,0.92)",
                          }}
                        >
                          {a.body}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* add answer form */}
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

                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 10,
                  }}
                >
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

            {/* tip */}
            <div
              style={{
                marginTop: 18,
                fontSize: 12,
                color: "rgba(148,163,184,0.9)",
              }}
            >
              Tip: keep answers specific — include links, papers, and measured
              values when possible.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
