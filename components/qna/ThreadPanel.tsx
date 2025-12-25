// components/qna/ThreadPanel.tsx
import React, { useState, useEffect, useRef } from "react";
import { QQuestion, QAnswer } from "../../types/qna";
import { pickProfile, timeAgo } from "../../lib/qnaHelpers";

type Props = {
  openQuestion: QQuestion | null;
  onClose: () => void;

  // answer list + vote states can be passed in or managed internally
  // here we pass minimal props and allow parent to supply data if desired
  answers: QAnswer[];
  loadingAnswers: boolean;
  onPostAnswer: (text: string) => Promise<void>;

  // votes
  myVotes: Record<string, boolean>;
  toggleVote: (qid: string) => void;
  myAnswerVotes: Record<string, boolean>;
  toggleAnswerVote: (aid: string) => void;
};

export default function ThreadPanel({
  openQuestion,
  onClose,
  answers,
  loadingAnswers,
  onPostAnswer,
  myVotes,
  toggleVote,
  myAnswerVotes,
  toggleAnswerVote,
}: Props) {
  const [answerBody, setAnswerBody] = useState("");

  if (!openQuestion) return null;

  const author = pickProfile(openQuestion.profiles)?.full_name || "Member";

  const handleSubmit = async () => {
    if (!answerBody.trim()) return;
    await onPostAnswer(answerBody.trim());
    setAnswerBody("");
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 80,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)",
          height: "100%",
          background: "#111",
          color: "#eee",
          overflow: "auto",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Thread</h2>
          <button onClick={onClose}>✕</button>
        </div>

        {/* Question */}
        <div style={{ marginTop: 12 }}>
          <h3>{openQuestion.title}</h3>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            by {author} · {timeAgo(openQuestion.created_at)} ago
          </div>
          <p style={{ marginTop: 8 }}>{openQuestion.body}</p>
          {/* question vote */}
          <button onClick={() => toggleVote(openQuestion.id)}>
            ▲ {openQuestion.qna_votes?.[0]?.count ?? 0}
          </button>
        </div>

        {/* Answers */}
        <div style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 8 }}>Answers</div>
          {loadingAnswers ? (
            <div>Loading answers…</div>
          ) : answers.length === 0 ? (
            <div>No answers yet.</div>
          ) : (
            answers.map((a) => {
              const name = a.profile?.full_name || "Member";
              return (
                <div key={a.id} style={{ borderTop: "1px solid #333", paddingTop: 10, marginTop: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      {name} · {timeAgo(a.created_at)} ago
                    </div>
                    <button onClick={() => toggleAnswerVote(a.id)}>
                      ▲ {a.qna_answer_votes?.[0]?.count ?? 0}
                    </button>
                  </div>
                  <div style={{ marginTop: 6 }}>{a.body}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Post answer */}
        <div style={{ marginTop: 24 }}>
          <textarea
            value={answerBody}
            onChange={(e) => setAnswerBody(e.target.value)}
            placeholder="Write an answer…"
            rows={4}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <button onClick={handleSubmit}>Post answer</button>
        </div>
      </div>
    </div>
  );
}
