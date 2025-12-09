// components/LeftSidebar.tsx
import Link from "next/link";

type ProfileSummary = {
  full_name: string | null;
  avatar_url: string | null;
  education_level?: string | null;
  describes_you?: string | null;
  affiliation?: string | null;
  highest_education?: string | null;
  current_org?: string | null;
  city?: string | null;
  country?: string | null;
};

type MyOrgSummary = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type LeftSidebarProps = {
  user: any; // supabase user object (or null)
  profileSummary: ProfileSummary | null;
  myOrg: MyOrgSummary | null;
  entangledCount: number | null;
  savedJobsCount: number | null;
  savedProductsCount: number | null;
};

export default function LeftSidebar({
  user,
  profileSummary,
  myOrg,
  entangledCount,
  savedJobsCount,
  savedProductsCount,
}: LeftSidebarProps) {
  // --- derived fields (same logic as before) ---
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const sidebarFullName =
    profileSummary?.full_name || fallbackName || "Your profile";

  const avatarUrl = profileSummary?.avatar_url || null;

  const educationLevel =
    (profileSummary as any)?.education_level ||
    (profileSummary as any)?.highest_education ||
    "";

  const describesYou =
    (profileSummary as any)?.describes_you ||
    (profileSummary as any)?.role ||
    "";

  const affiliation =
    (profileSummary as any)?.affiliation ||
    (profileSummary as any)?.current_org ||
    "";

  const hasProfileExtraInfo =
    Boolean(educationLevel) || Boolean(describesYou) || Boolean(affiliation);

  const city = (profileSummary as any)?.city || "";
  const country = (profileSummary as any)?.country || "";

  return (
    <aside
      className="layout-left sticky-col"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6, // uniform spacing between blocks
      }}
    >
      {/* PROFILE CARD – clickable → profile page */}
      <Link
        href="/profile"
        className="sidebar-card profile-sidebar-card"
        style={{
          textDecoration: "none",
          color: "inherit",
          cursor: "pointer",
        }}
      >
        <div className="profile-sidebar-header">
          <div className="profile-sidebar-avatar-wrapper">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={sidebarFullName}
                className="profile-sidebar-avatar"
              />
            ) : (
              <div className="profile-sidebar-avatar profile-sidebar-avatar-placeholder">
                {sidebarFullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="profile-sidebar-name">{sidebarFullName}</div>
        </div>

        {(hasProfileExtraInfo || city || country) && (
          <div className="profile-sidebar-info-block">
            {educationLevel && (
              <div className="profile-sidebar-info-value">
                {educationLevel}
              </div>
            )}
            {describesYou && (
              <div
                className="profile-sidebar-info-value"
                style={{ marginTop: 4 }}
              >
                {describesYou}
              </div>
            )}
            {affiliation && (
              <div
                className="profile-sidebar-info-value"
                style={{ marginTop: 4 }}
              >
                {affiliation}
              </div>
            )}
            {(city || country) && (
              <div
                className="profile-sidebar-info-value"
                style={{ marginTop: 4, opacity: 0.9 }}
              >
                {[city, country].filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        )}
      </Link>

      {/* QUICK DASHBOARD */}
      <div className="sidebar-card dashboard-sidebar-card">
        <div className="dashboard-sidebar-title">Quick dashboard</div>

        <div className="dashboard-sidebar-links" style={{ marginTop: 8 }}>
          <Link
            href="/dashboard/entangled-states"
            className="dashboard-sidebar-link"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Entanglements</span>
            <span style={{ opacity: 0.9 }}>
              {entangledCount === null ? "…" : entangledCount}
            </span>
          </Link>

          <Link
            href="/dashboard/saved-jobs"
            className="dashboard-sidebar-link"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Saved jobs</span>
            <span style={{ opacity: 0.9 }}>
              {savedJobsCount === null ? "…" : savedJobsCount}
            </span>
          </Link>

          <Link
            href="/dashboard/saved-products"
            className="dashboard-sidebar-link"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>Saved products</span>
            <span style={{ opacity: 0.9 }}>
              {savedProductsCount === null ? "…" : savedProductsCount}
            </span>
          </Link>

          <Link
            href="/ecosystem"
            className="dashboard-sidebar-link"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span>My Ecosystem</span>
          </Link>
        </div>
      </div>

      {/* MY ORGANIZATION (if exists) */}
      {user && myOrg && (
        <Link
          href={`/orgs/${myOrg.slug}`}
          className="sidebar-card dashboard-sidebar-card"
          style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
        >
          <div className="dashboard-sidebar-title">My organization</div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                overflow: "hidden",
                flexShrink: 0,
                border: "1px solid rgba(148,163,184,0.45)",
                background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#0f172a",
                fontWeight: 700,
                fontSize: 18,
              }}
            >
              {myOrg.logo_url ? (
                <img
                  src={myOrg.logo_url}
                  alt={myOrg.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                myOrg.name.charAt(0).toUpperCase()
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {myOrg.name}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "rgba(148,163,184,0.95)",
                  marginTop: 4,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                }}
              >
                <div>
                  Followers: <span style={{ color: "#e5e7eb" }}>0</span>
                </div>
                <div>
                  Views: <span style={{ color: "#e5e7eb" }}>0</span>
                </div>
                <div style={{ marginTop: 4, color: "#7dd3fc" }}>
                  Analytics →
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* PREMIUM CARD */}
      <div
        className="sidebar-card premium-sidebar-card"
        style={{
          padding: "14px 16px",
          borderRadius: 20,
          background:
            "linear-gradient(135deg, rgba(251,191,36,0.08), rgba(244,114,182,0.18))",
          border: "1px solid rgba(251,191,36,0.5)",
          boxShadow: "0 12px 30px rgba(15,23,42,0.7)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <span style={{ fontSize: 18 }}>👑</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Go Premium</span>
        </div>
        <div
          style={{
            fontSize: 12,
            color: "rgba(248,250,252,0.9)",
            lineHeight: 1.5,
            marginBottom: 10,
          }}
        >
          Unlock advanced analytics, reduced ads, and premium perks for
          your profile and organization.
        </div>
        <div
          style={{
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 999,
            background: "rgba(15,23,42,0.75)",
            width: "fit-content",
            border: "1px solid rgba(251,191,36,0.6)",
            color: "rgba(251,191,36,0.9)",
          }}
        >
          Coming soon
        </div>
      </div>

      {/* DIVIDER */}
      <div
        style={{
          width: "100%",
          height: 1,
          background: "rgba(148,163,184,0.18)",
          marginTop: 6,
          marginBottom: 6,
        }}
      />

      {/* SOCIAL + LOGO + COPYRIGHT */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 12,
            fontSize: 18,
            alignItems: "center",
          }}
        >
          <a
            href="mailto:info@quantum5ocial.com"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Email Quantum5ocial"
            style={{ color: "rgba(148,163,184,0.9)" }}
          >
            ✉️
          </a>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Quantum5ocial on X"
            style={{ color: "rgba(148,163,184,0.9)" }}
          >
            𝕏
          </a>
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Quantum5ocial on LinkedIn"
            style={{
              color: "rgba(148,163,184,0.9)",
              fontWeight: 600,
            }}
          >
            in
          </a>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "rgba(148,163,184,0.9)",
          }}
        >
          <img
            src="/Q5_white_bg.png"
            alt="Quantum5ocial logo"
            style={{
              width: 24,
              height: 24,
              borderRadius: 4,
              objectFit: "contain",
            }}
          />
          <span>© 2025 Quantum5ocial</span>
        </div>
      </div>
    </aside>
  );
}
