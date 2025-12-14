// components/HomeComposer.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type ComposerMode = "post" | "ask";

type ProfileRow = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

function stop(e: React.MouseEvent) {
  e.stopPropagation();
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className="q5-composer-action" onClick={onClick}>
      <span className="q5-composer-action-ico">{icon}</span>
      <span className="q5-composer-action-txt">{label}</span>
    </button>
  );
}

export default function HomeComposer() {
  const { user, loading } = useSupabaseUser();

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [mode, setMode] = useState<ComposerMode>("post");
  const [open, setOpen] = useState(false);

  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);

  // Load current user's basic profile (avatar + name)
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle<ProfileRow>();

      if (cancelled) return;

      if (error) {
        console.error("HomeComposer: profile load error", error);
        setProfile(null);
        return;
      }

      setProfile(data ?? null);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const fullName = profile?.full_name || "Quantum member";
  const firstName = useMemo(() => {
    const n = (profile?.full_name || "").trim();
    if (!n) return "there";
    return n.split(" ")[0] || "there";
  }, [profile?.full_name]);

  const initials = useMemo(() => {
    const parts = (profile?.full_name || "")
      .split(" ")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 2);
    const val = parts.map((p) => p[0]?.toUpperCase()).join("");
    return val || "Q5";
  }, [profile?.full_name]);

  const placeholder =
    mode === "post"
      ? `What's on your mind, ${firstName}?`
      : "Ask the quantum community…";

  const modalTitle = mode === "post" ? "Create post" : "Ask a question";

  const textareaPlaceholder =
    mode === "post"
      ? "Share an update, insight, opportunity, or announcement…"
      : "Ask a clear, focused question for the community…";

  // Close on ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const canInteract = !loading; // allow opening even if not logged in, but disable submit
  const isLoggedIn = !!user;

  const handlePrimary = async () => {
    if (!isLoggedIn) {
      // you can later route to /auth?redirect=/ if you want
      setOpen(false);
      return;
    }
    if (!text.trim()) return;

    setPosting(true);
    try {
      // Placeholder only: we’re not writing to DB yet.
      // Later: insert into `posts` or `questions` depending on mode.
      console.log("Composer submit:", { mode, text: text.trim() });

      setText("");
      setOpen(false);
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      {/* Collapsed composer */}
      <div className="q5-composer-card" aria-disabled={!canInteract}>
        <div className="q5-composer-left">
          <div className="q5-composer-avatar">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={fullName}
                className="q5-composer-avatar-img"
              />
            ) : (
              <span className="q5-composer-avatar-initials">{initials}</span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="q5-composer-input"
          onClick={() => canInteract && setOpen(true)}
        >
          {placeholder}
        </button>

        <div className="q5-composer-toggle" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={`q5-composer-tab ${mode === "post" ? "active" : ""}`}
            onClick={() => setMode("post")}
          >
            Post
          </button>
          <button
            type="button"
            className={`q5-composer-tab ${mode === "ask" ? "active" : ""}`}
            onClick={() => setMode("ask")}
          >
            Ask
          </button>
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="q5-composer-modal" onMouseDown={() => setOpen(false)}>
          <div className="q5-composer-dialog" onMouseDown={stop}>
            <div className="q5-composer-dialog-head">
              <div className="q5-composer-dialog-title">{modalTitle}</div>
              <button
                type="button"
                className="q5-composer-x"
                onClick={() => setOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="q5-composer-dialog-user">
              <div className="q5-composer-avatar sm">
                {profile?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatar_url}
                    alt={fullName}
                    className="q5-composer-avatar-img"
                  />
                ) : (
                  <span className="q5-composer-avatar-initials">{initials}</span>
                )}
              </div>
              <div className="q5-composer-user-meta">
                <div className="q5-composer-user-name">{fullName}</div>
                <div className="q5-composer-user-sub">
                  {mode === "post"
                    ? "Posting to Quantum5ocial"
                    : "Asking the community"}
                </div>
              </div>

              <div className={`q5-composer-mode-pill ${mode}`}>
                {mode === "post" ? "Post" : "Ask"}
              </div>
            </div>

            <textarea
              className="q5-composer-textarea"
              placeholder={textareaPlaceholder}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              autoFocus
            />

            <div className="q5-composer-actions">
              {mode === "post" ? (
                <>
                  <ActionButton icon="📷" label="Photo" />
                  <ActionButton icon="🔗" label="Link" />
                  <ActionButton icon="🧪" label="Experiment" />
                  <ActionButton icon="😊" label="Emoji" />
                </>
              ) : (
                <>
                  <ActionButton icon="❓" label="Concept" />
                  <ActionButton icon="🧪" label="Experiment" />
                  <ActionButton icon="🎓" label="Career" />
                  <ActionButton icon="📚" label="Theory" />
                </>
              )}
            </div>

            <div className="q5-composer-footer">
              {!isLoggedIn ? (
                <div className="q5-composer-muted">
                  Log in to {mode === "post" ? "post" : "ask"}.
                </div>
              ) : (
                <div className="q5-composer-muted">
                  Keep it clear and respectful.
                </div>
              )}

              <button
                type="button"
                className={`q5-composer-primary ${mode}`}
                onClick={handlePrimary}
                disabled={!isLoggedIn || posting || !text.trim()}
              >
                {posting
                  ? mode === "post"
                    ? "Posting…"
                    : "Asking…"
                  : mode === "post"
                  ? "Post"
                  : "Ask"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
