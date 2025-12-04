// pages/auth.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type OAuthProvider = "github" | "google" | "linkedin_oidc";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // After OAuth redirect → user lands back on /auth
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name:
            (user.user_metadata &&
              (user.user_metadata.full_name || user.user_metadata.name)) ||
            user.email ||
            "",
        });
        router.replace("/dashboard");
      }
    };
    checkSession();
  }, [router]);

  // OAuth Login Handler
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setError(null);
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        console.error(error);
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    }
  };

  // Email Login / Signup
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (!email || !password) {
        setError("Please fill in email and password.");
        setLoading(false);
        return;
      }

      if (mode === "signup" && !fullName) {
        setError("Please enter your full name.");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        const user = data.user;
        if (user) {
          await supabase.from("profiles").upsert({
            id: user.id,
            full_name: fullName || user.email || "",
          });
        }

        setMessage("Sign up successful. You are now logged in.");
        router.push("/dashboard");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        const user = data.user;
        if (user) {
          await supabase.from("profiles").upsert({
            id: user.id,
            full_name: fullName || user.email || "",
          });
        }

        setMessage("Login successful.");
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

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
      {/* wrapper so card + footer sit stacked */}
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        {/* MAIN AUTH CARD */}
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
          {/* BRAND HEADER */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div
              style={{
                position: "relative",
                width: 90,
                height: 90,
                margin: "0 auto 12px",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 120,
                  height: 120,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(circle, rgba(34,211,238,0.28), rgba(168,85,247,0.18), transparent 70%)",
                  filter: "blur(18px)",
                  animation: "pulseGlow 3s ease-in-out infinite",
                }}
              />
              <img
                src="/Q5_white_bg.png"
                alt="Quantum5ocial Logo"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                  position: "relative",
                  zIndex: 2,
                }}
              />
            </div>

            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
                background: "linear-gradient(90deg, #22d3ee, #a855f7)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                marginBottom: 6,
              }}
            >
              Quantum5ocial
            </div>

            <div style={{ fontSize: 14, color: "#9ca3af" }}>
              Sign in to join the quantum ecosystem.
            </div>
          </div>

          {/* Glow animation */}
          <style jsx>{`
            @keyframes pulseGlow {
              0% {
                opacity: 0.6;
                transform: translate(-50%, -50%) scale(1);
              }
              50% {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1.08);
              }
              100% {
                opacity: 0.6;
                transform: translate(-50%, -50%) scale(1);
              }
            }
          `}</style>

          {/* SOCIAL LOGIN ROW */}
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
              style={oauthPillButtonStyle}
            >
              <span style={oauthIconWrapperStyle}>
                <img
                  src="/google.svg"
                  alt="Google"
                  style={{ width: 16, height: 16 }}
                />
              </span>
              <span style={oauthTextStyle}>Google</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin("linkedin_oidc")}
              style={oauthPillButtonStyle}
            >
              <span style={oauthIconWrapperStyle}>
                <img
                  src="/linkedin.svg"
                  alt="LinkedIn"
                  style={{ width: 16, height: 16 }}
                />
              </span>
              <span style={oauthTextStyle}>LinkedIn</span>
            </button>

            <button
              type="button"
              onClick={() => handleOAuthLogin("github")}
              style={oauthPillButtonStyle}
            >
              <span style={oauthIconWrapperStyle}>
                <img
                  src="/github.svg"
                  alt="GitHub"
                  style={{ width: 16, height: 16 }}
                />
              </span>
              <span style={oauthTextStyle}>GitHub</span>
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              margin: "8px 0 14px",
              fontSize: 11,
              color: "#6b7280",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "#1f2937" }} />
            <span>or continue with email</span>
            <div style={{ flex: 1, height: 1, background: "#1f2937" }} />
          </div>

          {/* Toggle login/signup */}
          <div
            style={{ display: "flex", gap: 8, marginBottom: 12, fontSize: 13 }}
          >
            <button
              type="button"
              onClick={() => setMode("login")}
              style={{
                ...toggleButtonStyle,
                border:
                  mode === "login"
                    ? "1px solid #22d3ee"
                    : "1px solid #374151",
                background: mode === "login" ? "#0f172a" : "transparent",
              }}
            >
              Log in
            </button>

            <button
              type="button"
              onClick={() => setMode("signup")}
              style={{
                ...toggleButtonStyle,
                border:
                  mode === "signup"
                    ? "1px solid #22d3ee"
                    : "1px solid #374151",
                background: mode === "signup" ? "#0f172a" : "transparent",
              }}
            >
              Sign up
            </button>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit}>
            {mode === "signup" && (
              <InputBlock label="Full name">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={inputStyle}
                />
              </InputBlock>
            )}

            <InputBlock label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </InputBlock>

            <InputBlock label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
              <div
                style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}
              >
                For MVP you can use a simple password; later we enforce stronger
                rules.
              </div>
            </InputBlock>

            {error && <div style={errorBoxStyle}>{error}</div>}

            {message && <div style={successBoxStyle}>{message}</div>}

            <button
              type="submit"
              disabled={loading}
              style={submitButtonStyle}
            >
              {loading
                ? "Please wait..."
                : mode === "signup"
                ? "Sign up with email"
                : "Log in with email"}
            </button>
          </form>

          <div
            style={{
              marginTop: 12,
              fontSize: 11,
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            After login, you&apos;ll be redirected to your dashboard.
          </div>
        </div>

        {/* FOOTER CARD */}
        <div
          style={{
            borderRadius: 16,
            border: "1px solid rgba(148,163,184,0.25)",
            padding: "8px 14px",
            background:
              "radial-gradient(circle at top left, rgba(15,23,42,0.9), #020617)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            fontSize: 11,
            color: "rgba(148,163,184,0.9)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <img
              src="/Q5_white_bg.png"
              alt="Quantum5ocial logo"
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                objectFit: "contain",
              }}
            />
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
          <div style={{ whiteSpace: "nowrap", textAlign: "right" }}>
            © 2025 Quantum5ocial
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------- */
/* Reusable components & styles */
/* ---------------------------- */

const oauthPillButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: "7px 14px",
  borderRadius: 999,
  border: "1px solid #374151",
  background: "#020617",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 13,
  minWidth: 120,
};

const oauthIconWrapperStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

const oauthTextStyle: React.CSSProperties = {
  lineHeight: 1,
};

const toggleButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: "6px 0",
  borderRadius: 999,
  color: "#e5e7eb",
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 9px",
  borderRadius: 9,
  border: "1px solid #374151",
  background: "#020617",
  color: "#e5e7eb",
  fontSize: 13,
};

const errorBoxStyle: React.CSSProperties = {
  marginBottom: 10,
  padding: "8px 10px",
  borderRadius: 9,
  background: "#7f1d1d",
  color: "#fecaca",
  fontSize: 12,
};

const successBoxStyle: React.CSSProperties = {
  marginBottom: 10,
  padding: "8px 10px",
  borderRadius: 9,
  background: "#064e3b",
  color: "#bbf7d0",
  fontSize: 12,
};

const submitButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 0",
  borderRadius: 999,
  border: "1px solid #22d3ee",
  background: "#020617",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 14,
};

function InputBlock({ label, children }: any) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
        {label}
      </label>
      {children}
    </div>
  );
}
