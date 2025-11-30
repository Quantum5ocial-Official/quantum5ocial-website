// pages/community.tsx
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export default function CommunityPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // wait until we know auth state

    const loadProfiles = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .order("full_name", { ascending: true });

        // Don't show the current user in the list
        if (user?.id) {
          query = query.neq("id", user.id);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Error loading profiles:", error);
          setError("Could not load community members.");
          setProfiles([]);
        } else {
          setProfiles((data || []) as Profile[]);
        }
      } catch (e: any) {
        console.error("Community load crashed:", e);
        setError("Something went wrong while loading the community.");
        setProfiles([]);
      } finally {
        setLoading(false);
      }
    };

    loadProfiles();
  }, [authLoading, user?.id]);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Quantum5ocial community</div>
              <div className="section-sub">
                Discover other members of the quantum ecosystem and start to{" "}
                <span style={{ color: "#7dd3fc" }}>entangle</span> with them.
              </div>
            </div>
            {!loading && !error && (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                }}
              >
                {profiles.length} member{profiles.length === 1 ? "" : "s"} listed
              </div>
            )}
          </div>

          {loading && (
            <div className="products-status">Loading community members…</div>
          )}

          {error && !loading && (
            <div className="products-status" style={{ color: "#f87171" }}>
              {error}
            </div>
          )}

          {!loading && !error && profiles.length === 0 && (
            <div className="products-empty">
              No other members visible yet. As more users complete their profiles,
              they will appear here.
            </div>
          )}

          {!loading && !error && profiles.length > 0 && (
            <div className="card-row">
              {profiles.map((p) => {
                const name = p.full_name || "Quantum5ocial member";
                const initial = name.charAt(0).toUpperCase();

                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{ textDecoration: "none", paddingBottom: "14px" }}
                  >
                    <div
                      className="card-inner"
                      style={{ display: "flex", gap: 12 }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "999px",
                          overflow: "hidden",
                          flexShrink: 0,
                          border: "1px solid rgba(148,163,184,0.4)",
                          background: "rgba(15,23,42,0.9)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 18,
                          fontWeight: 600,
                          color: "#e5e7eb",
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
                          <span>{initial}</span>
                        )}
                      </div>

                      {/* Text + Entangle */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          className="card-title"
                          style={{
                            marginBottom: 4,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {name}
                        </div>

                        <div className="card-meta">
                          Quantum5ocial community member
                        </div>

                        <button
                          type="button"
                          style={{
                            marginTop: 10,
                            padding: "6px 12px",
                            borderRadius: 8,
                            background: "rgba(59,130,246,0.15)",
                            border: "1px solid rgba(59,130,246,0.4)",
                            color: "#bfdbfe",
                            fontSize: "12px",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            // TODO: entangle logic later
                            console.log("Entangle with", p.id);
                          }}
                        >
                          Entangle
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
