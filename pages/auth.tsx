// pages/auth.tsx
import { useEffect, useState } from "react";
import type React from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type OAuthProvider = "google" | "github" | "linkedin_oidc";

export default function AuthPage() {
  const router = useRouter();
  const redirectPath = (router.query.redirect as string) || "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------
  // Ensure profile exists (and ensure email is saved)
  // ------------------------------
  async function ensureProfile(user: any, overrides?: { full_name?: string | null }) {
    if (!user?.id) return;

    const meta = user.user_metadata || {};
    const full_name_from_meta =
      overrides?.full_name ||
      meta.full_name ||
      meta.name ||
      meta.preferred_username ||
      null;

    const avatar_from_meta = meta.avatar_url || meta.picture || null;

    // Prefer auth email (should exist after code exchange)
    const authEmail: string | null = user.email ?? null;

    const { data: existing, error: readErr } = await supabase
      .from("profiles")
      .select("id,email,full_name,avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (readErr) {
      console.error("Error reading profile", readErr);
      return;
    }

    if (!existing) {
      const { error: insErr } = await supabase.from("profiles").insert([
        {
          id: user.id,
          email: authEmail, // ✅ save on first insert
          full_name: full_name_from_meta,
          avatar_url: avatar_from_meta,
          provider: user.app_metadata?.provider || null,
          raw_metadata: meta || {},
        },
      ]);

      if (insErr) console.error("Error inserting profile", insErr);
      return;
    }

    // ✅ If first insert happened earlier with null email (race), patch only the email
    if (!existing.email && authEmail) {
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ email: authEmail })
        .eq("id", user.id);

      if (updErr) console.error("Error patching profile email", updErr);
    }
  }

  // ------------------------------
  // After OAuth redirect:
  // Exchange ?code=... for a session, then ensure profile
  // ------------------------------
  useEffect(() => {
    if (!router.isReady) return;

    const run = async () => {
      try {
        // If we're returning from OAuth, exchange the code first.
        // This removes the race where getUser() can be incomplete.
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          const code = sp.get("code");
          if (code) {
            const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exErr) console.error("exchangeCodeForSession error", exErr);
          }
        }

        // Now get a fully populated user
        const { data } = await supabase.auth.getUser();
        const user = data.user;

        if (user) {
          await ensureProfile(user);
          router.replace(redirectPath);
        }
      } catch (e: any) {
        console.error("Auth redirect handling error", e);
      }
    };

    run();
  }, [router.isReady, router, redirectPath]);

  // ------------------------------
  // OAuth login handler
  // ------------------------------
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setError(null);

    // Important: request email scopes where needed
    const scopes =
      provider === "github"
        ? "read:user user:email"
        : provider === "linkedin_oidc"
        ? "openid profile email"
        : "openid email profile";

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectPath)}`,
        scopes,
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
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          await ensureProfile(data.user, { full_name: fullName.trim() });
          router.push(redirectPath);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
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
              {loading ? "Please wait…" : mode === "signup" ? "Sign up with email" : "Log in with email"}
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
