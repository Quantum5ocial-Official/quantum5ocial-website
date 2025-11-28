// components/Navbar.tsx
import Link from "next/link";
import { useSupabaseUser } from "../lib/useSupabaseUser";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useRef, useState } from "react";

export default function Navbar() {
  const { user, loading } = useSupabaseUser();
  const [dashOpen, setDashOpen] = useState(false);
  const dashRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const displayName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "Profile";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dashRef.current &&
        !dashRef.current.contains(e.target as Node)
      ) {
        setDashOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  return (
    <header className="nav">
      <Link href="/" className="brand-link">
        <div className="brand">
          <div className="logo-orbit" />
          <div>
            <div className="brand-text-main">Quantum5ocial</div>
            <div className="brand-text-sub">SOCIALIZING THE QUANTUM WORLD</div>
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

        {!loading && !user && (
          <Link href="/auth" className="nav-cta">
            Login / Sign up
          </Link>
        )}

        {!loading && user && (
          <>
            {/* Dashboard dropdown */}
            <div className="nav-dashboard-wrapper" ref={dashRef}>
              <button
                type="button"
                className="nav-link nav-link-button"
                onClick={(e) => {
                  e.preventDefault();
                  setDashOpen((open) => !open);
                }}
              >
                Dashboard ▾
              </button>

              {dashOpen && (
                <div className="nav-dashboard-menu">
                  <Link href="/profile" className="nav-dropdown-item">
                    My profile
                  </Link>
                  <Link
                    href="/dashboard/saved-jobs"
                    className="nav-dropdown-item"
                  >
                    Saved jobs
                  </Link>
                  <Link
                    href="/dashboard/saved-products"
                    className="nav-dropdown-item"
                  >
                    Saved products
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="nav-dropdown-item nav-dropdown-danger"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            <span className="nav-username">{displayName}</span>
          </>
        )}
      </nav>
    </header>
  );
}
