// components/qna/ThreadPanel.tsx
import React from "react";
import { useRouter } from "next/router";
import {
  QQuestion,
  QAnswer,
  avatarBubble,
  timeAgo,
  pillTagStyle,
  pickProfile,
} from "../qnaHelpers"; // adjust as needed

type Props = {
  openQ: QQuestion | null;
  answers: QAnswer[];
  loadingAnswers: boolean;
  answerBody: string;
  answerSaving: boolean;
  user: any; // ideally typed user object; keep any for now if not typed
  myVotes: Record<string, boolean>;
  voteLoadingIds: string[];
  myAnswerVotes: Record<string, boolean>;
  answerVoteLoadingIds: string[];
  onClose: () => void;
  onToggleVote: (qid: string) => void;
  onToggleAnswerVote: (aid: string) => void;
  onAnswerChange: (text: string) => void;
  onAddAnswer: () => void;
  filteredTagChips?: string[]; // not really used here
};

export default function ThreadPanel({
  openQ,
  answers,
  loadingAnswers,
  answerBody,
  answerSaving,
  user,
  myVotes,
  voteLoadingIds,
  myAnswerVotes,
  answerVoteLoadingIds,
  onClose,
  onToggleVote,
  onToggleAnswerVote,
  onAnswerChange,
  onAddAnswer,
}: Props) {
  const router = useRouter();

  if (!openQ) return null;

  const isVoteLoading = (qid: string) => voteLoadingIds.includes(qid);
  const isAnswerVoteLoading = (aid: string) =>
    answerVoteLoadingIds.includes(aid);

  const openQCount = openQ.qna_answers?.[0]?.count ?? answers.length;

  return (
    <div
      onClick={onClose}
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
        {/* Header */}
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
            {typeof router.query.focus === "string" &&
            openQ.id === router.query.focus ? (
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
            onClick={onClose}
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

        {/* Question */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.25 }}>
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
              onClick={() => onToggleVote(openQ.id)}
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

        {/* Answers list */}
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
            Answers ({openQCount})
          </div>

          {loadingAnswers ? (
            <div className="products-status">Loading answers…</div>
          ) : answers.length === 0 ? (
            <div className="products-empty">
              No answers yet. Be the first to help.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {answers.map((a) => {
                const name =
                  a.profile?.full_name || "Quantum5ocial member";
                const aid = a.id;
                const mine = !!myAnswerVotes[aid];
                const v = a.qna_answer_votes?.[0]?.count ?? 0;
                const isFocusedAnswer =
                  typeof router.query.answer === "string" &&
                  aid === router.query.answer;

                return (
                  <div
                    key={aid}
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
                        onClick={() => onToggleAnswerVote(aid)}
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
              onChange={(e) => onAnswerChange(e.target.value)}
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
                  onClick={onAddAnswer}
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
  );
}
