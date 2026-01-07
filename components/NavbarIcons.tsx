// components/NavbarIcons.tsx
import {
  useState,
  useEffect,
  useRef,
  useCallback,
  FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type Theme = "dark" | "light";

// Shared sizing
const NAV_BLOCK_HEIGHT = 68;
const NAV_HEADER_HEIGHT = 84;
const NAV_BLOCK_MIN_WIDTH = 90;

export default function NavbarIcons() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [profileName, setProfileName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>("dark");

  // mobile drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // isMobile – used to hide desktop icon bar on small screens
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 900;
  });

  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileDrawerRef = useRef<HTMLDivElement | null>(null);

  // notifications count
  const [notificationsCount, setNotificationsCount] = useState(0);

  // global search (shared by desktop & mobile)
  const [globalSearch, setGlobalSearch] = useState("");

  const handleGlobalSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const term = globalSearch.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  // ✅ unified unread-count loader (used by route-change + custom event)
  const loadUnreadCount = useCallback(async () => {
    if (!user) {
      setNotificationsCount(0);
      return;
    }

    try {
      // 1) Pending incoming entanglement requests
      const { count: pendingCount, error: pendingErr } = await supabase
        .from("connections")
        .select("id", { count: "exact", head: true })
        .eq("target_user_id", user.id)
        .eq("status", "pending");

      // 2) Unread notifications (accepted updates, etc.)
      const { count: unreadCount, error: unreadErr } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      const p =
        !pendingErr && typeof pendingCount === "number" ? pendingCount : 0;
      const u =
        !unreadErr && typeof unreadCount === "number" ? unreadCount : 0;

      setNotificationsCount(p + u);
    } catch (e) {
      console.error("Error loading notifications", e);
      setNotificationsCount(0);
    }
  }, [user]);

  // ✅ refresh unread count on route changes + user changes
  useEffect(() => {
    loadUnreadCount();
  }, [loadUnreadCount, router.pathname]);

  // ✅ listen for “notifications changed” to refresh badge
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onChanged = () => {
      loadUnreadCount();
    };

    window.addEventListener("q5:notifications-changed", onChanged);
    return () =>
      window.removeEventListener("q5:notifications-changed", onChanged);
  }, [loadUnreadCount]);

  // ----- HANDLE RESPONSIVE -----
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 900);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ----- THEME HANDLING -----
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem("q5_theme");
    const initial: Theme = stored === "light" ? "light" : "dark";

    setTheme(initial);
    document.documentElement.classList.toggle(
      "theme-light",
      initial === "light"
    );
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        document.documentElement.classList.toggle(
          "theme-light",
          next === "light"
        );
        window.localStorage.setItem("q5_theme", next);
      }
      return next;
    });
  };

  // ----- PROFILE LOADING -----
  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!user) {
        setProfileName(null);
        setAvatarUrl(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        setProfileName((data.full_name as string) || null);
        setAvatarUrl((data.avatar_url as string) || null);
      } else {
        setProfileName(null);
        setAvatarUrl(null);
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock scroll when mobile drawer is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  // Close drawer on outside pointer down
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    if (typeof document === "undefined") return;

    const onPointerDown = (e: PointerEvent) => {
      const drawerEl = mobileDrawerRef.current;
      if (!drawerEl) return;
      if (!drawerEl.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // ----- ACTIVE LINK HELPERS -----
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return router.pathname.startsWith("/dashboard");
    }
    return router.pathname === path || router.pathname.startsWith(path + "/");
  };

  // Fallback name
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  const fullName = profileName || fallbackName;
  const firstName =
    fullName && typeof fullName === "string"
      ? fullName.split(" ")[0] || fullName
      : "User";

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // helper for icon+label links (desktop)
  const renderIconNavLink = (
    href: string,
    label: string,
    iconSrc: string,
    badgeCount?: number
  ) => {
    const active = isActive(href);

    const displayBadge = typeof badgeCount === "number" && badgeCount > 0;
    const badgeText = displayBadge && badgeCount! > 9 ? "9+" : badgeCount;

    const isQnA = href === "/qna";
    const iconSize = isQnA ? 40 : 36; // ✅ only QnA bigger

    return (
      <Link
        href={href}
        className={`nav-link ${active ? "nav-link-active" : ""}`}
      >
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            height: NAV_BLOCK_HEIGHT,
            minWidth: NAV_BLOCK_MIN_WIDTH,
            padding: "0 14px",
            gap: 6,
            borderRadius: 16,
            background: active
              ? "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.6), rgba(15,23,42,0.98))"
              : "transparent",
            boxShadow: active
              ? "0 0 0 1px rgba(56,189,248,0.7), 0 0 18px rgba(56,189,248,0.45)"
              : "none",
            transition:
              "background 0.18s ease-out, box-shadow 0.18s ease-out, transform 0.12s ease-out",
            transform: active ? "translateY(-1px)" : "none",
          }}
        >
          <img
            src={iconSrc}
            alt={label}
            style={{
              width: iconSize,
              height: iconSize,
              objectFit: "contain",
              display: "block",
            }}
          />

          <span
            style={{
              fontSize: 11,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(226,232,240,0.96)",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>

          {displayBadge && (
            <span
              style={{
                position: "absolute",
                top: 6,
                right: 10,
                minWidth: 16,
                height: 16,
                borderRadius: 999,
                background: "#ef4444",
                color: "white",
                fontSize: 10,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 4px",
              }}
            >
              {badgeText}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <header className="nav">
      <div
        className="nav-inner"
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: isMobile ? "0 8px" : "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: NAV_HEADER_HEIGHT,
          gap: 16,
        }}
      >
        {/* LEFT: brand + (mobile search pill inline) + desktop search */}
        <div
          style={{
            display: "flex",
            gap: isMobile ? 10 : 12,
            alignItems: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Brand */}
          {!isMobile ? (
            <Link href="/" className="brand-clickable">
              <div className="brand">
                <img
                  src="/Q5_white_bg.png"
                  alt="Quantum5ocial logo"
                  className="brand-logo"
                />
                <div>
                  <div className="brand-text-main brand-text-gradient">
                    Quantum5ocial
                  </div>
                  <div className="brand-text-sub">
                    Connecting the quantum world
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <Link
              href="/"
              className="brand-clickable"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                gap: 0,
                flexShrink: 0,
              }}
            >
              <img
                src="/Q5_white_bg.png"
                alt="Quantum5ocial logo"
                className="brand-logo-mobile"
                style={{ display: "block" }}
              />
            </Link>
          )}

          {/* MOBILE SEARCH PILL */}
          {isMobile && (
            <form
              onSubmit={handleGlobalSearchSubmit}
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: 999,
                border: "1px solid rgba(148,163,184,0.55)",
                background: "rgba(15,23,42,0.55)",
                height: 38,
              }}
            >
              <span style={{ opacity: 0.85, flexShrink: 0 }}>🔍</span>
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search"
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "#e5e7eb",
                  fontSize: 14,
                }}
              />
            </form>
          )}

          {/* Global search – desktop only */}
          {!isMobile && (
            <form
              onSubmit={handleGlobalSearchSubmit}
              className="nav-search-desktop"
            >
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search jobs, products, people, organizations…"
                className="nav-search-input"
              />
            </form>
          )}
        </div>

        {/* RIGHT: desktop nav OR hamburger */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexShrink: 0,
            height: "100%",
          }}
        >
          {/* DESKTOP NAV */}
          {!isMobile && (
            <nav
              className="nav-links nav-links-desktop"
              style={{
                fontSize: 16,
                display: "flex",
                alignItems: "center",
                gap: 0,
              }}
            >
              {renderIconNavLink("/jobs", "Jobs", "/icons/jobs.svg")}
              {renderIconNavLink("/products", "Marketplace", "/icons/products.svg")}
              {renderIconNavLink(
                "/community",
                "Community",
                "/icons/community.svg"
              )}
              {renderIconNavLink("/qna", "QnA", "/icons/qna.svg")}

              {!loading &&
                user &&
                renderIconNavLink(
                  "/notifications",
                  "Notifications",
                  "/icons/notifications.svg",
                  notificationsCount
                )}

              <button
                type="button"
                className="nav-link nav-link-button theme-toggle"
                onClick={toggleTheme}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? "☀️" : "🌙"}
              </button>

              {!loading && !user && (
                <Link href="/auth" className="nav-cta">
                  Login / Sign up
                </Link>
              )}

              {!loading && user && (
                <div className="nav-user-wrapper" ref={userMenuRef}>
                  <button
                    type="button"
                    className={`nav-user-button nav-link-button ${
                      isActive("/profile") ? "nav-link-active" : ""
                    }`}
                    onClick={() => {
                      setIsUserMenuOpen((o) => !o);
                    }}
                    style={{
                      padding: 0,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        height: NAV_BLOCK_HEIGHT,
                        minWidth: NAV_BLOCK_MIN_WIDTH,
                        padding: "0 14px",
                        gap: 6,
                        borderRadius: 16,
                        background: isActive("/profile")
                          ? "radial-gradient(circle at 50% 0%, rgba(56,189,248,0.6), rgba(15,23,42,0.98))"
                          : "transparent",
                        boxShadow: isActive("/profile")
                          ? "0 0 0 1px rgba(56,189,248,0.7), 0 0 18px rgba(56,189,248,0.45)"
                          : "none",
                      }}
                    >
                      <div
                        className="nav-user-avatar"
                        style={{ width: 36, height: 36 }}
                      >
                        {avatarUrl ? (
                          <img src={avatarUrl} alt={firstName} />
                        ) : (
                          <span className="nav-user-initial">
                            {firstName.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span
                        style={{
                          fontSize: 11,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: "rgba(226,232,240,0.96)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {firstName}
                      </span>
                    </div>
                  </button>

                  {isUserMenuOpen && (
                    <div className="nav-dashboard-menu right-align">
                      <Link
                        href="/profile"
                        className="nav-dropdown-item"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                        }}
                      >
                        My profile
                      </Link>

                      <Link
                        href="/ecosystem"
                        className="nav-dropdown-item"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                        }}
                      >
                        My ecosystem
                      </Link>

                      <Link
                        href="/orgs/create"
                        className="nav-dropdown-item"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                        }}
                      >
                        Create my organization page
                      </Link>

                      {/* ✅ Change password (added above Logout) */}
                      <Link
                        href="/settings/security"
                        className="nav-dropdown-item"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                        }}
                      >
                        Change password
                      </Link>

                      <button
                        type="button"
                        className="nav-dropdown-item nav-dropdown-danger"
                        onClick={async () => {
                          await handleLogout();
                          setIsUserMenuOpen(false);
                        }}
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              )}
            </nav>
          )}

          {/* MOBILE HAMBURGER */}
          {isMobile && (
            <button
              type="button"
              className={`nav-mobile-toggle ${isMobileMenuOpen ? "open" : ""}`}
              aria-label="Open navigation"
              onClick={() => setIsMobileMenuOpen((o) => !o)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: 38,
              }}
            >
              <span className="nav-mobile-bar" />
              <span className="nav-mobile-bar" />
            </button>
          )}
        </div>
      </div>

      {/* ✅ MOBILE OVERLAY — click outside closes drawer */}
      {isMobile && isMobileMenuOpen && (
        <div
          className="nav-drawer-backdrop"
          aria-hidden="true"
          onPointerDown={closeMobileMenu}
        />
      )}

      {/* MOBILE DRAWER */}
      <div
        ref={mobileDrawerRef}
        className={`nav-drawer ${isMobileMenuOpen ? "nav-drawer-open" : ""}`}
        style={{ zIndex: 999 }}
      >
        <nav className="nav-links nav-links-mobile">
          {/* PROFILE ROW (mobile) */}
          {!loading && user && (
            <Link
              href="/profile"
              className="nav-item-with-icon nav-mobile-profile"
              onClick={closeMobileMenu}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 4px 14px",
                borderBottom: "1px solid rgba(148,163,184,0.35)",
                marginBottom: 12,
                textDecoration: "none",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "999px",
                  overflow: "hidden",
                  border: "1px solid rgba(148,163,184,0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "linear-gradient(135deg,#3bc7f3,#8468ff)",
                  color: "#fff",
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={firstName}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                ) : (
                  firstName.charAt(0).toUpperCase()
                )}
              </div>

              <div>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#e5e7eb" }}>
                  {firstName}
                </span>
              </div>
            </Link>
          )}

          {/* MAIN ICON NAV ITEMS */}
          <Link
            href="/jobs"
            className={`nav-item-with-icon ${
              isActive("/jobs") ? "nav-item-active" : ""
            }`}
            onClick={closeMobileMenu}
          >
            <img src="/icons/jobs.svg" className="nav-icon" />
            <span className="nav-icon-label">Jobs</span>
          </Link>

          <Link
            href="/products"
            className={`nav-item-with-icon ${
              isActive("/products") ? "nav-item-active" : ""
            }`}
            onClick={closeMobileMenu}
          >
            <img src="/icons/products.svg" className="nav-icon" />
            <span className="nav-icon-label">Marketplace</span>
          </Link>

          <Link
            href="/community"
            className={`nav-item-with-icon ${
              isActive("/community") ? "nav-item-active" : ""
            }`}
            onClick={closeMobileMenu}
          >
            <img src="/icons/community.svg" className="nav-icon" />
            <span className="nav-icon-label">Community</span>
          </Link>

          <Link
            href="/qna"
            className={`nav-item-with-icon ${
              isActive("/qna") ? "nav-item-active" : ""
            }`}
            onClick={closeMobileMenu}
          >
            <img
              src="/icons/qna.svg"
              className="nav-icon"
              style={{ width: 40, height: 40 }}
            />
            <span className="nav-icon-label">QnA</span>
          </Link>

          {!loading && user && (
            <Link
              href="/notifications"
              className={`nav-item-with-icon ${
                isActive("/notifications") ? "nav-item-active" : ""
              }`}
              onClick={closeMobileMenu}
            >
              <img src="/icons/notifications.svg" className="nav-icon" />
              <span className="nav-icon-label">Notifications</span>
              {notificationsCount > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    minWidth: 18,
                    height: 18,
                    borderRadius: 999,
                    background: "#ef4444",
                    color: "white",
                    fontSize: 11,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 6px",
                  }}
                >
                  {notificationsCount > 9 ? "9+" : notificationsCount}
                </span>
              )}
            </Link>
          )}

          {/* AUTH AREA */}
          {!loading && !user && (
            <Link
              href="/auth"
              className="nav-cta nav-cta-mobile"
              onClick={closeMobileMenu}
              style={{ marginTop: 16 }}
            >
              Login / Sign up
            </Link>
          )}

          {/* ✅ Change password link (added above Logout) */}
          {!loading && user && (
            <Link
              href="/settings/security"
              className="nav-item-with-icon"
              onClick={closeMobileMenu}
              style={{ marginTop: 14 }}
            >
              <span style={{ fontSize: 18, width: 28, textAlign: "center" }}>
                🔒
              </span>
              <span className="nav-icon-label">Change password</span>
            </Link>
          )}

          {/* LOGOUT BUTTON */}
          {!loading && user && (
            <button
              type="button"
              onClick={async () => {
                await handleLogout();
                closeMobileMenu();
              }}
              style={{
                marginTop: 18,
                marginBottom: 10,
                alignSelf: "center",
                padding: "8px 22px",
                borderRadius: 999,
                background: "transparent",
                border: "1px solid rgba(148,163,184,0.5)",
                color: "rgba(226,232,240,0.9)",
                fontSize: 14,
                fontWeight: 500,
                textAlign: "center",
                cursor: "pointer",
                width: "fit-content",
                minWidth: "120px",
              }}
            >
              Logout
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
