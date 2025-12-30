// pages/auth.tsx
import { useEffect, useState } from "react";
import type React from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type OAuthProvider = "google" | "github" | "linkedin_oidc";

const PENDING_KEY = "q5_auth_pending_email_v1";

function pickBestEmail(user: any): string | null {
  if (!user) return null;
  if (user.email && String(user.email).trim()) return String(user.email).trim();

  const identities = Array.isArray(user.identities) ? user.identities : [];
  for (const ident of identities) {
    const email = ident?.identity_data?.email || ident?.identity_data?.preferred_email || null;
    if (email && String(email).trim()) return String(email).trim();
  }

  const meta = user.user_metadata || {};
  const metaEmail = meta.email || meta.preferred_email || null;
  if (metaEmail && String(metaEmail).trim()) return String(metaEmail).trim();

  return null;
}

function pickBestName(user: any, overrides?: { full_name?: string | null }): string | null {
  const meta = user?.user_metadata || {};
  const v = overrides?.full_name || meta.full_name || meta.name || meta.preferred_username || null;
  return v && String(v).trim() ? String(v).trim() : null;
}

function pickBestAvatar(user: any): string | null {
  const meta = user?.user_metadata || {};
  const v = meta.avatar_url || meta.picture || null;
  return v && String(v).trim() ? String(v).trim() : null;
}

function getDeviceKind() {
  if (typeof window === "undefined") return { os: "desktop" as const };
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  return { os: isAndroid ? ("android" as const) : isIOS ? ("ios" as const) : ("desktop" as const) };
}

function getInboxTarget(email: string): {
  label: string;
  appUrl?: string | null;
  webUrl: string;
  fallbackLabel?: string;
} {
  const e = String(email || "").trim().toLowerCase();
  const domain = e.includes("@") ? e.split("@").pop() || "" : "";

  const gmailDomains = new Set(["gmail.com", "googlemail.com"]);
  if (gmailDomains.has(domain)) {
    return { label: "Open email", appUrl: "googlegmail://", webUrl: "https://mail.google.com/", fallbackLabel: "Open Gmail on web" };
  }

  const outlookDomains = new Set(["outlook.com", "hotmail.com", "live.com", "msn.com"]);
  if (outlookDomains.has(domain)) {
    return { label: "Open email", appUrl: "ms-outlook://", webUrl: "https://outlook.live.com/mail/", fallbackLabel: "Open Outlook on web" };
  }

  const yahooDomains = new Set(["yahoo.com", "yahoo.co.uk", "yahoo.in", "ymail.com"]);
  if (yahooDomains.has(domain)) {
    return { label: "Open email", appUrl: null, webUrl: "https://mail.yahoo.com/", fallbackLabel: "Open Yahoo Mail on web" };
  }

  const icloudDomains = new Set(["icloud.com", "me.com", "mac.com"]);
  if (icloudDomains.has(domain)) {
    return { label: "Open email", appUrl: null, webUrl: "https://www.icloud.com/mail", fallbackLabel: "Open iCloud Mail on web" };
  }

  const protonDomains = new Set(["proton.me", "protonmail.com"]);
  if (protonDomains.has(domain)) {
    return { label: "Open email", appUrl: null, webUrl: "https://mail.proton.me/", fallbackLabel: "Open Proton Mail on web" };
  }

  return { label: "Open email", appUrl: "mailto:", webUrl: "mailto:", fallbackLabel: "Open your mail app" };
}

