// components/Navbar.tsx
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { useSupabaseUser } from "../lib/useSupabaseUser";
import { supabase } from "../lib/supabaseClient";

export default function Navbar() {
  const { user, loading } = useSupabaseUser();
  const router = useRouter();

  const displayName =
    (user as any)?.user_metadata?.full_name ||
    (user as any)?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Guest";

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  return (
    <header className="nav-shell">
      <div className="nav-inner">
        {/* LEFT: logo + brand */}
        <div className="nav-left">
          <Link href="/" className="nav-brand">
            <div className="nav-logo">
              <Image
                src="/Q5_black_bg2.png"
                alt="Quantum5ocial logo"
                width={40}
                height={40}
              />
            </div>
            <div className="nav-brand-text">
              <div className="nav-brand-title">Quantum5ocial</div>
              <div className="nav-brand-sub">SOCIALIZING THE QUANTUM WORLD</div>
            </div>
          </Link>
        </div>

        {/* CENTER: main nav links */}
        <nav className="nav-menu">
          <Link
            href="/jobs"
            className={
              router.pathname.startsWith("/jobs")
                ? "nav-link nav-link-active"
                : "nav-link"
            }
          >
            Jobs
          </Link>
          <Link
            href="/products"
            className={
              router.pathname.startsWith("/products")
                ? "nav-link nav-link-active"
                : "nav-link"
            }
          >
            Products
          </Link>
          <Link
            href="/dashboard"
            className={
              router.pathname.startsWith("/dashboard")
                ? "nav-link nav-link-active"
                : "nav-link"
            }
          >
            Dashboard
          </Link>
        </nav>

        {/* RIGHT: user / auth */}
        <div className="nav-right">
          {loading ? (
            <span className="nav-user nav-user-loading">Checking user…</span>
          ) : user ? (
            <div className="nav-user">
              <span className="nav-user-name">{displayName}</span>
              <button
                type="button"
                onClick={handleLogout}
                className="nav-ghost-btn"
                style={{ textDecoration: "none" }}
              >
                Log out
              </button>
            </div>
          ) : (
            <Link
              href="/auth"
              className="nav-cta"
              style={{ textDecoration: "none" }}
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
