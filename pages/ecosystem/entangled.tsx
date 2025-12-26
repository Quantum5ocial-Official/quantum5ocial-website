// pages/ecosystem/entangled.tsx
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../../lib/supabaseClient";
import { useSupabaseUser } from "../../lib/useSupabaseUser";
import Q5BadgeChips from "../../components/Q5BadgeChips";

type EntangledProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;

  role: string | null;
  current_title?: string | null;

  affiliation: string | null;
  city: string | null;
  country: string | null;

  q5_badge_level?: number | null;
  q5_badge_label?: string | null;
  q5_badge_review_status?: string | null;
  q5_badge_claimed_at?: string | null;
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

        // ✅ select fields needed to mirror Community card UI (wrapped text + location + badge)
        const { data: profData, error: profError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, avatar_url, role, current_title, affiliation, city, country, q5_badge_level, q5_badge_label, q5_badge_review_status, q5_badge_claimed_at"
          )
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
      const haystack = (
        `${p.full_name || ""} ${p.current_title || ""} ${p.role || ""} ${p.affiliation || ""} ${
          p.city || ""
        } ${p.country || ""}`
      )
        .toLowerCase()
        .trim();
      return haystack.includes(q);
    });
  }, [profiles, search]);

  const total = profiles.length;

  if (!user && !loading) return null;

  if (!user) return null;

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
              Your accepted entanglements — same card style as Community.
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
            placeholder="Search by name, role, affiliation, location…"
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

      {/* ✅ Community-style cards, ✅ 4-column grid */}
      {!mainLoading && !errorMsg && filtered.length > 0 && (
        <div
          className="q5-community-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,minmax(0,1fr))",
            gap: 16,
          }}
        >
          {filtered.map((p) => {
            const key = `person-${p.id}`;
            const name = p.full_name || "Quantum5ocial member";
            const initial = name.charAt(0).toUpperCase();

            const headline = (p.current_title || p.role || "").trim() || null;
            const affiliationLine = p.affiliation?.trim() || null;
            const locationLine = [p.city, p.country].filter(Boolean).join(", ") || null;

            const hasBadge = !!(p.q5_badge_label || p.q5_badge_level != null);
            const badgeLabel =
              (p.q5_badge_label && p.q5_badge_label.trim()) ||
              (p.q5_badge_level != null ? `Q5-Level ${p.q5_badge_level}` : "");

            return (
              <div
                key={key}
                className="card"
                style={{
                  position: "relative",
                  textDecoration: "none",
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  minHeight: 210,
                  cursor: "pointer",
                }}
                onClick={() => router.push(`/profile/${p.id}`)}
              >
                {/* badge (same behavior as community) */}
                <div className="community-badge-pill" onClick={(e) => e.stopPropagation()}>
                  {hasBadge ? (
                    <Q5BadgeChips
                      label={badgeLabel}
                      reviewStatus={p.q5_badge_review_status ?? null}
                      size="sm"
                    />
                  ) : null}
                </div>

                {/* avatar centered + text BELOW (same structure as community) */}
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

                    {/* Name */}
                    <div className="community-card-name" title={name}>
                      {name}
                    </div>

                    {/* title/role + affiliation */}
                    <div className="community-card-meta" title={affiliationLine || ""}>
                      {headline ? headline : "—"}
                      {affiliationLine ? ` · ${affiliationLine}` : ""}
                    </div>

                    {/* location line */}
                    {locationLine && (
                      <div
                        className="community-card-meta"
                        title={locationLine}
                        style={{ fontSize: 11, opacity: 0.85 }}
                      >
                        {locationLine}
                      </div>
                    )}
                  </div>
                </div>

                {/* footer: Message button (instead of entangle), no "Open →" anywhere */}
                <div style={{ marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/messages?to=${p.id}`);
                    }}
                    style={{
                      width: "100%",
                      padding: "7px 0",
                      borderRadius: 10,
                      border: "none",
                      background: "linear-gradient(90deg,#22d3ee,#6366f1)",
                      color: "#0f172a",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    Message
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
