// components/NavbarIcons.tsx
import {
  useState,
  useEffect,
  useRef,
  KeyboardEvent,
  FormEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type Theme = "dark" | "light";

type NavbarIconsProps = {
  onOpenLeftSidebar?: () => void;
  onOpenRightSidebar?: () => void;
};

export default function NavbarIcons({
  onOpenLeftSidebar,
  onOpenRightSidebar,
}: NavbarIconsProps) {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [profileName, setProfileName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>("dark");
  const [hasOrganizations, setHasOrganizations] = useState(false);

  // mobile drawer
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  // notifications count (pending entanglement requests)
  const [notificationsCount, setNotificationsCount] = useState(0);

  // global search in navbar
  const [globalSearch, setGlobalSearch] = useState("");

  const handleGlobalSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    const term = globalSearch.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

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

  // ----- HAS ORGANIZATIONS? (for conditional dashboard link) -----
  useEffect(() => {
    let cancelled = false;

    const checkOrganizations = async () => {
      if (!user) {
        setHasOrganizations(false);
        return;
      }

      const { data, error } = await supabase
        .from("organizations")
        .select("id")
        .eq("created_by", user.id)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        setHasOrganizations(true);
      } else {
        setHasOrganizations(false);
      }
    };

    checkOrganizations();

    return () => {
      cancelled = true;
    };
  }, [user, router.pathname]);

  // ----- NOTIFICATIONS (incoming pending entanglement requests) -----
  useEffect(() => {
    let cancelled = false;

    const loadNotifications = async () => {
      if (!user) {
        setNotificationsCount(0);
        return;
      }

      try {
        const { count, error } = await supabase
          .from("connections")
          .select("id", { count: "exact", head: true })
          .eq("target_user_id", user.id)
          .eq("status", "pending");

        if (cancelled) return;

        if (!error && typeof count === "number") {
          setNotificationsCount(count);
        } else {
          setNotificationsCount(0);
        }
      } catch (e) {
        if (!cancelled) {
          console.error("Error loading notifications", e);
          setNotificationsCount(0);
        }
      }
    };

    loadNotifications();

    return () => {
      cancelled = true;
    };
  }, [user, router.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target as Node)
      ) {
        setIsUserMenuOpen(false);
        setIsDashboardOpen(false);
      }
      if (
        dashboardRef.current &&
        !dashboardRef.current.contains(e.target as Node)
      ) {
        setIsDashboardOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lock scroll when mobile drawer is open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";
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
    return (
      router.pathname === path || router.pathname.startsWith(path + "/")
    );
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

  const toggleDashboardFromKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsDashboardOpen((o) => !o);
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // helper for icon+label links (desktop)
  const renderIconNavLink = (
    href: string,
    label: string,
    iconSrc: string,
    badgeCount?: number
  ) => {
    const active = isActive(href);

    const displayBadge =
      typeof badgeCount === "number" && badgeCount > 0;
    const badgeText =
      displayBadge && badgeCount! > 9 ? "9+" : badgeCount;

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
            height: 75,
            minWidth: 90,
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
              width: 36,
              height: 36,
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
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: 72,
          gap: 16,
        }}
      >
        {/* LEFT: mobile-left-toggle + brand + global search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* MOBILE LEFT SIDEBAR TOGGLE (👤) */}
          <button
            type="button"
            className="nav-mobile-side-toggle nav-mobile-side-toggle-left"
            aria-label="Open left sidebar"
            onClick={() => onOpenLeftSidebar && onOpenLeftSidebar()}
          >
            <span className="nav-mobile-side-icon">👤</span>
          </button>

          {/* Brand */}
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

          {/* Global search – desktop only */}
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
        </div>

        {/* RIGHT: nav links + theme + user + right-sidebar toggle + hamburger */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexShrink: 0,
          }}
        >
          {/* DESKTOP NAV */}
          <nav
            className="nav-links nav-links-desktop"
            style={{
              fontSize: 16,
              display: "flex",
              alignItems: "center",
              gap: 24, // uniform spacing
            }}
          >
            {/* ICON + LABEL LINKS */}
            {renderIconNavLink("/jobs", "Jobs", "/icons/jobs.svg")}
            {renderIconNavLink("/products", "Products", "/icons/products.svg")}
            {renderIconNavLink("/community", "Community", "/icons/community.svg")}

            {/* Notifications – icon + label + badge */}
            {!loading &&
              user &&
              renderIconNavLink(
                "/notifications",
                "Notifications",
                "/icons/notifications.svg",
                notificationsCount
              )}

            {/* Theme toggle */}
            <button
              type="button"
              className="nav-link nav-link-button theme-toggle"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>

            {/* Logged-out CTA */}
            {!loading && !user && (
              <Link href="/auth" className="nav-cta">
                Login / Sign up
              </Link>
            )}

            {/* USER MENU (DESKTOP) – avatar + name stacked like an icon */}
            {!loading && user && (
              <div className="nav-user-wrapper" ref={userMenuRef}>
                <button
                  type="button"
                  className={`nav-user-button nav-link-button ${
                    isActive("/profile") ? "nav-link-active" : ""
                  }`}
                  onClick={() => {
                    setIsUserMenuOpen((o) => !o);
                    setIsDashboardOpen(false);
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
                      height: 80, // same as icon blocks
                      minWidth: 90,
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
                      style={{
                        width: 36, // same as icon size
                        height: 36,
                      }}
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
                        fontSize: 11, // same as other labels
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
                    {/* My profile */}
                    <Link
                      href="/profile"
                      className="nav-dropdown-item"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsDashboardOpen(false);
                      }}
                    >
                      My profile
                    </Link>

                    {/* My ecosystem */}
                    <Link
                      href="/ecosystem"
                      className="nav-dropdown-item"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsDashboardOpen(false);
                      }}
                    >
                      My ecosystem
                    </Link>

                    {/* Nested Dashboard dropdown inside user menu */}
                    <div
                      ref={dashboardRef}
                      style={{
                        marginTop: 4,
                        marginBottom: 4,
                      }}
                    >
                      <button
                        type="button"
                        className="nav-dropdown-item"
                        onClick={() => setIsDashboardOpen((o) => !o)}
                        onKeyDown={toggleDashboardFromKey}
                      >
                        <span>Dashboard</span>
                        <span
                          style={{
                            marginLeft: "auto",
                            fontSize: 10,
                            opacity: 0.8,
                          }}
                        >
                          {isDashboardOpen ? "▲" : "▼"}
                        </span>
                      </button>

                      {isDashboardOpen && (
                        <>
                          <Link
                            href="/dashboard"
                            className="nav-dropdown-item nav-dropdown-subitem"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setIsDashboardOpen(false);
                            }}
                          >
                            Overview
                          </Link>
                          <Link
                            href="/dashboard/entangled-states"
                            className="nav-dropdown-item nav-dropdown-subitem"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setIsDashboardOpen(false);
                            }}
                          >
                            Entangled states
                          </Link>
                          <Link
                            href="/dashboard/saved-jobs"
                            className="nav-dropdown-item nav-dropdown-subitem"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setIsDashboardOpen(false);
                            }}
                          >
                            Saved jobs
                          </Link>
                          <Link
                            href="/dashboard/saved-products"
                            className="nav-dropdown-item nav-dropdown-subitem"
                            onClick={() => {
                              setIsUserMenuOpen(false);
                              setIsDashboardOpen(false);
                            }}
                          >
                            Saved products
                          </Link>
                          {hasOrganizations && (
                            <Link
                              href="/dashboard/my-organizations"
                              className="nav-dropdown-item nav-dropdown-subitem"
                              onClick={() => {
                                setIsUserMenuOpen(false);
                                setIsDashboardOpen(false);
                              }}
                            >
                              My organizations
                            </Link>
                          )}
                        </>
                      )}
                    </div>

                    {/* Create organization */}
                    <Link
                      href="/orgs/create"
                      className="nav-dropdown-item"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsDashboardOpen(false);
                      }}
                    >
                      Create my organization page
                    </Link>

                    {/* Logout */}
                    <button
                      type="button"
                      className="nav-dropdown-item nav-dropdown-danger"
                      onClick={async () => {
                        await handleLogout();
                        setIsUserMenuOpen(false);
                        setIsDashboardOpen(false);
                      }}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* MOBILE RIGHT SIDEBAR TOGGLE (✨) */}
          <button
            type="button"
            className="nav-mobile-side-toggle nav-mobile-side-toggle-right"
            aria-label="Open right sidebar"
            onClick={() => onOpenRightSidebar && onOpenRightSidebar()}
          >
            <span className="nav-mobile-side-icon">✨</span>
          </button>

          {/* MOBILE HAMBURGER */}
          <button
            type="button"
            className={`nav-mobile-toggle ${
              isMobileMenuOpen ? "open" : ""
            }`}
            aria-label="Open navigation"
            onClick={() => setIsMobileMenuOpen((o) => !o)}
          >
            <span className="nav-mobile-bar" />
            <span className="nav-mobile-bar" />
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      <div
        className={`nav-drawer ${
          isMobileMenuOpen ? "nav-drawer-open" : ""
        }`}
      >
        <nav className="nav-links nav-links-mobile">
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
            <span className="nav-icon-label">Products</span>
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

          {/* Dashboard section in MOBILE */}
          {!loading && user && (
            <>
              <div className="nav-mobile-section-label">
                Dashboard
              </div>
              <Link
                href="/dashboard"
                className={`nav-link ${
                  isActive("/dashboard") ? "nav-link-active" : ""
                }`}
                onClick={closeMobileMenu}
              >
                Overview
              </Link>
              <Link
                href="/dashboard/entangled-states"
                className="nav-link"
                onClick={closeMobileMenu}
              >
                Entangled states
              </Link>
              <Link
                href="/dashboard/saved-jobs"
                className="nav-link"
                onClick={closeMobileMenu}
              >
                Saved jobs
              </Link>
              <Link
                href="/dashboard/saved-products"
                className="nav-link"
                onClick={closeMobileMenu}
              >
                Saved products
              </Link>
              {hasOrganizations && (
                <Link
                  href="/dashboard/my-organizations"
                  className="nav-link"
                  onClick={closeMobileMenu}
                >
                  My organizations
                </Link>
              )}

              {/* Notifications on mobile */}
              <div className="nav-mobile-section-label">
                Notifications
              </div>
              <Link
                href="/notifications"
                className={`nav-link ${
                  isActive("/notifications") ? "nav-link-active" : ""
                }`}
                onClick={closeMobileMenu}
              >
                Notifications
                {notificationsCount > 0 && (
                  <span
                    style={{
                      marginLeft: 8,
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
            </>
          )}

          <button
            type="button"
            className="nav-link nav-link-button theme-toggle mobile-theme-toggle"
            onClick={toggleTheme}
          >
            Theme: {theme === "dark" ? "Dark" : "Light"}
          </button>

          {!loading && !user && (
            <Link
              href="/auth"
              className="nav-cta nav-cta-mobile"
              onClick={closeMobileMenu}
            >
              Login / Sign up
            </Link>
          )}

          {!loading && user && (
            <>
              <div className="nav-mobile-section-label">Account</div>
              <Link
                href="/profile"
                className="nav-link"
                onClick={closeMobileMenu}
              >
                My profile
              </Link>
              <Link
                href="/ecosystem"
                className="nav-link"
                onClick={closeMobileMenu}
              >
                My ecosystem
              </Link>
              <Link
                href="/orgs/create"
                className="nav-link"
                onClick={closeMobileMenu}
              >
                Create my organization page
              </Link>
              <button
                type="button"
                className="nav-link nav-dropdown-danger"
                onClick={async () => {
                  await handleLogout();
                  closeMobileMenu();
                }}
              >
                Logout
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
