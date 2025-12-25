// components/qna/QuestionsGrid.tsx
import React from "react";

type ProfileLite = {
  full_name: string | null;
  avatar_url: string | null;
};

type QQuestion = {
  id: string;
  title: string;
  body: string;
  tags: string[] | null;
  created_at: string;
  profiles?: ProfileLite | null;
  qna_answers?: { count: number }[] | null;
  qna_votes?: { count: number }[] | null;
};

type Props = {
  questions: QQuestion[];
  focusQid: string | null;
  myVotes: Record<string, boolean>;
  isVoteLoading: (qid: string) => boolean;
  onToggleVote: (qid: string) => void;
  onOpenThread: (q: QQuestion) => void;
  questionRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  avatarBubble: (
    name: string,
    avatar_url: string | null,
    size?: number
  ) => React.ReactNode;
  timeAgo: (iso: string) => string;
};

export default function QuestionsGrid({
  questions,
  focusQid,
  myVotes,
  isVoteLoading,
  onToggleVote,
  onOpenThread,
  questionRefs,
  avatarBubble,
  timeAgo,
}: Props) {
  const isMobile =
    typeof window !== "undefined" && window.innerWidth <= 520;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(2,minmax(0,1fr))",
        gap: 16,
      }}
    >
      {questions.map((q) => {
        const p = q.profiles;
        const author = p?.full_name || "Quantum5ocial member";
        const votes = q.qna_votes?.[0]?.count ?? 0;
        const ansCount = q.qna_answers?.[0]?.count ?? 0;
        const mine = !!myVotes[q.id];
        const isFocused = focusQid === q.id;

        return (
          <div
            key={q.id}
            ref={(el) => (questionRefs.current[q.id] = el)}
            className="card"
            onClick={() => onOpenThread(q)}
            style={{
              padding: 14,
              minHeight: 220,
              cursor: "pointer",
              border: isFocused
                ? "1px solid rgba(56,189,248,0.85)"
                : undefined,
              background: isFocused
                ? "radial-gradient(circle at top left, rgba(34,211,238,0.16), rgba(15,23,42,0.98))"
                : undefined,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  {avatarBubble(author, p?.avatar_url ?? null, 30)}
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {author}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {timeAgo(q.created_at)} ago
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVote(q.id);
                    }}
                    disabled={isVoteLoading(q.id)}
                    style={{
                      padding: isMobile ? "4px 7px" : "7px 10px",
                      borderRadius: 12,
                      border: mine
                        ? "1px solid rgba(34,211,238,0.8)"
                        : "1px solid rgba(148,163,184,0.45)",
                      background: mine
                        ? "rgba(34,211,238,0.12)"
                        : "rgba(15,23,42,0.6)",
                      fontSize: isMobile ? 10 : 12,
                    }}
                  >
                    ▲ {votes}
                  </button>

                  <div
                    style={{
                      padding: isMobile ? "4px 7px" : "7px 10px",
                      borderRadius: 12,
                      border: "1px solid rgba(148,163,184,0.45)",
                      fontSize: isMobile ? 10 : 12,
                    }}
                  >
                    💬 {ansCount}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 15, fontWeight: 700 }}>
                {q.title}
              </div>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  opacity: 0.9,
                  maxHeight: 68,
                  overflow: "hidden",
                }}
              >
                {q.body}
              </div>

              {(q.tags || []).length > 0 && (
                <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
                  {(q.tags || []).slice(0, 5).map((t) => (
                    <span
                      key={t}
                      style={{
                        fontSize: 11,
                        padding: "4px 8px",
                        borderRadius: 999,
                        border: "1px solid rgba(148,163,184,0.45)",
                      }}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: "#7dd3fc" }}>
              Open thread ›
            </div>
          </div>
        );
      })}
    </div>
  );
}
