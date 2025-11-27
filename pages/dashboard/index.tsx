import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";

export default function DashboardHome() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserEmail(data.user.email ?? null);
      }
      setCheckingAuth(false);
    };
    check();
  }, []);

  if (checkingAuth) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#020617",
          color: "#e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui",
        }}
      >
        Checking session...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        fontFamily: "system-ui",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 24, marginBottom: 6 }}>Welcome to your dashboard</h1>
        {userEmail && (
          <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 14 }}>
            Logged in as <span style={{ color: "#e5e7eb" }}>{userEmail}</span>
          </p>
        )}

        <p style={{ fontSize: 13, color: "#9ca3af", marginBottom: 18 }}>
          Choose how you want to use Quantum5ocial right now. You can just browse, or start
          posting opportunities and products.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
          }}
        >
          {/* Search jobs */}
          <button
            onClick={() => router.push("/jobs")}
            style={{
              textAlign: "left",
              padding: "14px 16px",
              borderRadius: 18,
              border: "1px solid #1f2937",
              background:
                "radial-gradient(circle at top left, rgba(34,211,238,0.16), transparent 55%), #020617",
              color: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Search jobs
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              Browse quantum jobs across PhD, postdoc and industry roles.
            </div>
          </button>

          {/* Post a job */}
          <button
            onClick={() => router.push("/dashboard/post-job")}
            style={{
              textAlign: "left",
              padding: "14px 16px",
              borderRadius: 18,
              border: "1px solid #1f2937",
              background:
                "radial-gradient(circle at top left, rgba(168,85,247,0.18), transparent 55%), #020617",
              color: "#e5e7eb",
              cursor: "pointer",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 6 }}>📤</div>
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
              Post a job
            </div>
            <div style={{ fontSize: 13, color: "#9ca3af" }}>
              Share an opportunity from your lab, institute or company.
            </div>
          </button>

          {/* Explore / skip for now */}
<button
  onClick={() => router.push("/")}
  style={{
    textAlign: "left",
    padding: "14px 16px",
    borderRadius: 18,
    border: "1px solid #1f2937",
    background:
      "radial-gradient(circle at top left, rgba(56,189,248,0.12), transparent 55%), #020617",
    color: "#e5e7eb",
    cursor: "pointer",
  }}
>
  <div style={{ fontSize: 22, marginBottom: 6 }}>🧭</div>
  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
    Explore / skip for now
  </div>
  <div style={{ fontSize: 13, color: "#9ca3af" }}>
    Browse the public homepage. You can post jobs anytime later.
  </div>
</button>
        </div>
      </div>
    </div>
  );
}