function openInboxSmart(
  target: { appUrl?: string | null; webUrl: string },
  os: "android" | "ios" | "desktop"
) {
  const openWeb = () => {
    window.location.href = target.webUrl;
  };

  if (os === "desktop") {
    openWeb();
    return;
  }

  if (!target.appUrl) {
    openWeb();
    return;
  }

  const isGmail = target.appUrl === "googlegmail://";
  const isOutlook = target.appUrl === "ms-outlook://";

  if (os === "android") {
    if (isGmail) {
      const intentUrl = "intent://#Intent;scheme=googlegmail;package=com.google.android.gm;end";
      window.location.href = intentUrl;
      setTimeout(openWeb, 900);
      return;
    }
    if (isOutlook) {
      const intentUrl = "intent://#Intent;scheme=ms-outlook;package=com.microsoft.office.outlook;end";
      window.location.href = intentUrl;
      setTimeout(openWeb, 900);
      return;
    }
    window.location.href = target.appUrl;
    setTimeout(openWeb, 900);
    return;
  }

  // iOS
  window.location.href = target.appUrl;
  setTimeout(openWeb, 900);
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
  const [error, setError] = useState<string | null>(null);

  const [signupPending, setSignupPending] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>("");

  async function ensureProfile(user: any, overrides?: { full_name?: string | null }) {
    if (!user?.id) return;

    const bestEmail = pickBestEmail(user);
    const bestName = pickBestName(user, overrides);
    const bestAvatar = pickBestAvatar(user);

    const provider = user?.app_metadata?.provider || null;
    const meta = user?.user_metadata || {};

    const { data: existing } = await supabase
      .from("profiles")
      .select("id,email,full_name,avatar_url,provider")
      .eq("id", user.id)
      .maybeSingle();

    if (!existing) {
      await supabase.from("profiles").insert([
        {
          id: user.id,
          email: bestEmail ? String(bestEmail).trim().toLowerCase() : null,
          full_name: bestName,
          avatar_url: bestAvatar,
          provider,
          raw_metadata: meta || {},
        },
      ]);
      return;
    }

    const patch: any = {};
    if ((!existing.email || !String(existing.email).trim()) && bestEmail) patch.email = String(bestEmail).trim().toLowerCase();
    if ((!existing.full_name || !String(existing.full_name).trim()) && bestName) patch.full_name = bestName;
    if ((!existing.avatar_url || !String(existing.avatar_url).trim()) && bestAvatar) patch.avatar_url = bestAvatar;
    if ((!existing.provider || !String(existing.provider).trim()) && provider) patch.provider = provider;

    if (Object.keys(patch).length === 0) return;
    await supabase.from("profiles").update(patch).eq("id", user.id);
  }

  async function emailAlreadyExists(inputEmail: string): Promise<boolean> {
    const normalized = String(inputEmail || "").trim().toLowerCase();
    if (!normalized) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .ilike("email", normalized)
      .limit(1);

    if (error) {
      console.error("emailAlreadyExists check failed", error);
      return false;
    }
    return (data || []).length > 0;
  }

  // ✅ NEW: restore pending state from URL first (mobile-safe), then sessionStorage
  useEffect(() => {
    if (!router.isReady) return;

    const pending = String(router.query.pending || "");
    const qEmail = String(router.query.email || "").trim();

    if (pending === "1" && qEmail) {
      const normalized = qEmail.toLowerCase();
      setPendingEmail(normalized);
      setSignupPending(true);
      try {
        window.sessionStorage.setItem(PENDING_KEY, normalized);
      } catch {}
      return;
    }

    // fallback: sessionStorage
    try {
      const saved = window.sessionStorage.getItem(PENDING_KEY);
      if (saved && String(saved).trim()) {
        setPendingEmail(String(saved).trim());
        setSignupPending(true);
      }
    } catch {}
  }, [router.isReady, router.query.pending, router.query.email]);

  // After OAuth redirect or normal login
  useEffect(() => {
    let unsub: any = null;

    const run = async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;

      if (user) {
        try {
          window.sessionStorage.removeItem(PENDING_KEY);
        } catch {}
        setSignupPending(false);
        setPendingEmail("");

        await ensureProfile(user);
        router.replace(redirectPath);
        return;
      }

      const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          const u = session?.user;
          if (u) {
            try {
              window.sessionStorage.removeItem(PENDING_KEY);
            } catch {}
            setSignupPending(false);
            setPendingEmail("");

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

  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) setError(error.message);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();

      if (!normalizedEmail || !password) {
        setError("Email and password are required.");
        return;
      }

      if (mode === "signup" && !fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }

      if (mode === "signup") {
        setCheckingEmail(true);
        const exists = await emailAlreadyExists(normalizedEmail);
        setCheckingEmail(false);

        if (exists) {
          setError("An account with this email already exists. Please log in instead.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectPath)}`,
            data: { full_name: fullName.trim() },
          },
        });

        if (error) throw error;

        // ✅ CRITICAL: persist pending state BOTH in sessionStorage and in URL (mobile-safe)
        try {
          window.sessionStorage.setItem(PENDING_KEY, normalizedEmail);
        } catch {}

        setPendingEmail(normalizedEmail);
        setSignupPending(true);

        // Shallow replace to keep the "pending" screen even if mobile refreshes
        router.replace(
          {
            pathname: "/auth",
            query: {
              redirect: redirectPath,
              pending: "1",
              email: normalizedEmail,
            },
          },
          undefined,
          { shallow: true }
        );

        // If confirmations are OFF, we might already have a session:
        if (data?.session?.user) {
          await ensureProfile(data.session.user, { full_name: fullName.trim() });
          router.replace(redirectPath);
        }

        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (error) throw error;

      if (data.user) {
        await ensureProfile(data.user);
        router.replace(redirectPath);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
      setCheckingEmail(false);
    }
  };

  // ✅ Check-email screen
  if (signupPending) {
    const device = getDeviceKind();
    const target = getInboxTarget(pendingEmail || "");

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

          <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            Check your email
          </div>

          <div style={{ fontSize: 14, color: "#9ca3af", marginBottom: 14 }}>
            We sent a confirmation link to
            <div style={{ marginTop: 6, color: "#e5e7eb", fontWeight: 600 }}>
              {pendingEmail || "your email address"}
            </div>
          </div>

          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 18 }}>
            Please verify your email address to activate your Quantum5ocial account.
          </div>

          <button
            type="button"
            onClick={() => {
              openInboxSmart({ appUrl: target.appUrl ?? null, webUrl: target.webUrl }, device.os);
            }}
            style={{
              display: "inline-block",
              padding: "10px 18px",
              borderRadius: 999,
              border: "1px solid #22d3ee",
              background: "#020617",
              color: "#e5e7eb",
              fontSize: 14,
              fontWeight: 600,
              marginBottom: 10,
              cursor: "pointer",
            }}
          >
            {target.label}
          </button>

          <div style={{ marginTop: 6, fontSize: 12, color: "#9ca3af" }}>
            If the app doesn’t open, we’ll take you to the web inbox automatically.
          </div>

          {target.fallbackLabel && (
            <div style={{ marginTop: 10, fontSize: 12 }}>
              <a
                href={target.webUrl}
                target={target.webUrl.startsWith("http") ? "_blank" : undefined}
                rel={target.webUrl.startsWith("http") ? "noreferrer" : undefined}
                style={{ color: "#7dd3fc", textDecoration: "none" }}
              >
                {target.fallbackLabel} →
              </a>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              try {
                window.sessionStorage.removeItem(PENDING_KEY);
              } catch {}
              setSignupPending(false);
              setPendingEmail("");
              setMode("login");
              router.replace({ pathname: "/auth", query: { redirect: redirectPath } }, undefined, {
                shallow: true,
              });
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

  // Normal auth UI
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
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img src="/Q5_white_bg.png" style={{ width: 90, height: 90, margin: "0 auto 12px" }} />
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
              onClick={() => setMode("login")}
              style={{ ...toggleBtn, border: mode === "login" ? "1px solid #22d3ee" : "1px solid #374151" }}
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              style={{ ...toggleBtn, border: mode === "signup" ? "1px solid #22d3ee" : "1px solid #374151" }}
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

            <button type="submit" disabled={loading || checkingEmail} style={submitBtn}>
              {loading || checkingEmail
                ? checkingEmail
                  ? "Checking email…"
                  : "Please wait…"
                : mode === "signup"
                ? "Sign up with email"
                : "Log in with email"}
            </button>
          </form>
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
