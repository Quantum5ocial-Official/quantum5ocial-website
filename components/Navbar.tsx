import { useState } from "react";
import Link from "next/link";
import { useSupabaseUser } from "../lib/useSupabaseUser";
import { supabase } from "../lib/supabaseClient";

export default function Navbar() {
  const { user, loading } = useSupabaseUser();
  const [dashOpen, setDashOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const displayName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "Profile";

  return (
    <header className="nav">
      {/* Brand – clickable to homepage */}
      <Link href="/" className="brand brand-clickable">
        <div className="logo-orbit" />
        <div>
          <div className="brand-text-main">Quantum5ocial</div>
          <div className="brand-text-sub">Socializing the quantum world</div>
        </div>
      </Link>

      <nav className="nav-links">
        <Link href="/jobs" className="nav-link">
          Jobs
        </Link>

        <Link href="/products" className="nav-link">
          Products
        </Link>

        {/* If NOT logged in: simple auth button */}
        {!loading && !user && (
          <Link href="/auth" className="nav-cta">
            Login / Sign up
          </Link>
        )}

        {/* Logged-in navigation */}
        {!loading && user && (
          <>
            {/* Dashboard dropdown */}
            <div
              className="nav-dropdown"
              onMouseEnter={() => setDashOpen(true)}
              onMouseLeave={() => setDashOpen(false)}
            >
              <button
                type="button"
                className="nav-link nav-dropdown-trigger"
              >
                Dashboard
                <span style={{ marginLeft: 4, fontSize: 10 }}>▾</span>
              </button>

              {dashOpen && (
                <div className="nav-dropdown-menu">
                  <Link href="/dashboard" className="nav-dropdown-item">
                    Overview
                  </Link>
                  <Link
                    href="/dashboard?view=jobs"
                    className="nav-dropdown-item"
                  >
                    Saved jobs
                  </Link>
                  <Link
                    href="/dashboard?view=products"
                    className="nav-dropdown-item"
                  >
                    Saved products
                  </Link>
                  <Link
                    href="/profile"
                    className="nav-dropdown-item"
                  >
                    My profile
                  </Link>
                </div>
              )}
            </div>

            {/* Username + logout */}
            <Link href="/profile" className="nav-username">
              {displayName}
            </Link>

            <button
              onClick={handleLogout}
              className="nav-cta"
              style={{ cursor: "pointer" }}
            >
              Logout
            </button>
          </>
        )}
      </nav>
    </header>
  );
}
