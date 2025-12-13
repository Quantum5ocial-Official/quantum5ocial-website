// pages/ecosystem.tsx
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type EntangledProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  affiliation: string | null;
  current_org?: string | null; // keep optional (may or may not exist)
  role: string | null;
  describes_you?: string | null; // keep optional (may or may not exist)
};

type EcosystemOrg = {
  id: string;
  name: string;
  slug: string;
  kind: "company" | "research_group";
  logo_url: string | null;
  tagline: string | null;
  city: string | null;
  country: string | null;
  industry: string | null;
  focus_areas: string | null;
};

export default function MyEcosystemPage() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [entangledProfiles, setEntangledProfiles] = useState<
    EntangledProfile[]
  >([]);
  const [followedOrgs, setFollowedOrgs] = useState<EcosystemOrg[]>([]);
  const [mainLoading, setMainLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) router.replace("/auth?redirect=/ecosystem");
  }, [loading, user, router]);

  // Load ecosystem content
  useEffect(() => {
    if (!user) {
      setMainLoading(false);
      setEntangledProfiles([]);
      setFollowedOrgs([]);
      return;
    }

    const loadEcosystem = async () => {
      setMainLoading(true);
      setErrorMsg(null);

      try {
        // 1) Entangled people
        const { data: connData, error: connError } = await supabase
          .from("connections")
          .select("user_id, target_user_id, status")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},target_user_id.eq.${user.id}`);

        if (connError) throw connError;

        let entangledList: EntangledProfile[] = [];
        if (connData && connData.length > 0) {
          const otherIds = Array.from(
            new Set(
              connData.map((c: any) =>
                c.user_id === user.id ? c.target_user_id : c.user_id
              )
            )
          );

          if (otherIds.length > 0) {
            // ✅ IMPORTANT: only select columns that definitely exist
            const { data: profData, error: profError } = await supabase
              .from("profiles")
              .select("id, full_name, avatar_url, affiliation, role")
              .in("id", otherIds);

            if (profError) throw profError;
            entangledList = (profData || []) as EntangledProfile[];
          }
        }
        setEntangledProfiles(entangledList);

        // 2) Followed organizations
        const { data: followRows, error: followError } = await supabase
          .from("org_follows")
          .select("org_id")
          .eq("user_id", user.id);

        if (followError) throw followError;

        const orgIds = Array.from(
          new Set((followRows || []).map((r: any) => r.org_id))
        );

        let orgList: EcosystemOrg[] = [];
        if (orgIds.length > 0) {
          const { data: orgData, error: orgErr } = await supabase
            .from("organizations")
            .select(
              "id, name, slug, kind, logo_url, tagline, city, country, industry, focus_areas"
            )
            .in("id", orgIds);

          if (orgErr) throw orgErr;
          orgList = (orgData || []) as EcosystemOrg[];
        }

        setFollowedOrgs(orgList);
      } catch (e) {
        console.error("Error loading ecosystem", e);
        setErrorMsg("Could not load your ecosystem. Please try again later.");
        setEntangledProfiles([]);
        setFollowedOrgs([]);
      } finally {
        setMainLoading(false);
      }
    };

    loadEcosystem();
  }, [user]);

  if (!user && !loading) return null;

  const entangledTotal = entangledProfiles.length;
  const orgsTotal = followedOrgs.length;

  return (
    <section className="section">
      {/* HERO CARD */}
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
            <div className="section-sub">
              A snapshot of your quantum network – the people you&apos;re
              entangled with and the organizations you follow.
            </div>
            <div
              style={{
                marginTop: 10,
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
              }}
            >
              <span className="pill pill-soft">
                🧬 Entangled members:{" "}
                <strong style={{ marginLeft: 4 }}>{entangledTotal}</strong>
              </span>
              <span className="pill pill-soft">
                🏢 Followed organizations:{" "}
                <strong style={{ marginLeft: 4 }}>{orgsTotal}</strong>
              </span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 8,
              minWidth: 160,
            }}
          >
            <Link
              href="/community"
              className="section-link"
              style={{ fontSize: 13 }}
            >
              Explore community →
            </Link>
            <Link href="/orgs" className="section-link" style={{ fontSize: 13 }}>
              Discover organizations →
            </Link>
          </div>
        </div>
      </div>

      {/* Status */}
      {mainLoading ? (
        <p className="profile-muted">Loading your ecosystem…</p>
      ) : errorMsg ? (
        <p className="profile-muted">{errorMsg}</p>
      ) : (
        <>
          {/* TILE GRID (expand to 4x4 later) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 16,
              marginTop: 8,
            }}
          >
            {/* Tile 1: Entangled members */}
            <Link
              href="/ecosystem/entangled"
              className="card"
              style={{
                padding: 18,
                textDecoration: "none",
                color: "inherit",
                border: "1px solid rgba(148,163,184,0.35)",
                background:
                  "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(30,64,175,0.45))",
              }}
            >
              <div style={{ fontSize: 13, color: "rgba(148,163,184,0.9)" }}>
                🧬 Entangled members
              </div>

              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  marginTop: 8,
                  lineHeight: 1,
                }}
              >
                {entangledTotal}
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: "rgba(191,219,254,0.95)",
                  lineHeight: 1.4,
                }}
              >
                People you are directly connected with in the Quantum5ocial
                network.
              </div>

              <div
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  color: "#7dd3fc",
                  textAlign: "right",
                }}
              >
                Open →
              </div>
            </Link>

            {/* Tile 2: Followed orgs */}
            <Link
              href="/ecosystem/following"
              className="card"
              style={{
                padding: 18,
                textDecoration: "none",
                color: "inherit",
                border: "1px solid rgba(148,163,184,0.35)",
                background:
                  "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(147,51,234,0.45))",
              }}
            >
              <div style={{ fontSize: 13, color: "rgba(148,163,184,0.9)" }}>
                🏢 Organizations I follow
              </div>

              <div
                style={{
                  fontSize: 34,
                  fontWeight: 700,
                  marginTop: 8,
                  lineHeight: 1,
                }}
              >
                {orgsTotal}
              </div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 13,
                  color: "rgba(191,219,254,0.95)",
                  lineHeight: 1.4,
                }}
              >
                Companies, labs, and initiatives you want to keep track of.
              </div>

              <div
                style={{
                  marginTop: 14,
                  fontSize: 12,
                  color: "#c084fc",
                  textAlign: "right",
                }}
              >
                Open →
              </div>
            </Link>
          </div>

          {/* Optional helper text (can remove later) */}
          <div
            style={{
              marginTop: 14,
              fontSize: 12,
              color: "rgba(148,163,184,0.9)",
            }}
          >
            More ecosystem tiles (analytics, saved items, activity) will appear
            here over time.
          </div>
        </>
      )}
    </section>
  );
}

(MyEcosystemPage as any).layoutProps = {
  variant: "two-left",
  right: null,
};
