// components/Navbar.tsx
import {
  useState,
  useEffect,
  useRef,
  KeyboardEvent,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

type Theme = "dark" | "light";

export default function Navbar() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [profileName, setProfileName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const [theme, setTheme] = useState<Theme>("dark");

  // NEW: mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

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

  // Close dropdowns on outside click (desktop)
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dashboardRef.current &&
        !dashboardRef.current.contains(e.target as Node)
      ) {
        setIsDashboardOpen(false);
      }
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
  }, [isMobileMenuOpen]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // ----- ACTIVE LINK HELPER -----
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return router.pathname.startsWith("/dashboard");
    }
    return (
      router.pathname === path || router.pathname.startsWith(path + "/")
    );
  };

  // Fallback name from auth if profile.full_name is missing
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

  const toggleDashboardFromKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsDashboardOpen((o) => !o);
    }
  };

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

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
        }}
      >
        {/* Brand – clickable to home */}
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

        {/* RIGHT SIDE: desktop nav + mobile hamburger */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* DESKTOP NAV LINKS */}
          <nav className="nav-links nav-links-desktop">
            <Link
              href="/jobs"
              className={`nav-link ${
                isActive("/jobs") ? "nav-link-active" : ""
              }`}
            >
              <span className="nav-link-label">Jobs</span>
            </Link>

            <Link
              href="/products"
              className={`nav-link ${
                isActive("/products") ? "nav-link-active" : ""
              }`}
            >
              <span className="nav-link-label">Products</span>
            </Link>

            <Link
              href="/community"
              className={`nav-link ${
                isActive("/community") ? "nav-link-active" : ""
              }`}
            >
              <span className="nav-link-label">Community</span>
            </Link>

            {/* NEW: Organizations tab */}
            <Link
              href="/orgs"
              className={`nav-link ${
                isActive("/orgs") ? "nav-link-active" : ""
              }`}
            >
              <span className="nav-link-label">Organizations</span>
            </Link>

            {/* Dashboard dropdown (desktop only) */}
            {!loading && user && (
              <div className="nav-dashboard-wrapper" ref={dashboardRef}>
                <div
                  className={`nav-link dashboard-trigger ${
                    isActive("/dashboard") ? "nav-link-active" : ""
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setIsDashboardOpen((o) => !o)}
                  onKeyDown={toggleDashboardFromKey}
                >
                  <span className="nav-link-label">Dashboard</span>
                </div>

                {isDashboardOpen && (
                  <div className="nav-dashboard-menu right-align">
                    <Link
                      href="/dashboard"
                      className="nav-dropdown-item"
                      onClick={() => setIsDashboardOpen(false)}
                    >
                      Overview
                    </Link>
                    <Link
                      href="/dashboard/entangled-states"
                      className="nav-dropdown-item"
                      onClick={() => setIsDashboardOpen(false)}
                    >
                      Entangled states
                    </Link>
                    <Link
                      href="/dashboard/saved-jobs"
                      className="nav-dropdown-item"
                      onClick={() => setIsDashboardOpen(false)}
                    >
                      Saved jobs
                    </Link>
                    <Link
                      href="/dashboard/saved-products"
                      className="nav-dropdown-item"
                      onClick={() => setIsDashboardOpen(false)}
                    >
                      Saved products
                    </Link>
                  </div>
                )}
              </div>
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

            {/* Avatar + first name dropdown */}
            {!loading && user && (
              <div className="nav-dashboard-wrapper" ref={userMenuRef}>
                <button
                  type="button"
                  className={`nav-user-button nav-link-button ${
                    isActive("/profile") ? "nav-link-active" : ""
                  }`}
                  onClick={() => setIsUserMenuOpen((o) => !o)}
                >
                  <div className="nav-user-avatar">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={firstName} />
                    ) : (
                      <span className="nav-user-initial">
                        {firstName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="nav-user-name">{firstName}</span>
                </button>

                {isUserMenuOpen && (
                  <div className="nav-dashboard-menu right-align">
                    {/* My profile FIRST */}
                    <Link
                      href="/profile"
                      className="nav-dropdown-item"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      My profile
                    </Link>

                    {/* Create organization BELOW profile */}
                    <Link
                      href="/orgs/create"
                      className="nav-dropdown-item"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      Create my organization page
                    </Link>

                    <button
                      type="button"
                      className="nav-dropdown-item nav-dropdown-danger"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>

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

      {/* MOBILE DRAWER – slides in from the right */}
      <div
        className={`nav-drawer ${
          isMobileMenuOpen ? "nav-drawer-open" : ""
        }`}
      >
        <nav className="nav-links nav-links-mobile">
          <Link
            href="/jobs"
            className={`nav-link ${
              isActive("/jobs") ? "nav-link-active" : ""
            }`}
            onClick={closeMobileMenu}
          >
            Jobs
          </Link>

          <Link
            href="/products"
            className={`nav-link ${
              isActive("/products") ? "nav-link-active" : ""
            }`}
            onClick={closeMobileMenu}
          >
            Products
          </Link>

          <Link
            href="/community"
            className={`nav-link ${
              isActive("/community") ? "nav-link-active" : ""
            }`}
            onClick={closeMobileMenu}
          >
            Community
          </Link>

          {/* NEW: Organizations in mobile menu */}
          <Link
            href="/orgs"
            className={`nav-link ${
              isActive("/orgs") ? "nav-link-active" : ""
            }`}
            onClick={closeMobileMenu}
          >
            Organizations
          </Link>

          {/* Dashboard links as simple items on mobile */}
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

              {/* My profile FIRST */}
              <Link
                href="/profile"
                className="nav-link"
                onClick={closeMobileMenu}
              >
                My profile
              </Link>

              {/* Create organization BELOW profile */}
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
