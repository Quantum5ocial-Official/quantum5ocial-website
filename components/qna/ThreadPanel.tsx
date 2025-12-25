// components/qna/ThreadPanel.tsx
import React from "react";

type ProfileLite = {
  full_name: string | null;
  avatar_url: string | null;
};

type QAnswer = {
  id: string;
  body: string;
  created_at: string;
  profile?: ProfileLite | null;
  qna_answer_votes?: { count: number }[] | null;
};

type QQuestion = {
  id: string;
  title: string;
  body: string;
  tags: string[] | null;
  qna_votes?: { count: number }[] | null;
  qna_answers?: { count: number }[] | null;
};

type Props = {
  openQ: QQuestion;
  answers: QAnswer[];
  onClose: () => void;
  avatarBubble: (
    name: string,
    avatar_url: string | null,
    size?: number
  ) => React.ReactNode;
  timeAgo: (iso: string) => string;
};

export default function ThreadPanel({
  openQ,
  answers,
  onClose,
  avatarBubble,
  timeAgo,
}: Props) {
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
          padding: 16,
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 800 }}>Thread</div>
          <button onClick={onClose}>✕</button>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 16, fontWeight: 900 }}>
            {openQ.title}
          </div>
          <div style={{ marginTop: 8 }}>{openQ.body}</div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Answers ({answers.length})
          </div>

          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
            {answers.map((a) => {
              const name =
                a.profile?.full_name || "Quantum5ocial member";
              return (
                <div key={a.id} className="card" style={{ padding: 12 }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    {avatarBubble(name, a.profile?.avatar_url ?? null, 26)}
                    <div>
                      <div style={{ fontWeight: 700 }}>{name}</div>
                      <div style={{ fontSize: 11, opacity: 0.8 }}>
                        {timeAgo(a.created_at)} ago
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>{a.body}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
