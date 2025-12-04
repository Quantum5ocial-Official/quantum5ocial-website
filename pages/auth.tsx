// pages/auth.tsx
import type React from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type OAuthProvider = "google" | "github" | "linkedin_oidc";

export default function AuthPage() {
  const router = useRouter();

  // Allow ?redirect=/something, default to /dashboard
  const redirectPath =
    (router.query.redirect as string) || "/dashboard";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ------------------------------
  // Helper: create profile row if missing
  // ------------------------------
  async function createProfileIfMissing(user: any) {
  if (!user) return;

  // 1) Check if profile already exists
  const { data: existing, error: checkError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (checkError) {
    console.error("Error checking existing profile:", checkError);
    return;
  }

  if (existing) {
    console.log("Profile already exists for user", user.id);
    return;
  }

  const meta = user.user_metadata || {};

  const insertPayload = {
    id: user.id,
    email: user.email || null,
    full_name:
      meta.full_name ||
      meta.name ||
      meta.preferred_username ||
      null,
    avatar_url: meta.avatar_url || meta.picture || null,
    provider: user.app_metadata?.provider || null,
    raw_metadata: meta || {},
  };

  console.log("Creating profile with payload:", insertPayload);

  const { error: insertError } = await supabase
    .from("profiles")
    .insert([insertPayload]);

  if (insertError) {
    console.error("Error inserting profile:", insertError);
  } else {
    console.log("Profile created successfully for", user.id);
  }
}

      // 2) Build clean payload
      const meta = user.user_metadata || {};
      const payload = {
        id: user.id,
        email: user.email || null,
        full_name:
          meta.full_name ||
          meta.name ||
          meta.preferred_username ||
          null,
        avatar_url:
          meta.avatar_url ||
          meta.picture ||
          null,
        provider: user.app_metadata?.provider || null,
        raw_metadata: meta || {},
      };

      // 3) Insert (or upsert just to be safe)
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (upsertError) {
        console.error("profiles upsert error:", upsertError);
      } else {
        console.log("profiles upsert OK for user", user.id);
      }
    } catch (err) {
      console.error("createProfileIfMissing crashed:", err);
    }
  }

  // ------------------------------
  // After OAuth redirect: watch auth state + initial check
  // ------------------------------
  useEffect(() => {
    // 1) Subscribe to auth state changes (important for OAuth redirect)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("onAuthStateChange:", event, session?.user?.id);
        if (session?.user) {
          await createProfileIfMissing(session.user);
          router.replace(redirectPath);
        }
      }
    );

    // 2) Also do a one-shot check (covers already-signed-in case)
    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      console.log("getUser on /auth:", user?.id);
      if (user) {
        await createProfileIfMissing(user);
        router.replace(redirectPath);
      }
    })();

    // 3) Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, [router, redirectPath]);

  // ------------------------------
  // OAuth login handler
  // ------------------------------
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          // Keep redirect param so we land back where we wanted
          redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(
            redirectPath
          )}`,
        },
      });

      if (error) {
        console.error("OAuth error:", error);
        setError(error.message);
      }
    } catch (err: any) {
      console.error("OAuth crash:", err);
      setError(err.message || "Something went wrong.");
    }
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

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          await createProfileIfMissing(data.user);
          router.push(redirectPath);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (data.user) {
          await createProfileIfMissing(data.user);
          router.push(redirectPath);
        }
      }
    } catch (err: any) {
      console.error("Email auth error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // UI
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
            <button
              type="button"
              onClick={() => handleOAuthLogin("google")}
              style={oauthBtn}
            >
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

            <button
              type="button"
              onClick={() => handleOAuthLogin("github")}
              style={oauthBtn}
            >
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

          {/* Toggle login / signup */}
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setMode("login")}
              style={{
                ...toggleBtn,
                border:
                  mode === "login"
                    ? "1px solid #22d3ee"
                    : "1px solid #374151",
              }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              style={{
                ...toggleBtn,
                border:
                  mode === "signup"
                    ? "1px solid #22d3ee"
                    : "1px solid #374151",
              }}
            >
              Sign up
            </button>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth}>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12 }}>Email</label>
              <input
                type="email"
                style={input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12 }}>Password</label>
              <input
                type="password"
                style={input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <div style={errorBox}>{error}</div>}

            <button
              type="submit"
              disabled={loading}
              style={submitBtn}
            >
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
            background:
              "radial-gradient(circle at top left, rgba(15,23,42,0.9), #020617)",
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

/* Styles (no explicit React.CSSProperties needed to keep it simple) */
const oauthBtn = {
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
} as const;

const icon = { width: 16, height: 16 } as const;

const toggleBtn = {
  flex: 1,
  padding: "6px 0",
  borderRadius: 999,
  background: "transparent",
  color: "#e5e7eb",
  cursor: "pointer",
} as const;

const input = {
  width: "100%",
  padding: "7px 9px",
  borderRadius: 9,
  border: "1px solid #374151",
  background: "#020617",
  color: "#e5e7eb",
} as const;

const dividerRow = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  margin: "8px 0 14px",
  fontSize: 11,
  color: "#6b7280",
} as const;

const dividerLine = {
  flex: 1,
  height: 1,
  background: "#1f2937",
} as const;

const errorBox = {
  padding: "8px 10px",
  background: "#7f1d1d",
  color: "#fecaca",
  borderRadius: 9,
  fontSize: 12,
  marginBottom: 10,
} as const;

const submitBtn = {
  width: "100%",
  padding: "8px 0",
  borderRadius: 999,
  border: "1px solid #22d3ee",
  background: "#020617",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 14,
} as const;
