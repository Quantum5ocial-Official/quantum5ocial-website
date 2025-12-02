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

  // ------------------------------
  // Active route helper
  // ------------------------------
  const isActive = (path: string) => {
  if (path === "/dashboard") {
    // Active ONLY if the current page is actually inside /dashboard
    return router.pathname.startsWith("/dashboard");
  }
  return router.pathname === path || router.pathname.startsWith(path + "/");
};

  // ------------------------------
  // THEME LOADING
  // ------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem("q5_theme");
    const initial: Theme = stored === "light" ? "light" : "dark";

    setTheme(initial);
    document.documentElement.classList.toggle("theme-light", initial === "light");
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        document.documentElement.classList.toggle("theme-light", next === "light");
        window.localStorage.setItem("q5_theme", next);
      }
      return next;
    });
  };

  // ------------------------------
  // PROFILE FETCH
  // ------------------------------
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
        setProfileName(data.full_name || null);
        setAvatarUrl(data.avatar_url || null);
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

  // ------------------------------
  // Close dropdowns on outside click
  // ------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dashboardRef.current && !dashboardRef.current.contains(e.target as Node)) {
        setIsDashboardOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ------------------------------
  // Logout
  // ------------------------------
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  // ------------------------------
  // Names
  // ------------------------------
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

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <header className="nav">
      {/* LEFT BRAND */}
      <Link href="/" className="brand-clickable">
        <div className="brand">
          <img
            src="/Q5_white_bg.png"
            alt="Quantum5ocial logo"
            className="brand-logo"
          />
          <div>
            <div className="brand-text-main brand-text-gradient">Quantum5ocial</div>
            <div className="brand-text-sub">Connecting the quantum world</div>
          </div>
        </div>
      </Link>

      {/* NAV LINKS */}
      <nav className="nav-links">

        <Link
          href="/jobs"
          className={`nav-link ${isActive("/jobs") ? "nav-link-active" : ""}`}
        >
          Jobs
        </Link>

        <Link
          href="/products"
          className={`nav-link ${isActive("/products") ? "nav-link-active" : ""}`}
        >
          Products
        </Link>

        <Link
          href="/community"
          className={`nav-link ${isActive("/community") ? "nav-link-active" : ""}`}
        >
          Community
        </Link>

        {/* DASHBOARD DROPDOWN */}
        {!loading && user && (
          <div className="nav-dashboard-wrapper" ref={dashboardRef}>
            <button
              type="button"
              className={`nav-link nav-link-button ${
                isActive("/dashboard") ? "nav-link-active" : ""
              }`}
              onClick={() => setIsDashboardOpen((o) => !o)}
            >
              Dashboard
            </button>

            {isDashboardOpen && (
              <div className="nav-dashboard-menu">
                <Link href="/dashboard/entangled-states" className="nav-dropdown-item">
                  Entangled states
                </Link>
                <Link href="/dashboard/saved-jobs" className="nav-dropdown-item">
                  Saved jobs
                </Link>
                <Link href="/dashboard/saved-products" className="nav-dropdown-item">
                  Saved products
                </Link>
              </div>
            )}
          </div>
        )}

        {/* THEME TOGGLE */}
        <button
          type="button"
          className="nav-link nav-link-button theme-toggle"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? "☀️" : "🌙"}
        </button>

        {/* LOGIN */}
        {!loading && !user && (
          <Link href="/auth" className="nav-cta">
            Login / Sign up
          </Link>
        )}

        {/* USER MENU */}
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
