// pages/auth.tsx
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type OAuthProvider = "google" | "github" | "linkedin_oidc";

function normalizeEmail(v: string) {
  return (v || "").trim().toLowerCase();
}

function pickBestEmail(user: any): string | null {
  if (!user) return null;

  if (user.email && String(user.email).trim()) return String(user.email).trim();

  const identities = Array.isArray(user.identities) ? user.identities : [];
  for (const ident of identities) {
    const email =
      ident?.identity_data?.email || ident?.identity_data?.preferred_email || null;
    if (email && String(email).trim()) return String(email).trim();
  }

  const meta = user.user_metadata || {};
  const metaEmail = meta.email || meta.preferred_email || null;
  if (metaEmail && String(metaEmail).trim()) return String(metaEmail).trim();

  return null;
}

function pickBestName(
  user: any,
  overrides?: { full_name?: string | null }
): string | null {
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

function isProbablyMobile() {
  if (typeof navigator === "undefined") return false;
  return /android|iphone|ipad|ipod/i.test(navigator.userAgent || "");
}
function isAndroid() {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent || "");
}
function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent || "");
}

function getInboxTarget(emailAddr: string) {
  const email = normalizeEmail(emailAddr);
  const domain = email.split("@")[1] || "";

  const gmailDomains = new Set(["gmail.com", "googlemail.com"]);
  const outlookDomains = new Set(["outlook.com", "hotmail.com", "live.com", "msn.com"]);
  const yahooDomains = new Set(["yahoo.com", "ymail.com"]);
  const icloudDomains = new Set(["icloud.com", "me.com", "mac.com"]);
  const protonDomains = new Set(["proton.me", "protonmail.com"]);

  const fallback = {
    label: "Open email",
    webInboxUrl: "https://mail.google.com/mail/u/0/#inbox",
    iosScheme: null as string | null,
    androidPlayStoreUrl: null as string | null,
  };

  if (gmailDomains.has(domain)) {
    return {
      label: "Open email",
      webInboxUrl: "https://mail.google.com/mail/u/0/#inbox",
      iosScheme: "googlegmail://",
      // Android: Play Store (as requested)
      androidPlayStoreUrl: "market://details?id=com.google.android.gm",
    };
  }

  if (outlookDomains.has(domain)) {
    return {
      label: "Open email",
      webInboxUrl: "https://outlook.live.com/mail/0/inbox",
      iosScheme: "ms-outlook://",
      androidPlayStoreUrl: "market://details?id=com.microsoft.office.outlook",
    };
  }

  if (yahooDomains.has(domain)) {
    return {
      label: "Open email",
      webInboxUrl: "https://mail.yahoo.com/",
      iosScheme: "ymail://",
      androidPlayStoreUrl: "market://details?id=com.yahoo.mobile.client.android.mail",
    };
  }

  if (icloudDomains.has(domain)) {
    return {
      label: "Open email",
      webInboxUrl: "https://www.icloud.com/mail",
      iosScheme: "message://",
      androidPlayStoreUrl: null,
    };
  }

  if (protonDomains.has(domain)) {
    return {
      label: "Open email",
      webInboxUrl: "https://mail.proton.me/",
      iosScheme: "protonmail://",
      androidPlayStoreUrl: "market://details?id=ch.protonmail.android",
    };
  }

  return fallback;
}

