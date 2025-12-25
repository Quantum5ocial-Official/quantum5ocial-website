// components/qna/QuestionsGrid.tsx
import React from "react";
import { QQuestion } from "../../types/qna"; // you can define/re-export your types
import { pickProfile, timeAgo } from "../../lib/qnaHelpers"; // optional helpers

type Props = {
  questions: QQuestion[];
  loading: boolean;
  error: string | null;
  search: string;
  setSearch: (v: string) => void;
  activeTag: string | null;
  setActiveTag: (t: string | null) => void;
  onQuestionClick: (q: QQuestion) => void;
};

export default function QuestionsGrid({
  questions,
  loading,
  error,
  search,
  setSearch,
  activeTag,
  setActiveTag,
  onQuestionClick,
}: Props) {
  // simplified layout; add styles back as needed
  return (
    <div>
      {/* Search + tag chips (simplified) */}
      <div style={{ marginBottom: 16 }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search questions…"
        />
        {activeTag && (
          <button onClick={() => setActiveTag(null)}>Clear tag ✕</button>
        )}
      </div>

      {/* Tag chips placeholder: you can pass in filtered tag list or compute here */}
      {/* ... */}

      {loading && <div>Loading questions…</div>}
      {error && !loading && <div style={{ color: "red" }}>{error}</div>}
      {!loading && !error && questions.length === 0 && (
        <div>No questions yet.</div>
      )}

      {/* Grid of question cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        {questions.map((q) => {
          const author = pickProfile(q.profiles)?.full_name || "Member";
          return (
            <div
              key={q.id}
              onClick={() => onQuestionClick(q)}
              style={{
                border: "1px solid #ccc",
                borderRadius: 8,
                padding: 12,
                cursor: "pointer",
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 700 }}>{q.title}</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                by {author} · {timeAgo(q.created_at)} ago
              </div>
              <div style={{ marginTop: 8, fontSize: 13, maxHeight: 68, overflow: "hidden" }}>
                {q.body}
              </div>
              <div style={{ marginTop: 8, fontSize: 11 }}>
                Answers: {q.qna_answers?.[0]?.count ?? 0}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
