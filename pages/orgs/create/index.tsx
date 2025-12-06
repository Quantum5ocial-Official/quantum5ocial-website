// pages/orgs/create/index.tsx
import { useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../../components/Navbar"), {
  ssr: false,
});

export default function CreateOrganizationLanding() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  // If not logged in, send to auth
  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth");
    }
  }, [loading, user, router]);

  if (loading || (!user && typeof window !== "undefined")) {
    return null; // could add a spinner later
  }

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main
          style={{
            maxWidth: 960,
            margin: "0 auto",
            padding: "32px 24px 64px",
          }}
        >
          <header
            style={{
              marginBottom: 24,
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
                  border: "1px solid rgba(148,163,184,0.28)",
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.9))",
                  boxShadow: "0 14px 36px rgba(15,23,42,0.6)",
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
                      border: "1px solid rgba(148,163,184,0.6)",
                      background:
                        "linear-gradient(135deg,#3bc7f3,#8468ff)",
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
                  For startups, scale-ups, corporates, and vendors offering
                  jobs, products, or services in quantum and related fields.
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
                  border: "1px solid rgba(148,163,184,0.28)",
                  background:
                    "linear-gradient(135deg, rgba(15,23,42,0.96), rgba(15,23,42,0.9))",
                  boxShadow: "0 14px 36px rgba(15,23,42,0.6)",
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
                      border: "1px solid rgba(148,163,184,0.6)",
                      background:
                        "linear-gradient(135deg,#3bc7f3,#8468ff)",
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
                  that want a simple profile to link people, jobs and projects.
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
        </main>
      </div>
    </>
  );
}
