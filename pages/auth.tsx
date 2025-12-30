// pages/auth.tsx
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

type OAuthProvider = "google" | "github" | "linkedin_oidc";

function getOS(): "android" | "ios" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent || "";
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "other";
}

function isMobile(): boolean {
  const os = getOS();
  return os === "android" || os === "ios";
}

function normalizeEmail(v: string) {
  return (v || "").trim().toLowerCase();
}

function emailDomain(v: string) {
  const s = normalizeEmail(v);
  const at = s.lastIndexOf("@");
  if (at <= 0) return "";
  return s.slice(at + 1);
}

function pickBestEmail(user: any): string | null {
  if (!user) return null;

  if (user.email && String(user.email).trim()) return String(user.email).trim();

  const identities = Array.isArray(user.identities) ? user.identities : [];
  for (const ident of identities) {
    const email =
      ident?.identity_data?.email ||
      ident?.identity_data?.preferred_email ||
      null;
    if (email && String(email).trim()) return String(email).trim();
  }

  const meta = user.user_metadata || {};
  const metaEmail = meta.email || meta.preferred_email || null;
  if (metaEmail && String(metaEmail).trim()) return String(metaEmail).trim();

  return null;
}

function pickBestName(user: any, overrides?: { full_name?: string | null }): string | null {
  const meta = user?.user_metadata || {};
  const v =
    overrides?.full_name ||
    meta.full_name ||
    meta.name ||
    meta.preferred_username ||
    null;
  return v && String(v).trim() ? String(v).trim() : null;
}

function pickBestAvatar(user: any): string | null {
  const meta = user?.user_metadata || {};
  const v = meta.avatar_url || meta.picture || null;
  return v && String(v).trim() ? String(v).trim() : null;
}

type InboxTarget = {
  kind: "gmail" | "outlook" | "generic";
  label: string;
  webInboxUrl: string;     // desktop + fallback
  iosScheme?: string;      // best-effort iOS deep-link
  androidIntent?: string;  // best-effort Android deep-link
};

function getInboxTarget(email: string): InboxTarget {
  const domain = emailDomain(email);

  const gmailDomains = new Set(["gmail.com", "googlemail.com"]);
  const outlookDomains = new Set(["outlook.com", "hotmail.com", "live.com", "msn.com"]);

  if (gmailDomains.has(domain)) {
    // Android: intent opens Gmail if installed, otherwise browser fallback
    // iOS: googlegmail:// is best-effort (will fallback to web if not installed)
    return {
      kind: "gmail",
      label: "Open email",
      webInboxUrl: "https://mail.google.com/mail/u/0/#inbox",
      iosScheme: "googlegmail://",
      androidIntent:
        "intent://co#Intent;scheme=googlegmail;package=com.google.android.gm;end",
    };
  }

  if (outlookDomains.has(domain)) {
    return {
      kind: "outlook",
      label: "Open email",
      webInboxUrl: "https://outlook.live.com/mail/0/inbox",
      iosScheme: "ms-outlook://",
      androidIntent:
        "intent://outlook.live.com/mail/0/inbox#Intent;scheme=https;package=com.microsoft.office.outlook;end",
    };
  }

  return {
    kind: "generic",
    label: "Open email",
    webInboxUrl: `mailto:${email}`,
  };
}

