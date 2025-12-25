// components/qna/QuestionsGrid.tsx
import React, { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";

// reuse types from wherever you define them (or define locally if not yet)
import {
  QQuestion,
  ProfileLite,
  pickProfile,
  timeAgo,
  pillTagStyle,
  avatarBubble,
} from "../qnaHelpers"; // adjust path as you choose

type Props = {
  questions: QQuestion[];
  loading: boolean;
  err: string | null;
  search: string;
  activeTag: string | null;
  suggestedTags: string[];
  myVotes: Record<string, boolean>;
  voteLoadingIds: string[];
  onSearchChange: (s: string) => void;
  onClearSearch: () => void;
  onClearTag: () => void;
  onTagToggle: (tag: string) => void;
  onOpenThread: (q: QQuestion) => void;
  onToggleVote: (qid: string) => void;
  filteredTagChips: string[];
  // composer
  onQuestionCreated: (newQ: QQuestion) => void;
};

export default function QuestionsGrid({
  questions,
  loading,
  err,
  search,
  activeTag,
  suggestedTags,
  myVotes,
  voteLoadingIds,
  onSearchChange,
  onClearSearch,
  onClearTag,
  onTagToggle,
  onOpenThread,
  onToggleVote,
  filteredTagChips,
  onQuestionCreated,
}: Props) {
  const router = useRouter();

  const isVoteLoading = (qid: string) => voteLoadingIds.includes(qid);

  return (
    <>
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
                    {questions.length} question{questions.length === 1 ? "" : "s"}
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

          {/* Composer */}
          <QnAComposerStrip onCreated={onQuestionCreated} />
          
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
                    onChange={(e) => onSearchChange(e.target.value)}
                  />

                  {!!search.trim() && (
                    <button
                      type="button"
                      onClick={onClearSearch}
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
                      onClick={onClearTag}
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
                onClick={() => onTagToggle(t)}
                style={pillTagStyle(activeTag === t)}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* status */}
      {loading && <div className="products-status">Loading QnA…</div>}
      {err && !loading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {err}
        </div>
      )}

      {!(loading || err) && questions.length === 0 && (
        <div className="products-empty">
          No questions yet. Be the first to ask something (hardware, qubits,
          fabrication, careers…).
        </div>
      )}

      {!(loading || err) && questions.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2,minmax(0,1fr))",
            gap: 16,
          }}
        >
          {questions.map((q) => {
            // avoid SSR-only window.refs: compute at render-time
            const isMobile =
              typeof window !== "undefined" && window.innerWidth <= 520;
            const p = pickProfile(q.profiles);
            const author = p?.full_name || "Quantum5ocial member";
            const votes = q.qna_votes?.[0]?.count ?? 0;
            const ansCount = q.qna_answers?.[0]?.count ?? 0;
            const mine = !!myVotes[q.id];

            const isFocused =
              typeof router.query.focus === "string" &&
              q.id === router.query.focus;

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
                onClick={() => onOpenThread(q)}
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
                          onToggleVote(q.id);
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

                <div
                  style={{ marginTop: 12, fontSize: 12, color: "#7dd3fc" }}
                >
                  Open thread <span>›</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
