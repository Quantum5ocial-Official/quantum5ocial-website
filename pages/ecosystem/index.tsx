// pages/ecosystem/index.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

export default function EcosystemIndexPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [entangledCount, setEntangledCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [mainLoading, setMainLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.replace("/auth?redirect=/ecosystem");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) {
      setMainLoading(false);
      setEntangledCount(0);
      setFollowingCount(0);
      return;
    }

    const loadCounts = async () => {
      setMainLoading(true);
      setErrorMsg(null);

      try {
        // 1) Entangled count (accepted connections involving me)
        const { data: connData, error: connErr } = await supabase
          .from("connections")
          .select("user_id, target_user_id, status")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (connErr) throw connErr;

        if (connData && connData.length > 0) {
          const otherIds = Array.from(
            new Set(
              connData.map((c: any) =>
                c.user_id === user.id ? c.target_user_id : c.user_id
              )
            )
          );
          setEntangledCount(otherIds.length);
        } else {
          setEntangledCount(0);
        }

        // 2) Following count (org_follows)
        const { data: followRows, error: followErr } = await supabase
          .from("org_follows")
          .select("org_id")
          .eq("user_id", user.id);

        if (followErr) throw followErr;

        const orgIds = Array.from(
          new Set((followRows || []).map((r: any) => r.org_id))
        );
        setFollowingCount(orgIds.length);
      } catch (e) {
        console.error("Error loading ecosystem counts", e);
        setErrorMsg("Could not load your ecosystem right now.");
        setEntangledCount(0);
        setFollowingCount(0);
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
            <div className="section-title" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              My ecosystem
              {!mainLoading && !errorMsg && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(56,189,248,0.45)",
                    color: "#7dd3fc",
                    whiteSpace: "nowrap",
                  }}
                >
                  Live counts
                </span>
              )}
            </div>
            <div className="section-sub" style={{ maxWidth: 680, lineHeight: 1.45 }}>
              A personal dashboard of your quantum network. This will grow into a grid of tiles (4×4) over time.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, minWidth: 160 }}>
            <Link href="/community" className="section-link" style={{ fontSize: 13 }}>
              Explore community →
            </Link>
            <Link href="/orgs" className="section-link" style={{ fontSize: 13 }}>
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

      {/* TILE GRID */}
      {!mainLoading && !errorMsg && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {/* Tile: Entangled */}
          <Link
            href="/ecosystem/entangled"
            className="card"
            style={{
              textDecoration: "none",
              color: "inherit",
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(34,211,238,0.45)",
              background:
                "radial-gradient(circle at top left, rgba(34,211,238,0.14), rgba(15,23,42,0.96))",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#7dd3fc" }}>
                  Entangled members
                </div>
                <div style={{ marginTop: 6, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
                  {entangledCount}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(148,163,184,0.95)", lineHeight: 1.45 }}>
                  People you are connected with in the quantum ecosystem.
                </div>
              </div>
              <div style={{ fontSize: 18, opacity: 0.95 }}>🧬</div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: "#7dd3fc" }}>Open →</div>
          </Link>

          {/* Tile: Following */}
          <Link
            href="/ecosystem/following"
            className="card"
            style={{
              textDecoration: "none",
              color: "inherit",
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(168,85,247,0.45)",
              background:
                "radial-gradient(circle at top left, rgba(168,85,247,0.14), rgba(15,23,42,0.96))",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c4b5fd" }}>
                  Organizations I follow
                </div>
                <div style={{ marginTop: 6, fontSize: 28, fontWeight: 800, lineHeight: 1 }}>
                  {followingCount}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: "rgba(148,163,184,0.95)", lineHeight: 1.45 }}>
                  Companies and research groups you want to track.
                </div>
              </div>
              <div style={{ fontSize: 18, opacity: 0.95 }}>🏢</div>
            </div>

            <div style={{ marginTop: 12, fontSize: 12, color: "#c4b5fd" }}>Open →</div>
          </Link>

          {/* Placeholder tiles for later */}
          <div
            className="card"
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px dashed rgba(148,163,184,0.35)",
              background: "rgba(15,23,42,0.7)",
              opacity: 0.85,
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(148,163,184,0.9)" }}>
              Coming soon
            </div>
            <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>
              Saved jobs, saved products, my groups…
            </div>
            <div style={{ marginTop: 6, fontSize: 12, color: "rgba(148,163,184,0.95)", lineHeight: 1.45 }}>
              This dashboard will become a 4×4 tile system over time.
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

(EcosystemIndexPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
