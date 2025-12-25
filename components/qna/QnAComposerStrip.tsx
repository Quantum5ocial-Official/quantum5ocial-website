import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import type { QQuestion, MyProfileMini } from "../../types/qna";
import {
  BodyPortal,
  avatarBubble,
  useIsMobile,
} from "../../lib/qnaHelpers";

export default function QnAComposerStrip({
  onCreated,
}: {
  onCreated: (newQ: QQuestion) => void;
}) {
  const router = useRouter();
  const { user, loading } = useSupabaseUser();
  const isMobile = useIsMobile(520);

  const [me, setMe] = useState<MyProfileMini | null>(null);
  const [open, setOpen] = useState(false);

  const [askTitle, setAskTitle] = useState("");
  const [askBody, setAskBody] = useState("");
  const [askTags, setAskTags] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadMe = async () => {
      if (!user) {
        setMe(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle<MyProfileMini>();

      if (cancelled) return;
      if (!error && data) setMe(data);
      else setMe({ id: user.id, full_name: null, avatar_url: null });
    };

    if (!loading) loadMe();
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const isAuthed = !!user;
  const displayName = me?.full_name || "Member";
  const firstName =
    (displayName.split(" ")[0] || displayName).trim() || "Member";

  const initials =
    (me?.full_name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "U";

  const openComposer = () => {
    if (!isAuthed) {
      router.push("/auth?redirect=/qna");
      return;
    }
    setOpen(true);
  };

  const closeComposer = () => setOpen(false);

  const collapsedPlaceholder = isMobile
    ? "Ask a question…"
    : `Ask the quantum community, ${firstName}…`;

  const canSubmit = !!askTitle.trim() && !!askBody.trim() && !saving;

  const submit = async () => {
    if (!user) {
      router.push("/auth?redirect=/qna");
      return;
    }

    const title = askTitle.trim();
    const body = askBody.trim();
    const tags = askTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 8);

    if (!title || !body) return;

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("qna_questions")
        .insert({
          user_id: user.id,
          title,
          body,
          tags,
        })
        .select(
          `
          id, user_id, title, body, tags, created_at,
          profiles:profiles ( full_name, avatar_url ),
          qna_answers(count),
          qna_votes(count)
        `
        )
        .maybeSingle();

      if (error) {
        console.error("insert question error:", error);
        return;
      }

      if (data) {
        const normalized = {
          ...(data as any),
          profiles: (data as any).profiles
            ? Array.isArray((data as any).profiles)
              ? ((data as any).profiles[0] as any)
              : ((data as any).profiles as any)
            : null,
        } as QQuestion;

        onCreated(normalized);

        // UX: focus new question via query param
        router.replace(
          { pathname: "/qna", query: { focus: normalized.id } },
          undefined,
          { shallow: true }
        );

        setAskTitle("");
        setAskBody("");
        setAskTags("");
        closeComposer();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Composer bar */}
      <div
        style={{
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.18)",
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.70), rgba(15,23,42,0.86))",
          boxShadow: "0 18px 40px rgba(15,23,42,0.35)",
          padding: isMobile ? 12 : 14,
          marginTop: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              width: isMobile ? 36 : 40,
              height: isMobile ? 36 : 40,
              borderRadius: 999,
              overflow: "hidden",
              flexShrink: 0,
              border: "1px solid rgba(148,163,184,0.35)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
              color: "#fff",
              fontWeight: 800,
              letterSpacing: 0.5,
            }}
            aria-label="Your avatar"
            title={displayName}
          >
            {me?.avatar_url ? (
              <img
                src={me.avatar_url}
                alt={displayName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div
            style={{
              height: isMobile ? 40 : 42,
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.22)",
              background: "rgba(2,6,23,0.35)",
              color: "rgba(226,232,240,0.92)",
              padding: "0 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              userSelect: "none",
              minWidth: 0,
              flex: "1 1 260px",
            }}
            onClick={openComposer}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") openComposer();
            }}
            aria-label="Ask a question"
            title="Ask a question"
          >
            <span
              style={{
                opacity: 0.9,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {collapsedPlaceholder}
            </span>
            <span
              style={{
                marginLeft: "auto",
                opacity: 0.75,
                fontSize: 12,
                flexShrink: 0,
              }}
            >
              ❓
            </span>
          </div>

          <button
            type="button"
            onClick={openComposer}
            style={{
              padding: isMobile ? "8px 12px" : "9px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 800,
              border: "none",
              background: "linear-gradient(90deg,#22d3ee,#6366f1)",
              color: "#0f172a",
              cursor: "pointer",
              boxShadow: "0 14px 35px rgba(34,211,238,0.18)",
              whiteSpace: "nowrap",
            }}
          >
            Ask
          </button>
        </div>
      </div>

      {/* Modal composer */}
      {open && (
        <BodyPortal>
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(2,6,23,0.62)",
              backdropFilter: "blur(8px)",
              zIndex: 999999,
              display: "flex",
              alignItems: isMobile ? "flex-end" : "center",
              justifyContent: "center",
              padding: isMobile ? 10 : 18,
            }}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeComposer();
            }}
          >
            <div
              style={{
                width: "min(760px, 100%)",
                borderRadius: isMobile ? "18px 18px 0 0" : 18,
                border: "1px solid rgba(148,163,184,0.22)",
                background:
                  "linear-gradient(135deg, rgba(15,23,42,0.92), rgba(15,23,42,0.98))",
                boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
                overflow: "hidden",
                maxHeight: isMobile ? "86vh" : "90vh",
                display: "flex",
                flexDirection: "column",
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* header */}
              <div
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid rgba(148,163,184,0.22)",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    overflow: "hidden",
                    border: "1px solid rgba(148,163,184,0.4)",
                    flexShrink: 0,
                  }}
                >
                  {me?.avatar_url ? (
                    <img
                      src={me.avatar_url}
                      alt={firstName}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        color: "#0f172a",
                      }}
                    >
                      {firstName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    {firstName}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>
                    Public · Q&A
                  </div>
                </div>

                <button
                  onClick={closeComposer}
                  style={{
                    marginLeft: "auto",
                    border: "none",
                    background: "transparent",
                    color: "rgba(226,232,240,0.8)",
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* form */}
              <div
                style={{
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  overflowY: "auto",
                }}
              >
                <input
                  value={askTitle}
                  onChange={(e) => setAskTitle(e.target.value)}
                  placeholder="Question title (be specific)"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    padding: "12px 14px",
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.6)",
                    color: "#e5e7eb",
                    fontSize: 15,
                    outline: "none",
                  }}
                />

                <textarea
                  value={askBody}
                  onChange={(e) => setAskBody(e.target.value)}
                  placeholder="Add context, details, constraints, what you already tried…"
                  rows={6}
                  style={{
                    width: "100%",
                    borderRadius: 14,
                    padding: "12px 14px",
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.6)",
                    color: "#e5e7eb",
                    fontSize: 14,
                    outline: "none",
                    resize: "vertical",
                    lineHeight: 1.5,
                  }}
                />

                <input
                  value={askTags}
                  onChange={(e) => setAskTags(e.target.value)}
                  placeholder="Tags (comma-separated) e.g. Hardware, Cryo, Careers"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    padding: "10px 12px",
                    border: "1px solid rgba(148,163,184,0.35)",
                    background: "rgba(15,23,42,0.6)",
                    color: "#e5e7eb",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              {/* actions */}
              <div
                style={{
                  padding: "14px 16px",
                  borderTop: "1px solid rgba(148,163,184,0.22)",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                }}
              >
                <button
                  onClick={closeComposer}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(148,163,184,0.45)",
                    background: "transparent",
                    color: "rgba(226,232,240,0.9)",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  onClick={submit}
                  disabled={!canSubmit}
                  style={{
                    padding: "9px 18px",
                    borderRadius: 999,
                    border: "none",
                    background: "linear-gradient(90deg,#22d3ee,#6366f1)",
                    color: "#0f172a",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: saving ? "default" : "pointer",
                    opacity: !canSubmit ? 0.65 : 1,
                  }}
                >
                  {saving ? "Posting…" : "Post question"}
                </button>
              </div>
            </div>
          </div>
        </BodyPortal>
      )}
    </>
  );
}
