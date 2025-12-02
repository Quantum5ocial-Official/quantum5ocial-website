// pages/dashboard/entangled-states.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

const Navbar = dynamic(() => import("../../components/Navbar"), { ssr: false });

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url?: string | null;
  affiliation?: string | null;
  current_org?: string | null;
  role?: string | null;
  describes_you?: string | null;
};

export default function EntangledStatesPage() {
  const { user } = useSupabaseUser();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadConnections = async () => {
      if (!user) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      // 1) Get all accepted connections that involve this user
      const { data: connData, error: connError } = await supabase
        .from("connections") // <- adjust table name if different
        .select("id, user_id, target_user_id, status")
        .eq("status", "accepted")
        .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

      if (connError) {
        console.error(connError);
        setErrorMsg("Could not load your entangled states.");
        setProfiles([]);
        setLoading(false);
        return;
      }

      if (!connData || connData.length === 0) {
        setProfiles([]);
        setLoading(false);
        return;
      }

      // 2) Determine the "other side" of each connection
      const otherIds = Array.from(
        new Set(
          connData.map((c: any) =>
            c.user_id === user.id ? c.target_user_id : c.user_id
          )
        )
      );

      // 3) Fetch their profiles
      const { data: profData, error: profError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, affiliation, current_org, role, describes_you")
        .in("id", otherIds);

      if (profError) {
        console.error(profError);
        setErrorMsg("Could not load connected profiles.");
        setProfiles([]);
        setLoading(false);
        return;
      }

      setProfiles((profData || []) as Profile[]);
      setLoading(false);
    };

    loadConnections();
  }, [user]);

  const entangledCount = profiles.length;

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <main className="section">
          <header
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 20,
            }}
          >
            <div>
              <h1
                style={{
                  fontSize: "1.3rem",
                  marginBottom: 4,
                }}
              >
                Entangled states
              </h1>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Your accepted connections in the Quantum Community.
              </p>
            </div>

            <div
              style={{
                padding: "6px 12px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.7)",
                fontSize: 13,
              }}
            >
              Entangled states: <strong>{entangledCount}</strong>
            </div>
          </header>

          {loading ? (
            <div className="products-status">Loading entangled states…</div>
          ) : !user ? (
            <div className="products-empty">
              Please sign in to see your entangled states.
            </div>
          ) : entangledCount === 0 ? (
            <div className="products-empty">
              You have no entangled states yet. Visit the{" "}
              <Link href="/community" className="section-link">
                community
              </Link>{" "}
              and start connecting.
            </div>
          ) : (
            <div className="card-row">
              {profiles.map((p) => {
                const name = p.full_name || "Quantum member";
                const meta = [
                  p.role || p.describes_you || null,
                  p.affiliation || p.current_org || null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div key={p.id} className="card">
                    <div
                      className="card-inner"
                      style={{
                        display: "flex",
                        gap: 14,
                        alignItems: "flex-start",
                      }}
                    >
                      {/* avatar */}
                      <div
                        style={{
                          width: 52,
                          height: 52,
                          borderRadius: "999px",
                          overflow: "hidden",
                          border: "1px solid rgba(148,163,184,0.5)",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            "linear-gradient(135deg,#3bc7f3,#8468ff)",
                          color: "#fff",
                          fontWeight: 600,
                        }}
                      >
                        {p.avatar_url ? (
                          <img
                            src={p.avatar_url}
                            alt={name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          (name || "Q").charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="card-title">{name}</div>
                        {meta && (
                          <div
                            className="card-meta"
                            style={{ marginTop: 2 }}
                          >
                            {meta}
                          </div>
                        )}
                        <div
                          className="card-footer-text"
                          style={{ marginTop: 6 }}
                        >
                          One of your entangled states in the Quantum Community.
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {errorMsg && (
            <p
              style={{
                marginTop: 12,
                fontSize: 13,
                color: "#f97373",
              }}
            >
              {errorMsg}
            </p>
          )}
        </main>
      </div>
    </>
  );
}
