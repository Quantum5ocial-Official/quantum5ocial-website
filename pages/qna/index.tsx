// pages/qna/index.tsx
import React, { useRef, useState } from "react";
import { useRouter } from "next/router";
import QuestionsGrid from "../../components/qna/QuestionsGrid";
import ThreadPanel from "../../components/qna/ThreadPanel";

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function avatarBubble(
  name: string,
  avatar_url: string | null,
  size = 28
) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#38bdf8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 800,
      }}
    >
      {avatar_url ? (
        <img src={avatar_url} />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

export default function QnAPage() {
  const router = useRouter();

  // 🚨 TEMP STATIC DATA — replace with your existing state
  const [questions] = useState<any[]>([]);
  const [openQ, setOpenQ] = useState<any | null>(null);

  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  return (
    <>
      <QuestionsGrid
        questions={questions}
        focusQid={null}
        myVotes={{}}
        isVoteLoading={() => false}
        onToggleVote={() => {}}
        onOpenThread={setOpenQ}
        questionRefs={questionRefs}
        avatarBubble={avatarBubble}
        timeAgo={timeAgo}
      />

      {openQ && (
        <ThreadPanel
          openQ={openQ}
          answers={[]}
          onClose={() => setOpenQ(null)}
          avatarBubble={avatarBubble}
          timeAgo={timeAgo}
        />
      )}
    </>
  );
}

(QnAPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
