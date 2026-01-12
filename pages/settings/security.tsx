// pages/settings/security.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

export default function SettingsSecurityPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  // Require login
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/settings/security");
    }
  }, [loading, user, router]);

  if (!user && !loading) return null;

  const isEmailPasswordUser =
    (user as any)?.app_metadata?.provider === "email" ||
    (Array.isArray((user as any)?.app_metadata?.providers) &&
      (user as any)?.app_metadata?.providers?.includes("email"));

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== newPassword2) {
      setError("New passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      // Optional: if they provided current password, verify it first
      // (Supabase does not require current password for updateUser, so we do a best-effort check)
      if (currentPassword && isEmailPasswordUser) {
        const email = (user as any)?.email;
        if (email) {
          const { error: reauthErr } = await supabase.auth.signInWithPassword({
            email,
            password: currentPassword,
          });
          if (reauthErr) {
            setError("Current password is incorrect.");
            setSaving(false);
            return;
          }
        }
      }

      const { error: upErr } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (upErr) throw upErr;

      setCurrentPassword("");
      setNewPassword("");
      setNewPassword2("");
      setOk("Password updated successfully.");
    } catch (err: any) {
      setError(err?.message || "Could not update password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="section">
      {/* Header card — same style as your ecosystem pages */}
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.18), rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 16,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div className="section-title">🔒 Security</div>
            <div className="section-sub" style={{ maxWidth: 560 }}>
              Set or change your password for email login.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
            }}
          >
            <Link href="/profile" className="section-link" style={{ fontSize: 13 }}>
              ← Back to profile
            </Link>
            <Link href="/ecosystem" className="section-link" style={{ fontSize: 13 }}>
              Back to ecosystem →
            </Link>
          </div>
        </div>
      </div>

      {/* Main card */}
      <div className="card" style={{ padding: 18 }}>
        <div className="section-title" style={{ fontSize: 16 }}>
          Change password
        </div>

        <div className="section-sub" style={{ maxWidth: 720, marginTop: 6 }}>
          If you signed up with Google/LinkedIn/GitHub, you may not have an email password yet.
          You can still set one here to enable email + password login.
        </div>

        <form onSubmit={handleUpdatePassword} style={{ marginTop: 14, maxWidth: 520 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "rgba(226,232,240,0.92)" }}>
              Current password{" "}
              <span style={{ color: "#94a3b8" }}>
                (optional{isEmailPasswordUser ? "" : " — for OAuth users"})
              </span>
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              style={input}
              autoComplete="current-password"
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "rgba(226,232,240,0.92)" }}>
              New password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              style={input}
              autoComplete="new-password"
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "rgba(226,232,240,0.92)" }}>
              Confirm new password
            </label>
            <input
              type="password"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              placeholder="Repeat new password"
              style={input}
              autoComplete="new-password"
            />
          </div>

          {error && <div style={errorBox}>{error}</div>}
          {ok && (
            <div
              style={{
                padding: "8px 10px",
                background: "rgba(34,197,94,0.18)",
                color: "rgba(134,239,172,0.95)",
                borderRadius: 9,
                fontSize: 12,
                marginBottom: 10,
                border: "1px solid rgba(34,197,94,0.35)",
              }}
            >
              {ok}
            </div>
          )}

          <button type="submit" disabled={saving} style={submitBtn}>
            {saving ? "Updating…" : "Update password"}
          </button>

          <div style={{ marginTop: 10, fontSize: 12, color: "#94a3b8" }}>
            Tip: after setting a password, you can log out and log back in using email + password.
          </div>
        </form>
      </div>
    </section>
  );
}

(SettingsSecurityPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};

/* Styles (match your auth page inputs) */
const input: React.CSSProperties = {
  width: "100%",
  padding: "7px 9px",
  borderRadius: 9,
  border: "1px solid #374151",
  background: "#020617",
  color: "#e5e7eb",
  fontSize: 13,
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
