// pages/ecosystem/index.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

export default function EcosystemIndexPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [entangledCount, setEntangledCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [savedJobsCount, setSavedJobsCount] = useState(0);
  const [savedProductsCount, setSavedProductsCount] = useState(0);

  const [mainLoading, setMainLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.replace("/auth?redirect=/ecosystem");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) {
      setMainLoading(false);
      return;
    }

    const loadCounts = async () => {
      setMainLoading(true);
      setErrorMsg(null);

      try {
        // Entangled members
        const { data: connData } = await supabase
          .from("connections")
          .select("user_id, target_user_id")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (connData) {
          const otherIds = Array.from(
            new Set(
              connData.map((c: any) =>
                c.user_id === user.id ? c.target_user_id : c.user_id
              )
            )
          );
          setEntangledCount(otherIds.length);
        }

        // Followed orgs
        const { data: followRows } = await supabase
          .from("org_follows")
          .select("org_id")
          .eq("user_id", user.id);

        setFollowingCount(new Set((followRows || []).map((r: any) => r.org_id)).size);

        // Saved jobs
        const { data: savedJobs } = await supabase
          .from("saved_jobs")
          .select("job_id")
          .eq("user_id", user.id);

        setSavedJobsCount(savedJobs?.length || 0);

        // Saved products
        const { data: savedProducts } = await supabase
          .from("saved_products")
          .select("product_id")
          .eq("user_id", user.id);

        setSavedProductsCount(savedProducts?.length || 0);
      } catch (e) {
        console.error("Ecosystem count error", e);
        setErrorMsg("Could not load your ecosystem right now.");
      } finally {
        setMainLoading(false);
      }
    };

    loadCounts();
  }, [user]);

  if (!user && !loading) return null;

  return (
    <section className="section">
      {/* HERO */}
      <div
        className="card"
        style={{
          padding: 20,
          marginBottom: 16,
          background:
            "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), rgba(15,23,42,0.95))",
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
            <div className="section-title">My ecosystem</div>
            <div className="section-sub" style={{ maxWidth: 680 }}>
              Your personal quantum dashboard. This will evolve into a rich 4×4
              ecosystem view over time.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/community" className="section-link">
              Explore community →
            </Link>
            <Link href="/orgs" className="section-link">
              Discover organizations →
            </Link>
          </div>
        </div>
      </div>

      {/* STATES */}
      {mainLoading && <div className="products-status">Loading your ecosystem…</div>}
      {errorMsg && !mainLoading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {errorMsg}
        </div>
      )}

      {/* TILES */}
      {!mainLoading && !errorMsg && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 14,
          }}
        >
          {/* Entangled */}
          <Tile
            href="/ecosystem/entangled"
            label="Entangled members"
            count={entangledCount}
            icon="🧬"
            color="#22d3ee"
            description="People you are connected with in the quantum ecosystem."
          />

          {/* Following */}
          <Tile
            href="/ecosystem/following"
            label="Organizations I follow"
            count={followingCount}
            icon="🏢"
            color="#a855f7"
            description="Companies and research groups you track."
          />

          {/* Saved jobs */}
          <Tile
            href="/ecosystem/saved-jobs"
            label="Saved jobs"
            count={savedJobsCount}
            icon="💼"
            color="#22c55e"
            description="Roles you’ve bookmarked for later."
          />

          {/* Saved products */}
          <Tile
            href="/ecosystem/saved-products"
            label="Saved products"
            count={savedProductsCount}
            icon="🛒"
            color="#f59e0b"
            description="Marketplace items you want to revisit."
          />

          {/* My posts (placeholder) */}
          <div
            className="card"
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px dashed rgba(148,163,184,0.35)",
              background: "rgba(15,23,42,0.7)",
            }}
          >
            <div style={{ fontSize: 12, textTransform: "uppercase", opacity: 0.8 }}>
              My posts
            </div>
            <div style={{ marginTop: 10, fontSize: 14, fontWeight: 600 }}>
              Coming soon
            </div>
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85 }}>
              Your activity, discussions, and contributions.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Tile({
  href,
  label,
  count,
  description,
  icon,
  color,
}: {
  href: string;
  label: string;
  count: number;
  description: string;
  icon: string;
  color: string;
}) {
  return (
    <Link
      href={href}
      className="card"
      style={{
        textDecoration: "none",
        color: "inherit",
        padding: 16,
        borderRadius: 16,
        border: `1px solid ${color}66`,
        background: `radial-gradient(circle at top left, ${color}22, rgba(15,23,42,0.96))`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color,
            }}
          >
            {label}
          </div>
          <div style={{ marginTop: 6, fontSize: 28, fontWeight: 800 }}>
            {count}
          </div>
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.9 }}>
            {description}
          </div>
        </div>
        <div style={{ fontSize: 18 }}>{icon}</div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color }}>Open →</div>
    </Link>
  );
}

(EcosystemIndexPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
