// pages/orgs/create/index.tsx
import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

export default function CreateOrganizationLanding() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  // Optional: if not logged in, send to auth
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

  if (loading || (!user && typeof window !== "undefined")) {
    return null; // or a small spinner later
  }

  return (
    <main
      style={{
        minHeight: "calc(100vh - 72px)",
        padding: "40px 24px 64px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
        }}
      >
        <header
          style={{
            marginBottom: 32,
          }}
        >
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Create an organization page
          </h1>
          <p
            style={{
              fontSize: 15,
              opacity: 0.8,
              maxWidth: 640,
            }}
          >
            Represent your company or research group on Quantum5ocial. Choose
            what best describes your organization to get started.
          </p>
        </header>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 24,
          }}
        >
          {/* Company tile */}
          <Link href="/orgs/create/company" className="org-type-card-link">
            <div
              className="org-type-card"
              style={{
                borderRadius: 16,
                padding: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
                cursor: "pointer",
                transition:
                  "transform 120ms ease-out, box-shadow 120ms ease-out, border-color 120ms ease-out",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 12,
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  🏢
                </div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  Company
                </h2>
              </div>
              <p
                style={{
                  fontSize: 14,
                  opacity: 0.85,
                  marginBottom: 16,
                }}
              >
                For startups, scale-ups, corporates, vendors and other
                organizations offering jobs, products or services.
              </p>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: 0.9,
                }}
              >
                Get started →
              </span>
            </div>
          </Link>

          {/* Research group tile */}
          <Link
            href="/orgs/create/research-group"
            className="org-type-card-link"
          >
            <div
              className="org-type-card"
              style={{
                borderRadius: 16,
                padding: 24,
                border: "1px solid rgba(255,255,255,0.08)",
                background:
                  "linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                boxShadow: "0 12px 30px rgba(0,0,0,0.18)",
                cursor: "pointer",
                transition:
                  "transform 120ms ease-out, box-shadow 120ms ease-out, border-color 120ms ease-out",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginBottom: 12,
                  gap: 10,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 999,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  🧪
                </div>
                <h2
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                >
                  Research group
                </h2>
              </div>
              <p
                style={{
                  fontSize: 14,
                  opacity: 0.85,
                  marginBottom: 16,
                }}
              >
                For university labs, institutes, and research collaborations
                working on quantum or adjacent fields.
              </p>
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: 0.9,
                }}
              >
                Get started →
              </span>
            </div>
          </Link>
        </section>
      </div>
    </main>
  );
}