export default function AuthPage() {
  const router = useRouter();
  const redirectPath = (router.query.redirect as string) || "/";

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Verify screen state
  const [awaitingVerify, setAwaitingVerify] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");

  const inboxTarget = useMemo(
    () => getInboxTarget(verifyEmail || email),
    [verifyEmail, email]
  );

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

    const { data: existing, error: existingErr } = await supabase
      .from("profiles")
      .select("id,email,full_name,avatar_url,provider")
      .eq("id", user.id)
      .maybeSingle();

    if (existingErr) console.error("ensureProfile: read profile error", existingErr);

    if (!existing) {
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

    const patch: any = {};
    if ((!existing.email || !String(existing.email).trim()) && bestEmail) patch.email = bestEmail;
    if ((!existing.full_name || !String(existing.full_name).trim()) && bestName) patch.full_name = bestName;
    if ((!existing.avatar_url || !String(existing.avatar_url).trim()) && bestAvatar) patch.avatar_url = bestAvatar;
    if ((!existing.provider || !String(existing.provider).trim()) && provider) patch.provider = provider;

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
      options: { redirectTo: `${window.location.origin}/auth` },
    });

    if (error) setError(error.message);
  };

  // ------------------------------
  // Check if email exists (signup UX)
  // ------------------------------
  const checkEmailExists = async (raw: string) => {
    const e = normalizeEmail(raw);
    if (!e || !e.includes("@")) {
      setEmailExists(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", e)
        .limit(1);

      if (error) throw error;
      setEmailExists((data || []).length > 0);
    } catch (err) {
      console.error("checkEmailExists error", err);
      setEmailExists(null);
    } finally {
      setCheckingEmail(false);
    }
  };

  useEffect(() => {
    if (mode !== "signup") return;
    const t = setTimeout(() => checkEmailExists(email), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, mode]);

  // ------------------------------
  // Open inbox: desktop -> web, mobile -> app attempt -> fallback web
  // ------------------------------
  const openInboxSmart = () => {
    const e = normalizeEmail(verifyEmail || email);
    const target = getInboxTarget(e);
    const os = getOS();

    const openWeb = () => {
      window.location.href = target.webInboxUrl || `mailto:${e}`;
    };

    // Desktop: always web
    if (!isMobile()) {
      openWeb();
      return;
    }

    // Mobile: try app first if known provider
    if (os === "android") {
      if (target.androidIntent) {
        window.location.href = target.androidIntent;
        // If intent fails, Android typically falls back automatically,
        // but we still do a timed web fallback.
        setTimeout(openWeb, 900);
        return;
      }
      openWeb();
      return;
    }

    if (os === "ios") {
      if (target.iosScheme) {
        window.location.href = target.iosScheme;
        setTimeout(openWeb, 900);
        return;
      }
      openWeb();
      return;
    }

    openWeb();
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
        if (emailExists === true) {
          setError("This email is already registered. Please log in instead.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: normalizeEmail(email),
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;

        if (data.user) {
          await ensureProfile(data.user, { full_name: fullName.trim() });
          setVerifyEmail(normalizeEmail(email));
          setAwaitingVerify(true);
          return;
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizeEmail(email),
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
  // Verify screen
  // ------------------------------
  if (awaitingVerify) {
    return (
      <div style={pageWrap}>
        <div style={{ width: "100%", maxWidth: 520 }}>
          <div style={cardWrap}>
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <img src="/Q5_white_bg.png" style={{ width: 40, height: 40 }} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>Verify your email</div>
                <div style={{ fontSize: 13, color: "#9ca3af" }}>
                  We sent a confirmation link to{" "}
                  <span style={{ color: "#e5e7eb" }}>{verifyEmail}</span>.
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "12px 12px",
                borderRadius: 14,
                border: "1px solid rgba(148,163,184,0.25)",
                background: "rgba(2,6,23,0.6)",
                fontSize: 13,
                color: "rgba(226,232,240,0.92)",
              }}
            >
              Please open your inbox and click the verification link to activate your account.
              <div style={{ marginTop: 8, fontSize: 12, color: "#9ca3af" }}>
                After verifying, come back here and log in.
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button type="button" onClick={openInboxSmart} style={submitBtn}>
                Open email
              </button>

              <button
                type="button"
                onClick={() => {
                  setAwaitingVerify(false);
                  setMode("login");
                  setPassword("");
                }}
                style={{
                  ...submitBtn,
                  border: "1px solid rgba(148,163,184,0.35)",
                  color: "#e5e7eb",
                  background: "#020617",
                }}
              >
                Back to login
              </button>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: "#9ca3af" }}>
              Wrong email?{" "}
              <button
                type="button"
                onClick={() => {
                  setAwaitingVerify(false);
                  setMode("signup");
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  color: "#7dd3fc",
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Try again
              </button>
            </div>
          </div>

          <div style={{ marginTop: 12, textAlign: "center", fontSize: 11, color: "rgba(148,163,184,0.9)" }}>
            <Link href="/" style={{ color: "#7dd3fc", textDecoration: "underline" }}>
              Return to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ------------------------------
  // Main auth UI
  // ------------------------------
  return (
    <div style={pageWrap}>
      <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={authCard}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img src="/Q5_white_bg.png" style={{ width: 90, height: 90, margin: "0 auto 12px" }} />
            <div style={brandTitle}>Quantum5ocial</div>
            <div style={{ fontSize: 14, color: "#9ca3af" }}>Sign in to join the quantum ecosystem.</div>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 18, flexWrap: "wrap" }}>
            <button type="button" onClick={() => handleOAuthLogin("google")} style={oauthBtn}>
              <img src="/google.svg" style={icon} />
              Google
            </button>

            <button type="button" onClick={() => handleOAuthLogin("linkedin_oidc")} style={oauthBtn}>
              <img src="/linkedin.svg" style={icon} />
              LinkedIn
            </button>

            <button type="button" onClick={() => handleOAuthLogin("github")} style={oauthBtn}>
              <img src="/github.svg" style={icon} />
              GitHub
            </button>
          </div>

          <div style={dividerRow}>
            <div style={dividerLine} />
            <span>or continue with email</span>
            <div style={dividerLine} />
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError(null);
              }}
              style={{
                ...toggleBtn,
                border: mode === "login" ? "1px solid #22d3ee" : "1px solid #374151",
              }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              style={{
                ...toggleBtn,
                border: mode === "signup" ? "1px solid #22d3ee" : "1px solid #374151",
              }}
            >
              Sign up
            </button>
          </div>

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
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (mode === "signup") setEmailExists(null);
                }}
                placeholder="you@example.com"
              />
              {mode === "signup" && normalizeEmail(email).includes("@") && (
                <div style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
                  {checkingEmail
                    ? "Checking email…"
                    : emailExists === true
                    ? "This email is already registered. Please log in instead."
                    : emailExists === false
                    ? "Email looks available."
                    : ""}
                </div>
              )}
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

            <button type="submit" disabled={loading || checkingEmail} style={submitBtn}>
              {loading ? "Please wait…" : mode === "signup" ? "Sign up with email" : "Log in with email"}
            </button>
          </form>
        </div>

        <div style={footer}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <img src="/Q5_white_bg.png" style={{ width: 24 }} />
            <span style={footerBrand}>Quantum5ocial</span>
          </div>
          <div>© 2025 Quantum5ocial</div>
        </div>
      </div>
    </div>
  );
}

