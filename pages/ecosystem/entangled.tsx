// pages/ecosystem/entangled.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type EntangledProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  affiliation: string | null;
  role: string | null;
};

export default function EcosystemEntangledPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [profiles, setProfiles] = useState<EntangledProfile[]>([]);
  const [mainLoading, setMainLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [search, setSearch] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.replace("/auth?redirect=/ecosystem/entangled");
  }, [loading, user, router]);

  // Load entangled profiles
  useEffect(() => {
    if (!user) {
      setMainLoading(false);
      setProfiles([]);
      return;
    }

    const load = async () => {
      setMainLoading(true);
      setErrorMsg(null);

      try {
        const { data: connData, error: connError } = await supabase
          .from("connections")
          .select("user_id, target_user_id, status")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (connError) throw connError;

        const otherIds = Array.from(
          new Set(
            (connData || []).map((c: any) =>
              c.user_id === user.id ? c.target_user_id : c.user_id
            )
          )
        ).filter((id) => id && id !== user.id);

        if (otherIds.length === 0) {
          setProfiles([]);
          return;
        }

        // ✅ Only select columns that definitely exist
        const { data: profData, error: profError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, affiliation, role")
          .in("id", otherIds);

        if (profError) throw profError;

        setProfiles((profData || []) as EntangledProfile[]);
      } catch (e) {
        console.error("Error loading entangled profiles", e);
        setErrorMsg("Could not load entangled members. Please try again later.");
        setProfiles([]);
      } finally {
        setMainLoading(false);
      }
    };

    load();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return profiles;

    return profiles.filter((p) => {
      const haystack = `${p.full_name || ""} ${p.role || ""} ${p.affiliation || ""}`
        .toLowerCase()
        .trim();
      return haystack.includes(q);
    });
  }, [profiles, search]);

  const total = profiles.length;

  if (!user && !loading) return null;

  const entangledPill: React.CSSProperties = {
    fontSize: 10.5,
    borderRadius: 999,
    padding: "2px 8px",
    border: "1px solid rgba(74,222,128,0.7)",
    color: "rgba(187,247,208,0.95)",
    whiteSpace: "nowrap",
    background: "rgba(2,6,23,0.35)",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  };

  return (
    <section className="section">
      {/* Header */}
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.16), rgba(15,23,42,0.96))",
          border: "1px solid rgba(148,163,184,0.35)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              className="section-title"
              style={{ display: "flex", gap: 10, alignItems: "center" }}
            >
              🧬 Entangled members
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
                  {total} total
                </span>
              )}
            </div>
            <div className="section-sub" style={{ maxWidth: 560, lineHeight: 1.45 }}>
              Same card style as Community; 4-column grid.
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <Link href="/ecosystem" className="section-link" style={{ fontSize: 13 }}>
              ← Back to ecosystem
            </Link>
            <Link href="/community" className="section-link" style={{ fontSize: 13 }}>
              Explore community →
            </Link>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginTop: 12, display: "flex", gap: 10, maxWidth: 640 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, role, affiliation…"
            style={{
              flex: 1,
              padding: "10px 14px",
              borderRadius: 999,
              border: "1px solid rgba(148,163,184,0.5)",
              background: "rgba(15,23,42,0.95)",
              color: "#e5e7eb",
              fontSize: 14,
              outline: "none",
            }}
          />
          <button
            type="button"
            onClick={() => setSearch((s) => s.trim())}
            style={{
              padding: "10px 16px",
              borderRadius: 999,
              border: "none",
              background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Search
          </button>
        </div>
      </div>

      {/* Status */}
      {mainLoading && <div className="products-status">Loading entangled members…</div>}
      {errorMsg && !mainLoading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {errorMsg}
        </div>
      )}

      {!mainLoading && !errorMsg && total === 0 && (
        <div className="products-empty">
          No entangled members yet. Go to{" "}
          <Link href="/community" className="section-link">
            community
          </Link>{" "}
          and start connecting.
        </div>
      )}

      {!mainLoading && !errorMsg && total > 0 && filtered.length === 0 && (
        <div className="products-empty">
          No matches for <span style={{ fontWeight: 700 }}>"{search.trim()}"</span>.
        </div>
      )}

      {/* ✅ Same card style as Community + ✅ 4-column grid */}
      {!mainLoading && !errorMsg && filtered.length > 0 && (
        <div
          className="q5-community-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 16,
            marginTop: 12,
          }}
        >
          {filtered.map((p) => {
            const name = p.full_name || "Quantum member";
            const initial = name.charAt(0).toUpperCase();
            const headline = (p.role || "").trim() || null;
            const affiliationLine = (p.affiliation || "").trim() || null;

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  position: "relative",
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 210,
                  cursor: "pointer",
                }}
                onClick={() => router.push(`/profile/${p.id}`)}
              >
                {/* top pill (matches the idea of the community badge area) */}
                <div
                  className="community-badge-pill"
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: "flex", justifyContent: "center" }}
                >
                  <span style={entangledPill}>Entangled ✓</span>
                </div>

                {/* avatar centered + text below */}
                <div className="card-inner community-card-top">
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      textAlign: "center",
                      gap: 10,
                      paddingTop: 6,
                    }}
                  >
                    <div
                      style={{
                        width: 62,
                        height: 62,
                        borderRadius: 999,
                        overflow: "hidden",
                        flexShrink: 0,
                        border: "1px solid rgba(148,163,184,0.4)",
                        background: "rgba(15,23,42,0.9)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        fontWeight: 800,
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

                    <div className="community-card-name" title={name}>
                      {name}
                    </div>

                    <div className="community-card-meta" title={affiliationLine || ""}>
                      {headline ? headline : "—"}
                      {affiliationLine ? ` · ${affiliationLine}` : ""}
                    </div>
                  </div>
                </div>

                {/* footer action (same vibe as community, but simple) */}
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/profile/${p.id}`);
                    }}
                    style={{
                      width: "100%",
                      padding: "7px 0",
                      borderRadius: 10,
                      border: "1px solid rgba(148,163,184,0.7)",
                      background: "transparent",
                      color: "rgba(148,163,184,0.95)",
                      fontSize: 12,
                      cursor: "pointer",
                    }}
                  >
                    Open →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

(EcosystemEntangledPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
