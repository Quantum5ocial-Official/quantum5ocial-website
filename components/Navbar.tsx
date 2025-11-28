// components/Navbar.tsx
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

export default function Navbar() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

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

  const displayName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "User";

  return (
    <header className="nav">
      {/* Brand – clickable to home */}
      <Link href="/" className="brand-clickable">
        <div className="brand">
          <div className="logo-orbit" />
          <div>
            <div className="brand-text-main">Quantum5ocial</div>
            <div className="brand-text-sub">Socializing the quantum world</div>
          </div>
        </div>
      </Link>

      <nav className="nav-links">
        <Link href="/jobs" className="nav-link">
          Jobs
        </Link>

        <Link href="/products" className="nav-link">
          Products
        </Link>

        {/* Dashboard dropdown (navigation only) */}
        {!loading && user && (
          <div className="nav-dashboard-wrapper" ref={dashboardRef}>
            <button
              type="button"
              className="nav-link nav-link-button"
              onClick={() => setIsDashboardOpen((o) => !o)}
            >
              Dashboard ▾
            </button>

            {isDashboardOpen && (
              <div className="nav-dashboard-menu">
                <Link
                  href="/dashboard"
                  className="nav-dropdown-item"
                  onClick={() => setIsDashboardOpen(false)}
                >
                  Overview
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

        {/* Logged-out: auth button */}
        {!loading && !user && (
          <Link href="/auth" className="nav-cta">
            Login / Sign up
          </Link>
        )}

        {/* Username dropdown – Logout only, styled like Dashboard */}
        {!loading && user && (
          <div className="nav-dashboard-wrapper" ref={userMenuRef}>
            <button
              type="button"
              className="nav-link nav-link-button"
              onClick={() => setIsUserMenuOpen((o) => !o)}
            >
              {displayName} ▾
            </button>

            {isUserMenuOpen && (
  <div className="nav-dashboard-menu right-align">
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
