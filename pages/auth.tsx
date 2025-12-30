// pages/auth.tsx
import { useEffect, useState } from "react";
import type React from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type OAuthProvider = "google" | "github" | "linkedin_oidc";

const GMAIL_URL = "https://mail.google.com/";
const OUTLOOK_URL = "https://outlook.live.com/mail/";

function pickBestEmail(user: any): string | null {
  if (!user) return null;

  // 1) Primary
  if (user.email && String(user.email).trim()) return String(user.email).trim();

  // 2) Identities (OAuth often stores email here)
  const identities = Array.isArray(user.identities) ? user.identities : [];
  for (const ident of identities) {
    const email = ident?.identity_data?.email || ident?.identity_data?.preferred_email || null;
    if (email && String(email).trim()) return String(email).trim();
  }

  // 3) User metadata fallback
  const meta = user.user_metadata || {};
  const metaEmail = meta.email || meta.preferred_email || null;
  if (metaEmail && String(metaEmail).trim()) return String(metaEmail).trim();

  return null;
}

function pickBestName(user: any, overrides?: { full_name?: string | null }): string | null {
  const meta = user?.user_metadata || {};
  const v =
    overrides?.full_name || meta.full_name || meta.name || meta.preferred_username || null;
  return v && String(v).trim() ? String(v).trim() : null;
}

function pickBestAvatar(user: any): string | null {
  const meta = user?.user_metadata || {};
  const v = meta.avatar_url || meta.picture || null;
  return v && String(v).trim() ? String(v).trim() : null;
}

