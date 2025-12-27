// pages/ecosystem/publications.tsx
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

export default function EcosystemMyPublicationsPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth?redirect=/ecosystem/my-publications");
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
            <div className="section-title">📚 My publications</div>
            <div className="section-sub" style={{ maxWidth: 560 }}>
              A personal list of your papers, preprints, and conference outputs. (Mock page for now.)
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

      <div className="card" style={{ padding: 16 }}>
        <div className="profile-muted">Coming soon.</div>
      </div>
    </section>
  );
}

(EcosystemMyPublicationsPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
