// pages/community.tsx
import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  highest_education: string | null;
  affiliation: string | null;
  role: string | null;        // adjust to current_role if needed
  short_bio: string | null;   // adjust to your column name if different
};

export default function CommunityPage() {
  const { user, loading: authLoading } = useSupabaseUser();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return; // wait for auth state

    const loadProfiles = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, highest_education, affiliation, role, short_bio"
          )
          .order("full_name", { ascending: true });

        // Hide the currently logged-in user from the list
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
                Discover members of the quantum ecosystem and{" "}
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
              No members visible yet. As more users join Quantum5ocial, they will appear
              here.
            </div>
          )}

          {!loading && !error && profiles.length > 0 && (
            <div className="card-row">
              {profiles.map((p) => {
                const name = p.full_name || "Quantum5ocial member";
                const initial = name.charAt(0).toUpperCase();

                const highestEducation = p.highest_education || "—";
                const affiliation = p.affiliation || "—";
                const role = p.role || "—";
                const shortBio =
                  p.short_bio ||
                  "Quantum5ocial community member exploring the quantum ecosystem.";

                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      textDecoration: "none",
                      padding: 14,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      minHeight: 230, // makes it more square-ish and consistent
                    }}
                  >
                    <div className="card-inner">
                      {/* Top row: avatar + name */}
                      <div
                        style={{
                          display: "flex",
                          gap: 12,
                          alignItems: "center",
                          marginBottom: 8,
                        }}
                      >
                        <div
                          style={{
                            width: 52,
                            height: 52,
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
                          <div
                            className="card-meta"
                            style={{ fontSize: 12, lineHeight: 1.4 }}
                          >
                            {role !== "—" ? role : "Quantum5ocial member"}
                          </div>
                        </div>
                      </div>

                      {/* Middle info block */}
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                          marginTop: 6,
                        }}
                      >
                        <div>
                          <span style={{ opacity: 0.7 }}>Education: </span>
                          <span>{highestEducation}</span>
                        </div>
                        <div>
                          <span style={{ opacity: 0.7 }}>Affiliation: </span>
                          <span>{affiliation}</span>
                        </div>
                        <div>
                          <span style={{ opacity: 0.7 }}>Role: </span>
                          <span>{role}</span>
                        </div>
                        <div
                          style={{
                            marginTop: 6,
                            fontSize: 12,
                            lineHeight: 1.4,
                            maxHeight: 60,
                            overflow: "hidden",
                          }}
                        >
                          {shortBio}
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Entangle button */}
                    <div style={{ marginTop: 12 }}>
                      <button
                        type="button"
                        style={{
                          width: "100%",
                          padding: "7px 0",
                          borderRadius: 10,
                          border: "1px solid rgba(59,130,246,0.6)",
                          background: "rgba(59,130,246,0.16)",
                          color: "#bfdbfe",
                          fontSize: 12,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                        }}
                        onClick={() => {
                          // TODO: real entangle/follow logic later
                          console.log("Entangle with", p.id);
                        }}
                      >
                        <span>Entangle</span>
                        <span style={{ fontSize: 14 }}>+</span>
                      </button>
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
