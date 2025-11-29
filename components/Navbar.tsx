// components/Navbar.tsx
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

export default function Navbar() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Derive a nice display name from user metadata or email
  const fallbackName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Guest";

  const isDashboard = router.pathname.startsWith("/dashboard");
  const isJobs = router.pathname.startsWith("/jobs");
  const isProducts = router.pathname.startsWith("/products");
  const isProfile = router.pathname.startsWith("/profile");

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.replace("/auth");
  };

  return (
    <header className="navbar">
      <div className="navbar-inner">
        {/* LEFT: brand */}
        <Link href="/" className="navbar-brand">
          <div className="navbar-logo-circle">
            <span className="navbar-logo-text">Q5</span>
          </div>
          <div className="navbar-brand-text">
            <div className="navbar-brand-main">Quantum5ocial</div>
            <div className="navbar-brand-sub">
              SOCIALIZING THE QUANTUM WORLD
            </div>
          </div>
        </Link>

        {/* CENTER / RIGHT NAV LINKS */}
        <nav className="navbar-nav">
          <Link
            href="/jobs"
            className={`navbar-link ${isJobs ? "active" : ""}`}
          >
            Jobs
          </Link>
          <Link
            href="/products"
            className={`navbar-link ${isProducts ? "active" : ""}`}
          >
            Products
          </Link>
          <Link
            href="/dashboard"
            className={`navbar-link ${isDashboard ? "active" : ""}`}
          >
            Dashboard
          </Link>
        </nav>

        {/* RIGHT: user menu / auth */}
        <div className="navbar-user">
          {loading ? (
            <span className="navbar-user-name">Loading…</span>
          ) : user ? (
            <div className="navbar-user-wrapper">
              <button
                type="button"
                className="navbar-user-button"
                onClick={() => setIsMenuOpen((o) => !o)}
              >
                <span className="navbar-user-name">{fallbackName}</span>
                <span className="navbar-user-chevron">▾</span>
              </button>

              {isMenuOpen && (
                <div className="navbar-user-menu">
                  <Link
                    href="/profile"
                    className={`navbar-user-menu-item ${
                      isProfile ? "active" : ""
                    }`}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    My profile
                  </Link>
                  <button
                    type="button"
                    className="navbar-user-menu-item"
                    onClick={handleLogout}
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth" className="navbar-login-link">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
