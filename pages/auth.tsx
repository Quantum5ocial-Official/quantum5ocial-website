// pages/auth.tsx
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";

type OAuthProvider = "google" | "github" | "linkedin_oidc";
type Mode = "login" | "signup" | "forgot" | "reset";
type VerifyKind = "signup" | "reset";

function firstQueryValue(v: string | string[] | undefined) {
  if (!v) return "";
  return Array.isArray(v) ? v[0] : v;
}

function normalizeEmail(v: string) {
  return String(v || "").trim().toLowerCase();
}

function isProbablyMobileUA() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android|iPhone|iPad|iPod/i.test(ua);
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua);
}

function emailProviderFromEmail(email: string) {
  const e = normalizeEmail(email);
  const domain = e.split("@")[1] || "";
  if (/gmail\.com$|googlemail\.com$/i.test(domain)) return "gmail";
  if (/outlook\.com$|hotmail\.com$|live\.com$|msn\.com$/i.test(domain)) return "outlook";
  if (/yahoo\.com$|yahoo\.[a-z]{2,}$/i.test(domain)) return "yahoo";
  if (/icloud\.com$|me\.com$|mac\.com$/i.test(domain)) return "icloud";
  return "other";
}

/**
 * "Open email" link behavior:
 * - Desktop: open provider webmail when known, otherwise open mailto:
 * - iOS: open Gmail/Outlook app when possible, else fall back to Apple Mail (message://)
 * - Android: best-effort gmail app
 */
function buildOpenEmailHref(email: string) {
  const provider = emailProviderFromEmail(email);
  const mobile = isProbablyMobileUA();

  if (!mobile) {
    if (provider === "gmail") return "https://mail.google.com/mail/u/0/#inbox";
    if (provider === "outlook") return "https://outlook.live.com/mail/0/inbox";
    if (provider === "yahoo") return "https://mail.yahoo.com/";
    if (provider === "icloud") return "https://www.icloud.com/mail/";
    return `mailto:${encodeURIComponent(email)}`;
  }

  if (isIOS()) {
    if (provider === "gmail") return "googlegmail://";
    if (provider === "outlook") return "ms-outlook://";
    return "message://";
  }

  if (provider === "gmail") {
    return "intent://#Intent;scheme=googlegmail;package=com.google.android.gm;end";
  }
  return `mailto:${encodeURIComponent(email)}`;
}

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

