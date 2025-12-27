// pages/ecosystem/cv.tsx
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

export default function EcosystemMyCvPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/ecosystem/my-cv");
    }
  }, [loading, user, router]);

  if (!user && !loading) return null;

  return (
    <section className="section">
      {/* Header card — matches your original my-posts header */}
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
            <div className="section-title">📄 My CV</div>
            <div className="section-sub" style={{ maxWidth: 560 }}>
              Your CV hub — always up to date, and easy to share.
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

      {/* Placeholder card */}
      <div className="card" style={{ padding: 18 }}>
        <div className="section-title" style={{ fontSize: 16 }}>
          Your CV, always up to date
        </div>

        <div className="section-sub" style={{ maxWidth: 620, marginTop: 6 }}>
          We’ll help you build and maintain a clean, up-to-date CV directly from your
          Quantum5ocial profile — including experience, publications, skills, and projects.
        </div>

        <div className="section-sub" style={{ maxWidth: 620, marginTop: 10 }}>
          Your CV will be easily shareable with hiring managers, collaborators, and
          organizations — always reflecting your latest work.
        </div>

        <div style={{ marginTop: 14, fontSize: 13, color: "#94a3b8" }}>Coming soon.</div>
      </div>
    </section>
  );
}

(EcosystemMyCvPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
