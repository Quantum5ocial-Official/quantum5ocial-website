// pages/community.tsx
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "../lib/supabaseClient";

const Navbar = dynamic(() => import("../components/Navbar"), { ssr: false });

type CommunityProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export default function CommunityPage() {
  const [profiles, setProfiles] = useState<CommunityProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProfiles = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Error loading community profiles:", error);
        setError("Could not load community members right now.");
        setProfiles([]);
      } else {
        setProfiles((data || []) as CommunityProfile[]);
      }

      setLoading(false);
    };

    loadProfiles();
  }, []);

  return (
    <>
      <div className="bg-layer" />
      <div className="page">
        <Navbar />

        <section className="section">
          <div className="section-header">
            <div>
              <div className="section-title">Community</div>
              <div className="section-sub">
                Meet other members of the Quantum5ocial ecosystem.
              </div>
            </div>
          </div>

          {loading && (
            <div className="products-status">Loading community members…</div>
          )}

          {error && !loading && (
            <div className="products-status error">{error}</div>
          )}

          {!loading && !error && profiles.length === 0 && (
            <div className="products-empty">
              No profiles visible yet. Be the first to complete your profile!
            </div>
          )}

          {!loading && !error && profiles.length > 0 && (
            <div className="card-row">
              {profiles.map((p) => {
                const name = p.full_name || "Quantum5ocial member";
                const initial = name.charAt(0).toUpperCase();

                return (
                  <div key={p.id} className="card" style={{ textDecoration: "none" }}>
                    <div className="card-inner" style={{ display: "flex", gap: 12 }}>
                      {/* Avatar */}
                      <div
                        style={{
                          width: 44,
                          height: 44,
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

                      {/* Text */}
                      <div style={{ minWidth: 0 }}>
                        <div
                          className="card-title"
                          style={{
                            marginBottom: 2,
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
                        <div
                          className="card-footer-text"
                          style={{ marginTop: 6, fontSize: "0.7rem" }}
                        >
                          In future, this tile can link to a public profile page.
                        </div>
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