/* Styles */
const pageWrap: React.CSSProperties = {
  minHeight: "100vh",
  background: "#020617",
  color: "#e5e7eb",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
};

const authCard: React.CSSProperties = {
  width: "100%",
  borderRadius: 20,
  border: "1px solid #1f2937",
  padding: "20px 22px 22px",
  background:
    "radial-gradient(circle at top left, rgba(34,211,238,0.16), transparent 55%), rgba(15,23,42,0.96)",
};

const cardWrap: React.CSSProperties = {
  width: "100%",
  borderRadius: 20,
  border: "1px solid #1f2937",
  padding: "22px 22px 20px",
  background:
    "radial-gradient(circle at top left, rgba(34,211,238,0.14), transparent 55%), rgba(15,23,42,0.96)",
};

const brandTitle: React.CSSProperties = {
  fontSize: 28,
  fontWeight: 700,
  background: "linear-gradient(90deg, #22d3ee, #a855f7)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};

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

const footer: React.CSSProperties = {
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.25)",
  padding: "8px 14px",
  background: "radial-gradient(circle at top left, rgba(15,23,42,0.9), #020617)",
  display: "flex",
  justifyContent: "space-between",
  fontSize: 11,
  color: "rgba(148,163,184,0.9)",
};

const footerBrand: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
};
