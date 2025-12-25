// pages/qna/index.tsx
'use client'; // this page uses client hooks, state, etc.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useSupabaseUser } from '../../lib/useSupabaseUser';

// components to split out
import QuestionsGrid from '../../components/qna/QuestionsGrid';
import ThreadPanel from '../../components/qna/ThreadPanel';

/* =========================
   Types
   ========================= */

export type ProfileLite = {
  id?: string;
  full_name: string | null;
  avatar_url: string | null;
};

// Supabase relation may return object OR array depending on config
export type ProfileMaybe = ProfileLite | ProfileLite[] | null;

export type QQuestion = {
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

export type QAnswer = {
  id: string;
  question_id: string;
  user_id: string;
  body: string;
  created_at: string;

  // attached manually
  profile?: ProfileLite | null;

  qna_answer_votes?: { count: number }[] | null;
};

export type MyProfileMini = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

/* =========================
   Helpers (kept minimal here)
   ========================= */

function pickProfile(p: ProfileMaybe): ProfileLite | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

/* =========================
   Main page
   ========================= */

export default function QnAPage() {
  const router = useRouter();
  const { user } = useSupabaseUser();

  // deep-link focus support: /qna?focus=<question_id>&answer=<answer_id>
  const focusQid =
    typeof router.query.focus === 'string' ? router.query.focus : null;
  const focusAid =
    typeof router.query.answer === 'string' ? router.query.answer : null;

  /* -------- shared state -------- */

  const [questions, setQuestions] = useState<QQuestion[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [questionsError, setQuestionsError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // votes
  const [myVotes, setMyVotes] = useState<Record<string, boolean>>({});
  const [voteLoadingIds, setVoteLoadingIds] = useState<string[]>([]);
  const isVoteLoading = (qid: string) => voteLoadingIds.includes(qid);

  /* -------- thread panel -------- */

  const [openQ, setOpenQ] = useState<QQuestion | null>(null);
  const [answers, setAnswers] = useState<QAnswer[]>([]);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [answerBody, setAnswerBody] = useState('');
  const [answerSaving, setAnswerSaving] = useState(false);
  const [myAnswerVotes, setMyAnswerVotes] = useState<Record<string, boolean>>(
    {}
  );
  const [answerVoteLoadingIds, setAnswerVoteLoadingIds] = useState<string[]>([]);
  const isAnswerVoteLoading = (aid: string) =>
    answerVoteLoadingIds.includes(aid);

  // refs for scroll-to-focus
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const answerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const didAutoFocusQuestionRef = useRef(false);
  const didAutoFocusAnswerRef = useRef(false);

  /* -------- load questions -------- */

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoadingQuestions(true);
      setQuestionsError(null);

      try {
        let q = supabase
          .from('qna_questions')
          .select(
            `
            id, user_id, title, body, tags, created_at,
            profiles:profiles ( full_name, avatar_url ),
            qna_answers(count),
            qna_votes(count)
          `
          )
          .order('created_at', { ascending: false });

        const term = search.trim();
        if (term) q = q.or(`title.ilike.%${term}%,body.ilike.%${term}%`);
        if (activeTag) q = q.contains('tags', [activeTag]);

        const { data, error } = await q.limit(100);

        if (cancelled) return;

        if (error) {
          console.error('questions load error:', error);
          setQuestionsError('Could not load QnA.');
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
          setQuestionsError('Something went wrong while loading QnA.');
          setQuestions([]);
        }
      } finally {
        if (!cancelled) setLoadingQuestions(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [search, activeTag]);

  /* -------- load my question votes -------- */

  useEffect(() => {
    let cancelled = false;

    const loadMyVotes = async () => {
      if (!user) {
        setMyVotes({});
        return;
      }
      const { data, error } = await supabase
        .from('qna_votes')
        .select('question_id')
        .eq('user_id', user.id);

      if (cancelled) return;

      if (error) {
        console.error('votes load error:', error);
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

  /* -------- thread open / close & answer handling -------- */

  const openThread = async (qq: QQuestion) => {
    setOpenQ(qq);
    setAnswers([]);
    setAnswerBody('');
    setLoadingAnswers(true);
    setMyAnswerVotes({});
    didAutoFocusAnswerRef.current = false;
    answerRefs.current = {};

    try {
      const { data: ans, error: ansErr } = await supabase
        .from('qna_answers')
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
        .eq('question_id', qq.id)
        .order('created_at', { ascending: true });

      if (ansErr) {
        console.error('openThread answers error:', ansErr);
        setAnswers([]);
        return;
      }

      const baseAnswers = (ans || []) as any[];

      // Fetch profiles manually
      const userIds = Array.from(
        new Set(baseAnswers.map((a) => a.user_id).filter(Boolean))
      );

      let profileMap: Record<string, ProfileLite> = {};
      if (userIds.length > 0) {
        const { data: profs, error: profErr } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        if (profErr) {
          console.error('profiles fetch error:', profErr);
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

      // Load my votes for answers in this thread
      if (user && normalized.length > 0) {
        const ids = normalized.map((a) => a.id).filter(Boolean);

        const { data: vd, error: ve } = await supabase
          .from('qna_answer_votes')
          .select('answer_id')
          .eq('user_id', user.id)
          .in('answer_id', ids);

        if (ve) {
          console.error('answer votes load error:', ve);
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
    setAnswerBody('');
    setMyAnswerVotes({});
  };

  /* -------- auto-focus logic -------- */

  useEffect(() => {
    if (!focusQid) return;
    if (loadingQuestions || questionsError) return;
    if (didAutoFocusQuestionRef.current) return;

    const q = questions.find((x) => x.id === focusQid);
    if (!q) return;

    didAutoFocusQuestionRef.current = true;

    // scroll the card into view first (if present), then open thread
    const el = questionRefs.current[focusQid];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // open the thread
    openThread(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusQid, loadingQuestions, questionsError, questions]);

  useEffect(() => {
    if (!focusAid) return;
    if (!openQ) return;
    if (openQ.id !== focusQid) return;
    if (loadingAnswers) return;
    if (didAutoFocusAnswerRef.current) return;

    const t = window.setTimeout(() => {
      const el = answerRefs.current[focusAid];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      didAutoFocusAnswerRef.current = true;
    }, 60);

    return () => window.clearTimeout(t);
  }, [focusAid, focusQid, openQ, loadingAnswers]);

  /* -------- vote toggles & answer posting -------- */

  const toggleVote = async (qid: string) => {
    if (!user) {
      router.push('/auth?redirect=/qna');
      return;
    }
    if (isVoteLoading(qid)) return;

    setVoteLoadingIds((p) => [...p, qid]);
    const already = !!myVotes[qid];

    try {
      if (already) {
        const { error } = await supabase
          .from('qna_votes')
          .delete()
          .eq('question_id', qid)
          .eq('user_id', user.id);
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
          .from('qna_votes')
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

  const toggleAnswerVote = async (answerId: string) => {
    if (!user) {
      router.push('/auth?redirect=/qna');
      return;
    }
    if (!answerId) return;
    if (isAnswerVoteLoading(answerId)) return;

    setAnswerVoteLoadingIds((p) => [...p, answerId]);
    const already = !!myAnswerVotes[answerId];

    try {
      if (already) {
        const { error } = await supabase
          .from('qna_answer_votes')
          .delete()
          .eq('answer_id', answerId)
          .eq('user_id', user.id);
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
          .from('qna_answer_votes')
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

  const handleAddAnswer = async () => {
    if (!user) {
      router.push('/auth?redirect=/qna');
      return;
    }
    if (!openQ) return;

    const body = answerBody.trim();
    if (!body) return;

    setAnswerSaving(true);
    try {
      const { data, error } = await supabase
        .from('qna_answers')
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
        console.error('insert answer error:', error);
        return;
      }

      if (data) {
        const { data: myP } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', user.id)
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
        setAnswerBody('');

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

  /* -------- suggested tags (for QuestionsGrid) -------- */

  const suggestedTags = useMemo(
    () => [
      'Hardware',
      'Software',
      'Careers',
      'Cryo',
      'Microwave',
      'Qubits',
      'Fabrication',
      'Theory',
      'Sensing',
    ],
    []
  );

  const filteredTagChips = useMemo(() => {
    const fromData = new Set<string>();
    questions.forEach((q) => (q.tags || []).forEach((t) => fromData.add(t)));
    const merged = Array.from(
      new Set([...suggestedTags, ...Array.from(fromData)])
    );
    return merged.slice(0, 18);
  }, [questions, suggestedTags]);

  /* -------- render -------- */

  return (
    <section className="section">
      {/* header + composer + search + tags are inside QuestionsGrid */}
      <QuestionsGrid
        questions={questions}
        loading={loadingQuestions}
        error={questionsError}
        search={search}
        setSearch={setSearch}
        activeTag={activeTag}
        setActiveTag={setActiveTag}
        filteredTagChips={filteredTagChips}
        myVotes={myVotes}
        isVoteLoading={isVoteLoading}
        toggleVote={toggleVote}
        openThread={openThread}
        questionRefs={questionRefs}
      />

      {openQ && (
        <ThreadPanel
          question={openQ}
          answers={answers}
          loadingAnswers={loadingAnswers}
          answerBody={answerBody}
          setAnswerBody={setAnswerBody}
          answerSaving={answerSaving}
          handleAddAnswer={handleAddAnswer}
          myVotes={myVotes}
          isVoteLoading={isVoteLoading}
          toggleVote={toggleVote}
          myAnswerVotes={myAnswerVotes}
          isAnswerVoteLoading={isAnswerVoteLoading}
          toggleAnswerVote={toggleAnswerVote}
          closeThread={closeThread}
          answerRefs={answerRefs}
          focusQid={focusQid}
          focusAid={focusAid}
        />
      )}
    </section>
  );
}