// Supabase often returns recovery context in URL hash: #type=recovery&access_token=...
function getHashParam(name: string) {
  if (typeof window === "undefined") return "";
  const hash = window.location.hash?.replace(/^#/, "") || "";
  const sp = new URLSearchParams(hash);
  return sp.get(name) || "";
}

/* ---------- Inline SVG Icons ---------- */
function MailVerifyIcon({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5C4 6.12 5.12 5 6.5 5h11C18.88 5 20 6.12 20 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-11C5.12 19 4 17.88 4 16.5v-9Z"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M5.2 7.7 11.2 12.1c.5.37 1.18.37 1.68 0l6-4.4"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 9h6m0 0-2-2m2 2-2 2"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OpenInIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M10 6H6.8A2.8 2.8 0 0 0 4 8.8v8.4A2.8 2.8 0 0 0 6.8 20h8.4A2.8 2.8 0 0 0 18 17.2V14"
        stroke="rgba(226,232,240,0.95)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14 4h6v6"
        stroke="rgba(34,211,238,0.95)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 4 11 13"
        stroke="rgba(34,211,238,0.95)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const redirectPath = (router.query.redirect as string) || "/";

  // Query flags
  const verifyFromQuery = firstQueryValue(router.query.verify as any) === "1";
  const verifyKindFromQuery = (firstQueryValue(router.query.kind as any) as VerifyKind) || "signup";
  const resetFromQuery = firstQueryValue(router.query.reset as any) === "1";
  const emailFromQuery = normalizeEmail(firstQueryValue(router.query.email as any));

  // Recovery is often signaled by: ?type=recovery OR #type=recovery
  const queryType = firstQueryValue(router.query.type as any);
  const hashType = getHashParam("type");
  const isRecoveryContext = queryType === "recovery" || hashType === "recovery" || resetFromQuery;

  const [mode, setMode] = useState<Mode>("login");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState(""); // login/signup input
  const [password, setPassword] = useState("");

  // Reset password fields
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Verify UI state
  const [verifyMode, setVerifyMode] = useState<boolean>(verifyFromQuery);
  const [verifyKind, setVerifyKind] = useState<VerifyKind>(verifyKindFromQuery);
  const [verifyEmail, setVerifyEmail] = useState<string>(emailFromQuery || "");

  // Recovery guard: prevents redirect while user is setting a new password
  const [recoveryActive, setRecoveryActive] = useState<boolean>(false);

  // Cooldowns/status
  const [resendCooldown, setResendCooldown] = useState<number>(verifyFromQuery ? 60 : 0);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const [forgotEmail, setForgotEmail] = useState<string>(emailFromQuery || "");
  const [forgotCooldown, setForgotCooldown] = useState<number>(0);
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);

  const openEmailHref = useMemo(
    () => buildOpenEmailHref(verifyEmail || forgotEmail),
    [verifyEmail, forgotEmail]
  );

  // -------------------------------------------------
  // Ensure profile exists AND email is stored in DB
  // -------------------------------------------------
  async function ensureProfile(user: any, overrides?: { full_name?: string | null }) {
    if (!user?.id) return;

    const bestEmailRaw = pickBestEmail(user);
    const bestEmail = bestEmailRaw ? normalizeEmail(bestEmailRaw) : null;
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
  // Auth state handling
  // - Detect recovery context (query/hash) => show reset UI and block redirect.
  // - When PASSWORD_RECOVERY happens, show reset UI.
  // - Don't auto-redirect while verify mode or forgot/reset or recovery is active.
  // -------------------------------------------------
  useEffect(() => {
    let unsub: any = null;

    const run = async () => {
      // If we are in recovery context, force reset UI immediately
      if (isRecoveryContext) {
        setVerifyMode(false);
        setMode("reset");
        setRecoveryActive(true);
      }

      const { data: sess } = await supabase.auth.getSession();
      const user = sess?.session?.user;

      // If we have a session but we're in recovery, do NOT redirect
      if (user) {
        await ensureProfile(user);
        if (!verifyMode && mode !== "forgot" && mode !== "reset" && !recoveryActive && !isRecoveryContext) {
          router.replace(redirectPath);
        }
        return;
      }

      const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === "PASSWORD_RECOVERY") {
          setError(null);
          setVerifyMode(false);
          setMode("reset");
          setRecoveryActive(true);
          return;
        }

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          // IMPORTANT: Supabase recovery link will sign in a user.
          // While recovering, we must not redirect away from reset screen.
          if (recoveryActive || isRecoveryContext) return;

          const u = session?.user;
          if (u) {
            await ensureProfile(u);
            if (!verifyMode && mode !== "forgot" && mode !== "reset") {
              router.replace(redirectPath);
            }
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
  }, [router, redirectPath, verifyMode, mode, isRecoveryContext, recoveryActive]);

  // -------------------------------------------------
  // Sync verify/reset mode from query (deep-linkable)
  // -------------------------------------------------
  useEffect(() => {
    if (!router.isReady) return;

    const vq = firstQueryValue(router.query.verify as any) === "1";
    const rq = firstQueryValue(router.query.reset as any) === "1";
    const eq = normalizeEmail(firstQueryValue(router.query.email as any));
    const kq = (firstQueryValue(router.query.kind as any) as VerifyKind) || "signup";

    if (eq) {
      setVerifyEmail(eq);
      setForgotEmail(eq);
    }

    // If reset=1 explicitly, show reset UI and block redirects
    if (rq) {
      setVerifyMode(false);
      setMode("reset");
      setRecoveryActive(true);
      setError(null);
      return;
    }

    if (vq) {
      setVerifyMode(true);
      setVerifyKind(kq);
      setMode("login"); // underlying mode doesn't matter while verifyMode is true
      setError(null);
      setResendStatus(null);
      setResendCooldown((c) => (c > 0 ? c : 30));
    }
  }, [router.isReady, router.query.verify, router.query.reset, router.query.email, router.query.kind]);

  // Countdown ticks
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (forgotCooldown <= 0) return;
    const t = setTimeout(() => setForgotCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [forgotCooldown]);

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
  // Check if email already exists (for signup UX)
  // ------------------------------
  const checkEmailExistsInProfiles = async (emailToCheck: string) => {
    const e = normalizeEmail(emailToCheck);
    if (!e) return false;

    const { data, error } = await supabase.from("profiles").select("id").eq("email", e).limit(1);

    if (error) {
      console.warn("checkEmailExistsInProfiles: cannot check (RLS?)", error);
      return false;
    }
    return (data || []).length > 0;
  };

  // ------------------------------
  // Resend signup verification email
  // ------------------------------
  const resendSignupVerification = async () => {
    const e = normalizeEmail(verifyEmail);
    if (!e) return;

    setError(null);
    setResendStatus(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: e,
      } as any);

      if (error) throw error;

      setResendStatus("Verification email sent again.");
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || "Could not resend verification email.");
    }
  };

  // ------------------------------
  // Resend reset password email
  // ------------------------------
  const resendResetEmail = async () => {
    const e = normalizeEmail(verifyEmail || forgotEmail);
    if (!e) return;

    setError(null);
    setResendStatus(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(e, {
        // NOTE: Supabase will append type=recovery (often in hash). We also detect hash now.
        redirectTo: `${window.location.origin}/auth?reset=1&redirect=${encodeURIComponent(redirectPath)}`,
      });
      if (error) throw error;

      setResendStatus("Reset email sent again.");
      setResendCooldown(60);
    } catch (err: any) {
      setError(err?.message || "Could not resend reset email.");
    }
  };

  // ------------------------------
  // Forgot password: send reset email
  // ------------------------------
  const handleForgot = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    setError(null);
    setForgotStatus(null);

    try {
      const eNorm = normalizeEmail(forgotEmail);
      if (!eNorm) {
        setError("Please enter your email.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(eNorm, {
        redirectTo: `${window.location.origin}/auth?reset=1&redirect=${encodeURIComponent(redirectPath)}`,
      });
      if (error) throw error;

      setForgotStatus("If an account exists for this email, we sent a reset link.");
      setForgotCooldown(60);

      // Show "check your email" screen
      setVerifyMode(true);
      setVerifyKind("reset");
      setVerifyEmail(eNorm);
      setResendStatus(null);
      setResendCooldown(30);

      router.replace({
        pathname: "/auth",
        query: { redirect: redirectPath, verify: "1", kind: "reset", email: eNorm },
      });
    } catch (err: any) {
      setError(err?.message || "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // Reset password: update user password
  // ------------------------------
  const handleResetPassword = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!newPassword || newPassword.length < 8) {
        setError("Please choose a password with at least 8 characters.");
        return;
      }
      if (newPassword !== newPassword2) {
        setError("Passwords do not match.");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Clear recovery guard and sign out for clarity
      setRecoveryActive(false);
      await supabase.auth.signOut();

      setNewPassword("");
      setNewPassword2("");
      setMode("login");
      setVerifyMode(false);
      setError(null);

      // Clear hash (it may contain tokens/type=recovery) by replacing URL
      router.replace({ pathname: "/auth", query: { redirect: redirectPath } });
    } catch (err: any) {
      setError(err?.message || "Could not update password.");
    } finally {
      setLoading(false);
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
        const exists = await checkEmailExistsInProfiles(eNorm);
        if (exists) {
          setError("An account with this email already exists. Please log in instead.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: eNorm,
          password,
          options: { data: { full_name: fullName.trim() } },
        });
        if (error) throw error;

        // Show verify UI
        setVerifyEmail(eNorm);
        setVerifyMode(true);
        setVerifyKind("signup");
        setResendStatus(null);
        setError(null);
        setResendCooldown(60);

        router.replace({
          pathname: "/auth",
          query: { redirect: redirectPath, verify: "1", kind: "signup", email: eNorm },
        });

        // If session exists (email confirmation OFF), create profile + redirect
        if (data.session?.user) {
          await ensureProfile(data.session.user, { full_name: fullName.trim() });
          router.replace(redirectPath);
        } else if (data.user) {
          await ensureProfile(data.user, { full_name: fullName.trim() });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: eNorm,
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
  const activeCooldown = verifyKind === "reset" ? forgotCooldown : resendCooldown;

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
      <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 14 }}>
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
          <div style={{ textAlign: "center", marginBottom: 22 }}>
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
            <div
  style={{
    marginTop: 6,
    fontSize: 12,
    background: "linear-gradient(90deg, #7dd3fc, #c084fc)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    fontWeight: 500,
  }}
>
  (pronounced as “Quantum Social”)
</div>            
            <div style={{ fontSize: 14, color: "#9ca3af" }}>Sign in to join the quantum ecosystem.</div>
          </div>

          {/* VERIFY MODE UI */}
          {verifyMode ? (
            <div style={{ textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
                <div
                  style={{
                    width: 62,
                    height: 62,
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.35)",
                    background:
                      "radial-gradient(circle at top left, rgba(34,211,238,0.16), rgba(15,23,42,0.92))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 0 0 6px rgba(34,211,238,0.06)",
                  }}
                >
                  <MailVerifyIcon size={30} />
                </div>
              </div>

              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Check your email</div>

              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
                {verifyKind === "signup" ? (
                  <>
                    We sent a verification link to{" "}
                    <span style={{ color: "rgba(226,232,240,0.95)" }}>{verifyEmail || "your inbox"}</span>.
                    Please open it to confirm your account.
                  </>
                ) : (
                  <>
                    We sent a reset link to{" "}
                    <span style={{ color: "rgba(226,232,240,0.95)" }}>{verifyEmail || "your inbox"}</span>.
                    Please open it to set a new password.
                  </>
                )}
              </div>

              <a
                href={openEmailHref}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 14px",
                  borderRadius: 999,
                  border: "1px solid rgba(34,211,238,0.85)",
                  background: "rgba(2,6,23,0.9)",
                  color: "#e5e7eb",
                  textDecoration: "none",
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                <OpenInIcon size={18} />
                Open email
              </a>

              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  onClick={async () => {
                    if (verifyKind === "reset") {
                      await resendResetEmail();
                    } else {
                      await resendSignupVerification();
                    }
                  }}
                  disabled={activeCooldown > 0}
                  style={{
                    ...oauthBtn,
                    opacity: activeCooldown > 0 ? 0.6 : 1,
                    cursor: activeCooldown > 0 ? "not-allowed" : "pointer",
                  }}
                >
                  Resend email{activeCooldown > 0 ? ` (${activeCooldown}s)` : ""}
                </button>
              </div>

              {resendStatus && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#86efac" }}>{resendStatus}</div>
              )}
              {forgotStatus && (
                <div style={{ marginTop: 10, fontSize: 12, color: "#86efac" }}>{forgotStatus}</div>
              )}

              {error && <div style={{ ...errorBox, marginTop: 12 }}>{error}</div>}

              <div style={{ marginTop: 14, fontSize: 12, color: "#94a3b8" }}>
                <button
                  type="button"
                  onClick={() => {
                    setVerifyMode(false);
                    setResendCooldown(0);
                    setForgotCooldown(0);
                    setResendStatus(null);
                    setForgotStatus(null);
                    setMode("login");
                    router.replace({ pathname: "/auth", query: { redirect: redirectPath } });
                  }}
                  style={{
                    background: "transparent",
                    border: "none",
                    padding: 0,
                    color: "#7dd3fc",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: 12,
                  }}
                >
                  Back to login
                </button>
              </div>
            </div>
          ) : mode === "reset" ? (
            // RESET PASSWORD UI
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>
                Set a new password
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, textAlign: "center" }}>
                Choose a new password for your account.
              </div>

              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12 }}>New password</label>
                  <input
                    type="password"
                    style={input}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12 }}>Confirm new password</label>
                  <input
                    type="password"
                    style={input}
                    value={newPassword2}
                    onChange={(e) => setNewPassword2(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                {error && <div style={errorBox}>{error}</div>}

                <button type="submit" disabled={loading} style={submitBtn}>
                  {loading ? "Please wait…" : "Update password"}
                </button>

                <div style={{ marginTop: 12, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setNewPassword("");
                      setNewPassword2("");
                      setRecoveryActive(false);
                      router.replace({ pathname: "/auth", query: { redirect: redirectPath } });
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      color: "#7dd3fc",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: 12,
                    }}
                  >
                    Back to login
                  </button>
                </div>
              </form>
            </div>
          ) : mode === "forgot" ? (
            // FORGOT PASSWORD UI
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>
                Reset your password
              </div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16, textAlign: "center" }}>
                Enter your email and we’ll send you a reset link.
              </div>

              <form onSubmit={handleForgot}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12 }}>Email</label>
                  <input
                    type="email"
                    style={input}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>

                {error && <div style={errorBox}>{error}</div>}

                <button type="submit" disabled={loading || forgotCooldown > 0} style={submitBtn}>
                  {loading ? "Please wait…" : "Send reset link"}
                </button>

                <div style={{ marginTop: 12, textAlign: "center" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                      setForgotStatus(null);
                      router.replace({ pathname: "/auth", query: { redirect: redirectPath } });
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      color: "#7dd3fc",
                      cursor: "pointer",
                      textDecoration: "underline",
                      fontSize: 12,
                    }}
                  >
                    Back to login
                  </button>
                </div>
              </form>
            </div>
          ) : (
            // NORMAL AUTH UI (LOGIN/SIGNUP)
            <>
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

                <button type="button" onClick={() => handleOAuthLogin("linkedin_oidc")} style={oauthBtn}>
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

                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12 }}>Password</label>
                  <input
                    type="password"
                    style={input}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                {/* Forgot password link (only in login mode) */}
                {mode === "login" && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setForgotStatus(null);
                        setForgotCooldown(0);
                        setMode("forgot");
                        setForgotEmail(email ? normalizeEmail(email) : forgotEmail);
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        padding: 0,
                        color: "#7dd3fc",
                        cursor: "pointer",
                        textDecoration: "underline",
                        fontSize: 12,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && <div style={errorBox}>{error}</div>}

                <button type="submit" disabled={loading} style={submitBtn}>
                  {loading ? "Please wait…" : mode === "signup" ? "Sign up with email" : "Log in with email"}
                </button>
              </form>
            </>
          )}
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