export default function AuthPage() {
  const router = useRouter();

  const redirectPath = useMemo(() => {
    return (router.query.redirect as string) || "/";
  }, [router.query.redirect]);

  const verifyFromQuery = useMemo(() => {
    const v = router.query.verify as string | undefined;
    return v === "1";
  }, [router.query.verify]);

  const emailFromQuery = useMemo(() => {
    return (router.query.email as string) || "";
  }, [router.query.email]);

  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(emailFromQuery || "");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [verifyMode, setVerifyMode] = useState<boolean>(verifyFromQuery);
  const [verifyEmail, setVerifyEmail] = useState<string>(emailFromQuery || "");

  // Resend UX
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

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
    if ((!existing.full_name || !String(existing.full_name).trim()) && bestName)
      patch.full_name = bestName;
    if ((!existing.avatar_url || !String(existing.avatar_url).trim()) && bestAvatar)
      patch.avatar_url = bestAvatar;
    if ((!existing.provider || !String(existing.provider).trim()) && provider)
      patch.provider = provider;

    if (Object.keys(patch).length === 0) return;

    const { error: upErr } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (upErr) console.error("ensureProfile: update error", upErr);
  }

  // -------------------------------------------------
  // If already signed in, redirect away from auth page.
  // After OAuth redirect, wait for session + ensure profile.
  // -------------------------------------------------
  useEffect(() => {
    let unsub: any = null;

    const run = async () => {
      if (verifyMode || verifyFromQuery) return;

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
  }, [router, redirectPath, verifyMode, verifyFromQuery]);

  useEffect(() => {
    if (verifyFromQuery) setVerifyMode(true);
    if (emailFromQuery) setVerifyEmail(emailFromQuery);
  }, [verifyFromQuery, emailFromQuery]);

  // Start / maintain countdown when verify screen is active
  useEffect(() => {
    if (!(verifyMode || verifyFromQuery)) return;

    // On first entry, start at 60 seconds if not running already
    setResendStatus(null);
    setError(null);
    setResendCooldown((prev) => (prev > 0 ? prev : 60));
  }, [verifyMode, verifyFromQuery]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ------------------------------
  // OAuth login handler
  // ------------------------------
  const handleOAuthLogin = async (provider: OAuthProvider) => {
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(redirectPath)}`,
      },
    });

    if (error) setError(error.message);
  };

  // ------------------------------
  // Signup UX: check if email already exists
  // ------------------------------
  const checkEmailAlreadyExists = async (emailToCheck: string) => {
    const e = normalizeEmail(emailToCheck);
    if (!e) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", e)
      .maybeSingle();

    if (error) {
      console.error("checkEmailAlreadyExists error", error);
      return false;
    }

    return !!data?.id;
  };

  // ------------------------------
  // “Open email” action (domain-aware)
  // ------------------------------
  const openEmailInbox = () => {
    const inboxEmail = verifyEmail || email;
    if (!inboxEmail) return;

    const target = getInboxTarget(inboxEmail);

    if (!isProbablyMobile()) {
      window.open(target.webInboxUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (isIOS()) {
      if (target.iosScheme) {
        const t0 = Date.now();
        window.location.href = target.iosScheme;
        setTimeout(() => {
          if (Date.now() - t0 < 1600) {
            window.open(target.webInboxUrl, "_blank", "noopener,noreferrer");
          }
        }, 1200);
        return;
      }
      window.open(target.webInboxUrl, "_blank", "noopener,noreferrer");
      return;
    }

    if (isAndroid()) {
      if (target.androidPlayStoreUrl) {
        window.location.href = target.androidPlayStoreUrl;
        return;
      }
      window.open(target.webInboxUrl, "_blank", "noopener,noreferrer");
      return;
    }

    window.open(target.webInboxUrl, "_blank", "noopener,noreferrer");
  };

  // ------------------------------
  // Resend verification email
  // ------------------------------
  const handleResend = async () => {
    const e = normalizeEmail(verifyEmail || email);
    if (!e) return;

    if (resendCooldown > 0) return;

    setResendStatus(null);
    setError(null);

    try {
      // Supabase v2: resend signup confirmation
      // If your TypeScript types complain, keep the "as any".
      const { error } = await (supabase.auth as any).resend({
        type: "signup",
        email: e,
        options: {
          emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(
            redirectPath
          )}`,
        },
      });

      if (error) throw error;

      setResendStatus("Verification email sent. Please check your inbox.");
      setResendCooldown(60);
    } catch (err: any) {
      console.error("resend error", err);
      setError(err?.message || "Could not resend the email. Please try again.");
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
      const eNorm = normalizeEmail(email);
      if (!eNorm || !password) {
        setError("Email and password are required.");
        return;
      }

      if (mode === "signup" && !fullName.trim()) {
        setError("Please enter your full name.");
        return;
      }

      if (mode === "signup") {
        const exists = await checkEmailAlreadyExists(eNorm);
        if (exists) {
          setError("An account with this email already exists. Please log in instead.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: eNorm,
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(
              redirectPath
            )}`,
          },
        });

        if (error) throw error;

        setVerifyEmail(eNorm);
        setVerifyMode(true);
        setResendCooldown(60);
        setResendStatus(null);

        router.replace({
          pathname: "/auth",
          query: { redirect: redirectPath, verify: "1", email: eNorm },
        });

        if (data?.user) {
          await ensureProfile(data.user, { full_name: fullName.trim() });
        }

        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: eNorm,
        password,
      });

      if (error) throw error;

      if (data.user) {
        await ensureProfile(data.user);
        router.push(redirectPath);
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // VERIFY SCREEN
  // ------------------------------
  if (verifyMode || verifyFromQuery) {
    const inboxEmail = verifyEmail || email || "";
    const target = inboxEmail ? getInboxTarget(inboxEmail) : null;

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
        <div style={{ width: "100%", maxWidth: 520 }}>
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
            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.35)",
                  background: "rgba(2,6,23,0.6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-hidden
              >
                <CheckEmailIcon />
              </div>

              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>Check your email</div>
                <div style={{ fontSize: 12, color: "rgba(148,163,184,0.95)" }}>
                  We sent a verification link to{" "}
                  <span style={{ color: "#e5e7eb", fontWeight: 600 }}>
                    {inboxEmail || "your inbox"}
                  </span>
                  .
                </div>
              </div>
            </div>

            <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>
              Open the message from <span style={{ color: "#7dd3fc" }}>Quantum5ocial</span> and
              click <span style={{ color: "#7dd3fc" }}>Confirm</span> to activate your account.
              <div style={{ marginTop: 10, fontSize: 12, color: "rgba(148,163,184,0.95)" }}>
                Tip: If you don’t see it, check your spam/promotions folder.
              </div>
            </div>

            {/* Status */}
            {resendStatus && (
              <div style={{ ...successBox, marginTop: 12 }}>{resendStatus}</div>
            )}
            {error && <div style={{ ...errorBox, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={openEmailInbox}
                style={{
                  ...submitBtn,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <MiniMailIcon />
                {target?.label || "Open email"}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0}
                style={{
                  ...oauthBtn,
                  padding: "8px 14px",
                  opacity: resendCooldown > 0 ? 0.65 : 1,
                  cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                }}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setVerifyMode(false);
                  setResendCooldown(0);
                  setResendStatus(null);
                  router.replace({ pathname: "/auth", query: { redirect: redirectPath } });
                }}
                style={{ ...oauthBtn, padding: "8px 14px" }}
              >
                Back to login
              </button>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
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

  // ------------------------------
  // NORMAL AUTH UI
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

/* Better “check your email” icon: envelope + incoming arrow */
function CheckEmailIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      {/* envelope */}
      <path
        d="M4.25 7.25h15.5c.97 0 1.75.78 1.75 1.75v8.75c0 .97-.78 1.75-1.75 1.75H4.25c-.97 0-1.75-.78-1.75-1.75V9c0-.97.78-1.75 1.75-1.75Z"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M5.6 8.75 12 13.35l6.4-4.6"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      {/* incoming arrow */}
      <path
        d="M18.25 4.25v4.25H14"
        stroke="rgba(34,211,238,0.95)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.25 8.5 13.5 3.75"
        stroke="rgba(34,211,238,0.95)"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* Small email icon used inside the “Open email” button */
function MiniMailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden focusable="false">
      <path
        d="M4 6.7h16c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5H4c-.83 0-1.5-.67-1.5-1.5v-9c0-.83.67-1.5 1.5-1.5Z"
        stroke="rgba(226,232,240,0.95)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M5.2 8.4 12 13.3l6.8-4.9"
        stroke="rgba(34,211,238,0.95)"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
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

const successBox: React.CSSProperties = {
  padding: "8px 10px",
  background: "rgba(34,197,94,0.18)",
  color: "rgba(187,247,208,0.95)",
  border: "1px solid rgba(34,197,94,0.35)",
  borderRadius: 9,
  fontSize: 12,
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
