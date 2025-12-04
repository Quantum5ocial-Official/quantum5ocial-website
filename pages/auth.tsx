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

  // --------- CHECK SESSION AFTER OAUTH ----------
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;

      if (user) {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email ||
            "",
        });

        router.replace("/dashboard");
      }
    };

    checkSession();
  }, [router]);

  // --------- OAUTH LOGIN HANDLER ----------
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

      if (error) setError(error.message);
    } catch (err: any) {
      setError(err?.message || "OAuth login failed.");
    }
  };

  // --------- EMAIL LOGIN/SIGNUP ----------
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
        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: fullName || email,
          });
        }

        router.push("/dashboard");
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }

        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            full_name: fullName || email,
          });
        }

        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------
  //  UI START
  // -----------------------------------------------------
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
          border: "1px solid #1f2937",
          padding: "20px 22px 22px",
          background:
            "radial-gradient(circle at top left, rgba(34,211,238,0.16), transparent 55%), rgba(15,23,42,0.96)",
        }}
      >
        {/* BRAND HEADER */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ position: "relative", width: 90, height: 90, margin: "0 auto 12px" }}>
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
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>

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

        {/* ---- OAUTH BUTTONS ROW (NEW) ---- */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
            gap: 8,
          }}
        >
          {/* GOOGLE */}
          <button
            onClick={() => handleOAuthLogin("google")}
            style={oauthButton}
          >
            <img
              src="/icons/google.svg"
              style={{ width: 22, height: 22 }}
              alt=""
            />
            <span>Google</span>
          </button>

          {/* LINKEDIN */}
          <button
            onClick={() => handleOAuthLogin("linkedin_oidc")}
            style={oauthButton}
          >
            <img
              src="/icons/linkedin.svg"
              style={{ width: 22, height: 22 }}
              alt=""
            />
            <span>LinkedIn</span>
          </button>

          {/* GITHUB */}
          <button
            onClick={() => handleOAuthLogin("github")}
            style={oauthButton}
          >
            <img
              src="/icons/github.svg"
              style={{ width: 22, height: 22 }}
              alt=""
            />
            <span>GitHub</span>
          </button>
        </div>

        {/* DIVIDER */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            margin: "10px 0 14px",
            fontSize: 11,
            color: "#6b7280",
          }}
        >
          <div style={{ flex: 1, height: 1, background: "#1f2937" }} />
          <span>or continue with email</span>
          <div style={{ flex: 1, height: 1, background: "#1f2937" }} />
        </div>

        {/* LOGIN/SIGNUP TOGGLE */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, fontSize: 13 }}>
          <button
            onClick={() => setMode("login")}
            style={{
              ...toggleButton,
              border: mode === "login" ? "1px solid #22d3ee" : "1px solid #374151",
              background: mode === "login" ? "#0f172a" : "transparent",
            }}
          >
            Log in
          </button>

          <button
            onClick={() => setMode("signup")}
            style={{
              ...toggleButton,
              border: mode === "signup" ? "1px solid #22d3ee" : "1px solid #374151",
              background: mode === "signup" ? "#0f172a" : "transparent",
            }}
          >
            Sign up
          </button>
        </div>

        {/* EMAIL FORM */}
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
          </InputBlock>

          {error && <div style={errorBox}>{error}</div>}
          {message && <div style={successBox}>{message}</div>}

          <button type="submit" disabled={loading} style={submitButton}>
            {loading
              ? "Please wait..."
              : mode === "signup"
              ? "Sign up with email"
              : "Log in with email"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* -------------------- STYLES -------------------- */

const oauthButton: React.CSSProperties = {
  flex: 1,
  padding: "8px 10px",
  borderRadius: 999,
  border: "1px solid #374151",
  background: "#020617",
  color: "#e5e7eb",
  cursor: "pointer",
  fontSize: 13,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
};

const toggleButton: React.CSSProperties = {
  flex: 1,
  padding: "6px 0",
  borderRadius: 999,
  cursor: "pointer",
  color: "#e5e7eb",
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

const errorBox: React.CSSProperties = {
  marginBottom: 10,
  padding: "8px 10px",
  borderRadius: 9,
  background: "#7f1d1d",
  color: "#fecaca",
  fontSize: 12,
};

const successBox: React.CSSProperties = {
  marginBottom: 10,
  padding: "8px 10px",
  borderRadius: 9,
  background: "#064e3b",
  color: "#bbf7d0",
  fontSize: 12,
};

const submitButton: React.CSSProperties = {
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