export default function AuthPage() {
  const router = useRouter();
  const redirectPath = (router.query.redirect as string) || "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Signup "check your email" UX
  const [signupPending, setSignupPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>("");

  // -------------------------------------------------
  // Ensure profile exists AND email is stored in DB
  // -------------------------------------------------
  async function ensureProfile(user: any, overrides?: { full_name?: string | null }) {
    if (!user?.id) return;

    const bestEmail = pickBestEmail(user);
    const bestName = pickBestName(user, overrides);
    const bestAvatar = pickBestAvatar(user);

    const provider = user?.app_metadata?.provider || null;
    const meta = user?.user_metadata || {};

    // Read existing profile (need email too so we can backfill it)
    const { data: existing, error: existingErr } = await supabase
      .from("profiles")
      .select("id,email,full_name,avatar_url,provider")
      .eq("id", user.id)
      .maybeSingle();

    if (existingErr) {
      console.error("ensureProfile: read profile error", existingErr);
    }

    if (!existing) {
      // Insert new profile
      const { error: insErr } = await supabase.from("profiles").insert([
        {
          id: user.id,
          email: bestEmail,
          full_name: bestName,
          avatar_url: bestAvatar,
          provider,
          raw_metadata: meta || {},
        },
      ]);

      if (insErr) console.error("ensureProfile: insert error", insErr);
      return;
    }

    // Profile exists: backfill missing fields (especially email!)
    const patch: any = {};

    if ((!existing.email || !String(existing.email).trim()) && bestEmail) {
      patch.email = bestEmail;
    }
    if ((!existing.full_name || !String(existing.full_name).trim()) && bestName) {
      patch.full_name = bestName;
    }
    if ((!existing.avatar_url || !String(existing.avatar_url).trim()) && bestAvatar) {
      patch.avatar_url = bestAvatar;
    }
    if ((!existing.provider || !String(existing.provider).trim()) && provider) {
      patch.provider = provider;
    }

    if (Object.keys(patch).length === 0) return;

    const { error: upErr } = await supabase.from("profiles").update(patch).eq("id", user.id);

    if (upErr) console.error("ensureProfile: update error", upErr);
  }

  // -------------------------------------------------
  // After OAuth redirect or normal login:
  // wait for session, ensure profile, then redirect
  // -------------------------------------------------
  useEffect(() => {
    let unsub: any = null;

    const run = async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;

      if (user) {
        await ensureProfile(user);
        router.replace(redirectPath);
        return;
      }

      const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          const u = session?.user;
          if (u) {
            await ensureProfile(u);
            router.replace(redirectPath);
          }
        }
      });

      unsub = sub?.subscription;
    };

    run();

    return () => {
      try {
        unsub?.unsubscribe?.();
      } catch {}
    };
  }, [router, redirectPath]);

  // ------------------------------
  // OAuth login handler
  // ------------------------------
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth`,
      },
    });

    if (error) setError(error.message);
  };

  // ------------------------------
  // Email login / signup
  // ------------------------------
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email || !password) {
        setError("Email and password are required.");
        return;
      }

      if (mode === "signup" && !fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }

      if (mode === "signup") {
        const signupEmail = email.trim();

        const { data, error } = await supabase.auth.signUp({
          email: signupEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(
              redirectPath
            )}`,
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) throw error;

        // If email confirmations are enabled: no session is created yet.
        // Show "Check your email" message instead of redirecting / refreshing.
        setPendingEmail(signupEmail);
        setSignupPending(true);

        // If confirmations are OFF, Supabase may create a session immediately.
        // In that case, we can ensureProfile + redirect right away.
        if (data?.session?.user) {
          await ensureProfile(data.session.user, { full_name: fullName.trim() });
          router.push(redirectPath);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data.user) {
          await ensureProfile(data.user);
          router.push(redirectPath);
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // "Check your email" screen
  // ------------------------------
  if (signupPending) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.25)",
            padding: "24px 26px",
            background:
              "radial-gradient(circle at top left, rgba(34,211,238,0.12), transparent 55%), rgba(15,23,42,0.96)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 44, marginBottom: 10 }}>📩</div>

          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Check your email</div>

          <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 14 }}>
            We sent a confirmation link to
            <div style={{ marginTop: 6, color: "#e5e7eb", fontWeight: 600 }}>
              {pendingEmail || "your email address"}
            </div>
          </div>

          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 18 }}>
            Please verify your email address to activate your Quantum5ocial account.
          </div>

          {/* ✅ Primary CTA: open default mail client */}
          <a
            href="mailto:"
            style={{
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid #22d3ee",
              background: "#020617",
              color: "#e5e7eb",
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
              marginBottom: 12,
            }}
          >
            Open email
          </a>

          {/* ✅ Convenience links */}
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "center",
              gap: 14,
              fontSize: 13,
            }}
          >
            <a href={GMAIL_URL} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc" }}>
              Open Gmail
            </a>
            <a href={OUTLOOK_URL} target="_blank" rel="noreferrer" style={{ color: "#7dd3fc" }}>
              Open Outlook
            </a>
          </div>

          <button
            type="button"
            onClick={() => {
              setSignupPending(false);
              setMode("login");
            }}
            style={{
              marginTop: 18,
              padding: "8px 16px",
              borderRadius: 999,
              border: "1px solid #374151",
              background: "#020617",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------
  // UI RENDER
  // ------------------------------
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* AUTH CARD */}
        <div
          style={{
            width: "100%",
            borderRadius: 20,
            border: "1px solid #1f2937",
            padding: "20px 22px 22px",
            background:
              "radial-gradient(circle at top left, rgba(34,211,238,0.16), transparent 55%), rgba(15,23,42,0.96)",
          }}
        >
          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img
              src="/Q5_white_bg.png"
              style={{
                width: 90,
                height: 90,
                margin: "0 auto 12px",
              }}
            />
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                background: "linear-gradient(90deg, #22d3ee, #a855f7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Quantum5ocial
            </div>
            <div style={{ fontSize: 14, color: "#9ca3af" }}>
              Sign in to join the quantum ecosystem.
            </div>
          </div>

          {/* OAuth Buttons */}
          <div
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "center",
              marginBottom: 18,
              flexWrap: "wrap",
            }}
          >
            <button type="button" onClick={() => handleOAuthLogin("google")} style={oauthBtn}>
              <img src="/google.svg" style={icon} />
              Google
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin("linkedin_oidc")}
              style={oauthBtn}
            >
              <img src="/linkedin.svg" style={icon} />
              LinkedIn
            </button>

            <button type="button" onClick={() => handleOAuthLogin("github")} style={oauthBtn}>
              <img src="/github.svg" style={icon} />
              GitHub
            </button>
          </div>

          {/* Divider */}
          <div style={dividerRow}>
            <div style={dividerLine} />
            <span>or continue with email</span>
            <div style={dividerLine} />
          </div>

          {/* Toggle */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setMode("login")}
              style={{
                ...toggleBtn,
                border: mode === "login" ? "1px solid #22d3ee" : "1px solid #374151",
              }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              style={{
                ...toggleBtn,
                border: mode === "signup" ? "1px solid #22d3ee" : "1px solid #374151",
              }}
            >
              Sign up
            </button>
          </div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth}>
            {mode === "signup" && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12 }}>Full name</label>
                <input
                  type="text"
                  style={input}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                />
              </div>
            )}

            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12 }}>Email</label>
              <input
                type="email"
                style={input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12 }}>Password</label>
              <input
                type="password"
                style={input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && <div style={errorBox}>{error}</div>}

            <button type="submit" disabled={loading} style={submitBtn}>
              {loading
                ? "Please wait…"
                : mode === "signup"
                ? "Sign up with email"
                : "Log in with email"}
            </button>
          </form>
        </div>

        {/* FOOTER */}
        <div
          style={{
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.25)",
            padding: "8px 14px",
            background: "radial-gradient(circle at top left, rgba(15,23,42,0.9), #020617)",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 11,
            color: "rgba(148,163,184,0.9)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/Q5_white_bg.png" style={{ width: 24 }} />
            <span
              style={{
                fontSize: 13,
                fontWeight: 500,
                background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Quantum5ocial
            </span>
          </div>
          <div>© 2025 Quantum5ocial</div>
        </div>
      </div>
    </div>
  );
}

/* Styles */
const oauthBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "7px 14px",
  borderRadius: 999,
  border: "1px solid #374151",
  background: "#020617",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 13,
};

const icon: React.CSSProperties = { width: 16, height: 16 };

const toggleBtn: React.CSSProperties = {
  flex: 1,
  padding: "6px 0",
  borderRadius: 999,
  background: "transparent",
  color: "#e5e7eb",
  cursor: "pointer",
};

const input: React.CSSProperties = {
  width: "100%",
  padding: "7px 9px",
  borderRadius: 9,
  border: "1px solid #374151",
  background: "#020617",
  color: "#e5e7eb",
  fontSize: 13,
};

const dividerRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  margin: "8px 0 14px",
  fontSize: 11,
  color: "#6b7280",
};

const dividerLine: React.CSSProperties = {
  flex: 1,
  height: 1,
  background: "#1f2937",
};

const errorBox: React.CSSProperties = {
  padding: "8px 10px",
  background: "#7f1d1d",
  color: "#fecaca",
  borderRadius: 9,
  fontSize: 12,
  marginBottom: 10,
};

const submitBtn: React.CSSProperties = {
  width: "100%",
  padding: "8px 0",
  borderRadius: 999,
  border: "1px solid #22d3ee",
  background: "#020617",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 14,
};
