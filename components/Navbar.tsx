import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useSupabaseUser } from "../lib/useSupabaseUser";
import { supabase } from "../lib/supabaseClient";

export default function Navbar() {
  const { user, loading } = useSupabaseUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const displayName =
    (user as any)?.user_metadata?.name ||
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.email?.split("@")[0] ||
    "Profile";

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;

    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <header className="nav">
      <div className="brand">
        <div className="logo-orbit" />
        <div>
          <div className="brand-text-main">Quantum5ocial</div>
          <div className="brand-text-sub">Socializing the quantum world</div>
        </div>
      </div>

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
          <div className="nav-user-wrapper" ref={menuRef}>
            <button
              type="button"
              className="nav-user-btn"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="nav-username-text">{displayName}</span>
              <span className={`nav-user-chevron ${menuOpen ? "open" : ""}`}>
                ▾
              </span>
            </button>

            {menuOpen && (
              <div className="nav-user-menu">
                <Link
                  href="/profile"
                  className="nav-user-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  My profile
                </Link>

                <Link
                  href="/saved/jobs"
                  className="nav-user-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  Saved jobs
                </Link>

                <Link
                  href="/saved/products"
                  className="nav-user-menu-item"
                  onClick={() => setMenuOpen(false)}
                >
                  Saved products
                </Link>

                <div className="nav-user-menu-divider" />

                <button
                  type="button"
                  className="nav-user-menu-item nav-user-menu-logout"
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
