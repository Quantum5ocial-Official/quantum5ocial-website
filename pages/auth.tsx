import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

export default function AuthPage() {
  const router = useRouter();
  // 🔹 Default to LOGIN instead of signup
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

  const handleOAuthLogin = async (provider: "github" | "google" | "linkedin") => {
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
        setError(error.message);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
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
        padding: "24px",
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
        <h1 style={{ fontSize: 20, marginBottom: 4 }}>Quantum5ocial</h1>
        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
          Sign in to join the quantum ecosystem. Choose social login or email.
        </p>

        {/* Social login buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 16,
          }}
        >
          <button
            type="button"
            onClick={() => handleOAuthLogin("github")}
            style={{
              width: "100%",
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid #374151",
              background: "#020617",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Continue with GitHub
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            style={{
              width: "100%",
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid #374151",
              background: "#020617",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Continue with Google
          </button>

          <button
            type="button"
            onClick={() => handleOAuthLogin("linkedin")}
            style={{
              width: "100%",
              padding: "7px 10px",
              borderRadius: 999,
              border: "1px solid #374151",
              background: "#020617",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 13,
              textAlign: "center",
            }}
          >
            Continue with LinkedIn
          </button>
        </div>

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

        {/* Toggle login / signup – login first now */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 12,
            fontSize: 13,
          }}
        >
          <button
            type="button"
            onClick={() => setMode("login")}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 999,
              border: mode === "login" ? "1px solid #22d3ee" : "1px solid #374151",
              background: mode === "login" ? "#0f172a" : "transparent",
              color: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            style={{
              flex: 1,
              padding: "6px 0",
              borderRadius: 999,
              border: mode === "signup" ? "1px solid #22d3ee" : "1px solid #374151",
              background: mode === "signup" ? "#0f172a" : "transparent",
              color: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            Sign up
          </button>
        </div>

        {/* Email/password form */}
        <form onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 9,
                  border: "1px solid #374151",
                  background: "#020617",
                  color: "#e5e7eb",
                  fontSize: 13,
                }}
              />
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 9px",
                borderRadius: 9,
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 13,
              }}
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 9px",
                borderRadius: 9,
                border: "1px solid #374151",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: 13,
              }}
            />
            <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>
              For MVP you can use a simple password; later we enforce stronger rules.
            </div>
          </div>

          {error && (
            <div
              style={{
                marginBottom: 10,
                padding: "8px 10px",
                borderRadius: 9,
                background: "#7f1d1d",
                color: "#fecaca",
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              style={{
                marginBottom: 10,
                padding: "8px 10px",
                borderRadius: 9,
                background: "#064e3b",
                color: "#bbf7d0",
                fontSize: 12,
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "8px 0",
              borderRadius: 999,
              border: "1px solid #22d3ee",
              background: loading ? "#0f172a" : "#020617",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 14,
            }}
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
          After login, you&apos;ll be redirected to your dashboard to choose how you want
          to use Quantum5ocial.
        </div>
      </div>
    </div>
  );
}
