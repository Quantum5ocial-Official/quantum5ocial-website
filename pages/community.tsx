const [searchText, setSearchText] = useState("");

const filteredProfiles = profiles.filter((p) => {
  const q = searchText.toLowerCase().trim();
  if (!q) return true;

  const haystack = `
    ${p.full_name || ""}
    ${p.role || ""}
    ${p.affiliation || ""}
    ${p.country || ""}
    ${p.city || ""}
    ${p.short_bio || ""}
  `.toLowerCase();

  return haystack.includes(q);
});

{/* ========== LEFT SIDEBAR ========== */}
<aside
  className="layout-left sticky-col"
  style={{ display: "flex", flexDirection: "column" }}
>
  {/* Profile card */}
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

    {hasProfileExtraInfo && (
      <div className="profile-sidebar-info-block">
        {educationLevel && (
          <div className="profile-sidebar-info-value">
            {educationLevel}
          </div>
        )}
        {describesYou && (
          <div className="profile-sidebar-info-value" style={{ marginTop: 4 }}>
            {describesYou}
          </div>
        )}
        {affiliation && (
          <div className="profile-sidebar-info-value" style={{ marginTop: 4 }}>
            {affiliation}
          </div>
        )}
      </div>
    )}
  </Link>

  {/* Quick dashboard */}
  <div className="sidebar-card dashboard-sidebar-card">
    <div className="dashboard-sidebar-title">Quick dashboard</div>
    <div className="dashboard-sidebar-links">
      <Link href="/dashboard/entangled-states" className="dashboard-sidebar-link">
        Entangled states {user ? ` (${entangledCount})` : ""}
      </Link>
      <Link href="/dashboard/saved-jobs" className="dashboard-sidebar-link">
        Saved jobs {user ? ` (${savedJobsCount})` : ""}
      </Link>
      <Link href="/dashboard/saved-products" className="dashboard-sidebar-link">
        Saved products {user ? ` (${savedProductsCount})` : ""}
      </Link>
    </div>
  </div>

  {/* Social icons + brand */}
  <div
    style={{
      marginTop: "auto",
      paddingTop: 16,
      borderTop: "1px solid rgba(148,163,184,0.18)",
      display: "flex",
      flexDirection: "column",
      gap: 10,
    }}
  >
    {/* Social icons */}
    <div style={{ display: "flex", gap: 12, fontSize: 18, alignItems: "center" }}>
      <a
        href="mailto:info@quantum5ocial.com"
        style={{ color: "rgba(148,163,184,0.9)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
          <rect x="3" y="5" width="18" height="14" rx="2" ry="2" />
          <polyline points="3 7 12 13 21 7" />
        </svg>
      </a>

      <a href="#" style={{ color: "rgba(148,163,184,0.9)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
          <path d="M4 4l8 9.5L20 4" />
          <path d="M4 20l6.5-7.5L20 20" />
        </svg>
      </a>

      <a href="#" style={{ color: "rgba(148,163,184,0.9)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.51 2.87 8.33 6.84 9.68..." />
        </svg>
      </a>
    </div>

    {/* Brand */}
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <img
        src="/Q5_white_bg.png"
        alt="Quantum5ocial logo"
        style={{ width: 32, height: 32, objectFit: "contain" }}
      />
      <span
        style={{
          fontSize: 14,
          fontWeight: 500,
          background: "linear-gradient(90deg,#3bc7f3,#8468ff)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Quantum5ocial
      </span>
    </div>
  </div>
</aside>
{/* ========== MIDDLE COLUMN ========== */}
<section className="layout-main">
  <section className="section">

    {/* === HEADER === */}
    <div className="community-main-header">
      <div className="section-header">
        <div>
          <div className="section-title">Quantum5ocial community</div>
          <div className="section-sub">
            Discover members of the quantum ecosystem and{" "}
            <span style={{ color: "#7dd3fc" }}>entangle</span> with them.
          </div>
        </div>

        {!loadingProfiles && !error && (
          <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {filteredProfiles.length} member{filteredProfiles.length === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {/* === SEARCH BAR === */}
      <div className="community-main-search">
        <div
          style={{
            width: "100%",
            borderRadius: 999,
            padding: "2px",
            background:
              "linear-gradient(90deg, rgba(56,189,248,0.5), rgba(129,140,248,0.5))",
          }}
        >
          <div
            style={{
              borderRadius: 999,
              background: "rgba(15,23,42,0.97)",
              padding: "6px 12px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14, opacity: 0.85 }}>🔍</span>
            <input
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                color: "#e5e7eb",
                fontSize: 14,
                width: "100%",
              }}
              placeholder="Search people by name, affiliation, country, role…"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>

    {/* === FEATURED MEMBER OF THE WEEK === */}
    {!loadingProfiles && filteredProfiles.length > 0 && (
      <div
        style={{
          marginTop: 22,
          marginBottom: 32,
          padding: 18,
          borderRadius: 16,
          border: "1px solid rgba(168,85,247,0.35)",
          background:
            "radial-gradient(circle at top left, rgba(147,51,234,0.18), rgba(15,23,42,1))",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#c084fc",
                marginBottom: 4,
              }}
            >
              Featured member
            </div>
            <div
              style={{
                fontSize: "0.95rem",
                fontWeight: 600,
                background: "linear-gradient(90deg,#a855f7,#22d3ee)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Profile of the week
            </div>
          </div>

          <div style={{ fontSize: 26 }}>✨</div>
        </div>

        {/* Highlight the first profile */}
        {filteredProfiles[0] && (
          <Link
            href={`/profile/${filteredProfiles[0].id}`}
            style={{
              display: "flex",
              gap: 12,
              textDecoration: "none",
              color: "inherit",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                overflow: "hidden",
                border: "1px solid rgba(148,163,184,0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {filteredProfiles[0].avatar_url ? (
                <img
                  src={filteredProfiles[0].avatar_url}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <span style={{ color: "#e5e7eb", fontSize: 18, fontWeight: 600 }}>
                  {filteredProfiles[0].full_name?.charAt(0) || "Q"}
                </span>
              )}
            </div>

            <div>
              <div style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 2 }}>
                {filteredProfiles[0].full_name}
              </div>
              <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                {filteredProfiles[0].affiliation || "Quantum ecosystem member"}
              </div>
            </div>
          </Link>
        )}
      </div>
    )}

    {/* === COMMUNITY GRID === */}
    {!loadingProfiles && !error && (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
        {filteredProfiles.map((p) => {
          const name = p.full_name || "Quantum member";
          const initial = name.charAt(0).toUpperCase();
          const highestEducation = p.highest_education || "—";
          const role = p.role || "Quantum ecosystem member";
          const location = [p.city, p.country].filter(Boolean).join(", ");
          const affiliationLine = p.affiliation || location || "—";
          const bio =
            p.short_bio ||
            (p.affiliation ? `Member at ${p.affiliation}` : "Quantum5ocial member");

          return (
            <div key={p.id} className="card" style={{ padding: 14, minHeight: 230 }}>
              <div className="card-inner">
                {/* Avatar + name */}
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: "999px",
                      overflow: "hidden",
                      border: "1px solid rgba(148,163,184,0.4)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 600,
                    }}
                  >
                    {p.avatar_url ? (
                      <img
                        src={p.avatar_url}
                        alt={name}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span>{initial}</span>
                    )}
                  </div>

                  <div>
                    <div className="card-title">{name}</div>
                    <div className="card-meta">{role}</div>
                  </div>
                </div>

                {/* Info block */}
                <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                  <div>Education: {highestEducation}</div>
                  <div>Affiliation: {affiliationLine}</div>
                  <div>Role: {role}</div>
                  <div style={{ marginTop: 6, lineHeight: 1.4, maxHeight: 60, overflow: "hidden" }}>
                    {bio}
                  </div>
                </div>
              </div>

              {/* Entangle button */}
              <button
                type="button"
                style={{
                  width: "100%",
                  marginTop: 12,
                  padding: "7px 0",
                  borderRadius: 10,
                  border: "1px solid rgba(59,130,246,0.6)",
                  background: "rgba(59,130,246,0.16)",
                  color: "#bfdbfe",
                  fontSize: 12,
                }}
              >
                Entangle +
              </button>
            </div>
          );
        })}
      </div>
    )}

  </section>
</section>
{/* ========== RIGHT SIDEBAR ========== */}
<aside
  className="layout-right sticky-col"
  style={{ display: "flex", flexDirection: "column" }}
>
  <div className="hero-tiles hero-tiles-vertical">

    {/* Highlighted jobs */}
    <div className="hero-tile">
      <div className="hero-tile-inner">
        <div className="tile-label">Highlighted</div>
        <div className="tile-title-row">
          <div className="tile-title">Quantum roles spotlight</div>
          <div className="tile-icon-orbit">🧪</div>
        </div>
        <p className="tile-text">
          This will later showcase a curated quantum job or role from the marketplace.
        </p>
        <div className="tile-pill-row">
          <span className="tile-pill">PhD</span>
          <span className="tile-pill">Location</span>
          <span className="tile-pill">Lab</span>
        </div>
        <div className="tile-cta">
          Jobs spotlight <span>›</span>
        </div>
      </div>
    </div>

    {/* Highlighted product */}
    <div className="hero-tile">
      <div className="hero-tile-inner">
        <div className="tile-label">Highlighted</div>
        <div className="tile-title-row">
          <div className="tile-title">Quantum product of the week</div>
          <div className="tile-icon-orbit">🔧</div>
        </div>
        <p className="tile-text">
          A selected hardware, software, or service featured from the marketplace.
        </p>
        <div className="tile-pill-row">
          <span className="tile-pill">Cryo</span>
          <span className="tile-pill">Control electronics</span>
          <span className="tile-pill">Software</span>
        </div>
        <div className="tile-cta">
          Product spotlight <span>›</span>
        </div>
      </div>
    </div>

    {/* Featured talent */}
    <div className="hero-tile">
      <div className="hero-tile-inner">
        <div className="tile-label">Highlighted</div>
        <div className="tile-title-row">
          <div className="tile-title">Featured quantum talent</div>
          <div className="tile-icon-orbit">🤝</div>
        </div>
        <p className="tile-text">
          Later this tile will feature a PI, postdoc, or startup founder.
        </p>
        <div className="tile-pill-row">
          <span className="tile-pill">Role</span>
          <span className="tile-pill">Field</span>
          <span className="tile-pill">Affiliation</span>
        </div>
        <div className="tile-cta">
          Talent spotlight <span>›</span>
        </div>
      </div>
    </div>

  </div>

  <div
    style={{
      marginTop: "auto",
      paddingTop: 12,
      borderTop: "1px solid rgba(148,163,184,0.18)",
      fontSize: 12,
      color: "rgba(148,163,184,0.9)",
      textAlign: "right",
    }}
  >
    © 2025 Quantum5ocial
  </div>
</aside>
