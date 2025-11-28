import Link from "next/link";
import { useSupabaseUser } from "../lib/useSupabaseUser";
import { supabase } from "../lib/supabaseClient";

export default function Navbar() {
  const { user, loading } = useSupabaseUser();

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
      {/* Clickable brand */}
      <Link href="/" className="brand brand-clickable">
        <div className="logo-orbit" />
        <div>
          <div className="brand-text-main">Quantum5ocial</div>
          <div className="brand-text-sub">SOCIALIZING THE QUANTUM WORLD</div>
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
            <Link href="/dashboard" className="nav-link">
              Dashboard
            </Link>

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
