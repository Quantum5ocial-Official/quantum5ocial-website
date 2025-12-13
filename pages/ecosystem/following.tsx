// pages/ecosystem/following.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";

type FollowedOrg = {
  id: string;
  name: string;
  slug: string;
  kind: "company" | "research_group";
  logo_url: string | null;
  industry: string | null;
  focus_areas: string | null;
  city: string | null;
  country: string | null;
};

export default function EcosystemFollowingPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [orgs, setOrgs] = useState<FollowedOrg[]>([]);
  const [mainLoading, setMainLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user)
      router.replace("/auth?redirect=/ecosystem/following");
  }, [loading, user, router]);

  // Load followed organizations
  useEffect(() => {
    if (!user) {
      setMainLoading(false);
      setOrgs([]);
      return;
    }

    const load = async () => {
      setMainLoading(true);
      setErrorMsg(null);

      try {
        const { data: followRows, error: followErr } = await supabase
          .from("org_follows")
          .select("org_id")
          .eq("user_id", user.id);

        if (followErr) throw followErr;

        const orgIds = Array.from(
          new Set((followRows || []).map((r: any) => r.org_id))
        );

        if (orgIds.length === 0) {
          setOrgs([]);
          return;
        }

        const { data: orgData, error: orgErr } = await supabase
          .from("organizations")
          .select(
            "id, name, slug, kind, logo_url, industry, focus_areas, city, country"
          )
          .in("id", orgIds);

        if (orgErr) throw orgErr;

        setOrgs((orgData || []) as FollowedOrg[]);
      } catch (e) {
        console.error("Error loading followed organizations", e);
        setErrorMsg(
          "Could not load followed organizations. Please try again later."
        );
        setOrgs([]);
      } finally {
        setMainLoading(false);
      }
    };

    load();
  }, [user]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return orgs;

    return orgs.filter((o) => {
      const haystack = `${o.name} ${o.industry || ""} ${
        o.focus_areas || ""
      } ${o.city || ""} ${o.country || ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [orgs, search]);

  const total = orgs.length;

  if (!user && !loading) return null;

  return (
    <section className="section">
      {/* Header */}
      <div
        className="card"
        style={{
          padding: 18,
          marginBottom: 14,
          background:
            "radial-gradient(circle at 0% 0%, rgba(168,85,247,0.18), rgba(15,23,42,0.96))",
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
            <div
              className="section-title"
              style={{ display: "flex", gap: 10, alignItems: "center" }}
            >
              🏢 Followed organizations
              {!mainLoading && !errorMsg && (
                <span
                  style={{
                    fontSize: 12,
                    padding: "2px 10px",
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.9)",
                    border: "1px solid rgba(168,85,247,0.45)",
                    color: "#c4b5fd",
                    whiteSpace: "nowrap",
                  }}
                >
                  {total} total
                </span>
              )}
            </div>
            <div className="section-sub" style={{ maxWidth: 560 }}>
              Organizations you follow across the quantum ecosystem.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
            }}
          >
            <Link href="/ecosystem" className="section-link" style={{ fontSize: 13 }}>
              ← Back to ecosystem
            </Link>
            <Link href="/orgs" className="section-link" style={{ fontSize: 13 }}>
              Discover organizations →
            </Link>
          </div>
        </div>

        {/* Search */}
        <div style={{ marginTop: 12, display: "flex", gap: 10, maxWidth: 640 }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search organizations…"
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
              background: "linear-gradient(135deg,#a855f7,#6366f1)",
              color: "#0f172a",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </div>
      </div>

      {/* States */}
      {mainLoading && (
        <div className="products-status">Loading followed organizations…</div>
      )}

      {errorMsg && !mainLoading && (
        <div className="products-status" style={{ color: "#f87171" }}>
          {errorMsg}
        </div>
      )}

      {!mainLoading && !errorMsg && total === 0 && (
        <div className="products-empty">
          You are not following any organizations yet.
        </div>
      )}

      {!mainLoading && !errorMsg && total > 0 && filtered.length === 0 && (
        <div className="products-empty">
          No matches for <strong>"{search.trim()}"</strong>.
        </div>
      )}

      {/* Tiles */}
      {!mainLoading && !errorMsg && filtered.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 12,
            marginTop: 12,
          }}
        >
          {filtered.map((o) => {
            const subtitle =
              o.kind === "company"
                ? o.industry || "Quantum company"
                : o.focus_areas || "Quantum research group";
            const location = [o.city, o.country].filter(Boolean).join(", ");
            const initial = o.name.charAt(0).toUpperCase();

            return (
              <Link
                key={o.id}
                href={`/orgs/${o.slug}`}
                className="card"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  padding: 12,
                  borderRadius: 14,
                  border: "1px solid rgba(148,163,184,0.28)",
                  background: "rgba(15,23,42,0.92)",
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      overflow: "hidden",
                      border: "1px solid rgba(148,163,184,0.55)",
                      background: "linear-gradient(135deg,#a855f7,#6366f1)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {o.logo_url ? (
                      <img
                        src={o.logo_url}
                        alt={o.name}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    ) : (
                      initial
                    )}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {o.name}
                    </div>
                    <div
                      style={{
                        marginTop: 2,
                        fontSize: 12,
                        color: "rgba(148,163,184,0.95)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {[subtitle, location].filter(Boolean).join(" · ")}
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "#c4b5fd", whiteSpace: "nowrap" }}>
                    Open →
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

(EcosystemFollowingPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
