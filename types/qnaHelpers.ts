// types/qnaHelpers.ts
export type ProfileLite = {
  id?: string;
  full_name: string | null;
  avatar_url: string | null;
};

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
  profile?: ProfileLite | null;
  qna_answer_votes?: { count: number }[] | null;
};

export function pickProfile(p: ProfileMaybe): ProfileLite | null {
  if (!p) return null;
  return Array.isArray(p) ? p[0] ?? null : p;
}

export function timeAgo(iso: string) {
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

export function pillTagStyle(active: boolean) {
  return {
    fontSize: 12,
    borderRadius: 999,
    padding: "6px 10px",
    border: active
      ? "1px solid rgba(56,189,248,0.7)"
      : "1px solid rgba(148,163,184,0.45)",
    background: active ? "rgba(56,189,248,0.12)" : "rgba(15,23,42,0.55)",
    color: active ? "#7dd3fc" : "rgba(226,232,240,0.9)",
    cursor: "pointer",
    whiteSpace: "nowrap" as const,
  };
}

export function avatarBubble(
  name: string,
  avatar_url: string | null,
  size = 28
) {
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
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

// you can also export BodyPortal or other small helpers if needed.
