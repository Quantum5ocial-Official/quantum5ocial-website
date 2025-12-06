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
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 28,
    marginTop: 32,
  }}
>
  {/* COMPANY TILE */}
  <Link href="/orgs/create/company" className="org-type-card-link">
    <div
      style={{
        borderRadius: 18,
        padding: "26px 28px",
        border: "1px solid rgba(148,163,184,0.22)",
        background:
          "linear-gradient(135deg, rgba(15,23,42,0.88), rgba(22,29,50,0.92))",
        boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        transition:
          "transform 120ms ease-out, box-shadow 150ms ease-out, border-color 120ms ease-out",
      }}
      className="hover-tile"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, #3bc7f3cc, #8468ffcc)",
            color: "#0f172a",
            fontSize: 22,
            fontWeight: 600,
            boxShadow: "0 0 12px rgba(99,102,241,0.5)",
          }}
        >
          🏢
        </div>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Company
        </h2>
      </div>

      <p
        style={{
          color: "rgba(229,231,235,0.88)",
          fontSize: 14.5,
          lineHeight: 1.55,
          marginBottom: 18,
          maxWidth: 380,
        }}
      >
        For startups, scale-ups, corporates, and vendors offering jobs,
        products, or services across the quantum ecosystem.
      </p>

      <span
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "#7dd3fc",
        }}
      >
        Get started →
      </span>
    </div>
  </Link>

  {/* RESEARCH GROUP TILE */}
  <Link href="/orgs/create/research-group" className="org-type-card-link">
    <div
      style={{
        borderRadius: 18,
        padding: "26px 28px",
        border: "1px solid rgba(148,163,184,0.22)",
        background:
          "linear-gradient(135deg, rgba(15,23,42,0.88), rgba(22,29,50,0.92))",
        boxShadow: "0 18px 40px rgba(0,0,0,0.45)",
        transition:
          "transform 120ms ease-out, box-shadow 150ms ease-out, border-color 120ms ease-out",
      }}
      className="hover-tile"
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background:
              "linear-gradient(135deg, #a855f7cc, #3b82f6cc)",
            color: "#0f172a",
            fontSize: 22,
            fontWeight: 600,
            boxShadow: "0 0 12px rgba(168,85,247,0.45)",
          }}
        >
          🧪
        </div>

        <h2
          style={{
            fontSize: 20,
            fontWeight: 600,
            background: "linear-gradient(90deg,#a855f7,#3b82f6)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Research group
        </h2>
      </div>

      <p
        style={{
          color: "rgba(229,231,235,0.88)",
          fontSize: 14.5,
          lineHeight: 1.55,
          marginBottom: 18,
          maxWidth: 380,
        }}
      >
        For labs, institutes, and research collaborations that want a simple
        profile to link people, projects, and job opportunities.
      </p>

      <span
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: "#c084fc",
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
