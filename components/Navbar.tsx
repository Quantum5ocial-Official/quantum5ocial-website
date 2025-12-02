// components/Navbar.tsx
import { useState, useEffect, useRef } from "react";
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

  // Close dropdowns on outside click
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // ----- ACTIVE LINK HELPER -----
  const isActive = (path: string) => {
    if (path === "/dashboard") {
      // Dashboard is active ONLY when actually on a /dashboard route
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

  return (
    <header className="nav">
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

      <nav className="nav-links">
        {/* Jobs */}
        <Link
          href="/jobs"
          className={`nav-link ${isActive("/jobs") ? "nav-link-active" : ""}`}
        >
          <span className="nav-link-label">Jobs</span>
        </Link>

        {/* Products */}
        <Link
          href="/products"
          className={`nav-link ${
            isActive("/products") ? "nav-link-active" : ""
          }`}
        >
          <span className="nav-link-label">Products</span>
        </Link>

        {/* Community */}
        <Link
          href="/community"
          className={`nav-link ${
            isActive("/community") ? "nav-link-active" : ""
          }`}
        >
          <span className="nav-link-label">Community</span>
        </Link>

        {/* Dashboard dropdown */}
        {!loading && user && (
          <div className="nav-dashboard-wrapper" ref={dashboardRef}>
            <button
              type="button"
              className={`nav-link nav-link-button ${
                isActive("/dashboard") ? "nav-link-active" : ""
              }`}
              onClick={() => setIsDashboardOpen((o) => !o)}
            >
              <span className="nav-link-label">Dashboard</span>
            </button>

            {isDashboardOpen && (
              <div className="nav-dashboard-menu right-align">
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
                <Link
                  href="/profile"
                  className="nav-dropdown-item"
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  My profile
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
    </header>
  );
}
