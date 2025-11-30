// components/Navbar.tsx
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "../lib/supabaseClient";
import { useSupabaseUser } from "../lib/useSupabaseUser";

export default function Navbar() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const displayName =
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setUserMenuOpen(false);
      router.replace("/auth");
    }
  };

  const linkClass = (path: string) =>
    router.pathname.startsWith(path)
      ? "nav-link nav-link-active"
      : "nav-link";

  return (
    <header className="navbar">
      {/* LEFT: logo + brand */}
      <div className="nav-left">
        <Link href="/" className="nav-brand">
          <div className="nav-logo">
            <img
              src="/Q5_black_bg2.png"
              alt="Quantum5ocial logo"
              style={{
                width: 40,
                height: 40,
                borderRadius: 8,
                objectFit: "cover",
              }}
            />
          </div>
          <div className="nav-brand-text">
            <div className="nav-brand-name">Quantum5ocial</div>
            <div className="nav-brand-tagline">
              SOCIALIZING THE QUANTUM WORLD
            </div>
          </div>
        </Link>
      </div>

      {/* CENTER: main links */}
      <nav className="nav-center">
        <Link href="/jobs" className={linkClass("/jobs")}>
          Jobs
        </Link>
        <Link href="/products" className={linkClass("/products")}>
          Products
        </Link>
        <Link href="/dashboard" className={linkClass("/dashboard")}>
          Dashboard
        </Link>
      </nav>

      {/* RIGHT: auth / user menu */}
      <div className="nav-right">
        {loading ? null : user ? (
          <div className="nav-user-wrapper">
            <button
              type="button"
              className="nav-user-button"
              onClick={() => setUserMenuOpen((o) => !o)}
            >
              <div className="nav-user-avatar">
                <span>{initials || "Q5"}</span>
              </div>
              <span className="nav-user-name">{displayName}</span>
              <span className="nav-user-caret">▾</span>
            </button>

            {userMenuOpen && (
              <div className="nav-user-menu">
                <Link
                  href="/dashboard"
                  className="nav-user-menu-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  href="/profile"
                  className="nav-user-menu-item"
                  onClick={() => setUserMenuOpen(false)}
                >
                  Profile
                </Link>
                <button
                  type="button"
                  className="nav-user-menu-item nav-user-logout"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link href="/auth" className="nav-cta">
            Login / Sign up
          </Link>
        )}
      </div>
    </header>
  );
}
